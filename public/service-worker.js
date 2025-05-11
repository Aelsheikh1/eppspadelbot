const CACHE_NAME = 'padelbot-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/robots.txt'
];

// Install event
self.addEventListener('install', event => {
  self.skipWaiting(); // Force the service worker to become active
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(clientList => {
      if (clientList.length > 0) {
        // If there's already a window, focus it
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Handle messages from the client
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title || 'New Notification', {
      body: event.data.body || 'You have a new notification',
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: event.data.data || {},
      // Better styling with dark mode support
      vibrate: [200, 100, 200], // Vibration pattern for mobile devices
      requireInteraction: true  // Keep notification visible until user interacts
    });
  }
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('padelbot-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch event - with special handling for Firestore requests
self.addEventListener('fetch', event => {
  // Skip interception for ALL Firebase and Firestore API requests
  if (event.request.url.includes('googleapis.com') || 
      event.request.url.includes('firebase') || 
      event.request.url.includes('fcmregistrations') ||
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('cloudfunctions.net')) {
    // Do not intercept these requests at all
    return;
  }
  
  // Only handle static assets and app resources
  if (event.request.url.startsWith(self.location.origin) ||
      event.request.url.includes('cdn') ||
      event.request.url.includes('fonts') ||
      event.request.url.includes('static')) {
    // For app resources, try to serve from cache first
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      }).catch(error => {
        console.error('Fetch error in service worker:', error);
        // Return a fallback response if possible
        return fetch(event.request);
      })
    );
  }
  // For all other requests, let them pass through without interception
});

// Push event handler for background notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received');
  
  // Log platform information for debugging
  const userAgent = self.navigator ? self.navigator.userAgent : 'Unknown';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  
  console.log('[Service Worker] Platform:', {
    userAgent,
    isMobile,
    isIOS,
    isAndroid
  });
  
  try {
    // Safely parse the data
    let data;
    try {
      data = event.data.json();
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
      // Fallback to a simple notification if we can't parse the data
      data = {
        notification: {
          title: 'New Notification',
          body: 'You have a new notification'
        }
      };
    }
    
    // Extract notification details with fallbacks
    const title = data.notification?.title || 'New Notification';
    const body = data.notification?.body || 'You have a new notification';
    const url = data.notification?.data?.url || '/';
    
    // Determine notification type
    const notificationType = data.notification?.data?.type || 'default';
    const gameId = data.notification?.data?.gameId || null;
    
    // Check if this is a mobile platform
    const userAgent = self.navigator ? self.navigator.userAgent : 'Unknown';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const tournamentId = data.notification?.data?.tournamentId || null;
    const matchId = data.notification?.data?.matchId || null;
    
    console.log('[Service Worker] Notification data:', data.notification?.data);
    
    // Create notification options with dark mode styling
    const notificationOptions = {
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: {
        ...data.notification?.data || {},
        url,
        isMobile,
        platform: isIOS ? 'iOS' : isAndroid ? 'Android' : isMobile ? 'Other mobile' : 'Desktop'
      },
      vibrate: [200, 100, 200],
      requireInteraction: true,
      // Dark mode styling with high contrast
      silent: false,
      // Optimize for mobile platforms
      tag: `${notificationType}-${Date.now()}`, // Unique tag to prevent notification stacking on mobile
      renotify: true, // Allow notifications with the same tag to notify users again
      timestamp: Date.now() // Add timestamp for better sorting on mobile
    };
    
    // Add appropriate actions based on notification type
    switch (notificationType) {
      case 'game':
      case 'game_created':
      case 'game_updated':
        // Game notifications
        notificationOptions.actions = [
          {
            action: 'join',
            title: 'Join Game',
            icon: '/logo192.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/close-icon.png'
          }
        ];
        break;
        
      case 'tournament_created':
        // New tournament notifications
        notificationOptions.actions = [
          {
            action: 'register',
            title: 'Register',
            icon: '/logo192.png'
          },
          {
            action: 'view_tournament',
            title: 'View Details'
          }
        ];
        break;
        
      case 'tournament_deadline':
        // Registration deadline notifications
        notificationOptions.actions = [
          {
            action: 'view_tournament',
            title: 'View Tournament'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ];
        break;
        
      case 'match_result':
        // Match result notifications
        notificationOptions.actions = [
          {
            action: 'view_match',
            title: 'View Match'
          },
          {
            action: 'view_bracket',
            title: 'View Bracket'
          }
        ];
        break;
        
      case 'tournament_winner':
        // Tournament winner notifications
        notificationOptions.icon = '/trophy-icon.png'; // Special trophy icon
        notificationOptions.actions = [
          {
            action: 'view_results',
            title: 'View Results'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ];
        break;
        
      case 'bracket_update':
        // Bracket update notifications
        notificationOptions.actions = [
          {
            action: 'view_bracket',
            title: 'View Bracket'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ];
        break;
        
      case 'upcoming_match':
        // Upcoming match notifications
        notificationOptions.actions = [
          {
            action: 'view_match',
            title: 'View Match'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ];
        break;
        
      default:
        // Default actions for other notification types
        notificationOptions.actions = [
          {
            action: 'open',
            title: 'View'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ];
    }
    
    event.waitUntil(
      self.registration.showNotification(title, notificationOptions)
    );
  } catch (error) {
    console.error('[Service Worker] Error handling push event:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked', event.action);
  console.log('[Service Worker] Notification data:', event.notification.data);
  
  event.notification.close();
  
  // Handle specific actions for different notification types
  const notificationData = event.notification.data || {};
  const isMobile = notificationData.isMobile || false;
  const platform = notificationData.platform || 'Unknown';
  
  console.log(`[Service Worker] Handling click on ${platform} platform`);
  
  // Handle action buttons
  if (event.action) {
    let targetUrl = '/';
    
    switch (event.action) {
      case 'join':
        // Game notifications
        if (notificationData.gameId) {
          targetUrl = `/games/${notificationData.gameId}`;
          console.log('[Service Worker] Joining game:', targetUrl);
        }
        break;
        
      case 'register':
        // Tournament registration
        if (notificationData.tournamentId) {
          targetUrl = `/tournaments/${notificationData.tournamentId}/register`;
          console.log('[Service Worker] Registering for tournament:', targetUrl);
        }
        break;
        
      case 'view_tournament':
        // View tournament details
        if (notificationData.tournamentId) {
          targetUrl = `/tournaments/${notificationData.tournamentId}`;
          console.log('[Service Worker] Viewing tournament:', targetUrl);
        }
        break;
        
      case 'view_bracket':
        // View tournament bracket
        if (notificationData.tournamentId) {
          targetUrl = `/tournaments/${notificationData.tournamentId}/bracket`;
          console.log('[Service Worker] Viewing tournament bracket:', targetUrl);
        }
        break;
        
      case 'view_match':
        // View match details
        if (notificationData.tournamentId && notificationData.matchId) {
          targetUrl = `/tournaments/${notificationData.tournamentId}/matches/${notificationData.matchId}`;
          console.log('[Service Worker] Viewing match:', targetUrl);
        }
        break;
        
      case 'view_results':
        // View tournament results
        if (notificationData.tournamentId) {
          targetUrl = `/tournaments/${notificationData.tournamentId}/results`;
          console.log('[Service Worker] Viewing tournament results:', targetUrl);
        }
        break;
        
      case 'dismiss':
      case 'close':
        // Just dismiss the notification
        console.log('[Service Worker] Notification dismissed');
        return;
        
      default:
        // If we have a URL in the data, use that
        if (notificationData.url) {
          targetUrl = notificationData.url;
        }
    }
    
    // Navigate to the target URL
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        // Check if we already have a window open
        if (windowClients.length > 0) {
          // Focus the first window and navigate
          windowClients[0].focus();
          windowClients[0].navigate(targetUrl);
          return;
        }
        
        // Open a new window with the target URL
        return clients.openWindow(targetUrl);
      })
    );
    return;
  }
  
  // Default behavior for regular clicks (no specific action)
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if we already have a window open with the target URL
      let matchingClient = null;
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          matchingClient = client;
          break;
        }
      }

      if (matchingClient) {
        // Reuse the existing window
        return matchingClient.focus();
      }

      // Open the resource in a new window
      return clients.openWindow(url);
    })
  );
});

// Notification close handler
self.addEventListener('notificationclose', event => {
  console.log('[Service Worker] Notification closed');
});
