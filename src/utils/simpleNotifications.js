/**
 * Simple notification system that just works
 * No complex logic, just direct browser notifications
 */

// Track shown notifications to prevent duplicates
const shownNotifications = new Set();

/**
 * Show a browser notification
 * @param {Object} options - Notification options
 * @returns {Promise<boolean>} - Whether the notification was shown
 */
export const showNotification = async (options) => {
  try {
    console.log('Attempting to show notification:', options);
    
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return false;
    }
    
    // Create a unique ID for this notification to prevent duplicates
    const notificationId = `${options.title}-${Date.now()}`;
    
    // Check if we've already shown this notification recently
    if (shownNotifications.has(options.title)) {
      console.log('Skipping duplicate notification:', options.title);
      return false;
    }
    
    // Add to shown notifications
    shownNotifications.add(options.title);
    
    // Clean up old notifications (keep only last 10)
    if (shownNotifications.size > 10) {
      const notificationsArray = Array.from(shownNotifications);
      shownNotifications.clear();
      notificationsArray.slice(-10).forEach(item => shownNotifications.add(item));
    }
    
    // Request permission if not granted
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }
    }
    
    // Create and show notification
    const notification = new Notification(options.title, {
      body: options.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: options.data || {}
    });
    
    // Add click handler
    notification.onclick = () => {
      notification.close();
      window.focus();
      
      // Navigate to URL if provided
      if (options.data?.url) {
        window.location.href = options.data.url;
      }
    };
    
    console.log('Notification shown successfully:', options.title);
    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
};

/**
 * Show a notification for a new game
 * @param {Object} gameData - Game data
 */
export const notifyGameCreated = (gameData) => {
  showNotification({
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
  showNotification({
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
  showNotification({
    title: 'Game Registration Closed',
    body: `Registration for the game at ${gameData.location} on ${gameData.formattedDate || gameData.date} is now closed.`,
    data: {
      gameId: gameData.id,
      url: `/games/${gameData.id}`
    }
  });
};

/**
 * Request notification permission
 */
export const requestPermission = async () => {
  if ('Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      
      if (permission === 'granted') {
        // Show a test notification to confirm it works
        const notification = new Notification('Notifications Enabled', {
          body: 'You will now receive notifications for game events.',
          icon: '/logo192.png'
        });
        
        // Auto-close after 3 seconds
        setTimeout(() => notification.close(), 3000);
      }
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  } else {
    console.warn('This browser does not support desktop notifications');
  }
  
  return 'unsupported';
};
