import React, { useEffect } from 'react';
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
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



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

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e',
    },
    secondary: {
      main: '#0d47a1',
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

function App() {
  useEffect(() => {
    // Wait for OneSignal SDK to be loaded
    if (!window.OneSignal) {
      console.warn('[OneSignal] SDK not loaded yet');
      return;
    }
    window.OneSignal = window.OneSignal || [];
    // Robust OneSignal initialization with retry logic
    let onesignalInitAttempts = 0;
    function tryInitOneSignal() {
      if (!window.OneSignal) {
        if (onesignalInitAttempts < 10) {
          onesignalInitAttempts++;
          console.log(`[OneSignal] SDK not loaded yet, retrying (${onesignalInitAttempts})...`);
          setTimeout(tryInitOneSignal, 500);
        } else {
          console.error('[OneSignal] SDK failed to load after multiple attempts.');
        }
        return;
      }
      window.OneSignal = window.OneSignal || [];
      if (!window.__ONESIGNAL_INIT) {
        window.__ONESIGNAL_INIT = true;
        window.OneSignal.push(function() {
          window.OneSignal.init({
            appId: '6c89c857-e106-437a-b445-7150edf7cf22',
            notifyButton: { enable: true },
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: 'OneSignalSDKWorker.js',
            serviceWorkerUpdaterPath: 'OneSignalSDKUpdaterWorker.js',
            serviceWorkerParam: { scope: '/' }
          });

          // Debug logging
          window.OneSignal.isPushNotificationsEnabled().then(function(isEnabled) {
            console.log('[OneSignal] Push notifications enabled:', isEnabled);
          });
          window.OneSignal.getUserId().then(function(userId) {
            console.log('[OneSignal] Player ID:', userId);
          });
          window.OneSignal.getSubscription().then(function(isSubscribed) {
            console.log('[OneSignal] Is subscribed:', isSubscribed);
          });
          console.log('[OneSignal] Browser Notification.permission:', Notification.permission);
        });
      }
    }
    tryInitOneSignal();
  }, []);
  
  const triggerTestNotification = () => {
    if (window.Notification) {
      if (Notification.permission === 'granted') {
        new Notification('Test Notification', {
          body: 'This is a local test notification. If you see this, browser notifications work!',
          icon: '/logo192.png',
        });
        console.log('[Test] Local notification triggered.');
      } else {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Test Notification', {
              body: 'This is a local test notification. If you see this, browser notifications work!',
              icon: '/logo192.png',
            });
            console.log('[Test] Local notification triggered after permission.');
          } else {
            console.warn('[Test] Notification permission denied.');
          }
        });
      }
    } else {
      alert('This browser does not support notifications.');
    }
  };

  return (
    <div className="App">

      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <NavbarWrapper />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LandingPage />} />
              
              {/* Protected Routes */}
              <Route
                path="/games"
                element={
                  <ProtectedRoute>
                    <GameList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/:id"
                element={
                  <ProtectedRoute>
                    <GameDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-game"
                element={
                  <ProtectedRoute>
                    <CreateGame />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tournaments"
                element={
                  <ProtectedRoute>
                    <TournamentList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tournaments/:id"
                element={
                  <ProtectedRoute>
                    <TournamentDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tournament-demo"
                element={<TournamentDemoPage />}
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationSettings />
                  </ProtectedRoute>
                }
              />
              
              {/* Admin Routes */}
              <Route
                path="/admin/*"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
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
        theme="colored"
      />
    </div>
  );
}

export default App;
