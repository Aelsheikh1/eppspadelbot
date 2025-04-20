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

export default function GameManagement() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingGame, setEditingGame] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [playersData, setPlayersData] = useState({});

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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          Games Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/create-game')}
        >
          Create Game
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
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
            {games.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No games found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              games.map((game) => (
                <TableRow key={game.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon color="action" fontSize="small" />
                      {format(parseISO(game.date), 'PP')}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TimeIcon color="action" fontSize="small" />
                      {game.time}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationIcon color="action" fontSize="small" />
                      {game.location}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getGameStatus(game).label}
                      color={getGameStatus(game).color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {game.players?.map((playerId, index) => {
                        const playerData = playersData[playerId];
                        let displayName = 'Unknown Player';

                        if (playerData) {
                          if (playerData.firstName && playerData.lastName) {
                            displayName = `${playerData.firstName} ${playerData.lastName}`;
                          } else if (playerData.displayName) {
                            displayName = playerData.displayName;
                          } else if (playerData.email) {
                            displayName = playerData.email.split('@')[0];
                          }
                        }

                        return (
                          <Chip
                            key={`${game.id}-${playerId}-${index}`}
                            label={displayName}
                            onDelete={() => handleRemovePlayer(game.id, playerId)}
                            color="primary"
                            variant="outlined"
                          />
                        );
                      })}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        color="primary"
                        onClick={() => navigate(`/games/${game.id}`)}
                        title="View Game"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteGame(game.id)}
                        title="Delete Game"
                      >
                        <DeleteIcon />
                      </IconButton>
                      <IconButton
                        color="primary"
                        onClick={() => handleSendEmail(game.id)}
                        disabled={sendingEmail}
                        title="Send Email Report"
                      >
                        <EmailIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
