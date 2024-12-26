import React, { useState, useEffect } from 'react';
import { Box, Stack, Typography, LinearProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { parseISO, differenceInSeconds, addHours } from 'date-fns';
import { AccessTime, LockClock, Lock } from '@mui/icons-material';

const CountdownTimer = ({ gameDate, gameTime, onTimeUp, status }) => {
  const [timeData, setTimeData] = useState({
    gameTime: '',
    registrationTime: '',
    progress: 100,
    isExpired: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
        const gameDateTime = parseISO(`${gameDate}T${gameTime}`);
        const registrationDeadline = addHours(gameDateTime, -1); // Registration closes 1 hour before
        const now = new Date();

        const gameSecondsLeft = differenceInSeconds(gameDateTime, now);
        const registrationSecondsLeft = differenceInSeconds(registrationDeadline, now);
        
        // Calculate total duration and progress
        const totalDuration = differenceInSeconds(gameDateTime, registrationDeadline);
        const progress = Math.max(0, Math.min(100, (registrationSecondsLeft / totalDuration) * 100));

        if (gameSecondsLeft <= 0) {
          if (!timeData.isExpired) {
            onTimeUp && onTimeUp();
          }
          return {
            gameTime: 'Game Started',
            registrationTime: 'Closed',
            progress: 0,
            isExpired: true
          };
        }

        const formatTime = (seconds) => {
          if (seconds <= 0) return 'Closed';
          
          const days = Math.floor(seconds / (24 * 60 * 60));
          const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
          const minutes = Math.floor((seconds % (60 * 60)) / 60);
          const secs = seconds % 60;

          const parts = [];
          if (days > 0) parts.push(`${days}d`);
          if (hours > 0 || days > 0) parts.push(`${hours}h`);
          if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
          if (!days && hours < 2) parts.push(`${secs}s`);

          return parts.join(' ');
        };

        return {
          gameTime: formatTime(gameSecondsLeft),
          registrationTime: formatTime(registrationSecondsLeft),
          progress: progress,
          isExpired: false
        };
      } catch (error) {
        console.error('Error calculating time:', error);
        return {
          gameTime: 'Invalid date',
          registrationTime: 'Invalid date',
          progress: 0,
          isExpired: true
        };
      }
    };

    const timer = setInterval(() => {
      setTimeData(calculateTimeLeft());
    }, 1000);

    setTimeData(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [gameDate, gameTime, onTimeUp]);

  const getStatusColor = () => {
    if (status === 'closed') return 'error';
    if (timeData.registrationTime === 'Closed') return 'error';
    if (status === 'full') return 'warning';
    return 'primary';
  };

  const getStatusIcon = () => {
    if (status === 'closed') return <Lock sx={{ fontSize: 16 }} />;
    if (timeData.registrationTime === 'Closed') return <LockClock sx={{ fontSize: 16 }} />;
    return <AccessTime sx={{ fontSize: 16 }} />;
  };

  const getStatusText = () => {
    if (status === 'closed') return 'Game Closed';
    if (status === 'full') return 'Game Full';
    if (timeData.registrationTime === 'Closed') return 'Registration Closed';
    return 'Time until game';
  };

  return (
    <Stack spacing={0.5} sx={{ minWidth: 200 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 1,
        backgroundColor: (theme) => theme.palette[getStatusColor()].main,
        color: 'white',
        borderRadius: '4px 4px 0 0',
        padding: '4px 8px',
      }}>
        {getStatusIcon()}
        <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
          {getStatusText()}
        </Typography>
      </Box>
      
      <Box sx={{ 
        border: 1, 
        borderColor: (theme) => theme.palette[getStatusColor()].main,
        borderRadius: '0 0 4px 4px',
        padding: '8px',
        backgroundColor: (theme) => theme.palette.background.paper,
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: (theme) => theme.palette[getStatusColor()].main,
            textAlign: 'center',
            fontSize: '1.1rem',
            mb: 0.5,
            animation: timeData.isExpired ? 'none' : 'pulse 1s infinite',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.6 },
              '100%': { opacity: 1 },
            },
          }}
        >
          {timeData.gameTime}
        </Typography>

        {status !== 'closed' && status !== 'full' && timeData.registrationTime !== 'Closed' && (
          <>
            <LinearProgress 
              variant="determinate" 
              value={timeData.progress}
              sx={{ 
                height: 4,
                borderRadius: 2,
                mb: 0.5,
                backgroundColor: (theme) => theme.palette[getStatusColor()].light,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: (theme) => theme.palette[getStatusColor()].main,
                }
              }}
            />
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                '& .label': {
                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  padding: '2px 6px',
                  borderRadius: 1,
                  fontWeight: 'medium',
                },
                '& .time': {
                  color: (theme) => theme.palette[getStatusColor()].main,
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  backgroundColor: (theme) => alpha(theme.palette[getStatusColor()].main, 0.1),
                  padding: '2px 6px',
                  borderRadius: 1,
                }
              }}
            >
              <span className="label">Registration ends at</span>
              <span className="time">{timeData.registrationTime}</span>
            </Typography>
          </>
        )}
      </Box>
    </Stack>
  );
};

export default CountdownTimer;
