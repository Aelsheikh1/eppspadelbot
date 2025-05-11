import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { getMessaging } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { requestFcmToken, setupTokenRefresh } from './services/firebase';
import { auth, db } from './services/firebase';

// Initialize Firebase app
const firebaseConfig = {
  apiKey: "AIzaSyAyZAakNVP3eOnIeJ1qB1Ki-6qRgZ4VBg8",
  authDomain: "padelbolt-5d9a2.firebaseapp.com",
  projectId: "padelbolt-5d9a2",
  storageBucket: "padelbolt-5d9a2.firebasestorage.app",
  messagingSenderId: "773090904452",
  appId: "1:773090904452:web:e33380da424fe8d69e75d1",
  measurementId: "G-1PRKH5C8NV"
};

const app = initializeApp(firebaseConfig);

let isNotificationInitialized = false;

const initializeNotifications = async () => {
  try {
    // Check if notifications have already been initialized in this session
    if (isNotificationInitialized) return;
    
    // Check if notifications have been initialized in a previous session
    const notificationInitialized = localStorage.getItem('notificationInitialized');
    if (notificationInitialized === 'true') {
      console.log('🔔 Notifications already initialized in a previous session');
      isNotificationInitialized = true;
      return;
    }

    console.log('🔔 Initializing notifications for the first time...');

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications not supported in this browser');
      return;
    }

    // Request notification permission if not already granted
    if (Notification.permission !== 'granted') {
      console.log('🔔 Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('⚠️ Notification permission denied');
        return;
      }
      console.log('✅ Notification permission granted');
    }
    
    // Wait for authentication to be initialized before proceeding
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');
    const auth = getAuth();
    
    // Wait for auth state to be determined
    await new Promise(resolve => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        console.log('🔔 Auth state resolved:', user ? 'User authenticated' : 'No user');
        resolve(user);
      });
    });

    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      try {
        // Import the service worker initialization function
        const { initializeServiceWorker, setupTokenRefresh } = await import('./services/firebase');
        
        // Register service worker for notification support
        const registration = await initializeServiceWorker();
        console.log('✅ Service Worker registered successfully');
        
        // Set up token refresh monitoring
        setupTokenRefresh();
        console.log('✅ FCM token refresh monitoring activated');
        
        // Wait for the service worker to be ready
        const swRegistration = await navigator.serviceWorker.ready;
        console.log('✅ Service Worker ready');
        
        // Request notification permission and register device
        console.log('🔔 Setting up notifications...');
        const { registerDevice } = await import('./services/notificationService');
        const deviceId = await registerDevice();
        
        if (deviceId) {
          console.log('✅ Device registered:', deviceId);
          
          // Get FCM token directly from firebase.js (our improved implementation)
          const { requestFcmToken } = await import('./services/firebase');
          const token = await requestFcmToken();
          
          if (token) {
            console.log('✅ FCM token registered:', token.substring(0, 10) + '...');
            
            // Send the token to the service worker for background notifications
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'UPDATE_FCM_TOKEN',
                token: token
              });
              console.log('✅ FCM token sent to Service Worker');
            }
          } else {
            console.warn('⚠️ Could not register FCM token');
          }
        } else {
          console.warn('⚠️ Could not register device for notifications');
        }
        
        // Also call the old method for compatibility
        const { requestFcmToken } = await import('./services/firebase');
        const token = await requestFcmToken();
        if (token) {
          console.log('✅ Legacy notification setup complete');
        } else {
          console.warn('⚠️ Legacy notification setup failed, but this is OK');
        }
      } catch (error) {
        console.error('❌ Error registering service worker:', error);
      }
    } else {
      console.warn('⚠️ Service Worker not supported in this browser');
    }

    // Set flags to prevent re-initialization both in memory and localStorage
    isNotificationInitialized = true;
    localStorage.setItem('notificationInitialized', 'true');
    
    // Show a welcome notification only on first initialization
    if (Notification.permission === 'granted') {
      // Use a timeout to ensure this doesn't block the app initialization
      setTimeout(() => {
        try {
          new Notification('Notifications Enabled', {
            body: 'You will now receive notifications for games and tournaments.',
            icon: '/logo192.png',
            silent: false
          });
        } catch (e) {
          console.error('Error showing welcome notification:', e);
        }
      }, 2000);
    }
  } catch (error) {
    console.error('❌ Error initializing notifications:', error);
    console.error(error);
  }
};

// Initialize notifications
initializeNotifications();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Report web vitals
reportWebVitals();