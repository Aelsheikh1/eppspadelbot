importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAyZAakNVP3eOnIeJ1qB1Ki-6qRgZ4VBg8",
  authDomain: "padelbolt-5d9a2.firebaseapp.com",
  projectId: "padelbolt-5d9a2",
  storageBucket: "padelbolt-5d9a2.firebasestorage.app",
  messagingSenderId: "773090904452",
  appId: "1:773090904452:web:e33380da424fe8d69e75d1",
  measurementId: "G-1PRKH5C8NV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  // Only show notification if not already shown
  const data = payload.data || {};
  let actions = [];
  let urlToOpen = '/';
  if (data.gameId) {
    actions.push({ action: 'join', title: 'Join Game' });
    urlToOpen = `/games/${data.gameId}`;
  } else if (data.tournamentId || data.messageType === 'tournament_update') {
    actions.push({ action: 'view', title: 'View Message' });
    urlToOpen = `/tournaments/${data.tournamentId || ''}`;
  }
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/web-app-manifest-512x512.png',
    badge: '/web-app-manifest-192x192.png',
    data: { ...data, url: urlToOpen },
    actions: actions,
    tag: data.notificationId || 'default-notification',
    requireInteraction: true
  };
  // Close any previous notifications with the same tag
  self.registration.getNotifications({ tag: notificationOptions.tag }).then(notifications => {
    notifications.forEach(notification => notification.close());
    self.registration.showNotification(payload.notification.title, notificationOptions);
  });
});
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const data = payload.data || {};
  let actions = [];
  let urlToOpen = '/';
  if (data.gameId) {
    actions.push({ action: 'join', title: 'Join Game' });
    urlToOpen = `/games/${data.gameId}`;
  } else if (data.tournamentId || data.messageType === 'tournament_update') {
    actions.push({ action: 'view', title: 'View Message' });
    urlToOpen = `/tournaments/${data.tournamentId || ''}`;
  }
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: { ...data, url: urlToOpen },
    actions: actions,
    tag: data.notificationId || 'default-notification',
    requireInteraction: true
  };
  // Close any previous notifications with the same tag
  self.registration.getNotifications({ tag: notificationOptions.tag }).then(notifications => {
    notifications.forEach(notification => notification.close());
    self.registration.showNotification(payload.notification.title, notificationOptions);
  });
});

// Log initialization with version info for debugging
console.log('[Service Worker] Firebase Messaging initialized - Version 1.0.1');

// Log VAPID key info (don't log the actual key for security)
console.log('[Service Worker] Using updated VAPID key configuration');

// Log when service worker is installed
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
  self.skipWaiting(); // Activate immediately
});

// Log when service worker is activated
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  event.waitUntil(clients.claim()); // Take control of clients immediately
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let urlToOpen = data.url || '/';
  if (event.action === 'join' && data.gameId) {
    urlToOpen = `/games/${data.gameId}`;
  } else if (event.action === 'view' && (data.tournamentId || data.messageType === 'tournament_update')) {
    urlToOpen = `/tournaments/${data.tournamentId || ''}`;
  }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Store user tokens in a map to handle multiple users
self.userTokens = new Map();

