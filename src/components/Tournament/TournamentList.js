import React, { useState, useEffect } from 'react';
import PlayerAvatar from '../common/PlayerAvatar';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  AvatarGroup,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Checkbox,
  Divider
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  SportsTennis as TennisIcon,
  Event as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import ConvertGameToTournament from './ConvertGameToTournament';

export default function TournamentList() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const [createTournamentOpen, setCreateTournamentOpen] = useState(false);
  const [availableGames, setAvailableGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Only fetch games that are marked as tournaments
        const gamesQuery = query(
          collection(db, 'games'), 
          where('isTournament', '==', true)
        );
        
        try {
          const gamesSnapshot = await getDocs(gamesQuery);
          
          const gameTournamentsList = gamesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || 'Game Tournament',
              format: data.tournamentFormat || 'Knockout',
              location: data.location,
              startDate: data.date,
              startTime: data.time,
              status: data.status,
              createdAt: data.createdAt,
              tournamentData: data.tournamentData,
              source: 'games'
            };
          });
          
          // Sort by date (newest first)
          const sortedTournaments = gameTournamentsList.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
          });
          
          setTournaments(sortedTournaments);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching game tournaments:', err);
          setError('Failed to load tournaments. Please try again later.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error in tournament list:', err);
        setError('Failed to load tournaments. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchTournaments();
  }, []);

  useEffect(() => {
    // Fetch available games for tournament conversion
    const fetchAvailableGames = async () => {
      try {
        // Query games that are not already tournaments
        const gamesQuery = query(
          collection(db, 'games'),
          where('isTournament', '==', false)
        );
        
        const gamesSnapshot = await getDocs(gamesQuery);
        
        const gamesList = gamesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            location: data.location || 'Unnamed Game',
            date: data.date,
            time: data.time,
            players: data.players || [],
            pairs: data.pairs || []
          };
        });
        
        // Filter out past games
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to beginning of day for date comparison
        
        const filteredGames = gamesList.filter(game => {
          if (!game.date) return true; // Include games with no date
          const gameDate = new Date(game.date);
          return gameDate >= today; // Only include games today or in the future
        });
        
        // Sort by date (nearest future first)
        const sortedGames = filteredGames.sort((a, b) => {
          const dateA = a.date ? new Date(a.date) : new Date(0);
          const dateB = b.date ? new Date(b.date) : new Date(0);
          return dateA - dateB; // Ascending order (nearest future first)
        });
        
        setAvailableGames(sortedGames);
      } catch (err) {
        console.error('Error fetching available games:', err);
      }
    };
    
    if (createTournamentOpen) {
      fetchAvailableGames();
    }
  }, [createTournamentOpen]);

  const handleShareTournament = (tournamentId) => {
    const url = `${window.location.origin}/tournaments/${tournamentId}`;
    
    navigator.clipboard.writeText(url)
      .then(() => {
        setError('Tournament link copied to clipboard!');
        setTimeout(() => setError(''), 3000);
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
        setError('Failed to copy link. Please try again.');
      });
  };
  
  const handleDeleteTournament = async () => {
    if (!tournamentToDelete) return;
    
    try {
      setLoading(true);
      
      if (tournamentToDelete.source === 'games') {
        // If it's a game-based tournament, update the game to remove tournament flag
        const gameRef = doc(db, 'games', tournamentToDelete.id);
        await updateDoc(gameRef, {
          isTournament: false,
          tournamentData: null,
          isConvertedToTournament: false
        });
      }
      
      // Remove the tournament from the list
      setTournaments(prev => prev.filter(t => t.id !== tournamentToDelete.id));
      setError('Tournament deleted successfully!');
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      console.error('Error deleting tournament:', err);
      setError('Failed to delete tournament. Please try again.');
    } finally {
      setLoading(false);
      setDeleteConfirmOpen(false);
      setTournamentToDelete(null);
    }
  };

  const handleCreateTournament = () => {
    setCreateTournamentOpen(true);
  };

  const handleGameSelect = (gameId) => {
    setSelectedGameId(gameId);
    const game = availableGames.find(g => g.id === gameId);
    setSelectedGame(game);
  };

  const handleOpenConvertDialog = () => {
    if (!selectedGameId) return;
    setCreateTournamentOpen(false);
    setConvertDialogOpen(true);
  };

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Only fetch games that are marked as tournaments
      const gamesQuery = query(
        collection(db, 'games'), 
        where('isTournament', '==', true)
      );
      
      try {
        const gamesSnapshot = await getDocs(gamesQuery);
        
        const gameTournamentsList = gamesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Game Tournament',
            format: data.tournamentFormat || 'Knockout',
            location: data.location,
            startDate: data.date,
            startTime: data.time,
            status: data.status,
            createdAt: data.createdAt,
            tournamentData: data.tournamentData,
            source: 'games'
          };
        });
        
        // Sort by date (newest first)
        const sortedTournaments = gameTournamentsList.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });
        
        setTournaments(sortedTournaments);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching game tournaments:', err);
        setError('Failed to load tournaments. Please try again later.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error in tournament list:', err);
      setError('Failed to load tournaments. Please try again later.');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: { xs: 2, sm: 0 } }}>
  <Typography variant="h4" component="h1" gutterBottom={false} sx={{ mb: { xs: 2, sm: 0 } }}>
    <TrophyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
    Tournaments
  </Typography>
  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1.5, sm: 2 }, width: { xs: '100%', sm: 'auto' } }}>
    <Button
      variant="outlined"
      color="primary"
      startIcon={<RefreshIcon />}
      onClick={() => {
        setLoading(true);
        loadTournaments();
      }}
      sx={{ width: { xs: '100%', sm: 'auto' } }}
    >
      Refresh
    </Button>
    {isAdmin && (
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleCreateTournament}
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      >
        Create Tournament
      </Button>
    )}
  </Box>
