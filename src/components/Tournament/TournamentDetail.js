import React, { useState, useEffect } from 'react';
import { getPlayersData } from '../../utils/playerUtils';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  EmojiEvents as TrophyIcon,
  TableChart as TableChartIcon,
  Star as StarIcon,
  Scoreboard as ScoreboardIcon,
  Sports as SportsIcon,
  Groups as GroupsIcon,
  Leaderboard as LeaderboardIcon,
  ScreenRotation as RotationIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import { db } from '../../services/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import TournamentVisualizerEnhanced from './TournamentVisualizerEnhanced';
import LeagueTable from './LeagueTable';

// Helper for fallback player names
const getPlayerName = (player) => player?.name || player?.displayName || player?.email || 'TBC';

// Helper for creative team color with predefined team names
const getTeamColor = (index) => {
  // Predefined team colors for consistency
  const colors = [
    '#f44336', // Wolves - Red
    '#9c27b0', // Eagles - Purple
    '#ff9800', // Tigers - Orange
    '#4caf50', // Bears - Green
    '#2196f3', // Dolphins - Blue
    '#607d8b', // Sharks - Blue Grey
    '#795548', // Lions - Brown
    '#009688', // Panthers - Teal
    '#e91e63', // Hawks - Pink
    '#3f51b5', // Falcons - Indigo
  ];
  
  return colors[index % colors.length];
};

