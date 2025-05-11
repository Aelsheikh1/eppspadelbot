import React, { useState, useContext } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  SportsBaseball as TennisIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Games as GamesIcon,
  AdminPanelSettings as AdminIcon,
  EmojiEvents as TrophyIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import EditProfile from '../Profile/EditProfile';
import { signOut } from '../../services/firebase';
import NotificationBell from '../NotificationBell';
import { useThemeMode } from '../../index';
import { Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon } from '@mui/icons-material';

export default function Navbar() {
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const { currentUser, isAdmin } = useAuth();
  
  // Get theme context with fallback to dark mode if context is not available
  const themeContext = useThemeMode() || { themeMode: 'dark', toggleTheme: () => {} };
  const { themeMode, toggleTheme } = themeContext;
  
  const navigate = useNavigate();

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleEditProfile = () => {
    setEditProfileOpen(true);
    handleCloseUserMenu();
  };

  const handleLogout = async () => {
    try {
      handleCloseUserMenu();
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const navButtons = [
    {
      text: 'Games',
      icon: <GamesIcon />,
      path: '/',
      show: true
    },
    {
      text: 'Tournaments',
      icon: <TrophyIcon />,
      path: '/tournaments',
      show: true
    },
    {
      text: 'Notifications Settings',
      icon: <NotificationsIcon />,
      path: '/notifications',
      show: true
    },
    {
      text: 'Admin',
      icon: <AdminIcon />,
      path: '/admin',
      show: isAdmin
    }
  ];

  return (
    <>
      <AppBar 
        position="static"
        sx={{
          background: themeMode === 'dark' 
            ? 'linear-gradient(45deg, #2A2A2A 30%, #333333 90%)' 
            : 'linear-gradient(45deg, #1a237e 30%, #283593 90%)',
          boxShadow: themeMode === 'dark'
            ? '0 4px 8px 2px rgba(0, 0, 0, 0.5)'
            : '0 3px 5px 2px rgba(33, 33, 33, .3)',
          borderBottom: themeMode === 'dark' ? '1px solid #444444' : 'none'
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 } }}>
          <Toolbar disableGutters sx={{ minHeight: { xs: '56px', sm: '64px' } }}>
            {/* Desktop Logo */}
            <TennisIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
            <Typography
              variant="h6"
              noWrap
              component="a"
              href="/"
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'flex' },
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.3rem',
                color: themeMode === 'dark' ? '#FFFFFF' : 'inherit',
                textDecoration: 'none',
                flexGrow: 1,
                maxWidth: '350px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              EPPS PADELBOLT
            </Typography>

            {/* Mobile Menu */}
            <Box sx={{ 
              display: { xs: 'flex', md: 'none' }, 
              marginLeft: 'auto', 
              marginRight: 0.5,
              flexShrink: 0
            }}>
              <IconButton
                size="medium"
                aria-label="menu"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
                sx={{
                  backgroundColor: themeMode === 'dark' ? 'rgba(120, 144, 240, 0.1)' : 'transparent',
                  border: themeMode === 'dark' ? '1px solid rgba(120, 144, 240, 0.2)' : 'none',
                  '&:hover': {
                    backgroundColor: themeMode === 'dark' ? 'rgba(120, 144, 240, 0.2)' : 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{
                  display: { xs: 'block', md: 'none' },
                  '& .MuiPaper-root': {
                    backgroundColor: themeMode === 'dark' ? '#222222' : 'white',
                    borderRadius: 2,
                    mt: 1,
                    minWidth: '200px',
                    boxShadow: themeMode === 'dark' ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.1)',
                    border: themeMode === 'dark' ? '1px solid #444444' : 'none'
                  }
                }}
              >
                {navButtons.filter(btn => btn.show).map((btn) => (
                  <MenuItem 
                    key={btn.text} 
                    onClick={() => {
                      handleCloseNavMenu();
                      navigate(btn.path);
                    }}
                    sx={{
                      backgroundColor: themeMode === 'dark' ? '#2A2A2A' : 'inherit',
                      '&:hover': {
                        backgroundColor: themeMode === 'dark' ? '#3A3A3A' : 'rgba(0, 0, 0, 0.04)'
                      },
                      my: 0.8,
                      mx: 0.5,
                      borderRadius: 1,
                      padding: '10px 16px',
                      borderLeft: themeMode === 'dark' ? '3px solid #7890F0' : 'none'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Box sx={{ 
                        color: themeMode === 'dark' ? '#7890F0' : 'inherit',
                        display: 'flex',
                        minWidth: '24px'
                      }}>
                        {btn.icon}
                      </Box>
                      <Typography sx={{ 
                        ml: 2, 
                        color: themeMode === 'dark' ? '#FFFFFF' : 'inherit',
                        fontWeight: themeMode === 'dark' ? 600 : 400,
                        fontSize: '0.95rem',
                        flexGrow: 1
                      }}>
                        {btn.text}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </Box>

            {/* Mobile Logo and Title */}
            <Box sx={{ 
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center',
              flexGrow: 0,
              maxWidth: { xs: '30vw', sm: '40vw' }
            }}>
              <TennisIcon sx={{ mr: 0.5, fontSize: { xs: '1.3rem', sm: '1.5rem' } }} />
              <Typography
                variant="h6"
                component="a"
                href="/"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: { xs: '0.05rem', sm: '.1rem' },
                  color: themeMode === 'dark' ? '#FFFFFF' : 'inherit',
                  textDecoration: 'none',
                  fontSize: { xs: '0.75rem', sm: '0.85rem' },
                  lineHeight: 1.1,
                  textAlign: 'left'
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ fontWeight: 800 }}>EPPS</Box>
                  <Box>PADELBOLT</Box>
                </Box>
              </Typography>
            </Box>

            {/* Desktop Navigation Buttons */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              {navButtons.filter(btn => btn.show).map((btn) => (
                <Button
                  key={btn.text}
                  onClick={() => {
                    handleCloseNavMenu();
                    navigate(btn.path);
                  }}
                  sx={{
                    my: 2,
                    mx: 1,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '20px',
                    px: 3,
                    fontWeight: 600,
                    backgroundColor: themeMode === 'dark' ? 'rgba(120, 144, 240, 0.15)' : 'transparent',
                    border: themeMode === 'dark' ? '1px solid rgba(120, 144, 240, 0.3)' : 'none',
                    boxShadow: themeMode === 'dark' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                    '&:hover': {
                      backgroundColor: themeMode === 'dark' 
                        ? 'rgba(120, 144, 240, 0.25)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    },
                  }}
                  startIcon={btn.icon}
                >
                  {btn.text}
                </Button>
              ))}
            </Box>

            {/* Add NotificationBell before the profile menu, with tooltip and link to settings */}
            {currentUser && (
              <Box sx={{ mx: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
                <NotificationBell />
              </Box>
            )}
            
            {/* Theme Toggle Button */}
            <Tooltip title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}>
              <IconButton
                onClick={toggleTheme}
                color="inherit"
                sx={{
                  ml: 1,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                  },
                  transition: 'all 0.3s',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {/* User Menu and Username Badge */}
            <Box sx={{ 
              flexGrow: 0, 
              display: 'flex', 
              alignItems: 'center', 
              gap: { xs: 0.5, sm: 1 },
              flexShrink: 0,
              ml: { xs: 0.5, sm: 1 }
            }}>
              {/* Username Badge */}
              {currentUser && (
                <Box
                  sx={{
                    px: { xs: 1, sm: 2 },
                    py: 0.5,
                    borderRadius: '999px',
                    background: 'linear-gradient(90deg, #43ea7b 0%, #19c37d 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: { xs: '0.75rem', sm: '0.9rem' },
                    boxShadow: '0 2px 8px 0 rgba(25,195,125,0.15)',
                    letterSpacing: { xs: '0.02em', sm: '0.05em' },
                    border: '2px solid #19c37d',
                    maxWidth: { xs: 80, sm: 180 },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mr: { xs: 0.5, sm: 1 },
                    display: { xs: 'block', md: 'block' }
                  }}
                  data-testid="navbar-username-badge"
                >
                  {currentUser.firstName
                    ? currentUser.firstName
                    : currentUser.email?.split('@')[0] || 'User'}
                </Box>
              )}
              <Tooltip title="Open settings">
                <IconButton 
                  onClick={handleOpenUserMenu} 
                  sx={{ 
                    p: 0,
                    ml: { xs: 0, sm: 0.5 },
                    flexShrink: 0
                  }}
                >
                  <Avatar 
                    src={currentUser?.photoURL || undefined}
                    sx={{ 
                      bgcolor: 'secondary.main',
                      width: { xs: 32, sm: 40 },
                      height: { xs: 32, sm: 40 },
                      border: '2px solid white'
                    }}
                  >
                    {(!currentUser?.photoURL && currentUser?.firstName && currentUser?.lastName) ? 
                      `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase() :
                      (!currentUser?.photoURL ? <PersonIcon sx={{ fontSize: { xs: 16, sm: 24 } }} /> : null)
                    }
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                    mt: 1.5,
                    '& .MuiAvatar-root': {
                      width: 32,
                      height: 32,
                      ml: -0.5,
                      mr: 1,
                    },
                  },
                }}
              >
                <MenuItem onClick={handleEditProfile}>
                  <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                  <Typography>Edit Profile</Typography>
                </MenuItem>
                <Divider />
                <MenuItem 
                  onClick={handleLogout}
                  sx={{
                    color: 'error.main',
                    '&:hover': {
                      backgroundColor: 'error.light',
                      color: 'error.contrastText',
                    },
                  }}
                >
                  <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                  <Typography>Logout</Typography>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <EditProfile
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        onProfileUpdated={async () => {
          // Refresh user context after profile update
          if (typeof window !== 'undefined') {
            window.location.reload(); // Quick fix: reload to ensure avatar updates everywhere
          }
        }}
      />
    </>
  );
}
