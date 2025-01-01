importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAyZAakNVP3eOnIeJ1qB1Ki-6qRgZ4VBg8",
  authDomain: "padelbolt-5d9a2.firebaseapp.com",
  projectId: "padelbolt-5d9a2",
  messagingSenderId: "773090904452",
  appId: "1:773090904452:web:e33380da424fe8d69e75d1",
  vapidKey: "BIq74BpG72bX8YlHuDMfYpDtrcd2Q-Wg5U_5-aPV1dVTN4zBMwN_gZdwY0D3EzUYXWz7ONiRaPW-_jVzYpHppTo"
});

const messaging = firebase.messaging();

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

// Handle background messages
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
    requireInteraction: true // Keep the notification visible until user interacts with it
  };

  console.log('Showing notification:', { title: notificationTitle, options: notificationOptions });
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Get the notification data
  const data = event.notification.data || {};
  const urlToOpen = data.url || 'https://eppspadelbot.vercel.app/games';

  // This will focus on the tab if it exists, or create a new one if it doesn't
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to find an existing window
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .then(() => {
        // Notify all clients about the click
        return clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then((clientList) => {
            clientList.forEach((client) => {
              client.postMessage({
                type: 'NOTIFICATION_CLICK',
                url: urlToOpen
              });
            });
          });
      })
  );
});
