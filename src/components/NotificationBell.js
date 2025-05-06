import React, { useEffect, useState } from 'react';
import { 
  Badge, 
  IconButton, 
  Menu, 
  MenuItem, 
  Typography, 
  Snackbar, 
  Button, 
  Divider,
  Box,
  Tooltip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DeleteIcon from '@mui/icons-material/Delete';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CloseIcon from '@mui/icons-material/Close';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
                  formattedDate: formatDistanceToNow(notificationData.createdAt?.toDate(), { addSuffix: true })
                };
              });
              
              console.log(`Fetched ${notifs.length} notifications for user:`, uid);
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
                  ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })
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