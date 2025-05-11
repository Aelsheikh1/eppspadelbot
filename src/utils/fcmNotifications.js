import { getMessaging, getToken } from 'firebase/messaging';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

// Store FCM tokens in Firestore for each user
export const saveFCMToken = async (userId) => {
  try {
    const messaging = getMessaging();
    const currentToken = await getToken(messaging, {
      vapidKey: 'BHgpQFYI8_8VJaGW_ZYmQiEQPvKTyDlbBcqyqFIwELHJO0qPEGK_2FtFpWbUoqz_YlCDyXqkDZHxJXF5zJMkWRo'
    });

    if (currentToken) {
      // Save the token to Firestore
      const userTokenRef = doc(db, 'userTokens', userId);
      await setDoc(userTokenRef, {
        fcmToken: currentToken,
        lastUpdated: new Date()
      }, { merge: true });

      // Send token to service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.active.postMessage({
          type: 'UPDATE_FCM_TOKEN',
          token: currentToken,
          userId: userId
        });
      }

      return currentToken;
    }

    console.log('No FCM token available');
    return null;
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return null;
  }
};

// Send FCM notification to specific users
export const sendFCMNotification = async (userIds, notification) => {
  try {
    // Get tokens for all users
    const tokens = [];
    for (const userId of userIds) {
      const userTokenRef = doc(db, 'userTokens', userId);
      const userTokenDoc = await getDoc(userTokenRef);
      if (userTokenDoc.exists() && userTokenDoc.data().fcmToken) {
        tokens.push(userTokenDoc.data().fcmToken);
      }
    }

    if (tokens.length === 0) {
      console.log('No valid FCM tokens found');
      return;
    }

    // Send notification to Cloud Function
    const response = await fetch('https://us-central1-padelbolt-5d9a2.cloudfunctions.net/sendNotification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokens: tokens,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: '/logo192.png',
          data: notification.data || {}
        }
      })
    });

    const result = await response.json();
    console.log('FCM notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    throw error;
  }
};
