/**
 * Centralized notification management system
 * This handles both Firestore notifications (for all users) and browser notifications (for current user)
 */
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  getDoc,
  doc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { toast } from 'react-toastify';

// Set to track shown notifications to prevent duplicates
const shownNotifications = new Set();

/**
 * Show a browser notification
 * @param {Object} options - Notification options
 * @returns {Promise<boolean>} - Whether the notification was shown
 */
const showBrowserNotification = async (options) => {
  console.log('[NotificationManager] showBrowserNotification called:', options);
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.error('[NotificationManager] Browser does not support notifications.');
      return false;
    }
    // Create a unique ID for deduplication
    const dedupeKey = `${options.title}-${options.body}`;
    if (shownNotifications.has(dedupeKey)) {
      console.log('[NotificationManager] Notification already shown, skipping:', dedupeKey);
      return false;
    }
    // Add to shown notifications set
    shownNotifications.add(dedupeKey);
    // Request permission if not granted
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      console.log('[NotificationManager] Notification permission status:', permission);
      if (permission !== 'granted') {
        console.warn('[NotificationManager] Notification permission denied');
        return false;
      }
    }
    // Create notification with dark theme styling
    const notificationOptions = {
      body: options.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: options.data || {},
      tag: options.tag || options.title,
      renotify: true
    };
    console.log('[NotificationManager] Creating new Notification with options:', notificationOptions);
    const notification = new Notification(options.title, notificationOptions);
    console.log('[NotificationManager] Notification created:', notification);
    // Add click handler
    notification.onclick = (event) => {
      console.log('[NotificationManager] Notification clicked:', event);
      notification.close();
      window.focus();
      // Navigate to URL if provided
      if (options.data?.url) {
        window.location.href = options.data.url;
      }
    };
    console.log('[NotificationManager] Browser notification shown:', options.title);
    return true;
  } catch (error) {
    console.error('[NotificationManager] Error showing browser notification:', error);
    return false;
  }
};

/**
 * Send a notification to users
 * @param {Object} options - Notification options
 * @param {string} options.type - Notification type (gameCreated, gameJoined, gameClosed)
 * @param {Object} options.gameData - Game data
 * @param {Array} options.userIds - User IDs to notify (null for all users)
 * @param {boolean} options.showToast - Whether to show a toast notification
 * @param {boolean} options.showBrowser - Whether to show a browser notification
 * @param {string} options.toastMessage - Custom toast message (optional)
 * @returns {Promise<boolean>} - Whether the notification was sent
 */