// Handle incoming messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Received message:', event.data);
  
  // Handle token updates
  if (event.data && event.data.type === 'UPDATE_FCM_TOKEN') {
    const token = event.data.token;
    const userId = event.data.userId;
    const userRole = event.data.userRole;
    const deviceId = event.data.deviceId;
    
    console.log('[Service Worker] Received FCM token for user:', userId);
    console.log('[Service Worker] User role:', userRole);
    console.log('[Service Worker] Token prefix:', token.substring(0, 10) + '...');
    
    // Store the token with user information
    if (userId) {
      self.userTokens.set(userId, {
        token: token,
        role: userRole || 'user',
        deviceId: deviceId || 'unknown',
        timestamp: Date.now()
      });
      console.log('[Service Worker] Stored token for user:', userId);
      console.log('[Service Worker] Total users with tokens:', self.userTokens.size);
    }
    
    // Also keep the latest token for backward compatibility
    self.fcmToken = token;
  }
  
  // Handle Firebase config updates
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    console.log('[Service Worker] Received Firebase config');
    // Store the Firebase config in the service worker
    self.firebaseConfig = event.data.config;
  }
  
  // Handle token check requests
  if (event.data && event.data.type === 'CHECK_TOKEN') {
    const userId = event.data.userId;
    console.log('[Service Worker] Checking token for user:', userId);
    
    const hasToken = self.userTokens.has(userId);
    const tokenInfo = hasToken ? self.userTokens.get(userId) : null;
    
    // Respond through the message channel if provided
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: 'TOKEN_CHECK_RESULT',
        userId: userId,
        found: hasToken,
        tokenInfo: hasToken ? {
          role: tokenInfo.role,
          deviceId: tokenInfo.deviceId,
          timestamp: tokenInfo.timestamp,
          tokenPrefix: tokenInfo.token.substring(0, 10) + '...'
        } : null
      });
    }
  }
  
  // Handle test communication requests
  if (event.data && event.data.type === 'TEST_COMMUNICATION') {
    console.log('[Service Worker] Received test communication:', event.data);
    
    // Respond through the message channel if provided
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: 'TEST_COMMUNICATION_RESPONSE',
        received: true,
        timestamp: Date.now(),
        originalTimestamp: event.data.timestamp
      });
    }
  }
  
  // Handle direct test notification requests
  if (event.data && event.data.type === 'SHOW_TEST_NOTIFICATION') {
    console.log('[Service Worker] Received test notification request:', event.data);
    
    try {
      const title = event.data.title || 'Test Notification';
      const body = event.data.body || 'This is a test notification';
      
      // Create a unique notification ID
      const uniqueId = 'test-notification-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
      
      // Show the notification
      self.registration.showNotification(title, {
        body: body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: uniqueId,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        renotify: true,
        data: {
          url: '/',
          timestamp: Date.now(),
          test: true
        }
      })
      .then(() => {
        console.log('[Service Worker] Test notification shown successfully');
      })
      .catch(error => {
        console.error('[Service Worker] Error showing test notification:', error);
      });
    } catch (error) {
      console.error('[Service Worker] Error processing test notification:', error);
    }
  }
  
  // Respond to the client to confirm receipt
  if (event.source) {
    event.source.postMessage({
      type: 'SW_CONFIRMATION',
      message: 'Message received by Service Worker: ' + (event.data.type || 'unknown'),
      success: true
    });
  }
});

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Received background message:', payload);
  
  try {
    // Extract notification data
    const notificationTitle = payload.notification?.title || 'New Game Available!';
    const notificationBody = payload.notification?.body || 'A new game has been created!';
    const notificationData = payload.data || {};
    
    console.log('[Service Worker] Creating notification with title:', notificationTitle);
    console.log('[Service Worker] Notification body:', notificationBody);
    console.log('[Service Worker] Notification data:', JSON.stringify(notificationData));
    
    // Check if this notification is targeted to specific users
    const targetUserId = notificationData.userId;
    const targetRole = notificationData.userRole;
    
    // Log targeting information
    if (targetUserId) {
      console.log('[Service Worker] Notification targeted to user:', targetUserId);
    } else if (targetRole) {
      console.log('[Service Worker] Notification targeted to role:', targetRole);
    } else {
      console.log('[Service Worker] Notification is not targeted (sent to all users)');
    }
    
    // Create a unique notification ID to ensure it's always displayed
    const uniqueId = 'notification-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    
    // Create notification options with dark mode styling
    const notificationOptions = {
      body: notificationBody,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: uniqueId, // Use unique ID to ensure notification is always shown
      data: {
        url: notificationData.url || '/games',
        gameId: notificationData.gameId,
        userId: targetUserId,
        userRole: targetRole,
        timestamp: Date.now(),
        notificationId: uniqueId
      },
      actions: [
        {
          action: 'view',
          title: 'View Game'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ],
      // Ensure notification gets user attention
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      renotify: true,
      silent: false,
      // Force visual indicator
      badge: '/logo192.png',
      // Add timestamp to ensure uniqueness
      timestamp: Date.now()
    };

    // Show notification with more detailed logging
    console.log('[Service Worker] Showing notification with options:', JSON.stringify(notificationOptions));
    
    // Force close any existing notifications first to ensure new ones are shown
    self.registration.getNotifications().then(notifications => {
      notifications.forEach(notification => {
        console.log('[Service Worker] Closing existing notification:', notification.tag);
        notification.close();
      });
      
      // Now show the new notification
      return self.registration.showNotification(notificationTitle, notificationOptions);
    })
    .then(() => {
      console.log('[Service Worker] Notification shown successfully');
    })
    .catch(error => {
      console.error('[Service Worker] Error showing notification:', error);
      console.error('[Service Worker] Error details:', error.message);
      
      // Fallback attempt with simpler options if the first attempt fails
      const simpleOptions = {
        body: notificationBody,
        icon: '/logo192.png',
        requireInteraction: true,
        tag: 'fallback-' + Date.now(),
        data: {
          timestamp: Date.now()
        }
      };
      
      console.log('[Service Worker] Attempting fallback notification');
      return self.registration.showNotification(notificationTitle, simpleOptions);
    })
    .catch(fallbackError => {
      console.error('[Service Worker] Fallback notification also failed:', fallbackError.message);
      
      // Try direct browser notification as last resort
      if (self.Notification && self.Notification.permission === 'granted') {
        try {
          new self.Notification(notificationTitle, {
            body: notificationBody,
            icon: '/logo192.png'
          });
          console.log('[Service Worker] Direct browser notification shown');
        } catch (e) {
          console.error('[Service Worker] Direct notification failed:', e.message);
        }
      }
    });
  } catch (error) {
    console.error('[Service Worker] Error processing background message:', error);
    console.error('[Service Worker] Error details:', error.message);
    
    // Last resort fallback - try to show a minimal notification
    try {
      self.registration.showNotification('New Notification', {
        body: 'You have a new notification from EPPS PADELBOLT',
        icon: '/logo192.png',
        tag: 'emergency-fallback-' + Date.now(),
        requireInteraction: true,
        renotify: true
      });
    } catch (e) {
      console.error('[Service Worker] Final fallback notification failed:', e.message);
    }
  }
});

