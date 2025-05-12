// Simple mobile notifications implementation
import { Capacitor } from '@capacitor/core';

/**
 * Check if running in a native mobile environment
 * @returns {boolean}
 */
export const isMobileNative = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Initialize mobile push notifications
 * This will only run in the native mobile environment (Android/iOS)
 * @param {Function} onTokenReceived - Callback function to handle the FCM token
 * @param {Function} onMessageReceived - Callback function to handle received messages
 */
export const initMobileNotifications = async (onTokenReceived, onMessageReceived) => {
  // Only run in native mobile environment
  if (!isMobileNative()) {
    console.log('[Mobile Notifications] Not running in native environment, skipping initialization');
    return false;
  }

  try {
    console.log('[Mobile Notifications] Initializing mobile notifications');
    
    // Access the FirebaseX plugin directly from window
    const firebasePlugin = window.FirebasePlugin;
    
    if (!firebasePlugin) {
      console.error('[Mobile Notifications] FirebasePlugin not found in window object');
      return false;
    }
    
    // Request permission
    await requestMobileNotificationPermission();
    
    // Get FCM token using callback style
    firebasePlugin.getToken(token => {
      console.log('[Mobile Notifications] FCM token received:', token);
      if (onTokenReceived && typeof onTokenReceived === 'function') {
        onTokenReceived(token);
      }
    });
    
    // Set up notification handlers
    firebasePlugin.onMessageReceived(message => {
      console.log('[Mobile Notifications] Message received:', message);
      if (onMessageReceived && typeof onMessageReceived === 'function') {
        // Format the message to match web format
        const formattedMessage = {
          notification: {
            title: message.title || '',
            body: message.body || '',
          },
          data: message.data || {}
        };
        onMessageReceived(formattedMessage);
      }
    });
    
    return true;
  } catch (error) {
    console.error('[Mobile Notifications] Error initializing:', error);
    return false;
  }
};

/**
 * Request permission for push notifications on mobile
 * @returns {Promise<boolean>}
 */
export const requestMobileNotificationPermission = async () => {
  if (!isMobileNative()) {
    return false;
  }
  
  try {
    const firebasePlugin = window.FirebasePlugin;
    
    if (!firebasePlugin) {
      console.error('[Mobile Notifications] FirebasePlugin not found in window object');
      return false;
    }
    
    return new Promise(resolve => {
      firebasePlugin.grantPermission(granted => {
        console.log('[Mobile Notifications] Permission granted:', granted);
        resolve(true);
      }, error => {
        console.error('[Mobile Notifications] Error granting permission:', error);
        resolve(false);
      });
    });
  } catch (error) {
    console.error('[Mobile Notifications] Error requesting permission:', error);
    return false;
  }
};
