import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Alert,
  Snackbar,
  CircularProgress,
  Fade,
  Slide,
} from '@mui/material';
import { Google as GoogleIcon, EmojiEvents as TrophyIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { keyframes } from '@mui/system';

const bounceAnimation = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-30px);
  }
  60% {
    transform: translateY(-15px);
  }
`;

const glowAnimation = keyframes`
  0% {
    box-shadow: 0 0 5px #1a237e;
  }
  50% {
    box-shadow: 0 0 20px #1a237e, 0 0 30px #0d47a1;
  }
  100% {
    box-shadow: 0 0 5px #1a237e;
  }
`;

export default function LandingPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      setIsExiting(true);
      setTimeout(() => {
        navigate('/games');
      }, 500);
    } catch (error) {
      console.error('Error signing in:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (currentUser) {
      setIsExiting(true);
      setTimeout(() => {
        navigate('/games');
      }, 500);
    }
  }, [currentUser, navigate]);

  return (
    <Fade in={!isExiting} timeout={800}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
          py: { xs: 4, sm: 6, md: 8 },
        }}
      >
        <Container maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: { xs: 2, sm: 3, md: 4 } }}>
          <Slide direction="down" in={!isExiting} timeout={800}>
            <Paper
              elevation={24}
              sx={{
                p: { xs: 3, sm: 4, md: 5 },
                width: '100%',
                maxWidth: '600px',
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden',
                '&:before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #1a237e, #0d47a1)',
                },
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                mb: 3, 
                background: 'linear-gradient(45deg, #FFD700, #FFA500)', 
                borderRadius: '50%', 
                p: { xs: 3, sm: 3.5, md: 4 },  
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                transform: 'scale(1.2)',  
                margin: '20px auto'  
              }}>
                <TrophyIcon sx={{ 
                  fontSize: { xs: 100, sm: 120, md: 140 },  
                  color: 'white' 
                }} />
              </Box>

              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4, width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
                  <Typography component="h1" sx={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: { xs: '2rem', sm: '2.8rem', md: '3.5rem' }, color: '#1a237e', textAlign: 'center', mb: 2, textShadow: '2px 2px 4px rgba(0,0,0,0.2)', wordWrap: 'break-word', maxWidth: '100%', lineHeight: 1.2 }}>
                    EPPS Padel Champions
                  </Typography>
                </Box>

                <Typography variant="h6" align="center" sx={{ mb: 4, color: 'text.secondary', fontWeight: 500, maxWidth: '90%', mx: 'auto', px: { xs: 2, sm: 3 }, fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' } }}>
                  Join the ultimate padel experience
                </Typography>
              </>
              <Button variant="contained" startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />} onClick={handleSignIn} disabled={loading || isExiting} sx={{ py: 1.5, px: 6, borderRadius: 50, textTransform: 'none', fontSize: '1.2rem', fontWeight: 600, backgroundColor: '#4285f4', boxShadow: '0 4px 6px rgba(66, 133, 244, 0.3)', transition: 'all 0.3s ease', '&:hover': { backgroundColor: '#3367d6', transform: 'translateY(-2px)', boxShadow: '0 6px 8px rgba(66, 133, 244, 0.4)' }, '&:active': { transform: 'translateY(1px)' } }}>
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
            </Paper>
          </Slide>
        </Container>

        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} TransitionComponent={Slide}>
          <Alert onClose={() => setError('')} severity="error" variant="filled" sx={{ width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
}
