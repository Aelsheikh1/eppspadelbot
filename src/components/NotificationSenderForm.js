import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  Button,
  Chip
} from '@mui/material';
import { sendCustomNotification, getNotificationUsers } from '../utils/customNotificationSender';
import { fetchOpenGames } from '../utils/gameNotifications';

// Form component for sending notifications
const NotificationSenderForm = ({ onNotificationSent }) => {
  // State declarations
  const [notificationType, setNotificationType] = useState('basic');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetRole, setTargetRole] = useState('user');
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [gameId, setGameId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load users and games on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userList = await getNotificationUsers();
        setUsers(userList);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    const fetchGames = async () => {
      setLoadingGames(true);
      try {
        const gamesData = await fetchOpenGames();
        setGames(gamesData);
      } catch (error) {
        console.error('Failed to fetch games:', error);
      } finally {
        setLoadingGames(false);
      }
    };

    if (notificationType === 'game') {
      fetchGames();
    }
  }, [notificationType]);

  // Handle notification sending
  const handleSendNotification = async () => {
    // Validate inputs
    if (!title.trim()) {
      onNotificationSent('Please enter a notification title', 'warning');
      return;
    }
    
    if (!body.trim()) {
      onNotificationSent('Please enter notification content', 'warning');
      return;
    }
    
    if (targetType === 'user' && !targetUserId) {
      onNotificationSent('Please select a target user', 'warning');
      return;
    }
    
    if (targetType === 'role' && !targetRole) {
      onNotificationSent('Please select a target role', 'warning');
      return;
    }
    
    if (notificationType === 'game' && !gameId) {
      onNotificationSent('Please select a game', 'warning');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const notificationData = {
        type: notificationType,
        title,
        body,
        targetType,
        targetUserId: targetType === 'user' ? targetUserId : undefined,
        targetRole: targetType === 'role' ? targetRole : undefined,
        gameId: notificationType === 'game' ? gameId : undefined
      };

      await sendCustomNotification(notificationData);
      onNotificationSent('Notification sent successfully', 'success');
      
      // Reset form
      setTitle('');
      setBody('');
    } catch (error) {
      setError(error.message);
      onNotificationSent('Failed to send notification: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Styles for dark mode
  const styles = {
    content: {
      padding: '1rem'
    },
    input: {
      '& .MuiInputLabel-root': {
        color: '#FFFFFF'
      },
      '& .MuiOutlinedInput-root': {
        color: '#FFFFFF',
        '& fieldset': {
          borderColor: '#FFFFFF'
        },
        '&:hover fieldset': {
          borderColor: '#FFFFFF'
        }
      }
    },
    select: {
      color: '#FFFFFF',
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: '#FFFFFF'
      }
    }
  };

  return (
    <Box sx={styles.content}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel sx={{ color: '#FFFFFF' }}>Notification Type</FormLabel>
            <RadioGroup
              row
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value)}
            >
              <FormControlLabel
                value="basic"
                control={<Radio sx={{ color: '#FFFFFF' }} />}
                label="Basic"
                sx={{ color: '#FFFFFF' }}
              />
              <FormControlLabel
                value="link"
                control={<Radio sx={{ color: '#FFFFFF' }} />}
                label="Link"
                sx={{ color: '#FFFFFF' }}
              />
              <FormControlLabel
                value="action"
                control={<Radio sx={{ color: '#FFFFFF' }} />}
                label="Action"
                sx={{ color: '#FFFFFF' }}
              />
              <FormControlLabel
                value="game"
                control={<Radio sx={{ color: '#FFFFFF' }} />}
                label="Game"
                sx={{ color: '#FFFFFF' }}
              />
            </RadioGroup>
          </FormControl>
        </Grid>

        {notificationType === 'game' && (
          <Grid item xs={12}>
            <FormControl fullWidth sx={styles.input}>
              <InputLabel>Select Game</InputLabel>
              <Select
                value={gameId}
                onChange={(e) => {
                  setGameId(e.target.value);
                  const selectedGame = games.find(game => game.id === e.target.value);
                  if (selectedGame) {
                    setTitle(`Game Update: ${selectedGame.title}`);
                    setBody(`There's an update for your game ${selectedGame.title}`);
                  }
                }}
                sx={styles.select}
              >
                {games.map((game) => (
                  <MenuItem key={game.id} value={game.id}>
                    {game.title}
                    {game.status === 'OPEN' ? (
                      <Chip
                        label="OPEN"
                        size="small"
                        color="success"
                        sx={{ ml: 1 }}
                      />
                    ) : (
                      <Chip
                        label="CLOSED"
                        size="small"
                        color="error"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={styles.input}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            multiline
            rows={4}
            sx={styles.input}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel sx={{ color: '#FFFFFF' }}>Target Type</FormLabel>
            <RadioGroup
              row
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
            >
              <FormControlLabel
                value="all"
                control={<Radio sx={{ color: '#FFFFFF' }} />}
                label="All Users"
                sx={{ color: '#FFFFFF' }}
              />
              <FormControlLabel
                value="role"
                control={<Radio sx={{ color: '#FFFFFF' }} />}
                label="By Role"
                sx={{ color: '#FFFFFF' }}
              />
              <FormControlLabel
                value="user"
                control={<Radio sx={{ color: '#FFFFFF' }} />}
                label="Specific User"
                sx={{ color: '#FFFFFF' }}
              />
            </RadioGroup>
          </FormControl>
        </Grid>

        {targetType === 'role' && (
          <Grid item xs={12}>
            <FormControl fullWidth sx={styles.input}>
              <InputLabel>Select Role</InputLabel>
              <Select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                sx={styles.select}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}

        {targetType === 'user' && (
          <Grid item xs={12}>
            <FormControl fullWidth sx={styles.input}>
              <InputLabel>Select User</InputLabel>
              <Select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                sx={styles.select}
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSendNotification}
            fullWidth
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Notification'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NotificationSenderForm;
