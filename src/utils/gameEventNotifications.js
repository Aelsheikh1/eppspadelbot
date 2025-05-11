/**
 * Game event notification system
 * This is a simplified system that focuses only on showing browser notifications
 * for game events (creation, joining, closing)
 */

// Track already shown notifications to prevent duplicates
const shownNotifications = new Set();

/**
 * Show a browser notification for a game event
 * @param {Object} options - Notification options
 */
export const showGameEventNotification = (options) => {
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return;
    }
    
    // Skip if permission not granted
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted for game events');
      return;
    }
    
    // Create a deduplication key
    const dedupeKey = `${options.title}-${options.body.substring(0, 20)}`;
    
    // Skip if we've already shown this notification
    if (shownNotifications.has(dedupeKey)) {
      console.log('Skipping duplicate game event notification:', options.title);
      return;
    }
    
    // Add to shown notifications
    shownNotifications.add(dedupeKey);
    
    // Create and show notification
    const notification = new Notification(options.title, {
      body: options.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: `game-event-${Date.now()}`,
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
    
    console.log('Game event notification shown:', options.title);
  } catch (error) {
    console.error('Error showing game event notification:', error);
  }
};

/**
 * Show notification for game creation
 * @param {Object} game - Game data
 */
export const notifyGameCreated = (game) => {
  showGameEventNotification({
    title: 'New Game Available',
    body: `A new game has been created at ${game.location} on ${game.formattedDate || game.date} at ${game.time}.`,
    data: {
      gameId: game.id,
      url: `/games/${game.id}`
    }
  });
};

/**
 * Show notification for game joining
 * @param {Object} game - Game data
 */
export const notifyGameJoined = (game) => {
  showGameEventNotification({
    title: 'Game Registration Confirmed',
    body: `You are registered for the game at ${game.location} on ${game.formattedDate || game.date} at ${game.time}. See you on the court!`,
    data: {
      gameId: game.id,
      url: `/games/${game.id}`
    }
  });
};

/**
 * Show notification for game closing
 * @param {Object} game - Game data
 */
export const notifyGameClosed = (game) => {
  showGameEventNotification({
    title: 'Game Registration Closed',
    body: `Registration for the game at ${game.location} on ${game.formattedDate || game.date} is now closed.`,
    data: {
      gameId: game.id,
      url: `/games/${game.id}`
    }
  });
};
