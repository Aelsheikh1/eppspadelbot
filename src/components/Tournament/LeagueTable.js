import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import PlayerAvatar from '../common/PlayerAvatar';
import {
  TableChart as TableChartIcon,
  Star as StarIcon,
  EmojiEvents as WinnerIcon,
} from '@mui/icons-material';

// Component to display league table
const LeagueTable = ({ teams, rounds }) => {
  useEffect(() => {
    console.log('[LeagueTable] Received teams:', teams?.length);
    console.log('[LeagueTable] Received rounds:', rounds?.length);
    if (rounds) {
      const completedMatches = rounds.flatMap(r => r.matches || []).filter(m => m.completed);
      console.log('[LeagueTable] Completed matches:', completedMatches.length);
      if (completedMatches.length > 0) {
        console.log('[LeagueTable] Sample completed match:', completedMatches[0]);
      }
    }
  }, [teams, rounds]);

  if (!teams || teams.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          League table not yet generated
        </Typography>
      </Box>
    );
  }

  // Calculate team stats manually to ensure it works
  const teamsWithStats = teams.map(team => ({
    ...team,
    points: 0,
    played: 0,
    won: 0,
    lost: 0
  }));
  
  // Process all matches to calculate stats
  if (rounds && rounds.length > 0) {
    rounds.forEach(round => {
      if (round.matches && round.matches.length > 0) {
        round.matches.forEach(match => {
          // Only count completed matches
          if (match.completed && match.team1 && match.team2 && 
              match.score1 !== null && match.score1 !== undefined && 
              match.score2 !== null && match.score2 !== undefined) {
            
            // Find the team indices
            const team1Index = teamsWithStats.findIndex(t => t.id === match.team1.id);
            const team2Index = teamsWithStats.findIndex(t => t.id === match.team2.id);
            
            if (team1Index >= 0 && team2Index >= 0) {
              // Update matches played
              teamsWithStats[team1Index].played++;
              teamsWithStats[team2Index].played++;
              
              // Update win/loss and points
              if (parseInt(match.score1) > parseInt(match.score2)) {
                // Team 1 wins
                teamsWithStats[team1Index].won++;
                teamsWithStats[team1Index].points += 3; // 3 points for a win
                teamsWithStats[team2Index].lost++;
              } else if (parseInt(match.score1) < parseInt(match.score2)) {
                // Team 2 wins
                teamsWithStats[team2Index].won++;
                teamsWithStats[team2Index].points += 3; // 3 points for a win
                teamsWithStats[team1Index].lost++;
              }
            }
          }
        });
      }
    });
  }
  
  console.log('[LeagueTable] Calculated team stats:', teamsWithStats);

  // Sort teams by points, then wins
  const sortedTeams = [...teamsWithStats].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    return b.played - a.played;
  });

  // Check if all matches have been played
  const totalExpectedMatches = teams.length * (teams.length - 1) / 2; // For a single round-robin
  let completedMatches = 0;
  
  if (rounds && rounds.length > 0) {
    rounds.forEach(round => {
      if (round.matches && round.matches.length > 0) {
        completedMatches += round.matches.filter(match => match.completed).length;
      }
    });
  }
  
  const allMatchesCompleted = completedMatches >= totalExpectedMatches;
  console.log(`Completed matches: ${completedMatches}/${totalExpectedMatches}`);

  return (
    <>
      {/* Winner display for completed leagues */}
      {allMatchesCompleted && sortedTeams.length > 0 && (
        <Paper sx={{ mb: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 3, bgcolor: 'success.main', color: 'white', display: 'flex', alignItems: 'center' }}>
            <WinnerIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                TOURNAMENT CHAMPION
              </Typography>
              <Typography variant="h6">
                {sortedTeams[0].name} ({sortedTeams[0].players?.map(p => p?.name || 'Unknown').join(' & ')})
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip 
                  label={`${sortedTeams[0].points} Points`} 
                  color="secondary" 
                  sx={{ mr: 1, fontWeight: 'bold' }} 
                />
                <Chip 
                  label={`${sortedTeams[0].won}W ${sortedTeams[0].lost}L`} 
                  color="default" 
                  sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white' }} 
                />
              </Box>
            </Box>
          </Box>
        </Paper>
      )}
      
      {/* Simple Material-UI Table */}
      <TableContainer component={Paper}>
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center' }}>
          <TableChartIcon sx={{ mr: 1 }} />
          <Typography variant="h6">League Table</Typography>
          <Chip 
            label="3 points per win" 
            color="secondary" 
            size="small" 
            icon={<StarIcon />} 
            sx={{ ml: 2, '& .MuiChip-icon': { color: 'inherit' } }}
          />
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: '40px' }}>#</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>Team</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '180px' }}>Players</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: '40px' }}>P</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: '40px' }}>W</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: '40px' }}>L</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: '60px', bgcolor: 'primary.light', color: 'white' }}>Pts</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTeams.map((team, index) => (
              <TableRow 
                key={`team-${index}`}
                sx={{
                  bgcolor: index === 0 ? 'rgba(76, 175, 80, 0.1)' : 'inherit',
                  '&:nth-of-type(odd)': { bgcolor: index === 0 ? 'rgba(76, 175, 80, 0.1)' : 'action.hover' },
                }}
              >
                <TableCell align="center">
                  {index === 0 && <StarIcon fontSize="small" color="primary" sx={{ mr: 0.5, verticalAlign: 'middle' }} />}
                  {index + 1}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: team.color || `hsl(${index * 137.5 % 360}, 70%, 45%)`, width: 28, height: 28, fontSize: '0.75rem' }}>
                      {team.name?.substring(0, 2) || `T${index+1}`}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', ml: 1 }}>{team.name || `Team ${index+1}`}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {team.players.map((p, idx) => (
                    <span key={p.id || p} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8 }}>
                      {idx > 0 && ', '}
                      <PlayerAvatar photoURL={p.photoURL} name={p.name || p.email || 'TBC'} size={24} />
                      <span style={{ marginLeft: 4 }}>{p.name || p.email || 'TBC'}</span>
                    </span>
                  ))}
                </TableCell>
                <TableCell align="center">{team.played || 0}</TableCell>
                <TableCell align="center">{team.won || 0}</TableCell>
                <TableCell align="center">{team.lost || 0}</TableCell>
                <TableCell align="center" sx={{ bgcolor: 'primary.light', color: 'white', fontWeight: 'bold' }}>{team.points || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Current leader display when not all matches are completed */}
      {!allMatchesCompleted && sortedTeams.length > 0 && (
        <Box sx={{ p: 2, mt: 2, bgcolor: 'info.light', color: 'info.contrastText', display: 'flex', alignItems: 'center', borderRadius: 1 }}>
          <StarIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Current Leader: {sortedTeams[0].name} ({sortedTeams[0].players?.map(p => p?.name || 'Unknown').join(' & ')})
            with {sortedTeams[0].points} points
          </Typography>
        </Box>
      )}
    </>
  );
};

export default LeagueTable;
