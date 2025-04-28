import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  IconButton,
  Divider,
  Stack,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Event as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { updateGame } from '../../services/firebase';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

export default function EditGame({ open, game, onClose, onSuccess, clearPlayerCache, getPlayersData }) {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    maxPlayers: 4,
    status: 'open',
    players: [],
    duration: 1.5,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [playersData, setPlayersData] = useState({});
  const { currentUser } = useAuth();

  useEffect(() => {
    if (game) {
      setFormData({
        date: game.date || '',
        time: game.time || '',
        location: game.location || '',
        maxPlayers: game.maxPlayers || 4,
        status: game.status || 'open',
        players: game.players || [],
        duration: game.duration || 1.5,
      });
    }
  }, [game]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await updateGame(game.id, {
        ...formData,
        lastUpdated: new Date().toISOString()
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating game:', error);
      setError('Failed to update game');
    }

    setLoading(false);
  };

  const renderPlayerName = (playerId) => {
    const playerData = playersData[playerId];
    if (!playerData) return 'Unknown Player';

    if (playerData.firstName && playerData.lastName) {
      return `${playerData.firstName} ${playerData.lastName}`;
    } else if (playerData.displayName) {
      return playerData.displayName;
    } else if (playerData.email) {
      return playerData.email.split('@')[0];
    }
    
    return 'Unknown Player';
  };

  useEffect(() => {
    if (!game?.players) return;

    // Clear player cache to force refresh
    if (clearPlayerCache) {
      clearPlayerCache();
    }

    const fetchPlayersData = async () => {
      try {
        // Get all unique player IDs
        const allPlayerIds = new Set(game.players);

        // Fetch player data
        const playerData = await getPlayersData(Array.from(allPlayerIds), currentUser?.uid);
        setPlayersData(playerData);
      } catch (error) {
        console.error('Error fetching player data:', error);
        setError('Failed to load player data');
      }
    };

    fetchPlayersData();
  }, [game?.players, currentUser, clearPlayerCache]);

  const handleRemovePlayer = (playerId) => {
    setFormData(prev => ({
      ...prev,
      players: prev.players.filter(id => id !== playerId),
    }));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3,
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <EditIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div">
            Edit Game
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: 'inherit',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: <CalendarIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />

            <TextField
              label="Time"
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: <TimeIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />

            <TextField
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              fullWidth
              required
              InputProps={{
                startAdornment: <LocationIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Maximum Players</InputLabel>
              <Select
                name="maxPlayers"
                value={formData.maxPlayers}
                onChange={handleChange}
                label="Maximum Players"
                required
                startAdornment={<GroupIcon sx={{ ml: 1, mr: -0.5, color: 'action.active' }} />}
              >
                {[2, 3, 4, 5, 6, 8, 10, 12].map(num => (
                  <MenuItem key={num} value={num}>{num} players</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Match Duration (hours)</InputLabel>
              <Select
                name="duration"
                value={formData.duration || 1.5}
                onChange={handleChange}
                label="Match Duration (hours)"
                required
              >
                <MenuItem value={1}>1 hour</MenuItem>
                <MenuItem value={1.5}>1.5 hours</MenuItem>
                <MenuItem value={2}>2 hours</MenuItem>
                <MenuItem value={2.5}>2.5 hours</MenuItem>
                <MenuItem value={3}>3 hours</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                label="Status"
                required
              >
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              {formData.players?.map((playerId, index) => (
                <Chip
                  key={`player-${playerId}-${index}`}
                  label={renderPlayerName(playerId)}
                  onDelete={() => handleRemovePlayer(playerId)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Button 
            onClick={onClose}
            variant="outlined"
            disabled={loading}
            startIcon={<CloseIcon />}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={<EditIcon />}
          >
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
