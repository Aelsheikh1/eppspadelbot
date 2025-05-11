import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  addDoc, collection, getDocs, query, where
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { notifyGameCreated } from '../../utils/browserNotifications';
import { useAuth } from '../../contexts/AuthContext';
import { sendGameNotification } from '../../utils/gameNotifications';
import { toast } from 'react-toastify';

/**
 * Send game created notifications to all users
 * @param {string} gameId - ID of the newly created game
 * @param {Object} gameData - Details of the created game
 */
const sendGameCreatedNotifications = async (gameId, gameData) => {
  try {
    // Fetch all users who want game created notifications
    const usersRef = collection(db, 'users');
    const usersQuery = query(
      usersRef, 
      where('notificationSettings.gameCreated', '!=', false)
    );
    const usersSnapshot = await getDocs(usersQuery);

    // Create notifications for each user
    const notificationsRef = collection(db, 'notifications');
    const notificationPromises = usersSnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Create notification document
      await addDoc(notificationsRef, {
        userId,
        title: 'New Game Created',
        body: `A new game has been created at ${gameData.location} on ${gameData.date} at ${gameData.time}`,
        type: 'gameCreated',
        data: {
          gameId,
          location: gameData.location,
          date: gameData.date,
          time: gameData.time
        },
        read: false,
        createdAt: new Date()
      });

      // Browser notifications are now handled by notifyGameCreated
    });

    // Wait for all notifications to be created
    await Promise.all(notificationPromises);

    console.log(`Sent game created notifications for game ${gameId}`);
  } catch (error) {
    console.error('Error sending game created notifications:', error);
  }
};

export default function CreateGame() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    maxPlayers: 4,
    deadline: '',
    deadlineTime: '',
    description: '',
    duration: 1.5
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const gameDate = new Date(formData.date + 'T' + formData.time);
      const deadlineDate = new Date(formData.deadline + 'T' + formData.deadlineTime);

      if (deadlineDate >= gameDate) {
        setError('Deadline must be before the game start time');
        setLoading(false);
        return;
      }

      const gameData = {
        date: formData.date,
        time: formData.time,
        location: formData.location,
        maxPlayers: parseInt(formData.maxPlayers),
        players: [],
        deadline: formData.deadline,
        deadlineTime: formData.deadlineTime,
        description: formData.description,
        duration: parseFloat(formData.duration),
        isOpen: true,
        status: 'open',
        createdAt: new Date().toISOString(),
        createdBy: {
          id: currentUser.uid,
          name: currentUser.displayName || 'Anonymous',
          email: currentUser.email
        }
      };

      // Add the game to Firestore
      const gameDocRef = await addDoc(collection(db, 'games'), gameData);
      const gameId = gameDocRef.id;
      
      // Create notification data
      const notificationData = {
        id: gameId,
        location: gameData.location,
        date: format(new Date(gameData.date), 'yyyy-MM-dd'),
        time: gameData.time,
        // Add formatted date string for display
        formattedDate: format(new Date(gameData.date), 'MMMM do, yyyy')
      };
      
      // Send notifications to all users via Firestore
      await sendGameNotification('gameCreated', notificationData);
      
      // Show a direct browser notification
      notifyGameCreated(notificationData);
      
      // Show success toast with dark theme styling
      toast.success('Game created successfully!', {
        style: {
          background: '#2A2A2A', // Darker background as per user preference
          color: '#FFFFFF',     // White text for better readability
          borderRadius: '8px',
          padding: '16px',
        },
        icon: '🎮'
      });
      
      // Note: We're no longer calling the old sendGameCreatedNotifications function
      // to avoid duplicate notifications
      
      navigate('/admin/games');
    } catch (err) {
      console.error('Error creating game:', err);
      setError('Failed to create game. Please try again.');
    }

    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Create New Game
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            required
            fullWidth
            label="Date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <TextField
            required
            fullWidth
            label="Time"
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <TextField
            required
            fullWidth
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Maximum Players</InputLabel>
            <Select
              value={formData.maxPlayers}
              label="Maximum Players"
              name="maxPlayers"
              onChange={handleChange}
            >
              <MenuItem value={2}>2</MenuItem>
              <MenuItem value={4}>4</MenuItem>
              <MenuItem value={6}>6</MenuItem>
              <MenuItem value={8}>8</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={12}>12</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Match Duration (hours)</InputLabel>
            <Select
              value={formData.duration}
              label="Match Duration (hours)"
              name="duration"
              onChange={handleChange}
            >
              <MenuItem value={1}>1</MenuItem>
              <MenuItem value={1.5}>1.5</MenuItem>
              <MenuItem value={2}>2</MenuItem>
              <MenuItem value={2.5}>2.5</MenuItem>
              <MenuItem value={3}>3</MenuItem>
            </Select>
          </FormControl>

          <TextField
            required
            fullWidth
            label="Registration Deadline Date"
            type="date"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <TextField
            required
            fullWidth
            label="Registration Deadline Time"
            type="time"
            name="deadlineTime"
            value={formData.deadlineTime}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            multiline
            rows={4}
            sx={{ mb: 2 }}
          />

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              type="button"
              variant="outlined"
              color="secondary"
              onClick={async () => {
                // Create test notification data
                const testGameData = {
                  id: 'test-game-id',
                  location: 'Test Location',
                  date: format(new Date(), 'yyyy-MM-dd'),
                  time: '18:00',
                  formattedDate: format(new Date(), 'MMMM do, yyyy')
                };
                
                // Show a direct browser notification
                const notificationShown = await notifyGameCreated(testGameData);
                
                // Show toast with dark theme styling
                toast.info(
                  notificationShown ? 
                    'Test notification sent successfully!' : 
                    'Please enable notifications in your browser settings', 
                  {
                    style: {
                      background: '#2A2A2A',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '16px',
                    },
                    icon: notificationShown ? '✅' : '⚠️'
                  }
                );
              }}
              startIcon={<NotificationsIcon />}
              sx={{ 
                backgroundColor: theme => theme.palette.mode === 'dark' ? '#2A2A2A' : undefined,
                color: theme => theme.palette.mode === 'dark' ? '#FFFFFF' : undefined,
                borderColor: theme => theme.palette.mode === 'dark' ? '#FFFFFF' : undefined,
                '&:hover': {
                  backgroundColor: theme => theme.palette.mode === 'dark' ? '#3A3A3A' : undefined,
                }
              }}
            >
              Test Notification
            </Button>
            
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={24} /> : <AddIcon />}
              sx={{ color: '#FFFFFF' }}
            >
              {loading ? 'Creating...' : 'Create Game'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
