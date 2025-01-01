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
    icon: payload.notification.icon || '/logo192.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
