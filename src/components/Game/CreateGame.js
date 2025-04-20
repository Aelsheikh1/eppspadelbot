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
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

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
    description: ''
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
        isOpen: true,
        status: 'open',
        createdAt: new Date().toISOString(),
        createdBy: {
          id: currentUser.uid,
          name: currentUser.displayName || 'Anonymous',
          email: currentUser.email
        }
      };

      await addDoc(collection(db, 'games'), gameData);
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
