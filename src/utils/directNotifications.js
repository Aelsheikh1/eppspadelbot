/**
 * Direct notification system for game events
 * This bypasses the Firestore listener and shows notifications immediately
 */

/**
 * Show a direct browser notification
 * @param {Object} options - Notification options
 * @returns {boolean} - Whether the notification was shown
 */
export const showDirectNotification = (options) => {
  console.log('[DirectNotifications] Attempting to show direct notification:', options?.title || options);
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.error('[DirectNotifications] This browser does not support desktop notification');
      return false;
    }
    // Permission already granted
    if (Notification.permission === 'granted') {
      console.log('[DirectNotifications] Permission granted. Creating notification.');
      return createAndShowNotification(options);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(function (permission) {
        console.log('[DirectNotifications] Permission request result:', permission);
        if (permission === 'granted') {
          createAndShowNotification(options);
        }
      });
      return false;
    } else {
      console.warn('[DirectNotifications] Notification permission denied.');
      return false;
    }
  } catch (error) {
    console.error('[DirectNotifications] Error showing direct notification:', error);
    return false;
  }
};

/**
 * Create and show a notification
 * @param {Object} options - Notification options
 * @returns {boolean} - Whether the notification was shown
 */
const createAndShowNotification = (options) => {
  console.log('[DirectNotifications] createAndShowNotification called with:', options?.title || options, options);
  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: options.data || {}
    });
    console.log('[DirectNotifications] Notification object created:', notification);
    // Add click handler
    notification.onclick = (event) => {
      console.log('[DirectNotifications] Notification clicked:', event);
      notification.close();
      window.focus();
      // Navigate to URL if provided
      if (options.data?.url) {
        window.location.href = options.data.url;
      }
    };
    console.log('[DirectNotifications] Direct notification shown:', options.title);
    return true;
  } catch (error) {
    console.error('[DirectNotifications] Error creating notification:', error);
    return false;
  }
};

/**
 * Show a game created notification
 * @param {Object} gameData - Game data
 */
export const showGameCreatedNotification = (gameData) => {
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
 * Show a game joined notification
 * @param {Object} gameData - Game data
 */
export const showGameJoinedNotification = (gameData) => {
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
 * Show a game closed notification
 * @param {Object} gameData - Game data
 */
export const showGameClosedNotification = (gameData) => {
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
 * Request notification permission
 * Call this when the app starts to ensure notifications can be shown
 */
export const requestNotificationPermission = () => {
  if ('Notification' in window) {
    console.log('Requesting notification permission...');
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted!');
      } else {
        console.warn('Notification permission denied.');
      }
    });
  } else {
    console.warn('This browser does not support desktop notifications.');
  }
};
