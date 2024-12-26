import React from 'react';
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
