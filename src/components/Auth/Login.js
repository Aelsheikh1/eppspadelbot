import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  Alert,
  Divider,
  IconButton
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  width: '100%',
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  borderRadius: '15px',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
}));

const LoginButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '10px',
  fontWeight: 600,
  textTransform: 'none',
  fontSize: '1rem',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
}));

const GoogleButton = styled(LoginButton)(({ theme }) => ({
  backgroundColor: '#ffffff',
  color: '#757575',
  border: '1px solid #dadce0',
  '&:hover': {
    backgroundColor: '#f8f9fa',
  },
}));

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle, getUserRole } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    try {
      setError('');
      setLoading(true);
      const user = await login(email, password);
      const role = await getUserRole(user.uid);
      
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later');
      } else {
        setError('Failed to sign in. Please try again later');
      }
    } finally {
      setLoading(false);
    }
  };

  async function handleGoogleSignIn() {
    try {
      setError('');
      setLoading(true);
      const user = await loginWithGoogle();
      const role = await getUserRole(user.uid);
      
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Pop-up blocked. Please allow pop-ups for this site');
      } else {
        setError('Failed to sign in with Google. Please try again later');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm">
      <StyledPaper elevation={3}>
        <img
          src="/logo192.png"
          alt="Logo"
          style={{ display: 'block', margin: '24px auto 16px auto', width: '24px', height: '24px' }}
        />
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: <LockIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
          <LoginButton
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            Sign In with Email
          </LoginButton>
        </Box>

        <Divider sx={{ my: 3 }}>OR</Divider>

        <GoogleButton
          fullWidth
          startIcon={<GoogleIcon />}
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          Continue with Google
        </GoogleButton>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link 
            href="/register" 
            variant="body2"
            sx={{ 
              color: '#1a73e8',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              }
            }}
          >
            {"Don't have an account? Sign Up"}
          </Link>
        </Box>
      </StyledPaper>
    </Container>
  );
}
