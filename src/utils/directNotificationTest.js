import { db, auth, messaging } from '../services/firebase';
import { getToken } from 'firebase/messaging';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

// VAPID key for web push notifications
const VAPID_KEY = 'BMzSIFpKw-T23cx8aoIfssl2Q8oYxKZVIXY5qYkrAVOzXXOzN3eIhhyQhsuA6_mnC4go0hk9IWQ06Dwqe-eHSfE';

/**
 * Test function to directly show a notification bypassing Firebase
 */
export const showDirectNotification = async () => {
  try {
    // Check if notification permission is granted
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          error: 'Notification permission denied'
        };
      }
    }
    
    // Create and show a direct browser notification
    const notification = new Notification('Direct Test Notification', {
      body: 'This is a direct test notification bypassing Firebase',
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: 'direct-test-' + Date.now(),
      requireInteraction: true,
      vibrate: [200, 100, 200]
    });
    
    // Log notification creation
    console.log('Direct notification created:', notification);
    
    // Add click handler
    notification.onclick = () => {
      console.log('Direct notification clicked');
      notification.close();
      window.focus();
    };
    
    return {
      success: true,
      message: 'Direct notification shown'
    };
  } catch (error) {
    console.error('Error showing direct notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Function to test if the service worker is properly registered and receiving messages
 */
export const testServiceWorkerCommunication = async () => {
  try {
    if (!('serviceWorker' in navigator)) {
      return {
        success: false,
        error: 'Service Worker API not supported in this browser'
      };
    }
    
    // Check for service worker registration
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    
    if (!registration) {
      return {
        success: false,
        error: 'Service worker not registered'
      };
    }
    
    if (!registration.active) {
      return {
        success: false,
        error: 'Service worker not active',
        state: registration.installing ? 'installing' : registration.waiting ? 'waiting' : 'unknown'
      };
    }
    
    // Create a message channel to communicate with the service worker
    const messageChannel = new MessageChannel();
    
    // Create a promise to wait for the response
    const responsePromise = new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      
      // Set a timeout in case the service worker doesn't respond
      setTimeout(() => {
        resolve({ success: false, error: 'Service worker did not respond' });
      }, 3000);
    });
    
    // Send a test message to the service worker
    registration.active.postMessage({
      type: 'TEST_COMMUNICATION',
      timestamp: Date.now()
    }, [messageChannel.port2]);
    
    // Wait for the response
    const response = await responsePromise;
    
    return {
      success: true,
      serviceWorkerResponse: response,
      active: true
    };
  } catch (error) {
    console.error('Error testing service worker communication:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Function to verify Firebase configuration
 */
export const verifyFirebaseConfig = async () => {
  try {
    // Check if current user is authenticated
    const user = auth.currentUser;
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }
    
    // Try to get FCM token to test Firebase Messaging configuration
    try {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (!token) {
        return {
          success: false,
          error: 'Failed to get FCM token'
        };
      }
      
      // Check if token exists in Firestore
      const tokensQuery = query(collection(db, 'fcmTokens'), where('userId', '==', user.uid));
      const tokensSnapshot = await getDocs(tokensQuery);
      const tokenExists = tokensSnapshot.size > 0;
      
      return {
        success: true,
        token: token.substring(0, 10) + '...',
        tokenExists,
        tokenCount: tokensSnapshot.size,
        userId: user.uid
      };
    } catch (tokenError) {
      return {
        success: false,
        error: 'FCM token error: ' + tokenError.message
      };
    }
  } catch (error) {
    console.error('Error verifying Firebase config:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Function to test sending a notification to the service worker
 */
export const testServiceWorkerNotification = async () => {
  try {
    if (!('serviceWorker' in navigator)) {
      return {
        success: false,
        error: 'Service Worker API not supported in this browser'
      };
    }
    
    // Check for service worker registration
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    
    if (!registration || !registration.active) {
      return {
        success: false,
        error: 'Service worker not registered or not active'
      };
    }
    
    // Send a test notification message to the service worker
    registration.active.postMessage({
      type: 'SHOW_TEST_NOTIFICATION',
      title: 'Test Notification',
      body: 'This is a test notification sent directly to the service worker',
      timestamp: Date.now()
    });
    
    return {
      success: true,
      message: 'Test notification message sent to service worker'
    };
  } catch (error) {
    console.error('Error testing service worker notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
