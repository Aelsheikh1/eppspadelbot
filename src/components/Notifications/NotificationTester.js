import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Divider
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Send as SendIcon,
  PlaylistPlay as TestAllIcon
} from '@mui/icons-material';
import { testNotification, testAllNotifications } from '../../utils/notificationTester';


const NotificationTester = () => {
  const [notificationType, setNotificationType] = useState('gameCreated');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [permissionStatus, setPermissionStatus] = useState(Notification.permission);

  const handleTypeChange = (event) => {
    setNotificationType(event.target.value);
  };

  const handleRequestPermission = async () => {
    try {
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        setPermissionStatus(result);
        if (result === 'granted') {
          setSnackbar({
            open: true,
            message: 'Notification permission granted!',
            severity: 'success'
          });
        } else {
          setSnackbar({
            open: true,
            message: 'Notification permission denied. Please enable notifications in your browser settings.',
            severity: 'warning'
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: 'Notifications are not supported in this browser.',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setSnackbar({
        open: true,
        message: 'Failed to request notification permission',
        severity: 'error'
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      const result = await testNotification(notificationType);
      if (result) {
        setSnackbar({
          open: true,
          message: `Test notification sent: ${notificationType}`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to send test notification',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      setSnackbar({
        open: true,
        message: 'Error sending test notification',
        severity: 'error'
      });
    }
  };

  const handleTestAllNotifications = async () => {
    try {
      setSnackbar({
        open: true,
        message: 'Testing all notification types (will take a few seconds)...',
        severity: 'info'
      });
      
      await testAllNotifications();
      
      setSnackbar({
        open: true,
        message: 'All test notifications sent!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error testing all notifications:', error);
      setSnackbar({
        open: true,
        message: 'Error testing all notifications',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <NotificationsIcon sx={{ mr: 1 }} />
        <Typography variant="h5">Notification Tester</Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" mb={2}>
        This tool allows you to test push notifications locally during development.
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          Notification Permission Status: <strong>{permissionStatus}</strong>
        </Typography>
        
        {permissionStatus !== 'granted' && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleRequestPermission}
            sx={{ mt: 1 }}
          >
            Request Permission
          </Button>
        )}
      </Box>
      
      <Box mb={3}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="notification-type-label">Notification Type</InputLabel>
          <Select
            labelId="notification-type-label"
            value={notificationType}
            label="Notification Type"
            onChange={handleTypeChange}
            disabled={permissionStatus !== 'granted'}
          >
            <MenuItem value="gameCreated">Game Created</MenuItem>
            <MenuItem value="gameClosingSoon">Registration Closing Soon</MenuItem>
            <MenuItem value="gameClosed">Game Closed</MenuItem>
            <MenuItem value="tournamentUpdates">Tournament Updates</MenuItem>
            <MenuItem value="gameConfirmation">Game Registration Confirmation</MenuItem>
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<SendIcon />}
          onClick={handleTestNotification}
          disabled={permissionStatus !== 'granted'}
          sx={{ mr: 2 }}
        >
          Send Test Notification
        </Button>
        
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<TestAllIcon />}
          onClick={handleTestAllNotifications}
          disabled={permissionStatus !== 'granted'}
        >
          Test All Types
        </Button>
      </Box>
      
      <Box bgcolor="#f5f5f5" p={2} borderRadius={1}>
        <Typography variant="subtitle2" gutterBottom>
          Developer Notes:
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
          <li>Notifications require HTTPS, even on localhost</li>
          <li>Make sure your browser permissions are set to allow notifications</li>
          <li>Test notifications will only appear when the app is in the foreground</li>
          <li>Real notifications will work in both foreground and background</li>
        </Typography>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default NotificationTester;
