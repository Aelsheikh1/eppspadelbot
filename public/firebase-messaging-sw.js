importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase with the provided config
let app;
let messaging;
let token = null;

// Initialize Firebase when the service worker is installed
self.addEventListener('install', (event) => {
  console.log('Service Worker installed:', event);
  self.skipWaiting(); // Ensure the service worker activates immediately

  // Initialize Firebase
  if (app) {
    console.log('✅ Firebase already initialized');
    return;
  }

  try {
    app = firebase.initializeApp({
      apiKey: "${process.env.REACT_APP_FIREBASE_API_KEY}",
      authDomain: "${process.env.REACT_APP_FIREBASE_AUTH_DOMAIN}",
      projectId: "${process.env.REACT_APP_FIREBASE_PROJECT_ID}",
      storageBucket: "${process.env.REACT_APP_FIREBASE_STORAGE_BUCKET}",
      messagingSenderId: "${process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID}",
      appId: "${process.env.REACT_APP_FIREBASE_APP_ID}",
      measurementId: "${process.env.REACT_APP_FIREBASE_MEASUREMENT_ID}"
    });
    messaging = firebase.messaging(app);
    
    // Set up background message handler
    messaging.onBackgroundMessage((payload) => {
      handleNotification(payload);
    });

    console.log('✅ Service Worker initialized with Firebase');
  } catch (error) {
    console.error('❌ Error initializing Firebase in Service Worker:', error);
  }
});

// Handle incoming messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REFRESH_TOKEN') {
    try {
      token = event.data.token;
      console.log('✅ Token refreshed:', token);
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  // Close the notification
  event.notification.close();

  // Get the action (if any)
  const action = event.action;
  const notification = event.notification;
  const data = notification.data || {};
  const urlToOpen = data.url || 'https://eppspadelbot.vercel.app/games';

  if (action === 'close') {
    return; // Just close the notification
  }

  // Focus on existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Try to find an existing window
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated:', event);
  event.waitUntil(clients.claim()); // Take control of all clients immediately
});

// Centralized notification handling
const handleNotification = async (payload) => {
  try {
    console.log('Received notification:', payload);

    // Extract notification data
    const notificationTitle = payload.notification.title || 'New Game Available!';
    const notificationBody = payload.notification.body || 'A new game has been created!';
    const notificationData = payload.data || {};
    const gameUrl = notificationData.url || 'https://eppspadelbot.vercel.app/games';

    // Generate a unique tag based on notification type and data
    const notificationTag = `notification-${payload.notification.type || 'default'}-${notificationData.gameId || 'default'}`;

    // Check if notification with this tag already exists
    const existingNotifications = await self.registration.getNotifications({ tag: notificationTag });
    if (existingNotifications.length > 0) {
      // Update existing notification instead of creating a new one
      existingNotifications[0].close();
    }

    const notificationOptions = {
      body: notificationBody,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: notificationTag,
      data: {
        url: gameUrl,
        gameId: notificationData.gameId,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'open',
          title: 'View Game'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200],
      renotify: false,
      silent: false
    };

    await self.registration.showNotification(notificationTitle, notificationOptions);
  } catch (error) {
    console.error('❌ Error handling notification:', error);
  }
};
