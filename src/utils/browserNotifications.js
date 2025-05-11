/**
 * Utility functions for displaying browser notifications
 */

// Set to track shown notifications to prevent duplicates
const shownNotifications = new Set();

/**
 * Clear existing notifications with the same title
 * This helps prevent issues with notifications not appearing
 * @param {string} title - The title of the notification to clear
 */
const clearExistingNotifications = (title) => {
  try {
    if ('serviceWorker' in navigator && 'getRegistrations' in navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          if (registration.active) {
            registration.active.postMessage({
              command: 'clearNotifications',
              title: title
            });
          }
        });
      });
    }
  } catch (error) {
    console.error('Error clearing existing notifications:', error);
  }
};

/**
 * Test function to immediately show a notification
 * Call this function directly to test if notifications are working
 */
export const testNotification = () => {
  console.log('Testing notification...');
  
  // Request permission if needed
  if (Notification.permission !== 'granted') {
    console.log('Requesting notification permission...');
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Permission granted, showing test notification');
        showTestNotification();
      } else {
        console.warn('Notification permission denied');
        alert('Please allow notifications to see popup notifications');
      }
    });
  } else {
    // Permission already granted, show notification
    showTestNotification();
  }
};

/**
 * Helper function to show a test notification
 */
const showTestNotification = () => {
  try {
    // Create a simple notification
    const notification = new Notification('Test Notification', {
      body: 'This is a test notification. If you can see this, notifications are working!',
      icon: '/logo192.png',
      requireInteraction: true
    });
    
    console.log('Test notification shown!');
    return true;
  } catch (error) {
    console.error('Error showing test notification:', error);
    alert('Error showing notification: ' + error.message);
    return false;
  }
};

/**
 * Display a browser notification directly
 * @param {Object} notification - Notification data
 * @returns {boolean} - Whether the notification was displayed
 */
export const showDirectNotification = async (notification) => {
  try {
    console.log('Attempting to show notification:', notification);
    
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications');
      return false;
    }

    // Request permission if not granted
    if (Notification.permission !== 'granted') {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }
      console.log('Notification permission granted!');
    }

    // Clear any existing notifications with the same title
    await clearExistingNotifications(notification.title);
    
    // Check for duplicate notifications
    const notificationKey = JSON.stringify(notification);
    if (shownNotifications.has(notificationKey)) {
      console.log('Duplicate notification prevented:', notification.title);
      return false;
    }
    
    // Add to shown notifications set
    shownNotifications.add(notificationKey);
    
    // Create the actual notification
    const notif = new Notification(notification.title, {
      body: notification.body,
      icon: '/logo192.png',
      tag: notification.title, // Use title as tag to prevent duplicates
      data: notification.data || {}
    });
    
    console.log('Notification created successfully:', notification.title);
    
    // Remove from shown notifications after 5 seconds
    setTimeout(() => {
      shownNotifications.delete(notificationKey);
    }, 5000);
    
    return true;
  } catch (error) {
    console.error('Error showing direct notification:', error);
    return false;
  }
};

/**
 * Show a notification for a new game creation
 * @param {Object} gameData - Game data
 */
export const notifyGameCreated = (gameData) => {
  showDirectNotification({
    title: 'New Game Available',
    body: `A new game has been created at ${gameData.location} on ${gameData.formattedDate || gameData.date} at ${gameData.time}.`,
    data: {
      gameId: gameData.id,
      url: `/games/${gameData.id}`
    }
  });
};

/**
 * Show a notification for joining a game
 * @param {Object} gameData - Game data
 */
export const notifyGameJoined = (gameData) => {
  showDirectNotification({
    title: 'Game Registration Confirmed',
    body: `You are registered for the game at ${gameData.location} on ${gameData.formattedDate || gameData.date} at ${gameData.time}. See you on the court!`,
    data: {
      gameId: gameData.id,
      url: `/games/${gameData.id}`
    }
  });
};

/**
 * Show a notification for a closed game
 * @param {Object} gameData - Game data
 */
export const notifyGameClosed = (gameData) => {
  showDirectNotification({
    title: 'Game Registration Closed',
    body: `Registration for the game at ${gameData.location} on ${gameData.formattedDate || gameData.date} is now closed.`,
    data: {
      gameId: gameData.id,
      url: `/games/${gameData.id}`
    }
  });
};

/**
 * Create and show the actual notification
 * @param {Object} notification - Notification data
 * @returns {boolean} - Whether the notification was displayed
 */
const createAndShowNotification = (notification) => {
  try {
    console.log('Creating and showing notification:', notification);
    
    // Force clear existing notifications with the same title
    // This helps prevent issues with notifications not showing up
    clearExistingNotifications(notification.title);
    
    // Create a unique ID for the notification
    const uniqueId = `notification-${notification.id || ''}-${Date.now()}`;
    
    // Check for duplicates using title and body
    const dedupeKey = `${notification.title}-${notification.body.substring(0, 20)}`;
    if (shownNotifications.has(dedupeKey)) {
      console.log('Skipping duplicate notification:', notification.title);
      return false;
    }
    
    // Add to shown notifications set
    shownNotifications.add(dedupeKey);
    console.log('Added to shown notifications. Current count:', shownNotifications.size);
    
    // Limit the size of the set to prevent memory leaks
    if (shownNotifications.size > 100) {
      const notificationsArray = Array.from(shownNotifications);
      shownNotifications.clear();
      notificationsArray.slice(-50).forEach(item => shownNotifications.add(item));
    }
    
    // Create notification options with dark theme styling (high contrast as per user preference)
    const options = {
      body: notification.body || 'You have a new notification',
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: uniqueId,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        url: notification.data?.url || '/',
        gameId: notification.data?.gameId || null,
        timestamp: Date.now(),
        notificationId: notification.id || uniqueId
      },
      // Dark theme styling for notifications
      silent: false
    };
    
    // Create and show notification
    const browserNotification = new Notification(
      notification.title || 'New Notification',
      options
    );
    
    // Add click handler
    browserNotification.onclick = () => {
      console.log('Notification clicked');
      browserNotification.close();
      
      // Focus window and navigate if needed
      window.focus();
      
      // Navigate to URL if provided
      if (notification.data?.url) {
        window.location.href = notification.data.url;
      }
    };
    
    console.log('Direct browser notification displayed:', notification.title);
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};
