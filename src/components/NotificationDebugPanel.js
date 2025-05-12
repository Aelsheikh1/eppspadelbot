import React, { useEffect, useState } from 'react';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || '<YOUR_VAPID_KEY_HERE>';

const NotificationDebugPanel = () => {
  const [permission, setPermission] = useState('unknown');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isSwRegistered, setIsSwRegistered] = useState(false);

  useEffect(() => {
    const checkNotification = async () => {
      if (!(await isSupported())) {
        setError('Notifications are not supported in this browser.');
        return;
      }
      setPermission(Notification.permission);
      try {
        // Check if service worker is registered
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
          setIsSwRegistered(!!reg);
        } else {
          setIsSwRegistered(false);
        }
        // Get FCM token
        const messaging = getMessaging();
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        setToken(token || 'No token');
      } catch (err) {
        setError(err.message);
        setToken('');
      }
    };
    checkNotification();
  }, []);

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch (err) {
      setError('Permission request failed: ' + err.message);
    }
  };

  return (
    <div style={{ background: '#222', color: '#fff', padding: 16, borderRadius: 8, margin: 16, fontSize: 14 }}>
      <h3>Notification Debug Panel</h3>
      <div>Permission: <b>{permission}</b></div>
      <div>Service Worker Registered: <b>{isSwRegistered ? 'Yes' : 'No'}</b></div>
      <div style={{ wordBreak: 'break-all' }}>FCM Token: <code>{token}</code></div>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      <button onClick={requestPermission} style={{ marginTop: 8, background: '#444', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px' }}>
        Request Notification Permission
      </button>
    </div>
  );
};

export default NotificationDebugPanel;
