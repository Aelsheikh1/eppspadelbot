import { getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';
import { db, auth, messaging } from '../services/firebase';

// VAPID key for web push notifications
const VAPID_KEY = 'BMzSIFpKw-T23cx8aoIfssl2Q8oYxKZVIXY5qYkrAVOzXXOzN3eIhhyQhsuA6_mnC4go0hk9IWQ06Dwqe-eHSfE';

/**
 * Check if the service worker is registered and active
 * @returns {Promise<boolean>} True if service worker is active
 */
const checkServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return false;
  }
  
  try {
    // Check for existing registration
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    
    if (!registration) {
      console.log('Service worker not registered');
      return false;
    }
    
    if (registration.active) {
      console.log('Service worker is active');
      return true;
    } else if (registration.installing || registration.waiting) {
      console.log('Service worker is installing or waiting');
      return false;
    } else {
      console.log('Service worker registration exists but no active/installing/waiting worker');
      return false;
    }
  } catch (error) {
    console.error('Error checking service worker status:', error);
    return false;
  }
};

/**
 * Comprehensive utility to fix notification registration issues
 * Works for both admin and regular users
 */
export const fixNotificationRegistration = async () => {
  try {
    // Use the imported auth instance
    const user = auth.currentUser;
    
    if (!user) {
      return {
        success: false,
        error: 'User not logged in'
      };
    }
    
    // Check if user is admin
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const isAdmin = userDoc.exists() ? userDoc.data().isAdmin === true : false;
    const userRole = isAdmin ? 'admin' : 'user';
    
    // Check service worker registration
    const serviceWorkerActive = await checkServiceWorker();
    
    // Request notification permission if not granted
    const permissionResult = await Notification.requestPermission();
    
    if (permissionResult !== 'granted') {
      return {
        success: false,
        error: `Notification permission ${permissionResult}`,
        serviceWorkerActive
      };
    }
    
    // Get FCM token using the imported messaging instance
    const vapidKey = 'BLBz-YOxJNIKdSQTmP6Wm4kQGf0qZIkA9Bq0_H0qQ3QTLPOGZdPRJgHpPCp_-_6Xz0utIz4LJKo7U-WQTNdLxJo';
    
    const tokenResult = await getToken(messaging, { vapidKey });
    
    if (!tokenResult) {
      return {
        success: false,
        error: 'Failed to get FCM token',
        serviceWorkerActive
      };
    }
    
    // Create a unique device identifier
    const deviceId = `${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Store token in user document with role information
    await setDoc(doc(db, 'users', user.uid), {
      fcmToken: tokenResult,
      fcmTokenUpdated: new Date().toISOString(),
      notificationsEnabled: true,
      devices: arrayUnion(deviceId)
    }, { merge: true });
    
    // Store token in fcmTokens collection with role information
    await setDoc(doc(db, 'fcmTokens', tokenResult), {
      userId: user.uid,
      email: user.email,
      isAdmin,
      userRole,
      deviceId,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    });
    
    // Create a user-specific tokens collection for better querying
    await setDoc(doc(db, `userTokens/${user.uid}/tokens`, tokenResult), {
      token: tokenResult,
      deviceId,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    });
    
    // Store in devices collection with detailed information
    const deviceInfo = {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      lastActive: new Date().toISOString(),
      fcmToken: tokenResult,
      isAdmin,
      userRole
    };
    
    await setDoc(doc(db, 'devices', deviceId), {
      userId: user.uid,
      ...deviceInfo
    });
    
    // Send token to service worker with user information
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_FCM_TOKEN',
        token: tokenResult,
        userId: user.uid,
        userRole,
        deviceId
      });
      
      console.log(`Sent token to service worker for user ${user.uid} with role ${userRole}`);
    } else {
      console.warn('Service worker controller not available to send token');
    }
    
    return {
      success: true,
      token: tokenResult.substring(0, 10) + '...',
      isAdmin,
      userRole,
      deviceId,
      serviceWorkerActive
    };
  } catch (error) {
    console.error('Error fixing notification registration:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Diagnostic function to check notification status for current user
 */
export const checkNotificationStatus = async () => {
  try {
    // Use the imported auth instance
    const user = auth.currentUser;
    
    if (!user) {
      return {
        status: 'error',
        message: 'User not logged in'
      };
    }
    
    // Check if user is admin
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const isAdmin = userDoc.exists() ? userDoc.data().isAdmin === true : false;
    const userRole = isAdmin ? 'admin' : 'user';
    const notificationsEnabled = userDoc.exists() ? userDoc.data().notificationsEnabled === true : false;
    
    // Check for FCM token in user document
    const fcmToken = userDoc.exists() ? userDoc.data().fcmToken : null;
    
    // Check for tokens in fcmTokens collection
    const tokensQuery = query(collection(db, 'fcmTokens'), where('userId', '==', user.uid));
    const tokensSnapshot = await getDocs(tokensQuery);
    const tokenCount = tokensSnapshot.size;
    
    // Get token details
    const tokenDetails = [];
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      tokenDetails.push({
        tokenId: doc.id.substring(0, 10) + '...',
        createdAt: data.createdAt,
        lastUsed: data.lastUsed,
        deviceId: data.deviceId || 'unknown'
      });
    });
    
    // Check for user-specific tokens
    let userTokensCount = 0;
    try {
      const userTokensQuery = query(collection(db, `userTokens/${user.uid}/tokens`));
      const userTokensSnapshot = await getDocs(userTokensQuery);
      userTokensCount = userTokensSnapshot.size;
    } catch (err) {
      console.log('User tokens collection may not exist yet:', err.message);
    }
    
    // Check for devices
    const devicesQuery = query(collection(db, 'devices'), where('userId', '==', user.uid));
    const devicesSnapshot = await getDocs(devicesQuery);
    const deviceCount = devicesSnapshot.size;
    
    // Get device details
    const deviceDetails = [];
    devicesSnapshot.forEach(doc => {
      const data = doc.data();
      deviceDetails.push({
        deviceId: doc.id,
        platform: data.platform,
        lastActive: data.lastActive,
        hasToken: !!data.fcmToken
      });
    });
    
    // Check service worker registration
    const serviceWorkerActive = await checkServiceWorker();
    
    // Check notification permission
    const notificationPermission = Notification.permission;
    
    // Check if token is in service worker
    let tokenInServiceWorker = false;
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      // Create a promise to wait for the response
      const checkPromise = new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        
        navigator.serviceWorker.controller.postMessage({
          type: 'CHECK_TOKEN',
          userId: user.uid
        }, [messageChannel.port2]);
        
        // Timeout after 1 second
        setTimeout(() => resolve({ found: false }), 1000);
      });
      
      try {
        const result = await checkPromise;
        tokenInServiceWorker = result.found;
      } catch (e) {
        console.error('Error checking token in service worker:', e);
      }
    }
    
    return {
      status: 'success',
      userId: user.uid,
      email: user.email,
      isAdmin,
      userRole,
      hasTokens: !!fcmToken || tokenCount > 0,
      tokenCount,
      userTokensCount,
      tokenDetails: tokenDetails.slice(0, 3), // Limit to first 3 for display
      deviceCount,
      deviceDetails: deviceDetails.slice(0, 3), // Limit to first 3 for display
      serviceWorkerActive,
      tokenInServiceWorker,
      notificationPermission,
      notificationsEnabled
    };
  } catch (error) {
    console.error('Error checking notification status:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};
