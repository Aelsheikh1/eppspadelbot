import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Box,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Email as EmailIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { emailGameReport, GameReportDownloadLink } from '../../utils/pdfGenerator';
import { checkAdminStatus } from '../../utils/adminUtils';
import { distributeTeams } from '../../utils/playerDistribution';
import { getPlayerData } from '../../utils/playerUtils';
import EditGame from './EditGame';
import GameTimer from './GameTimer';

export default function GameDetails() {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [distributedTeams, setDistributedTeams] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  const makeUserAdmin = async () => {
    try {
      if (!auth.currentUser) {
        setError('Please log in first');
        return false;
      }

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        email: auth.currentUser.email,
        role: 'admin',
        name: auth.currentUser.displayName || auth.currentUser.email.split('@')[0]
      }, { merge: true });

      console.log('Successfully made user admin:', auth.currentUser.email);
      setError('Successfully made you an admin! Reloading...');
      setTimeout(() => window.location.reload(), 1500);
      return true;
    } catch (error) {
      console.error('Error making user admin:', error);
      setError('Failed to make you admin: ' + error.message);
      return false;
    }
  };

  useEffect(() => {
    const loadGameAndCheckAdmin = async () => {
      try {
        setLoading(true);
        
        if (!auth.currentUser) {
          console.log('No user logged in');
          navigate('/login');
          return;
        }

        // Check admin status
        const adminStatus = await checkAdminStatus(auth.currentUser.uid);
        console.log('Admin status:', adminStatus);
        setIsAdmin(adminStatus);

        // Load game details
        const gameDoc = await getDoc(doc(db, 'games', id));
        if (!gameDoc.exists()) {
          setError('Game not found');
          return;
        }

        const gameData = {
          id: gameDoc.id,
          ...gameDoc.data()
        };

        // Load player details
        if (gameData.players?.length > 0) {
          const playerPromises = gameData.players.map(async (playerId) => {
            // Handle if playerId is already an object
            const id = typeof playerId === 'object' ? playerId.id : playerId;
            return getPlayerData(id, auth.currentUser?.uid);
          });
          const playerDocs = await Promise.all(playerPromises);
          gameData.players = playerDocs;
        } else {
          gameData.players = [];
        }

        // Also handle pairs if they exist
        if (gameData.pairs?.length > 0) {
          const updatedPairs = await Promise.all(gameData.pairs.map(async (pair) => {
            const player1 = pair.player1 ? await getPlayerData(pair.player1.id || pair.player1, auth.currentUser?.uid) : null;
            const player2 = pair.player2 ? await getPlayerData(pair.player2.id || pair.player2, auth.currentUser?.uid) : null;
            return { ...pair, player1, player2 };
          }));
          gameData.pairs = updatedPairs;
        }

        setGame(gameData);
      } catch (err) {
        console.error('Error loading game:', err);
        setError('Failed to load game details');
      } finally {
        setLoading(false);
      }
    };

    loadGameAndCheckAdmin();
  }, [id, navigate]);

  const handleSendEmail = async () => {
    if (!isAdmin) {
      setError('Only admins can send emails');
      return;
    }

    try {
      setError('');
      const adminsSnapshot = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'admin'))
      );
      const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email).filter(Boolean);
      
      if (adminEmails.length === 0) {
        throw new Error('No admin emails found');
      }

      const teams = createTeams(game.players || []);
      await emailGameReport({ ...game, teams }, adminEmails);
      setError('Email sent successfully!');
    } catch (err) {
      setError('Failed to send email: ' + err.message);
    }
  };

  const handleCloseGame = async () => {
    if (!isAdmin) {
      setError('Only admins can close games');
      return;
    }

    try {
      setError('');
      await updateDoc(doc(db, 'games', id), {
        status: 'closed',
        closedAt: new Date().toISOString()
      });

      setGame(prev => ({
        ...prev,
        status: 'closed',
        closedAt: new Date().toISOString()
      }));

      // Automatically send email when game is closed
      try {
        await emailGameReport(id);
        setError('Game closed and notification sent to all participants');
      } catch (emailErr) {
        console.error('Failed to send email:', emailErr);
        setError('Game closed but failed to send notifications');
      }
    } catch (err) {
      setError('Failed to close game: ' + err.message);
    }
  };

  const handleReopenGame = async () => {
    if (!isAdmin) {
      setError('Only admins can reopen games');
      return;
    }

    try {
      await updateDoc(doc(db, 'games', id), {
        status: 'open',
        closedAt: null
      });
      setGame(prev => ({
        ...prev,
        status: 'open',
        closedAt: null
      }));
      setError('Game reopened successfully');
    } catch (err) {
      setError('Failed to reopen game: ' + err.message);
    }
  };

  const handleDistributeTeams = async () => {
    try {
      if (!game.players || game.players.length < 2) {
        setError('Need at least 2 players to distribute teams');
        return;
      }

      const teams = distributeTeams(game.players);
      setDistributedTeams(teams);

      // Update the game document with the distributed teams
      await updateDoc(doc(db, 'games', id), {
        pairs: teams
      });

      setGame(prev => ({
        ...prev,
        pairs: teams
      }));

      setError('Teams distributed successfully!');
    } catch (err) {
      console.error('Error distributing teams:', err);
      setError('Failed to distribute teams: ' + err.message);
    }
  };

  const handleEmailTeams = async () => {
    try {
      setError('');
      if (!game.pairs && game.players?.length >= 2) {
        await handleDistributeTeams();
      }
      await emailGameReport(game);
      setError('Email sent successfully to all players!');
    } catch (err) {
      console.error('Error sending email:', err);
      setError('Failed to send email: ' + err.message);
    }
  };

  const createTeams = (players) => {
    if (!players || players.length === 0) return [];
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const teams = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      teams.push({
        team: Math.floor(i/2) + 1,
        players: shuffled.slice(i, i + 2)
      });
    }
    return teams;
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!game) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Game not found'}</Alert>
      </Container>
    );
  }

  console.log('Rendering game details. isAdmin:', isAdmin);

  return (
    <Container maxWidth="lg">
      <GameTimer game={game} />
      {/* Debug Information */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
        <Typography variant="h6">Debug Info:</Typography>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {JSON.stringify({
            isUserLoggedIn: !!auth.currentUser,
            currentUser: auth.currentUser ? {
              uid: auth.currentUser.uid,
              email: auth.currentUser.email,
              displayName: auth.currentUser.displayName
            } : null,
            isAdmin,
            gameId: id,
            gameData: game
          }, null, 2)}
        </pre>
      </Paper>

      {error && (
        <Alert 
          severity={error.includes('Successfully') || error.includes('sent') ? 'success' : 'error'} 
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}
      
      {/* Make Admin Button */}
      {auth.currentUser && !isAdmin && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={makeUserAdmin}
            startIcon={<AdminIcon />}
            size="large"
          >
            Make Me Admin
          </Button>
        </Box>
      )}
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Game Details</Typography>
          {isAdmin && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="contained" 
                onClick={() => setOpenEdit(true)} 
                startIcon={<EditIcon />}
              >
                Edit
              </Button>
              <Button 
                variant="contained" 
                color="info" 
                onClick={handleSendEmail} 
                startIcon={<EmailIcon />}
              >
                Email Report
              </Button>
              <GameReportDownloadLink game={game}>
                <Button 
                  variant="contained" 
                  color="secondary"
                  startIcon={<DownloadIcon />}
                >
                  Download PDF
                </Button>
              </GameReportDownloadLink>
              {game.status === 'open' ? (
                <Button 
                  variant="contained" 
                  color="error" 
                  onClick={handleCloseGame} 
                  startIcon={<CloseIcon />}
                >
                  Close Game
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  color="success" 
                  onClick={handleReopenGame} 
                  startIcon={<RefreshIcon />}
                >
                  Reopen Game
                </Button>
              )}
              <Button
                variant="outlined"
                color="error"
                onClick={() => setOpenDelete(true)}
                startIcon={<DeleteIcon />}
              >
                Delete
              </Button>
            </Box>
          )}
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Game Information
            </Typography>
            <List>
              <ListItem>
                <ListItemText primary="Date" secondary={game.date} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Time" secondary={game.time} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Location" secondary={game.location} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Status" secondary={game.status} />
              </ListItem>
            </List>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Players ({game.players?.length || 0} / {game.maxPlayers})
            </Typography>
            <List>
              {game.players?.map((player) => (
                <ListItem key={player.id}>
                  <ListItemAvatar>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={player.displayName || player.name || player.email?.split('@')[0] || 'Player'}
                    secondary={player.email}
                  />
                </ListItem>
              ))}
              {(!game.players || game.players.length === 0) && (
                <ListItem>
                  <ListItemText 
                    primary="No players have joined yet"
                    secondary="Be the first to join!"
                  />
                </ListItem>
              )}
            </List>
          </Grid>
        </Grid>

        {game.players?.length >= 2 && (
          <Grid item xs={12}>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleDistributeTeams}
                startIcon={<RefreshIcon />}
              >
                Distribute Teams
              </Button>
              <Button
                variant="contained"
                color="info"
                onClick={handleEmailTeams}
                startIcon={<EmailIcon />}
              >
                Email Teams
              </Button>
            </Box>

            {(game.pairs || distributedTeams) && (
              <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Distributed Teams
                </Typography>
                <Grid container spacing={2}>
                  {(game.pairs || distributedTeams).map((pair, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Paper
                        elevation={2}
                        sx={{
                          p: 2,
                          bgcolor: '#f8f9fa',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}
                      >
                        <Typography variant="subtitle1" gutterBottom>
                          Team {index + 1}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                          <Typography>
                            {pair.player1?.displayName || pair.player1?.name || 'TBD'}
                          </Typography>
                          {pair.player2 && (
                            <>
                              <Typography>-</Typography>
                              <Avatar>
                                <PersonIcon />
                              </Avatar>
                              <Typography>
                                {pair.player2?.displayName || pair.player2?.name || 'TBD'}
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
          </Grid>
        )}
      </Paper>

      <EditGame 
        open={openEdit} 
        onClose={() => setOpenEdit(false)} 
        game={game}
        onSuccess={() => {
          setOpenEdit(false);
          window.location.reload();
        }}
      />

      <Dialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
      >
        <DialogTitle>Delete Game</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this game?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button 
            onClick={async () => {
              try {
                await deleteDoc(doc(db, 'games', id));
                navigate('/games');
              } catch (err) {
                setError('Failed to delete game: ' + err.message);
                setOpenDelete(false);
              }
            }} 
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}