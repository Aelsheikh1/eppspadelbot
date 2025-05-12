import React, { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';
import Navbar from './components/Navigation/Navbar';
import LandingPage from './components/LandingPage/LandingPage';
import AdminDashboard from './components/Admin/AdminDashboard';
import GameList from './components/Game/GameList';
import GameDetail from './components/Game/GameDetail';
import CreateGame from './components/Game/CreateGame';
import TournamentList from './components/Tournament/TournamentList';
import TournamentDetail from './components/Tournament/TournamentDetail';
import TournamentDemoPage from './components/Tournament/TournamentDemoPage';
import NotificationSettings from './components/Notifications/NotificationSettings';
import FcmTester from './components/FcmTester';
import CustomNotificationSender from './components/CustomNotificationSender';
import NotificationTestPage from './components/NotificationTestPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { registerFCMToken, showLocalNotification } from './services/notificationService';
import { initNotificationListener } from './utils/notificationListener';
import { requestPermission } from './utils/simpleNotifications';
import { initMobileNotifications, isMobileNative, requestMobileNotificationPermission } from './utils/mobileNotificationsSimple';
import { storeMobileToken } from './services/mobileTokenService';

// Create Theme Context
const ThemeContext = createContext();

export const useThemeMode = () => useContext(ThemeContext);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (!currentUser || !isAdmin) {
    return <Navigate to="/" />;
  }

  return children;
};

