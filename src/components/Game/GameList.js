import React, { useState, useEffect } from 'react';
import { parseISO, isAfter, differenceInDays, differenceInHours, differenceInMinutes, differenceInMilliseconds, format } from 'date-fns';
import { safeFormatDate, safeFormatDistanceToNow, createDateFromStrings } from '../../utils/dateUtils';
import PlayerAvatar from '../common/PlayerAvatar';
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
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Paper
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PeopleIcon from '@mui/icons-material/People';
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
  Share as ShareIcon,
  EmojiEvents as TrophyIcon
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
import { db, joinGame, leaveGame } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import EditGame from './EditGame';
import { getPlayersData, clearPlayerCache } from '../../utils/playerUtils';
import { emailGameReport } from '../../utils/pdfGenerator';

const TimeUnit = ({ value, unit }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      mx: 0.3,
      minWidth: 28,
      background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
      borderRadius: 10,
      px: 1,
      py: 0.3,
      boxShadow: '0 2px 8px 0 rgba(92, 107, 192, 0.4)',
      transition: 'all 0.2s',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px 0 rgba(92, 107, 192, 0.5)'
      }
    }}
  >
    <Typography
      variant="body2"
      color="#fff"
      sx={{
        fontFamily: 'monospace',
        fontWeight: 700,
        fontSize: '0.85rem',
        lineHeight: 1.2,
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
      }}
    >
      {value < 10 ? `0${value}` : value}
    </Typography>
    <Typography
      variant="caption"
      color="#fff"
      sx={{
        fontSize: '0.6rem',
        lineHeight: 1,
        opacity: 0.8,
        fontWeight: 500,
        textTransform: 'uppercase',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
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
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [convertToTournamentDialog, setConvertToTournamentDialog] = useState({ open: false, gameId: null });
  const [highlightsDialogOpen, setHighlightsDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedTournamentHighlights, setSelectedTournamentHighlights] = useState([]);
  const [selectedChampion, setSelectedChampion] = useState(null);
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

  const renderPlayerName = (player) => {
    // Handle if player is an object with name property (from tournament data)
    if (typeof player === 'object' && player !== null) {
      if (player.name) return player.name;
      if (player.firstName && player.lastName) return `${player.firstName} ${player.lastName}`;
      if (player.displayName) return player.displayName;
      if (player.email) return player.email.split('@')[0];
    }
    
    // Handle if player is a string ID
    if (typeof player === 'string') {
      const playerData = playersData[player];
      if (!playerData) return player === currentUser?.uid ? 'You' : 'Player';
      if (playerData.firstName && playerData.lastName) {
        return `${playerData.firstName} ${playerData.lastName}`;
      } else if (playerData.displayName) {
        return playerData.displayName;
      } else if (playerData.email) {
        return playerData.email.split('@')[0];
      }
    }
    
    // Default fallback
    return 'Player';
  };

  const renderPlayerCell = (playerId) => {
    const playerData = playersData[playerId];
    const name = renderPlayerName(playerId);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <PlayerAvatar photoURL={playerData?.photoURL} name={name} />
        <Typography variant="body2" sx={{ ml: 1 }}>{name}</Typography>
      </Box>
    );
  };

  const renderPlayers = (game) => {
    if (!game.players || !Array.isArray(game.players)) return 'No players yet';
    return game.players.map(playerId => (
      <span key={playerId} style={{ display: 'inline-block', marginRight: 8 }}>
        {renderPlayerCell(playerId)}
      </span>
    ));
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

  const computeHighlights = (data) => {
    const roundsArr = data.rounds || [];
    const totalRounds = roundsArr.length;
    const totalMatches = roundsArr.reduce((sum, r) => sum + (r.matches?.length || 0), 0);
    const completedMatches = roundsArr.reduce((sum, r) => sum + (r.matches?.filter(m => m.completed || m.winner)?.length || 0), 0);
    
    // Basic stats that apply to all tournament formats
    const highlights = [
      { icon: 'fas fa-list-ol', label: 'Rounds', value: totalRounds },
      { icon: 'fas fa-sort-amount-down', label: 'Matches', value: totalMatches },
      { icon: 'fas fa-check-circle', label: 'Completed', value: completedMatches },
    ];
    
    // Only add score stats for league format
    if (data.format === 'League') {
      const averageScore = totalMatches > 0
        ? (roundsArr.reduce((s, r) => s + (r.matches?.reduce((t, m) => t + ((m.score1 != null && m.score2 != null) ? m.score1 + m.score2 : 0), 0) || 0), 0) / totalMatches).toFixed(2)
        : 0;
      
      let highestScoringMatch = null;
      let highestSum = -Infinity;
      roundsArr.forEach(r => r.matches?.forEach(m => {
        const s1 = m.score1 || 0, s2 = m.score2 || 0;
        if (s1 + s2 > highestSum) { highestSum = s1 + s2; highestScoringMatch = m; }
      }));
      
      const highestScoreDesc = highestScoringMatch
        ? `${highestScoringMatch.team1.name} ${highestScoringMatch.score1} - ${highestScoringMatch.score2} ${highestScoringMatch.team2.name}`
        : 'N/A';
      
      highlights.push(
        { icon: 'fas fa-star', label: 'Avg Score', value: averageScore },
        { icon: 'fas fa-bomb', label: 'Highest Score', value: highestScoreDesc }
      );
    }
    
    return highlights;
  };

  const computeChampion = (data) => {
    if (!data.rounds?.length) return null;
    if (data.format === 'League') return null;
    const last = data.rounds[data.rounds.length-1];
    const m = last.matches?.[0];
    if (m?.winner) return m.winner === 'team1' ? m.team1 : m.team2;
    return null;
  };

  const handleShowHighlights = (game) => {
    setSelectedTournament(game);
    setSelectedTournamentHighlights(computeHighlights(game.tournamentData));
    setSelectedChampion(computeChampion(game.tournamentData));
    setHighlightsDialogOpen(true);
  };

  const highlightIconMap = {
    Rounds: <FormatListNumberedIcon color="primary" fontSize="large" sx={{ mb:1 }} />, 
    Matches: <SportsScoreIcon color="info" fontSize="large" sx={{ mb:1 }} />, 
    Completed: <CheckCircleIcon color="success" fontSize="large" sx={{ mb:1 }} />, 
    'Avg Score': <StarIcon color="warning" fontSize="large" sx={{ mb:1 }} />, 
    'Highest Score': <LocalFireDepartmentIcon color="error" fontSize="large" sx={{ mb:1 }} />
  };

  // Format registration deadline message
  const formatDeadline = (game) => {
    try {
      if (game.status === 'closed' || !game.isOpen) return '';
      const deadlineDate = parseISO(`${game.deadline}T${game.deadlineTime}`);
      const now = new Date();
      if (isAfter(now, deadlineDate)) return 'Registration is closed';
      const days = differenceInDays(deadlineDate, now);
      const hours = differenceInHours(deadlineDate, now) % 24;
      const minutes = differenceInMinutes(deadlineDate, now) % 60;
      if (days > 0) return `${days} day${days > 1 ? 's' : ''} left to register`;
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left to register`;
      if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} left to register`;
      return 'Less than a minute left to register';
    } catch (err) {
      console.error('Error formatting deadline:', err);
      return '';
    }
  };

  // Share game link
  const handleShareGame = (gameId) => {
    const url = `${window.location.origin}/games/${gameId}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setShareSuccess(true);
        setError('Game link copied to clipboard!');
        setTimeout(() => { setShareSuccess(false); setError(''); }, 3000);
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
        setError('Failed to copy link. Please try again.');
      });
  };

  // Convert to tournament
  const handleConvertToTournament = (gameId) => {
    setConvertToTournamentDialog({ open: true, gameId });
  };

  const handleConfirmConvertToTournament = () => {
    const gameId = convertToTournamentDialog.gameId;
    if (!gameId) return;
    setConvertToTournamentDialog({ open: false, gameId: null });
    navigate(`/games/${gameId}?convertToTournament=true`);
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
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: { xs: 2, sm: 0 } }}>
        <Typography variant="h4" component="h1" sx={{ mb: { xs: 2, sm: 0 } }}>
          Games
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1.5, sm: 2 }, width: { xs: '100%', sm: 'auto' } }}>
          <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
              borderRadius: '50px',
              px: 2,
              py: 0.5,
              border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease'
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600,
                color: (theme) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
                mr: 1.5
              }}
            >
              {showOpenOnly ? "Open Games Only" : "All Games"}
            </Typography>
            
            <Box sx={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}>
              <Box
                onClick={() => setShowOpenOnly(!showOpenOnly)}
                sx={{
                  width: 42,
                  height: 22,
                  borderRadius: 11,
                  position: 'relative',
                  transition: 'background-color 0.3s',
                  bgcolor: (theme) => showOpenOnly 
                    ? theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.primary.main, 0.9)
                      : theme.palette.primary.main 
                    : theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.grey[600], 0.5) 
                      : alpha(theme.palette.grey[400], 0.5),
                  '&:hover': {
                    bgcolor: (theme) => showOpenOnly 
                      ? theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.primary.main, 1)
                        : theme.palette.primary.dark 
                      : theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.grey[600], 0.7) 
                        : alpha(theme.palette.grey[500], 0.7),
                  },
                  boxShadow: (theme) => theme.palette.mode === 'dark' 
                    ? '0 2px 4px rgba(0, 0, 0, 0.3) inset' 
                    : '0 1px 3px rgba(0, 0, 0, 0.1) inset',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 2,
                    left: showOpenOnly ? 'calc(100% - 20px)' : '2px',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    transition: 'left 0.3s, box-shadow 0.3s',
                    bgcolor: '#fff',
                    boxShadow: showOpenOnly
                      ? '0 1px 5px rgba(0, 0, 0, 0.3)'
                      : '0 1px 3px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      transition: 'opacity 0.3s',
                      opacity: 0.1,
                      bgcolor: (theme) => showOpenOnly ? theme.palette.primary.main : 'transparent',
                    }
                  }}
                />
              </Box>
              <Tooltip title={showOpenOnly ? "Show all games" : "Show open games only"}>
                <Box sx={{ ml: 1, display: 'flex', color: (theme) => theme.palette.text.secondary }}>
                  {showOpenOnly ? <LockOpenIcon fontSize="small" /> : <GroupIcon fontSize="small" />}
                </Box>
              </Tooltip>
            </Box>
          </Box>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<TrophyIcon />}
            onClick={() => navigate('/tournaments')}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            View Tournaments
          </Button>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/create-game')}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Create Game
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert 
          severity={shareSuccess ? "success" : "error"} 
          sx={{ mb: 2 }} 
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {games
          .filter(game => !showOpenOnly || (game.status !== 'closed' && game.isOpen !== false))
          .map(game => {
          const status = getGameStatus(game);
          // Use our safe utility function to get the time until game
          const timeToGame = safeFormatDistanceToNow(
            createDateFromStrings(game.date, game.time),
            { addSuffix: true },
            'Date not set'
          );
          const userInGame = isUserInGame(game);
          const isExpanded = expandedGame === game.id;

          return (
            <Grid item xs={12} sm={12} md={6} lg={4} key={game.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'visible',
                  boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.5)',
                  background: (theme) => `linear-gradient(135deg, 
                    ${theme.palette.background.card} 0%, 
                    ${alpha(theme.palette.primary.dark, 0.15)} 100%)`,
                  '&:hover': {
                    boxShadow: '0 8px 25px 0 rgba(0, 0, 0, 0.6)',
                    transform: 'translateY(-4px)',
                    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                    background: (theme) => `linear-gradient(135deg, 
                      ${theme.palette.background.card} 0%, 
                      ${alpha(theme.palette.primary.dark, 0.25)} 100%)`,
                  },
                  mb: { xs: 2, sm: 0 },
                  borderRadius: { xs: 2, sm: 3 },
                  minWidth: 0,
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
                  {/* Header: Title & Status/Timer */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  <TennisIcon color="primary" />
  <Typography variant="h6" component="div" sx={{ fontWeight: 700, letterSpacing: 1 }}>
    Padel Game
  </Typography>
  {isAdmin && (
    <Tooltip title="Game Actions" arrow>
      <IconButton
        size="small"
        onClick={(e) => handleMenuOpen(e, game)}
        sx={{ ml: 1, flexShrink: 0 }}
        aria-label="Game actions menu"
      >
        <MoreVertIcon />
      </IconButton>
    </Tooltip>
  )}
</Box>
<Box
  sx={{
    display: 'flex',
    alignItems: 'center',
    gap: { xs: 0.5, sm: 1.5 },
    flexWrap: { xs: 'wrap', sm: 'nowrap' },
    minWidth: 0,
    ml: 'auto',
    position: 'relative',
    zIndex: 2
  }}
>
                      {(game.status === 'closed' || !game.isOpen) ? (
                        <Chip
                          label="Closed"
                          color="error"
                          size="small"
                          icon={<LockIcon />}
                          sx={{ 
                            fontWeight: 'medium', 
                            '& .MuiChip-icon': { fontSize: 16 },
                            background: (theme) => `linear-gradient(135deg, ${theme.palette.error.dark} 30%, ${theme.palette.error.main} 90%)`,
                            boxShadow: '0 2px 6px 0 rgba(244, 67, 54, 0.4)',
                            border: '1px solid rgba(244, 67, 54, 0.5)'
                          }}
                        />
                      ) : (game.isOpen && game.players?.length >= game.maxPlayers) ? (
                        <>
                          <CountdownTimer deadline={game.deadline} deadlineTime={game.deadlineTime} gameId={game.id} />
                          <Chip
                            label="Full"
                            color="warning"
                            size="small"
                            icon={<GroupIcon />}
                            sx={{ 
                              fontWeight: 'medium', 
                              ml: 1, 
                              '& .MuiChip-icon': { fontSize: 16 },
                              background: (theme) => `linear-gradient(135deg, ${theme.palette.warning.dark} 30%, ${theme.palette.warning.main} 90%)`,
                              boxShadow: '0 2px 6px 0 rgba(255, 167, 38, 0.4)',
                              border: '1px solid rgba(255, 167, 38, 0.5)'
                            }}
                          />
                        </>
                      ) : (game.isOpen) ? (
                        <>
                          <CountdownTimer deadline={game.deadline} deadlineTime={game.deadlineTime} gameId={game.id} />
                          <Chip
                            label="Open"
                            color="success"
                            size="small"
                            icon={<LockOpenIcon />}
                            sx={{ 
                              fontWeight: 'medium', 
                              ml: 1, 
                              '& .MuiChip-icon': { fontSize: 16 },
                              background: (theme) => `linear-gradient(135deg, ${theme.palette.success.dark} 30%, ${theme.palette.success.main} 90%)`,
                              boxShadow: '0 2px 6px 0 rgba(102, 187, 106, 0.4)',
                              border: '1px solid rgba(102, 187, 106, 0.5)'
                            }}
                          />
                        </>
                      ) : (
                        <CountdownTimer deadline={game.deadline} deadlineTime={game.deadlineTime} gameId={game.id} />
                      )}
                      {game.isTournament && (
                        <Chip
                          label="Ongoing Tournament"
                          color="secondary"
                          size="small"
                          icon={<TrophyIcon />}
                          sx={{ mr: 1 }}
                        />
                      )}

                    </Box>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {safeFormatDate(
                            createDateFromStrings(game.date, game.time),
                            'EEEE, MMMM d, yyyy',
                            'Date not set'
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TimeIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {game.time} ({timeToGame})
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LocationIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                        <Typography variant="body2">{game.location}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AccessTime sx={{ mr: 1, fontSize: 20, color: isRegistrationClosed(game) ? 'error.main' : 'text.secondary' }} />
                        <Typography 
                          variant="body2" 
                          color={isRegistrationClosed(game) ? 'error.main' : 'text.secondary'}
                        >
                          {formatDeadline(game)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 1 }} />
                  {/* Players Avatars + Names */}
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 0.5, sm: 1 }, mt: 1, mb: 1, overflowX: { xs: 'auto', sm: 'visible' } }}>
                    <GroupIcon sx={{ color: 'primary.main', mr: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mr: 1 }}>
                      Players:
                    </Typography>
                    {game.players?.length === 0 && (
                      <Typography variant="body2" color="text.secondary">No players yet</Typography>
                    )}
                    {game.players?.map((playerId, idx) => {
                      const player = playersData[playerId] || {};
                      const name = renderPlayerName(playerId);
                      const isCurrentUser = playerId === currentUser?.uid;
                      return (
                        <Tooltip key={playerId} title={name} placement="top">
                          <PlayerAvatar
                            photoURL={player.photoURL}
                            name={name}
                            size={28}
                            email={player.email}
                            style={{
                              border: isCurrentUser ? '2px solid #1976d2' : undefined,
                              marginRight: 4
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      ({game.players?.length || 0}/{game.maxPlayers})
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  {/* Players List */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                    {game.players?.map((playerId, idx) => {
                      const player = playersData[playerId] || {};
                      const name = renderPlayerName(playerId);
                      const isCurrentUser = playerId === currentUser?.uid;
                      return (
                        <Box key={playerId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PlayerAvatar
                            photoURL={player.photoURL}
                            name={name}
                            size={24}
                            email={player.email}
                            style={{
                              border: isCurrentUser ? '2px solid #1976d2' : undefined
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {name}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </CardContent>

                <CardActions sx={{ p: { xs: 1, sm: 2 }, pt: 0, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 1 }, alignItems: { xs: 'stretch', sm: 'center' } }}>
                  <Box sx={{ display: 'flex', width: '100%', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
                    <Button
                      variant={isUserInGame(game) ? "outlined" : "contained"}
                      color="primary"
                      onClick={() => isUserInGame(game) ? handleLeaveGame(game.id) : handleJoinGame(game.id)}
                      disabled={isRegistrationClosed(game) || (!isUserInGame(game) && game.players?.length >= game.maxPlayers) || game.status === 'closed'}
                      sx={{ 
                        flexGrow: 1, 
                        mb: { xs: 1, sm: 0 }, 
                        width: { xs: '100%', sm: 'auto' },
                        background: (theme) => isUserInGame(game) 
                          ? 'transparent' 
                          : `linear-gradient(135deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                        color: (theme) => isUserInGame(game) 
                          ? (theme.palette.mode === 'dark' ? '#7986cb' : theme.palette.primary.main)
                          : '#ffffff',
                        borderWidth: (theme) => theme.palette.mode === 'dark' && isUserInGame(game) ? '2px' : '1px',
                        fontWeight: (theme) => theme.palette.mode === 'dark' ? 700 : 600,
                        letterSpacing: (theme) => theme.palette.mode === 'dark' ? '0.5px' : 'inherit',
                        '&:hover': {
                          background: (theme) => isUserInGame(game) 
                            ? (theme.palette.mode === 'dark' ? 'rgba(121, 134, 203, 0.15)' : 'rgba(92, 107, 192, 0.12)') 
                            : `linear-gradient(135deg, ${theme.palette.primary.light} 30%, ${theme.palette.primary.main} 90%)`,
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px 0 rgba(121, 134, 203, 0.5)'
                        },
                        boxShadow: '0 2px 8px 0 rgba(121, 134, 203, 0.4)'
                      }}
                    >
                      {isUserInGame(game) ? 'Leave Game' : (game.players?.length >= game.maxPlayers ? 'Full (Join Disabled)' : 'Join Game')}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => handleShareGame(game.id)}
                      sx={{ 
                        ml: { xs: 0, sm: 1 }, 
                        mb: { xs: 1, sm: 0 }, 
                        width: { xs: '100%', sm: 'auto' },
                        borderColor: (theme) => theme.palette.mode === 'dark' ? '#64b5f6' : theme.palette.secondary.main,
                        color: (theme) => theme.palette.mode === 'dark' ? '#64b5f6' : theme.palette.secondary.main,
                        borderWidth: (theme) => theme.palette.mode === 'dark' ? '2px' : '1px',
                        fontWeight: (theme) => theme.palette.mode === 'dark' ? 700 : 600,
                        '&:hover': {
                          borderColor: (theme) => theme.palette.mode === 'dark' ? '#9be7ff' : theme.palette.secondary.dark,
                          color: (theme) => theme.palette.mode === 'dark' ? '#9be7ff' : theme.palette.secondary.dark,
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px 0 rgba(100, 181, 246, 0.4)',
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(100, 181, 246, 0.1)' : 'rgba(33, 150, 243, 0.08)'
                        }
                      }}
                      startIcon={<ShareIcon />}
                    >
                      Share
                    </Button>
                    
                    <Button
                      variant="outlined"
                      color="info"
                      size="small"
                      startIcon={
                        <span role="img" aria-label="View Details">
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="9" /><circle cx="10" cy="10" r="3" /><path d="M10 1v2m0 14v2m9-9h-2M3 10H1" /></svg>
                        </span>
                      }
                      onClick={() => navigate(`/games/${game.id}`)}
                      sx={{ 
                        ml: { xs: 0, sm: 1 }, 
                        width: { xs: '100%', sm: 'auto' },
                        borderColor: (theme) => theme.palette.mode === 'dark' ? '#29b6f6' : theme.palette.info.main,
                        color: (theme) => theme.palette.mode === 'dark' ? '#29b6f6' : theme.palette.info.main,
                        borderWidth: (theme) => theme.palette.mode === 'dark' ? '2px' : '1px',
                        fontWeight: (theme) => theme.palette.mode === 'dark' ? 700 : 600,
                        '&:hover': {
                          borderColor: (theme) => theme.palette.mode === 'dark' ? '#73e8ff' : theme.palette.info.dark,
                          color: (theme) => theme.palette.mode === 'dark' ? '#73e8ff' : theme.palette.info.dark,
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px 0 rgba(41, 182, 246, 0.4)',
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(41, 182, 246, 0.1)' : 'rgba(3, 169, 244, 0.08)'
                        }
                      }}
                    >
                      View Details
                    </Button>
                    
                    {game.tournamentData && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        startIcon={<TrophyIcon />}
                        onClick={() => handleShowHighlights(game)}
                        sx={{
                          color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : theme.palette.secondary.main,
                          borderColor: (theme) => theme.palette.mode === 'dark' ? '#90CAF9' : theme.palette.secondary.main,
                          borderWidth: (theme) => theme.palette.mode === 'dark' ? '2px' : '1px',
                          fontWeight: (theme) => theme.palette.mode === 'dark' ? 700 : 600,
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.15)' : undefined,
                          '&:hover': {
                            borderColor: (theme) => theme.palette.mode === 'dark' ? '#BBDEFB' : theme.palette.secondary.dark,
                            color: (theme) => theme.palette.mode === 'dark' ? '#BBDEFB' : theme.palette.secondary.dark,
                            transform: 'translateY(-2px)',
                            boxShadow: (theme) => theme.palette.mode === 'dark' 
                              ? '0 4px 12px 0 rgba(144, 202, 249, 0.5)' 
                              : '0 4px 12px 0 rgba(100, 181, 246, 0.4)',
                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.25)' : 'rgba(33, 150, 243, 0.08)'
                          }
                        }}
                      >
                        View Tournament
                      </Button>
                    )}
                  </Box>
                  
                  {isAdmin && !game.isTournament && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => handleConvertToTournament(game.id)}
                      startIcon={<TrophyIcon />}
                      fullWidth
                      sx={{ 
                        mt: 2,
                        borderStyle: 'dashed', 
                        borderColor: (theme) => theme.palette.mode === 'dark' ? '#64b5f6' : theme.palette.secondary.main,
                        color: (theme) => theme.palette.mode === 'dark' ? '#64b5f6' : theme.palette.secondary.main,
                        borderWidth: (theme) => theme.palette.mode === 'dark' ? '2px' : '1px',
                        fontWeight: (theme) => theme.palette.mode === 'dark' ? 700 : 600,
                        '&:hover': { 
                          backgroundColor: (theme) => theme.palette.mode === 'dark' 
                            ? alpha(theme.palette.secondary.main, 0.15)
                            : alpha(theme.palette.secondary.main, 0.08),
                          borderStyle: 'solid',
                          borderColor: (theme) => theme.palette.mode === 'dark' ? '#9be7ff' : theme.palette.secondary.dark,
                          color: (theme) => theme.palette.mode === 'dark' ? '#9be7ff' : theme.palette.secondary.dark,
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px 0 rgba(100, 181, 246, 0.4)'
                        } 
                      }}
                    >
                      Convert to Tournament
                    </Button>
                  )}
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
        {isAdmin && (
          <>
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
          </>
        )}
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

      {/* Convert to Tournament Dialog */}
      <Dialog 
        open={convertToTournamentDialog.open} 
        onClose={() => setConvertToTournamentDialog({ open: false, gameId: null })}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrophyIcon sx={{ mr: 1, color: 'secondary.main' }} />
            Convert to Tournament
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to convert this game to a tournament? This will:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <Typography component="li">Close registration for new players</Typography>
            <Typography component="li">Create a tournament bracket with the current players</Typography>
            <Typography component="li">Allow tracking of matches and winners</Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            You'll be able to customize the tournament settings in the next step.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertToTournamentDialog({ open: false, gameId: null })}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleConfirmConvertToTournament()} 
            variant="contained" 
            color="secondary"
            startIcon={<TrophyIcon />}
          >
            Convert
          </Button>
        </DialogActions>
      </Dialog>

      {selectedTournament && (
        <Dialog 
          open={highlightsDialogOpen} 
          onClose={() => setHighlightsDialogOpen(false)} 
          fullWidth 
          maxWidth="md"
          PaperProps={{
            sx: {
              borderRadius: 2,
              overflow: 'hidden',
              backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0.98)), url(https://www.transparenttextures.com/patterns/cubes.png)'
            }
          }}
        >
          <DialogTitle sx={{ 
            p: 0, 
            position: 'relative', 
            overflow: 'hidden',
            height: 180,
            backgroundImage: (theme) => theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)' 
              : 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)'
          }}>
            <Box sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              opacity: 0.1,
              backgroundImage: 'url(https://www.transparenttextures.com/patterns/sport.png)',
              backgroundSize: 'cover'
            }} />
            <Box sx={{ 
              position: 'absolute', 
              top: 10, 
              right: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'white',
              bgcolor: 'rgba(0,0,0,0.2)',
              p: 1,
              borderRadius: 1
            }}>
              <CalendarIcon fontSize="small" />
              <Typography variant="caption">{format(new Date(selectedTournament.date || new Date()), 'MMM d, yyyy')}</Typography>
            </Box>
            <Box sx={{ p: 3, zIndex: 2, width: '100%' }}>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                {selectedTournament.tournamentData?.name || selectedTournament.location || 'Tournament'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 2 }}>
                <Chip 
                  icon={<LocationIcon sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF !important' : 'white !important' }} />} 
                  label={selectedTournament.location || 'Unknown location'} 
                  size="small" 
                  sx={{ 
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.4)' : 'rgba(255,255,255,0.2)', 
                    color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : 'white',
                    border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(144, 202, 249, 0.5)' : 'none',
                    fontWeight: (theme) => theme.palette.mode === 'dark' ? 600 : 400
                  }}
                />
                <Chip 
                  icon={<TrophyIcon sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF !important' : 'white !important' }} />} 
                  label={selectedTournament.tournamentData?.format || 'Knockout'} 
                  size="small" 
                  sx={{ 
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.4)' : 'rgba(255,255,255,0.2)', 
                    color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : 'white',
                    border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(144, 202, 249, 0.5)' : 'none',
                    fontWeight: (theme) => theme.palette.mode === 'dark' ? 600 : 400
                  }}
                />
              </Box>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            {/* Key Stats Section */}
            <Box sx={{ mb: 4 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: (theme) => theme.palette.mode === 'dark' ? '#000000' : theme.palette.text.primary,
                  fontWeight: 600
                }}
              >
                <SportsScoreIcon sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#000000' : theme.palette.primary.main }} /> 
                Tournament Stats
              </Typography>
              <Grid container spacing={2}>
                {selectedTournamentHighlights.map((h,i) => (
                  <Grid item xs={6} sm={4} md={2.4} key={i}>
                    <Paper 
                      elevation={3} 
                      sx={{ 
                        p: 2, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        height: '100%',
                        background: (theme) => theme.palette.mode === 'dark' ? '#1E1E1E' : 'white',
                        borderRadius: 2,
                        border: (theme) => theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : 'none',
                        boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 24px rgba(0, 0, 0, 0.6)' : '0 8px 16px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      {highlightIconMap[h.label] || null}
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          color: (theme) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.text.secondary,
                          fontWeight: 600
                        }}
                      >
                        {h.label}
                      </Typography>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 700, 
                          mt: 1,
                          color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : theme.palette.text.primary
                        }}
                      >
                        {h.value}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Progress Bar */}
            {selectedTournament.tournamentData?.rounds?.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    mb: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    color: (theme) => theme.palette.mode === 'dark' ? '#000000' : theme.palette.text.primary,
                    fontWeight: 600
                  }}
                >
                  <CheckCircleIcon 
                    sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#000000' : theme.palette.success.main }} 
                    fontSize="small" 
                  /> 
                  Tournament Progress
                </Typography>
                <Box sx={{ 
                  position: 'relative', 
                  height: 8, 
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.2) : '#edf2f7', 
                  borderRadius: 4, 
                  overflow: 'hidden',
                  border: (theme) => theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}` : 'none'
                }}>
                  {(() => {
                    const totalMatches = selectedTournament.tournamentData.rounds.reduce(
                      (sum, r) => sum + (r.matches?.length || 0), 0
                    );
                    const completedMatches = selectedTournament.tournamentData.rounds.reduce(
                      (sum, r) => sum + (r.matches?.filter(m => m.completed || m.winner)?.length || 0), 0
                    );
                    const progressPercent = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
                    return (
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          left: 0, 
                          top: 0, 
                          height: '100%', 
                          width: `${progressPercent}%`,
                          background: 'linear-gradient(90deg, #48bb78 0%, #38b2ac 100%)'
                        }} 
                      />
                    );
                  })()} 
                </Box>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    textAlign: 'right', 
                    mt: 0.5,
                    color: (theme) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.text.secondary,
                    fontWeight: (theme) => theme.palette.mode === 'dark' ? 600 : 400,
                    fontSize: '0.85rem'
                  }}
                >
                  <Box component="span" sx={{ fontWeight: 'bold', color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : theme.palette.text.primary }}>
                    {selectedTournament.tournamentData.rounds.reduce(
                      (sum, r) => sum + (r.matches?.filter(m => m.completed || m.winner)?.length || 0), 0
                    )}
                  </Box> / {selectedTournament.tournamentData.rounds.reduce(
                    (sum, r) => sum + (r.matches?.length || 0), 0
                  )} matches completed
                </Typography>
              </Box>
            )}

            <Grid container spacing={3}>
              {/* Champion Section */}
              {selectedChampion && (
                <Grid item xs={12} md={4}>
                  <Paper elevation={3} sx={{ 
                    p: 3, 
                    borderRadius: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    background: (theme) => theme.palette.mode === 'dark' 
                      ? 'linear-gradient(135deg, #b78628 0%, #8A6E2F 50%, #c69320 100%)' 
                      : 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
                    height: '100%',
                    border: (theme) => theme.palette.mode === 'dark' ? '1px solid #FFD700' : 'none',
                    boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(255, 215, 0, 0.2)' : '0 8px 32px rgba(253, 160, 133, 0.2)'
                  }}>
                    <Box sx={{ 
                      position: 'absolute', 
                      top: -15, 
                      right: -15, 
                      width: 80, 
                      height: 80, 
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)'
                    }} />
                    <Box sx={{ 
                      position: 'absolute', 
                      bottom: -20, 
                      left: -20, 
                      width: 100, 
                      height: 100, 
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)'
                    }} />
                    <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
                      <TrophyIcon sx={{ fontSize: 48, color: '#FFD700', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.2))' }} />
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          mt: 2, 
                          mb: 1, 
                          fontWeight: 700, 
                          color: (theme) => theme.palette.mode === 'dark' ? '#000000' : '#7D4B32',
                          textShadow: (theme) => theme.palette.mode === 'dark' ? '0 2px 4px rgba(255,215,0,0.3)' : 'none'
                        }}
                      >
                        Champion
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 600, 
                          color: (theme) => theme.palette.mode === 'dark' ? '#FFD700' : '#7D4B32'
                        }}
                      >
                        {selectedChampion.name}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                        {selectedChampion.players?.map((p,idx) => (
                          <Chip
                            key={idx}
                            avatar={
                              <Avatar sx={{ 
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#FFD700' : '#7D4B32',
                                color: (theme) => theme.palette.mode === 'dark' ? '#000000' : '#FFFFFF',
                                fontWeight: 'bold'
                              }}>
                                {renderPlayerName(p)[0]}
                              </Avatar>
                            }
                            label={renderPlayerName(p)}
                            sx={{ 
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.2)' : 'rgba(255,255,255,0.7)', 
                              color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : 'inherit',
                              fontWeight: 500,
                              border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 215, 0, 0.3)' : 'none'
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              )}

              {/* Teams Section */}
              <Grid item xs={12} md={selectedChampion ? 8 : 12}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 2,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1E1E1E' : theme.palette.background.paper,
                    border: (theme) => theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : 'none',
                    boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : theme.palette.text.primary,
                      fontWeight: 600
                    }}
                  >
                    <PeopleIcon sx={{ color: (theme) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main }} /> 
                    Teams & Players
                  </Typography>
                  <Grid container spacing={2}>
                    {selectedTournament.tournamentData.teams?.map((team,idx) => {
                      // Determine if this team is the champion
                      const isChampion = selectedChampion && (team.id === selectedChampion.id || team.name === selectedChampion.name);
                      // Get team stats if available
                      const teamStats = selectedTournament.tournamentData.format === 'League' ? {
                        played: team.played || 0,
                        won: team.won || 0,
                        drawn: team.drawn || 0,
                        lost: team.lost || 0,
                        points: team.points || 0
                      } : null;
                      
                      return (
                        <Grid item xs={12} sm={6} md={4} key={idx}>
                          <Paper 
                            elevation={isChampion ? 4 : 1} 
                            sx={{ 
                              p: 2, 
                              position: 'relative',
                              border: (theme) => {
                                if (isChampion) {
                                  return theme.palette.mode === 'dark' ? '2px solid #FFD700' : '2px solid #FFD700';
                                } else {
                                  return theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : 'none';
                                }
                              },
                              bgcolor: (theme) => {
                                if (isChampion) {
                                  return theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 215, 0, 0.05)';
                                } else {
                                  return theme.palette.mode === 'dark' ? '#2A2A2A' : 'white';
                                }
                              },
                              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.3)' : undefined
                            }}
                          >
                            {isChampion && (
                              <Box sx={{ position: 'absolute', top: -10, right: -10 }}>
                                <TrophyIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                              </Box>
                            )}
                            <Typography 
                              variant="subtitle1" 
                              sx={{ 
                                fontWeight: 600,
                                color: (theme) => {
                                  if (isChampion) {
                                    return theme.palette.mode === 'dark' ? '#FFD700' : theme.palette.text.primary;
                                  } else {
                                    return theme.palette.mode === 'dark' ? '#FFFFFF' : theme.palette.text.primary;
                                  }
                                }
                              }}
                            >
                              {team.name || `Team ${idx+1}`}
                            </Typography>
                            
                            {teamStats && (
                              <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 1 }}>
                                <Chip 
                                  size="small" 
                                  label={`${teamStats.points} pts`} 
                                  sx={{ 
                                    bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.3) : undefined,
                                    color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : undefined,
                                    fontWeight: (theme) => theme.palette.mode === 'dark' ? 600 : 400,
                                    border: (theme) => theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.primary.main, 0.5)}` : undefined
                                  }}
                                  color="primary" 
                                />
                                <Chip 
                                  size="small" 
                                  label={`${teamStats.won}W-${teamStats.drawn}D-${teamStats.lost}L`} 
                                  sx={{ 
                                    bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1A1A1A' : undefined,
                                    color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : undefined,
                                    border: (theme) => theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.grey[500], 0.3)}` : undefined
                                  }}
                                />
                              </Box>
                            )}
                            
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                              {(team.players || []).map((p,idx) => {
                                const isCurrentUser = p === currentUser?.uid;
                                return (
                                  <Chip
                                    key={idx}
                                    avatar={
                                      <Avatar sx={{ 
                                        bgcolor: isCurrentUser 
                                          ? (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.8) : theme.palette.primary.main 
                                          : (theme) => theme.palette.mode === 'dark' ? '#333333' : undefined,
                                        color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : undefined,
                                        fontWeight: 'bold'
                                      }}>
                                        {renderPlayerName(p)[0]}
                                      </Avatar>
                                    }
                                    label={renderPlayerName(p)}
                                    size="small"
                                    sx={{
                                      bgcolor: (theme) => {
                                        if (theme.palette.mode === 'dark') {
                                          return isCurrentUser ? alpha(theme.palette.primary.main, 0.3) : '#2A2A2A';
                                        }
                                        return undefined;
                                      },
                                      color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : undefined,
                                      border: (theme) => {
                                        if (theme.palette.mode === 'dark') {
                                          return isCurrentUser 
                                            ? `1px solid ${alpha(theme.palette.primary.main, 0.7)}` 
                                            : `1px solid ${alpha(theme.palette.grey[400], 0.5)}`;
                                        }
                                        return undefined;
                                      }
                                    }}
                                    color={isCurrentUser ? 'primary' : 'default'}
                                    variant={isCurrentUser ? 'filled' : 'outlined'}
                                  />
                                );
                              })}
                            </Box>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Paper>
              </Grid>
              
              {/* Match Results Section */}
              <Grid item xs={12}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 2,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1E1E1E' : theme.palette.background.paper,
                    border: (theme) => theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : 'none',
                    boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : theme.palette.text.primary,
                      fontWeight: 600
                    }}
                  >
                    <SportsScoreIcon sx={{ color: (theme) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main }} /> 
                    Recent Results
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {selectedTournament.tournamentData.rounds?.flatMap((round, roundIdx) => 
                      (round.matches || []).filter(m => m.completed || m.winner).map((match, matchIdx) => (
                        <Paper 
                          key={`${roundIdx}-${matchIdx}`} 
                          elevation={1} 
                          sx={{ 
                            p: 2, 
                            mb: 2, 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            gap: 2,
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1A1A1A' : theme.palette.background.paper,
                            border: (theme) => theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
                            boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : undefined
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              size="small" 
                              label={round.name} 
                              sx={{ 
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.secondary.main, 0.3) : undefined,
                                color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : undefined,
                                fontWeight: (theme) => theme.palette.mode === 'dark' ? 600 : 400,
                                border: (theme) => theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.secondary.main, 0.5)}` : undefined
                              }}
                              color="secondary" 
                            />
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: { xs: 1, md: 3 },
                            flexGrow: 1,
                            justifyContent: 'center'
                          }}>
                            <Box sx={{ textAlign: 'right', width: '40%' }}>
                              <Typography 
                                variant="subtitle2" 
                                sx={{ 
                                  fontWeight: match.winner === 'team1' ? 700 : 500,
                                  color: (theme) => {
                                    if (theme.palette.mode === 'dark') {
                                      return match.winner === 'team1' ? theme.palette.success.light : '#FFFFFF';
                                    } else {
                                      return match.winner === 'team1' ? theme.palette.success.main : theme.palette.text.primary;
                                    }
                                  }
                                }}
                              >
                                {match.team1?.name || 'TBD'}
                              </Typography>
                            </Box>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              px: 2,
                              py: 1,
                              borderRadius: 1,
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.1) : 'grey.100',
                              border: (theme) => theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : 'none'
                            }}>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontWeight: 700, 
                                  color: (theme) => {
                                    if (theme.palette.mode === 'dark') {
                                      return match.winner === 'team1' ? theme.palette.success.light : '#FFFFFF';
                                    } else {
                                      return match.winner === 'team1' ? theme.palette.success.main : theme.palette.text.primary;
                                    }
                                  }
                                }}
                              >
                                {match.score1 != null ? match.score1 : '-'}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  px: 1,
                                  color: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.7) : theme.palette.text.secondary
                                }}
                              >
                                vs
                              </Typography>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontWeight: 700, 
                                  color: (theme) => {
                                    if (theme.palette.mode === 'dark') {
                                      return match.winner === 'team2' ? theme.palette.success.light : '#FFFFFF';
                                    } else {
                                      return match.winner === 'team2' ? theme.palette.success.main : theme.palette.text.primary;
                                    }
                                  }
                                }}
                              >
                                {match.score2 != null ? match.score2 : '-'}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'left', width: '40%' }}>
                              <Typography 
                                variant="subtitle2" 
                                sx={{ 
                                  fontWeight: match.winner === 'team2' ? 700 : 500,
                                  color: (theme) => {
                                    if (theme.palette.mode === 'dark') {
                                      return match.winner === 'team2' ? theme.palette.success.light : '#FFFFFF';
                                    } else {
                                      return match.winner === 'team2' ? theme.palette.success.main : theme.palette.text.primary;
                                    }
                                  }
                                }}
                              >
                                {match.team2?.name || 'TBD'}
                              </Typography>
                            </Box>
                          </Box>
                          <Box>
                            {match.winner && (
                              <Chip 
                                icon={<TrophyIcon fontSize="small" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#FFD700' : undefined }} />} 
                                label={`${match.winner === 'team1' ? match.team1?.name : match.team2?.name} won`}
                                size="small"
                                color="success"
                                sx={{
                                  bgcolor: (theme) => theme.palette.mode === 'dark' ? '#2A2A2A' : undefined,
                                  color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : undefined,
                                  fontWeight: 600,
                                  border: (theme) => theme.palette.mode === 'dark' ? '1px solid #FFD700' : undefined
                                }}
                              />
                            )}
                          </Box>
                        </Paper>
                      ))
                    )}
                    {!selectedTournament.tournamentData.rounds?.some(round => 
                      (round.matches || []).some(match => match.completed || match.winner)
                    ) && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          textAlign: 'center', 
                          py: 3,
                          color: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.7) : theme.palette.text.secondary,
                          fontStyle: 'italic'
                        }}
                      >
                        No completed matches yet
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button onClick={() => setHighlightsDialogOpen(false)} variant="outlined">Close</Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<TrophyIcon />}
              onClick={() => { setHighlightsDialogOpen(false); navigate(`/tournaments/${selectedTournament.id}`); }}
            >
              View Full Tournament
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
