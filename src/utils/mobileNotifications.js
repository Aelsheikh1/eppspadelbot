import { Capacitor } from '@capacitor/core';
// Use direct plugin access for FirebaseX
const FirebaseX = Capacitor.isNativePlatform() ? window.FirebasePlugin : null;

/**
 * Initialize mobile push notifications
 * This will only run in the native mobile environment (Android/iOS)
 * @param {Function} onTokenReceived - Callback function to handle the FCM token
 * @param {Function} onMessageReceived - Callback function to handle received messages
 */
export const initMobileNotifications = async (onTokenReceived, onMessageReceived) => {
  // Only run in native mobile environment
  if (!Capacitor.isNativePlatform() || !FirebaseX) {
    console.log('[Mobile Notifications] Not running in native environment or FirebaseX not available, skipping initialization');
    return false;
  }

  try {
    console.log('[Mobile Notifications] Initializing mobile notifications');
    
    // Request permission first
    await requestMobileNotificationPermission();
    
    // Get FCM token
    FirebaseX.getToken((token) => {
      console.log('[Mobile Notifications] FCM Token:', token);
      
      // Call the callback with the token
      if (token && typeof onTokenReceived === 'function') {
        onTokenReceived(token);
      }
    }, (error) => {
      console.error('[Mobile Notifications] Error getting token:', error);
    });
    
    // Listen for foreground messages
    if (typeof onMessageReceived === 'function') {
      FirebaseX.onMessageReceived((data) => {
        console.log('[Mobile Notifications] Push received:', data);
        
        // Format the notification data to match web format
        const formattedData = {
          notification: {
            title: data.title || data.messageTitle || '',
            body: data.body || data.message || '',
            icon: data.icon || '/favicon-96x96.png'
          },
          data: data.tap ? { ...data } : { ...data, tap: 'foreground' }
        };
        
        onMessageReceived(formattedData);
      }, (error) => {
        console.error('[Mobile Notifications] Error receiving message:', error);
      });
    }
    
    return true;
  } catch (error) {
    console.error('[Mobile Notifications] Error initializing:', error);
    return false;
  }
};

/**
 * Check if running in a native mobile environment
 * @returns {boolean}
 */
export const isMobileNative = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Request permission for push notifications on mobile
 * @returns {Promise<boolean>}
 */
export const requestMobileNotificationPermission = async () => {
  if (!Capacitor.isNativePlatform() || !FirebaseX) {
    return false;
  }
  
  return new Promise((resolve) => {
    try {
      FirebaseX.hasPermission((hasPermission) => {
        console.log('[Mobile Notifications] Has permission:', hasPermission);
        
        if (!hasPermission) {
          FirebaseX.grantPermission((granted) => {
            console.log('[Mobile Notifications] Permission granted:', granted);
            resolve(true);
          }, (error) => {
            console.error('[Mobile Notifications] Error granting permission:', error);
            resolve(false);
          });
        } else {
          resolve(true);
        }
      }, (error) => {
        console.error('[Mobile Notifications] Error checking permission:', error);
        resolve(false);
      });
    } catch (error) {
      console.error('[Mobile Notifications] Error requesting permission:', error);
      resolve(false);
    }
  });
};
