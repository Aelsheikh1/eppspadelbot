// Intentionally left blank. Firebase/FCM notification logic removed. Only OneSignal is used.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    // wait until the SW is active before posting config
    .then(() => navigator.serviceWorker.ready)
    .then(registration => {
      console.log('Firebase-init: posting FIREBASE_CONFIG to SW', registration);
      registration.active.postMessage({
        type: 'FIREBASE_CONFIG',
        config: {
          apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
          authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
          storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.REACT_APP_FIREBASE_APP_ID,
          measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
          vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
        }
      });
    })
    .catch(err => console.error('Service worker registration failed:', err));
}
