import { Capacitor } from '@capacitor/core';
import { FirebaseX } from '@ionic-native/firebase-x';

/**
 * Initialize mobile push notifications
 * This will only run in the native mobile environment (Android/iOS)
 * @param {Function} onTokenReceived - Callback function to handle the FCM token
 * @param {Function} onMessageReceived - Callback function to handle received messages
 */
export const initMobileNotifications = async (onTokenReceived, onMessageReceived) => {
  // Only run in native mobile environment
  if (!Capacitor.isNativePlatform()) {
    console.log('[Mobile Notifications] Not running in native environment, skipping initialization');
    return false;
  }

  try {
    console.log('[Mobile Notifications] Initializing mobile notifications');
    
    // Get FCM token
    const token = await FirebaseX.getToken();
    console.log('[Mobile Notifications] FCM Token:', token);
    
    // Call the callback with the token
    if (token && typeof onTokenReceived === 'function') {
      onTokenReceived(token);
    }
    
    // Listen for foreground messages
    if (typeof onMessageReceived === 'function') {
      FirebaseX.onMessageReceived().subscribe(data => {
        console.log('[Mobile Notifications] Push received:', data);
        onMessageReceived(data);
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
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  
  try {
    const result = await FirebaseX.hasPermission();
    if (!result) {
      await FirebaseX.grantPermission();
    }
    return true;
  } catch (error) {
    console.error('[Mobile Notifications] Error requesting permission:', error);
    return false;
  }
};
