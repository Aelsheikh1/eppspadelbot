import React, { useEffect, useState } from 'react';
import { Bracket, Seed, SeedItem, SeedTeam } from 'react-brackets';
import { Box, Typography, Paper, Chip, Avatar } from '@mui/material';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';

const BracketVisualizer = ({ rounds, format }) => {
  const [bracketData, setBracketData] = useState([]);

  useEffect(() => {
    if (!rounds || rounds.length === 0) return;
    
    // Transform the tournament rounds data into the format required by react-brackets
    const formattedRounds = rounds.map((round, roundIndex) => {
      return {
        title: round.name,
        seeds: round.matches.map((match, matchIndex) => {
          return {
            id: `${roundIndex}-${matchIndex}`,
            date: '',
            teams: [
              {
                id: match.team1?.id || `team1-${matchIndex}`,
                name: match.team1?.name || 'TBD',
                players: match.team1?.players?.map(p => p?.name || 'Unknown').join(' & ') || '',
                score: match.score1 !== undefined && match.score1 !== null ? match.score1 : null,
                winner: match.winner === 'team1',
                color: match.team1?.color,
                status: match.completed ? 'DONE' : 'SCHEDULED'
              },
              {
                id: match.team2?.id || `team2-${matchIndex}`,
                name: match.team2?.name || 'TBD',
                players: match.team2?.players?.map(p => p?.name || 'Unknown').join(' & ') || '',
                score: match.score2 !== undefined && match.score2 !== null ? match.score2 : null,
                winner: match.winner === 'team2',
                color: match.team2?.color,
                status: match.completed ? 'DONE' : 'SCHEDULED'
              }
            ]
          };
        })
      };
    });

    setBracketData(formattedRounds);
  }, [rounds]);

  // Custom components for the bracket visualization
  const CustomSeed = ({ seed, breakpoint, roundIndex, seedIndex }) => {
    const homeTeam = seed.teams[0];
    const awayTeam = seed.teams[1];
    const isCompleted = homeTeam.status === 'DONE' || awayTeam.status === 'DONE';

    return (
      <Seed mobileBreakpoint={breakpoint}>
        <SeedItem>
          <Paper 
            elevation={3} 
            sx={{ 
              p: { xs: 1, sm: 1.5 }, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: isCompleted ? 'success.light' : 'divider',
              backgroundColor: isCompleted ? 'rgba(76, 175, 80, 0.04)' : 'background.paper',
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              minWidth: { xs: '0', sm: '220px' },
              boxShadow: { xs: 1, sm: 2 },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: { xs: '3px', sm: '4px' },
                height: '100%',
                backgroundColor: homeTeam.winner 
                  ? '#4caf50' 
                  : awayTeam.winner 
                    ? '#2196f3' 
                    : '#e0e0e0'
              }
            }}
          >
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                Match {seedIndex + 1}
              </Typography>
              {isCompleted && (
                <Chip
                  label="Completed"
                  color="success"
                  size="small"
                  sx={{ fontSize: '0.625rem', ml: 1 }}
                />
              )}
            </Box>

            <SeedTeam>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                p: 1,
                borderRadius: '4px',
                bgcolor: homeTeam.winner ? 'success.light' : 'action.hover',
                mb: 1
              }}>
                <Avatar 
                  sx={{ 
                    bgcolor: homeTeam.color || 'grey.400',
                    width: { xs: 28, sm: 24 },
                    height: { xs: 28, sm: 24 },
                    fontSize: { xs: '0.8rem', sm: '0.7rem' },
                    mr: 1
                  }}
                >
                  {homeTeam.name?.substring(0, 2) || '?'}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: homeTeam.winner ? 'bold' : 'normal',
                      color: homeTeam.winner ? 'success.dark' : 'text.primary'
                    }}
                  >
                    {homeTeam.name}
                  </Typography>
                  {homeTeam.players && (
                    <Typography variant="caption" color="text.secondary">
                      {homeTeam.players}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" fontWeight="bold">
                  {homeTeam.score !== null ? homeTeam.score : '-'}
                </Typography>
              </Box>
            </SeedTeam>

            <SeedTeam>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                p: 1,
                borderRadius: '4px',
                bgcolor: awayTeam.winner ? 'success.light' : 'action.hover',
              }}>
                <Avatar 
                  sx={{ 
                    bgcolor: awayTeam.color || 'grey.400',
                    width: { xs: 28, sm: 24 },
                    height: { xs: 28, sm: 24 },
                    fontSize: { xs: '0.8rem', sm: '0.7rem' },
                    mr: 1
                  }}
                >
                  {awayTeam.name?.substring(0, 2) || '?'}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: awayTeam.winner ? 'bold' : 'normal',
                      color: awayTeam.winner ? 'success.dark' : 'text.primary'
                    }}
                  >
                    {awayTeam.name}
                  </Typography>
                  {awayTeam.players && (
                    <Typography variant="caption" color="text.secondary">
                      {awayTeam.players}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" fontWeight="bold">
                  {awayTeam.score !== null ? awayTeam.score : '-'}
                </Typography>
              </Box>
            </SeedTeam>
          </Paper>
        </SeedItem>
      </Seed>
    );
  };

  // If there are no rounds, display a message
  if (!rounds || rounds.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No bracket data available
        </Typography>
      </Box>
    );
  }

  // Check if there's a winner in the final round
  const hasFinalWinner = rounds.length > 0 && 
    rounds[rounds.length - 1].matches.length > 0 && 
    rounds[rounds.length - 1].matches[0].winner;
  
  const finalWinner = hasFinalWinner ? 
    (rounds[rounds.length - 1].matches[0].winner === 'team1' ? 
      rounds[rounds.length - 1].matches[0].team1 : 
      rounds[rounds.length - 1].matches[0].team2) : 
    null;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          overflowX: 'auto',
          gap: { xs: 1, sm: 2 },
          scrollSnapType: { xs: 'x mandatory', sm: 'none' },
          position: 'relative',
          pb: 2,
          '&::-webkit-scrollbar': {
            height: { xs: '4px', sm: '8px' },
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
          },
          '&::before': {
            content: '"Swipe →"',
            display: { xs: 'block', sm: 'none' },
            position: 'absolute',
            left: 8,
            top: -24,
            fontSize: '0.9rem',
            color: 'text.secondary',
            opacity: 0.7
          }
        }}
      >
        {bracketData.map((round, roundIndex) => (
          <Box
            key={`round-${roundIndex}`}
            sx={{
              minWidth: { xs: '200px', sm: '280px' },
              px: { xs: 1, sm: 2 },
              py: { xs: 1, sm: 0 },
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              backgroundColor: roundIndex % 2 === 0 ? 'background.paper' : 'grey.100',
              borderRadius: 2,
              scrollSnapAlign: { xs: 'start', sm: 'none' },
              boxShadow: { xs: 1, sm: 0 },
              '&:not(:last-child)::after': {
                content: '""',
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: 'divider',
                zIndex: 0,
              }
            }}
          >
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{
                fontWeight: 'bold',
                textAlign: 'center',
                backgroundColor: 'primary.main',
                color: 'white',
                py: { xs: 0.5, sm: 1 },
                fontSize: { xs: '1rem', sm: '1.15rem' },
                borderRadius: '8px 8px 0 0',
                mb: { xs: 2, sm: 3 }
              }}
            >
              {round.title}
            </Typography>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 2, sm: 4 },
              height: '100%',
              justifyContent: roundIndex === 0 ? 'space-around' : 'space-evenly',
              py: { xs: 1, sm: 2 }
            }}>
              {round.seeds.map((seed, seedIndex) => (
                <CustomSeed
                  key={`seed-${seedIndex}`}
                  seed={seed}
                  breakpoint={600}
                  roundIndex={roundIndex}
                  seedIndex={seedIndex}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
      {/* Champion display */}
      {hasFinalWinner && finalWinner && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mt: 4,
            p: 3,
            bgcolor: 'success.main',
            color: 'white',
            borderRadius: 2,
            maxWidth: '300px'
          }}
        >
          <TrophyIcon sx={{ fontSize: 60, color: 'gold', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
            TOURNAMENT CHAMPION
          </Typography>
          <Typography variant="h6" align="center">
            {finalWinner.name}
          </Typography>
          <Typography variant="body1" align="center" sx={{ mt: 1 }}>
            {finalWinner.players?.map(p => p?.name || 'Unknown').join(' & ')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BracketVisualizer;
