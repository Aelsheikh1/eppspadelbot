import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, joinGame, leaveGame } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { checkAdminStatus, distributePlayersRandomly, toggleGameStatus } from '../../utils/adminUtils';
import { emailGameReport } from '../../utils/pdfGenerator';
import { getUserColor } from '../../utils/colorUtils';
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
  useTheme
} from '@mui/material';
import {
  Email as EmailIcon,
  Group as GroupIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
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
const PlayersList = ({ players, pairs, currentUser, onJoinLeave, loading, isOpen }) => {
  const theme = useTheme();
  const [playerDetails, setPlayerDetails] = useState({});

  // Fetch player details
  useEffect(() => {
    const fetchPlayerDetails = async () => {
      const details = {};
      for (const player of (players || [])) {
        if (!player) continue;
        
        // Get the player ID whether it's a string or object
        const playerId = typeof player === 'string' ? player : player.id;
        if (!playerId) continue;

        try {
          const playerRef = doc(db, 'users', playerId);
          const playerDoc = await getDoc(playerRef);
          if (playerDoc.exists()) {
            details[playerId] = {
              id: playerId,
              ...playerDoc.data()
            };
          }
        } catch (error) {
          console.error('Error fetching player details:', error);
        }
      }
      setPlayerDetails(details);
    };

    if (players?.length > 0) {
      fetchPlayerDetails();
    }
  }, [players]);

  const getPlayerName = (playerId) => {
    if (!playerId) return 'Unknown Player';
    const details = playerDetails[playerId];
    return details?.name || details?.email || 'Loading...';
  };

  const getPlayerEmail = (playerId) => {
    if (!playerId) return '';
    const details = playerDetails[playerId];
    return details?.email && details.email !== getPlayerName(playerId) ? details.email : '';
  };

  // Get player ID whether it's a string or object
  const getPlayerId = (player) => {
    return typeof player === 'string' ? player : player?.id;
  };

  const isPlayerInGame = players?.some(player => getPlayerId(player) === currentUser?.uid);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon /> Players ({players?.length || 0})
          </Typography>
          <Button
            variant="contained"
            color={isPlayerInGame ? "error" : "primary"}
            onClick={onJoinLeave}
            disabled={loading || !currentUser || !isOpen}
            size="small"
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

        {/* All Players List */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ color: theme.palette.text.secondary }}>
            All Players
          </Typography>
          <List>
            {players?.map((player, index) => {
              const playerId = getPlayerId(player);
              const playerColor = getUserColor(playerId || 'default');
              return (
                <ListItem
                  key={playerId || index}
                  divider={index !== (players?.length || 0) - 1}
                  sx={{
                    backgroundColor: playerColor,
                    borderRadius: 1,
                    mb: 1,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateX(8px)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ color: theme.palette.common.black }} />
                        <Typography variant="body1" sx={{ fontWeight: 500, color: theme.palette.common.black }}>
                          {getPlayerName(playerId)}
                          {playerId === currentUser?.uid && ' (You)'}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.7)' }}>
                        {getPlayerEmail(playerId)}
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* Teams Distribution (if available) */}
        {pairs && pairs.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ color: theme.palette.text.secondary }}>
              Distributed Teams
            </Typography>
            <List>
              {pairs.map((pair, index) => {
                const player1Id = getPlayerId(pair?.player1);
                const player2Id = getPlayerId(pair?.player2);
                const player1Color = getUserColor(player1Id || 'default');
                const player2Color = getUserColor(player2Id || 'default');
                
                return (
                  <ListItem
                    key={index}
                    sx={{
                      bgcolor: theme.palette.background.paper,
                      borderRadius: 1,
                      mb: 1,
                      border: `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography 
                            variant="caption"
                            sx={{
                              bgcolor: theme.palette.primary.main,
                              color: 'white',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              minWidth: 60,
                              textAlign: 'center'
                            }}
                          >
                            Team {index + 1}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ 
                              backgroundColor: player1Color,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              color: theme.palette.common.black
                            }}>
                              {getPlayerName(player1Id)}
                            </Typography>
                            {player2Id && (
                              <>
                                <Typography>&</Typography>
                                <Typography sx={{ 
                                  backgroundColor: player2Color,
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  color: theme.palette.common.black
                                }}>
                                  {getPlayerName(player2Id)}
                                </Typography>
                              </>
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Component for admin actions
const AdminActions = ({ game, onDistribute, onToggleStatus, onEmail, loading }) => {
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });

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

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Admin Actions</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={() => setConfirmDialog({ open: true, action: 'distribute' })}
              disabled={game.isOpen || loading}
              fullWidth
            >
              Distribute Teams
            </Button>
            <Button
              variant="contained"
              color={game.isOpen ? "error" : "success"}
              startIcon={game.isOpen ? <LockIcon /> : <LockOpenIcon />}
              onClick={() => setConfirmDialog({ open: true, action: 'toggle' })}
              disabled={loading}
              fullWidth
            >
              {game.isOpen ? 'Close Game' : 'Reopen Game'}
            </Button>
            <Button
              variant="contained"
              color="info"
              startIcon={<EmailIcon />}
              onClick={() => setConfirmDialog({ open: true, action: 'email' })}
              disabled={loading}
              fullWidth
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
           game.isOpen ? 'Close Game' : 'Reopen Game'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.action === 'distribute' 
              ? 'This will randomly distribute all players into teams.'
              : confirmDialog.action === 'email'
              ? 'This will send an email report to all players.'
              : game.isOpen 
                ? 'This will close the game and send an email to all players.'
                : 'This will reopen the game for new players to join.'}
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
    </>
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
      await emailGameReport(id);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to send email');
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
          />
        </Grid>
        {isAdmin && (
          <Grid item xs={12} md={4}>
            <AdminActions 
              game={game}
              onDistribute={handleDistribute}
              onToggleStatus={handleToggleStatus}
              onEmail={handleEmail}
              loading={loading}
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default GameDetail;
