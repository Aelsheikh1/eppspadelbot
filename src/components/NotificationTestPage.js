import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const NotificationTestPage = () => {
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recentNotifications, setRecentNotifications] = useState([]);
  
  useEffect(() => {
    // Get current user info
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      setUserId(user.uid);
      setUserEmail(user.email);
      
      // Load recent notifications
      loadRecentNotifications();
    }
  }, []);
  
  const loadRecentNotifications = async () => {
    try {
      const notificationsQuery = query(
        collection(db, 'customNotifications'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const snapshot = await getDocs(notificationsQuery);
      const notifications = [];
      
      snapshot.forEach(doc => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setRecentNotifications(notifications);
    } catch (error) {
      console.error('Error loading recent notifications:', error);
    }
  };
  
  const sendTestNotification = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        setResult({
          success: false,
          error: 'You must be logged in to send test notifications'
        });
        return;
      }
      
      // Create a simple test notification
      const notificationData = {
        title: 'Test Notification',
        body: `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
        senderId: user.uid,
        senderEmail: user.email,
        createdAt: new Date().toISOString(),
        data: {
          url: '/notification-test',
          timestamp: Date.now(),
          test: true
        }
      };
      
      // Add to customNotifications collection
      const notificationRef = await addDoc(collection(db, 'customNotifications'), notificationData);
      
      setResult({
        success: true,
        notificationId: notificationRef.id,
        message: 'Test notification sent successfully'
      });
      
      // Reload recent notifications
      loadRecentNotifications();
    } catch (error) {
      console.error('Error sending test notification:', error);
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Dark mode styling based on user preferences
  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#2A2A2A', // Darker background per user preference
      color: '#FFFFFF',
      borderRadius: '8px',
      maxWidth: '800px',
      margin: '20px auto',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
    },
    heading: {
      color: '#FFFFFF',
      marginBottom: '15px',
      borderBottom: '1px solid #444444',
      paddingBottom: '10px'
    },
    userInfo: {
      backgroundColor: '#3A3A3A',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px'
    },
    button: {
      padding: '12px 24px',
      backgroundColor: '#4caf50',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '16px'
    },
    disabledButton: {
      padding: '12px 24px',
      backgroundColor: '#555555',
      color: '#AAAAAA',
      border: 'none',
      borderRadius: '4px',
      cursor: 'not-allowed',
      fontWeight: 'bold',
      fontSize: '16px'
    },
    resultContainer: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#1E1E1E',
      borderRadius: '4px',
      border: '1px solid #444444'
    },
    successText: {
      color: '#4caf50'
    },
    errorText: {
      color: '#f44336'
    },
    notificationsList: {
      marginTop: '30px'
    },
    notificationItem: {
      backgroundColor: '#3A3A3A',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '10px',
      borderLeft: '4px solid #4caf50'
    },
    notificationTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '5px'
    },
    notificationBody: {
      marginBottom: '10px'
    },
    notificationMeta: {
      fontSize: '12px',
      color: '#AAAAAA'
    },
    instructions: {
      backgroundColor: '#3A3A3A',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      borderLeft: '4px solid #2196f3'
    },
    instructionsList: {
      marginLeft: '20px',
      lineHeight: '1.6'
    }
  };
  
  // Get current user
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>Simple Notification Test</h2>
        <p style={styles.errorText}>You must be logged in to use this page.</p>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Simple Notification Test</h2>
      
      <div style={styles.instructions}>
        <h3>How to Test Notifications Across Browsers</h3>
        <ol style={styles.instructionsList}>
          <li>Open this page in multiple browsers or devices</li>
          <li>Click the "Send Test Notification" button below</li>
          <li>All browsers/devices with this app open should receive the notification</li>
          <li>If a browser doesn't receive the notification, make sure it's logged in with the same account</li>
        </ol>
      </div>
      
      <div style={styles.userInfo}>
        <p><strong>User ID:</strong> {userId}</p>
        <p><strong>Email:</strong> {userEmail}</p>
      </div>
      
      <button
        style={loading ? styles.disabledButton : styles.button}
        onClick={sendTestNotification}
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Test Notification'}
      </button>
      
      {result && (
        <div style={{...styles.resultContainer, borderColor: result.success ? '#4caf50' : '#f44336'}}>
          <h3 style={result.success ? styles.successText : styles.errorText}>
            {result.success ? 'Notification Sent!' : 'Failed to Send Notification'}
          </h3>
          
          {result.success ? (
            <p>Notification ID: {result.notificationId}</p>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}
      
      {recentNotifications.length > 0 && (
        <div style={styles.notificationsList}>
          <h3>Recent Notifications</h3>
          
          {recentNotifications.map(notification => (
            <div key={notification.id} style={styles.notificationItem}>
              <div style={styles.notificationTitle}>{notification.title}</div>
              <div style={styles.notificationBody}>{notification.body}</div>
              <div style={styles.notificationMeta}>
                Sent by: {notification.senderEmail} • 
                Time: {new Date(notification.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationTestPage;
