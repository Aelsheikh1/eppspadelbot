import React, { useState } from 'react';
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

export default function Navbar() {
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const { currentUser, isAdmin } = useAuth();
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
      text: 'Notifications',
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
          background: 'linear-gradient(45deg, #1a237e 30%, #283593 90%)',
          boxShadow: '0 3px 5px 2px rgba(33, 33, 33, .3)'
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters>
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
                color: 'inherit',
                textDecoration: 'none',
                flexGrow: 1,
              }}
            >
              EPPS PADELBOLT
            </Typography>

            {/* Mobile Menu */}
            <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="menu"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
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
                }}
              >
                {navButtons.filter(btn => btn.show).map((btn) => (
                  <MenuItem 
                    key={btn.text} 
                    onClick={() => {
                      handleCloseNavMenu();
                      navigate(btn.path);
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {btn.icon}
                      <Typography sx={{ ml: 1 }}>{btn.text}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </Box>

            {/* Mobile Logo */}
            <TennisIcon sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} />
            <Typography
              variant="h5"
              noWrap
              component="a"
              href="/"
              sx={{
                mr: 2,
                display: { xs: 'flex', md: 'none' },
                flexGrow: 1,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.3rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              EPPS PADELBOLT
            </Typography>

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
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '20px',
                    px: 3,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
              <Box sx={{ mx: 1 }}>
                <NotificationBell />
              </Box>
            )}

            {/* User Menu */}
            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title="Open settings">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar 
                    src={currentUser?.photoURL || undefined}
                    sx={{ 
                      bgcolor: 'secondary.main',
                      width: 40,
                      height: 40,
                      border: '2px solid white'
                    }}
                  >
                    {(!currentUser?.photoURL && currentUser?.firstName && currentUser?.lastName) ? 
                      `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase() :
                      (!currentUser?.photoURL ? <PersonIcon /> : null)
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
