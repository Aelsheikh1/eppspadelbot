// Test script to verify FCM notifications
import { getMessaging, getToken } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { doc, setDoc, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAyZAakNVP3eOnIeJ1qB1Ki-6qRgZ4VBg8",
  authDomain: "padelbolt-5d9a2.firebaseapp.com",
  projectId: "padelbolt-5d9a2",
  storageBucket: "padelbolt-5d9a2.firebasestorage.app",
  messagingSenderId: "773090904452",
  appId: "1:773090904452:web:e33380da424fe8d69e75d1",
  measurementId: "G-1PRKH5C8NV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const db = getFirestore(app);

// Function to request notification permission and get FCM token
export const testNotificationSetup = async () => {
  try {
    console.log('Testing notification setup...');
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.error('Notifications not supported in this browser');
      return false;
    }
    
    // Request permission
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.error('Notification permission denied');
        return false;
      }
    }
    
    console.log('Notification permission granted');
    
    // Get FCM token
    const vapidKey = 'BFwJPRoQjDQXJJBmKkUZLZNlXNLkOvZkdpZQMvmwRdgkrYZHRXXFGjJLUPdnJnRXTGxJZFQDZnvYZGGvYZJLGZX';
    
    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
    });
    
    if (!currentToken) {
      console.error('No FCM token received');
      return false;
    }
    
    console.log('FCM token received:', currentToken);
    
    // Store token in localStorage
    localStorage.setItem('fcmToken', currentToken);
    
    // Store token in Firestore for testing
    const tokenRef = doc(collection(db, 'fcmTokens'), 'test-token');
    await setDoc(tokenRef, {
      userId: 'test-user',
      token: currentToken,
      createdAt: new Date().toISOString(),
      platform: 'web',
      deviceInfo: navigator.userAgent
    });
    
    console.log('Token saved to Firestore');
    
    // Send token to service worker
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (registration && registration.active) {
      registration.active.postMessage({
        type: 'UPDATE_FCM_TOKEN',
        token: currentToken
      });
      console.log('Token sent to service worker');
    }
    
    // Show a test notification
    const testNotification = new Notification('Test Notification', {
      body: 'This is a test notification from the browser',
      icon: '/logo192.png'
    });
    
    // Add click handler
    testNotification.onclick = () => {
      console.log('Test notification clicked');
      testNotification.close();
      window.focus();
    };
    
    return true;
  } catch (error) {
    console.error('Error testing notification setup:', error);
    return false;
  }
};

// Function to test sending a notification via FCM
export const testSendNotification = async () => {
  try {
    // Get the FCM token from localStorage
    const token = localStorage.getItem('fcmToken');
    if (!token) {
      console.error('No FCM token found in localStorage');
      return false;
    }
    
    // Create a test notification document in Firestore
    const notificationRef = doc(collection(db, 'notifications'), 'test-notification');
    await setDoc(notificationRef, {
      title: 'Test FCM Notification',
      body: 'This is a test notification sent via Firebase Cloud Messaging',
      token: token,
      createdAt: new Date().toISOString(),
      read: false,
      type: 'test',
      data: {
        gameId: 'test-game',
        url: '/games/test-game'
      }
    });
    
    console.log('Test notification document created in Firestore');
    return true;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
};

// Export test functions
export default {
  testNotificationSetup,
  testSendNotification
};