// Create theme based on mode
const createAppTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? '#7986cb' : '#3f51b5', // Brighter indigo for dark mode
      light: mode === 'dark' ? '#aab6fe' : '#757de8',
      dark: mode === 'dark' ? '#49599a' : '#002984',
      contrastText: '#ffffff',
    },
    secondary: {
      main: mode === 'dark' ? '#64b5f6' : '#2196f3', // Blue
      light: mode === 'dark' ? '#9be7ff' : '#6ec6ff',
      dark: mode === 'dark' ? '#2286c3' : '#0069c0',
      contrastText: '#ffffff', // Always white for better contrast
    },
    background: {
      default: mode === 'dark' ? '#121212' : '#f5f5f5',
      paper: mode === 'dark' ? '#2A2A2A' : '#ffffff',
      card: mode === 'dark' ? '#2A2A2A' : '#ffffff', // Custom background for cards
      cardHover: mode === 'dark' ? '#333333' : '#f5f5f5', // Hover state for cards
    },
    success: {
      main: mode === 'dark' ? '#66bb6a' : '#4caf50',
      dark: mode === 'dark' ? '#338a3e' : '#087f23',
      light: mode === 'dark' ? '#99d066' : '#80e27e',
      contrastText: mode === 'dark' ? '#000000' : '#ffffff',
    },
    error: {
      main: '#f44336',
      dark: '#ba000d',
      light: '#ff7961',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ffa726',
      dark: '#c77800',
      light: '#ffd95b',
      contrastText: '#000000',
    },
    info: {
      main: mode === 'dark' ? '#29b6f6' : '#03a9f4',
      dark: mode === 'dark' ? '#0086c3' : '#007ac1',
      light: mode === 'dark' ? '#73e8ff' : '#67daff',
      contrastText: mode === 'dark' ? '#000000' : '#ffffff',
    },
    text: {
      primary: mode === 'dark' ? '#ffffff' : '#000000',
      secondary: mode === 'dark' ? '#b0b0b0' : '#757575',
      disabled: mode === 'dark' ? '#6c6c6c' : '#9e9e9e',
    },
    divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: mode === 'dark' ? '#FFFFFF' : undefined,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: mode === 'dark' ? '#FFFFFF' : undefined,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: mode === 'dark' ? '#FFFFFF' : undefined,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: mode === 'dark' ? '#FFFFFF' : undefined,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: mode === 'dark' ? '#FFFFFF' : undefined,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      color: mode === 'dark' ? '#FFFFFF' : undefined,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      color: mode === 'dark' ? '#FFFFFF' : undefined,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      color: mode === 'dark' ? '#FFFFFF' : undefined,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.66,
      color: mode === 'dark' ? '#FFFFFF' : undefined,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: mode === 'dark' 
            ? 'linear-gradient(to bottom right, rgba(92, 107, 192, 0.05), rgba(41, 182, 246, 0.05))'
            : 'linear-gradient(to bottom right, rgba(63, 81, 181, 0.02), rgba(33, 150, 243, 0.02))',
          boxShadow: mode === 'dark' 
            ? '0 4px 20px 0 rgba(0, 0, 0, 0.5)'
            : '0 2px 10px 0 rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: mode === 'dark' 
              ? '0 8px 25px 0 rgba(0, 0, 0, 0.6)'
              : '0 4px 15px 0 rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: mode === 'dark' 
            ? '0 2px 8px 0 rgba(0, 0, 0, 0.3)'
            : '0 1px 5px 0 rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: mode === 'dark' 
              ? '0 4px 12px 0 rgba(0, 0, 0, 0.4)'
              : '0 2px 8px 0 rgba(0, 0, 0, 0.2)',
          },
        },
        contained: {
          // Enhance contrast for contained buttons in dark mode
          ...(mode === 'dark' && {
            background: 'linear-gradient(135deg, #7986cb 30%, #49599a 90%)',
            color: '#ffffff',
            fontWeight: 700,
            letterSpacing: '0.5px',
            '&:hover': {
              background: 'linear-gradient(135deg, #aab6fe 30%, #7986cb 90%)',
              boxShadow: '0 4px 12px 0 rgba(121, 134, 203, 0.6)',
            },
          }),
        },
        outlined: {
          // Enhance contrast for outlined buttons in dark mode
          ...(mode === 'dark' && {
            borderWidth: '2px',
            fontWeight: 700,
            '&:hover': {
              borderWidth: '2px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }),
        },
        containedSecondary: {
          // Enhance contrast for secondary contained buttons in dark mode
          ...(mode === 'dark' && {
            background: 'linear-gradient(135deg, #64b5f6 30%, #2286c3 90%)',
            color: '#ffffff',
            '&:hover': {
              background: 'linear-gradient(135deg, #9be7ff 30%, #64b5f6 90%)',
              boxShadow: '0 4px 12px 0 rgba(100, 181, 246, 0.6)',
            },
          }),
        },
        outlinedSecondary: {
          // Enhance contrast for secondary outlined buttons in dark mode
          ...(mode === 'dark' && {
            borderColor: '#64b5f6',
            color: '#64b5f6',
            borderWidth: '2px',
            '&:hover': {
              borderColor: '#9be7ff',
              color: '#9be7ff',
              borderWidth: '2px',
              backgroundColor: 'rgba(100, 181, 246, 0.1)',
            },
          }),
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          ...(mode === 'dark' && {
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          }),
        },
        colorPrimary: {
          ...(mode === 'dark' && {
            background: 'linear-gradient(135deg, #7986cb 30%, #49599a 90%)',
            color: '#ffffff',
            border: '1px solid rgba(121, 134, 203, 0.5)',
          }),
        },
        colorSecondary: {
          ...(mode === 'dark' && {
            background: 'linear-gradient(135deg, #64b5f6 30%, #2286c3 90%)',
            color: '#ffffff',
            border: '1px solid rgba(100, 181, 246, 0.5)',
          }),
        },
        colorSuccess: {
          ...(mode === 'dark' && {
            background: 'linear-gradient(135deg, #66bb6a 30%, #338a3e 90%)',
            color: '#ffffff',
            border: '1px solid rgba(102, 187, 106, 0.5)',
          }),
        },
        colorError: {
          ...(mode === 'dark' && {
            background: 'linear-gradient(135deg, #f44336 30%, #ba000d 90%)',
            color: '#ffffff',
            border: '1px solid rgba(244, 67, 54, 0.5)',
          }),
        },
        colorWarning: {
          ...(mode === 'dark' && {
            background: 'linear-gradient(135deg, #ffa726 30%, #c77800 90%)',
            color: '#000000',
            border: '1px solid rgba(255, 167, 38, 0.5)',
            fontWeight: 700,
          }),
        },
      },
    },
  },
});

// NavbarWrapper Component
const NavbarWrapper = () => {
  const { currentUser, loading } = useAuth();
  
  if (loading) return null;
  if (!currentUser) return null;
  
  return <Navbar />;
};

