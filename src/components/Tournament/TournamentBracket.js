import React, { useState } from 'react';
import { keyframes } from '@emotion/react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Avatar,
  Button,
  Tooltip,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import { 
  EmojiEvents as TrophyIcon,
  ScreenRotation as RotationIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';

// Define pulse animation for the trophy
const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.5));
  }
  50% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.7));
  }
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.5));
  }
`;

// Component to display tournament bracket in a hierarchical view
const TournamentBracket = ({ rounds, format }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
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

  if (!rounds || rounds.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No bracket data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      position: 'relative',
      bgcolor: (theme) => isDarkMode 
        ? theme.palette.mode === 'dark' ? '#121212' : alpha(theme.palette.background.default, 0.9) 
        : 'transparent',
      borderRadius: 2,
      p: 2,
      border: (theme) => isDarkMode
        ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
        : 'none',
      boxShadow: (theme) => isDarkMode
        ? '0 8px 32px rgba(0, 0, 0, 0.3)'
        : 'none',
    }}>
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">{format || 'Knockout'}</Typography>
        
        {/* Mobile controls */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Rotate screen for better view">
            <Paper
              elevation={isDarkMode ? 4 : 2}
              sx={{
                bgcolor: (theme) => isDarkMode 
                  ? alpha(theme.palette.primary.main, 0.2)
                  : alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: (theme) => isDarkMode
                    ? alpha(theme.palette.primary.main, 0.3)
                    : alpha(theme.palette.primary.main, 0.2),
                },
                display: 'flex',
                p: 1,
                borderRadius: 2,
                cursor: 'pointer',
                border: (theme) => isDarkMode
                  ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                  : 'none',
              }}
              onClick={handleRotateScreen}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RotationIcon sx={{ 
                  color: (theme) => isDarkMode 
                    ? theme.palette.primary.light 
                    : theme.palette.primary.main 
                }} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: (theme) => isDarkMode 
                      ? theme.palette.primary.light 
                      : theme.palette.primary.main,
                    fontWeight: 'bold',
                    display: { xs: 'none', sm: 'block' }
                  }}
                >
                  Rotate View
                </Typography>
              </Box>
            </Paper>
          </Tooltip>
          <Tooltip title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}>
            <Paper
              elevation={isDarkMode ? 4 : 2}
              sx={{
                bgcolor: (theme) => isDarkMode 
                  ? alpha(theme.palette.primary.main, 0.2)
                  : alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: (theme) => isDarkMode
                    ? alpha(theme.palette.primary.main, 0.3)
                    : alpha(theme.palette.primary.main, 0.2),
                },
                display: 'flex',
                p: 1,
                borderRadius: 2,
                cursor: 'pointer',
                border: (theme) => isDarkMode
                  ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                  : 'none',
              }}
              onClick={toggleFullscreen}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isFullscreen ? <FullscreenExitIcon sx={{ 
                  color: (theme) => isDarkMode 
                    ? theme.palette.primary.light 
                    : theme.palette.primary.main 
                }} /> : <FullscreenIcon sx={{ 
                  color: (theme) => isDarkMode 
                    ? theme.palette.primary.light 
                    : theme.palette.primary.main 
                }} />}
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: (theme) => isDarkMode 
                      ? theme.palette.primary.light 
                      : theme.palette.primary.main,
                    fontWeight: 'bold',
                    display: { xs: 'none', sm: 'block' }
                  }}
                >
                  {isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
                </Typography>
              </Box>
            </Paper>
          </Tooltip>
        </Box>
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        overflowX: 'auto',
        pb: 4,
        gap: { xs: 1, sm: 2 },
        scrollSnapType: { xs: 'x mandatory', sm: 'none' },
        position: 'relative',
        backgroundColor: (theme) => isDarkMode 
          ? theme.palette.mode === 'dark' ? '#121212' : alpha(theme.palette.background.default, 0.9) 
          : 'transparent',
        borderRadius: 2,
        p: 2,
        mb: 2,
        border: (theme) => isDarkMode
          ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
          : 'none',
        boxShadow: (theme) => isDarkMode
          ? '0 8px 32px rgba(0, 0, 0, 0.3)'
          : 'none',
        '&::-webkit-scrollbar': {
          height: { xs: '4px', sm: '8px' },
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.6) : 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.5) : 'rgba(0,0,0,0.05)',
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
        },
        transition: 'all 0.3s ease-in-out',
        ...(isRotated && {
          height: '80vh',
          alignItems: 'center',
        })
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
              backgroundColor: (theme) => {
                if (theme.palette.mode === 'dark') {
                  return roundIndex % 2 === 0 
                    ? alpha(theme.palette.background.paper, 0.8) 
                    : alpha(theme.palette.primary.dark, 0.15);
                } else {
                  return roundIndex % 2 === 0 
                    ? theme.palette.background.paper 
                    : theme.palette.grey[100];
                }
              },
              borderRadius: 2,
              scrollSnapAlign: { xs: 'start', sm: 'none' },
              boxShadow: (theme) => theme.palette.mode === 'dark' 
                ? `0 4px 12px ${alpha(theme.palette.common.black, 0.3)}` 
                : { xs: 1, sm: 0 },
              border: (theme) => theme.palette.mode === 'dark' 
                ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}` 
                : 'none',
              '&:not(:last-child)::after': {
                content: '""',
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: (theme) => theme.palette.mode === 'dark' 
                  ? alpha(theme.palette.primary.main, 0.3) 
                  : theme.palette.divider,
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
                background: (theme) => theme.palette.mode === 'dark'
                  ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
                  : theme.palette.primary.main,
                color: 'white',
                py: { xs: 0.5, sm: 1 },
                fontSize: { xs: '1rem', sm: '1.15rem' },
                borderRadius: '8px 8px 0 0',
                mb: { xs: 2, sm: 3 },
                boxShadow: (theme) => theme.palette.mode === 'dark'
                  ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                  : 'none',
                letterSpacing: (theme) => theme.palette.mode === 'dark' ? '1px' : 'inherit',
                textShadow: (theme) => theme.palette.mode === 'dark' ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none'
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
                // Determine if this match has a winner
                const isWinner = match.winner === 'team1' || match.winner === 'team2';
                const team1IsWinner = match.winner === 'team1';
                const team2IsWinner = match.winner === 'team2';
                
                return (
                  <Box 
                    key={`match-${roundIndex}-${matchIndex}`}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      mb: 3,
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { xs: '100%', sm: '280px' },
                      scrollSnapAlign: { xs: 'start', sm: 'none' },
                      ...(isWinner ? {
                        position: 'relative',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: isDarkMode 
                            ? alpha(theme.palette.success.main, 0.9) 
                            : theme.palette.success.light,
                          zIndex: 2,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          border: '2px solid',
                          borderColor: isDarkMode 
                            ? theme.palette.background.paper 
                            : theme.palette.divider
                        }
                      } : {})
                    }}
                  >
                    <Paper 
                      elevation={isDarkMode ? 4 : 2} 
                      sx={{ 
                        p: 1.5, 
                        width: '100%',
                        borderRadius: 2,
                        position: 'relative',
                        backgroundColor: (theme) => {
                          if (match.winner === 'team1' || match.winner === 'team2') {
                            return theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.success.dark, 0.4) 
                              : alpha(theme.palette.success.light, 0.3);
                          } else {
                            return theme.palette.mode === 'dark' 
                              ? '#1E1E1E' 
                              : theme.palette.background.paper;
                          }
                        },
                        boxShadow: (theme) => theme.palette.mode === 'dark'
                          ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                          : '0 2px 8px rgba(0, 0, 0, 0.1)',
                        border: (theme) => theme.palette.mode === 'dark'
                          ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                          : 'none',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: (theme) => theme.palette.mode === 'dark'
                            ? '0 6px 16px rgba(0, 0, 0, 0.4)'
                            : '0 4px 12px rgba(0, 0, 0, 0.15)'
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
                            sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.8rem' },
                              fontWeight: 'bold',
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.success.main, 0.9) : undefined,
                              color: (theme) => theme.palette.mode === 'dark' ? theme.palette.common.white : undefined,
                              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                            }}
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
                          bgcolor: (theme) => {
                            if (theme.palette.mode === 'dark') {
                              return match.winner === 'team1' 
                                ? alpha(theme.palette.success.main, 0.3) 
                                : alpha(theme.palette.primary.main, 0.1);
                            } else {
                              return match.winner === 'team1' 
                                ? theme.palette.success.light 
                                : theme.palette.action.hover;
                            }
                          },
                          border: (theme) => team1IsWinner ? `1px solid ${theme.palette.mode === 'dark' ? alpha(theme.palette.success.main, 0.5) : theme.palette.success.light}` : 'none',
                          boxShadow: (theme) => team1IsWinner && theme.palette.mode === 'dark' ? `0 0 4px ${alpha(theme.palette.success.main, 0.3)}` : 'none',
                        }}>
                          <Avatar 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              bgcolor: (theme) => team1IsWinner 
                                ? theme.palette.success.main 
                                : theme.palette.primary.main,
                              color: 'white',
                              mr: 1,
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                            }}
                          >
                            {match.team1?.name?.charAt(0) || '?'}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: team1IsWinner ? 'bold' : 'medium',
                                color: (theme) => {
                                  if (team1IsWinner) {
                                    return theme.palette.mode === 'dark' 
                                      ? theme.palette.success.light 
                                      : theme.palette.success.dark;
                                  } else {
                                    return theme.palette.mode === 'dark' 
                                      ? theme.palette.text.primary 
                                      : theme.palette.text.primary;
                                  }
                                },
                                textShadow: (theme) => team1IsWinner && theme.palette.mode === 'dark' ? '0 0 1px rgba(255,255,255,0.5)' : 'none'
                              }}
                            >
                              {match.team1?.name || 'TBD'}
                            </Typography>
                          </Box>
                          {match.score1 !== undefined && match.score1 !== null && (
                            <Chip 
                              size="small" 
                              label={match.score1} 
                              sx={{ 
                                ml: 1, 
                                bgcolor: (theme) => team1IsWinner 
                                  ? theme.palette.mode === 'dark' 
                                    ? alpha(theme.palette.success.main, 0.2) 
                                    : alpha(theme.palette.success.light, 0.3) 
                                  : theme.palette.mode === 'dark' 
                                    ? alpha(theme.palette.grey[700], 0.5) 
                                    : alpha(theme.palette.grey[200], 0.8),
                                border: (theme) => team1IsWinner ? `1px solid ${theme.palette.mode === 'dark' ? alpha(theme.palette.success.main, 0.5) : theme.palette.success.light}` : 'none',
                                boxShadow: (theme) => team1IsWinner && theme.palette.mode === 'dark' ? `0 0 4px ${alpha(theme.palette.success.main, 0.3)}` : 'none',
                                color: (theme) => team1IsWinner 
                                  ? theme.palette.mode === 'dark' 
                                    ? theme.palette.success.light 
                                    : theme.palette.success.dark 
                                  : theme.palette.text.primary
                              }} 
                            />
                          )}
                        </Box>
                        
                        {/* Team 2 */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          p: 1,
                          borderRadius: 1,
                          bgcolor: (theme) => {
                            if (team2IsWinner) {
                              return theme.palette.mode === 'dark' 
                                ? alpha(theme.palette.success.dark, 0.3) 
                                : alpha(theme.palette.success.light, 0.3);
                            } else {
                              return 'transparent';
                            }
                          },
                          border: (theme) => team2IsWinner ? `1px solid ${theme.palette.mode === 'dark' ? alpha(theme.palette.success.main, 0.5) : theme.palette.success.light}` : 'none',
                          boxShadow: (theme) => team2IsWinner && theme.palette.mode === 'dark' ? `0 0 4px ${alpha(theme.palette.success.main, 0.3)}` : 'none',
                        }}>
                          <Avatar 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              bgcolor: (theme) => team2IsWinner 
                                ? theme.palette.success.main 
                                : theme.palette.primary.main,
                              color: 'white',
                                const baseColor = match.team2?.color || 'grey.400';
                                return theme.palette.mode === 'dark' 
                                  ? typeof baseColor === 'string' && baseColor.includes('.')  
                                    ? theme.palette[baseColor.split('.')[0]][baseColor.split('.')[1]]
                                    : baseColor
                                  : baseColor;
                              },
                              width: 24,
                              height: 24,
                              fontSize: '0.7rem',
                              mr: 1,
                              border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.2)' : 'none',
                              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                              color: (theme) => theme.palette.mode === 'dark' ? theme.palette.common.white : undefined
                            }}
                          >
                            {match.team2?.name?.substring(0, 2) || '?'}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: match.winner === 'team2' ? 'bold' : 'normal',
                                color: (theme) => {
                                  if (theme.palette.mode === 'dark') {
                                    return match.winner === 'team2' 
                                      ? theme.palette.success.light 
                                      : theme.palette.text.primary;
                                  } else {
                                    return match.winner === 'team2' 
                                      ? theme.palette.success.dark 
                                      : theme.palette.text.primary;
                                  }
                                },
                                textShadow: (theme) => theme.palette.mode === 'dark' && match.winner === 'team2' 
                                  ? '0 1px 2px rgba(0,0,0,0.3)' 
                                  : 'none'
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
                <TrophyIcon sx={{ 
                  fontSize: 60, 
                  color: isDarkMode ? '#FFD700' : 'gold', 
                  mb: 2,
                  filter: isDarkMode ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
                  animation: `${pulseAnimation} 2s infinite ease-in-out`
                }} />
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    fontWeight: 'bold', 
                    textAlign: 'center',
                    color: isDarkMode ? theme.palette.primary.light : theme.palette.primary.main,
                    textShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                  }}
                >
                  Champion
                </Typography>
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  background: (theme) => theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${alpha(theme.palette.success.dark, 0.8)} 0%, ${alpha(theme.palette.success.main, 0.9)} 100%)`
                    : `linear-gradient(135deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
                  color: 'white',
                  borderRadius: 2,
                  textAlign: 'center',
                  boxShadow: (theme) => theme.palette.mode === 'dark'
                    ? '0 4px 20px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)'
                    : '0 4px 12px rgba(76, 175, 80, 0.3)',
                  border: (theme) => theme.palette.mode === 'dark' 
                    ? `1px solid ${alpha(theme.palette.success.light, 0.3)}` 
                    : 'none',
                }}>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      letterSpacing: '0.5px',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}
                  >
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
