import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db, joinGame, leaveGame } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { checkAdminStatus, distributePlayersRandomly, toggleGameStatus, addPlayerToGame } from '../../utils/adminUtils';
import { emailGameReport } from '../../utils/pdfGenerator';
import { getUserColor } from '../../utils/colorUtils';
import { getPlayersData, cleanupUserListeners } from '../../utils/playerUtils';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  useTheme,
  TextField,
  Alert,
  Autocomplete
} from '@mui/material';
import {
  Email as EmailIcon,
  PersonAdd as PersonAddIcon,
  Groups as GroupsIcon,
  LockOpen as LockOpenIcon,
  Lock as LockIcon,
  Shuffle as ShuffleIcon,
  Group as GroupIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';

// Component for game header information
const GameHeader = ({ game, timeUntilGame }) => {
  const theme = useTheme();
  
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1" gutterBottom>
              {game.location}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarIcon color="primary" />
                <Typography>
                  {format(new Date(game.date), 'MMMM do, yyyy')}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <TimerIcon color="primary" />
                <Typography>
                  {game.time} ({timeUntilGame})
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <LocationIcon color="primary" />
                <Typography>
                  {game.location}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: { md: 'flex-end' } }}>
              <Typography 
                variant="subtitle1" 
                sx={{
                  bgcolor: game.isOpen ? theme.palette.success.main : theme.palette.error.main,
                  color: 'white',
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                {game.isOpen ? <LockOpenIcon /> : <LockIcon />}
                {game.isOpen ? 'Open' : 'Closed'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// Component for player list
const PlayersList = ({ players, pairs, currentUser, onJoinLeave, loading, isOpen, playersData }) => {
  const theme = useTheme();

  const getPlayerName = (playerId) => {
    const playerData = playersData[playerId];
    if (!playerData) return 'Loading...';

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

  const getPlayerColor = (playerId) => {
    if (playerId === currentUser?.uid) return theme.palette.primary.main;
    const playerData = playersData[playerId];
    if (!playerData) return theme.palette.grey[300];
    return playerData.color || getUserColor(playerId);
  };

  const isPlayerInGame = players?.includes(currentUser?.uid);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupsIcon /> Players ({players?.length || 0})
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={onJoinLeave}
            disabled={loading || !currentUser || !isOpen}
            size="small"
            startIcon={isPlayerInGame ? <PersonIcon /> : <PersonAddIcon />}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : isPlayerInGame ? (
              'Leave Game'
            ) : (
              'Join Game'
            )}
          </Button>
        </Box>

        {pairs ? (
          // Teams view
          <Grid container spacing={2}>
            {pairs.map((pair, index) => (
              <Grid item xs={12} key={index}>
                <Paper 
                  elevation={3}
                  sx={{
                    p: 2,
                    backgroundColor: theme.palette.background.default,
                    borderLeft: `4px solid ${theme.palette.primary.main}`
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    Team {index + 1}
                  </Typography>
                  <List dense>
                    {[pair.player1?.id, pair.player2?.id].filter(Boolean).map((playerId) => (
                      <ListItem key={playerId}>
                        <ListItemText 
                          primary={getPlayerName(playerId)}
                          sx={{
                            '& .MuiListItemText-primary': {
                              color: getPlayerColor(playerId),
                              fontWeight: playerId === currentUser?.uid ? 600 : 400
                            }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          // Regular players list
          <List dense>
            {players?.map((playerId) => (
              <ListItem key={playerId}>
                <ListItemText 
                  primary={getPlayerName(playerId)}
                  sx={{
                    '& .MuiListItemText-primary': {
                      color: getPlayerColor(playerId),
                      fontWeight: playerId === currentUser?.uid ? 600 : 400
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

// Component for admin actions
const AdminActions = ({ game, onDistribute, onToggleStatus, onEmail, loading, onAddPlayer }) => {
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);

  const handleAction = async () => {
    try {
      switch (confirmDialog.action) {
        case 'distribute':
          await onDistribute();
          toast.success('Teams distributed successfully! 🎾', {
            style: {
              background: '#4caf50',
              color: '#fff',
              borderRadius: '8px',
              padding: '16px',
            },
            icon: '🎯'
          });
          break;
        case 'toggle':
          await onToggleStatus();
          break;
        case 'email':
          await onEmail();
          toast.success('Game report sent to all players! 📧', {
            style: {
              background: '#1a73e8',
              color: '#fff',
              borderRadius: '8px',
              padding: '16px',
            },
            icon: '✉️'
          });
          break;
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setConfirmDialog({ open: false, action: null });
    }
  };

  const handleAddPlayer = async (playerId) => {
    try {
      await onAddPlayer(playerId);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Admin Actions</Typography>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2,
            '& .MuiButton-root': {  
              height: '48px',        
              width: '100%',         
              fontSize: '1rem',      
              fontWeight: 500,       
              textTransform: 'none',
              justifyContent: 'flex-start',  // Align text and icon to the left
              paddingLeft: '20px'            // Add some padding on the left
            }
          }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setAddPlayerDialogOpen(true)}
              startIcon={<PersonAddIcon />}
              sx={{
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2 30%, #00B4D8 90%)',
                  boxShadow: '0 4px 6px 2px rgba(33, 203, 243, .4)',
                }
              }}
            >
              Add Player
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setConfirmDialog({ open: true, action: 'distribute' })}
              disabled={loading || !game.players || game.players.length < 2}
              startIcon={<ShuffleIcon />}
            >
              Distribute Players
            </Button>
            <Button
              variant="contained"
              color={game.status === 'closed' ? 'success' : 'error'}
              onClick={() => setConfirmDialog({ open: true, action: 'toggle' })}
              disabled={loading}
              startIcon={game.status === 'closed' ? <LockOpenIcon /> : <LockIcon />}
            >
              {game.status === 'closed' ? 'Open Registration' : 'Close Registration'}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={onEmail}
              disabled={loading}
              startIcon={<EmailIcon />}
            >
              Send Email
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null })}>
        <DialogTitle>
          {confirmDialog.action === 'distribute' ? 'Distribute Teams' : 
           confirmDialog.action === 'email' ? 'Send Email Report' :
           game.status === 'closed' ? 'Open Registration' : 'Close Registration'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.action === 'distribute' 
              ? 'This will randomly distribute all players into teams.'
              : confirmDialog.action === 'email'
              ? 'This will send an email report to all players.'
              : game.status === 'closed' 
                ? 'This will open the game for new players to join.'
                : 'This will close the game and send an email to all players.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null })} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAction} color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <AddPlayerDialog
        open={addPlayerDialogOpen}
        onClose={() => setAddPlayerDialogOpen(false)}
        onAddPlayer={handleAddPlayer}
        loading={loading}
        currentPlayers={game?.players || []}
      />
    </>
  );
};

const AddPlayerDialog = ({ open, onClose, onAddPlayer, loading, currentPlayers }) => {
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [allPlayers, setAllPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoadingPlayers(true);
      try {
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        const playersData = [];
        
        for (const doc of usersSnap.docs) {
          const playerData = doc.data();
          // Only add players who aren't already in the game
          if (!currentPlayers?.includes(doc.id)) {
            playersData.push({
              id: doc.id,
              name: playerData.firstName && playerData.lastName 
                ? `${playerData.firstName} ${playerData.lastName}`
                : playerData.displayName || playerData.email?.split('@')[0] || 'Unknown Player',
              email: playerData.email
            });
          }
        }
        
        setAllPlayers(playersData);
      } catch (error) {
        console.error('Error fetching players:', error);
      } finally {
        setLoadingPlayers(false);
      }
    };

    if (open) {
      fetchPlayers();
    }
  }, [open, currentPlayers]);

  const handleClose = () => {
    setSelectedPlayer('');
    setSearchQuery('');
    onClose();
  };

  const handleSubmit = async () => {
    if (selectedPlayer) {
      await onAddPlayer(selectedPlayer);
      handleClose();
    }
  };

  const filteredPlayers = allPlayers.filter(player => 
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Player to Game</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Search Players"
          type="text"
          fullWidth
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
        />
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {loadingPlayers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          ) : filteredPlayers.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ p: 2 }}>
              No players found
            </Typography>
          ) : (
            filteredPlayers.map((player) => (
              <ListItem
                key={player.id}
                button
                selected={selectedPlayer === player.id}
                onClick={() => setSelectedPlayer(player.id)}
              >
                <ListItemText
                  primary={player.name}
                  secondary={player.email}
                />
              </ListItem>
            ))
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!selectedPlayer || loading}
          variant="contained"
        >
          {loading ? <CircularProgress size={24} /> : 'Add Player'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main GameDetail component
const GameDetail = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [timeUntilGame, setTimeUntilGame] = useState('');
  const [playersData, setPlayersData] = useState({});

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (currentUser) {
        const adminStatus = await checkAdminStatus(currentUser.uid);
        setIsAdmin(adminStatus);
      }
    };
    checkAdmin();
  }, [currentUser]);

  // Update time every minute
  useEffect(() => {
    if (!game?.date || !game?.time) return;

    const updateTime = () => {
      const gameDateTime = new Date(`${game.date}T${game.time}`);
      const now = new Date();
      if (gameDateTime > now) {
        setTimeUntilGame(formatDistanceToNow(gameDateTime, { addSuffix: true }));
      } else {
        setTimeUntilGame('Game has started');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [game?.date, game?.time]);

  // Subscribe to game updates
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'games', id), (doc) => {
      if (doc.exists()) {
        const gameData = { id: doc.id, ...doc.data() };
        console.log('Game data updated:', gameData);
        setGame(gameData);
      } else {
        setError('Game not found');
      }
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    // Cleanup function for user listeners
    return () => {
      cleanupUserListeners();
    };
  }, []);

  useEffect(() => {
    if (game?.players) {
      // Get fresh player data for all players in the game
      const loadPlayers = async () => {
        try {
          const playersData = await getPlayersData(game.players, currentUser?.uid);
          setPlayersData(playersData);
        } catch (error) {
          console.error('Error loading players:', error);
          setError('Failed to load player details');
        }
      };
      loadPlayers();
    }
  }, [game?.players, currentUser?.uid]);

  const handleJoinLeave = async () => {
    if (!currentUser || !game) return;
    
    setLoading(true);
    setError('');
    
    try {
      const isPlayerInGame = game.players?.some(player => (player.id || player) === currentUser?.uid);
      if (isPlayerInGame) {
        await leaveGame(id, currentUser.uid);
      } else {
        await joinGame(id, currentUser.uid);
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to join/leave game');
    } finally {
      setLoading(false);
    }
  };

  const handleDistribute = async () => {
    setLoading(true);
    try {
      await distributePlayersRandomly(id);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to distribute teams');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setLoading(true);
    try {
      await toggleGameStatus(id);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to toggle game status');
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    setLoading(true);
    try {
      const response = await emailGameReport(id);
      if (response.status === 200) {
        toast.success('Game report sent successfully! 📧', {
          style: {
            background: '#1a73e8',
            color: '#fff',
            borderRadius: '8px',
            padding: '16px',
          },
          icon: '✉️'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to send email', {
        style: {
          background: '#f44336',
          color: '#fff',
          borderRadius: '8px',
          padding: '16px',
        },
        icon: '❌'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (playerId) => {
    try {
      setLoading(true);
      await addPlayerToGame(id, playerId);
      // Refresh game data
      const updatedGame = await getDoc(doc(db, 'games', id));
      setGame({ id: updatedGame.id, ...updatedGame.data() });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!game) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="calc(100vh - 64px)">
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      
      <GameHeader game={game} timeUntilGame={timeUntilGame} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <PlayersList 
            players={game.players} 
            pairs={game.pairs}
            currentUser={currentUser}
            onJoinLeave={handleJoinLeave}
            loading={loading}
            isOpen={game.isOpen}
            playersData={playersData}
          />
        </Grid>
        {isAdmin && (
          <Grid item xs={12} md={4}>
            <AdminActions 
              game={game}
              onDistribute={handleDistribute}
              onToggleStatus={handleToggleStatus}
              onEmail={handleEmail}
              onAddPlayer={handleAddPlayer}
              loading={loading}
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default GameDetail;
