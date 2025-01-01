importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAyZAakNVP3eOnIeJ1qB1Ki-6qRgZ4VBg8",
  authDomain: "padelbolt-5d9a2.firebaseapp.com",
  projectId: "padelbolt-5d9a2",
  messagingSenderId: "773090904452",
  appId: "1:773090904452:web:e33380da424fe8d69e75d1"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    tag: 'game-notification',
    data: {
      url: self.location.origin + '/games'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || self.location.origin + '/games';

  // This will focus on the tab if it exists, or create a new one if it doesn't
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );

  // Notify the app about the click
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: urlToOpen
          });
        });
      })
  );
});
