import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function PlayerDashboard() {
  const [myGames, setMyGames] = useState([]);
  const [error, setError] = useState('');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyGames();
  }, [currentUser]);

  async function fetchMyGames() {
    try {
      const gamesRef = collection(db, 'games');
      const q = query(
        gamesRef,
        where('players', 'array-contains', currentUser.email)
      );
      const querySnapshot = await getDocs(q);
      const gamesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMyGames(gamesData);
    } catch (error) {
      setError('Failed to fetch your games');
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      setError('Failed to log out');
    }
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          My Dashboard
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/games')}
            sx={{ mr: 2 }}
          >
            Browse Games
          </Button>
          <Button variant="outlined" color="secondary" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
        My Games
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Players</TableCell>
              <TableCell>Teams</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {myGames.map((game) => (
              <TableRow key={game.id}>
                <TableCell>{game.date}</TableCell>
                <TableCell>{game.time}</TableCell>
                <TableCell>{game.duration} minutes</TableCell>
                <TableCell>{game.players.join(', ')}</TableCell>
                <TableCell>
                  {game.teams ? (
                    <>
                      Team 1: {game.teams.team1.join(', ')}<br />
                      Team 2: {game.teams.team2.join(', ')}
                    </>
                  ) : (
                    'Teams not formed'
                  )}
                </TableCell>
                <TableCell>{game.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
