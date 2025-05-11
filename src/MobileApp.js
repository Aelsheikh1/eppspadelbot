import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navigation/Navbar';
import LandingPage from './components/LandingPage/LandingPage';
import MobileNotificationTest from './components/MobileNotificationTest';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useThemeMode } from './index';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { initializeAppNotifications, getNotificationSystemInfo } from './utils/pushNotificationManager';

// Mobile App Component

// Simple NavbarWrapper Component
const NavbarWrapper = () => {
  const { themeMode, toggleTheme } = useThemeMode();
  return <Navbar mode={themeMode} toggleTheme={toggleTheme} />;
};

// Simple Protected Route Component for mobile
const MobileProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#2A2A2A", color: "#FFFFFF" }}>
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Mobile App Content Component
const MobileAppContent = () => {
  const { currentUser } = useAuth();
  
  // Initialize push notifications when the app loads
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // Only initialize if user is logged in
        if (currentUser) {
          const result = await initializeAppNotifications();
          const systemInfo = getNotificationSystemInfo();
          
          console.log('Notification system info:', systemInfo);
          
          if (result) {
            toast.success('Notifications initialized successfully', {
              position: 'bottom-center',
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: 'dark',
              style: { backgroundColor: '#2A2A2A', color: '#FFFFFF' }
            });
          }
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };
    
    setupNotifications();
  }, [currentUser]);
  
  return (
    <Router>
      <NavbarWrapper />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage />} />
        <Route path="/mobile-notifications" element={
          <MobileProtectedRoute>
            <MobileNotificationTest />
          </MobileProtectedRoute>
        } />
        {/* Add more mobile routes here */}
        
        {/* Protected Routes */}
        <Route path="/games" element={<MobileProtectedRoute><div style={{ padding: "20px", backgroundColor: "#2A2A2A", color: "#FFFFFF", minHeight: "100vh" }}><h2>Games</h2><p>Mobile version coming soon</p></div></MobileProtectedRoute>} />
        <Route path="/tournaments" element={<MobileProtectedRoute><div style={{ padding: "20px", backgroundColor: "#2A2A2A", color: "#FFFFFF", minHeight: "100vh" }}><h2>Tournaments</h2><p>Mobile version coming soon</p></div></MobileProtectedRoute>} />
        
        {/* Fallback route */}
        <Route path="*" element={<div style={{ padding: "20px", backgroundColor: "#2A2A2A", color: "#FFFFFF", minHeight: "100vh" }}><h2>Page Not Found</h2><p>This page is not available in the mobile version.</p></div>} />
      </Routes>
    </Router>
  );
};

// Main Mobile App Component
function MobileApp() {
  return (
    <div className="MobileApp">
      <AuthProvider>
        <MobileAppContent />
      </AuthProvider>
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
        theme="dark"
      />
    </div>
  );
}

export default MobileApp;