export const sendNotification = async (options) => {
  try {
    const { type, gameData, userIds = null, showToast = true, showBrowser = true, toastMessage = null } = options;
    
    console.log(`Sending ${type} notification for game:`, gameData.id);
    
    // Prepare notification details based on type
    let notificationDetails;
    
    switch (type) {
      case 'gameCreated':
        notificationDetails = {
          title: 'New Game Available',
          body: `A new game has been created at ${gameData.location} on ${gameData.formattedDate || gameData.date} at ${gameData.time}.`,
          type: 'gameCreated',
          data: {
            gameId: gameData.id,
            url: `/games/${gameData.id}`
          }
        };
        break;
      case 'gameJoined':
        notificationDetails = {
          title: 'Game Registration Confirmed',
          body: `You are registered for the game at ${gameData.location} on ${gameData.formattedDate || gameData.date} at ${gameData.time}. See you on the court!`,
          type: 'gameJoined',
          data: {
            gameId: gameData.id,
            url: `/games/${gameData.id}`
          }
        };
        break;
      case 'gameClosed':
        notificationDetails = {
          title: 'Game Registration Closed',
          body: `Registration for the game at ${gameData.location} on ${gameData.formattedDate || gameData.date} is now closed.`,
          type: 'gameClosed',
          data: {
            gameId: gameData.id,
            url: `/games/${gameData.id}`
          }
        };
        break;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
    
    // 1. Add notifications to Firestore for all specified users
    await storeNotifications(notificationDetails, gameData, userIds);
    
    // 2. Show browser notification for current user (if enabled)
    if (showBrowser) {
      await showBrowserNotification(notificationDetails);
    }
    
    // 3. Show toast notification (if enabled)
    if (showToast) {
      toast.success(toastMessage || notificationDetails.title, {
        style: {
          background: '#2A2A2A', // Darker background as per user preference
          color: '#FFFFFF',     // White text for better readability
          borderRadius: '8px',
          padding: '16px',
        },
        icon: '🎮'
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

/**
 * Store notifications in Firestore for specified users
 * @param {Object} notificationDetails - Notification details
 * @param {Object} gameData - Game data
 * @param {Array} specificUserIds - User IDs to notify (null for all users)
 * @returns {Promise<boolean>} - Whether the notifications were stored
 */
const storeNotifications = async (notificationDetails, gameData, specificUserIds = null) => {
  try {
    // Determine which users to notify
    let userIds = [];
    
    if (specificUserIds && specificUserIds.length > 0) {
      // Use the specific user IDs provided
      userIds = specificUserIds;
    } else {
      // Query all users
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef);
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        console.log('No users found to notify');
        return false;
      }
      
      userIds = usersSnapshot.docs.map(doc => doc.id);
    }
    
    console.log(`Storing notifications for ${userIds.length} users`);
    
    // Create notifications for each user
    const notificationsRef = collection(db, 'notifications');
    const notificationPromises = userIds.map(async (userId) => {
      // Create notification document
      const gameId = gameData.id;
      const gameLink = `/games/${gameId}`;
      
      // Check if a similar notification already exists to prevent duplicates
      const existingQuery = query(
        notificationsRef,
        where('userId', '==', userId),
        where('type', '==', notificationDetails.type),
        where('data.gameId', '==', gameId),
        where('read', '==', false)
      );
      
      const existingDocs = await getDocs(existingQuery);
      
      // If a similar unread notification exists, don't create a duplicate
      if (!existingDocs.empty) {
        console.log(`Skipping duplicate ${notificationDetails.type} notification for user ${userId}`);
        return null;
      }
      
      // Create the notification with dark theme styling
      return addDoc(notificationsRef, {
        userId,
        title: notificationDetails.title,
        body: notificationDetails.body,
        type: notificationDetails.type,
        data: {
          gameId,
          location: gameData.location,
          date: gameData.date,
          time: gameData.time,
          link: gameLink,
          style: {
            background: '#2A2A2A', // Darker background as per user preference
            color: '#FFFFFF',     // White text for better readability
            borderRadius: '8px',
            padding: '16px',
          }
        },
        link: gameLink,
        read: false,
        createdAt: serverTimestamp(),
        showPopup: true
      });
    });
    
    // Wait for all notifications to be created
    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(result => result !== null).length;
    
    console.log(`Successfully stored ${notificationDetails.type} notifications for ${successCount} users`);
    return true;
  } catch (error) {
    console.error('Error storing notifications:', error);
    return false;
  }
};

/**
 * Get game data by ID
 * @param {string} gameId - Game ID
 * @returns {Promise<Object>} - Game data
 */
export const getGameData = async (gameId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (!gameDoc.exists()) {
      throw new Error(`Game with ID ${gameId} not found`);
    }
    
    return {
      id: gameId,
      ...gameDoc.data()
    };
  } catch (error) {
    console.error('Error getting game data:', error);
    throw error;
  }
};

/**
 * Request notification permission
 * Call this when the app starts to ensure notifications can be shown
 * @returns {Promise<string>} - The notification permission status
 */
export const requestNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return 'unsupported';
    }
    
    // If permission is already granted, return it
    if (Notification.permission === 'granted') {
      console.log('Notification permission already granted');
      return 'granted';
    }
    
    // If permission is denied, we can't request it again
    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return 'denied';
    }
    
    // Request permission
    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted!');
      
      // Show a test notification to confirm it works
      const notification = new Notification('Notifications Enabled', {
        body: 'You will now receive notifications for game events.',
        icon: '/logo192.png',
        badge: '/logo192.png',
        requireInteraction: false,
        silent: false
      });
      
      // Auto-close after 3 seconds
      setTimeout(() => notification.close(), 3000);
    } else {
      console.warn('Notification permission denied.');
    }
    
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'error';
  }
};
