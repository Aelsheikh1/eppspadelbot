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

// DEPRECATED: Do not use this function in frontend builds.
// All notification sending must go through Firebase callable functions to avoid CORS issues.
export const sendFCMNotification = async () => {
  throw new Error('[DEPRECATED] sendFCMNotification is not available in frontend build. Use a Firebase callable function (e.g., sendDirectNotification) instead.');
};
