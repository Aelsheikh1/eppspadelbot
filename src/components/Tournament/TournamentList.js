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
  Divider,
  alpha
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
import { format } from 'date-fns';
import { safeFormatDate, safeFormatDistanceToNow } from '../../utils/dateUtils';
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
          // Use our safe utility function to format the time until tournament starts
          const timeToStart = safeFormatDistanceToNow(
            tournament.startDate,
            { addSuffix: true },
            'Date not set'
          );

          return (
            <Grid item xs={12} sm={6} md={4} key={tournament.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  background: (theme) => `linear-gradient(135deg, 
                    ${theme.palette.background.card} 0%, 
                    ${alpha(theme.palette.primary.dark, 0.15)} 100%)`,
                  boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: { xs: 2, sm: 3 },
                  overflow: 'visible',
                  '&:hover': {
                    boxShadow: '0 8px 25px 0 rgba(0, 0, 0, 0.6)',
                    transform: 'translateY(-4px)',
                    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                    background: (theme) => `linear-gradient(135deg, 
                      ${theme.palette.background.card} 0%, 
                      ${alpha(theme.palette.primary.dark, 0.25)} 100%)`,
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
                          sx={{ 
                            width: 'fit-content', 
                            mb: isCompleted ? 1 : 0,
                            background: (theme) => isCompleted 
                              ? `linear-gradient(135deg, ${theme.palette.success.dark} 30%, ${theme.palette.success.main} 90%)`
                              : `linear-gradient(135deg, ${theme.palette.primary.dark} 30%, ${theme.palette.primary.main} 90%)`,
                            boxShadow: (theme) => isCompleted 
                              ? '0 2px 6px 0 rgba(102, 187, 106, 0.4)'
                              : '0 2px 6px 0 rgba(92, 107, 192, 0.4)',
                            border: (theme) => isCompleted 
                              ? '1px solid rgba(102, 187, 106, 0.5)'
                              : '1px solid rgba(92, 107, 192, 0.5)',
                            fontWeight: 'medium',
                            '& .MuiChip-label': {
                              color: (theme) => theme.palette.mode === 'dark' ? '#fff' : isCompleted ? '#fff' : '#fff',
                            }
                          }}
                        />
                        {isCompleted && winnerTeam && (
                          <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 249, 196, 0.7)',
                            borderRadius: 2,
                            p: 1.5,
                            mt: 1.2,
                            mb: 0.5,
                            boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 12px rgba(255, 215, 0, 0.2)' : 1,
                            minWidth: 0,
                            border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 215, 0, 0.3)' : 'none',
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <TrophyIcon sx={{ color: 'gold', fontSize: 28, mr: 1 }} />
                              <Typography variant="subtitle1" sx={{ 
                                fontWeight: 700, 
                                color: (theme) => theme.palette.mode === 'dark' ? '#ffd700' : '#7c6f3f', 
                                fontSize: '1.07rem', 
                                mr: 1, 
                                wordBreak: 'break-word',
                                textShadow: (theme) => theme.palette.mode === 'dark' ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none'
                              }}>
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
                    sx={{ 
                      flexGrow: 1,
                      background: (theme) => theme.palette.mode === 'dark' 
                        ? `linear-gradient(135deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`
                        : `linear-gradient(135deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                      color: '#ffffff',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      '&:hover': {
                        background: (theme) => theme.palette.mode === 'dark'
                          ? `linear-gradient(135deg, ${theme.palette.primary.light} 30%, ${theme.palette.primary.main} 90%)`
                          : `linear-gradient(135deg, ${theme.palette.primary.light} 30%, ${theme.palette.primary.main} 90%)`,
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px 0 rgba(121, 134, 203, 0.6)'
                      },
                      boxShadow: '0 2px 8px 0 rgba(121, 134, 203, 0.5)'
                    }}
                  >
                    View Tournament
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleShareTournament(tournament.id)}
                    sx={{ 
                      ml: 1,
                      borderColor: (theme) => theme.palette.mode === 'dark' ? '#64b5f6' : theme.palette.secondary.main,
                      color: (theme) => theme.palette.mode === 'dark' ? '#64b5f6' : theme.palette.secondary.main,
                      borderWidth: (theme) => theme.palette.mode === 'dark' ? '2px' : '1px',
                      fontWeight: (theme) => theme.palette.mode === 'dark' ? 700 : 600,
                      '&:hover': {
                        borderColor: (theme) => theme.palette.mode === 'dark' ? '#9be7ff' : theme.palette.secondary.light,
                        color: (theme) => theme.palette.mode === 'dark' ? '#9be7ff' : theme.palette.secondary.light,
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px 0 rgba(100, 181, 246, 0.4)',
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(100, 181, 246, 0.1)' : undefined
                      }
                    }}
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
                      sx={{ 
                        ml: 1,
                        bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                        '&:hover': {
                          bgcolor: (theme) => alpha(theme.palette.error.main, 0.2),
                          transform: 'translateY(-2px)'
                        }
                      }}
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
          <Button 
            onClick={() => setDeleteConfirmOpen(false)} 
            disabled={loading}
            sx={{
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.2)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteTournament} 
            color="error" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
            sx={{
              background: (theme) => theme.palette.mode === 'dark' 
                ? `linear-gradient(135deg, ${theme.palette.error.dark} 30%, ${theme.palette.error.main} 90%)`
                : undefined,
              '&:hover': {
                background: (theme) => theme.palette.mode === 'dark' 
                  ? `linear-gradient(135deg, ${theme.palette.error.main} 30%, ${theme.palette.error.light} 90%)`
                  : undefined,
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px 0 rgba(244, 67, 54, 0.4)'
              },
              boxShadow: '0 2px 8px 0 rgba(244, 67, 54, 0.3)'
            }}
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
          <Button 
            onClick={() => setCreateTournamentOpen(false)}
            sx={{
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.2)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleOpenConvertDialog} 
            variant="contained" 
            color="primary"
            disabled={!selectedGameId}
            sx={{ 
              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
              '&:hover': {
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.light} 30%, ${theme.palette.primary.main} 90%)`,
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px 0 rgba(92, 107, 192, 0.5)'
              },
              boxShadow: '0 2px 8px 0 rgba(92, 107, 192, 0.4)',
              '&.Mui-disabled': {
                background: (theme) => theme.palette.mode === 'dark' ? 'rgba(92, 107, 192, 0.2)' : undefined
              }
            }}
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
