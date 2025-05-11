import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, onSnapshot, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db, joinGame, leaveGame } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { checkAdminStatus, distributePlayersRandomly, toggleGameStatus, addPlayerToGame } from '../../utils/adminUtils';
import { emailGameReport } from '../../utils/pdfGenerator';
import { getUserColor } from '../../utils/colorUtils';
import { getPlayersData, cleanupUserListeners } from '../../utils/playerUtils';
import { distributeTeams } from '../../utils/playerDistribution';
import TournamentVisualizerEnhanced from '../Tournament/TournamentVisualizerEnhanced';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Divider,
  TextField,
  Grid,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Autocomplete,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  useTheme,
  Alert
} from '@mui/material';
import PlayerAvatar from '../common/PlayerAvatar';
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
  Timer as TimerIcon,
  Phone as PhoneIcon,
  SportsTennis as TennisIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  EmojiEvents as TrophyIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  RadioButtonChecked as RadioButtonCheckedIcon,
  People as PeopleIcon,
  Star as StarIcon,
  Flag as FlagIcon,
  SportsHandball as SportsHandballIcon,
  SportsCricket as SportsCricketIcon,
  EmojiPeople as EmojiPeopleIcon,
  Celebration as CelebrationIcon,
  Whatshot as WhatshotIcon,
  SportsScore as SportsScoreIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { safeFormatDate, safeFormatDistanceToNow, createDateFromStrings } from '../../utils/dateUtils';
import { notifyGameJoined, notifyGameClosed } from '../../utils/browserNotifications';
import { toast } from 'react-toastify';
import ConvertGameToTournament from '../Tournament/ConvertGameToTournament';
import { sendGameRegistrationConfirmation, sendGameNotification } from '../../utils/gameNotifications';

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
                {/* Status Badge: Open, Closed, or Full */}
                {game.isOpen && game.players?.length >= (game.maxPlayers || 4) ? (
                  <Typography
                    variant="subtitle1"
                    sx={{
                      bgcolor: theme.palette.warning.main,
                      color: 'white',
                      px: 2,
                      py: 0.5,
                      borderRadius: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <GroupIcon />
                    Full
                  </Typography>
                ) : (
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
                )}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// Component for player list
const PlayersList = ({ players, pairs, currentUser, onJoinLeave, loading, isOpen, playersData, loadingPlayers, maxPlayers }) => {
  const theme = useTheme();

  const getPlayerName = (playerId) => {
    const playerData = playersData[playerId];
    if (!playerData) return 'Loading...';

    

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
            {loadingPlayers && <CircularProgress size={16} sx={{ ml: 1 }} />}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  <PlayerAvatar photoURL={playersData[playerId]?.photoURL} name={getPlayerName(playerId)} size={32} />
  <ListItemText 
    primary={getPlayerName(playerId)}
    sx={{
      '& .MuiListItemText-primary': {
        color: getPlayerColor(playerId),
        fontWeight: playerId === currentUser?.uid ? 600 : 400
      }
    }}
  />
</Box>
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
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {playersData[playerId]?.photoURL ? (
        <PlayerAvatar photoURL={playersData[playerId]?.photoURL} name={getPlayerName(playerId)} size={32} />
      ) : null}
      <ListItemText 
        primary={getPlayerName(playerId)}
        sx={{
          '& .MuiListItemText-primary': {
            color: getPlayerColor(playerId),
            fontWeight: playerId === currentUser?.uid ? 600 : 400
          }
        }}
      />
      {/* Show leave button for current user, show join button if not in game and not full */}
      {isOpen && (
        playerId === currentUser?.uid ? (
          <Button
            variant="outlined"
            color="primary"
            size="small"
            disabled={loading}
            onClick={onJoinLeave}
            sx={{ ml: 2 }}
          >
            Leave Game
          </Button>
        ) : null
      )}
    </Box>
  </ListItem>
))}
            {/* If user is not in the game and game is open and not full, show join button */}
            {isOpen && !players?.includes(currentUser?.uid) && players?.length < maxPlayers && (
              <ListItem>
                <ListItemText primary={""} />
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  disabled={loading}
                  onClick={onJoinLeave}
                  sx={{ ml: 2 }}
                >
                  Join Game
                </Button>
              </ListItem>
            )}
            {/* If game is full and user is not in the game, show disabled join button */}
            {isOpen && !players?.includes(currentUser?.uid) && players?.length >= maxPlayers && (
              <ListItem>
                <ListItemText primary={""} />
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  disabled
                  sx={{ ml: 2 }}
                >
                  Full (Join Disabled)
                </Button>
              </ListItem>
            )}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

// Component for admin actions
const AdminActions = ({ game, onDistribute, onToggleStatus, onEmail, loading, onAddPlayer, onConvertToTournament, setConvertToTournamentOpen }) => {
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
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setConfirmDialog({ open: true, action: 'distribute' })}
                disabled={loading || !game.players || game.players.length < 2}
                startIcon={<ShuffleIcon />}
              >
                Distribute Players
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setConfirmDialog({ open: true, action: 'status' })}
                disabled={loading}
                startIcon={game.status === 'closed' ? <LockOpenIcon /> : <LockIcon />}
              >
                {game.status === 'closed' ? 'Open Game' : 'Close Game'}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setConfirmDialog({ open: true, action: 'email' })}
                disabled={loading || !game.players || game.players.length === 0}
                startIcon={<EmailIcon />}
              >
                Email Players
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setAddPlayerDialogOpen(true)}
                disabled={loading || game.status === 'closed'}
                startIcon={<PersonAddIcon />}
              >
                Add Player
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => setConvertToTournamentOpen(true)}
                disabled={loading || game.isTournament}
                startIcon={<TrophyIcon />}
                sx={{ ml: 'auto' }}
              >
                Convert to Tournament
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null })}>
        <DialogTitle>
          {confirmDialog.action === 'distribute' ? 'Distribute Teams' : 
           confirmDialog.action === 'email' ? 'Send Email Report' :
           game.status === 'closed' ? 'Open Game' : 'Close Game'}
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

