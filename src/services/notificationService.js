
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, getDocs, query, where, setDoc, onSnapshot, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Subscribe to topic for specific game notifications
export const subscribeToGame = async (gameId) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('User not logged in. Cannot subscribe to game.');
      return false;
    }
    
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      subscribedGames: arrayUnion(gameId)
    });
    
    console.log(`Subscribed to game: ${gameId}`);
    return true;
  } catch (error) {
    console.error('Error subscribing to game:', error);
    return false;
  }
};

// Unsubscribe from game notifications
export const unsubscribeFromGame = async (gameId) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('User not logged in. Cannot unsubscribe from game.');
      return false;
    }
    
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      subscribedGames: arrayRemove(gameId)
    });
    
    console.log(`Unsubscribed from game: ${gameId}`);
    return true;
  } catch (error) {
    console.error('Error unsubscribing from game:', error);
    return false;
  }
};

// Update notification settings
export const updateNotificationSettings = async (settings) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('User not logged in. Cannot update notification settings.');
      return false;
    }
    
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      notificationSettings: settings
    });
    
    console.log('Notification settings updated.');
    return true;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return false;
  }
};

// Register device for notifications without FCM
export const registerDevice = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn('[Notifications] Notifications not supported in this browser');
      return null;
    }

    // Request notification permission
    if (Notification.permission !== 'granted') {
      console.log('[Notifications] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[Notifications] Notification permission denied');
        return null;
      }
    }
    
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('[Notifications] No user logged in. Cannot register device.');
      return null;
    }

    // Generate a more robust device ID that includes browser fingerprinting
    const generateDeviceId = () => {
      // Check for existing ID first
      const existingId = localStorage.getItem('device_id');
      if (existingId) return existingId;
      
      // Create a unique device ID with more entropy
      const browserInfo = navigator.userAgent + navigator.language + window.screen.width + window.screen.height;
      const fingerprint = browserInfo.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const randomId = 'device_' + Math.abs(fingerprint) + '_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('device_id', randomId);
      return randomId;
    };

    const deviceId = generateDeviceId();
    console.log('[Notifications] Using device ID:', deviceId);

    // Check if this device is already registered for this user with exact matching
    const devicesQuery = query(
      collection(db, 'devices'),
      where('userId', '==', user.uid),
      where('deviceId', '==', deviceId)
    );
    
    const exactMatchDevices = await getDocs(devicesQuery);
    
    // If we found an exact match, just update the timestamp
    if (!exactMatchDevices.empty) {
      console.log(`[Notifications] Found exact device match, updating timestamp`);
      
      const deviceDoc = exactMatchDevices.docs[0];
      await updateDoc(deviceDoc.ref, {
        lastActive: new Date().toISOString()
      });
      
      // Also update user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        lastActive: new Date().toISOString()
      });
      
      console.log('[Notifications] Updated existing device registration');
      return deviceId;
    }
    
    // If no exact match, check for similar devices by user agent
    const similarDevicesQuery = query(
      collection(db, 'devices'),
      where('userId', '==', user.uid),
      where('deviceInfo', '==', navigator.userAgent)
    );
    
    const similarDevices = await getDocs(similarDevicesQuery);
    
    // If we found similar devices, update them
    if (!similarDevices.empty) {
      console.log(`[Notifications] Found ${similarDevices.size} similar device registrations`);
      
      // Update each similar device
      const updatePromises = [];
      similarDevices.forEach(doc => {
        updatePromises.push(
          updateDoc(doc.ref, {
            lastActive: new Date().toISOString(),
            deviceId: deviceId // Update with the current device ID
          })
        );
      });
      
      await Promise.all(updatePromises);
      console.log('[Notifications] Updated similar device registrations');
    } else {
      // Register as a new device
      const deviceRef = doc(collection(db, 'devices'), deviceId);
      await setDoc(deviceRef, {
        userId: user.uid,
        deviceId: deviceId,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        platform: 'web',
        deviceInfo: navigator.userAgent
      });
      console.log('[Notifications] New device registered successfully:', deviceId);
    }

    // Save to Firestore user document
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      deviceId: deviceId,
      lastActive: new Date().toISOString(),
      notificationsEnabled: true
    });
    
    // Set the notifications enabled timestamp if it doesn't exist yet
    if (!localStorage.getItem('notificationsEnabledTime')) {
      const enabledTime = Date.now().toString();
      localStorage.setItem('notificationsEnabledTime', enabledTime);
      console.log('[Notifications] First time enabling notifications, setting baseline time:', new Date(parseInt(enabledTime)));
    }

    return deviceId;
  } catch (error) {
    console.error('[Notifications] Error registering device:', error);
    return null;
  }
};

// Unified FCM token registration function - uses the robust requestFcmToken from firebase.js
export const registerFCMToken = async () => {
  try {
    // Import the requestFcmToken function from firebase.js
    const { requestFcmToken, setupTokenRefresh } = await import('./firebase');
    
    // Call the robust implementation to get the token
    const token = await requestFcmToken();
    
    // Set up token refresh monitoring if we successfully got a token
    if (token) {
      // Ensure token refresh is set up
      setupTokenRefresh();
      console.log('[Notifications] FCM token refresh monitoring activated');
    }
    
    return token || null;
  } catch (error) {
    console.error('[Notifications] Error registering FCM token:', error);
    return null;
  }
};

// Display a notification locally (for testing)
export const showLocalNotification = (title, body, data = {}) => {
  try {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    const options = {
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      data,
      requireInteraction: true,
      tag: data.gameId || 'default-notification'
    };

    const notification = new Notification(title, options);

    notification.onclick = () => {
      console.log('Notification clicked');
      notification.close();
      window.focus();

      // Navigate to game if gameId is provided
      if (data.gameId) {
        window.location.href = `/games/${data.gameId}`;
      }
    };

    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
};
