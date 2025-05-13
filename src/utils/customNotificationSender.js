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
    
    // Use Firebase Functions to send notification via FCM
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    // Always use the correct region for callable functions
    const functions = getFunctions(undefined, 'us-central1');

    // Choose the correct function: direct or all
    let callableFn;
    let payload;
    if (targetUserId) {
      callableFn = httpsCallable(functions, 'sendDirectNotification');
      // Fetch FCM tokens for the target user
      const tokensSnapshot = await getDocs(query(collection(db, 'fcmTokens'), where('userId', '==', targetUserId)));
      const tokens = tokensSnapshot.docs.map(doc => doc.data().token).filter(Boolean);
      if (!tokens.length) {
        return {
          success: false,
          error: 'No FCM tokens found for the target user.'
        };
      }
      payload = {
        title,
        body,
        tokens,
        gameId,
        notificationType: targetRole || 'user',
        url,
      };

    } else {
      callableFn = httpsCallable(functions, 'sendNotificationToAll');
      payload = {
        title,
        body,
        gameId,
        notificationType: targetRole || 'announcement',
        url,
      };
    }
    const result = await callableFn(payload);
    return {
      success: result.data.success,
      notificationId: result.data.notificationId || null,
      tokenCount: result.data.successCount || 0,
      message: result.data.message || 'Notification sent via FCM',
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