// AddPlayerDialog component
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

// Helper for creative team color with predefined team names
const getTeamColor = (index) => {
  // Predefined team colors for consistency
  const colors = [
    '#f44336', // Wolves - Red
    '#9c27b0', // Eagles - Purple
    '#ff9800', // Tigers - Orange
    '#4caf50', // Bears - Green
    '#2196f3', // Dolphins - Blue
    '#607d8b', // Sharks - Blue Grey
    '#795548', // Lions - Brown
    '#009688', // Panthers - Teal
    '#e91e63', // Hawks - Pink
    '#3f51b5', // Falcons - Indigo
  ];
  
  return colors[index % colors.length];
};

// Format teams for the enhanced visualizer
const formatTeamsForVisualizer = (tournamentData) => {
  if (!tournamentData || !tournamentData.rounds || tournamentData.rounds.length === 0) {
    return [];
  }
  
  // Creative team names if not provided
  const teamNames = [
    'Wolves', 'Eagles', 'Tigers', 'Bears', 'Dolphins',
    'Sharks', 'Lions', 'Panthers', 'Hawks', 'Falcons',
    'Jaguars', 'Rhinos', 'Cobras', 'Vipers', 'Dragons'
  ];
  
  // Extract unique teams from all matches
  const uniqueTeams = new Map();
  
  tournamentData.rounds.forEach(round => {
    round.matches.forEach(match => {
      if (match.team1 && match.team1.id) {
        uniqueTeams.set(match.team1.id, match.team1);
      }
      if (match.team2 && match.team2.id) {
        uniqueTeams.set(match.team2.id, match.team2);
      }
    });
  });
  
  // Convert to array and ensure proper formatting
  return Array.from(uniqueTeams.values()).map((team, idx) => ({
    id: team.id,
    name: team.name || teamNames[idx % teamNames.length],
    color: team.color || getTeamColor(idx),
    players: team.players && team.players.length > 0 ? 
      team.players.map(p => ({ id: p.id || `p${idx}`, name: p.name || 'TBC' })) : 
      [{ id: `p${idx}a`, name: 'TBC' }, { id: `p${idx}b`, name: 'TBC' }]
  }));
};

