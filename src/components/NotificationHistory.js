import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';

// Component to display notification history
const NotificationHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notification history on component mount
  useEffect(() => {
    fetchNotificationHistory();
  }, []);

  const fetchNotificationHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Replace with actual API call to fetch notification history
      // For now, using mock data
      const mockHistory = [
        { id: '1', title: 'Game Update', body: 'New game available', sentAt: new Date().toISOString(), recipients: 'All Users' },
        { id: '2', title: 'Maintenance Notice', body: 'System will be down for maintenance', sentAt: new Date(Date.now() - 86400000).toISOString(), recipients: 'Admins' }
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setHistory(mockHistory);
    } catch (error) {
      console.error('Failed to fetch notification history:', error);
      setError('Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };

  // Styles for dark mode
  const styles = {
    content: {
      padding: '1rem'
    },
    historyItem: {
      backgroundColor: '#3A3A3A',
      marginBottom: '1rem',
      borderRadius: '4px',
      padding: '1rem'
    },
    title: {
      color: '#FFFFFF',
      fontWeight: 'bold'
    },
    body: {
      color: '#FFFFFF',
      opacity: 0.8
    },
    meta: {
      color: '#FFFFFF',
      opacity: 0.6,
      fontSize: '0.8rem',
      marginTop: '0.5rem'
    },
    divider: {
      backgroundColor: '#4A4A4A'
    },
    error: {
      color: '#FF6B6B',
      marginTop: '1rem'
    }
  };

  return (
    <Box sx={styles.content}>
      <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2 }}>
        Notification History
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress sx={{ color: '#FFFFFF' }} />
        </Box>
      ) : error ? (
        <Typography sx={styles.error}>{error}</Typography>
      ) : history.length === 0 ? (
        <Typography sx={{ color: '#FFFFFF' }}>No notification history found.</Typography>
      ) : (
        <List>
          {history.map((notification) => (
            <ListItem key={notification.id} sx={styles.historyItem}>
              <ListItemText
                primary={
                  <Typography sx={styles.title}>{notification.title}</Typography>
                }
                secondary={
                  <>
                    <Typography sx={styles.body}>{notification.body}</Typography>
                    <Typography sx={styles.meta}>
                      Sent: {new Date(notification.sentAt).toLocaleString()} • 
                      Recipients: {notification.recipients}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default NotificationHistory;
