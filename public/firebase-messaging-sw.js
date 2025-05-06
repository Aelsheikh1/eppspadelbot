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
    // Get Firebase config from main thread
    const firebaseConfig = {
      apiKey: "AIzaSyAyZAakNVP3eOnIeJ1qB1Ki-6qRgZ4VBg8",
      authDomain: "padelbolt-5d9a2.firebaseapp.com",
      projectId: "padelbolt-5d9a2",
      storageBucket: "padelbolt-5d9a2.firebasestorage.app",
      messagingSenderId: "773090904452",
      appId: "1:773090904452:web:e33380da424fe8d69e75d1",
      measurementId: "G-1PRKH5C8NV"
    };

    app = firebase.initializeApp(firebaseConfig);
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
    const gameUrl = notificationData.url || '/games'; // Relative path for better compatibility

    // Generate a unique tag based on notification type and data
    const notificationTag = `notification-${payload.notification.type || 'default'}-${notificationData.gameId || 'default'}-${Date.now()}`;

    // Close all existing notifications
    const existingNotifications = await self.registration.getNotifications();
    existingNotifications.forEach(notification => notification.close());

    // Create notification options
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
        }
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200],
      renotify: false,
      silent: false
    };

    // Show notification
    const notification = await self.registration.showNotification(notificationTitle, notificationOptions);

    // Handle notification click
    self.addEventListener('notificationclick', (event) => {
      console.log('Notification clicked:', event);
      
      event.notification.close();
      
      // Get the action that was clicked
      const action = event.action;
      
      // Handle the action
      switch (action) {
        case 'open':
          // Open the game URL
          event.waitUntil(
            clients.matchAll({
              type: 'window',
              includeUncontrolled: true
            }).then(windowClients => {
              // Check if we already have a window open with the target URL
              let matchingClient = null;
              for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === event.notification.data.url && 'focus' in client) {
                  matchingClient = client;
                  break;
                }
              }

              if (matchingClient) {
                return matchingClient.focus();
              }

              // If no existing window, open a new one
              return clients.openWindow(event.notification.data.url);
            })
          );
          break;
        
        default:
          console.log('Unknown action:', action);
          break;
      }
    });

    // Handle notification close
    self.addEventListener('notificationclose', (event) => {
      console.log('Notification closed:', event);
    });

  } catch (error) {
    console.error('❌ Error handling notification:', error);
  }
};
