import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendCustomNotification, getNotificationUsers } from '../utils/customNotificationSender';
import { getAuth } from 'firebase/auth';
import {
  Box,
  Container,
  Paper,
  Typography,
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
  IconButton,
  Tabs,
  Tab,
  Chip,
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

const CustomNotificationSender = () => {
  const navigate = useNavigate();
  
  // Detect if the app is in dark mode by checking both localStorage and document class
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('themeMode');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Then check if the document has a dark-mode class
    return document.documentElement.classList.contains('dark-mode');
  });
  
  // Update theme when it changes
  useEffect(() => {
    const handleThemeChange = () => {
      // Check localStorage
      const savedTheme = localStorage.getItem('themeMode');
      if (savedTheme) {
        setDarkMode(savedTheme === 'dark');
        return;
      }
      // Check document class
      setDarkMode(document.documentElement.classList.contains('dark-mode'));
    };
    
    // Listen for storage changes
    window.addEventListener('storage', handleThemeChange);
    
    // Also check periodically for theme changes
    const themeCheckInterval = setInterval(handleThemeChange, 1000);
    
    return () => {
      window.removeEventListener('storage', handleThemeChange);
      clearInterval(themeCheckInterval);
    };
  }, []);
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  
  // State declarations
  const [activeTab, setActiveTab] = useState(0);
  const [notificationType, setNotificationType] = useState('basic');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetRole, setTargetRole] = useState('user');
  const [users, setUsers] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [gameId, setGameId] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [url, setUrl] = useState('/games');
  const [actionText, setActionText] = useState('View');
  const [priority, setPriority] = useState('normal');
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  
  // Get styles based on theme
  const getStyles = (isDark) => ({
    container: {
      minHeight: '100vh',
      padding: '2rem',
      backgroundColor: isDark ? '#2A2A2A' : '#f5f5f5'
    },
    paper: {
      padding: '2rem',
      backgroundColor: isDark ? '#2A2A2A' : '#ffffff',
      color: isDark ? '#FFFFFF' : '#000000'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '2rem'
    },
    backButton: {
      marginRight: '1rem',
      color: isDark ? '#FFFFFF' : '#000000'
    },
    title: {
      color: isDark ? '#FFFFFF' : '#000000',
      flexGrow: 1
    },
    tabs: {
      marginBottom: '2rem',
      '& .MuiTab-root': {
        color: isDark ? '#FFFFFF' : '#000000'
      }
    },
    tab: {
      color: isDark ? '#FFFFFF' : '#000000'
    },
    content: {
      padding: '1rem'
    },
    input: {
      '& .MuiInputLabel-root': {
        color: isDark ? '#FFFFFF' : '#000000'
      },
      '& .MuiOutlinedInput-root': {
        color: isDark ? '#FFFFFF' : '#000000',
        '& fieldset': {
          borderColor: isDark ? '#FFFFFF' : 'rgba(0, 0, 0, 0.23)'
        },
        '&:hover fieldset': {
          borderColor: isDark ? '#FFFFFF' : 'rgba(0, 0, 0, 0.87)'
        }
      }
    },
    select: {
      color: isDark ? '#FFFFFF' : '#000000',
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: isDark ? '#FFFFFF' : 'rgba(0, 0, 0, 0.23)'
      }
    },
    formLabel: {
      color: isDark ? '#FFFFFF' : '#000000',
      '&.Mui-focused': {
        color: isDark ? '#FFFFFF' : '#1976d2'
      }
    },
    radio: {
      color: isDark ? '#FFFFFF' : '#1976d2',
      '&.Mui-checked': {
        color: isDark ? '#FFFFFF' : '#1976d2'
      }
    },
    button: {
      backgroundColor: isDark ? '#FFFFFF' : '#1976d2',
      color: isDark ? '#000000' : '#FFFFFF',
      '&:hover': {
        backgroundColor: isDark ? '#e0e0e0' : '#1565c0'
      }
    },
    gameChip: {
      backgroundColor: isDark ? '#FFFFFF' : '#1976d2',
      color: isDark ? '#000000' : '#FFFFFF',
      margin: '0.25rem'
    },
    templateSection: {
      marginTop: '1rem',
      padding: '1rem',
      border: `1px solid ${isDark ? '#FFFFFF' : 'rgba(0, 0, 0, 0.23)'}`,
      borderRadius: '4px'
    }
  });

  const styles = getStyles(darkMode);
  
  // Event handlers
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 1) {
      // Refresh history when switching to history tab
      fetchNotificationHistory();
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleSendNotification = async () => {
    // Validation
    if (targetType === 'user' && !targetUserId) {
      setSnackbarMessage('Please select a target user');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    
    if (targetType === 'role' && !targetRole) {
      setSnackbarMessage('Please select a target role');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    
    if (notificationType === 'game' && !gameId) {
      setSnackbarMessage('Please select a game');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    
    if (!title) {
      setSnackbarMessage('Please enter a title');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    
    if (!body) {
      setSnackbarMessage('Please enter a body');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const notificationData = {
        type: notificationType,
        title,
        body,
        targetType,
        targetUserId: targetType === 'user' ? targetUserId : undefined,
        targetRole: targetType === 'role' ? targetRole : undefined,
        gameId: notificationType === 'game' ? gameId : undefined,
        url: notificationType === 'link' ? url : undefined,
        actionText: notificationType === 'action' ? actionText : undefined,
        priority
      };

      await sendCustomNotification(notificationData);
      setSnackbarMessage('Notification sent successfully');
      setSnackbarSeverity('success');
      
      // Clear form after successful send
      if (notificationType !== 'game') {
        setTitle('');
        setBody('');
      }
    } catch (error) {
      setSnackbarMessage('Failed to send notification: ' + error.message);
      setSnackbarSeverity('error');
      setError(error.message);
    } finally {
      setLoading(false);
      setSnackbarOpen(true);
    }
  };

  // No theme toggle needed as we use the app's theme

  // Load users and games on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const result = await getNotificationUsers();
        if (result.success) {
          setUsers(result.users);
        } else {
          setUsers([]);
          setSnackbarMessage('Failed to load users: ' + result.error);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
        setUsers([]);
        setSnackbarMessage('Failed to load users: ' + error.message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    const fetchGames = async () => {
      setLoadingGames(true);
      try {
        // Import dynamically to avoid issues
        const { db } = await import('../services/firebase');
        const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
        
        const gamesCollection = collection(db, 'games');
        const gamesQuery = query(gamesCollection, orderBy('date', 'asc'));
        
        const querySnapshot = await getDocs(gamesQuery);
        const fetchedGames = [];
        
        querySnapshot.forEach((doc) => {
          const gameData = doc.data();
          fetchedGames.push({
            id: doc.id,
            ...gameData,
            title: gameData.title || `Game at ${gameData.location}`
          });
        });
        
        setGames(fetchedGames);
      } catch (error) {
        console.error('Error fetching games:', error);
        setSnackbarMessage('Error loading games: ' + error.message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        setLoadingGames(false);
      }
    };

    if (notificationType === 'game') {
      fetchGames();
    }
  }, [notificationType]);

  // Fetch notification history
  const fetchNotificationHistory = async () => {
    setLoadingHistory(true);
    try {
      // Get current user
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Get notifications from Firestore
      const { db } = await import('../services/firebase');
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      
      const q = query(
        collection(db, 'customNotifications'),
        where('senderId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const history = [];
      
      querySnapshot.forEach((doc) => {
        history.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().createdAt ? doc.data().createdAt : 0,
          createdAt: doc.data().createdAt ? new Date(doc.data().createdAt).toLocaleString() : 'Unknown'
        });
      });
      
      // Sort by timestamp descending (newest first)
      history.sort((a, b) => b.timestamp - a.timestamp);
      
      // Get all notifications, not just 10
      setNotificationHistory(history);
    } catch (err) {
      console.error('Error fetching notification history:', err);
      setSnackbarMessage(`Error loading history: ${err.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Delete a single notification
  const handleDeleteNotification = async () => {
    if (!notificationToDelete) return;
    
    try {
      const { db } = await import('../services/firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      
      await deleteDoc(doc(db, 'customNotifications', notificationToDelete.id));
      
      // Update local state
      setNotificationHistory(prev => 
        prev.filter(notification => notification.id !== notificationToDelete.id)
      );
      
      setSnackbarMessage('Notification deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error deleting notification:', error);
      setSnackbarMessage(`Error deleting notification: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
    }
  };
  
  // Delete all notifications
  const handleDeleteAllNotifications = async () => {
    try {
      const { db } = await import('../services/firebase');
      const { collection, query, where, getDocs, writeBatch } = await import('firebase/firestore');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) throw new Error('User not authenticated');
      
      const batch = writeBatch(db);
      const q = query(
        collection(db, 'customNotifications'),
        where('senderId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      // Clear local state
      setNotificationHistory([]);
      
      setSnackbarMessage('All notifications deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      setSnackbarMessage(`Error deleting notifications: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setDeleteAllDialogOpen(false);
    }
  };

  // Handle game selection
  const handleGameChange = (event) => {
    const selectedGameId = event.target.value;
    setGameId(selectedGameId);
    
    // Auto-fill title and body based on selected game
    if (selectedGameId) {
      const selectedGame = games.find(game => game.id === selectedGameId);
      if (selectedGame) {
        const gameDate = new Date(selectedGame.date);
        const formattedDate = gameDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        
        setTitle(`Game at ${selectedGame.location}`);
        setBody(`Join us for a game at ${selectedGame.location} on ${formattedDate}!`);
      }
    }
  };

  return (
    <Box>
      <Container maxWidth="md" sx={styles.container}>
        <Paper elevation={3} sx={styles.paper}>
          <Box sx={styles.header}>
            <IconButton onClick={() => navigate(-1)} sx={styles.backButton}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={styles.title}>
              Send Notification
            </Typography>
          </Box>

          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={styles.tabs}
          >
            <Tab
              label={<Box sx={{ display: 'flex', alignItems: 'center' }}>
                <NotificationsIcon sx={{ mr: 1 }} />
                Send
              </Box>}
              sx={styles.tab}
            />
            <Tab
              label={<Box sx={{ display: 'flex', alignItems: 'center' }}>
                <HistoryIcon sx={{ mr: 1 }} />
                History
              </Box>}
              sx={styles.tab}
            />
          </Tabs>

          {activeTab === 0 && (
            <Box sx={styles.content}>
              <Grid container spacing={3}>
                {/* Notification Type */}
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={styles.formLabel}>Notification Type</FormLabel>
                    <RadioGroup
                      row
                      value={notificationType}
                      onChange={(e) => setNotificationType(e.target.value)}
                    >
                      <FormControlLabel
                        value="basic"
                        control={<Radio sx={styles.radio} />}
                        label="Basic"
                        sx={{ color: styles.paper.color }}
                      />
                      <FormControlLabel
                        value="link"
                        control={<Radio sx={styles.radio} />}
                        label="Link"
                        sx={{ color: styles.paper.color }}
                      />
                      <FormControlLabel
                        value="action"
                        control={<Radio sx={styles.radio} />}
                        label="Action"
                        sx={{ color: styles.paper.color }}
                      />
                      <FormControlLabel
                        value="game"
                        control={<Radio sx={styles.radio} />}
                        label="Game"
                        sx={{ color: styles.paper.color }}
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {/* Game Selection (only for game notifications) */}
                {notificationType === 'game' && (
                  <Grid item xs={12}>
                    <FormControl fullWidth sx={styles.input}>
                      <InputLabel id="game-select-label">Select Game</InputLabel>
                      <Select
                        labelId="game-select-label"
                        id="game-select"
                        value={gameId}
                        onChange={handleGameChange}
                        label="Select Game"
                        sx={styles.select}
                        disabled={loadingGames}
                      >
                        <MenuItem value="">
                          <em>Select a game</em>
                        </MenuItem>
                        {games.map((game) => (
                          <MenuItem key={game.id} value={game.id}>
                            {game.title || `Game at ${game.location}`}
                            {' '}
                            <Chip
                              label={game.isOpen ? 'OPEN' : 'CLOSED'}
                              color={game.isOpen ? 'success' : 'error'}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {/* Link URL (only for link notifications) */}
                {notificationType === 'link' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="URL"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      sx={styles.input}
                    />
                  </Grid>
                )}

                {/* Action Text (only for action notifications) */}
                {notificationType === 'action' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Action Text"
                      value={actionText}
                      onChange={(e) => setActionText(e.target.value)}
                      sx={styles.input}
                    />
                  </Grid>
                )}

                {/* Title and Body */}
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

                {/* Target Type */}
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={styles.formLabel}>Target</FormLabel>
                    <RadioGroup
                      row
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value)}
                    >
                      <FormControlLabel
                        value="all"
                        control={<Radio sx={styles.radio} />}
                        label="All Users"
                        sx={{ color: styles.paper.color }}
                      />
                      <FormControlLabel
                        value="user"
                        control={<Radio sx={styles.radio} />}
                        label="Specific User"
                        sx={{ color: styles.paper.color }}
                      />
                      <FormControlLabel
                        value="role"
                        control={<Radio sx={styles.radio} />}
                        label="By Role"
                        sx={{ color: styles.paper.color }}
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {/* User Selection (only for user target) */}
                {targetType === 'user' && (
                  <Grid item xs={12}>
                    <FormControl fullWidth sx={styles.input}>
                      <InputLabel id="user-select-label">Select User</InputLabel>
                      <Select
                        labelId="user-select-label"
                        id="user-select"
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        label="Select User"
                        sx={styles.select}
                      >
                        <MenuItem value="">
                          <em>Select a user</em>
                        </MenuItem>
                        {users.map((user) => (
                          <MenuItem key={user.id} value={user.id}>
                            {user.displayName || user.email || user.id}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {/* Role Selection (only for role target) */}
                {targetType === 'role' && (
                  <Grid item xs={12}>
                    <FormControl fullWidth sx={styles.input}>
                      <InputLabel id="role-select-label">Select Role</InputLabel>
                      <Select
                        labelId="role-select-label"
                        id="role-select"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        label="Select Role"
                        sx={styles.select}
                      >
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="moderator">Moderator</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {/* Priority */}
                <Grid item xs={12}>
                  <FormControl fullWidth sx={styles.input}>
                    <InputLabel id="priority-select-label">Priority</InputLabel>
                    <Select
                      labelId="priority-select-label"
                      id="priority-select"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      label="Priority"
                      sx={styles.select}
                    >
                      <MenuItem value="normal">Normal</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Send Button */}
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleSendNotification}
                    disabled={loading}
                    sx={styles.button}
                    fullWidth
                  >
                    {loading ? 'Sending...' : 'Send Notification'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={styles.content}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: styles.paper.color }}>
                  Notification History
                </Typography>
                {notificationHistory.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteSweepIcon />}
                    onClick={() => setDeleteAllDialogOpen(true)}
                    size="small"
                  >
                    Delete All
                  </Button>
                )}
              </Box>
              
              {loadingHistory ? (
                <Typography>Loading history...</Typography>
              ) : notificationHistory.length === 0 ? (
                <Typography>No notifications sent yet.</Typography>
              ) : (
                <Grid container spacing={2}>
                  {notificationHistory.map((notification) => (
                    <Grid item xs={12} key={notification.id}>
                      <Paper
                        elevation={2}
                        sx={{
                          p: 2,
                          backgroundColor: darkMode ? '#333333' : '#f9f9f9',
                          color: darkMode ? '#FFFFFF' : '#000000'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {notification.title}
                          </Typography>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => {
                              setNotificationToDelete(notification);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="body2">
                          {notification.body}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                          <Chip
                            label={notification.type}
                            size="small"
                            sx={styles.gameChip}
                          />
                          <Typography variant="caption">
                            {notification.createdAt}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
              
              {/* Delete Single Notification Dialog */}
              <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
              >
                <DialogTitle>Delete Notification</DialogTitle>
                <DialogContent>
                  <DialogContentText>
                    Are you sure you want to delete this notification? This action cannot be undone.
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleDeleteNotification} color="error" autoFocus>
                    Delete
                  </Button>
                </DialogActions>
              </Dialog>
              
              {/* Delete All Notifications Dialog */}
              <Dialog
                open={deleteAllDialogOpen}
                onClose={() => setDeleteAllDialogOpen(false)}
              >
                <DialogTitle>Delete All Notifications</DialogTitle>
                <DialogContent>
                  <DialogContentText>
                    Are you sure you want to delete ALL notifications? This action cannot be undone.
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setDeleteAllDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleDeleteAllNotifications} color="error" autoFocus>
                    Delete All
                  </Button>
                </DialogActions>
              </Dialog>
            </Box>
          )}
        </Paper>
      </Container>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%', bgcolor: darkMode ? '#333333' : undefined, color: darkMode ? '#FFFFFF' : undefined }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomNotificationSender;