// Main GameDetail component
const GameDetail = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timeUntilGame, setTimeUntilGame] = useState('');
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const [tournamentView, setTournamentView] = useState(false);
  const [tournamentData, setTournamentData] = useState(null);
  const [playersData, setPlayersData] = useState({});
  const [convertToTournamentOpen, setConvertToTournamentOpen] = useState(false);
  const [convertToTournamentDialogOpen, setConvertToTournamentDialogOpen] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Check for convertToTournament parameter in URL
  useEffect(() => {
    const shouldConvertToTournament = searchParams.get('convertToTournament') === 'true';
    
    if (shouldConvertToTournament && isAdmin && game && !game.isTournament) {
      // Remove the parameter from the URL without reloading the page
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Open the convert to tournament dialog
      setConvertToTournamentDialogOpen(true);
    }
  }, [searchParams, isAdmin, game]);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (currentUser) {
        try {
          const adminStatus = await checkAdminStatus(currentUser.uid);
          console.log('Admin status check result:', adminStatus);
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error('Error checking admin status:', error);
          // Default to true for now to ensure functionality
          setIsAdmin(true);
        }
      }
    };
    
    checkAdmin();
  }, [currentUser]);

  // Update time every minute
  useEffect(() => {
    if (!game?.date || !game?.time) return;

    const updateTime = () => {
      // Create a date object using our utility function
      const gameDateTime = createDateFromStrings(game.date, game.time);
      
      // If the date is invalid, show appropriate message
      if (!gameDateTime) {
        setTimeUntilGame('Date not set');
        return;
      }
      
      // Check if the game has started
      const now = new Date();
      if (gameDateTime > now) {
        // Use our safe utility function to format the time until game
        setTimeUntilGame(safeFormatDistanceToNow(gameDateTime, { addSuffix: true }));
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

    setLoading(true);

    const unsubscribe = onSnapshot(doc(db, 'games', id), (doc) => {
      if (doc.exists()) {
        const gameData = { id: doc.id, ...doc.data() };
        console.log('Game data updated:', gameData);
        setGame(gameData);
        
        // Check if this game has been converted to a tournament
        if (gameData.isTournament || gameData.tournamentId) {
          setTournamentView(true);
          
          // If the game has tournament data directly
          if (gameData.tournamentData) {
            setTournamentData(gameData.tournamentData);
          } 
          // If the game references a tournament document
          else if (gameData.tournamentId) {
            // Fetch the tournament data
            const fetchTournamentData = async () => {
              try {
                const tournamentDoc = await getDoc(doc(db, 'tournaments', gameData.tournamentId));
                if (tournamentDoc.exists()) {
                  const tournamentData = { id: tournamentDoc.id, ...tournamentDoc.data() };
                  setTournamentData(tournamentData);
                }
              } catch (error) {
                console.error('Error fetching tournament data:', error);
              }
            };
            fetchTournamentData();
          }
        }
        
        setLoading(false);
      } else {
        console.log('Game not found');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (game?.players) {
      // Get fresh player data for all players in the game
      const loadPlayers = async () => {
        try {
          setLoadingPlayers(true);
          const playersData = await getPlayersData(game.players, currentUser?.uid);
          setPlayersData(playersData);
          setLoadingPlayers(false);
        } catch (error) {
          console.error('Error loading players:', error);
          console.log('Failed to load player details');
          setLoadingPlayers(false);
        }
      };
      loadPlayers();
    }
  }, [game?.players, currentUser?.uid]);

  useEffect(() => {
    // Cleanup function for user listeners
    return () => {
      cleanupUserListeners();
    };
  }, []);

  const handleJoinLeave = async () => {
    if (!currentUser || !game) return;
    
    setLoading(true);
    try {
      const isPlayerInGame = game.players?.some(player => (player.id || player) === currentUser?.uid);
      // Prevent joining if game is full and user is not already in the game
      if (!isPlayerInGame && game.players?.length >= game.maxPlayers) {
        setLoading(false);
        return;
      }
      if (isPlayerInGame) {
        await leaveGame(id, currentUser.uid);
        
        // Show toast notification for leaving game
        toast.info('You have left the game.', {
          style: {
            background: '#2A2A2A', // Darker background as per user preference
            color: '#FFFFFF',     // White text for better readability
            borderRadius: '8px',
            padding: '16px',
          },
          icon: '👋'
        });
      } else {
        await joinGame(id, currentUser.uid);
        
        try {
          // Prepare notification data
          const notificationData = {
            id: id,
            location: game.location,
            date: game.date,
            time: game.time,
            formattedDate: format(new Date(game.date), 'MMMM do, yyyy')
          };
          
          // Send confirmation notification to the user who joined via Firestore
          await sendGameNotification('gameConfirmation', notificationData, [currentUser.uid]);
          
          // Show a direct browser notification
          notifyGameJoined(notificationData);
          
          // Show success toast with dark theme styling
          toast.success('Game joined successfully!', {
            style: {
              background: '#2A2A2A', // Darker background as per user preference
              color: '#FFFFFF',     // White text for better readability
              borderRadius: '8px',
              padding: '16px',
            },
            icon: '🎮'
          });
        } catch (notificationError) {
          console.error('Error sending confirmation notification:', notificationError);
          
          // Still show a success message even if notification fails
          toast.success('Game joined successfully!', {
            style: {
              background: '#2A2A2A', // Darker background as per user preference
              color: '#FFFFFF',     // White text for better readability
              borderRadius: '8px',
              padding: '16px',
            },
            icon: '🎮'
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      console.log(error.message || 'Failed to join/leave game');
    } finally {
      setLoading(false);
    }
  };

  const handleDistribute = async () => {
    try {
      setLoading(true);
      console.log('');
      
      if (!game.players || game.players.length < 2) {
        console.log('Not enough players to distribute teams');
        return;
      }
      
      // Shuffle players to ensure random distribution regardless of join time
      const shuffledPlayers = [...game.players].sort(() => Math.random() - 0.5);
      
      // Distribute teams using the shuffled players
      const teams = distributeTeams(shuffledPlayers);
      
      // Update game document with new teams
      const gameRef = doc(db, 'games', id);
      await updateDoc(gameRef, {
        pairs: teams,
        lastDistributed: new Date().toISOString()
      });
      
      // Update local state
      setGame(prev => ({
        ...prev,
        pairs: teams,
        lastDistributed: new Date().toISOString()
      }));
      
      console.log('');
    } catch (err) {
      console.error('Error distributing teams:', err);
      console.log('Failed to distribute teams: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setLoading(true);
    try {
      // Get current game status before toggling
      const gameRef = doc(db, 'games', id);
      const gameDoc = await getDoc(gameRef);
      const currentGame = gameDoc.data();
      const wasOpen = currentGame.isOpen;
      
      // Toggle the game status
      await toggleGameStatus(id);
      
      // If the game was open and is now being closed, send notifications to all participants
      if (wasOpen) {
        // Prepare notification data
        const notificationData = {
          id,
          location: currentGame.location,
          date: format(new Date(currentGame.date), 'yyyy-MM-dd'),
          time: currentGame.time,
          // Add formatted date string for display
          formattedDate: format(new Date(currentGame.date), 'MMMM do, yyyy')
        };
        
        // Send gameClosed notifications to all players in the game via Firestore
        await sendGameNotification('gameClosed', notificationData, currentGame.players);
        
        // Show a direct browser notification
        notifyGameClosed(notificationData);
        
        // Show success toast with dark theme styling
        toast.success('Game closed and notifications sent to all participants', {
          style: {
            background: '#2A2A2A', // Darker background as per user preference
            color: '#FFFFFF',     // White text for better readability
            borderRadius: '8px',
            padding: '16px',
          },
          icon: '💪'
        });
      } else {
        // Game was closed and is now open
        toast.success('Game is now open for registration', {
          style: {
            background: '#2A2A2A', // Darker background as per user preference
            color: '#FFFFFF',     // White text for better readability
            borderRadius: '8px',
            padding: '16px',
          },
          icon: '🔓'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      console.log(error.message || 'Failed to toggle game status');
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
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToTournament = () => {
    // Close the confirmation dialog
    setConvertToTournamentOpen(false);
    
    // Open the ConvertGameToTournament dialog
    setConvertToTournamentDialogOpen(true);
  };

  const handleShareTournament = (gameId) => {
    const url = `${window.location.origin}/games/${gameId}`;
    
    // Use clipboard API to copy the URL
    navigator.clipboard.writeText(url)
      .then(() => {
        setShareSuccess(true);
        toast.success('Tournament link copied to clipboard!', {
          style: {
            background: '#4caf50',
            color: '#fff',
            borderRadius: '8px',
            padding: '16px',
          },
          icon: '🔗'
        });
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
        toast.error('Failed to copy link. Please try again.', {
          style: {
            background: '#f44336',
            color: '#fff',
            borderRadius: '8px',
            padding: '16px',
          },
          icon: '❌'
        });
      });
  };

  const handleUpdateMatchScore = (roundIndex, matchIndex, teamNumber, newScore) => {
    if (!isAdmin) return;
    
    const newTournamentData = { ...tournamentData };
    const match = newTournamentData.rounds[roundIndex].matches[matchIndex];
    
    if (teamNumber === 1) {
      match.score1 = parseInt(newScore, 10);
    } else {
      match.score2 = parseInt(newScore, 10);
    }
    
    // Check if we need to update the winner
    if (match.score1 > match.score2) {
      match.winner = 'team1';
      match.completed = true;
    } else if (match.score2 > match.score1) {
      match.winner = 'team2';
      match.completed = true;
    } else {
      match.winner = null;
      match.completed = false;
    }
    
    // If this is not the final round, update the next round
    if (roundIndex < newTournamentData.rounds.length - 1) {
      const nextRoundIndex = roundIndex + 1;
      const nextMatchIndex = Math.floor(matchIndex / 2);
      const isFirstTeamInNextMatch = matchIndex % 2 === 0;
      
      const nextMatch = newTournamentData.rounds[nextRoundIndex].matches[nextMatchIndex];
      
      if (match.winner) {
        const winningTeam = match[match.winner];
        
        if (isFirstTeamInNextMatch) {
          nextMatch.team1 = winningTeam;
        } else {
          nextMatch.team2 = winningTeam;
        }
      }
    }
    
    setTournamentData(newTournamentData);
    
    // Update the game document
    const gameRef = doc(db, 'games', id);
    updateDoc(gameRef, {
      tournamentData: newTournamentData
    }).catch(error => {
      console.error('Error updating tournament data:', error);
      toast.error('Failed to update scores');
    });
  };
  
  // Handle winner selection with radio buttons
  const handleWinnerSelection = (roundIndex, matchIndex, winnerTeam) => {
    if (!isAdmin) return;
    
    const newTournamentData = { ...tournamentData };
    const match = newTournamentData.rounds[roundIndex].matches[matchIndex];
    
    // Toggle winner if clicking the same team
    if (match.winner === winnerTeam) {
      match.winner = null;
      match.completed = false;
    } else {
      match.winner = winnerTeam;
      match.completed = true;
      
      // If this is not the final round, update the next round
      if (roundIndex < newTournamentData.rounds.length - 1) {
        const nextRoundIndex = roundIndex + 1;
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const isFirstTeamInNextMatch = matchIndex % 2 === 0;
        
        const nextMatch = newTournamentData.rounds[nextRoundIndex].matches[nextMatchIndex];
        const winningTeam = match[winnerTeam];
        
        if (isFirstTeamInNextMatch) {
          nextMatch.team1 = winningTeam;
        } else {
          nextMatch.team2 = winningTeam;
        }
      }
    }
    
    setTournamentData(newTournamentData);
    
    // Update the game document with the new tournament data
    const gameRef = doc(db, 'games', id);
    updateDoc(gameRef, {
      tournamentData: newTournamentData
    }).catch(error => {
      console.error('Error updating tournament data:', error);
      toast.error('Failed to update tournament data');
    });
  };

  if (!game) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="calc(100vh - 64px)">
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <GameHeader game={game} timeUntilGame={timeUntilGame} />
      
      {tournamentView && (
        <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ 
            p: 2, 
            mb: 3, 
            background: 'linear-gradient(45deg, #1976d2 30%, #21CBF3 90%)',
            color: 'white',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrophyIcon sx={{ mr: 1 }} />
              <Typography variant="h5" component="h2">
                {tournamentData.name || 'Tournament'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Share Tournament Link">
                <IconButton 
                  size="small" 
                  onClick={() => handleShareTournament(id)}
                  sx={{ color: 'white' }}
                >
                  <ShareIcon />
                </IconButton>
              </Tooltip>
              <Chip 
                label={tournamentData.format || 'Knockout'} 
                color="secondary" 
                size="small" 
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
          </Box>
          
          {tournamentData.rounds && tournamentData.rounds.length > 0 ? (
            <Box>
              {/* Enhanced Tournament Visualizer */}
              <TournamentVisualizerEnhanced
                rounds={tournamentData.rounds}
                teams={formatTeamsForVisualizer(tournamentData)}
                format={tournamentData.format || 'knockout'}
              />
              
              {/* Admin Controls - Only for admins */}
              {isAdmin && (
                <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px dashed rgba(0,0,0,0.2)' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <EditIcon sx={{ mr: 1, color: 'primary.main' }} />
                    Admin Controls
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Update Match Results:
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {tournamentData.rounds.map((round, roundIndex) => (
                      <Grid item xs={12} md={6} lg={4} key={roundIndex}>
                        <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                            {round.name}
                          </Typography>
                          
                          {round.matches.map((match, matchIndex) => (
                            <Box key={matchIndex} sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid rgba(0,0,0,0.08)' }}>
                              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Match {matchIndex + 1}: {match.team1?.name || 'Team 1'} vs {match.team2?.name || 'Team 2'}
                              </Typography>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Button
                                  variant={match.winner === 'team1' ? 'contained' : 'outlined'}
                                  color="primary"
                                  size="small"
                                  onClick={() => handleWinnerSelection(roundIndex, matchIndex, 'team1')}
                                  sx={{ 
                                    borderRadius: '20px',
                                    px: 2,
                                    fontSize: '0.7rem',
                                    boxShadow: match.winner === 'team1' ? 3 : 0,
                                    '&:hover': { transform: 'scale(1.05)' },
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  {match.team1?.name || 'Team 1'} Win
                                </Button>
                                
                                <Button
                                  variant={match.winner === 'team2' ? 'contained' : 'outlined'}
                                  color="secondary"
                                  size="small"
                                  onClick={() => handleWinnerSelection(roundIndex, matchIndex, 'team2')}
                                  sx={{ 
                                    borderRadius: '20px',
                                    px: 2,
                                    fontSize: '0.7rem',
                                    boxShadow: match.winner === 'team2' ? 3 : 0,
                                    '&:hover': { transform: 'scale(1.05)' },
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  {match.team2?.name || 'Team 2'} Win
                                </Button>
                              </Box>
                            </Box>
                          ))}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              Tournament bracket not yet generated
            </Alert>
          )}
          
          {/* Tournament Legend */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid rgba(0,0,0,0.1)' }}>
            <Typography variant="subtitle2" gutterBottom>Tournament Teams:</Typography>
            <Grid container spacing={2}>
              {tournamentData.rounds && tournamentData.rounds[0]?.matches ? 
                // Group by teams instead of individual players
                tournamentData.rounds[0].matches.flatMap(match => [
                  match.team1, match.team2
                ])
                .filter((team, index, self) => 
                  team && team.id && self.findIndex(t => t && t.id === team.id) === index && team.id !== 'team-bye'
                )
                .map((team, index) => (
                  <Grid item xs={12} sm={6} md={4} key={(team && team.id) || index}>
                    <Paper elevation={1} sx={{ p: 1.5, borderLeft: `4px solid ${team.color || '#1976d2'}` }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: team.color }}>
                        {team.name}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {team.players && team.players.length > 0 ? (
                          <Typography variant="body2">
                            {team.players.map(p => p.name || 'TBC').join(' & ')}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">No players</Typography>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                ))
                : <Grid item xs={12}><Typography variant="body2">No teams available</Typography></Grid>
              }
            </Grid>
          </Box>
        </Paper>
      )}
      
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid item xs={12} md={8}>
          <PlayersList 
            players={game.players} 
            pairs={game.pairs}
            currentUser={currentUser}
            onJoinLeave={handleJoinLeave}
            loading={loading}
            isOpen={game.isOpen}
            playersData={playersData}
            loadingPlayers={loadingPlayers}
            maxPlayers={game.maxPlayers}
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
              onConvertToTournament={handleConvertToTournament}
              loading={loading}
              setConvertToTournamentOpen={setConvertToTournamentOpen}
            />
          </Grid>
        )}
      </Grid>
      
      <Dialog open={convertToTournamentOpen} onClose={() => setConvertToTournamentOpen(false)}>
        <DialogTitle>Convert to Tournament</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to convert this game to a tournament?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertToTournamentOpen(false)}>Cancel</Button>
          <Button onClick={handleConvertToTournament} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <ConvertGameToTournament 
        open={convertToTournamentDialogOpen} 
        onClose={(tournamentId) => {
          setConvertToTournamentDialogOpen(false);
          if (tournamentId) {
            // If a tournament was created, enable tournament view
            setTournamentView(true);
            toast.success('Tournament created successfully!');
          }
        }} 
        game={game} 
      />
    </Box>
  );
};

export default GameDetail;
