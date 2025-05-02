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
} from '@mui/material';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

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

      // Optional: Send web push notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Game Created', {
          body: `A new game has been created at ${gameData.location} on ${gameData.date} at ${gameData.time}`,
          icon: '/logo192.png',
          data: { gameId }
        });
      }
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
      
      // Send notifications to all users
      await sendGameCreatedNotifications(gameDocRef.id, gameData);
      
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

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ mt: 2 }}
          >
            Create Game
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
