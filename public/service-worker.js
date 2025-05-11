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
    
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: '/logo192.png', // Use local assets to avoid network issues
        badge: '/logo192.png',
        data: { url },
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
          {
            action: 'open',
            title: 'View'
          },
          {
            action: 'close',
            title: 'Dismiss'
          }
        ]
      })
    );
  } catch (error) {
    console.error('[Service Worker] Error handling push event:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked');
  
  event.notification.close();
  
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
