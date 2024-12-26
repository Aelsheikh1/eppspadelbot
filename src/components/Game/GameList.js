import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Chip,
  Avatar,
  AvatarGroup,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  List,
  ListItem,
  ListItemAvatar,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  SportsBaseball as TennisIcon,
  Event as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Delete as DeleteIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  AccessTime,
} from '@mui/icons-material';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { format, formatDistanceToNow, parseISO, startOfDay, isAfter, differenceInHours, differenceInMinutes, differenceInDays, differenceInSeconds, differenceInMilliseconds } from 'date-fns';
import { db, joinGame, leaveGame } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import EditGame from './EditGame';
import { getPlayersData, clearPlayerCache } from '../../utils/playerUtils';
import { emailGameReport } from '../../utils/pdfGenerator';

const TimeUnit = ({ value, unit, color }) => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      mx: 0.5,
      minWidth: unit === 's' ? '40px' : '50px',
      bgcolor: color.bg,
      borderRadius: 1,
      p: 0.5,
      transition: 'all 0.3s ease'
    }}
  >
    <Typography 
      variant="body1" 
      color={color.text}
      sx={{ 
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fontSize: '1.2rem'
      }}
    >
      {value.toString().padStart(2, '0')}
    </Typography>
    <Typography 
      variant="caption" 
      color={color.text}
      sx={{ 
        textTransform: 'uppercase',
        fontSize: '0.7rem',
        opacity: 0.8
      }}
    >
      {unit}
    </Typography>
  </Box>
);

const CountdownTimer = ({ deadline, deadlineTime, gameId }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      // Check if timer just expired
      const isExpired = Object.values(newTimeLeft).every(value => value <= 0);
      if (isExpired && !hasExpired) {
        setHasExpired(true);
        handleGameExpired(gameId);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, deadlineTime, gameId, hasExpired]);

  function calculateTimeLeft() {
    try {
      const deadlineDate = parseISO(`${deadline}T${deadlineTime}`);
      const now = new Date();
      const difference = differenceInMilliseconds(deadlineDate, now);

      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    } catch (error) {
      console.error('Error calculating time left:', error);
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
      };
    }
  }

  const timeColors = Object.values(timeLeft).every(value => value <= 0)
    ? 'error.main'
    : timeLeft.hours <= 1
    ? 'warning.main'
    : 'text.secondary';

  if (Object.values(timeLeft).every(value => value <= 0)) {
    return null;
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          '& > *': {
            minWidth: 'auto'
          }
        }}
      >
        {timeLeft.days > 0 && (
          <TimeUnit value={timeLeft.days} unit="d" color={timeColors} />
        )}
        <TimeUnit value={timeLeft.hours} unit="h" color={timeColors} />
        <TimeUnit value={timeLeft.minutes} unit="m" color={timeColors} />
        <TimeUnit value={timeLeft.seconds} unit="s" color={timeColors} />
      </Box>
    </Box>
  );
};

const handleGameExpired = async (gameId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
      status: 'closed',
      isOpen: false,
      registrationOpen: false,
      closedAt: new Date().toISOString(),
      closedByTimer: true
    });

    // Send game report email
    await emailGameReport(gameId);
  } catch (error) {
    console.error('Error closing expired game:', error);
  }
};

