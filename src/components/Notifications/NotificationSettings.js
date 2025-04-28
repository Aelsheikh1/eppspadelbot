import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormGroup,
  FormControlLabel,
  Paper,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon
} from '@mui/icons-material';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { updateNotificationSettings } from '../../services/notificationService';
import NotificationTester from './NotificationTester';

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    gameCreated: true,
    gameClosingSoon: true,
    gameClosed: true,
    tournamentUpdates: true
  });
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const checkPermission = async () => {
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
      }
    };

    const fetchSettings = async () => {
      setLoading(true);
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          setLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().notificationSettings) {
          setSettings(userDoc.data().notificationSettings);
        }
      } catch (error) {
        console.error('Error fetching notification settings:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load notification settings',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
    fetchSettings();
  }, []);

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

  const handleToggle = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateNotificationSettings(settings);
      setSnackbar({
        open: true,
        message: 'Notification settings saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save notification settings',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <NotificationsIcon sx={{ mr: 1 }} />
          <Typography variant="h5">Notification Settings</Typography>
        </Box>

      {permissionStatus !== 'granted' && (
        <Box mb={3} p={2} bgcolor="#f5f5f5" borderRadius={1}>
          <Box display="flex" alignItems="center" mb={1}>
            <NotificationsOffIcon color="warning" sx={{ mr: 1 }} />
            <Typography variant="subtitle1" fontWeight="bold">
              Notifications are {permissionStatus === 'denied' ? 'blocked' : 'not enabled'}
            </Typography>
          </Box>
          <Typography variant="body2" mb={2}>
            {permissionStatus === 'denied'
              ? 'You have blocked notifications. Please enable them in your browser settings to receive game updates.'
              : 'Enable notifications to receive updates about games and tournaments.'}
          </Typography>
          {permissionStatus !== 'denied' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<NotificationsActiveIcon />}
              onClick={handleRequestPermission}
            >
              Enable Notifications
            </Button>
          )}
        </Box>
      )}

      <Typography variant="subtitle1" gutterBottom>
        Choose which notifications you want to receive:
      </Typography>

      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={settings.gameCreated}
              onChange={() => handleToggle('gameCreated')}
              disabled={permissionStatus !== 'granted'}
            />
          }
          label="New games created"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.gameClosingSoon}
              onChange={() => handleToggle('gameClosingSoon')}
              disabled={permissionStatus !== 'granted'}
            />
          }
          label="Games closing soon (24 hours before)"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.gameClosed}
              onChange={() => handleToggle('gameClosed')}
              disabled={permissionStatus !== 'granted'}
            />
          }
          label="Game registration closed"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.tournamentUpdates}
              onChange={() => handleToggle('tournamentUpdates')}
              disabled={permissionStatus !== 'granted'}
            />
          }
          label="Tournament updates"
        />
      </FormGroup>

      <Box mt={3}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveSettings}
          disabled={permissionStatus !== 'granted' || saving}
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
    
    {/* Only show the notification tester in development mode */}
    {process.env.NODE_ENV === 'development' && (
      <NotificationTester />
    )}
    </Box>
  );
};

export default NotificationSettings;
