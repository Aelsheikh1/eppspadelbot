import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Chip, 
  Avatar, 
  Grid, 
  Card, 
  CardContent,
  Divider,
  Tooltip,
  Fade
} from '@mui/material';
import { 
  EmojiEvents as TrophyIcon,
  SportsTennis as TennisIcon,
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  Whatshot as WhatshotIcon,
  FormatListNumbered as FormatListNumberedIcon,
  SportsScore as SportsScoreIcon,
  ScreenRotation as RotationIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import { Grow, Zoom } from '@mui/material';
import './TournamentVisualizer.css';

// Additional styles for the enhanced visualizer
const additionalStyles = `
  .player-pair {
    display: flex;
    flex-direction: column;
    margin-left: 5px;
  }
  
  .player {
    font-size: 11px;
    margin: 2px 0;
    display: flex;
    align-items: center;
  }
  
  .player i {
    font-size: 10px;
    margin-right: 5px;
    opacity: 0.7;
  }
  
  .winner-ribbon {
    position: absolute;
    top: 5px;
    right: 5px;
    color: #FFEB3B;  /* strong yellow for trophy */
    font-size: 16px;
    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2));
  }
  
  .champion-players {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 10px;
  }
  
  .champion-player {
    margin: 3px 0;
    display: flex;
    align-items: center;
    font-size: 1.1rem;
  }
  
  .champion-player i {
    margin-right: 8px;
    color: gold;
  }
  
  .team-details {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
  }
  
  .team-name-league {
    font-weight: bold;
    font-size: 14px;
  }
  
  .team-players-league {
    font-size: 11px;
    color: #666;
    margin-top: 2px;
  }
  
  /* Knockout vertical bracket styles */
  .tournament-bracket-vertical {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 16px 0;
  }
  .vertical-round {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin-bottom: 24px;
  }
  .vertical-round-title {
    font-weight: bold;
    text-align: center;
    margin-bottom: 8px;
    font-size: 1rem;
    padding: 6px 12px;
    border-radius: 4px;
  }
  .vertical-round-title i {
    margin-right: 8px;
  }
  .vertical-round-title.semi-final {
    background: linear-gradient(135deg, #f39c12, #e67e22);
    color: #fff;
    width: 140px;
  }
  .vertical-round-title.final {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    color: #fff;
    width: 140px;
  }
  .vertical-matches {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .vertical-match {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 8px;
    background: #fafafa;
    width: clamp(200px, 90vw, 400px);
    margin: 8px auto;
  }
  .vertical-match-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 0.9rem;
  }
  .vertical-match-status.completed i {
    color: green;
  }
  .vertical-teams {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .vertical-team {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
  }
  .vertical-team-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
  }
  .vertical-team-info {
    flex: 1;
  }
  .vertical-team-name {
    font-weight: bold;
  }
  .vertical-team-players {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .vertical-player {
    font-size: 10px;
  }
  .vertical-match-score {
    display: flex;
    justify-content: center;
    padding-top: 8px;
    font-weight: bold;
  }
`;

const TournamentVisualizerEnhanced = ({ rounds, teams, format, displayDate, displayTime, currentUserEmail, isDarkMode }) => {
  const theme = useTheme();
  const darkMode = isDarkMode !== undefined ? isDarkMode : theme.palette.mode === 'dark';
  const iframeRef = useRef(null);
  const [highlightsData, setHighlightsData] = useState(null);
  const [champion, setChampion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRotated, setIsRotated] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Function to toggle rotation view without using the Screen Orientation API
  const handleRotateScreen = () => {
    // Simply toggle the rotation state - this will apply CSS transformations instead
    setIsRotated(!isRotated);
    
    // Show a helpful message the first time
    if (!isRotated && !localStorage.getItem('rotationMessageShown')) {
      alert('The tournament bracket view has been optimized for landscape viewing. You can toggle back to normal view by clicking the button again.');
      localStorage.setItem('rotationMessageShown', 'true');
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

  // Compute tournament highlights
  useEffect(() => {
    if (!rounds) return;
    
    // Calculate tournament statistics
    const totalRounds = rounds.length;
    const totalMatches = rounds.reduce((sum, r) => sum + (r.matches?.length || 0), 0);
    const completedMatches = rounds.reduce((sum, r) => sum + (r.matches?.filter(m => m.completed || m.winner)?.length || 0), 0);
    
    // Initialize highlights with stats common to all formats
    const highlightItems = [
      { icon: <FormatListNumberedIcon />, label: 'Rounds', value: totalRounds },
      { icon: <SportsScoreIcon />, label: 'Matches', value: totalMatches },
      { icon: <CheckCircleIcon />, label: 'Completed', value: completedMatches },
    ];
    
    // Only calculate and add score-related stats for League format
    if (format === 'League') {
      const averageScore = totalMatches > 0
        ? (rounds.reduce((s, r) => s + (r.matches?.reduce((t, m) => t + ((m.score1 != null && m.score2 != null) ? m.score1 + m.score2 : 0), 0) || 0), 0) / totalMatches).toFixed(2)
        : 0;
      
      // Find highest scoring match
      let highestScoringMatch = null;
      let highestSum = -Infinity;
      rounds.forEach(r => r.matches?.forEach(m => {
        const s1 = m.score1 || 0, s2 = m.score2 || 0;
        if (s1 + s2 > highestSum) { 
          highestSum = s1 + s2; 
          highestScoringMatch = m; 
        }
      }));
      
      const highestScoreDesc = highestScoringMatch
        ? `${highestScoringMatch.team1.name} ${highestScoringMatch.score1} - ${highestScoringMatch.score2} ${highestScoringMatch.team2.name}`
        : 'N/A';
        
      // Add league-specific stats
      highlightItems.push(
        { icon: <StarIcon />, label: 'Avg Score', value: averageScore },
        { icon: <WhatshotIcon />, label: 'Highest Score', value: highestScoreDesc }
      );
    }
    
    // Find champion if tournament is complete
    let tournamentChampion = null;
    if (format === 'League') {
      // For league format, champion is team with most points
      if (teams && teams.length > 0) {
        const sortedTeams = [...teams].sort((a, b) => 
          (b.points || 0) - (a.points || 0) || 
          ((b.goalsFor || 0) - (b.goalsAgainst || 0)) - ((a.goalsFor || 0) - (a.goalsAgainst || 0))
        );
        if (completedMatches === totalMatches && completedMatches > 0) {
          tournamentChampion = sortedTeams[0];
        }
      }
    } else {
      // For knockout format, champion is winner of final match
      if (rounds.length > 0) {
        const finalRound = rounds[rounds.length - 1];
        if (finalRound.matches && finalRound.matches.length > 0) {
          const finalMatch = finalRound.matches[0];
          if (finalMatch.winner) {
            tournamentChampion = finalMatch.winner === 'team1' ? finalMatch.team1 : finalMatch.team2;
          }
        }
      }
    }
    
    setChampion(tournamentChampion);
    setHighlightsData(highlightItems);
  }, [rounds, teams, format]);

  useEffect(() => {
    if (format !== 'League') { setIsLoading(false); return; }
    if (!rounds || !iframeRef.current) return;

    setIsLoading(true);
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    // Create a tournament object from the props
    const tournament = {
      rounds,
      teams,
      format,
      displayDate,
      displayTime,
      currentUserEmail
    };
    
    // Generate HTML content for the iframe
    const htmlContent = generateTournamentHTML(tournament);
    
    // Write to the iframe
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
    // Add the additional styles
    const styleElement = iframeDoc.createElement('style');
    styleElement.textContent = additionalStyles;
    iframeDoc.head.appendChild(styleElement);
    
    // Set loading to false when iframe is loaded
    iframe.onload = () => setIsLoading(false);
  }, [rounds, teams, format, displayDate, displayTime, currentUserEmail]);

  if (!rounds) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      mt: 2,
      bgcolor: (theme) => darkMode 
        ? alpha(theme.palette.background.paper, 0.4) 
        : 'transparent',
      borderRadius: 2,
      p: 2,
      border: (theme) => darkMode
        ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
        : 'none',
      boxShadow: (theme) => darkMode
        ? '0 4px 20px rgba(0, 0, 0, 0.2)'
        : 'none',
    }}>
      {/* Tournament Highlights Section */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center', 
        mb: 2,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Typography 
          variant="h5" 
          component="h2" 
          sx={{ 
            color: (theme) => darkMode 
              ? theme.palette.primary.light 
              : theme.palette.primary.main,
            fontWeight: 'bold',
            textShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          Tournament Bracket
        </Typography>
        
        {/* Mobile controls */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Rotate screen for better view">
            <Paper
              elevation={darkMode ? 4 : 2}
              sx={{
                bgcolor: (theme) => darkMode 
                  ? alpha(theme.palette.primary.main, 0.2)
                  : alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: (theme) => darkMode
                    ? alpha(theme.palette.primary.main, 0.3)
                    : alpha(theme.palette.primary.main, 0.2),
                },
                display: { xs: 'flex', md: 'flex' },
                p: 1,
                borderRadius: 2,
                cursor: 'pointer',
                border: (theme) => darkMode
                  ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                  : 'none',
              }}
              onClick={handleRotateScreen}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RotationIcon sx={{ 
                  color: (theme) => darkMode 
                    ? theme.palette.primary.light 
                    : theme.palette.primary.main 
                }} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: (theme) => darkMode 
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
              elevation={darkMode ? 4 : 2}
              sx={{
                bgcolor: (theme) => darkMode 
                  ? alpha(theme.palette.primary.main, 0.2)
                  : alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: (theme) => darkMode
                    ? alpha(theme.palette.primary.main, 0.3)
                    : alpha(theme.palette.primary.main, 0.2),
                },
                display: 'flex',
                p: 1,
                borderRadius: 2,
                cursor: 'pointer',
                border: (theme) => darkMode
                  ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                  : 'none',
              }}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </Paper>
          </Tooltip>
        </Box>
      </Box>
      
      <Grow in={true} timeout={500}>
        <Box sx={{
          transition: 'all 0.3s ease-in-out',
          ...(isRotated && {
            height: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          })
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 2,
            background: (theme) => isDarkMode 
              ? alpha(theme.palette.background.paper, 0.8)
              : 'linear-gradient(to right, #f6f9fc, #ffffff)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Background decorative elements */}
          <Box 
            sx={{ 
              position: 'absolute', 
              top: -20, 
              right: -20, 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              background: 'rgba(25, 118, 210, 0.05)' 
            }} 
          />
          <Box 
            sx={{ 
              position: 'absolute', 
              bottom: -30, 
              left: -30, 
              width: 150, 
              height: 150, 
              borderRadius: '50%', 
              background: 'rgba(25, 118, 210, 0.03)' 
            }} 
          />
          
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrophyIcon sx={{ color: '#FFEB3B' }} /> Tournament Highlights
          </Typography>
          
          <Grid container spacing={3} direction={{ xs: 'column', md: 'row' }}>
            {/* Stats Cards */}
            <Grid item xs={12} md={8} sx={{ mb: { xs: 2, md: 0 } }}>
              <Grid container spacing={2}>
                {highlightsData?.map((highlight, index) => (
                  <Grid item xs={6} sm={4} key={index} sx={{ minWidth: 0 }}>
                    <Grow in={true} timeout={(index + 1) * 300} style={{ transformOrigin: '0 0 0' }}>
                      <Card 
                        elevation={2} 
                        sx={{ 
                          height: '100%',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-5px)',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                          }
                        }}
                      >
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Box sx={{ 
                            color: 'primary.main', 
                            mb: 1,
                            display: 'flex',
                            justifyContent: 'center'
                          }}>
                            {React.cloneElement(highlight.icon, { fontSize: 'large' })}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {highlight.label}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
                            {typeof highlight.value === 'number' ? highlight.value : highlight.value}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grow>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            
            {/* Champion Card */}
            <Grid item xs={12} md={4}>
              <Fade in={true} timeout={800} style={{ transformOrigin: '0 0 0' }}>
                <Card 
                  elevation={3} 
                  sx={{ 
                    height: '100%',
                    background: champion ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    color: champion ? '#7D4B32' : 'text.primary',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
                    <TrophyIcon sx={{ 
                      fontSize: 40, 
                      color: champion ? '#FFEB3B' : '#BBB',
                      filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.2))'
                    }} />
                    
                    <Typography variant="h6" sx={{ mt: 2, fontWeight: 'bold' }}>
                      {champion ? 'Champion' : 'Tournament in Progress'}
                    </Typography>
                    
                    {champion ? (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {champion.name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {champion.players?.map((player, idx) => (
                            <Chip 
                              key={idx}
                              size="small"
                              label={typeof player === 'object' ? player.name || 'Player' : 'Player'}
                              sx={{ 
                                bgcolor: 'rgba(255,255,255,0.7)', 
                                fontWeight: 'bold',
                                color: '#7D4B32'
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ mt: 2, opacity: 0.7 }}>
                        Complete all matches to determine the champion
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          </Grid>
          
          {/* Progress Bar */}
          {rounds.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircleIcon fontSize="small" color="success" /> Tournament Progress
              </Typography>
              <Box sx={{ position: 'relative', height: 8, bgcolor: '#edf2f7', borderRadius: 4, overflow: 'hidden' }}>
                {(() => {
                  const totalMatches = rounds.reduce(
                    (sum, r) => sum + (r.matches?.length || 0), 0
                  );
                  const completedMatches = rounds.reduce(
                    (sum, r) => sum + (r.matches?.filter(m => m.completed || m.winner)?.length || 0), 0
                  );
                  const progressPercent = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
                  return (
                    <Box
                      sx={{ 
                        position: 'absolute', 
                        left: 0, 
                        top: 0, 
                        height: '100%', 
                        width: `${progressPercent}%`,
                        background: 'linear-gradient(90deg, #48bb78 0%, #38b2ac 100%)',
                        transition: 'width 1s ease-in-out'
                      }}
                    />
                  );
                })()} 
              </Box>
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
                {rounds.reduce(
                  (sum, r) => sum + (r.matches?.filter(m => m.completed || m.winner)?.length || 0), 0
                )} / {rounds.reduce(
                  (sum, r) => sum + (r.matches?.length || 0), 0
                )} matches completed
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
      </Grow>
      
      {/* Tournament Bracket Visualization */}
      <Fade in={true} timeout={800}>
        <Paper 
          elevation={darkMode ? 6 : 3} 
          sx={{ 
            width: '100%', 
            height: format === 'knockout' ? 600 : 'auto',
            minHeight: 400,
            overflow: 'hidden',
            position: 'relative',
            borderRadius: 2,
            mb: 3,
            bgcolor: (theme) => darkMode 
              ? theme.palette.mode === 'dark' ? '#121212' : alpha(theme.palette.background.default, 0.9) 
              : theme.palette.background.paper,
            border: (theme) => darkMode
              ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
              : 'none',
            boxShadow: (theme) => darkMode
              ? '0 8px 32px rgba(0, 0, 0, 0.3)'
              : theme.shadows[3],
          }}
        >
          {format === 'League' && isLoading && (
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.8)',
                zIndex: 10
              }}
            >
              <CircularProgress />
            </Box>
          )}
          {format === 'League' ? (
            <iframe 
              ref={iframeRef}
              title="Tournament Visualization"
              style={{ width: '100%', height: '800px', border: 'none', overflow: 'hidden' }}
            />
          ) : (
            <>
              <style dangerouslySetInnerHTML={{ __html: additionalStyles }} />
              <div
                style={{ width: '100%', overflow: 'visible' }}
                dangerouslySetInnerHTML={{ __html: generateKnockoutHTML({ rounds, teams, displayDate, displayTime }) }}
              />
            </>
          )}
        </Paper>
      </Fade>
    </Box>
  );
};

// Function to generate HTML content for the iframe
const generateTournamentHTML = (tournament) => {
  const isLeague = tournament.format === 'League';
  const rounds = tournament.rounds || [];
  const teams = tournament.teams || [];
  const displayDate = tournament.displayDate || '';
  const displayTime = tournament.displayTime || '';
  const currentUserEmail = tournament.currentUserEmail || '';
  
  // --- Winner Detection Logic ---
  let winnerTeam = null;
  let winnerPlayers = [];
  let tournamentEnded = false;
  if (isLeague) {
    // League: winner is first in sorted standings if all matches completed
    const teamsWithStats = calculateTeamStats(teams, rounds);
    teamsWithStats.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
    const totalMatches = rounds.reduce((sum, r) => sum + (r.matches ? r.matches.length : 0), 0);
    const completedMatches = rounds.reduce((sum, r) => sum + (r.matches ? r.matches.filter(m => m.completed || m.winner).length : 0), 0);
    if (totalMatches > 0 && completedMatches === totalMatches) {
      winnerTeam = teamsWithStats[0];
      winnerPlayers = winnerTeam.players ? winnerTeam.players.map(p => p?.name || 'TBC') : [];
      tournamentEnded = true;
    }
  } else {
    // Knockout: winner is winner of last match if present
    if (rounds.length > 0 && rounds[rounds.length-1].matches.length > 0) {
      const finalMatch = rounds[rounds.length-1].matches[0];
      if (finalMatch && finalMatch.winner) {
        winnerTeam = finalMatch.winner === 'team1' ? finalMatch.team1 : finalMatch.team2;
        winnerPlayers = winnerTeam.players ? winnerTeam.players.map(p => (typeof p === 'object' && p && p.name ? p.name : (typeof p === 'string' ? p : 'TBC'))) : [];
        tournamentEnded = true;
      }
    }
  }
  // --- END Winner Detection Logic ---

  // Generate HTML for the tournament visualization
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tournament Visualization</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
        <style>
            body {
                font-family: 'Roboto', sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f9fafb;
                color: #333;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background-color: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .tournament-header {
                background: linear-gradient(135deg, #1976d2, #0d47a1);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                flex-wrap: wrap;
            }
            .tournament-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 10px;
                width: 100%;
            }
            .tournament-info {
                display: flex;
                align-items: center;
                background-color: rgba(255, 255, 255, 0.15);
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.85rem;
            }
            .tournament-info i {
                margin-right: 6px;
            }
            .tournament-info {
                display: flex;
                align-items: center;
                margin-top: 8px;
                background-color: rgba(255, 255, 255, 0.15);
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.85rem;
                margin-right: 10px;
            }
            .tournament-info i {
                margin-right: 6px;
            }
            .tournament-title {
                display: flex;
                align-items: center;
                font-size: 1.5rem;
                font-weight: 600;
            }
            .tournament-title i {
                margin-right: 10px;
                font-size: 1.8rem;
            }
            .tournament-status {
                background-color: rgba(255, 255, 255, 0.2);
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 0.8rem;
                display: flex;
                align-items: center;
            }
            .tournament-status i {
                margin-right: 5px;
            }
            .tournament-bracket {
                display: flex;
                flex-direction: column;
                padding: 30px 10px;
                background: linear-gradient(to bottom, #f9f9f9, #ffffff);
                border-radius: 8px;
                position: relative;
                margin-bottom: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                width: 100%;
                max-width: 100vw;
                overflow-x: auto;
            }
            .round {
                display: flex;
                flex-direction: row;
                min-width: unset;
                margin-bottom: 24px;
                margin-right: 0;
                position: relative;
                width: 100%;
                justify-content: flex-start;
                flex-wrap: wrap;
            }
            .round:last-child {
                margin-bottom: 0;
            }
            .round-title {
                background: linear-gradient(135deg, #1976d2, #0d47a1);
                color: white;
                padding: 12px 15px;
                text-align: center;
                border-radius: 8px 8px 0 0;
                font-weight: bold;
                margin-bottom: 25px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .round-title i {
                margin-right: 8px;
            }
            .match {
                border: none;
                border-radius: 10px;
                padding: 0;
                margin-bottom: 30px;
                background-color: white;
                box-shadow: 0 5px 15px rgba(0,0,0,0.08);
                position: relative;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                overflow: hidden;
            }
            .match:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.12);
            }
            .match.completed {
                border-left: 5px solid #4caf50;
            }
            .match-header {
                background: linear-gradient(to right, #f5f5f5, #eeeeee);
                padding: 8px 12px;
                font-size: 0.85rem;
                color: #555;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #eee;
            }
            .match-status {
                display: inline-flex;
                align-items: center;
                background-color: #e0e0e0;
                color: #555;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 0.7rem;
            }
            .match-status.completed {
                background-color: #4caf50;
                color: white;
            }
            .match-status i {
                margin-right: 4px;
            }
            .team {
                display: flex;
                align-items: center;
                padding: 12px 15px;
                border-bottom: 1px solid #f0f0f0;
                position: relative;
                transition: background-color 0.2s ease;
            }
            .team:last-child {
                border-bottom: none;
            }
            .team:hover {
                background-color: #f9f9f9;
            }
            .team.winner {
                background-color: rgba(76, 175, 80, 0.05);
            }
            .team.winner::after {
                content: '🏆';
                position: absolute;
                top: 5px;
                right: 5px;
                font-size: 16px;
            }
            .team-avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                margin-right: 12px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .team-info {
                flex: 1;
            }
            .team-name {
                font-weight: 600;
                margin-bottom: 3px;
                display: flex;
                align-items: center;
            }
            .team-players {
                font-size: 12px;
                color: #757575;
                display: flex;
                align-items: center;
            }
            .team-players i {
                margin-right: 4px;
                font-size: 10px;
                color: #9e9e9e;
            }
            .team-score {
                font-weight: bold;
                font-size: 18px;
                min-width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 15px;
                background-color: #f5f5f5;
                margin-left: 10px;
            }
            .winner .team-score {
                background-color: #4caf50;
                color: white;
            }
            .connector {
                position: absolute;
                right: -25px;
                width: 25px;
                height: 2px;
                background-color: #e0e0e0;
                top: 50%;
                transform: translateY(-50%);
            }
            .connector.active {
                background-color: #4caf50;
                color: white;
            }
            .trophy {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-top: 20px;
                padding: 20px;
                background: linear-gradient(135deg, #f9fbe7, #f0f4c3);
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .trophy-icon {
                font-size: 60px;
                color: #ffc107;
                margin-bottom: 10px;
                text-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            .winner-label {
                font-size: 1.2rem;
                color: #555;
                margin-bottom: 5px;
            }
            .winner-name {
                font-size: 1.8rem;
                font-weight: bold;
                color: #1a237e;
                margin-bottom: 10px;
            }
            .winner-players {
                font-size: 1rem;
                color: #555;
            }
            .league-table-container {
                margin-top: 30px;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            }
            .league-table {
                width: 100%;
                border-collapse: collapse;
                background-color: white;
            }
            .league-table th, .league-table td {
                padding: 12px 15px;
                text-align: center;
            }
            .league-table th {
                background: linear-gradient(135deg, #1976d2, #0d47a1);
                color: white;
                font-weight: 500;
                text-transform: uppercase;
                font-size: 0.85rem;
                letter-spacing: 0.5px;
                border: none;
            }
            .league-table td {
                border-bottom: 1px solid #f0f0f0;
            }
            .league-table tr:last-child td {
                border-bottom: none;
            }
            .league-table tr:nth-child(even) {
                background-color: #fafafa;
            }
            .league-table tr:hover {
                background-color: #f5f5f5;
            }
            .team-position {
                font-weight: bold;
                width: 40px;
            }
            .team-position.top {
                color: #4caf50;
            }
            .team-position.bottom {
                color: #f44336;
            }
            .team-cell {
                text-align: left;
                font-weight: 500;
                display: flex;
                align-items: center;
            }
            .team-cell .team-avatar {
                width: 28px;
                height: 28px;
                font-size: 12px;
                margin-right: 10px;
            }
            .points-cell {
                font-weight: bold;
                font-size: 1.1rem;
            }
            .winner-banner {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 480px;
                height: 480px;
                background: #fffbe6;
                border-radius: 24px;
                padding: 24px 18px 18px 18px;
                margin: 0 auto 28px auto;
                box-shadow: 0 6px 18px rgba(255, 193, 7, 0.18), 0 1px 4px rgba(0,0,0,0.08);
                border: 5px solid #ffd600;
                animation: popin 0.8s cubic-bezier(.6,-0.28,.74,.05) 1;
                position: relative;
                overflow: hidden;
            }
            .trophy-spotlight {
                margin-bottom: 18px;
                display: flex;
                justify-content: center;
                align-items: center;
                filter: drop-shadow(0 0 24px #ffe082);
            }
            .animated-trophy {
                color: #ffc107;
                text-shadow: 0 0 16px #fff59d, 0 0 32px #ffe082;
                animation: trophy-bounce 1.6s infinite cubic-bezier(.5,0.2,.7,1.1);
            }
            @keyframes trophy-bounce {
                0% { transform: scale(1) translateY(0); }
                20% { transform: scale(1.08) translateY(-12px); }
                40% { transform: scale(0.98) translateY(2px); }
                60% { transform: scale(1.04) translateY(-6px); }
                80% { transform: scale(1) translateY(0); }
                100% { transform: scale(1) translateY(0); }
            }
            .winner-label {
                font-size: 2.2rem;
                font-weight: 800;
                color: #ff9800;
                margin-bottom: 12px;
                letter-spacing: 1px;
                text-shadow: 0 2px 8px #fffde7;
            }
            .winner-name {
                font-size: 1.5rem;
                font-weight: bold;
                color: #37474f;
                margin-bottom: 8px;
            }
            .winner-players {
                font-size: 1.1rem;
                color: #6d4c41;
                margin-bottom: 18px;
                text-align: center;
            }
            .share-btn {
                background: linear-gradient(90deg, #ff9800, #ffc107);
                color: #fff;
                border: none;
                border-radius: 30px;
                font-size: 1.15rem;
                font-weight: 700;
                padding: 14px 38px;
                margin-top: 10px;
                box-shadow: 0 4px 16px rgba(255, 193, 7, 0.18);
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
            }
            .share-btn:hover {
                background: linear-gradient(90deg, #ffa726, #ffd54f);
                color: #fffde7;
                transform: translateY(-2px) scale(1.03);
                box-shadow: 0 8px 24px rgba(255, 193, 7, 0.28);
            }
            .share-btn i {
                font-size: 1.4em;
                margin-right: 8px;
            }
        </style>
    </head>
    <body>
        <div class="container">
          <!-- Enhanced Winner Banner & Card -->
        ${tournamentEnded && winnerTeam ? `
          <div class="winner-banner" id="winner-card">
            <div class="trophy-spotlight">
              <i class="fas fa-trophy fa-5x animated-trophy"></i>
            </div>
            <div class="winner-label">🏆 Tournament Winner 🏆</div>
            <div class="winner-name">${winnerTeam.name}</div>

            <div class="winner-players" style="margin-bottom: 2px;">
              ${winnerPlayers.map(p => {
                if (typeof p === 'object') {
                  // If name is 'You', use displayName or email
                  // Always show the actual player name, fallback to displayName/email/TBC
                  if (!p.name && !p.displayName && !p.email) {
                    return `<span><i class='fas fa-user'></i> TBC</span>`;
                  }
                  return `<span>${p.photoURL ? `<img src='${p.photoURL}' class='tournament-avatar' style='width:32px;height:32px;border-radius:50%;object-fit:cover;margin-right:6px;vertical-align:middle;' />` :
                    `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#bbb;color:#fff;text-align:center;font-size:11px;line-height:18px;vertical-align:middle;">${p?.name ? p.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : '?'}</span>`}
                  <span>${p?.name || 'TBC'}</span>
                </span>`;
                } else if (!p) {
                  return `<span><i class='fas fa-user'></i> TBC</span>`;
                } else {
                  return `<span><i class='fas fa-user'></i> ${p}</span>`;
                }
              }).join('<br/>')}
            </div>

            <div class="winner-meta" style="margin-top: 20px; text-align: center; color: #7c6f3f; font-size: 1.04rem; font-weight: 600; background: #fffde7; border-radius: 12px; padding: 8px 0 4px 0; width: 100%; max-width: 98%; display: flex; flex-direction: column; align-items: center;">
              <div>
                ${tournament.location ? `<span style='margin-right: 12px;'><i class='fas fa-map-marker-alt'></i> ${tournament.location}</span>` : ''}
                ${displayDate ? `<span style='margin-right: 8px;'><i class='fas fa-calendar-alt'></i> ${displayDate}</span>` : ''}
                ${displayTime ? `<span><i class='fas fa-clock'></i> ${displayTime}</span>` : ''}
              </div>
            </div>
            <button id="share-btn" class="share-btn" onclick="downloadWinnerCard()">
              <i class="fas fa-share-alt"></i> Share Winner
            </button>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
          <script>
            window.downloadWinnerCard = function() {
               const card = document.getElementById('winner-card');
               const shareBtn = document.getElementById('share-btn');
               if (!card) return;
               if (shareBtn) shareBtn.style.display = 'none';
               html2canvas(card).then(canvas => {
                 if (shareBtn) shareBtn.style.display = '';
                 const link = document.createElement('a');
                 link.download = 'tournament-winner.png';
                 link.href = canvas.toDataURL();
                 link.click();
               });
             };
          </script>
        ` : ''}
            ${isLeague ? generateLeagueHTML(tournament) : generateKnockoutHTML(tournament)}
        </div>
    </body>
    </html>
  `;
  
  return html;
};

// Function to generate HTML for knockout tournament
const generateKnockoutHTML = (tournament) => {
  const rounds = tournament.rounds || [];
  const displayDate = tournament.displayDate || '';
  const displayTime = tournament.displayTime || '';
  
  if (!rounds.length) {
    // Participants pills
    const participantsHtml = (tournament.teams || []).map(team =>
      `<span style="display:inline-block;background:${team.color};color:#fff;padding:6px 12px;border-radius:16px;margin:4px;font-size:0.9rem;">${team.name}</span>`
    ).join('');
    return `
      <div style="max-width:600px;margin:40px auto;padding:24px;background:#fff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);text-align:center;">
        <h2 style="margin-bottom:12px;color:#333;">Awaiting Matches</h2>
        <p style="color:#555;margin-bottom:20px;">Matches will appear here once scheduled.</p>
        <div style="margin-bottom:20px;">${participantsHtml || '<em style="color:#999;">No participants yet</em>'}</div>
        <div style="text-align:left;max-width:400px;margin:0 auto 20px;">
          <h3 style="margin-bottom:8px;color:#444;">Upcoming Matches</h3>
          <ul style="list-style:none;padding:0;margin:0;color:#777;"><li>No matches scheduled</li></ul>
        </div>
        <div style="color:#777;font-size:0.9rem;">
          ${tournament.location ? `<div><i class="fas fa-map-marker-alt"></i> ${tournament.location}</div>` : ''}
          ${displayDate ? `<div><i class="fas fa-calendar-alt"></i> ${displayDate}</div>` : ''}
          ${displayTime ? `<div><i class="fas fa-clock"></i> ${displayTime}</div>` : ''}
        </div>
      </div>
    `;
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
  
  let html = `
    <div class="tournament-header">
      <div class="tournament-title">
        <i class="fas fa-trophy"></i>
        Knockout Tournament
      </div>
      <div class="tournament-status">
        <i class="${hasFinalWinner ? 'fas fa-check-circle' : 'fas fa-clock'}"></i>
        ${hasFinalWinner ? 'Completed' : 'In Progress'}
      </div>
      <div class="tournament-meta">
        ${displayDate ? `
        <div class="tournament-info">
          <i class="fas fa-calendar-alt"></i>
          ${displayDate}
        </div>` : ''}
        ${displayTime ? `
        <div class="tournament-info">
          <i class="fas fa-clock"></i>
          ${displayTime}
        </div>` : ''}
      </div>
    </div>
    
    <div class="tournament-bracket-vertical">
  `;
  
  // Generate rounds
  rounds.forEach((round, roundIndex) => {
    // Choose appropriate icon for each round
    let roundIcon = 'fas fa-flag';
    if (roundIndex === 0) roundIcon = 'fas fa-play';
    else if (roundIndex === rounds.length - 1) roundIcon = 'fas fa-trophy';
    else if (roundIndex === rounds.length - 2) roundIcon = 'fas fa-medal';
    
    html += `
      <div class="vertical-round">
        <div class="vertical-round-title ${roundIndex === rounds.length - 2 ? 'semi-final' : roundIndex === rounds.length - 1 ? 'final' : ''}"><i class="${roundIcon}"></i> ${round.name}</div>
        <div class="vertical-matches">
    `;
    
    // Generate matches for this round
    round.matches.forEach((match, matchIndex) => {
      const isTeam1Winner = match.winner === 'team1';
      const isTeam2Winner = match.winner === 'team2';
      const matchCompleted = match.completed || isTeam1Winner || isTeam2Winner;
      const matchClass = matchCompleted ? 'completed' : '';
      const team1Style = isTeam1Winner
        ? 'background: linear-gradient(135deg, #A5D6A7, #81C784); border-left: 4px solid #66BB6A;'
        : 'background: #fafafa;';
      const team2Style = isTeam2Winner
        ? 'background: linear-gradient(135deg, #A5D6A7, #81C784); border-left: 4px solid #66BB6A;'
        : 'background: #fafafa;';
      
      html += `
        <div class="vertical-match ${matchClass}">
          <div class="vertical-match-header">
            <span>Match ${matchIndex + 1}</span>
            <span class="vertical-match-status ${matchCompleted ? 'completed' : ''}">
              <i class="${matchCompleted ? 'fas fa-check-circle' : 'fas fa-clock'}"></i>
              ${matchCompleted ? 'Completed' : 'Pending'}
            </span>
          </div>
          <div class="vertical-teams">
            <div class="vertical-team ${isTeam1Winner ? 'winner' : ''}" style="${team1Style}">
              <div class="vertical-team-avatar" style="background: linear-gradient(135deg, #1976d2, #0d47a1); color: white;">
                ${match.team1?.name?.substring(0, 2) || '?'}
              </div>
              <div class="vertical-team-info">
                <div class="vertical-team-name">${match.team1?.name || 'TBD'}</div>
                <div class="vertical-team-players">
                  <i class="fas fa-user-friends"></i>
                  <div class="player-pair">
                    ${match.team1?.players && match.team1.players.length >= 1 ? 
                      `<span class="player"><i class="fas fa-user"></i> ${match.team1.players[0]?.name || 'TBC'}</span>` : 
                      '<span class="player"><i class="fas fa-user"></i> TBC</span>'}
                    ${match.team1?.players && match.team1.players.length >= 2 ? 
                      `<span class="player"><i class="fas fa-user"></i> ${match.team1.players[1]?.name || 'TBC'}</span>` : 
                      '<span class="player"><i class="fas fa-user"></i> TBC</span>'}
                  </div>
                </div>
              </div>
              <div class="vertical-match-score">${match.score1 !== undefined && match.score1 !== null ? match.score1 : '-'}</div>
              ${isTeam1Winner ? '<div class="winner-ribbon"><i class="fas fa-award"></i></div>' : ''}
            </div>
            <div class="vertical-team ${isTeam2Winner ? 'winner' : ''}" style="${team2Style}">
              <div class="vertical-team-avatar" style="background: linear-gradient(135deg, #e91e63, #ad1457); color: white;">
                ${match.team2?.name?.substring(0, 2) || '?'}
              </div>
              <div class="vertical-team-info">
                <div class="vertical-team-name">${match.team2?.name || 'TBD'}</div>
                <div class="vertical-team-players">
                  <i class="fas fa-user-friends"></i>
                  <div class="player-pair">
                    ${match.team2?.players && match.team2.players.length >= 1 ? 
                      `<span class="player"><i class="fas fa-user"></i> ${match.team2.players[0]?.name || 'TBC'}</span>` : 
                      '<span class="player"><i class="fas fa-user"></i> TBC</span>'}
                    ${match.team2?.players && match.team2.players.length >= 2 ? 
                      `<span class="player"><i class="fas fa-user"></i> ${match.team2.players[1]?.name || 'TBC'}</span>` : 
                      '<span class="player"><i class="fas fa-user"></i> TBC</span>'}
                  </div>
                </div>
              </div>
              <div class="vertical-match-score">${match.score2 !== undefined && match.score2 !== null ? match.score2 : '-'}</div>
              ${isTeam2Winner ? '<div class="winner-ribbon"><i class="fas fa-award"></i></div>' : ''}
            </div>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  html += `
    </div>
  `;
  
  return html;
};

// Function to generate HTML for league tournament
const generateLeagueHTML = (tournament) => {
  const rounds = tournament.rounds || [];
  const teams = tournament.teams || [];
  
  if (!rounds.length) {
    // Participants pills
    const participantsHtml = (teams || []).map(team =>
      `<span style="display:inline-block;background:${team.color};color:#fff;padding:6px 12px;border-radius:16px;margin:4px;font-size:0.9rem;">${team.name}</span>`
    ).join('');
    return `
      <div style="max-width:600px;margin:40px auto;padding:24px;background:#fff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);text-align:center;">
        <h2 style="margin-bottom:12px;color:#333;">League Ready</h2>
        <p style="color:#555;margin-bottom:20px;">Standings will appear here once matches are played.</p>
        <div style="margin-bottom:20px;">${participantsHtml || '<em style="color:#999;">No participants yet</em>'}</div>
        <div style="text-align:left;max-width:400px;margin:0 auto 20px;">
          <h3 style="margin-bottom:8px;color:#444;">Upcoming Fixtures</h3>
          <ul style="list-style:none;padding:0;margin:0;color:#777;"><li>No fixtures scheduled</li></ul>
        </div>
        <div style="color:#777;font-size:0.9rem;">
          ${tournament.location ? `<div><i class="fas fa-map-marker-alt"></i> ${tournament.location}</div>` : ''}
          ${tournament.displayDate ? `<div><i class="fas fa-calendar-alt"></i> ${tournament.displayDate}</div>` : ''}
          ${tournament.displayTime ? `<div><i class="fas fa-clock"></i> ${tournament.displayTime}</div>` : ''}
        </div>
      </div>
    `;
  }
  
  // Calculate team stats for the league table
  const teamsWithStats = calculateTeamStats(teams, rounds);
  
  // Sort teams by points (descending), then goal difference
  teamsWithStats.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    const aGoalDiff = a.goalsFor - a.goalsAgainst;
    const bGoalDiff = b.goalsFor - b.goalsAgainst;
    if (bGoalDiff !== aGoalDiff) {
      return bGoalDiff - aGoalDiff;
    }
    return b.goalsFor - a.goalsFor;
  });
  
  let html = `
    <div class="tournament-header">
      <div class="tournament-title">
        <i class="fas fa-table"></i>
        League Tournament
      </div>
      <div class="tournament-status">
        <i class="fas fa-users"></i>
        ${teams.length} Teams
      </div>
    </div>
    
    <div class="league-table-container">
      <table class="league-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th style="text-align: left;">Team</th>
            <th>P</th>
            <th>W</th>
            <th>L</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  // Generate rows for each team
  teamsWithStats.forEach((team, index) => {
    const position = index + 1;
    const isTop = position <= 2;
    const isBottom = position >= teamsWithStats.length - 1 && teamsWithStats.length > 2;
    const positionClass = isTop ? 'top' : isBottom ? 'bottom' : '';
    const goalDiff = team.goalsFor - team.goalsAgainst;
    
    html += `
      <tr>
        <td class="team-position ${positionClass}">${position}</td>
        <td>
          <div class="team-cell">
            <div class="team-avatar" style="background: linear-gradient(135deg, ${team.color || '#3f51b5'}, ${team.color ? adjustColor(team.color, -30) : '#1a237e'}); color: white;">
              ${team.name?.substring(0, 2) || '?'}
            </div>
            <div class="team-details">
              <div class="team-name-league">${team.name}</div>
              <div class="team-players-league">
                ${team.players && team.players.length > 0 ?
  team.players.map(p =>
    `<span class="player" style="display: inline-flex; align-items: center; gap: 4px; margin-right: 8px;">
      ${p?.photoURL ? `<img src="${p.photoURL}" alt="avatar" style="width:18px;height:18px;border-radius:50%;object-fit:cover;margin-right:6px;vertical-align:middle;" />` :
        `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#bbb;color:#fff;text-align:center;font-size:11px;line-height:18px;vertical-align:middle;">${p?.name ? p.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : '?'}</span>`}
      <span>${p?.name || 'TBC'}</span>
    </span>`
  ).join(' & ') :
  'TBC'}
              </div>
            </div>
          </div>
        </td>
        <td>${team.played}</td>
        <td>${team.won}</td>
        <td>${team.lost}</td>
        <td class="points-cell">${team.points}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
    
    <h3 style="margin-top: 30px;">Matches</h3>
  `;
  
  // Generate rounds and matches
  rounds.forEach((round, roundIndex) => {
    html += `
      <div style="margin-bottom: 20px;">
        <h4 style="background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
          <i class="fas fa-calendar-day"></i> ${round.name}
        </h4>
        <div style="display: flex; flex-wrap: wrap; gap: 15px;">
    `;
    
    // Generate matches for this round
    round.matches.forEach((match, matchIndex) => {
      const isTeam1Winner = match.winner === 'team1';
      const isTeam2Winner = match.winner === 'team2';
      const matchCompleted = match.completed || isTeam1Winner || isTeam2Winner;
      const matchClass = matchCompleted ? 'completed' : '';
      
      html += `
        <div class="match ${matchClass}" style="flex: 1; min-width: 300px; max-width: 400px;">
          <div class="match-header">
            <span>Match ${matchIndex + 1}</span>
            <span class="match-status ${matchCompleted ? 'completed' : ''}">
              <i class="${matchCompleted ? 'fas fa-check-circle' : 'fas fa-clock'}"></i>
              ${matchCompleted ? 'Completed' : 'Pending'}
            </span>
          </div>
          <div class="team ${isTeam1Winner ? 'winner' : ''}" style="background: linear-gradient(to right, rgba(25, 118, 210, 0.05), rgba(13, 71, 161, 0.1)); border-left: 4px solid #1976d2;">
            <div class="team-avatar" style="background: linear-gradient(135deg, #1976d2, #0d47a1); color: white;">
              ${match.team1?.name?.substring(0, 2) || '?'}
            </div>
            <div class="team-info">
              <div class="team-name">${match.team1?.name || 'TBD'}</div>
              <div class="team-players">
                <i class="fas fa-user-friends"></i>
                <div class="player-pair">
                  ${match.team1?.players && match.team1.players.length >= 1 ? 
                    `<span class="player"><i class="fas fa-user"></i> ${match.team1.players[0]?.name || 'TBC'}</span>` : 
                    '<span class="player"><i class="fas fa-user"></i> TBC</span>'}
                  ${match.team1?.players && match.team1.players.length >= 2 ? 
                    `<span class="player"><i class="fas fa-user"></i> ${match.team1.players[1]?.name || 'TBC'}</span>` : 
                    '<span class="player"><i class="fas fa-user"></i> TBC</span>'}
                </div>
              </div>
            </div>
            <div class="team-score">${match.score1 !== undefined && match.score1 !== null ? match.score1 : '-'}</div>
            ${isTeam1Winner ? '<div class="winner-ribbon"><i class="fas fa-award"></i></div>' : ''}
          </div>
          <div class="team ${isTeam2Winner ? 'winner' : ''}" style="background: linear-gradient(to right, rgba(233, 30, 99, 0.05), rgba(173, 20, 87, 0.1)); border-left: 4px solid #e91e63;">
            <div class="team-avatar" style="background: linear-gradient(135deg, #e91e63, #ad1457); color: white;">
              ${match.team2?.name?.substring(0, 2) || '?'}
            </div>
            <div class="team-info">
              <div class="team-name">${match.team2?.name || 'TBD'}</div>
              <div class="team-players">
                <i class="fas fa-user-friends"></i>
                <div class="player-pair">
                  ${match.team2?.players && match.team2.players.length >= 1 ? 
                    `<span class="player"><i class="fas fa-user"></i> ${match.team2.players[0]?.name || 'TBC'}</span>` : 
                    '<span class="player"><i class="fas fa-user"></i> TBC</span>'}
                  ${match.team2?.players && match.team2.players.length >= 2 ? 
                    `<span class="player"><i class="fas fa-user"></i> ${match.team2.players[1]?.name || 'TBC'}</span>` : 
                    '<span class="player"><i class="fas fa-user"></i> TBC</span>'}
                </div>
              </div>
            </div>
            <div class="team-score">${match.score2 !== undefined && match.score2 !== null ? match.score2 : '-'}</div>
            ${isTeam2Winner ? '<div class="winner-ribbon"><i class="fas fa-award"></i></div>' : ''}
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  return html;
};

// Function to adjust color brightness (darken/lighten)
const adjustColor = (color, amount) => {
  // Remove the # if present
  color = color.replace('#', '');
  
  // Parse the color components
  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);
  
  // Adjust each component
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  
  // Convert back to hex
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Function to calculate team stats
const calculateTeamStats = (teams, rounds) => {
  // Create a copy of teams with stats initialized
  const teamsWithStats = teams.map(team => ({
    ...team,
    points: 0,
    played: 0,
    won: 0,
    lost: 0,
  }));

  // Process all matches to calculate stats
  if (rounds && rounds.length > 0) {
    rounds.forEach(round => {
      if (round.matches && round.matches.length > 0) {
        round.matches.forEach(match => {
          // Consider a match for stats if it's marked completed OR has a winner
          const isCompleted = match.completed || !!match.winner;
          if (isCompleted && match.team1 && match.team2) {
            // Find the team indices
            const team1Index = teamsWithStats.findIndex(t => t.id === match.team1.id);
            const team2Index = teamsWithStats.findIndex(t => t.id === match.team2.id);
            if (team1Index >= 0 && team2Index >= 0) {
              // Update matches played
              teamsWithStats[team1Index].played++;
              teamsWithStats[team2Index].played++;

              // If scores are present, update goals (optional, won't affect W/L/Pts)
              if (match.score1 !== undefined && match.score2 !== undefined && match.score1 !== null && match.score2 !== null) {
                if (!isNaN(parseInt(match.score1))) teamsWithStats[team1Index].goalsFor = (teamsWithStats[team1Index].goalsFor || 0) + parseInt(match.score1);
                if (!isNaN(parseInt(match.score2))) teamsWithStats[team1Index].goalsAgainst = (teamsWithStats[team1Index].goalsAgainst || 0) + parseInt(match.score2);
                if (!isNaN(parseInt(match.score2))) teamsWithStats[team2Index].goalsFor = (teamsWithStats[team2Index].goalsFor || 0) + parseInt(match.score2);
                if (!isNaN(parseInt(match.score1))) teamsWithStats[team2Index].goalsAgainst = (teamsWithStats[team2Index].goalsAgainst || 0) + parseInt(match.score1);
              }

              // Determine winner/loser
              if (match.winner) {
                if (match.winner === 'team1') {
                  teamsWithStats[team1Index].won++;
                  teamsWithStats[team1Index].points += 3;
                  teamsWithStats[team2Index].lost++;
                } else if (match.winner === 'team2') {
                  teamsWithStats[team2Index].won++;
                  teamsWithStats[team2Index].points += 3;
                  teamsWithStats[team1Index].lost++;
                } else if (match.winner === 'draw') {
                  // If you support draws
                  if (typeof teamsWithStats[team1Index].drawn === 'undefined') teamsWithStats[team1Index].drawn = 0;
                  if (typeof teamsWithStats[team2Index].drawn === 'undefined') teamsWithStats[team2Index].drawn = 0;
                  teamsWithStats[team1Index].drawn++;
                  teamsWithStats[team2Index].drawn++;
                  teamsWithStats[team1Index].points += 1;
                  teamsWithStats[team2Index].points += 1;
                }
              } else if (match.score1 !== undefined && match.score2 !== undefined && match.score1 !== null && match.score2 !== null) {
                // Fallback: use scores if winner not set
                if (match.score1 > match.score2) {
                  teamsWithStats[team1Index].won++;
                  teamsWithStats[team1Index].points += 3;
                  teamsWithStats[team2Index].lost++;
                } else if (match.score1 < match.score2) {
                  teamsWithStats[team2Index].won++;
                  teamsWithStats[team2Index].points += 3;
                  teamsWithStats[team1Index].lost++;
                } else {
                  if (typeof teamsWithStats[team1Index].drawn === 'undefined') teamsWithStats[team1Index].drawn = 0;
                  if (typeof teamsWithStats[team2Index].drawn === 'undefined') teamsWithStats[team2Index].drawn = 0;
                  teamsWithStats[team1Index].drawn++;
                  teamsWithStats[team2Index].drawn++;
                  teamsWithStats[team1Index].points += 1;
                  teamsWithStats[team2Index].points += 1;
                }
              }
            }
          }
        });
      }
    });
  }
  return teamsWithStats;
};

export default TournamentVisualizerEnhanced;
