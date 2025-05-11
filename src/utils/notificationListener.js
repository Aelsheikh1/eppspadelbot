import { db, auth } from '../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';

// Track shown notifications to prevent duplicates
const shownNotifications = new Set();

// Load previously shown notifications from localStorage on startup
try {
  const storedNotifications = localStorage.getItem('shownNotifications');
  if (storedNotifications) {
    const parsedNotifications = JSON.parse(storedNotifications);
    parsedNotifications.forEach(id => shownNotifications.add(id));
    console.log(`Loaded ${shownNotifications.size} previously shown notifications`);
  }
} catch (e) {
  console.error('Error loading shown notifications:', e);
}

/**
 * Sets up a listener for custom notifications
 * This bypasses Firebase Cloud Messaging completely
 */
export const setupNotificationListener = () => {
  // Check if notifications are supported
  if (!('Notification' in window)) {
    console.error('This browser does not support notifications');
    return () => {}; // Return empty cleanup function
  }
  
  // Check if user is logged in
  const user = auth.currentUser;
  if (!user) {
    console.log('User not logged in, not setting up notification listener');
    return () => {}; // Return empty cleanup function
  }
  
  console.log('Setting up notification listener for user:', user.uid);
  
  // Get user data to check role
  const getUserRole = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) return 'user';
      
      const userData = userDoc.data();
      // Check multiple ways that admin status might be stored
      const isAdmin = 
        (userData.isAdmin === true) || 
        (userData.role === 'admin') || 
        (userData.userRole === 'admin');
      
      return isAdmin ? 'admin' : 'user';
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'user'; // Default to regular user on error
    }
  };
  
  // Set up listener for notification triggers
  const setupTriggerListener = async () => {
    const userRole = await getUserRole();
    console.log('User role for notifications:', userRole);
    
    // Get the notification enabled timestamp from localStorage
    // If not found, create it now to only show notifications from this point forward
    let notificationsEnabledTime = localStorage.getItem('notificationsEnabledTime');
    if (!notificationsEnabledTime) {
      notificationsEnabledTime = Date.now().toString();
      localStorage.setItem('notificationsEnabledTime', notificationsEnabledTime);
      console.log('First time enabling notifications, setting current time as baseline:', new Date(parseInt(notificationsEnabledTime)));
    }
    
    // Get the last notification timestamp, defaulting to the time when notifications were enabled
    const lastNotificationTime = localStorage.getItem('lastNotificationTime') || notificationsEnabledTime;
    console.log('Last notification time:', new Date(parseInt(lastNotificationTime)));
    
    // Query for notifications created after the last seen timestamp
    const notificationsQuery = query(
      collection(db, 'customNotifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    // Listen for new notifications directly
    const unsubscribe = onSnapshot(notificationsQuery, async (snapshot) => {
      // Process notifications in batches to avoid overwhelming the user
      const newNotifications = [];
      
      snapshot.docChanges().forEach((change) => {
        // Only process new notifications
        if (change.type === 'added') {
          const notificationData = change.doc.data();
          const notificationId = change.doc.id;
          
          // Add document ID to the data
          notificationData.id = notificationId;
          
          // Check if this is a new notification (after our last seen time)
          const createdAtTimestamp = new Date(notificationData.createdAt).getTime();
          if (createdAtTimestamp > parseInt(lastNotificationTime)) {
            // Check if this notification is targeted to this user
            const isTargeted = 
              // No targeting (send to all)
              (!notificationData.targetUserId && !notificationData.targetRole) ||
              // Targeted to this specific user
              (notificationData.targetUserId === user.uid) ||
              // Targeted to user's role
              (notificationData.targetRole === userRole);
            
            if (isTargeted) {
              console.log('New notification found:', notificationId);
              newNotifications.push(notificationData);
            }
          }
        }
      });
      
      // Show notifications with a slight delay between each
      if (newNotifications.length > 0) {
        console.log(`Found ${newNotifications.length} new notifications`);
        
        // Sort by creation time (oldest first)
        newNotifications.sort((a, b) => {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        
        // Show each notification with a delay
        let delay = 0;
        for (const notification of newNotifications) {
          setTimeout(() => {
            showNotification(notification);
          }, delay);
          delay += 1000; // 1 second delay between notifications
        }
        
        // Update the last notification time to the most recent one
        const latestTimestamp = Math.max(
          ...newNotifications.map(n => new Date(n.createdAt).getTime())
        );
        localStorage.setItem('lastNotificationTime', Date.now().toString());
      }
    });
    
    // Also check for notification triggers (for backward compatibility)
    const triggersQuery = query(
      collection(db, 'notificationTriggers'),
      orderBy('createdAt', 'desc'),
      limit(5),
      where('processed', '==', false)
    );
    
    // Listen for new notification triggers
    const triggerUnsubscribe = onSnapshot(triggersQuery, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        // Only process new triggers
        if (change.type === 'added') {
          const triggerData = change.doc.data();
          const notificationId = triggerData.notificationId;
          
          console.log('New notification trigger:', notificationId);
          
          try {
            // Get the notification details
            const notificationDoc = await getDoc(doc(db, 'customNotifications', notificationId));
            if (!notificationDoc.exists()) return;
            
            const notificationData = notificationDoc.data();
            notificationData.id = notificationId;
            
            // Check if this notification is targeted to this user
            const isTargeted = 
              // No targeting (send to all)
              (!notificationData.targetUserId && !notificationData.targetRole) ||
              // Targeted to this specific user
              (notificationData.targetUserId === user.uid) ||
              // Targeted to user's role
              (notificationData.targetRole === userRole);
            
            if (!isTargeted) {
              console.log('Notification not targeted to this user, skipping');
              return;
            }
            
            // Show the notification
            showNotification(notificationData);
            
            // Mark as processed by this user
            await updateDoc(doc(db, 'notificationTriggers', change.doc.id), {
              [`processedBy.${user.uid}`]: true,
              processedAt: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error processing notification trigger:', error);
          }
        }
      });
    });
    
    // Return a combined cleanup function
    return () => {
      unsubscribe();
      triggerUnsubscribe();
    };
  };
  
  // Function to show notification
  const showNotification = (notificationData) => {
    // Request permission if not granted
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          displayNotification(notificationData);
        }
      });
    } else {
      displayNotification(notificationData);
    }
  };
  
  // Function to display notification
  const displayNotification = (notificationData) => {
    try {
      // Create a notification ID based on content to detect duplicates
      const notificationId = notificationData.id || '';
      const uniqueId = 'custom-notification-' + notificationId + '-' + Date.now();
      
      // Create a more robust deduplication key that includes all relevant data
      const dedupeKey = `${notificationId}-${notificationData.type || ''}-${notificationData.title}-${notificationData.body}`;
      
      // Check user notification preferences before showing
      const userPreferences = getUserNotificationPreferences();
      const notificationType = notificationData.type || 'general';
      
      // Skip if user has disabled this notification type
      if (userPreferences && userPreferences[notificationType] === false) {
        console.log(`User has disabled ${notificationType} notifications. Skipping:`, notificationData.title);
        return false;
      }
      
      // Check if we've already shown this notification
      if (shownNotifications.has(dedupeKey)) {
        console.log('Skipping duplicate notification:', notificationData.title);
        return false;
      }
      
      // Add to shown notifications set
      shownNotifications.add(dedupeKey);
      
      // Limit the size of the set to prevent memory leaks
      if (shownNotifications.size > 200) {
        // Remove the oldest entries (convert to array, slice, and convert back to set)
        const notificationsArray = Array.from(shownNotifications);
        shownNotifications.clear();
        notificationsArray.slice(-100).forEach(item => shownNotifications.add(item));
      }
      
      // Store in localStorage to prevent duplicates across page refreshes and sessions
      try {
        // Save the entire set to localStorage
        localStorage.setItem('shownNotifications', JSON.stringify(Array.from(shownNotifications)));
        
        // Also track in sessionStorage for immediate session reference
        const sessionNotifications = JSON.parse(sessionStorage.getItem('sessionNotifications') || '[]');
        
        // Check if this notification is already in the session storage
        if (sessionNotifications.includes(dedupeKey)) {
          console.log('Skipping duplicate notification (from session):', notificationData.title);
          return false;
        }
        
        // Add to session storage
        sessionNotifications.push(dedupeKey);
        
        // Limit array size
        if (sessionNotifications.length > 100) {
          sessionNotifications.splice(0, sessionNotifications.length - 100);
        }
        
        sessionStorage.setItem('sessionNotifications', JSON.stringify(sessionNotifications));
      } catch (e) {
        console.error('Error with notification storage:', e);
      }
      
      // Function to get user notification preferences
      function getUserNotificationPreferences() {
        try {
          const preferencesStr = localStorage.getItem('notificationPreferences');
          return preferencesStr ? JSON.parse(preferencesStr) : null;
        } catch (e) {
          console.error('Error getting notification preferences:', e);
          return null;
        }
      }
      
      // Create notification options
      const options = {
        body: notificationData.body || 'You have a new notification',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: uniqueId, // Using unique ID as tag to prevent grouping
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
          url: notificationData.data?.url || '/',
          gameId: notificationData.data?.gameId || null,
          timestamp: Date.now(),
          notificationId: notificationData.id || uniqueId
        }
      };
      
      // Add action buttons if this is a game notification
      if (notificationData.data?.gameId) {
        options.actions = [
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
      }
      
      // Create and show notification
      const notification = new Notification(
        notificationData.title || 'New Notification',
        options
      );
      
      // Add click handler
      notification.onclick = () => {
        console.log('Notification clicked');
        notification.close();
        
        // Focus window and navigate if needed
        window.focus();
        
        // Navigate to URL if provided
        if (notificationData.data?.url) {
          window.location.href = notificationData.data.url;
        }
      };
      
      // Add action button handlers
      navigator.serviceWorker.ready.then(registration => {
        // Listen for notification actions
        registration.addEventListener('notificationclick', event => {
          event.notification.close();
          
          // Handle different actions
          if (event.action === 'join' && notificationData.data?.gameId) {
            // Join the game
            console.log('Join game action clicked for game:', notificationData.data.gameId);
            window.focus();
            window.location.href = `/games/${notificationData.data.gameId}`;
          } else if (event.action === 'dismiss') {
            // Just dismiss the notification
            console.log('Notification dismissed');
          }
        });
      }).catch(error => {
        console.error('Error setting up notification action handlers:', error);
      });
      
      console.log('Notification displayed:', notificationData.title);
      return true;
    } catch (error) {
      console.error('Error displaying notification:', error);
      return false;
    }
  };
  
  // Start the listener
  return setupTriggerListener();
};

/**
 * Initialize notification listener when app starts
 */
export const initNotificationListener = () => {
  // Wait for auth state to be ready
  auth.onAuthStateChanged(user => {
    if (user) {
      // Set up listener when user is logged in
      const unsubscribe = setupNotificationListener();
      
      // Store the unsubscribe function for cleanup
      window.notificationListenerCleanup = unsubscribe;
    } else {
      // Clean up listener if user logs out
      if (window.notificationListenerCleanup) {
        window.notificationListenerCleanup();
        window.notificationListenerCleanup = null;
      }
    }
  });
};
