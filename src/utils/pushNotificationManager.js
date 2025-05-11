import { isPushNotificationsSupported, initializePushNotifications, removeFcmToken } from './nativePushNotifications';
import { initializeNotifications, requestNotificationPermission, showNotification } from './crossPlatformNotifications';

// Detect if we're running in a Capacitor native app environment
const isNativeApp = () => {
  return typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNative;
};

// Detect if we're on a mobile device
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Initialize the appropriate notification system
export const initializeAppNotifications = async () => {
  console.log('Initializing app notifications');
  
  if (isNativeApp() && isPushNotificationsSupported()) {
    // We're in a native app with push support
    console.log('Using native push notifications');
    return await initializePushNotifications();
  } else {
    // We're in a browser
    console.log('Using web notifications');
    return await initializeNotifications();
  }
};

// Request permission for notifications
export const requestAppNotificationPermission = async () => {
  if (isNativeApp() && isPushNotificationsSupported()) {
    // Native app handles permission in initialization
    return await initializePushNotifications();
  } else {
    // Browser notification permission
    return await requestNotificationPermission();
  }
};

// Show a notification
export const showAppNotification = (title, options) => {
  if (isNativeApp() && isPushNotificationsSupported()) {
    // Native apps receive push notifications from Firebase directly
    // This function is mainly for testing
    console.log('Native notification requested:', title, options);
    // You could implement a local notification here if needed
    return true;
  } else {
    // Show browser notification
    return showNotification(title, options);
  }
};

// Remove notification token on logout
export const removeNotificationToken = async () => {
  if (isNativeApp() && isPushNotificationsSupported()) {
    await removeFcmToken();
  }
  // No specific cleanup needed for web notifications
};

// Check if notifications are supported
export const areNotificationsSupported = () => {
  if (isNativeApp()) {
    return isPushNotificationsSupported();
  } else {
    return 'Notification' in window;
  }
};

// Get notification system info
export const getNotificationSystemInfo = () => {
  return {
    isNativeApp: isNativeApp(),
    isMobileDevice: isMobileDevice,
    notificationsSupported: areNotificationsSupported(),
    systemType: isNativeApp() ? 'Native App' : isMobileDevice ? 'Mobile Browser' : 'Desktop Browser',
    // Apply dark mode styling based on user preference
    style: {
      backgroundColor: '#2A2A2A',
      textColor: '#FFFFFF',
      iconColor: '#7986cb'
    }
  };
};
