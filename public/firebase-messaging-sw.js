importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');

let app;
let messaging;

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    // Initialize Firebase with the received config
    app = firebase.initializeApp(event.data.config);
    messaging = firebase.messaging(app);
    
    // Set up background message handler
    messaging.onBackgroundMessage((payload) => {
      console.log('Received background message:', payload);

      // Extract notification data
      const notificationTitle = payload.notification.title || 'New Game Available!';
      const notificationBody = payload.notification.body || 'A new game has been created!';
      const notificationData = payload.data || {};
      const gameUrl = notificationData.url || 'https://eppspadelbot.vercel.app/games';

      const notificationOptions = {
        body: notificationBody,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'game-notification',
        data: {
          url: gameUrl,
          gameId: notificationData.gameId
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
        requireInteraction: true, // Keep notification visible until user interacts
        vibrate: [200, 100, 200], // Vibration pattern
        renotify: true // Always notify, even if there's an existing notification
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});

// Log when the service worker is installed
self.addEventListener('install', (event) => {
  console.log('Service Worker installed:', event);
  self.skipWaiting(); // Ensure the service worker activates immediately
});

// Log when the service worker is activated
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated:', event);
  event.waitUntil(clients.claim()); // Take control of all clients immediately
});

// Handle notification click
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
