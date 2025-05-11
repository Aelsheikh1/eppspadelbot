import React, { useState, useEffect } from 'react';
import { Button, Container, Typography, Paper, Box, Divider, Card, CardContent } from '@mui/material';
import { toast } from 'react-toastify';
import { 
  initializeAppNotifications, 
  requestAppNotificationPermission, 
  showAppNotification,
  getNotificationSystemInfo,
  areNotificationsSupported
} from '../utils/pushNotificationManager';

const MobileNotificationTest = () => {
  const [notificationStatus, setNotificationStatus] = useState('Checking...');
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [notificationCount, setNotificationCount] = useState(0);
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    // Check notification status on component mount
    checkNotificationStatus();
    
    // Load previously shown notification count from localStorage
    const savedCount = localStorage.getItem('notificationCount');
    if (savedCount) {
      setNotificationCount(parseInt(savedCount, 10));
      console.log('Loaded', savedCount, 'previously shown notifications');
    }
    
    // Get system info
    setSystemInfo(getNotificationSystemInfo());
  }, []);

  const checkNotificationStatus = async () => {
    try {
      const isInitialized = await initializeAppNotifications();
      setNotificationStatus(isInitialized ? 'Initialized' : 'Not initialized');
      
      // Check permission status
      if (areNotificationsSupported()) {
        // For web notifications
        if ('Notification' in window) {
          setPermissionStatus(Notification.permission);
        } else {
          // For native notifications, we assume permission is granted if initialized
          setPermissionStatus(isInitialized ? 'granted' : 'unknown');
        }
      } else {
        setPermissionStatus('not supported');
      }
      
      // Refresh system info
      setSystemInfo(getNotificationSystemInfo());
    } catch (error) {
      console.error('Error checking notification status:', error);
      setNotificationStatus('Error: ' + error.message);
    }
  };

  const requestPermission = async () => {
    try {
      const result = await requestAppNotificationPermission();
      setPermissionStatus(result ? 'granted' : 'denied');
      toast.info(`Notification permission ${result ? 'granted' : 'denied'}`);
      
      // Refresh status after permission request
      checkNotificationStatus();
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Error requesting permission: ' + error.message);
    }
  };

  const sendTestNotification = () => {
    try {
      const newCount = notificationCount + 1;
      setNotificationCount(newCount);
      localStorage.setItem('notificationCount', newCount.toString());
      
      const notificationTitle = `Test Notification #${newCount}`;
      const notificationOptions = {
        body: 'This is a test notification from PadelBolt',
        icon: '/logo192.png',
        badge: '/logo192.png',
        timestamp: Date.now(),
        tag: 'test-notification',
        data: {
          url: window.location.href,
          testId: newCount
        },
        // Dark mode styling based on user preference
        style: {
          backgroundColor: '#2A2A2A',
          color: '#FFFFFF'
        }
      };
      
      showAppNotification(notificationTitle, notificationOptions);
      toast.success('Test notification sent!');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Error sending notification: ' + error.message);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, backgroundColor: '#2A2A2A', color: '#FFFFFF' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Mobile Notification Test
        </Typography>
        
        <Divider sx={{ my: 2, backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
        
        {systemInfo && (
          <Card sx={{ mb: 3, backgroundColor: '#3A3A3A', color: '#FFFFFF' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Information
              </Typography>
              <Typography variant="body2">
                Device Type: {systemInfo.systemType}
              </Typography>
              <Typography variant="body2">
                Native App: {systemInfo.isNativeApp ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="body2">
                Mobile Device: {systemInfo.isMobileDevice ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="body2">
                Notifications Supported: {systemInfo.notificationsSupported ? 'Yes' : 'No'}
              </Typography>
            </CardContent>
          </Card>
        )}
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Notification Status
          </Typography>
          <Typography variant="body1">
            System Status: {notificationStatus}
          </Typography>
          <Typography variant="body1">
            Permission: {permissionStatus}
          </Typography>
          <Typography variant="body1">
            Notifications Sent: {notificationCount}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={requestPermission}
            disabled={permissionStatus === 'granted'}
          >
            {permissionStatus === 'granted' ? 'Permission Granted' : 'Request Permission'}
          </Button>
          
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={sendTestNotification}
            disabled={permissionStatus !== 'granted'}
          >
            Send Test Notification
          </Button>
          
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={checkNotificationStatus}
          >
            Refresh Status
          </Button>
        </Box>
        
        <Card sx={{ mt: 3, backgroundColor: '#3A3A3A', color: '#FFFFFF' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              How This Works
            </Typography>
            <Typography variant="body2" paragraph>
              This mobile notification system:
            </Typography>
            <ul>
              <li>
                <Typography variant="body2">
                  Works on all mobile browsers (Android, iOS, etc.)
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Uses native notifications on Android and iOS when available
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Falls back to in-app notifications when push is not supported
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Can be integrated with Firebase Cloud Messaging for real-time alerts
                </Typography>
              </li>
            </ul>
          </CardContent>
        </Card>
      </Paper>
    </Container>
  );
};

export default MobileNotificationTest;
