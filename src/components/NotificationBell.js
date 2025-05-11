import React, { useState, useEffect, useRef } from 'react';
import { Badge, IconButton, Menu, MenuItem, Typography, Box, Divider, List, ListItem, ListItemText, Button, Snackbar, Alert, Tooltip, Drawer, Card, CardContent, CardActions, Chip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Helper function to safely format dates
const getFormattedDate = (timestamp) => {
  try {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Invalid date';
    }
    
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date error';
  }
};

// Set to track shown notifications to prevent duplicates
const shownNotifications = new Set();

// Function to show browser notification
const showBrowserNotification = (notification) => {
  try {
    // Request permission if not granted
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          displayNotification(notification);
        }
      });
    } else {
      displayNotification(notification);
    }
  } catch (error) {
    console.error('Error showing browser notification:', error);
  }
};

// Function to display the actual notification
const displayNotification = (notification) => {
  try {
    // Create a notification ID
    const uniqueId = `notification-${notification.id}-${Date.now()}`;
    
    // Check for duplicates
    const dedupeKey = `${notification.id}-${notification.title}`;
    if (shownNotifications.has(dedupeKey)) {
      console.log('Skipping duplicate notification:', notification.title);
      return;
    }
    
    // Add to shown notifications
    shownNotifications.add(dedupeKey);
    
    // Create notification options with dark theme styling
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
        notificationId: notification.id,
        // Add dark theme styling information
        style: notification.data?.style || {
          background: '#2A2A2A', // Darker background as per user preference
          color: '#FFFFFF',     // White text for better readability
          borderRadius: '8px',
          padding: '16px',
        }
      }
    };
    
    // Create and show notification
    const browserNotification = new Notification(
      notification.title || 'New Notification',
      options
    );
    
    // Add click handler
    browserNotification.onclick = () => {
      browserNotification.close();
      window.focus();
      
      // Navigate to URL if provided
      if (notification.data?.url) {
        window.location.href = notification.data.url;
      }
    };
    
    console.log('Browser notification displayed:', notification.title);
  } catch (error) {
    console.error('Error displaying notification:', error);
  }
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const { currentUser } = useAuth();
  
  // --- Load notifications from Firestore for the current user ---
  useEffect(() => {
    if (!currentUser) {
      console.warn('No current user found. Skipping notification retrieval.');
      return;
    }
    
    const { uid } = currentUser;
    
    try {
      import('../services/firebase').then(({ db }) => {
        import('firebase/firestore').then(({ collection, query, where, orderBy, onSnapshot, limit }) => {
          const notificationsRef = collection(db, 'notifications');
          const q = query(
            notificationsRef, 
            where('userId', '==', uid), 
            orderBy('createdAt', 'desc'), 
            // Add a limit to prevent potential query issues
            limit(50)
          );
          
          const unsubscribe = onSnapshot(q, 
            (snapshot) => {
              if (snapshot.empty) {
                console.log('No notifications found for user:', uid);
                setNotifications([]);
                return;
              }
              
              const notifs = snapshot.docs.map(docSnap => {
                const notificationData = docSnap.data();
                return { 
                  id: docSnap.id, 
                  ...notificationData,
                  formattedDate: getFormattedDate(notificationData.createdAt)
                };
              });
              
              console.log(`Fetched ${notifs.length} notifications for user:`, uid);
              
              // Check for unread notifications that need popups
              const newNotifs = notifs.filter(notif => 
                notif.showPopup === true && 
                !notif.read && 
                !notif.popupShown
              );
              
              // Show popups for new notifications
              if (newNotifs.length > 0) {
                console.log(`Showing ${newNotifs.length} popup notifications`);
                
                // For each notification, show it and store the shown state locally
                const shownIds = new Set();
                newNotifs.forEach(notif => {
                  // Show the notification as a browser notification
                  showBrowserNotification(notif);
                  
                  // Add to local tracking to prevent showing again
                  shownIds.add(notif.id);
                });
                
                // Update the notifications in the state to mark them as shown locally
                // instead of trying to write to Firestore which may cause permission issues
                setNotifications(currentNotifs => {
                  return currentNotifs.map(notif => {
                    if (shownIds.has(notif.id)) {
                      return { ...notif, popupShown: true };
                    }
                    return notif;
                  });
                });
              }
              
              setNotifications(notifs);
            }, 
            (error) => {
              console.group('🚨 Notification Fetch Error');
              console.error('Error fetching notifications:', error);
              console.error('Error Code:', error.code);
              console.error('Error Message:', error.message);
              
              // Comprehensive error handling
              switch (error.code) {
                case 'failed-precondition':
                  console.warn('⚠️ Composite index required. Please create the index in Firebase Console.');
                  console.warn('Index URL: Firebase Console Firestore Indexes');
                  break;
                case 'permission-denied':
                  console.error('Permission denied. Check Firestore security rules.');
                  break;
                case 'unavailable':
                  console.warn('Firestore service is temporarily unavailable. Retrying...');
                  break;
                default:
                  console.error('Unexpected error in notification retrieval.');
              }
              
              console.groupEnd();
              
              // Optionally set an error state or show user-friendly notification
              setNotifications([]);
            });
          
          return () => unsubscribe();
        }).catch(importError => {
          console.error('Error importing Firestore modules:', importError);
        });
      }).catch(importError => {
        console.error('Error importing Firebase service:', importError);
      });
    } catch (setupError) {
      console.error('Error setting up notification retrieval:', setupError);
    }
  }, [currentUser]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked (full):', JSON.stringify(notification, null, 2));
    
    // Mark notification as read
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    // Navigate to the notification link if present
    const link = 
      notification.link || 
      notification.data?.link || 
      (notification.data?.gameId ? `/games/${notification.data.gameId}` : null);
    
    console.log('Extracted link:', link);
    
    if (link) {
      try {
        // Use window.location for full page navigation
        window.location.href = link;
        handleClose(); // Close the notification menu
      } catch (error) {
        console.error('Navigation error:', error);
      }
    } else {
      console.warn('No link found for notification');
    }
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation(); // Prevent triggering the notification click handler
    try {
      await deleteNotification(notificationId);
      console.log('Notification deleted:', notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (notifications.length === 0) return;
    
    try {
      await deleteAllNotifications();
      console.log('All notifications deleted');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;
    
    try {
      await markAllNotificationsAsRead();
      console.log('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Firebase operations
  const markNotificationAsRead = async (notificationId) => {
    if (!currentUser) return;
    
    try {
      const { db } = await import('../services/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
      
      // Update local state to reflect the change
      setNotifications(prevNotifications => 
        prevNotifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!currentUser) return;
    
    try {
      const { db } = await import('../services/firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
      
      // Update local state to reflect the change
      setNotifications(prevNotifications => 
        prevNotifications.filter(n => n.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  };

  const deleteAllNotifications = async () => {
    if (!currentUser || notifications.length === 0) return;
    
    try {
      const { db } = await import('../services/firebase');
      const { writeBatch, doc } = await import('firebase/firestore');
      
      const batch = writeBatch(db);
      
      notifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.delete(notificationRef);
      });
      
      await batch.commit();
      
      // Update local state
      setNotifications([]);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!currentUser) return;
    
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;
    
    try {
      const { db } = await import('../services/firebase');
      const { writeBatch, doc } = await import('firebase/firestore');
      
      const batch = writeBatch(db);
      
      unreadNotifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, { read: true });
      });
      
      await batch.commit();
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  // Function to show browser notifications
  const showBrowserNotification = (notification) => {
    try {
      if (!('Notification' in window)) {
        console.warn('Browser notifications not supported');
        return;
      }

      if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }
      
      // Create a unique ID for deduplication
      const dedupeKey = `${notification.id}-${notification.title}`;
      if (shownNotifications.has(dedupeKey)) {
        console.log('Skipping duplicate browser notification:', notification.title);
        return;
      }
      
      // Add to shown notifications set
      shownNotifications.add(dedupeKey);

      // Log the notification data for debugging
      console.log('Showing popup notification:', notification);

      // Prepare notification data with dark theme styling
      const title = notification.title || 'New Notification';
      const options = {
        body: notification.body || 'You have a new notification',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: notification.id || 'notification',
        data: {
          ...(notification.data || {}),
          // Add dark theme styling information
          style: notification.data?.style || {
            background: '#2A2A2A', // Darker background as per user preference
            color: '#FFFFFF',     // White text for better readability
            borderRadius: '8px',
            padding: '16px',
          }
        },
        // Better styling with dark mode support
        silent: false, // Allow sound
        requireInteraction: true, // Keep notification visible until user interacts
        vibrate: [200, 100, 200] // Vibration pattern for mobile devices
      };

      // Create and show the notification
      const browserNotification = new Notification(title, options);

      // Handle notification click
      browserNotification.onclick = () => {
        console.log('Browser notification clicked:', notification);
        browserNotification.close();
        window.focus();

        // Mark as read when clicked
        markNotificationAsRead(notification.id).catch(error => {
          console.error('Error marking notification as read:', error);
        });

        // Navigate to appropriate page
        const link = notification.data?.url || 
                    (notification.data?.gameId ? `/games/${notification.data.gameId}` : null) ||
                    (notification.gameId ? `/games/${notification.gameId}` : null);

        if (link) {
          window.location.href = link;
        }
      };
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  console.log('Unread notifications count:', unreadCount);

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label={`${unreadCount} new notifications`}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          style: {
            maxHeight: 400,
            width: '300px',
          },
        }}
      >
        {/* Action buttons at the top of menu */}
        {notifications.length > 0 && [
          <Box key="action-buttons" sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '8px 16px', 
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)' 
          }}>
            <Tooltip title="Mark all as read">
              <IconButton 
                size="small" 
                onClick={handleMarkAllAsRead}
                disabled={notifications.every(n => n.read)}
              >
                <DoneAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Delete all notifications">
              <IconButton 
                size="small" 
                onClick={handleDeleteAllNotifications}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ]}
        
        {/* Notification list */}
        {notifications.length === 0 ? (
          <MenuItem>
            <Typography>No notifications</Typography>
          </MenuItem>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                backgroundColor: notification.read ? 'inherit' : 'action.hover',
                display: 'block',
                whiteSpace: 'pre-wrap',
                padding: '12px',
                position: 'relative',
              }}
            >
              <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold', pr: 4 }}>
                {notification.title}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  marginTop: '4px',
                  marginBottom: '4px'
                }}
              >
                {notification.body}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {notification.createdAt?.toDate 
                  ? getFormattedDate(notification.createdAt)
                  : 'Just now'}
              </Typography>
              
              {/* Delete button for individual notification */}
              <IconButton
                size="small"
                onClick={(e) => handleDeleteNotification(e, notification.id)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  padding: '4px',
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </MenuItem>
          ))
        )}
      </Menu>

      <Snackbar
        open={showPermissionPrompt}
        message="Would you like to receive notifications for new games?"
        action={
          <Button color="primary" size="small" onClick={() => setShowPermissionPrompt(false)}>
            Enable
          </Button>
        }
      />
    </>
  );
}