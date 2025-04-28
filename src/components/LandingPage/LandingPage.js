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
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Google as GoogleIcon } from '@mui/icons-material';
import SplashLogo from './SplashLogo';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';



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

  const theme = useTheme();

  return (
    <Fade in={!isExiting} timeout={600}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #f5f5f5 0%, #e8f5fe 100%)',
          py: { xs: 4, sm: 6, md: 8 },
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(0, 0, 0, 0.02) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(0, 0, 0, 0.02) 2%, transparent 0%)',
            backgroundSize: '100px 100px',
            opacity: 0.5,
            zIndex: 1,
          }
        }}
      >
        <Container maxWidth="sm" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: { xs: 2, sm: 3 } }}>
          <Slide direction="down" in={!isExiting} timeout={600}>
            <Paper
              elevation={2}
              sx={{
                p: { xs: 4, sm: 5 },
                width: '100%',
                maxWidth: '480px',
                borderRadius: 3,
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                zIndex: 2,
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '4px',
                  background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
                }
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center',
                mb: 4,
                mt: 1,
                textAlign: 'center',
              }}>
                <SplashLogo size={88} />
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    letterSpacing: '-0.5px',
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    ml: 0,
                    pr: 0,
                  }}
                >
                  PadelBolt
                </Typography>
              </Box>

              <Box sx={{ width: '100%', mb: 4 }}>
                <Box sx={{
                  position: 'relative',
                  mb: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  overflow: 'hidden'
                }}>
                  {/* Background decorative elements */}
                  <Box sx={{
                    position: 'absolute',
                    width: '120%',
                    height: '100%',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: `linear-gradient(90deg, 
                      ${alpha(theme.palette.primary.light, 0)}, 
                      ${alpha(theme.palette.primary.light, 0.1)}, 
                      ${alpha(theme.palette.primary.light, 0)})`,
                    zIndex: 0,
                    borderRadius: '50%',
                    filter: 'blur(8px)'
                  }} />
                  
                  {/* Tennis ball decorative elements */}
                  <Box sx={{
                    position: 'absolute',
                    width: '40px',
                    height: '40px',
                    top: '5px',
                    left: '10%',
                    background: 'linear-gradient(135deg, #B5E61D 0%, #7AAD03 100%)',
                    borderRadius: '50%',
                    opacity: 0.7,
                    zIndex: 0,
                    boxShadow: '0 0 10px rgba(181, 230, 29, 0.5)'
                  }} />
                  
                  <Box sx={{
                    position: 'absolute',
                    width: '25px',
                    height: '25px',
                    bottom: '10px',
                    right: '15%',
                    background: 'linear-gradient(135deg, #B5E61D 0%, #7AAD03 100%)',
                    borderRadius: '50%',
                    opacity: 0.5,
                    zIndex: 0,
                    boxShadow: '0 0 8px rgba(181, 230, 29, 0.4)'
                  }} />
                  
                  {/* Main title with metallic effect */}
                  <Typography 
                    variant="h3" 
                    align="center" 
                    sx={{ 
                      fontWeight: 900, 
                      letterSpacing: '1px',
                      lineHeight: 1.2,
                      position: 'relative',
                      zIndex: 1,
                      textTransform: 'uppercase',
                      padding: '15px 20px',
                      background: `linear-gradient(135deg, 
                        #2196F3 0%, 
                        #64B5F6 25%, 
                        #1976D2 50%, 
                        #42A5F5 75%, 
                        #0D47A1 100%)`,
                      backgroundSize: '200% auto',
                      color: 'transparent',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      textShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)',
                      animation: 'shine 3s linear infinite',
                      '@keyframes shine': {
                        to: {
                          backgroundPosition: '200% center'
                        }
                      },
                      '&::before': {
                        content: '"EPPS Padel Champions"',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: -1,
                        color: alpha(theme.palette.primary.main, 0.1),
                        textShadow: 'none',
                        padding: '15px 20px',
                        transform: 'translateY(2px) translateX(2px)',
                        filter: 'blur(4px)'
                      }
                    }}
                  >
                    EPPS Padel Champions
                  </Typography>
                  
                  {/* Decorative elements */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    mt: 1,
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <Box sx={{
                      width: '30%',
                      height: '3px',
                      background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main})`,
                      borderRadius: '2px',
                    }} />
                    <Box sx={{
                      mx: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: theme.palette.primary.main,
                    }}>
                      {/* TennisIcon removed, replaced by empty space for alignment */}
                    </Box>
                    <Box sx={{
                      width: '30%',
                      height: '3px',
                      background: `linear-gradient(90deg, ${theme.palette.primary.main}, transparent)`,
                      borderRadius: '2px',
                    }} />
                  </Box>
                </Box>
                <Typography 
                  variant="body1" 
                  align="center" 
                  sx={{ 
                    color: theme.palette.text.secondary,
                    mb: 2,
                    px: 1,
                    lineHeight: 1.5,
                    fontWeight: 500
                  }}
                >
                  Join EPPS ultimate padel experience
                </Typography>
              </Box>

              <Button 
                variant="contained" 
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />} 
                onClick={handleSignIn} 
                disabled={loading || isExiting} 
                sx={{ 
                  py: 1.8, 
                  px: 5, 
                  borderRadius: 6, 
                  textTransform: 'none', 
                  fontSize: '1.05rem', 
                  fontWeight: 500, 
                  backgroundColor: theme.palette.primary.main,
                  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12)',
                  transition: 'all 0.25s ease',
                  '&:hover': { 
                    backgroundColor: theme.palette.primary.dark,
                    boxShadow: '0 6px 15px rgba(0, 0, 0, 0.18)',
                    transform: 'translateY(-2px)'
                  },
                  '&:active': {
                    transform: 'translateY(1px)'
                  }
                }}
              >
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
              
              <Box sx={{ mt: 4, width: '100%' }}>
                <Typography 
                  variant="body2" 
                  align="center"
                  sx={{ 
                    color: theme.palette.text.secondary,
                    fontSize: '0.85rem'
                  }}
                >
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </Typography>
              </Box>
              
              <Typography 
                variant="caption" 
                sx={{ 
                  mt: 3, 
                  color: theme.palette.primary.main,
                  opacity: 0.9,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  letterSpacing: '0.5px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                }}
              >
                Version 2 Beta
              </Typography>
            </Paper>
          </Slide>
        </Container>

        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError('')} 
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} 
          TransitionComponent={Slide}
        >
          <Alert 
            onClose={() => setError('')} 
            severity="error" 
            variant="filled" 
            sx={{ 
              width: '100%', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: 1
            }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
}
