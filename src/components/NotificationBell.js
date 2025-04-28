import React, { useEffect, useState } from 'react';
import { Badge, IconButton, Menu, MenuItem, Typography, Snackbar, Button } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';

import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const { currentUser } = useAuth();
  
  // --- Load notifications from Firestore for the current user ---
  useEffect(() => {
    if (!currentUser) return;
    const { uid } = currentUser;
    import('../services/firebase').then(({ db }) => {
      import('firebase/firestore').then(({ collection, query, where, orderBy, onSnapshot, updateDoc, doc }) => {
        const notificationsRef = collection(db, 'notifications');
        const q = query(notificationsRef, where('userId', '==', uid), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const notifs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
          setNotifications(notifs);
        });
        return () => unsubscribe();
      });
    });
  }, [currentUser]);

  const setupNotifications = async () => {
    try {
      // For OneSignal: No manual permission/token request needed here
      // Just load notifications
      await loadNotifications();
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const handlePermissionRequest = async () => {
    setShowPermissionPrompt(false);
    try {
      // For OneSignal: No manual permission step needed
      await setupNotifications();
    } catch (error) {
      console.error('Error requesting permission:', error);
    }
  };

  const loadNotifications = async () => {
    if (currentUser) {
      console.log('Loading notifications for user:', currentUser.uid);
      try {
        // TODO: Integrate OneSignal notification fetching here.
        setNotifications([]);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked:', notification);
    if (!notification.read) {
      try {
        // TODO: Integrate OneSignal notification marking here.
        await loadNotifications(); // Reload notifications to update the badge
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    handleClose();

    // Navigate to the notification link if present
    if (notification.link) {
      window.location.href = notification.link;
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
              }}
            >
              <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
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
            </MenuItem>
          ))
        )}
      </Menu>

      <Snackbar
        open={showPermissionPrompt}
        message="Would you like to receive notifications for new games?"
        action={
          <Button color="primary" size="small" onClick={handlePermissionRequest}>
            Enable
          </Button>
        }
      />
    </>
  );
}
