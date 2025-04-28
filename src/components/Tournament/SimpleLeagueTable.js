import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  TableChart as TableChartIcon,
  Star as StarIcon,
  EmojiEvents as WinnerIcon,
} from '@mui/icons-material';

const SimpleLeagueTable = ({ teams, rounds }) => {
  const [teamStats, setTeamStats] = useState([]);
  const [allMatchesCompleted, setAllMatchesCompleted] = useState(false);

  useEffect(() => {
    if (!teams || teams.length === 0 || !rounds || rounds.length === 0) return;

    // Calculate team stats based on match results
    const calculateTeamStats = () => {
      // Initialize team stats
      const stats = teams.map(team => ({
        ...team,
        points: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0
      }));

      // Count completed matches
      let completedMatches = 0;
      let totalMatches = 0;

      // Process all matches
      rounds.forEach(round => {
        if (round.matches && round.matches.length > 0) {
          totalMatches += round.matches.length;
          
          round.matches.forEach(match => {
            // Only count completed matches
            if (match.completed && match.team1 && match.team2 && 
                match.score1 !== null && match.score1 !== undefined && 
                match.score2 !== null && match.score2 !== undefined) {
              
              completedMatches++;
              
              // Find the team indices
              const team1Index = stats.findIndex(t => t.id === match.team1.id);
              const team2Index = stats.findIndex(t => t.id === match.team2.id);
              
              if (team1Index >= 0 && team2Index >= 0) {
                // Update matches played
                stats[team1Index].played++;
                stats[team2Index].played++;
                
                // Update goals
                stats[team1Index].goalsFor += parseInt(match.score1) || 0;
                stats[team1Index].goalsAgainst += parseInt(match.score2) || 0;
                stats[team2Index].goalsFor += parseInt(match.score2) || 0;
                stats[team2Index].goalsAgainst += parseInt(match.score1) || 0;
                
                // Update win/draw/loss and points
                if (match.score1 > match.score2) {
                  // Team 1 wins
                  stats[team1Index].won++;
                  stats[team1Index].points += 3; // 3 points for a win
                  stats[team2Index].lost++;
                } else if (match.score1 < match.score2) {
                  // Team 2 wins
                  stats[team2Index].won++;
                  stats[team2Index].points += 3; // 3 points for a win
                  stats[team1Index].lost++;
                } else {
                  // Draw
                  stats[team1Index].drawn++;
                  stats[team1Index].points += 1; // 1 point for a draw
                  stats[team2Index].drawn++;
                  stats[team2Index].points += 1; // 1 point for a draw
                }
              }
            }
          });
        }
      });

      // Sort teams by points, then goal difference
      const sortedStats = [...stats].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const aDiff = a.goalsFor - a.goalsAgainst;
        const bDiff = b.goalsFor - b.goalsAgainst;
        if (bDiff !== aDiff) return bDiff - aDiff;
        return b.goalsFor - a.goalsFor; // If tied on GD, sort by goals scored
      });

      setTeamStats(sortedStats);
      setAllMatchesCompleted(completedMatches === totalMatches && totalMatches > 0);
    };

    calculateTeamStats();
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

  return (
    <Box>
      {/* Winner display for completed leagues */}
      {allMatchesCompleted && teamStats.length > 0 && (
        <Paper sx={{ mb: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 3, bgcolor: 'success.main', color: 'white', display: 'flex', alignItems: 'center' }}>
            <WinnerIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                TOURNAMENT CHAMPION
              </Typography>
              <Typography variant="h6">
                {teamStats[0].name} ({teamStats[0].players?.map(p => p?.name || 'Unknown').join(' & ')})
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip 
                  label={`${teamStats[0].points} Points`} 
                  color="secondary" 
                  sx={{ mr: 1, fontWeight: 'bold' }} 
                />
                <Chip 
                  label={`${teamStats[0].won}W ${teamStats[0].drawn}D ${teamStats[0].lost}L`} 
                  color="default" 
                  sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white' }} 
                />
              </Box>
            </Box>
          </Box>
        </Paper>
      )}
      
      <TableContainer component={Paper} sx={{ mb: 3 }}>
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
        
        <Table sx={{ minWidth: 650 }} aria-label="league table">
          <TableHead sx={{ bgcolor: 'grey.100' }}>
            <TableRow>
              <TableCell>Pos</TableCell>
              <TableCell>Team</TableCell>
              <TableCell align="center">P</TableCell>
              <TableCell align="center">W</TableCell>
              <TableCell align="center">D</TableCell>
              <TableCell align="center">L</TableCell>
              <TableCell align="center">GF</TableCell>
              <TableCell align="center">GA</TableCell>
              <TableCell align="center">GD</TableCell>
              <TableCell 
                align="center" 
                sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', fontWeight: 'bold' }}
              >
                Pts
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teamStats.map((team, index) => (
              <TableRow 
                key={`team-${index}`}
                sx={{ 
                  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                  '&:hover': { bgcolor: 'action.selected' },
                  bgcolor: index === 0 ? 'rgba(76, 175, 80, 0.1)' : 'inherit' // Highlight the leader
                }}
              >
                <TableCell>
                  {index === 0 && <StarIcon fontSize="small" color="primary" sx={{ mr: 0.5, verticalAlign: 'middle' }} />}
                  {index + 1}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: team.color || `hsl(${index * 137.5 % 360}, 70%, 45%)`,
                        width: 32, 
                        height: 32,
                        mr: 1,
                        fontSize: '0.75rem'
                      }}
                    >
                      {team.name?.substring(0, 2) || `T${index+1}`}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {team.name || `Team ${index+1}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {team.players?.map(p => p?.name || 'Unknown').join(' & ')}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="center">{team.played || 0}</TableCell>
                <TableCell align="center">{team.won || 0}</TableCell>
                <TableCell align="center">{team.drawn || 0}</TableCell>
                <TableCell align="center">{team.lost || 0}</TableCell>
                <TableCell align="center">{team.goalsFor || 0}</TableCell>
                <TableCell align="center">{team.goalsAgainst || 0}</TableCell>
                <TableCell align="center">{(team.goalsFor || 0) - (team.goalsAgainst || 0)}</TableCell>
                <TableCell 
                  align="center" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: 'white',
                    bgcolor: 'primary.main',
                    fontSize: '1.1rem'
                  }}
                >
                  {team.points || 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Current leader display when not all matches are completed */}
      {!allMatchesCompleted && teamStats.length > 0 && (
        <Box sx={{ p: 2, mb: 3, bgcolor: 'info.light', color: 'info.contrastText', display: 'flex', alignItems: 'center', borderRadius: 1 }}>
          <StarIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Current Leader: {teamStats[0].name} ({teamStats[0].players?.map(p => p?.name || 'Unknown').join(' & ')})
            with {teamStats[0].points} points
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SimpleLeagueTable;