export default function GameList() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expandedGame, setExpandedGame] = useState(null);
  const [playersData, setPlayersData] = useState({});
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    setError('');

    const gamesQuery = query(collection(db, 'games'));
    
    const unsubscribe = onSnapshot(gamesQuery, async (snapshot) => {
      try {
        const allPlayerIds = new Set();
        const gamesList = [];

        snapshot.forEach((doc) => {
          const gameData = doc.data();
          if (gameData.players) {
            gameData.players.forEach(id => allPlayerIds.add(id));
          }
          gamesList.push({
            id: doc.id,
            ...gameData
          });
        });

        // Fetch player data
        const playerData = await getPlayersData(Array.from(allPlayerIds), currentUser?.uid);
        setPlayersData(playerData);
        
        setGames(gamesList);
        setLoading(false);
        setError('');
      } catch (error) {
        console.error('Error fetching games:', error);
        setError('Failed to load games');
        setLoading(false);
      }
    }, (error) => {
      console.error('Error in games subscription:', error);
      setError('Failed to load games');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleJoinGame = async (gameId) => {
    try {
      const game = games.find(g => g.id === gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      if (isRegistrationClosed(game)) {
        throw new Error('Registration is closed for this game');
      }

      await joinGame(gameId, currentUser.uid);
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleLeaveGame = async (gameId) => {
    try {
      await leaveGame(gameId, currentUser.uid);
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleMenuOpen = (event, game) => {
    setAnchorEl(event.currentTarget);
    setSelectedGame(game);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditGame = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedGame(null);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedGame(null);
    setError('');
  };

  const handleDeleteGame = async () => {
    if (selectedGame && window.confirm('Are you sure you want to delete this game?')) {
      try {
        await deleteDoc(doc(db, 'games', selectedGame.id));
        setError('');
      } catch (err) {
        setError('Failed to delete game: ' + err.message);
      }
    }
    handleMenuClose();
  };

  const handleToggleGameStatus = async () => {
    if (selectedGame) {
      try {
        const isCurrentlyClosed = selectedGame.status === 'closed';
        const newStatus = isCurrentlyClosed ? 'open' : 'closed';
        await updateDoc(doc(db, 'games', selectedGame.id), {
          status: newStatus,
          isOpen: isCurrentlyClosed,
          registrationOpen: isCurrentlyClosed,
          ...(isCurrentlyClosed ? { closedAt: null } : { closedAt: new Date().toISOString() })
        });
        setError('');
      } catch (err) {
        setError('Failed to update game status: ' + err.message);
      }
    }
    handleMenuClose();
  };

  const getGameStatus = (game) => {
    if (game.status === 'closed' || !game.isOpen) {
      return { 
        label: 'Closed', 
        color: 'error',
        icon: <LockIcon fontSize="small" />
      };
    }
    if (isRegistrationClosed(game)) {
      return {
        label: 'Registration Closed',
        color: 'warning',
        icon: <LockIcon fontSize="small" />
      };
    }
    if (game.players?.length >= game.maxPlayers) {
      return { 
        label: 'Full', 
        color: 'warning',
        icon: <GroupIcon fontSize="small" />
      };
    }
    return { 
      label: 'Open', 
      color: 'success',
      icon: <LockOpenIcon fontSize="small" />
    };
  };

  const isRegistrationClosed = (game) => {
    try {
      // If game is explicitly closed or not open, registration is closed
      if (game.status === 'closed' || !game.isOpen || game.registrationOpen === false) {
        return true;
      }

      // Check deadline
      const deadlineDate = parseISO(`${game.deadline}T${game.deadlineTime}`);
      return isAfter(new Date(), deadlineDate);
    } catch (error) {
      console.error('Error checking registration status:', error);
      return true; // If there's an error, assume registration is closed
    }
  };

  const isUserInGame = (game) => {
    return game.players?.includes(currentUser.uid);
  };

  const handleExpandClick = (gameId) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  const renderPlayerName = (playerId) => {
    const playerData = playersData[playerId];
    if (!playerData) return 'Unknown Player';

    if (playerId === currentUser?.uid) return 'You';

    if (playerData.firstName && playerData.lastName) {
      return `${playerData.firstName} ${playerData.lastName}`;
    } else if (playerData.displayName) {
      return playerData.displayName;
    } else if (playerData.email) {
      return playerData.email.split('@')[0];
    }
    
    return 'Unknown Player';
  };

  const renderPlayers = (game) => {
    if (!game.players || !Array.isArray(game.players)) return 'No players yet';
    return game.players.map(playerId => renderPlayerName(playerId)).join(', ');
  };

  const getPlayerColor = (playerId) => {
    // Predefined vibrant colors that work well together
    const colors = [
      { bg: '#e3f2fd', text: '#1976d2' }, // Blue
      { bg: '#f3e5f5', text: '#9c27b0' }, // Purple
      { bg: '#e8f5e9', text: '#2e7d32' }, // Green
      { bg: '#fff3e0', text: '#ef6c00' }, // Orange
      { bg: '#fce4ec', text: '#d81b60' }, // Pink
      { bg: '#e1f5fe', text: '#0288d1' }, // Light Blue
      { bg: '#f1f8e9', text: '#558b2f' }, // Light Green
      { bg: '#fff8e1', text: '#ff8f00' }, // Amber
      { bg: '#f3e5f5', text: '#7b1fa2' }, // Deep Purple
      { bg: '#e0f2f1', text: '#00796b' }  // Teal
    ];
    
    // Use player ID to generate a consistent index
    const index = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const formatDeadline = (game) => {
    try {
      // If game is closed, don't show registration time message
      if (game.status === 'closed' || !game.isOpen) {
        return '';
      }

      const deadlineDate = parseISO(`${game.deadline}T${game.deadlineTime}`);
      const now = new Date();
      
      if (isAfter(now, deadlineDate)) {
        return 'Registration is closed';
      }

      // Calculate time remaining
      const hours = differenceInHours(deadlineDate, now);
      const minutes = differenceInMinutes(deadlineDate, now) % 60;
      const days = differenceInDays(deadlineDate, now);

      // Format remaining time in a nice way
      if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} left to register`;
      } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''} left to register`;
      } else if (minutes > 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''} left to register`;
      } else {
        return 'Less than a minute left to register';
      }
    } catch (error) {
      console.error('Error formatting deadline:', error);
      return '';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Games
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/create-game')}
          >
            Create Game
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {games.map(game => {
          const status = getGameStatus(game);
          const gameDateTime = parseISO(`${game.date}T${game.time}`);
          const timeToGame = formatDistanceToNow(gameDateTime, { addSuffix: true });
          const userInGame = isUserInGame(game);
          const isExpanded = expandedGame === game.id;

          return (
            <Grid item xs={12} sm={6} md={4} key={game.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 6,
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TennisIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                      Padel Game
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {(game.status === 'closed' || !game.isOpen) ? (
                        <Chip
                          label="Closed"
                          color="error"
                          size="small"
                          icon={<LockIcon />}
                          sx={{ 
                            fontWeight: 'medium',
                            '& .MuiChip-icon': { fontSize: 16 }
                          }}
                        />
                      ) : (
                        <CountdownTimer deadline={game.deadline} deadlineTime={game.deadlineTime} gameId={game.id} />
                      )}
                    </Box>
                    {isAdmin && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, game)}
                        sx={{ ml: 1 }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {format(gameDateTime, 'EEEE, MMMM d, yyyy')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TimeIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {game.time} ({timeToGame})
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2">{game.location}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <AccessTime sx={{ mr: 1, fontSize: 20, color: isRegistrationClosed(game) ? 'error.main' : 'text.secondary' }} />
                      <Typography 
                        variant="body2" 
                        color={isRegistrationClosed(game) ? 'error.main' : 'text.secondary'}
                      >
                        {formatDeadline(game)}
                      </Typography>
                    </Box>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 }
                      }}
                      onClick={() => handleExpandClick(game.id)}
                    >
                      <GroupIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {renderPlayers(game)} ({game.players?.length || 0}/{game.maxPlayers})
                      </Typography>
                      <IconButton 
                        size="small"
                        sx={{ ml: 1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpandClick(game.id);
                        }}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </Box>

                  <Collapse in={isExpanded}>
                    <List sx={{ pt: 0 }}>
                      {game.players?.map((playerId, index) => {
                        const player = playersData[playerId] || {};
                        const color = getPlayerColor(playerId);
                        const isCurrentUser = playerId === currentUser?.uid;
                        
                        return (
                          <ListItem key={`${game.id}-player-${playerId}-${index}`} sx={{ px: 0 }}>
                            <ListItemAvatar>
                              <Avatar 
                                sx={{ 
                                  bgcolor: isCurrentUser ? 'primary.main' : color.text,
                                  color: '#fff'
                                }}
                              >
                                {renderPlayerName(playerId).substring(0, 2).toUpperCase()}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText 
                              primary={
                                <Typography
                                  sx={{
                                    display: 'inline',
                                    bgcolor: isCurrentUser ? 'primary.light' : color.bg,
                                    color: isCurrentUser ? 'primary.main' : color.text,
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    fontWeight: 'medium'
                                  }}
                                >
                                  {renderPlayerName(playerId)}
                                </Typography>
                              }
                              secondary={isCurrentUser ? 'You' : ''}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>

                  {!isExpanded && game.players?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <AvatarGroup max={4} sx={{ justifyContent: 'flex-start' }}>
                        {game.players?.map((playerId, index) => {
                          const player = playersData[playerId] || {};
                          const color = getPlayerColor(playerId);
                          const isCurrentUser = playerId === currentUser?.uid;
                          
                          return (
                            <Tooltip 
                              key={`${game.id}-avatar-${playerId}-${index}`}
                              title={renderPlayerName(playerId)}
                              placement="top"
                            >
                              <Avatar 
                                sx={{ 
                                  bgcolor: isCurrentUser ? 'primary.main' : color.text,
                                  color: '#fff',
                                  width: 32,
                                  height: 32,
                                  fontSize: '0.875rem'
                                }}
                              >
                                {renderPlayerName(playerId).substring(0, 2).toUpperCase()}
                              </Avatar>
                            </Tooltip>
                          );
                        })}
                      </AvatarGroup>
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant={isUserInGame(game) ? "outlined" : "contained"}
                    color="primary"
                    onClick={() => isUserInGame(game) ? handleLeaveGame(game.id) : handleJoinGame(game.id)}
                    disabled={isRegistrationClosed(game) || game.players?.length >= game.maxPlayers}
                    fullWidth
                  >
                    {isUserInGame(game) ? 'Leave Game' : 'Join Game'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
        {games.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body1" color="text.secondary" align="center">
              No upcoming games available
            </Typography>
          </Grid>
        )}
      </Grid>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEditGame}>
          <ListItemIcon>
            <EditIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary="Edit Game" secondary="Modify game details" />
        </MenuItem>
        <MenuItem onClick={handleToggleGameStatus}>
          <ListItemIcon>
            {selectedGame?.status === 'closed' ? (
              <LockOpenIcon fontSize="small" color="success" />
            ) : (
              <LockIcon fontSize="small" color="warning" />
            )}
          </ListItemIcon>
          <ListItemText 
            primary={selectedGame?.status === 'closed' ? 'Reopen Game' : 'Close Game'}
            secondary={selectedGame?.status === 'closed' ? 'Allow players to join' : 'Prevent new joins'}
          />
        </MenuItem>
        <MenuItem onClick={handleDeleteGame}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText 
            primary="Delete Game" 
            secondary="Permanently remove game"
            sx={{ color: 'error.main' }}
          />
        </MenuItem>
      </Menu>

      {selectedGame && editDialogOpen && (
        <EditGame
          open={editDialogOpen}
          game={selectedGame}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
          clearPlayerCache={clearPlayerCache}
          getPlayersData={getPlayersData}
        />
      )}
    </Box>
  );
}
