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
    // Game notifications
    game: true,
    game_created: true,
    game_updated: true,
    gameClosingSoon: true,
    gameClosed: true,
    
    // Tournament notifications
    tournament_created: true,
    tournament_deadline: true,
    match_result: true,
    tournament_winner: true,
    bracket_update: true,
    upcoming_match: true,
    
    // General settings
    general: true,
    showDuplicates: false
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

        // First check localStorage for cached preferences
        const localPrefs = localStorage.getItem('notificationPreferences');
        let localSettings = null;
        
        if (localPrefs) {
          try {
            localSettings = JSON.parse(localPrefs);
          } catch (e) {
            console.error('Error parsing local notification preferences:', e);
          }
        }
        
        // Then check Firestore for user settings
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        let firestoreSettings = null;
        
        if (userDoc.exists() && userDoc.data().notificationSettings) {
          firestoreSettings = userDoc.data().notificationSettings;
        }
        
        // Merge settings, prioritizing Firestore settings
        if (firestoreSettings || localSettings) {
          const mergedSettings = {
            ...settings, // Default settings
            ...(localSettings || {}), // Local settings if available
            ...(firestoreSettings || {}) // Firestore settings override local
          };
          
          setSettings(mergedSettings);
          
          // Update localStorage with the merged settings
          localStorage.setItem('notificationPreferences', JSON.stringify(mergedSettings));
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
      // Save to Firestore
      await updateNotificationSettings(settings);
      
      // Also save to localStorage for faster access and to prevent duplicates
      localStorage.setItem('notificationPreferences', JSON.stringify(settings));
      
      // Clear shown notifications if user enables showing duplicates
      if (settings.showDuplicates) {
        localStorage.removeItem('shownNotifications');
        sessionStorage.removeItem('sessionNotifications');
        console.log('Cleared notification history to allow duplicates');
      }
      
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

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#FFFFFF', mt: 2, mb: 1 }}>
          Game Notifications
        </Typography>
        <Divider sx={{ mb: 2, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
        
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={settings.game}
                onChange={() => handleToggle('game')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="All game notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.game_created}
                onChange={() => handleToggle('game_created')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="New games created"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.game_updated}
                onChange={() => handleToggle('game_updated')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="Game updates"
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
        </FormGroup>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#FFFFFF', mt: 2, mb: 1 }}>
          Tournament Notifications
        </Typography>
        <Divider sx={{ mb: 2, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
        
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={settings.tournament_created}
                onChange={() => handleToggle('tournament_created')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="New tournaments created"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.tournament_deadline}
                onChange={() => handleToggle('tournament_deadline')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="Tournament registration deadlines"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.match_result}
                onChange={() => handleToggle('match_result')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="Match results"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.tournament_winner}
                onChange={() => handleToggle('tournament_winner')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="Tournament winners"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.bracket_update}
                onChange={() => handleToggle('bracket_update')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="Tournament bracket updates"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.upcoming_match}
                onChange={() => handleToggle('upcoming_match')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="Upcoming match reminders"
          />
        </FormGroup>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#FFFFFF', mt: 2, mb: 1 }}>
          Advanced Settings
        </Typography>
        <Divider sx={{ mb: 2, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
        
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={settings.general}
                onChange={() => handleToggle('general')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="General notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.showDuplicates}
                onChange={() => handleToggle('showDuplicates')}
                disabled={permissionStatus !== 'granted'}
              />
            }
            label="Allow duplicate notifications"
          />
        </FormGroup>
      </Box>

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
