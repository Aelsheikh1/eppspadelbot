import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, deleteGame } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import EditGame from '../Game/EditGame';
import { format, parseISO, isAfter } from 'date-fns';
import { clearPlayerCache, getPlayersData } from '../../utils/playerUtils';
import { emailGameReport } from '../../utils/pdfGenerator';
import { toast } from 'react-toastify';
import GameRow from './GameRow';
import GameDetailDrawer from './GameDetailDrawer';
import { Tabs, Tab, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export default function GameManagement() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingGame, setEditingGame] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [playersData, setPlayersData] = useState({});
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerGame, setDrawerGame] = useState(null);


  useEffect(() => {
    if (!currentUser) return;

    // Clear player cache to force refresh
    clearPlayerCache();

    const gamesQuery = query(collection(db, 'games'), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(gamesQuery, 
      async (snapshot) => {
        try {
          const gamesList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Get all unique player IDs
          const allPlayerIds = new Set();
          gamesList.forEach(game => {
            if (game.players && Array.isArray(game.players)) {
              game.players.forEach(playerId => {
                if (typeof playerId === 'string') {
                  allPlayerIds.add(playerId);
                }
              });
            }
          });

          // Fetch player data
          const playerData = await getPlayersData(Array.from(allPlayerIds), currentUser?.uid);
          setPlayersData(playerData);
          
          setGames(gamesList);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching games:', error);
          setError('Failed to load games');
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error subscribing to games:', error);
        setError('Failed to load games');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleDeleteGame = async (gameId) => {
    if (window.confirm('Are you sure you want to delete this game?')) {
      try {
        await deleteGame(gameId);
        toast.success('Game deleted successfully');
      } catch (err) {
        console.error('Error deleting game:', err);
        setError('Failed to delete game: ' + err.message);
      }
    }
  };

  const getGameStatus = (game) => {
    if (!game.date || !game.time || typeof game.date !== 'string' || typeof game.time !== 'string') {
      return { label: 'Invalid Date', color: 'default' };
    }

    const gameDateTime = parseISO(`${game.date}T${game.time}`);
    if (!gameDateTime || isNaN(gameDateTime.getTime())) {
      return { label: 'Invalid Date', color: 'default' };
    }

    const now = new Date();
    if (isAfter(now, gameDateTime)) {
      return { label: 'Past', color: 'default' };
    }

    if (!game.isOpen) {
      return { label: 'Closed', color: 'error' };
    }

    if (game.players?.length >= (game.maxPlayers || 4)) {
      return { label: 'Full', color: 'warning' };
    }

    return { label: 'Open', color: 'success' };
  };

  const handleSendEmail = async (gameId) => {
    setSendingEmail(true);
    try {
      await emailGameReport(gameId);
      toast.success('Game report sent successfully! 📧');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email report');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRemovePlayer = async (gameId, playerId) => {
    try {
      const gameRef = doc(db, 'games', gameId);
      const gameDoc = await getDoc(gameRef);
      
      if (!gameDoc.exists()) {
        console.error('Game not found');
        return;
      }

      const gameData = gameDoc.data();
      const updatedPlayers = (gameData.players || []).filter(id => id !== playerId);

      await updateDoc(gameRef, {
        players: updatedPlayers,
        lastUpdated: serverTimestamp()
      });

      toast.success('Player removed successfully');
    } catch (error) {
      console.error('Error removing player:', error);
      toast.error('Failed to remove player');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Action handlers for subcomponents
  const handleViewGame = (game) => {
    setDrawerGame(game);
    setDrawerOpen(true);
  };
  const handleEditGameDialog = (game) => setEditingGame(game);
  const handleDeleteGameRow = (game) => handleDeleteGame(game.id);
  const handleEmailGame = (game) => handleSendEmail(game.id);
  const handleDrawerClose = () => setDrawerOpen(false);

  // Tab and search filtering
  const filterGames = (games) => {
    let filtered = games;
    const now = new Date();
    if (tab === 'upcoming') filtered = filtered.filter(g => {
      const dt = g.date && g.time ? parseISO(`${g.date}T${g.time}`) : null;
      return dt && dt > now;
    });
    if (tab === 'past') filtered = filtered.filter(g => {
      const dt = g.date && g.time ? parseISO(`${g.date}T${g.time}`) : null;
      return dt && dt <= now;
    });
    if (tab === 'tournaments') filtered = filtered.filter(g => g.isTournament);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(g =>
        (g.location && g.location.toLowerCase().includes(q)) ||
        (g.players && g.players.some(pid => {
          const pd = playersData[pid];
          if (!pd) return false;
          return (
            (pd.firstName && pd.firstName.toLowerCase().includes(q)) ||
            (pd.lastName && pd.lastName.toLowerCase().includes(q)) ||
            (pd.displayName && pd.displayName.toLowerCase().includes(q)) ||
            (pd.email && pd.email.toLowerCase().includes(q))
          );
        }))
      );
    }
    return filtered;
  };

  const filteredGames = filterGames(games);
  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, background: 'linear-gradient(120deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <Box sx={{ mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}>
        <Typography variant="h5" component="h2" sx={{ mb: { xs: 1, sm: 0 } }}>
          Games Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/create-game')}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Create Game
        </Button>
      </Box>
      {/* Tabs for filtering */}
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
        <Tab value="all" label="All" />
        <Tab value="upcoming" label="Upcoming" />
        <Tab value="past" label="Past" />
        <Tab value="tournaments" label="Tournaments" />
      </Tabs>
      {/* Search Bar */}
      <TextField
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by location or player..."
        size="small"
        sx={{ mb: 2, width: { xs: '100%', sm: 350 } }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Players</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No games found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredGames.map((game) => (
                <GameRow
                  key={game.id}
                  game={game}
                  playersData={playersData}
                  onView={handleViewGame}
                  onEdit={handleEditGameDialog}
                  onDelete={handleDeleteGameRow}
                  onEmail={handleEmailGame}
                  sendingEmail={sendingEmail}
                  onRemovePlayer={handleRemovePlayer}
                  getGameStatus={getGameStatus}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <GameDetailDrawer
        open={drawerOpen}
        game={drawerGame}
        playersData={playersData}
        onClose={handleDrawerClose}
        onEdit={handleEditGameDialog}
        onDelete={handleDeleteGameRow}
        onEmail={handleEmailGame}
        sendingEmail={sendingEmail}
      />
      {editingGame && (
        <EditGame 
          open={!!editingGame} 
          game={editingGame} 
          onClose={() => setEditingGame(null)}
          onSuccess={() => {
            setEditingGame(null);
            // Refresh will happen automatically through onSnapshot
          }}
          clearPlayerCache={clearPlayerCache}
          getPlayersData={getPlayersData}
        />
      )}
    </Box>
  );
}