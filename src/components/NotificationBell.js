import React, { useEffect, useState } from 'react';
import { Badge, IconButton, Menu, MenuItem, Typography } from '@mui/material';
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
  const { currentUser } = useAuth();
  
  useEffect(() => {
    async function initializeNotifications() {
      if (currentUser) {
        console.log('Initializing notifications for user:', currentUser.uid);
        try {
          // Request permission and setup messaging
          const token = await requestNotificationPermission();
          console.log('Notification token received:', token);
          
          setupForegroundMessaging();
          console.log('Foreground messaging setup complete');
          
          // Load notifications
          await loadNotifications();
        } catch (error) {
          console.error('Error initializing notifications:', error);
        }
      }
    }

    initializeNotifications();
  }, [currentUser]);

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
    </>
  );
}
