import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { getMessaging } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { requestFcmToken } from './services/firebase';
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
    if (isNotificationInitialized) return;

    // Register service worker for notifications
    if ('serviceWorker' in navigator) {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
        console.log('✅ Service Worker registered:', registration);

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('✅ Service Worker ready');

        // Initialize Firebase Messaging
        const messaging = getMessaging(app);

        // Request permission and get FCM token
        const token = await requestFcmToken();
        if (token) {
          console.log('✅ FCM Token obtained:', token);
          // Store the token in localStorage
          localStorage.setItem('fcmToken', token);

          // Send token to service worker
          registration.active.postMessage({
            type: 'UPDATE_FCM_TOKEN',
            token: token
          });
        } else {
          console.warn('⚠️ Notification permission not granted');
        }
      } catch (error) {
        console.error('❌ Error registering service worker:', error);
        throw error; // Re-throw to be caught by the outer try-catch
      }
    } else {
      console.warn('⚠️ Service Worker not supported in this browser');
    }

    // Set flag to prevent re-initialization
    isNotificationInitialized = true;
  } catch (error) {
    console.error('❌ Error initializing notifications:', error);
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