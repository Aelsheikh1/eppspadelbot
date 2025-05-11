import { Plugins } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { auth, db } from '../services/firebase';
import { doc, updateDoc, arrayUnion, getDoc, setDoc, arrayRemove, deleteDoc } from 'firebase/firestore';

// Dark mode styling for notifications based on user preference
const NOTIFICATION_STYLE = {
  backgroundColor: '#2A2A2A',
  textColor: '#FFFFFF',
  iconColor: '#7986cb'
};

// Initialize push notifications
export const initializePushNotifications = async () => {
  console.log('Initializing native push notifications');
  
  try {
    // Request permission to use push notifications
    const result = await PushNotifications.requestPermissions();
    
    if (result.receive === 'granted') {
      // Register with FCM
      await PushNotifications.register();
      console.log('Push notification registration successful');
      
      // Get FCM token
      const token = await getFcmToken();
      if (token) {
        console.log('FCM token obtained:', token);
        // Save the token to Firestore
        await saveFcmToken(token);
      }
      
      // Set up push notification listeners
      setupPushListeners();
      
      return true;
    } else {
      console.log('Push notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return false;
  }
};

// Get the FCM token
const getFcmToken = async () => {
  try {
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications[0]?.id;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Save FCM token to Firestore
const saveFcmToken = async (token) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('No authenticated user for token registration');
      return false;
    }
    
    // 1. Store in user document
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    // Check if token already exists to avoid duplicates
    const existingTokens = userDoc.exists() && userDoc.data().fcmTokens ? userDoc.data().fcmTokens : [];
    if (existingTokens.includes(token)) {
      console.log('Token already exists for user:', currentUser.uid);
      // Just update the timestamp
      await updateDoc(userRef, {
        lastTokenUpdate: new Date().toISOString()
      });
    } else {
      // Add the new token
      console.log('Adding new token to user document');
      // Prepare user data with token and notification preferences
      const userData = {
        fcmTokens: arrayUnion(token),
        lastTokenUpdate: new Date().toISOString()
      };
      
      // If user doc doesn't exist or doesn't have notification settings, add default settings
      if (!userDoc.exists() || !userDoc.data().notificationSettings) {
        userData.notificationSettings = {
          gameCreated: true,
          gameClosingSoon: true,
          gameClosed: true,
          tournamentUpdates: true
        };
      }

      // Update the user document
      await updateDoc(userRef, userData);
      console.log('Token added to user document for:', currentUser.uid);
    }
    
    // 2. Also store in fcmTokens collection for easier querying
    try {
      const tokenRef = doc(db, 'fcmTokens', token.substring(0, 40));
      const userRole = userDoc.exists() ? userDoc.data().isAdmin === true ? 'admin' : 'user' : 'user';
      await setDoc(tokenRef, {
        userId: currentUser.uid,
        email: currentUser.email,
        isAdmin: userDoc.exists() ? userDoc.data().isAdmin === true : false,
        userRole,
        token: token,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        device: 'Native Mobile App'
      });
      console.log('Token also stored in fcmTokens collection');
    } catch (tokenError) {
      // Non-critical error, just log it
      console.warn('Error storing token in fcmTokens collection:', tokenError);
    }

    return true;
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return false;
  }
};

// Set up push notification listeners
const setupPushListeners = () => {
  // On registration success
  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token:', token.value);
    saveFcmToken(token.value);
  });

  // On registration error
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Error on registration:', error);
  });

  // On push notification received
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received:', notification);
    // You can handle the notification here if the app is in the foreground
  });

  // On push notification action clicked
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push notification action performed:', notification);
    // Handle notification click - e.g., navigate to a specific screen
    const data = notification.notification.data;
    if (data && data.gameId) {
      // Navigate to game details
      window.location.href = `/games/${data.gameId}`;
    } else if (data && data.tournamentId) {
      // Navigate to tournament details
      window.location.href = `/tournaments/${data.tournamentId}`;
    }
  });
};

// Remove FCM token when user logs out
export const removeFcmToken = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const token = await getFcmToken();
    if (!token) return;
    
    // Update user document to remove this token
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      fcmTokens: arrayRemove(token)
    });
    
    // Remove from tokens collection
    try {
      const tokenRef = doc(db, 'fcmTokens', token.substring(0, 40));
      await deleteDoc(tokenRef);
    } catch (error) {
      console.warn('Error removing token from collection:', error);
    }
    
    console.log('FCM token removed successfully');
  } catch (error) {
    console.error('Error removing FCM token:', error);
  }
};

// Check if push notifications are supported
export const isPushNotificationsSupported = () => {
  return typeof PushNotifications !== 'undefined';
};
