import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import OneSignal from 'react-onesignal';

const oneSignalInit = async () => {
  try {
    // Detailed browser and environment checks
    console.group('🔍 OneSignal Pre-Initialization Checks');
    console.log('Window Object:', typeof window !== 'undefined');
    console.log('Navigator Object:', window.navigator ? 'Available' : 'Unavailable');
    console.log('Secure Context:', window.isSecureContext);
    console.log('Hostname:', window.location.hostname);
    console.log('Notification Support:', 'Notification' in window);
    console.groupEnd();

    // Check browser support
    if (typeof window === 'undefined' || !window.navigator) {
      console.error('🚫 Browser environment not supported');
      return;
    }

    // Ensure secure context
    if (!window.isSecureContext && !window.location.hostname.includes('localhost')) {
      console.warn('🔒 Not in a secure context. Notifications may not work.');
      return;
    }

    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.error('🚫 Browser does not support desktop notifications');
      return;
    }

    // Log OneSignal initialization details
    console.log('🔔 OneSignal App ID:', process.env.REACT_APP_ONESIGNAL_APP_ID || "6c89c857-e106-437a-b445-7150edf7cf22");

    await OneSignal.init({
      appId: process.env.REACT_APP_ONESIGNAL_APP_ID || "6c89c857-e106-437a-b445-7150edf7cf22",
      allowLocalhostAsSecureOrigin: true,
      notifyButton: { enable: true },
      autoRegister: true,
      welcomeNotification: {
        title: "Padel Tournament Notifications",
        message: "You'll now receive game updates!"
      },
      promptOptions: {
        slidedown: {
          enabled: true,
          autoPrompt: true,
          actionMessage: 'Enable notifications for game updates',
          acceptButtonText: 'Allow',
          cancelButtonText: 'Not Now'
        }
      }
    });

    console.group('🔔 [OneSignal] Comprehensive Initialization');
    console.log('✅ OneSignal Initialized Successfully');

    // Comprehensive event listeners
    OneSignal.Notifications.addEventListener('permissionChange', async (permission) => {
      console.log('🔄 Permission Status Changed:', permission);
      
      // Log detailed permission information
      const currentPermission = await OneSignal.Notifications.permission;
      console.log('📋 Current Permission Details:', {
        status: currentPermission,
        isSupported: OneSignal.Notifications.supportsPermissionRequest(),
        isPushSupported: OneSignal.Notifications.isPushSupported()
      });
    });

    OneSignal.Notifications.addEventListener('click', (event) => {
      console.log('🖱️ Notification Clicked:', event);
    });

    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
      console.log('📢 Notification Will Display:', event);
    });

    // Explicit permission request
    try {
      // Basic permission check and request
      console.log('🔍 Checking Notification Permissions');

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.error('🚫 Notifications not supported in this browser');
        return;
      }

      // Get current permission status
      const currentPermission = Notification.permission;
      console.log('📋 Current Permission Status:', currentPermission);

      // Request permission if not already granted
      if (currentPermission !== 'granted') {
        console.warn('⚠️ Notification Permission Not Granted. Requesting...');
        
        try {
          const newPermission = await Notification.requestPermission();
          console.log('🎉 New Permission Status:', newPermission);

          if (newPermission === 'granted') {
            console.log('✅ Notifications Enabled Successfully');
          } else {
            console.warn('⚠️ Notification Permission Denied or Dismissed');
          }
        } catch (permissionError) {
          console.error('🚫 Permission Request Error:', permissionError);
        }
      } else {
        console.log('✅ Notifications Already Permitted');
      }
    } catch (error) {
      console.group('🚨 Notification Permission Error');
      console.error('Error Details:', error);
      console.error('Error Name:', error.name);
      console.error('Error Message:', error.message);
      console.groupEnd();
    }

    console.groupEnd();
  } catch (error) {
    console.group('🚨 [OneSignal] Initialization Error');
    console.error('Detailed Error:', error);
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.groupEnd();
  }
};

oneSignalInit();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then(reg => {
      console.log('✅ FCM Service Worker registered:', reg);
    })
    .catch(err => {
      console.error('❌ FCM Service Worker registration failed:', err);
    });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Report web vitals
reportWebVitals();