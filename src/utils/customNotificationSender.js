import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where, doc, getDoc, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * Custom notification sender that bypasses Firebase Console
 * This uses your own Firestore to store and trigger notifications
 */
export const sendCustomNotification = async (options) => {
  try {
    const { title, body, targetUserId, targetRole, gameId, url } = options;
    
    // Get current user (sender)
    const user = auth.currentUser;
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to send notifications'
      };
    }
    
    // Create notification document in Firestore
    const notificationData = {
      title: title || 'New Notification',
      body: body || 'You have a new notification',
      senderId: user.uid,
      senderEmail: user.email,
      createdAt: new Date().toISOString(),
      delivered: false,
      data: {
        gameId: gameId || null,
        url: url || '/games',
        timestamp: Date.now()
      }
    };
    
    // Add targeting information if provided
    if (targetUserId) {
      notificationData.targetUserId = targetUserId;
    }
    
    if (targetRole) {
      notificationData.targetRole = targetRole;
    }
    
    // Store in custom notifications collection
    const notificationRef = await addDoc(collection(db, 'customNotifications'), notificationData);
    
    // Get tokens for targeted users
    let tokens = [];
    
    if (targetUserId) {
      // Get tokens for specific user
      const tokensQuery = query(collection(db, 'fcmTokens'), where('userId', '==', targetUserId));
      const tokensSnapshot = await getDocs(tokensQuery);
      
      tokensSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.token) {
          tokens.push(data.token);
        }
      });
    } else if (targetRole) {
      // Get tokens for users with specific role
      const tokensQuery = query(collection(db, 'fcmTokens'), where('userRole', '==', targetRole));
      const tokensSnapshot = await getDocs(tokensQuery);
      
      tokensSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.token) {
          tokens.push(data.token);
        }
      });
    } else {
      // Get all tokens
      const tokensSnapshot = await getDocs(collection(db, 'fcmTokens'));
      
      tokensSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.token) {
          tokens.push(data.token);
        }
      });
    }
    
    // Now trigger the notification by updating the document
    // This will be picked up by our custom listener
    await addDoc(collection(db, 'notificationTriggers'), {
      notificationId: notificationRef.id,
      tokens: tokens,
      createdAt: new Date().toISOString(),
      processed: false
    });
    
    return {
      success: true,
      notificationId: notificationRef.id,
      tokenCount: tokens.length,
      message: `Notification sent to ${tokens.length} devices`
    };
  } catch (error) {
    console.error('Error sending custom notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get a list of users to send notifications to
 */
export const getNotificationUsers = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        email: userData.email || 'No email',
        displayName: userData.displayName || userData.email || 'Unknown user',
        isAdmin: userData.isAdmin === true || userData.role === 'admin' || userData.userRole === 'admin',
        role: userData.role || userData.userRole || 'user'
      });
    });
    
    return {
      success: true,
      users: users
    };
  } catch (error) {
    console.error('Error getting notification users:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
