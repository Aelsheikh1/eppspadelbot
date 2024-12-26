import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  Divider
} from '@mui/material';
import {
  People as PeopleIcon,
  SportsBaseball as GameIcon
} from '@mui/icons-material';
import GameManagement from './GameManagement';
import UserManagement from './UserManagement';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop();

  const handleTabChange = (event, newValue) => {
    navigate(`/admin/${newValue}`);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Admin Dashboard
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Tabs 
            value={currentPath === 'users' ? 'users' : 'games'}
            onChange={handleTabChange}
            sx={{ mb: 3 }}
          >
            <Tab 
              value="games" 
              label="Games Management" 
              icon={<GameIcon />} 
              iconPosition="start"
            />
            <Tab 
              value="users" 
              label="Users Management" 
              icon={<PeopleIcon />} 
              iconPosition="start"
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
