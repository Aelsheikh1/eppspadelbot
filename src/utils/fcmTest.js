import { getMessaging, getToken } from 'firebase/messaging';
import { doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../services/firebase';

/**
 * Test function to verify FCM setup and diagnose notification issues
 * @returns {Promise<Object>} Test results
 */
export const testFcmSetup = async () => {
  try {
    console.log('[FCM Test] Starting FCM test...');
    
    // Check if user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('[FCM Test] No user logged in');
      return {success: false, error: 'User not logged in'};
    }
    
    // Check notification permission
    if (Notification.permission !== 'granted') {
      console.log('[FCM Test] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log(`[FCM Test] Permission status: ${permission}`);
      if (permission !== 'granted') {
        return {success: false, error: 'Notification permission denied'};
      }
    }
    
    // Check service worker registration
    if (!('serviceWorker' in navigator)) {
      return {success: false, error: 'Service workers not supported'};
    }
    
    // Get service worker registration
    console.log('[FCM Test] Checking service worker...');
    let swReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    
    if (!swReg) {
      console.log('[FCM Test] Service worker not found, registering new one...');
      try {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('[FCM Test] Service worker registered');
        
        // Wait for the service worker to activate
        if (swReg.installing) {
          console.log('[FCM Test] Waiting for service worker to activate...');
          await new Promise(resolve => {
            swReg.installing.addEventListener('statechange', (event) => {
              if (event.target.state === 'activated') {
                console.log('[FCM Test] Service worker activated');
                resolve();
              }
            });
          });
        }
      } catch (swError) {
        console.error('[FCM Test] Service worker registration error:', swError);
        return {success: false, error: `Service worker registration failed: ${swError.message}`};
      }
    }
    
    console.log('[FCM Test] Service worker status:', swReg.active ? 'active' : 'not active');
    
    // Try to get FCM token
    console.log('[FCM Test] Getting FCM token...');
    const messaging = getMessaging();
    const vapidKey = 'BMzSIFpKw-T23cx8aoIfssl2Q8oYxKZVIXY5qYkrAVOzXXOzN3eIhhyQhsuA6_mnC4go0hk9IWQ06Dwqe-eHSfE';
    
    const fcmToken = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swReg
    });
    
    if (!fcmToken) {
      return {success: false, error: 'Failed to get FCM token'};
    }
    
    console.log('[FCM Test] Successfully got FCM token:', fcmToken.substring(0, 10) + '...');
    
    // Store token in user document
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(fcmToken),
        lastTokenUpdate: new Date().toISOString()
      });
      console.log('[FCM Test] Token stored in user document');
    } catch (userUpdateError) {
      console.error('[FCM Test] Error updating user document:', userUpdateError);
    }
    
    // Store test result in Firestore
    try {
      const testRef = doc(db, 'fcmTests', new Date().toISOString().replace(/[:.]/g, '_'));
      await setDoc(testRef, {
        timestamp: new Date().toISOString(),
        userId: currentUser.uid,
        success: true,
        tokenPrefix: fcmToken.substring(0, 10),
        tokenFull: fcmToken,
        browser: navigator.userAgent,
        vapidKey: vapidKey
      });
      console.log('[FCM Test] Test result stored in Firestore');
    } catch (firestoreError) {
      console.error('[FCM Test] Error storing test result:', firestoreError);
      // Continue even if this fails - it's not critical
    }
    
    // Test sending a local notification
    try {
      const notification = new Notification('FCM Test Notification', {
        body: 'This is a test notification from your app',
        icon: '/logo192.png',
        tag: 'fcm-test',
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });
      
      console.log('[FCM Test] Local notification displayed');
    } catch (notificationError) {
      console.error('[FCM Test] Error showing local notification:', notificationError);
    }
    
    return {
      success: true, 
      token: fcmToken.substring(0, 10) + '...',
      serviceWorkerActive: !!swReg.active,
      notificationPermission: Notification.permission,
      fullToken: fcmToken // Include full token for debugging
    };
  } catch (error) {
    console.error('[FCM Test] Error:', error);
    return {success: false, error: error.message};
  }
};

/**
 * Show a local notification for testing
 */
export const showTestNotification = () => {
  try {
    if (Notification.permission !== 'granted') {
      console.warn('[FCM Test] Notification permission not granted');
      return false;
    }
    
    const notification = new Notification('Test Notification', {
      body: 'This is a test notification with dark mode styling',
      icon: '/logo192.png',
      badge: '/logo192.png',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      tag: 'test-notification-' + Date.now(),
      renotify: true,
      silent: false
    });
    
    notification.onclick = () => {
      console.log('[FCM Test] Notification clicked');
      window.focus();
      notification.close();
    };
    
    return true;
  } catch (error) {
    console.error('[FCM Test] Error showing test notification:', error);
    return false;
  }
};