export default function TournamentDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [gameDetails, setGameDetails] = useState(null);
  const [playersById, setPlayersById] = useState({});
  const [isRotated, setIsRotated] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Function to request screen rotation on mobile
  const handleRotateScreen = () => {
    if (typeof window !== 'undefined' && window.screen && window.screen.orientation) {
      try {
        if (window.screen.orientation.type.includes('portrait')) {
          window.screen.orientation.lock('landscape')
            .then(() => setIsRotated(true))
            .catch(err => console.error('Could not lock screen orientation:', err));
        } else {
          window.screen.orientation.lock('portrait')
            .then(() => setIsRotated(false))
            .catch(err => console.error('Could not lock screen orientation:', err));
        }
      } catch (error) {
        console.error('Screen orientation API error:', error);
        alert('Please rotate your device manually for a better view of the tournament bracket.');
      }
    } else {
      alert('Please rotate your device manually for a better view of the tournament bracket.');
    }
  };

  // Function to toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(err => {
          console.error('Error attempting to exit fullscreen:', err);
        });
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    setError('');
    
    // Direct Firestore listener for real-time updates
    const docRef = doc(db, 'games', id);
    
    const unsubscribe = onSnapshot(docRef, (gameDoc) => {
      console.log('[TournamentDetail] Received Firestore update:', gameDoc.id);
      
      if (!gameDoc.exists()) {
        setError('Tournament not found');
        setLoading(false);
        return;
      }
      
      const gameData = gameDoc.data();
      console.log('[TournamentDetail] Tournament data received');
      
      if (!gameData.isTournament || !gameData.tournamentData) {
        setError('This game is not a tournament');
        setLoading(false);
        return;
      }
      
      // Update tournament state with latest data
      const newTournament = {
        id: gameDoc.id,
        ...gameData.tournamentData,
        format: gameData.tournamentFormat || gameData.tournamentData.format || 'Knockout',
        date: gameData.date,
        time: gameData.time,
        location: gameData.location,
        currentUserEmail: currentUser?.email || ''
      };
      
      // Store game details for display
      setGameDetails({
        date: gameData.date,
        time: gameData.time,
        location: gameData.location
      });
      
      console.log('[TournamentDetail] Teams:', newTournament.teams?.length, 
        'Rounds:', newTournament.bracketRounds?.length,
        'Matches:', newTournament.bracketRounds?.reduce((total, round) => 
          total + (round.matches?.length || 0), 0));
      
      // Log a completed match for debugging
      const completedMatch = newTournament.bracketRounds?.flatMap(r => r.matches || [])
        .find(m => m.completed);
      if (completedMatch) {
        console.log('[TournamentDetail] Sample completed match:', 
          'Team1:', completedMatch.team1?.name,
          'Team2:', completedMatch.team2?.name,
          'Score:', completedMatch.score1 + '-' + completedMatch.score2);
      }
      
      // Gather all unique player IDs from teams and matches
      let allPlayerIds = [];
      if (newTournament.teams) {
        newTournament.teams.forEach(team => {
          if (team.players) {
            team.players.forEach(player => {
              if (player && player.id) allPlayerIds.push(player.id);
            });
          }
        });
      }
      if (newTournament.bracketRounds) {
        newTournament.bracketRounds.forEach(round => {
          if (round.matches) {
            round.matches.forEach(match => {
              ['team1', 'team2'].forEach(key => {
                const team = match[key];
                if (team && team.players) {
                  team.players.forEach(player => {
                    if (player && player.id) allPlayerIds.push(player.id);
                  });
                }
              });
            });
          }
        });
      }
      allPlayerIds = Array.from(new Set(allPlayerIds));
      // Fetch player data and update state
      getPlayersData(allPlayerIds, currentUser?.uid).then(setPlayersById);

      setTournament(newTournament);
      setLoading(false);
    }, (error) => {
      console.error('[TournamentDetail] Firestore error:', error);
      setError('Failed to load tournament data: ' + error.message);
      setLoading(false);
    });
    
    return () => {
      // Cleanup function to unsubscribe from Firestore
      unsubscribe();
    };
  }, [id]);

  if (loading) return <Box mt={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Box mt={4}><Alert severity="error">{error}</Alert></Box>;
  if (!tournament) return null;

  // Format tournament data for the enhanced visualizer
  const formatTournamentData = () => {
    if (!tournament) return { rounds: [], teams: [], format: 'knockout' };

    // Creative team names if not provided
    const teamNames = [
      'Wolves', 'Eagles', 'Tigers', 'Bears', 'Dolphins',
      'Sharks', 'Lions', 'Panthers', 'Hawks', 'Falcons',
      'Jaguars', 'Rhinos', 'Cobras', 'Vipers', 'Dragons'
    ];

    // Format teams with proper structure and colors, and inject full player data
    const teams = [];
    const teamMap = {}; // To maintain team identity across rounds

    if (tournament.teams && tournament.teams.length > 0) {
      tournament.teams.forEach((team, idx) => {
        const teamName = team.name || teamNames[idx % teamNames.length];
        const formattedTeam = {
          id: team.id || `team${idx+1}`,
          name: teamName,
          color: team.color || getTeamColor(idx),
          players: []
        };
        // Process players, ensuring each team has exactly 2 players and inject full player data
        if (team.players && team.players.length > 0) {
          // Add first player
          let playerA = team.players[0];
          let playerAFull = (playerA && playerA.id && playersById[playerA.id]) ? playersById[playerA.id] : { id: playerA?.id || `p${idx}a`, name: getPlayerName(playerA) };
          formattedTeam.players.push(playerAFull);
          // Add second player (or TBC if missing)
          if (team.players.length > 1) {
            let playerB = team.players[1];
            let playerBFull = (playerB && playerB.id && playersById[playerB.id]) ? playersById[playerB.id] : { id: playerB?.id || `p${idx}b`, name: getPlayerName(playerB) };
            formattedTeam.players.push(playerBFull);
          } else {
            formattedTeam.players.push({ id: `p${idx}b`, name: 'TBC' });
          }
        } else {
          formattedTeam.players = [
            { id: `p${idx}a`, name: 'TBC' },
            { id: `p${idx}b`, name: 'TBC' }
          ];
        }
        teams.push(formattedTeam);
        teamMap[formattedTeam.id] = formattedTeam;
      });
    }

    // Format rounds for the visualizer, ensuring team consistency and full player data
    const rounds = [];
    if (tournament.bracketRounds && tournament.bracketRounds.length > 0) {
      tournament.bracketRounds.forEach((round, roundIdx) => {
        const formattedRound = {
          name: round.name || `Round ${roundIdx + 1}`,
          matches: []
        };
        if (round.matches && round.matches.length > 0) {
          round.matches.forEach((match, matchIdx) => {
            const formattedMatch = {
              id: match.id || `match${roundIdx}_${matchIdx}`,
              completed: match.completed || false,
              score1: match.score1,
              score2: match.score2,
              winner: match.winner
            };
            // Process team1
            if (match.team1) {
              let team1 = teamMap[match.team1.id] || {
                id: match.team1.id || `team${matchIdx*2+1}`,
                name: match.team1.name || teamNames[(matchIdx*2) % teamNames.length],
                color: match.team1.color || getTeamColor(matchIdx*2),
                players: match.team1.players && match.team1.players.length > 0 ?
                  match.team1.players.map((p, i) => (p && p.id && playersById[p.id]) ? playersById[p.id] : { id: p?.id || `p${matchIdx*2}${i===0?'a':'b'}`, name: getPlayerName(p) }) :
                  [{ id: `p${matchIdx*2}a`, name: 'TBC' }, { id: `p${matchIdx*2}b`, name: 'TBC' }]
              };
              formattedMatch.team1 = team1;
            }
            // Process team2
            if (match.team2) {
              let team2 = teamMap[match.team2.id] || {
                id: match.team2.id || `team${matchIdx*2+2}`,
                name: match.team2.name || teamNames[(matchIdx*2+1) % teamNames.length],
                color: match.team2.color || getTeamColor(matchIdx*2+1),
                players: match.team2.players && match.team2.players.length > 0 ?
                  match.team2.players.map((p, i) => (p && p.id && playersById[p.id]) ? playersById[p.id] : { id: p?.id || `p${matchIdx*2+1}${i===0?'a':'b'}`, name: getPlayerName(p) }) :
                  [{ id: `p${matchIdx*2+1}a`, name: 'TBC' }, { id: `p${matchIdx*2+1}b`, name: 'TBC' }]
              };
              formattedMatch.team2 = team2;
            }
            formattedRound.matches.push(formattedMatch);
          });
        }
        rounds.push(formattedRound);
      });
    }
    return {
      rounds,
      teams,
      format: tournament.format || 'knockout'
    };
  };
  
  const tournamentData = formatTournamentData();

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, px: 2 }}>
      <Paper 
        elevation={isDarkMode ? 6 : 3} 
        sx={{ 
          p: 3, 
          borderRadius: 2, 
          mb: 4,
          bgcolor: (theme) => theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.8) 
            : theme.palette.background.paper,
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.3)'
            : undefined,
          border: (theme) => theme.palette.mode === 'dark'
            ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
            : 'none'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center', 
          mb: 2,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrophyIcon sx={{ 
              color: isDarkMode ? '#FFD700' : '#ffc107', 
              fontSize: 32, 
              mr: 2,
              filter: isDarkMode ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.3))' : 'none'
            }} />
            <Typography variant="h4" component="h1" sx={{ 
              color: (theme) => theme.palette.mode === 'dark' 
                ? theme.palette.primary.light 
                : '#1a237e', 
              fontWeight: 'bold',
              textShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
            }}>
              {tournament.name || 'Tournament Details'}
            </Typography>
          </Box>
          
          {/* Mobile controls */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Rotate screen for better view">
              <IconButton 
                onClick={handleRotateScreen} 
                size="small"
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                  },
                  display: { xs: 'flex', md: 'none' }
                }}
              >
                <RotationIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}>
              <IconButton 
                onClick={toggleFullscreen} 
                size="small"
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                  }
                }}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          <Chip 
            icon={<SportsIcon />} 
            label={`Format: ${tournament.format}`} 
            color="primary" 
            variant={isDarkMode ? "default" : "outlined"}
            sx={{
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? alpha(theme.palette.primary.main, 0.15)
                : undefined,
              border: (theme) => theme.palette.mode === 'dark'
                ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                : undefined,
              '& .MuiChip-icon': {
                color: (theme) => theme.palette.mode === 'dark'
                  ? theme.palette.primary.light
                  : undefined
              }
            }}
          />
          <Chip 
            icon={<GroupsIcon />} 
            label={`Teams: ${tournamentData.teams.length}`} 
            color="secondary" 
            variant={isDarkMode ? "default" : "outlined"}
            sx={{
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? alpha(theme.palette.secondary.main, 0.15)
                : undefined,
              border: (theme) => theme.palette.mode === 'dark'
                ? `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`
                : undefined,
              '& .MuiChip-icon': {
                color: (theme) => theme.palette.mode === 'dark'
                  ? theme.palette.secondary.light
                  : undefined
              }
            }}
          />
          {tournament.status && (
            <Chip 
              icon={tournament.status === 'Completed' ? <StarIcon /> : <ScoreboardIcon />} 
              label={`Status: ${tournament.status}`} 
              color={tournament.status === 'Completed' ? 'success' : 'info'} 
              variant={isDarkMode ? "default" : "outlined"}
              sx={{
                bgcolor: (theme) => {
                  if (!theme.palette.mode === 'dark') return undefined;
                  return tournament.status === 'Completed'
                    ? alpha(theme.palette.success.main, 0.15)
                    : alpha(theme.palette.info.main, 0.15);
                },
                border: (theme) => {
                  if (!theme.palette.mode === 'dark') return undefined;
                  return tournament.status === 'Completed'
                    ? `1px solid ${alpha(theme.palette.success.main, 0.3)}`
                    : `1px solid ${alpha(theme.palette.info.main, 0.3)}`;
                },
                '& .MuiChip-icon': {
                  color: (theme) => {
                    if (!theme.palette.mode === 'dark') return undefined;
                    return tournament.status === 'Completed'
                      ? theme.palette.success.light
                      : theme.palette.info.light;
                  }
                }
              }}
            />
          )}
        </Box>
        
        <Divider sx={{ 
          mb: 3,
          borderColor: (theme) => theme.palette.mode === 'dark' 
            ? alpha(theme.palette.divider, 0.5) 
            : theme.palette.divider 
        }} />
        
        {tournament.format.toLowerCase() === 'league' && (
          <Box 
            sx={{ 
              mt: 2,
              position: 'relative',
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? alpha(theme.palette.background.paper, 0.4) 
                : alpha(theme.palette.background.paper, 1),
              borderRadius: 2,
              p: 2,
              border: (theme) => theme.palette.mode === 'dark'
                ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                : 'none',
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 4px 20px rgba(0, 0, 0, 0.2)'
                : 'none',
              transition: 'all 0.3s ease-in-out',
              ...(isRotated && {
                height: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              })
            }}
          >
            {!loading && tournamentData && (
              <LeagueTable rounds={tournamentData.rounds} teams={tournamentData.teams} />
            )}
          </Box>
        )}
        {tournament.format.toLowerCase() === 'knockout' && (
          <Box 
            sx={{ 
              mt: 2,
              position: 'relative',
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? alpha(theme.palette.background.paper, 0.4) 
                : alpha(theme.palette.background.paper, 1),
              borderRadius: 2,
              p: 2,
              border: (theme) => theme.palette.mode === 'dark'
                ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                : 'none',
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 4px 20px rgba(0, 0, 0, 0.2)'
                : 'none',
              transition: 'all 0.3s ease-in-out',
              ...(isRotated && {
                height: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              })
            }}
          >
            {!loading && tournamentData && (
              <TournamentVisualizerEnhanced
                rounds={tournamentData.rounds}
                teams={tournamentData.teams}
                format="knockout"
                displayDate={tournament.date || ''}
                displayTime={tournament.time || ''}
                currentUserEmail={currentUser?.email || ''}
                isDarkMode={isDarkMode}
              />
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
