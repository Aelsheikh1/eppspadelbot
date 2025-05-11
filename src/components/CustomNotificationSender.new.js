import React, { useState, useEffect } from 'react';
import { sendCustomNotification, getNotificationUsers } from '../utils/customNotificationSender';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  Switch
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Send as SendIcon,
  Link as LinkIcon,
  NotificationsActive as NotificationsActiveIcon,
  History as HistoryIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import styles from './CustomNotificationSender.styles';

const CustomNotificationSender = () => {
  const navigate = useNavigate();
  
  // Basic notification fields
  const [title, setTitle] = useState('Test Notification');
  const [body, setBody] = useState('This is a test notification from the custom sender');
  
  // Targeting options
  const [targetType, setTargetType] = useState('all'); // 'all', 'user', 'role'
  const [targetUserId, setTargetUserId] = useState('');
  const [targetRole, setTargetRole] = useState('user');
  
  // Advanced options
  const [notificationType, setNotificationType] = useState('basic'); // 'basic', 'link', 'action'
  const [gameId, setGameId] = useState('');
  const [url, setUrl] = useState('/games');
  const [actionText, setActionText] = useState('View');
  const [priority, setPriority] = useState('normal'); // 'low', 'normal', 'high'
  const [expiration, setExpiration] = useState(0); // 0 = no expiration, otherwise hours
  
  // UI state
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
  // History
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Template options
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  // Load data on component mount
  useEffect(() => {
    fetchUsers();
    fetchNotificationHistory();
    loadTemplates();
  }, []);
  
  // Fetch users for targeting
  const fetchUsers = async () => {
    try {
      const result = await getNotificationUsers();
      if (result.success) {
        setUsers(result.users);
      } else {
        setError(result.error);
        showSnackbarMessage(result.error, 'error');
      }
    } catch (err) {
      setError(err.message);
      showSnackbarMessage(`Error loading users: ${err.message}`, 'error');
    }
  };
  
  // Fetch notification history
  const fetchNotificationHistory = async () => {
    setLoadingHistory(true);
    try {
      // Get current user
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;
      
      // Get notifications from Firestore
      const { db } = await import('../services/firebase');
      const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
      
      const q = query(
        collection(db, 'customNotifications'),
        where('senderId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const history = [];
      
      querySnapshot.forEach((doc) => {
        history.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? new Date(doc.data().createdAt).toLocaleString() : 'Unknown'
        });
      });
      
      setNotificationHistory(history);
    } catch (err) {
      console.error('Error fetching notification history:', err);
      showSnackbarMessage(`Error loading history: ${err.message}`, 'error');
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Load notification templates
  const loadTemplates = async () => {
    try {
      // Get current user
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;
      
      // Get templates from localStorage
      const savedTemplates = localStorage.getItem('notificationTemplates');
      if (savedTemplates) {
        setTemplates(JSON.parse(savedTemplates));
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };
  
  // Save current notification as template
  const saveTemplate = () => {
    if (!templateName) {
      showSnackbarMessage('Please enter a template name', 'warning');
      return;
    }
    
    try {
      const newTemplate = {
        id: Date.now().toString(),
        name: templateName,
        title,
        body,
        notificationType,
        url,
        actionText,
        priority,
        gameId
      };
      
      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      localStorage.setItem('notificationTemplates', JSON.stringify(updatedTemplates));
      
      showSnackbarMessage('Template saved successfully', 'success');
      setTemplateName('');
      setSaveAsTemplate(false);
    } catch (err) {
      console.error('Error saving template:', err);
      showSnackbarMessage('Error saving template', 'error');
    }
  };
  
  // Load a template
  const loadTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    setTitle(template.title || '');
    setBody(template.body || '');
    setNotificationType(template.notificationType || 'basic');
    setUrl(template.url || '/games');
    setActionText(template.actionText || 'View');
    setPriority(template.priority || 'normal');
    setGameId(template.gameId || '');
    
    setSelectedTemplate('');
    showSnackbarMessage('Template loaded', 'success');
  };
  
  // Delete a template
  const deleteTemplate = (templateId) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(updatedTemplates);
    localStorage.setItem('notificationTemplates', JSON.stringify(updatedTemplates));
    showSnackbarMessage('Template deleted', 'success');
  };
  
  // Show snackbar message
  const showSnackbarMessage = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setShowSnackbar(true);
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 1) {
      // Refresh history when switching to history tab
      fetchNotificationHistory();
    }
  };
  
  // Send notification
  const handleSendNotification = async () => {
    // Validate inputs
    if (!title.trim()) {
      showSnackbarMessage('Please enter a notification title', 'warning');
      return;
    }
    
    if (!body.trim()) {
      showSnackbarMessage('Please enter notification content', 'warning');
      return;
    }
    
    if (targetType === 'user' && !targetUserId) {
      showSnackbarMessage('Please select a target user', 'warning');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Prepare notification options
      const options = {
        title,
        body,
        notificationType,
        priority,
        data: {
          gameId: gameId || null,
          url: url || '/games',
          actionText: actionText || 'View',
          timestamp: Date.now()
        }
      };
      
      // Add expiration if set
      if (expiration > 0) {
        const expirationTime = new Date();
        expirationTime.setHours(expirationTime.getHours() + parseInt(expiration));
        options.expiresAt = expirationTime.toISOString();
      }
      
      // Add targeting based on selection
      if (targetType === 'user' && targetUserId) {
        options.targetUserId = targetUserId;
      } else if (targetType === 'role' && targetRole) {
        options.targetRole = targetRole;
      }
      
      // Send notification
      const result = await sendCustomNotification(options);
      setResult(result);
      
      if (result.success) {
        showSnackbarMessage('Notification sent successfully!', 'success');
        
        // Save as template if requested
        if (saveAsTemplate && templateName) {
          saveTemplate();
        }
        
        // Refresh history
        setTimeout(() => fetchNotificationHistory(), 1000);
      } else {
        setError(result.error);
        showSnackbarMessage(result.error, 'error');
      }
    } catch (err) {
      setError(err.message);
      showSnackbarMessage(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={styles.container}>
        <Paper elevation={3} sx={styles.paper}>
          <Box sx={styles.header}>
            <IconButton 
              onClick={() => navigate('/admin/dashboard')} 
              sx={styles.backButton}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1" sx={styles.title}>
              <NotificationsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Notification Center
            </Typography>
          </Box>
          
          <Divider sx={styles.divider} />
          
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={styles.tabs}
          >
            <Tab 
              icon={<NotificationsActiveIcon />} 
              label="Send Notification" 
              sx={styles.tab}
            />
            <Tab 
              icon={<HistoryIcon />} 
              label="History" 
              sx={styles.tab}
            />
          </Tabs>
          
          {activeTab === 0 && (
            <Box>
              {/* Template Selection */}
              {templates.length > 0 && (
                <Box sx={styles.templateBox}>
                  <Typography variant="subtitle1" sx={styles.subsectionTitle}>
                    Load from Template
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={8}>
                      <FormControl fullWidth variant="outlined" size="small">
                        <Select
                          value={selectedTemplate}
                          onChange={(e) => setSelectedTemplate(e.target.value)}
                          displayEmpty
                          sx={styles.select}
                        >
                          <MenuItem value="">
                            <em>Select a template</em>
                          </MenuItem>
                          {templates.map(template => (
                            <MenuItem key={template.id} value={template.id}>
                              {template.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button 
                        variant="contained" 
                        color="primary"
                        disabled={!selectedTemplate}
                        onClick={() => loadTemplate(selectedTemplate)}
                        sx={styles.button}
                      >
                        Load Template
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              )}
              
              {/* Basic Notification Info */}
              <Typography variant="h6" sx={styles.sectionTitle}>
                Basic Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    label="Notification Title"
                    variant="outlined"
                    fullWidth
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    InputLabelProps={{ style: { color: '#FFFFFF' } }}
                    sx={styles.textField}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Notification Content"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    InputLabelProps={{ style: { color: '#FFFFFF' } }}
                    sx={styles.textField}
                  />
                </Grid>
                
                {/* Notification Type */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={styles.subsectionTitle}>
                    Notification Type
                  </Typography>
                  <FormControl component="fieldset">
                    <RadioGroup 
                      row 
                      value={notificationType} 
                      onChange={(e) => setNotificationType(e.target.value)}
                    >
                      <FormControlLabel 
                        value="basic" 
                        control={<Radio sx={styles.radio} />} 
                        label="Basic Notification" 
                      />
                      <FormControlLabel 
                        value="link" 
                        control={<Radio sx={styles.radio} />} 
                        label="With Link" 
                      />
                      <FormControlLabel 
                        value="action" 
                        control={<Radio sx={styles.radio} />} 
                        label="With Action Button" 
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                
                {/* Target Recipients */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 2, color: '#FFFFFF' }}>
                    Target Recipients
                  </Typography>
                  <FormControl component="fieldset">
                    <RadioGroup 
                      row 
                      value={targetType} 
                      onChange={(e) => setTargetType(e.target.value)}
                    >
                      <FormControlLabel 
                        value="all" 
                        control={<Radio sx={styles.radio} />} 
                        label="All Users" 
                      />
                      <FormControlLabel 
                        value="user" 
                        control={<Radio sx={styles.radio} />} 
                        label="Specific User" 
                      />
                      <FormControlLabel 
                        value="role" 
                        control={<Radio sx={styles.radio} />} 
                        label="By Role" 
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                
                {targetType === 'user' && (
                  <Grid item xs={12}>
                    <FormControl fullWidth variant="outlined">
                      <Select
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        displayEmpty
                        sx={styles.select}
                      >
                        <MenuItem value="">
                          <em>Select a user</em>
                        </MenuItem>
                        {users.map(user => (
                          <MenuItem key={user.id} value={user.id}>
                            {user.displayName || user.email} {user.isAdmin && '(Admin)'}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                {targetType === 'role' && (
                  <Grid item xs={12}>
                    <FormControl fullWidth variant="outlined">
                      <Select
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        sx={styles.select}
                      >
                        <MenuItem value="user">Regular Users</MenuItem>
                        <MenuItem value="admin">Admin Users</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                {/* Advanced Options */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 2, color: '#FFFFFF' }}>
                    Advanced Options
                  </Typography>
                </Grid>
                
                {(notificationType === 'link' || notificationType === 'action') && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="URL"
                      variant="outlined"
                      fullWidth
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LinkIcon sx={{ color: '#FFFFFF' }} />
                          </InputAdornment>
                        ),
                      }}
                      InputLabelProps={{ style: { color: '#FFFFFF' } }}
                      sx={styles.textField}
                    />
                  </Grid>
                )}
                
                {notificationType === 'action' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Button Text"
                      variant="outlined"
                      fullWidth
                      value={actionText}
                      onChange={(e) => setActionText(e.target.value)}
                      InputLabelProps={{ style: { color: '#FFFFFF' } }}
                      sx={styles.textField}
                    />
                  </Grid>
                )}
                
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Game ID (Optional)"
                    variant="outlined"
                    fullWidth
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    InputLabelProps={{ style: { color: '#FFFFFF' } }}
                    sx={styles.textField}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth variant="outlined">
                    <Select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      displayEmpty
                      label="Priority"
                      sx={styles.select}
                    >
                      <MenuItem value="low">Low Priority</MenuItem>
                      <MenuItem value="normal">Normal Priority</MenuItem>
                      <MenuItem value="high">High Priority</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Save as Template */}
                <Grid item xs={12}>
                  <Box sx={styles.advancedOptionsBox}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={saveAsTemplate}
                          onChange={(e) => setSaveAsTemplate(e.target.checked)}
                          sx={styles.switch}
                        />
                      }
                      label="Save as Template"
                    />
                    
                    {saveAsTemplate && (
                      <TextField
                        label="Template Name"
                        variant="outlined"
                        fullWidth
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        InputLabelProps={{ style: { color: '#FFFFFF' } }}
                        sx={{ 
                          mt: 2,
                          ...styles.textField
                        }}
                      />
                    )}
                  </Box>
                </Grid>
                
                {/* Send Button */}
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    startIcon={<SendIcon />}
                    onClick={handleSendNotification}
                    disabled={loading}
                    sx={styles.sendButton}
                  >
                    {loading ? 'Sending...' : 'Send Notification'}
                  </Button>
                </Grid>
                
                {/* Result */}
                {result && (
                  <Grid item xs={12}>
                    <Alert 
                      severity={result.success ? 'success' : 'error'}
                      sx={{ mt: 2 }}
                    >
                      {result.success ? (
                        <>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            Notification Sent Successfully!
                          </Typography>
                          <Typography variant="body2">
                            Notification ID: {result.notificationId}<br />
                            Sent to {result.tokenCount} devices
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            Failed to Send Notification
                          </Typography>
                          <Typography variant="body2">
                            {result.error}
                          </Typography>
                        </>
                      )}
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
          
          {/* History Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" sx={styles.sectionTitle}>
                Recent Notifications
              </Typography>
              
              {loadingHistory ? (
                <Typography>Loading history...</Typography>
              ) : notificationHistory.length === 0 ? (
                <Typography>No notifications sent yet</Typography>
              ) : (
                <Grid container spacing={2}>
                  {notificationHistory.map((notification) => (
                    <Grid item xs={12} key={notification.id}>
                      <Card sx={styles.card}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Typography variant="h6">{notification.title}</Typography>
                            <Chip 
                              label={notification.targetRole || (notification.targetUserId ? 'Specific User' : 'All Users')}
                              size="small"
                              sx={notification.targetRole === 'admin' ? styles.chipAdmin : 
                                 notification.targetUserId ? styles.chipUser : styles.chipAllUsers}
                            />
                          </Box>
                          <Typography variant="body2" sx={{ mt: 1 }}>{notification.body}</Typography>
                          <Typography variant="caption" sx={styles.metaText}>
                            Sent: {notification.createdAt}
                          </Typography>
                          
                          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button 
                              size="small" 
                              variant="outlined"
                              startIcon={<ContentCopyIcon />}
                              onClick={() => {
                                // Create a new notification with the same content
                                setTitle(notification.title);
                                setBody(notification.body);
                                setNotificationType(notification.notificationType || 'basic');
                                setUrl(notification.data?.url || '/games');
                                setActionText(notification.data?.actionText || 'View');
                                setGameId(notification.data?.gameId || '');
                                setPriority(notification.priority || 'normal');
                                setActiveTab(0);
                                showSnackbarMessage('Notification copied to editor', 'success');
                              }}
                              sx={styles.historyButton}
                            >
                              Copy
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </Paper>
      </Box>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={showSnackbar} 
        autoHideDuration={6000} 
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSnackbar(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CustomNotificationSender;