</Box>

      <Box sx={{ mb: 4 }}>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {!error && tournaments.length === 0 && !loading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No tournaments found. You can create a tournament by converting a game to tournament mode.
          </Alert>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : tournaments.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper' }}>
          <TrophyIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tournaments available
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Convert a game to a tournament to get started.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/games')}
            startIcon={<TennisIcon />}
          >
            Go to Games
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
        {tournaments.map(tournament => {
          const startDate = parseISO(tournament.startDate);
          const timeToStart = formatDistanceToNow(startDate, { addSuffix: true });

          return (
            <Grid item xs={12} sm={6} md={4} key={tournament.id}>
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
                <CardContent>
                  <Typography variant="h6" component="div">
                    {tournament.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Format: {tournament.format}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tournament.startDate && format(new Date(tournament.startDate), 'PPP')}
                    {tournament.startTime && ` at ${tournament.startTime}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Location: {tournament.location || 'Not specified'}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {(() => {
                      // Determine if tournament is completed by status or by winner in data
                      let isCompleted = tournament.status === 'completed';
                      let winnerTeam = null;
                      let winnerPlayers = [];
                      if (tournament.tournamentData && tournament.tournamentData.rounds) {
                        const rounds = tournament.tournamentData.rounds;
                        if (rounds.length > 0) {
                          const finalRound = rounds[rounds.length - 1];
                          if (finalRound.matches && finalRound.matches[0] && finalRound.matches[0].winner) {
                            // winner may be a string like 'team1' or 'team2', or an object
                            let winnerKey = finalRound.matches[0].winner;
                            let teamObj = null;
                            if (typeof winnerKey === 'string') {
                              // Try to find the team object by id or key
                              const match = finalRound.matches[0];
                              teamObj = match[winnerKey] || (Array.isArray(tournament.tournamentData.teams) ? tournament.tournamentData.teams.find(t => t.id === winnerKey || t.name === winnerKey) : null);
                            } else if (typeof winnerKey === 'object') {
                              teamObj = winnerKey;
                            }
                            winnerTeam = teamObj;
                            winnerPlayers = (teamObj && teamObj.players ? teamObj.players : []).map(
                              p => typeof p === 'object' ? (p.name || p.displayName || p.email || 'TBC') : (p || 'TBC')
                            );
                            isCompleted = true;
                          }
                        }
                      }
                      return <>
                        <Chip 
                          label={isCompleted ? 'Completed' : 'Ongoing'} 
                          color={isCompleted ? 'success' : 'primary'} 
                          size="small" 
                          sx={{ width: 'fit-content', mb: isCompleted ? 1 : 0 }}
                        />
                        {isCompleted && winnerTeam && (
                          <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            bgcolor: 'rgba(255, 249, 196, 0.7)',
                            borderRadius: 2,
                            p: 1.2,
                            mt: 1.2,
                            mb: 0.5,
                            boxShadow: 1,
                            minWidth: 0,
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <TrophyIcon sx={{ color: 'gold', fontSize: 28, mr: 1 }} />
                              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#7c6f3f', fontSize: '1.07rem', mr: 1, wordBreak: 'break-word' }}>
                                {winnerTeam.name}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', pl: 4, gap: 1 }}>
  {winnerTeam && winnerTeam.players && winnerTeam.players.map((p, idx) => {
    const name = typeof p === 'object' ? (p.name || p.displayName || p.email || 'TBC') : (p || 'TBC');
    const photoURL = typeof p === 'object' ? p.photoURL : undefined;
    const email = typeof p === 'object' ? p.email : undefined;
    return (
      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
        <PlayerAvatar
          photoURL={photoURL}
          name={name}
          size={28}
          email={email}
        />
        <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '1rem', ml: 0.5 }}>
          {name}
        </Typography>
        {idx === 0 && winnerTeam.players.length > 1 && <Typography sx={{ mx: 0.5 }}>&amp;</Typography>}
      </Box>
    );
  })}
</Box>
                          </Box>
                        )}
                      </>;
                    })()}
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate(tournament.source === 'games' ? `/games/${tournament.id}` : `/tournaments/${tournament.id}`)}
                    sx={{ flexGrow: 1 }}
                  >
                    View Tournament
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleShareTournament(tournament.id)}
                    sx={{ ml: 1 }}
                    startIcon={<ShareIcon />}
                  >
                    Share
                  </Button>
                  {isAdmin && (
                    <IconButton 
                      color="error"
                      onClick={() => {
                        setTournamentToDelete(tournament);
                        setDeleteConfirmOpen(true);
                      }}
                      sx={{ ml: 1 }}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
        {tournaments.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body1" color="text.secondary" align="center">
              No tournaments available
            </Typography>
          </Grid>
        )}
      </Grid>
      )}
      
      {/* Delete Tournament Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Tournament</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this tournament? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteTournament} 
            color="error" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Tournament Dialog */}
      <Dialog
        open={createTournamentOpen}
        onClose={() => setCreateTournamentOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrophyIcon sx={{ mr: 1 }} />
            Create Tournament
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>
            Select a game to convert to tournament:
          </Typography>
          
          {availableGames.length > 0 ? (
            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
              {availableGames.map((game) => (
                <React.Fragment key={game.id}>
                  <ListItem 
                    alignItems="flex-start"
                    button
                    onClick={() => handleGameSelect(game.id)}
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={selectedGameId === game.id}
                        onChange={() => handleGameSelect(game.id)}
                      />
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <TennisIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={game.location}
                      secondary={
                        <React.Fragment>
                          <Typography
                            sx={{ display: 'inline' }}
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {game.date && format(new Date(game.date), 'PPP')}
                          </Typography>
                          {game.time && ` at ${game.time}`}
                          <br />
                          {`${game.players?.length || 0} players`}
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 3 }}>
              No available games found
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTournamentOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleOpenConvertDialog} 
            variant="contained" 
            color="primary"
            disabled={!selectedGameId}
          >
            Next
          </Button>
        </DialogActions>
      </Dialog>

      {/* ConvertGameToTournament Component */}
      <ConvertGameToTournament 
        open={convertDialogOpen} 
        onClose={(tournamentId) => {
          setConvertDialogOpen(false);
          if (tournamentId) {
            // Refresh the tournament list
            window.location.reload();
          }
        }} 
        game={selectedGame} 
      />
    </Box>
  );
}
