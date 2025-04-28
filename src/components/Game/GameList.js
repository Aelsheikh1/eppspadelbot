import React, { useState, useEffect } from 'react';
import { parseISO, isAfter, differenceInDays, differenceInHours, differenceInMinutes, differenceInMilliseconds, format, formatDistanceToNow } from 'date-fns';
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
      bgcolor: 'primary.light',
      borderRadius: 10,
      px: 1,
      py: 0.3,
      boxShadow: 1,
      transition: 'all 0.2s',
    }}
  >
    <Typography
      variant="body2"
      color="#fff"
      sx={{
        fontFamily: 'monospace',
        fontWeight: 700,
        fontSize: '1.05rem',
        lineHeight: 1.1,
      }}
    >
      {value.toString().padStart(2, '0')}
    </Typography>
    <Typography
      variant="caption"
      color="#fff"
      sx={{
        textTransform: 'uppercase',
        fontSize: '0.65rem',
        opacity: 0.85,
        lineHeight: 1,
        letterSpacing: 0.5,
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
          <ToggleButtonGroup
            value={showOpenOnly ? 'open' : 'all'}
            exclusive
            onChange={(e, val) => setShowOpenOnly(val === 'open')}
            sx={{
              background: '#f5f6fa',
              borderRadius: 2,
              boxShadow: 1,
              p: 0.5,
              '.MuiToggleButton-root': {
                fontWeight: 600,
                fontSize: '0.95rem',
                px: 2,
                py: 1,
                border: 'none',
                color: '#888',
                '&.Mui-selected': {
                  background: 'linear-gradient(90deg, #1976d2 0%, #21cbf3 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 8px #1976d233',
                }
              }
            }}
          >
            <ToggleButton value="all" aria-label="Show all games">
              <GroupIcon sx={{ mr: 1 }} /> All Games
            </ToggleButton>
            <ToggleButton value="open" aria-label="Show open games only">
              <LockOpenIcon sx={{ mr: 1 }} /> Open Only
            </ToggleButton>
          </ToggleButtonGroup>
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
          const gameDateTime = parseISO(`${game.date}T${game.time}`);
          const timeToGame = formatDistanceToNow(gameDateTime, { addSuffix: true });
          const userInGame = isUserInGame(game);
          const isExpanded = expandedGame === game.id;

          return (
            <Grid item xs={12} sm={12} md={6} lg={4} key={game.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 6,
                  },
                  mb: { xs: 2, sm: 0 },
                  borderRadius: { xs: 2, sm: 3 },
                  minWidth: 0
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
</Box>
<Box
  sx={{
    display: 'flex',
    alignItems: 'center',
    gap: { xs: 0.5, sm: 1.5 },
    flexWrap: 'nowrap',
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
                          sx={{ fontWeight: 'medium', '& .MuiChip-icon': { fontSize: 16 } }}
                        />
                      ) : (game.isOpen && game.players?.length >= game.maxPlayers) ? (
                        <>
                          <CountdownTimer deadline={game.deadline} deadlineTime={game.deadlineTime} gameId={game.id} />
                          <Chip
                            label="Full"
                            color="warning"
                            size="small"
                            icon={<GroupIcon />}
                            sx={{ fontWeight: 'medium', ml: 1, '& .MuiChip-icon': { fontSize: 16 } }}
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
                            sx={{ fontWeight: 'medium', ml: 1, '& .MuiChip-icon': { fontSize: 16 } }}
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
                          {format(gameDateTime, 'EEEE, MMMM d, yyyy')}
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
                      sx={{ flexGrow: 1, mb: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}
                    >
                      {isUserInGame(game) ? 'Leave Game' : (game.players?.length >= game.maxPlayers ? 'Full (Join Disabled)' : 'Join Game')}
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => handleShareGame(game.id)}
                      sx={{ ml: { xs: 0, sm: 1 }, mb: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}
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
                      sx={{ ml: { xs: 0, sm: 1 }, width: { xs: '100%', sm: 'auto' } }}
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
                        sx={{ ml: { xs: 0, sm: 1 }, width: { xs: '100%', sm: 'auto' } }}
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
                        borderStyle: 'dashed', 
                        '&:hover': { 
                          backgroundColor: alpha('#9c27b0', 0.04),
                          borderStyle: 'solid'
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
            height: 120,
            display: 'flex',
            alignItems: 'flex-end',
            backgroundImage: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)'
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
                  icon={<LocationIcon sx={{ color: 'white !important' }} />} 
                  label={selectedTournament.location || 'Unknown location'} 
                  size="small" 
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
                <Chip 
                  icon={<TrophyIcon sx={{ color: 'white !important' }} />} 
                  label={selectedTournament.tournamentData?.format || 'Knockout'} 
                  size="small" 
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              </Box>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            {/* Key Stats Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SportsScoreIcon color="primary" /> Tournament Stats
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
                        background: 'white',
                        borderRadius: 2,
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      {highlightIconMap[h.label] || null}
                      <Typography variant="subtitle2" color="text.secondary">{h.label}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>{h.value}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Progress Bar */}
            {selectedTournament.tournamentData?.rounds?.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="success" fontSize="small" /> Tournament Progress
                </Typography>
                <Box sx={{ position: 'relative', height: 8, bgcolor: '#edf2f7', borderRadius: 4, overflow: 'hidden' }}>
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
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
                  {selectedTournament.tournamentData.rounds.reduce(
                    (sum, r) => sum + (r.matches?.filter(m => m.completed || m.winner)?.length || 0), 0
                  )} / {selectedTournament.tournamentData.rounds.reduce(
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
                    background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
                    height: '100%'
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
                      <Typography variant="h5" sx={{ mt: 2, mb: 1, fontWeight: 700, color: '#7D4B32' }}>Champion</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#7D4B32' }}>{selectedChampion.name}</Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                        {selectedChampion.players?.map((p,idx) => (
                          <Chip
                            key={idx}
                            avatar={<Avatar sx={{ bgcolor: '#7D4B32' }}>{renderPlayerName(p)[0]}</Avatar>}
                            label={renderPlayerName(p)}
                            sx={{ bgcolor: 'rgba(255,255,255,0.7)', fontWeight: 500 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              )}

              {/* Teams Section */}
              <Grid item xs={12} md={selectedChampion ? 8 : 12}>
                <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon color="primary" /> Teams & Players
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
                              border: isChampion ? '2px solid #FFD700' : 'none',
                              bgcolor: isChampion ? 'rgba(255, 215, 0, 0.05)' : 'white'
                            }}
                          >
                            {isChampion && (
                              <Box sx={{ position: 'absolute', top: -10, right: -10 }}>
                                <TrophyIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                              </Box>
                            )}
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {team.name || `Team ${idx+1}`}
                            </Typography>
                            
                            {teamStats && (
                              <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 1 }}>
                                <Chip size="small" label={`${teamStats.points} pts`} color="primary" />
                                <Chip size="small" label={`${teamStats.won}W-${teamStats.drawn}D-${teamStats.lost}L`} />
                              </Box>
                            )}
                            
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                              {(team.players || []).map((p,j) => {
                                const isCurrentUser = p === currentUser?.uid;
                                return (
                                  <Chip
                                    key={j}
                                    avatar={<Avatar sx={{ bgcolor: isCurrentUser ? 'primary.main' : undefined }}>{renderPlayerName(p)[0]}</Avatar>}
                                    label={renderPlayerName(p)}
                                    size="small"
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
                <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SportsScoreIcon color="primary" /> Recent Results
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
                            gap: 2 
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip size="small" color="secondary" label={round.name} />
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: { xs: 1, md: 3 },
                            flexGrow: 1,
                            justifyContent: 'center'
                          }}>
                            <Box sx={{ textAlign: 'right', width: '40%' }}>
                              <Typography variant="subtitle2">{match.team1?.name || 'TBD'}</Typography>
                            </Box>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              px: 2,
                              py: 1,
                              borderRadius: 1,
                              bgcolor: 'grey.100'
                            }}>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: match.winner === 'team1' ? 'success.main' : 'text.primary' }}>
                                {match.score1 != null ? match.score1 : '-'}
                              </Typography>
                              <Typography variant="body2" sx={{ px: 1 }}>vs</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: match.winner === 'team2' ? 'success.main' : 'text.primary' }}>
                                {match.score2 != null ? match.score2 : '-'}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'left', width: '40%' }}>
                              <Typography variant="subtitle2">{match.team2?.name || 'TBD'}</Typography>
                            </Box>
                          </Box>
                          <Box>
                            {match.winner && (
                              <Chip 
                                icon={<TrophyIcon fontSize="small" />} 
                                label={`${match.winner === 'team1' ? match.team1?.name : match.team2?.name} won`}
                                size="small"
                                color="success"
                              />
                            )}
                          </Box>
                        </Paper>
                      ))
                    )}
                    {!selectedTournament.tournamentData.rounds?.some(round => 
                      (round.matches || []).some(match => match.completed || match.winner)
                    ) && (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
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
