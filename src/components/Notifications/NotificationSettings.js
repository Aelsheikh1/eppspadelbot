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
  Divider,
  Chip
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
import FloatingBell from '../FloatingBell';

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

  // Handler for floating bell click
  const handleBellClick = () => {
    if (!window.OneSignal || typeof window.OneSignal.push !== 'function') {
      setSnackbar({
        open: true,
        message: 'Notification system not ready. Please wait or refresh.',
        severity: 'warning'
      });
      return;
    }
    window.OneSignal.push(async function(OneSignal) {

      if (typeof OneSignal.showSlidedownPrompt === 'function') {
        await OneSignal.showSlidedownPrompt();
      }

    });
  };



  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box mb={3}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <NotificationsIcon color="primary" />
            <Typography variant="h5" fontWeight="bold">
              Notification Settings
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Status:
            </Typography>
            {permissionStatus === 'granted' && (
              <Chip label="Enabled" color="success" sx={{ fontWeight: 600, fontSize: '1rem' }} />
            )}
            {permissionStatus === 'denied' && (
              <Chip label="Blocked" color="error" sx={{ fontWeight: 600, fontSize: '1rem' }} />
            )}
            {permissionStatus !== 'granted' && permissionStatus !== 'denied' && (
              <Chip label="Not Enabled" color="warning" sx={{ fontWeight: 600, fontSize: '1rem' }} />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {permissionStatus === 'denied'
              ? 'You have blocked notifications. Please enable them in your browser settings to receive game updates.'
              : 'Enable notifications to receive updates about games and tournaments.'}
          </Typography>
          {permissionStatus !== 'granted' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<NotificationsActiveIcon />}
              onClick={handleRequestPermission}
              sx={{ mt: 1 }}
            >
              Enable Notifications
            </Button>
          )}
        </Box>

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