// Also handle push events directly
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);
  
  try {
    let data = {};
    if (event.data) {
      try {
        data = event.data.json();
        console.log('[Service Worker] Push data parsed:', JSON.stringify(data));
      } catch (jsonError) {
        console.error('[Service Worker] Error parsing push data as JSON:', jsonError);
        // Try to use text data as fallback
        const textData = event.data.text();
        console.log('[Service Worker] Push data as text:', textData);
        
        // Try to parse the text as JSON if it looks like JSON
        if (textData.startsWith('{') && textData.endsWith('}')) {
          try {
            data = JSON.parse(textData);
            console.log('[Service Worker] Successfully parsed text data as JSON');
          } catch (e) {
            console.error('[Service Worker] Failed to parse text as JSON:', e);
            // Use a simple object with the text as body
            data = {
              notification: {
                title: 'EPPS PADELBOLT',
                body: textData
              }
            };
          }
        } else {
          // Use a simple object with the text as body
          data = {
            notification: {
              title: 'EPPS PADELBOLT',
              body: textData
            }
          };
        }
      }
    }
    
    // Ensure we have notification data
    if (!data.notification) {
      data.notification = {
        title: 'EPPS PADELBOLT',
        body: 'You have a new notification'
      };
    }
    
    const title = data.notification?.title || 'EPPS PADELBOLT';
    const options = {
      body: data.notification?.body || 'You have a new notification',
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: data.data || {},
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      // Dark mode styling preferences
      tag: data.data?.gameId || 'default-notification-' + Date.now(),
      renotify: true,
      timestamp: Date.now(),
      actions: [
        {
          action: 'view',
          title: 'View'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ]
    };
    
    console.log('[Service Worker] Showing push notification:', title);
    console.log('[Service Worker] With options:', JSON.stringify(options));
    
    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('[Service Worker] Push notification shown successfully');
        })
        .catch(error => {
          console.error('[Service Worker] Error showing push notification:', error);
          // Fallback to simpler notification
          return self.registration.showNotification('New Notification', {
            body: 'You have a new notification from EPPS PADELBOLT',
            icon: '/logo192.png'
          });
        })
    );
  } catch (error) {
    console.error('[Service Worker] Error handling push event:', error);
    // Last resort fallback
    event.waitUntil(
      self.registration.showNotification('EPPS PADELBOLT', {
        body: 'New notification received',
        icon: '/logo192.png'
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  console.log('[Service Worker] Notification data:', JSON.stringify(event.notification.data || {}));

  // Close the notification
  event.notification.close();

  // Get the action and notification data
  const action = event.action;
  const data = event.notification.data || {};
  const urlToOpen = data.url || '/games';
  const fullUrl = data.gameId ? `/games/${data.gameId}` : urlToOpen;
  
  // Use the current origin instead of hardcoded URL
  const origin = self.location.origin;
  const appUrl = origin + fullUrl;
  
  console.log('[Service Worker] Navigation target:', appUrl);

  // If action is close, just close the notification
  if (action === 'close') {
    console.log('[Service Worker] Close action, not navigating');
    return;
  }

  // Focus on existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        console.log('[Service Worker] Found window clients:', windowClients.length);
        
        // Try to find an existing window
        for (const client of windowClients) {
          if (client.url.includes(origin) && 'focus' in client) {
            console.log('[Service Worker] Focusing existing client and navigating to:', fullUrl);
            // Focus the existing window
            return client.focus()
              .then((focusedClient) => {
                // Navigate to the game page
                console.log('[Service Worker] Client focused, now navigating to:', fullUrl);
                return focusedClient.navigate(fullUrl);
              })
              .catch(navError => {
                console.error('[Service Worker] Navigation error:', navError);
                // Fallback to opening new window
                return clients.openWindow(appUrl);
              });
          }
        }
        
        // If no existing window, open a new one
        console.log('[Service Worker] No existing client found, opening new window:', appUrl);
        return clients.openWindow(appUrl)
          .catch(windowError => {
            console.error('[Service Worker] Error opening window:', windowError);
            // Last resort - try a different approach
            return clients.openWindow(origin).then(client => {
              console.log('[Service Worker] Opened root window as fallback');
            });
          });
      })
      .catch(error => {
        console.error('[Service Worker] Error handling notification click:', error);
        // Final fallback
        try {
          return clients.openWindow(origin);
        } catch (e) {
          console.error('[Service Worker] Final fallback failed:', e);
        }
      })
  );
});
