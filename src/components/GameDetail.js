import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { checkAdminStatus, distributePlayersRandomly, toggleGameStatus } from '../utils/adminUtils';
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
  Person as PersonIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

// Component for game header information
const GameHeader = ({ game }) => {
  const theme = useTheme();
  
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1" gutterBottom>
              {game.location}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {format(new Date(game.date), 'PPP')} at {game.time}
            </Typography>
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
const PlayersList = ({ players, pairs }) => {
  const theme = useTheme();

  const getPlayerTeam = (playerId) => {
    if (!pairs) return null;
    const team = pairs.findIndex(pair => 
      pair.player1?.id === playerId || pair.player2?.id === playerId
    );
    return team !== -1 ? team + 1 : null;
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupIcon /> Players ({players?.length || 0})
        </Typography>
        <List>
          {players?.map((player, index) => (
            <ListItem
              key={player.id}
              divider={index !== players.length - 1}
              sx={{
                bgcolor: theme.palette.background.default,
                borderRadius: 1,
                mb: 1
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon />
                    <Typography variant="body1">{player.name}</Typography>
                    {getPlayerTeam(player.id) && (
                      <Typography
                        variant="caption"
                        sx={{
                          bgcolor: theme.palette.primary.main,
                          color: 'white',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1
                        }}
                      >
                        Team {getPlayerTeam(player.id)}
                      </Typography>
                    )}
                  </Box>
                }
                secondary={player.email}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

// Component for admin actions
const AdminActions = ({ game, onDistribute, onToggleStatus, isAdmin }) => {
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      if (confirmDialog.action === 'distribute') {
        await onDistribute();
      } else if (confirmDialog.action === 'toggle') {
        await onToggleStatus();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setConfirmDialog({ open: false, action: null });
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Admin Actions</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={() => setConfirmDialog({ open: true, action: 'distribute' })}
              disabled={game.isOpen || loading}
            >
              Distribute Teams
            </Button>
            <Button
              variant="contained"
              color={game.isOpen ? "error" : "success"}
              startIcon={game.isOpen ? <LockIcon /> : <LockOpenIcon />}
              onClick={() => setConfirmDialog({ open: true, action: 'toggle' })}
              disabled={loading}
            >
              {game.isOpen ? 'Close Game' : 'Reopen Game'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null })}>
        <DialogTitle>
          {confirmDialog.action === 'distribute' ? 'Distribute Teams?' : 
           game.isOpen ? 'Close Game?' : 'Reopen Game?'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.action === 'distribute' 
              ? 'This will randomly distribute all players into teams.'
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
  const { gameId } = useParams();
  const { currentUser } = useAuth();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const adminStatus = await checkAdminStatus(currentUser?.uid);
      setIsAdmin(adminStatus);
    };
    checkAdmin();
  }, [currentUser]);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const gameDoc = await getDoc(doc(db, 'games', gameId));
        if (gameDoc.exists()) {
          setGame({ id: gameDoc.id, ...gameDoc.data() });
        } else {
          setError('Game not found');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [gameId]);

  const handleDistribute = async () => {
    try {
      await distributePlayersRandomly(gameId);
      // Refresh game data
      const gameDoc = await getDoc(doc(db, 'games', gameId));
      setGame({ id: gameDoc.id, ...gameDoc.data() });
    } catch (error) {
      console.error('Error distributing teams:', error);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const result = await toggleGameStatus(gameId);
      // Refresh game data
      const gameDoc = await getDoc(doc(db, 'games', gameId));
      setGame({ id: gameDoc.id, ...gameDoc.data() });
    } catch (error) {
      console.error('Error toggling game status:', error);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!game) return <Typography>No game found</Typography>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <GameHeader game={game} />
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <PlayersList players={game.players} pairs={game.pairs} />
        </Grid>
        <Grid item xs={12} md={4}>
          <AdminActions 
            game={game}
            onDistribute={handleDistribute}
            onToggleStatus={handleToggleStatus}
            isAdmin={isAdmin}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default GameDetail;
