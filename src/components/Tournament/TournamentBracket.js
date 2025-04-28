import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Avatar,
  Button,
  Tooltip,
} from '@mui/material';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';

// Component to display tournament bracket in a hierarchical view
const TournamentBracket = ({ rounds, format }) => {
  if (!rounds || rounds.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No bracket data available
        </Typography>
      </Box>
    );
  }

  console.log('Rendering tournament bracket with rounds:', rounds);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">{format || 'Knockout'}</Typography>
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        overflowX: 'auto',
        pb: 4,
        gap: { xs: 1, sm: 2 },
        scrollSnapType: { xs: 'x mandatory', sm: 'none' },
        position: 'relative',
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
      }}>
        {rounds.map((round, roundIndex) => (
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
              {round.name}
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: { xs: 2, sm: 4 },
              height: '100%',
              justifyContent: roundIndex === 0 ? 'space-around' : 'space-evenly',
              py: { xs: 1, sm: 2 }
            }}>
              {round.matches.map((match, matchIndex) => {
                const isWinner = match.winner === 'team1' || match.winner === 'team2';
                const winningTeam = match.winner === 'team1' ? match.team1 : match.winner === 'team2' ? match.team2 : null;
                
                return (
                  <Box 
                    key={`match-${matchIndex}`}
                    sx={{ 
                      position: 'relative',
                      '&::after': roundIndex < rounds.length - 1 ? {
                        content: '""',
                        position: 'absolute',
                        right: '-34px',
                        top: '50%',
                        width: '32px',
                        height: '2px',
                        backgroundColor: isWinner ? 'success.main' : 'divider',
                        zIndex: 1
                      } : {}
                    }}
                  >
                    <Paper 
                      elevation={3} 
                      sx={{ 
                        p: { xs: 1, sm: 2 }, 
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: match.completed ? 'success.light' : 'divider',
                        backgroundColor: match.completed ? 'rgba(76, 175, 80, 0.04)' : 'background.paper',
                        position: 'relative',
                        overflow: 'hidden',
                        minWidth: { xs: 0, sm: 'unset' },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: { xs: '3px', sm: '4px' },
                          height: '100%',
                          backgroundColor: match.winner === 'team1' 
                            ? '#4caf50' 
                            : match.winner === 'team2' 
                              ? '#2196f3' 
                              : '#e0e0e0'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'medium', fontSize: { xs: '0.98rem', sm: '1.1rem' } }}>
                          Match {matchIndex + 1}
                        </Typography>
                        {match.completed && (
                          <Chip
                            label="Completed"
                            color="success"
                            size="small"
                            sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
                          />
                        )}
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: 1
                      }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          p: 1,
                          borderRadius: '4px',
                          bgcolor: match.winner === 'team1' ? 'success.light' : 'action.hover',
                        }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: match.team1?.color || 'grey.400',
                              width: 24,
                              height: 24,
                              fontSize: '0.7rem',
                              mr: 1
                            }}
                          >
                            {match.team1?.name?.substring(0, 2) || '?'}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: match.winner === 'team1' ? 'bold' : 'normal',
                                color: match.winner === 'team1' ? 'success.dark' : 'text.primary'
                              }}
                            >
                              {match.team1?.name || 'TBD'}
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="bold">
                            {match.score1 !== undefined && match.score1 !== null ? match.score1 : '-'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          p: 1,
                          borderRadius: '4px',
                          bgcolor: match.winner === 'team2' ? 'success.light' : 'action.hover',
                        }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: match.team2?.color || 'grey.400',
                              width: 24,
                              height: 24,
                              fontSize: '0.7rem',
                              mr: 1
                            }}
                          >
                            {match.team2?.name?.substring(0, 2) || '?'}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: match.winner === 'team2' ? 'bold' : 'normal',
                                color: match.winner === 'team2' ? 'success.dark' : 'text.primary'
                              }}
                            >
                              {match.team2?.name || 'TBD'}
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="bold">
                            {match.score2 !== undefined && match.score2 !== null ? match.score2 : '-'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Players display in tooltip */}
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                        <Tooltip 
                          title={
                            <>
                              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                {match.team1?.name || 'TBD'}: 
                              </Typography>
                              <Typography variant="caption" display="block">
                                {match.team1?.players?.map(p => p?.name || 'Unknown').join(' & ') || 'TBD'}
                              </Typography>
                              <Divider sx={{ my: 0.5 }} />
                              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                {match.team2?.name || 'TBD'}: 
                              </Typography>
                              <Typography variant="caption" display="block">
                                {match.team2?.players?.map(p => p?.name || 'Unknown').join(' & ') || 'TBD'}
                              </Typography>
                            </>
                          } 
                          arrow
                        >
                          <Button size="small" sx={{ fontSize: '0.7rem' }}>
                            View Players
                          </Button>
                        </Tooltip>
                      </Box>
                    </Paper>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
        
        {/* Championship trophy for final round */}
        {rounds.length > 0 && rounds[rounds.length - 1].matches.length > 0 && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            px: 3,
            minWidth: '120px'
          }}>
            {rounds[rounds.length - 1].matches[0].winner && (
              <>
                <TrophyIcon sx={{ fontSize: 60, color: 'gold', mb: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                  Champion
                </Typography>
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  bgcolor: 'success.main', 
                  color: 'white',
                  borderRadius: 2,
                  textAlign: 'center',
                  boxShadow: 3
                }}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {rounds[rounds.length - 1].matches[0].winner === 'team1' 
                      ? rounds[rounds.length - 1].matches[0].team1?.name
                      : rounds[rounds.length - 1].matches[0].team2?.name}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TournamentBracket;
