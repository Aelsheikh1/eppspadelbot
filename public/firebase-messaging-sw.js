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

      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'game-notification',
        data: payload.data || {
          url: 'https://eppspadelbot.vercel.app/games'
        },
        actions: [
          {
            action: 'open',
            title: 'View Game'
          }
        ],
        requireInteraction: true
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

  event.notification.close();

  const urlToOpen = event.notification.data?.url || 'https://eppspadelbot.vercel.app/games';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window/tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
