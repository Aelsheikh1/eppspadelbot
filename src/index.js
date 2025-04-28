import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import OneSignal from 'react-onesignal';

(async function initOneSignal() {
  try {
    await OneSignal.init({
      appId: "6c89c857-e106-437a-b445-7150edf7cf22",
      safari_web_id: "web.onesignal.auto.1b1338f0-ae7a-49c0-a5a1-0112be9b9bea",
      allowLocalhostAsSecureOrigin: true,
      notifyButton: { enable: true },
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js"
    });
    console.log('[OneSignal] Initialized');
    OneSignal.Notifications.addEventListener('permissionChange', permission =>
      console.log('[OneSignal] permissionChange:', permission)
    );
  } catch (error) {
    console.error('[OneSignal] init error', error);
  }
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Report web vitals
reportWebVitals();
