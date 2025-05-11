import React from 'react';
import { Link } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

const MobileNavbar = ({ mode, toggleTheme }) => {
  const { currentUser, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setDrawerOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: '#2A2A2A' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: '#FFFFFF' }}>
            PadelBot
          </Typography>
          <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#2A2A2A',
            color: '#FFFFFF',
            width: 250
          }
        }}
      >
        <List>
          <ListItem button component={Link} to="/" onClick={toggleDrawer(false)}>
            <ListItemText primary="Home" />
          </ListItem>
          
          {currentUser ? (
            <>
              <ListItem button component={Link} to="/games" onClick={toggleDrawer(false)}>
                <ListItemText primary="Games" />
              </ListItem>
              <ListItem button component={Link} to="/tournaments" onClick={toggleDrawer(false)}>
                <ListItemText primary="Tournaments" />
              </ListItem>
              <ListItem button component={Link} to="/mobile-notifications" onClick={toggleDrawer(false)}>
                <ListItemText primary="Notifications" />
              </ListItem>
              <ListItem button onClick={handleSignOut}>
                <ListItemText primary="Sign Out" />
              </ListItem>
            </>
          ) : (
            <ListItem button component={Link} to="/login" onClick={toggleDrawer(false)}>
              <ListItemText primary="Login" />
            </ListItem>
          )}
        </List>
      </Drawer>
    </>
  );
};

export default MobileNavbar;
