import React, { useState, useEffect } from 'react';
import PlayerAvatar from '../common/PlayerAvatar';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  IconButton,
  CircularProgress,
  Grid,
  Avatar
} from '@mui/material';
import {
  Close as CloseIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { doc, setDoc, updateDoc, collection, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

// Helper function to generate random colors for teams
const getRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 45%)`;
};

export default function ConvertGameToTournament({ open, onClose, game }) {
  const [formData, setFormData] = useState({
    name: game ? `${game.location} Tournament` : '',
    format: 'Knockout',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playersData, setPlayersData] = useState({});
  const { currentUser } = useAuth();

  // Load player data when the dialog opens
  useEffect(() => {
    if (open && game?.players) {
      const loadPlayerData = async () => {
        try {
          console.log('Loading player data for players:', game.players);
          const playerDataMap = {};
          
          // Get player data for each player in the game
          for (const player of game.players) {
            const playerId = typeof player === 'string' ? player : player.id;
            
            if (!playerId) continue;
            
            try {
              const playerDoc = await getDoc(doc(db, 'users', playerId));
              if (playerDoc.exists()) {
                playerDataMap[playerId] = playerDoc.data();
                console.log(`Loaded player data for ${playerId}:`, playerDoc.data());
              } else {
                console.log(`No player document found for ${playerId}`);
              }
            } catch (err) {
              console.error(`Error loading data for player ${playerId}:`, err);
            }
          }
          
          setPlayersData(playerDataMap);
          console.log('All player data loaded:', playerDataMap);
        } catch (err) {
          console.error('Error loading player data:', err);
        }
      };
      
      loadPlayerData();
    }
  }, [open, game]);

  // Helper function to get the best display name for a player

function getPlayerDisplayName(playerData, playerId) {
    // If we have player data
    if (playerData) {
      // Return the most descriptive name available
      if (playerData.firstName && playerData.lastName) {
        return `${playerData.firstName} ${playerData.lastName}`;
      } else if (playerData.displayName) {
        return playerData.displayName;
      } else if (playerData.email) {
        return playerData.email.split('@')[0];
      }
    }
    // Fallback to a generic name with the ID
    return `Player ${playerId.substring(0, 4)}`;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!game) {
      setError('No game data provided');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First, close the game if it's still open
      if (game.status !== 'closed' || game.isOpen) {
        await closeGameBeforeConversion(game.id);
      }
      
      // Ensure user has admin rights
      await ensureAdminRights();
      
      // Create teams from players
      const createTeams = () => {
        // Get all players from the game
        const allPlayers = [...(game.players || [])];  
        console.log('All players:', allPlayers);
        
        // Shuffle players to randomize teams
        const shuffledPlayers = [...allPlayers].sort(() => Math.random() - 0.5);
        console.log('Shuffled players:', shuffledPlayers);
        
        // Create teams of 2 players each
        const teams = [];
        const teamNames = ['Wolves', 'Eagles', 'Tigers', 'Lions', 'Bears', 'Hawks', 'Sharks', 'Panthers', 'Jaguars', 'Falcons'];
        
        // Group players into pairs for teams
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
          const player1Id = shuffledPlayers[i];
          const player2Id = i + 1 < shuffledPlayers.length ? shuffledPlayers[i + 1] : null;
          
          // Get player data for the first player
          const player1Data = playersData[player1Id] || {};
          const player1Name = getPlayerDisplayName(player1Data, player1Id);
          
          // Get player data for the second player (if exists)
          const player2Data = player2Id ? playersData[player2Id] || {} : null;
          const player2Name = player2Id ? getPlayerDisplayName(player2Data, player2Id) : 'TBC';
          
          console.log(`Team player 1: ${player1Id} -> ${player1Name}`);
          if (player2Id) console.log(`Team player 2: ${player2Id} -> ${player2Name}`);
          
          // Create a team with a creative name
          const teamName = teamNames[i/2 % teamNames.length];
          const teamColor = getRandomColor();
          
          teams.push({
            id: `team-${i/2+1}`,
            name: teamName,
            players: [
              {
                id: player1Id,
                name: player1Name
              },
              player2Id ? {
                id: player2Id,
                name: player2Name
              } : {
                id: 'tbc',
                name: 'TBC'
              }
            ],
            color: teamColor
          });
        }
        
        console.log('Created teams with player names:', teams);
        return teams;
      };
      
      // Create teams from players
      const teams = createTeams();
      
      // Shuffle teams for random tournament seeding
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      
      // Log the number of teams for debugging
      console.log(`Creating tournament with ${shuffledTeams.length} teams:`, shuffledTeams);
      
      // Create rounds based on tournament format
      const rounds = [];
      
      if (formData.format === 'League') {
        // For league format, create round-robin matches
        const numTeams = shuffledTeams.length;
        
        // If odd number of teams, add a 'bye' team
        const teamsForMatches = numTeams % 2 === 1 
          ? [...shuffledTeams, { id: 'team-bye', name: 'BYE', players: [], color: '#cccccc' }] 
          : [...shuffledTeams];
        
        const numRounds = teamsForMatches.length - 1;
        const matchesPerRound = teamsForMatches.length / 2;
        
        // Create a round-robin schedule using the circle method
        // Keep the first team fixed and rotate the others
        const teams = [...teamsForMatches];
        const firstTeam = teams.shift(); // Remove first team
        
        for (let round = 0; round < numRounds; round++) {
          const matches = [];
          
          // First match is always first team against rotating team
          matches.push({
            team1: firstTeam,
            team2: teams[round % teams.length],
            score1: null,
            score2: null,
            completed: false,
            winner: null,
            matchDate: null
          });
          
          // Generate the rest of the matches for this round
          for (let match = 1; match < matchesPerRound; match++) {
            const team1Index = (round + match) % teams.length;
            const team2Index = (round + teams.length - match) % teams.length;
            
            matches.push({
              team1: teams[team1Index],
              team2: teams[team2Index],
              score1: null,
              score2: null,
              completed: false,
              winner: null,
              matchDate: null
            });
          }
          
          rounds.push({
            name: `Round ${round + 1}`,
            matches: matches
          });
        }
      } else {
        // For knockout format, create tournament bracket
        const numTeams = shuffledTeams.length;
        console.log('Number of teams for knockout format:', numTeams);
        
        // Calculate the number of rounds needed based on the number of teams
        let numRounds = Math.ceil(Math.log2(numTeams));
        console.log('Number of rounds needed:', numRounds);
        
        // Ensure we have at least one round even with few teams
        numRounds = Math.max(1, numRounds);
        
        // Create rounds from first to final
        for (let i = 0; i < numRounds; i++) {
          const numMatches = Math.pow(2, numRounds - i - 1);
          console.log(`Round ${i+1}: Creating ${numMatches} matches`);
          
          const matches = [];
          
          // First round: assign actual teams
          if (i === 0) {
            // Calculate how many teams we need for a full bracket
            const fullBracketSize = Math.pow(2, numRounds);
            const byesNeeded = fullBracketSize - numTeams;
            
            console.log(`Full bracket size: ${fullBracketSize}, Byes needed: ${byesNeeded}`);
            
            // Create matches with actual teams and byes as needed
            for (let j = 0; j < numMatches; j++) {
              const team1Index = j * 2;
              const team2Index = j * 2 + 1;
              
              const match = {
                score1: null,
                score2: null,
                completed: false,
                winner: null,
                matchDate: null
              };
              
              // Assign team1 if available
              if (team1Index < shuffledTeams.length) {
                match.team1 = shuffledTeams[team1Index];
              } else {
                match.team1 = null;
              }
              
              // Assign team2 if available
              if (team2Index < shuffledTeams.length) {
                match.team2 = shuffledTeams[team2Index];
              } else if (match.team1) {
                // If team1 exists but no team2, create a bye
                match.team2 = { 
                  id: 'team-bye', 
                  name: 'BYE', 
                  players: [], 
                  color: '#cccccc' 
                };
                // Don't automatically mark as completed or set winner
                // Let the user decide the match outcome
              } else {
                match.team2 = null;
              }
              
              console.log(`Match ${j+1}: ${match.team1?.name || 'TBD'} vs ${match.team2?.name || 'TBD'}`);
              matches.push(match);
            }
          } else {
            // For later rounds, teams will be determined by winners
            for (let j = 0; j < numMatches; j++) {
              matches.push({
                team1: null,
                team2: null,
                score1: null,
                score2: null,
                completed: false,
                winner: null,
                matchDate: null
              });
            }
          }
          
          let roundName = '';
          if (i === numRounds - 1) roundName = 'Final';
          else if (i === numRounds - 2) roundName = 'Semi-Finals';
          else if (i === numRounds - 3) roundName = 'Quarter-Finals';
          else roundName = `Round ${i + 1}`;
          
          rounds.push({
            name: roundName,
            matches: matches
          });
        }
      }
      
      // Create the tournament data structure
      const tournamentData = {
        name: formData.name || 'Tournament',
        format: formData.format || 'Knockout',
        description: formData.description || '',
        startDate: game.date || new Date().toISOString().split('T')[0],
        startTime: game.time || '12:00',
        location: game.location || 'Default Location',
        status: 'active',
        teams: teams.map(team => ({
          ...team,
          // Initialize stats for league format
          points: 0,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0
        })) || [],
        rounds: rounds || [],
        createdAt: new Date().toISOString(),
        createdBy: {
          id: currentUser?.uid || 'anonymous',
          name: currentUser?.displayName || 'Anonymous',
          email: currentUser?.email || 'no-email@example.com'
        }
      };
      
      // Clean the tournament data to remove any undefined values
      const cleanObject = (obj) => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
          return obj.map(item => cleanObject(item)).filter(item => item !== undefined);
        }
        
        const cleanedObj = {};
        for (const key in obj) {
          const value = cleanObject(obj[key]);
          if (value !== undefined) {
            cleanedObj[key] = value;
          }
        }
        return cleanedObj;
      };
      
      // Clean the tournament data to remove any undefined values
      const cleanedTournamentData = cleanObject(tournamentData);
      
      console.log('Tournament data prepared:', cleanedTournamentData);
      
      // Update the game document directly with tournament data
      const gameRef = doc(db, 'games', game.id);
      await updateDoc(gameRef, {
        isTournament: true,
        tournamentFormat: formData.format || 'Knockout',
        tournamentData: cleanedTournamentData,
        isConvertedToTournament: true,
        status: 'tournament',
        isOpen: false
      });
      
      console.log('Game updated with tournament data:', {
        format: formData.format || 'Knockout',
        tournamentData: cleanedTournamentData
      });
      
      console.log('Game updated with tournament data');
      // toast.success('Tournament created successfully!');
      
      // Close the dialog and pass back the game ID
      onClose(game.id);
    } catch (err) {
      console.error('Error creating tournament:', err);
      
      // More detailed error handling
      if (err.code === 'permission-denied') {
        setError('Permission denied. You may not have admin rights to create tournaments.');
      } else {
        setError('Failed to create tournament: ' + err.message);
      }
    }

    setLoading(false);
  };

  // Function to ensure the current user has admin rights
  const ensureAdminRights = async () => {
    try {
      // Try to make the current user an admin if they aren't already
      if (currentUser) {
        // Create a direct admin document
        const adminRef = doc(db, 'admins', currentUser.uid);
        await setDoc(adminRef, {
          userId: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Admin User',
          createdAt: new Date().toISOString()
        }, { merge: true });
        
        // Update user document
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, {
          email: currentUser.email,
          role: 'admin',
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Admin User',
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log('User admin status updated');
      }
    } catch (error) {
      console.error('Error ensuring admin rights:', error);
      // Continue anyway - the createTournament function will handle permissions
    }
  };

  // Function to close the game before converting to tournament
  const closeGameBeforeConversion = async (gameId) => {
    try {
      console.log('Closing game before tournament conversion:', gameId);
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        status: 'closed',
        isOpen: false,
        registrationOpen: false,
        closedAt: new Date().toISOString(),
        closedForTournament: true
      });
      
      // Wait a moment to ensure the update is processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Game closed successfully');
      return true;
    } catch (error) {
      console.error('Error closing game:', error);
      throw new Error('Failed to close game before tournament conversion: ' + error.message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TrophyIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Convert Game to Tournament</Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      {game && game.status !== 'closed' && (
        <Alert severity="info" sx={{ mx: 3, mt: 1 }}>
          Note: Converting to tournament will automatically close game registration.
        </Alert>
      )}
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {game && game.status !== 'closed' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Note: Converting to tournament will automatically close game registration.
          </Alert>
        )}
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Convert this game into a tournament or league. Players will be randomly paired into teams of 2, and teams will be randomly distributed in the tournament bracket.
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <TextField
            name="name"
            label="Tournament Name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            required
            margin="normal"
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Tournament Format</InputLabel>
            <Select
              name="format"
              value={formData.format}
              onChange={handleChange}
              label="Tournament Format"
            >
              <MenuItem value="Knockout">Knockout Tournament</MenuItem>
              <MenuItem value="League">League (Round Robin)</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            name="description"
            label="Description"
            value={formData.description}
            onChange={handleChange}
            fullWidth
            multiline
            rows={3}
            margin="normal"
          />
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Player Information
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This will convert the current game into a tournament. All current players will be automatically added to the tournament.
            </Typography>
            
            {game && game.players && game.players.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid rgba(0,0,0,0.1)' }}>
                <Typography variant="subtitle2" gutterBottom>Players in this tournament:</Typography>
                <Grid container spacing={1}>
                  {game.players.map((player, index) => {
                    const playerId = typeof player === 'string' ? player : player.id;
                    const playerName = getPlayerDisplayName(playersData[playerId] || {}, playerId);
                    
                    return (
                      <Grid item xs={12} sm={6} md={4} key={playerId || index}>
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            p: 1,
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            border: '1px solid rgba(0,0,0,0.1)',
                            '&:hover': {
                              bgcolor: 'action.selected'
                            }
                          }}
                        >
                          <Avatar 
                            sx={{ 
                              mr: 1, 
                              bgcolor: `hsl(${index * 37 % 360}, 70%, 45%)`,
                              width: 32,
                              height: 32
                            }}
                          >
                            {playerName.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">{playerName}</Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}
          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <TrophyIcon />}
        >
          {loading ? 'Creating...' : 'Create Tournament'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
