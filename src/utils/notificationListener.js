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
    
    // Get the last notification timestamp from localStorage
    const lastNotificationTime = localStorage.getItem('lastNotificationTime') || '0';
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
          ...newNotifications.map(n => new Date(n.createdAt).getTime()),
          parseInt(lastNotificationTime)
        );
        localStorage.setItem('lastNotificationTime', latestTimestamp.toString());
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
      
      // Check if we've already shown this notification
      const dedupeKey = `${notificationId}-${notificationData.title}-${notificationData.body}`;
      if (shownNotifications.has(dedupeKey)) {
        console.log('Skipping duplicate notification:', notificationData.title);
        return false;
      }
      
      // Add to shown notifications set
      shownNotifications.add(dedupeKey);
      
      // Limit the size of the set to prevent memory leaks
      if (shownNotifications.size > 100) {
        // Remove the oldest entries (convert to array, slice, and convert back to set)
        const notificationsArray = Array.from(shownNotifications);
        shownNotifications.clear();
        notificationsArray.slice(-50).forEach(item => shownNotifications.add(item));
      }
      
      // Also store in sessionStorage to prevent duplicates across page refreshes
      try {
        const shownNotificationsStr = sessionStorage.getItem('shownNotifications') || '[]';
        const shownNotificationsArr = JSON.parse(shownNotificationsStr);
        
        // Check if this notification is in the session storage
        if (shownNotificationsArr.includes(dedupeKey)) {
          console.log('Skipping duplicate notification (from session):', notificationData.title);
          return false;
        }
        
        // Add to session storage
        shownNotificationsArr.push(dedupeKey);
        
        // Limit array size
        if (shownNotificationsArr.length > 50) {
          shownNotificationsArr.splice(0, shownNotificationsArr.length - 50);
        }
        
        sessionStorage.setItem('shownNotifications', JSON.stringify(shownNotificationsArr));
      } catch (e) {
        console.error('Error with sessionStorage:', e);
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
