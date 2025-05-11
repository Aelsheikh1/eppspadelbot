import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  Divider
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  People as PeopleIcon,
  SportsBaseball as GameIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import GameManagement from './GameManagement';
import UserManagement from './UserManagement';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const currentPath = location.pathname.split('/').pop();

  const handleTabChange = (event, newValue) => {
    navigate(`/admin/${newValue}`);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Paper 
          elevation={isDarkMode ? 6 : 3} 
          sx={{ 
            p: 3,
            bgcolor: (theme) => theme.palette.mode === 'dark' 
              ? alpha(theme.palette.background.paper, 0.8) 
              : theme.palette.background.paper,
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.3)'
              : undefined,
            border: (theme) => theme.palette.mode === 'dark'
              ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
              : 'none',
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom
              sx={{ 
                color: (theme) => theme.palette.mode === 'dark' 
                  ? theme.palette.primary.light 
                  : theme.palette.primary.main,
                fontWeight: 'bold',
                textShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                mb: 0
              }}
            >
              Admin Dashboard
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<NotificationsIcon />}
              onClick={() => navigate('/send-notification')}
              sx={{ 
                backgroundColor: '#2A2A2A', 
                color: '#FFFFFF',
                '&:hover': { backgroundColor: '#4caf50' }
              }}
            >
              Notification Center
            </Button>
          </Box>
          <Divider sx={{ 
            mb: 3,
            borderColor: (theme) => theme.palette.mode === 'dark' 
              ? alpha(theme.palette.divider, 0.5) 
              : theme.palette.divider 
          }} />
          
          <Tabs 
            value={currentPath === 'users' ? 'users' : 'games'}
            onChange={handleTabChange}
            sx={{ 
              mb: 3,
              '& .MuiTabs-indicator': {
                backgroundColor: (theme) => theme.palette.mode === 'dark'
                  ? theme.palette.primary.light
                  : theme.palette.primary.main,
                height: 3,
                borderRadius: '3px 3px 0 0',
                boxShadow: (theme) => theme.palette.mode === 'dark'
                  ? '0 0 8px rgba(0, 0, 0, 0.3)'
                  : 'none'
              }
            }}
          >
            <Tab 
              value="games" 
              label="Games Management" 
              icon={<GameIcon />} 
              iconPosition="start"
              sx={{
                color: (theme) => theme.palette.mode === 'dark' && currentPath !== 'users'
                  ? theme.palette.primary.light
                  : undefined,
                '&.Mui-selected': {
                  color: (theme) => theme.palette.mode === 'dark'
                    ? theme.palette.primary.light
                    : undefined,
                  fontWeight: 'bold'
                },
                '& .MuiSvgIcon-root': {
                  color: (theme) => theme.palette.mode === 'dark' && currentPath !== 'users'
                    ? theme.palette.primary.light
                    : undefined
                }
              }}
            />
            <Tab 
              value="users" 
              label="Users Management" 
              icon={<PeopleIcon />} 
              iconPosition="start"
              sx={{
                color: (theme) => theme.palette.mode === 'dark' && currentPath === 'users'
                  ? theme.palette.primary.light
                  : undefined,
                '&.Mui-selected': {
                  color: (theme) => theme.palette.mode === 'dark'
                    ? theme.palette.primary.light
                    : undefined,
                  fontWeight: 'bold'
                },
                '& .MuiSvgIcon-root': {
                  color: (theme) => theme.palette.mode === 'dark' && currentPath === 'users'
                    ? theme.palette.primary.light
                    : undefined
                }
              }}
            />
          </Tabs>

          <Routes>
            <Route path="games" element={<GameManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="*" element={<GameManagement />} />
          </Routes>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminDashboard;