function AppContent() {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      // Register FCM token when user logs in or app reloads with authenticated user
      const initNotifications = async () => {
        try {
          // Import directly from firebase.js to ensure we're using the most robust implementation
          const { requestFcmToken } = await import('./services/firebase');
          
          // Register FCM token using the robust implementation
          const token = await requestFcmToken();
          
          if (token) {
            console.log('[Notifications] Successfully registered FCM token');
            
            // Show a welcome notification to confirm everything is working
            // Only for first login, not on every reload
            const lastNotificationShown = localStorage.getItem('lastNotificationShown');
            const now = new Date().getTime();
            
            // Only show welcome notification if it hasn't been shown in the last 24 hours
            if (!lastNotificationShown || (now - parseInt(lastNotificationShown)) > 24 * 60 * 60 * 1000) {
              showLocalNotification(
                'Notifications Enabled', 
                'You will now receive notifications for game updates!',
                { type: 'welcome' }
              );
              localStorage.setItem('lastNotificationShown', now.toString());
            }
          } else {
            console.warn('[Notifications] Failed to register FCM token');
          }
        } catch (error) {
          console.error('[Notifications] Error initializing notifications:', error);
        }
      };
      
      // Run immediately
      initNotifications();
      
      // Also set up a periodic refresh of the token (every 24 hours)
      const tokenRefreshInterval = setInterval(() => {
        console.log('[Notifications] Refreshing FCM token...');
        initNotifications();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      return () => {
        clearInterval(tokenRefreshInterval);
      };
    }
  }, [currentUser]);

  const triggerTestNotification = () => {
    // Use our enhanced notification service to show a test notification
    const success = showLocalNotification(
      'Test Notification', 
      'This is a test notification. If you see this, notifications are working correctly!',
      { type: 'test', timestamp: Date.now() }
    );
    
    if (success) {
      console.log('[Test] Local notification triggered successfully.');
    } else {
      console.warn('[Test] Failed to trigger local notification.');
      // Fallback to alert if notification fails
      alert('Could not show notification. Please check your notification permissions.');
    }
  };

  return (
    <Router>
      <NavbarWrapper />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage />} />
        {/* Protected Routes */}
        <Route path="/games" element={<ProtectedRoute><GameList /></ProtectedRoute>} />
        <Route path="/games/:id" element={<ProtectedRoute><GameDetail /></ProtectedRoute>} />
        <Route path="/create-game" element={<ProtectedRoute><CreateGame /></ProtectedRoute>} />
        <Route path="/tournaments" element={<ProtectedRoute><TournamentList /></ProtectedRoute>} />
        <Route path="/tournaments/:id" element={<ProtectedRoute><TournamentDetail /></ProtectedRoute>} />
        <Route path="/tournament-demo" element={<TournamentDemoPage />} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
        <Route path="/fcm-test" element={<ProtectedRoute><FcmTester /></ProtectedRoute>} />
        <Route path="/send-notification" element={<ProtectedRoute><CustomNotificationSender /></ProtectedRoute>} />
        <Route path="/notification-test" element={<ProtectedRoute><NotificationTestPage /></ProtectedRoute>} />
        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Routes>
    </Router>
  );
}

function App() {
  // Get stored theme preference or default to 'dark'
  const [themeMode, setThemeMode] = useState(() => {
    const savedTheme = localStorage.getItem('themeMode');
    return savedTheme || 'dark';
  });
  
  // Initialize the custom notification listener when the app loads
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Check if we're running in a native mobile environment
        if (isMobileNative()) {
          console.log('[App] Running in native mobile environment, initializing mobile notifications');
          
          // Wait a moment for Capacitor plugins to be fully initialized
          setTimeout(async () => {
            // Request permission for mobile notifications
            const permissionGranted = await requestMobileNotificationPermission();
            console.log('[App] Mobile notification permission granted:', permissionGranted);
            
            if (permissionGranted) {
              // Initialize mobile notifications with callbacks
              const initialized = await initMobileNotifications(
                // Token received callback
                (token) => {
                  console.log('[App] Mobile FCM token received:', token);
                  if (token) {
                    // Store the token in Firebase
                    storeMobileToken(token);
                  }
                },
                // Message received callback
                (message) => {
                  console.log('[App] Mobile push notification received:', message);
                  // Extract notification data
                  const title = message.notification?.title || 'New Notification';
                  const body = message.notification?.body || '';
                  const data = message.data || {};
                  
                  // Show notification using the same format as web
                  showLocalNotification(title, body, data);
                }
              );
              
              console.log('[App] Mobile notifications initialized:', initialized);
            }
          }, 1000); // 1 second delay to ensure plugins are loaded
        } else {
          // Web browser environment
          console.log('[App] Running in web environment, initializing web notifications');
          // Request notification permission on app load
          requestPermission();
          initNotificationListener();
        }
      } catch (error) {
        console.error('[App] Error initializing notifications:', error);
      }
    };
    
    initializeNotifications();
  }, []); 
  
  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newTheme);
    localStorage.setItem('themeMode', newTheme);
  };
  
  // Create theme based on current mode
  const theme = createAppTheme(themeMode);
  
  return (
    <div className="App">
      <ThemeContext.Provider value={{ themeMode, toggleTheme }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </ThemeContext.Provider>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={themeMode}
      />
    </div>
  );
}

export default App;
