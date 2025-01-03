importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');

const firebaseConfig = {
  apiKey: "AIzaSyAyZAakNVP3eOnIeJ1qB1Ki-6qRgZ4VBg8",
  authDomain: "padelbolt-5d9a2.firebaseapp.com",
  projectId: "padelbolt-5d9a2",
  storageBucket: "padelbolt-5d9a2.appspot.com",
  messagingSenderId: "773090904452",
  appId: "1:773090904452:web:e33380da424fe8d69e75d1",
  measurementId: "G-1PRKH5C8NV",
  vapidKey: "BIq74BpG72bX8YlHuDMfYpDtrcd2Q-Wg5U_5-aPV1dVTN4zBMwN_gZdwY0D3EzUYXWz7ONiRaPW-_jVzYpHppTo"
};

const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(app);

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

  return self.registration.showNotification(notificationTitle, notificationOptions);
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
