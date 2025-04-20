import React, { useEffect, useState } from 'react';
import { Badge, IconButton, Menu, MenuItem, Typography, Snackbar, Button } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { 
  requestNotificationPermission, 
  setupForegroundMessaging,
  getUserNotifications,
  markNotificationAsRead 
} from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const { currentUser } = useAuth();
  
  useEffect(() => {
    async function initializeNotifications() {
      if (currentUser) {
        console.log('Initializing notifications for user:', currentUser.uid);
        try {
          // Check if we already have permission
          if (Notification.permission === 'default') {
            setShowPermissionPrompt(true);
          } else if (Notification.permission === 'granted') {
            await setupNotifications();
          }
        } catch (error) {
          console.error('Error initializing notifications:', error);
        }
      }
    }

    initializeNotifications();
  }, [currentUser]);

  const setupNotifications = async () => {
    try {
      // Request permission and setup messaging
      const token = await requestNotificationPermission();
      console.log('Notification token received:', token);
      
      if (token) {
        setupForegroundMessaging();
        console.log('Foreground messaging setup complete');
        
        // Load notifications
        await loadNotifications();
      } else {
        console.warn('Failed to get notification token');
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const handlePermissionRequest = async () => {
    setShowPermissionPrompt(false);
    try {
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      if (permission === 'granted') {
        await setupNotifications();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    }
  };

  const loadNotifications = async () => {
    if (currentUser) {
      console.log('Loading notifications for user:', currentUser.uid);
      try {
        const userNotifications = await getUserNotifications(currentUser.uid);
        console.log('Loaded notifications:', userNotifications);
        setNotifications(userNotifications);
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
        await markNotificationAsRead(notification.id);
        console.log('Marked notification as read:', notification.id);
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
