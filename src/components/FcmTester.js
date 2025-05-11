import React, { useState } from 'react';
import { testFcmSetup, showTestNotification } from '../utils/fcmTest';
import { fixNotificationRegistration, checkNotificationStatus } from '../utils/notificationFixer';
import { showDirectNotification, testServiceWorkerCommunication, verifyFirebaseConfig, testServiceWorkerNotification } from '../utils/directNotificationTest';
import { getAuth } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const FcmTester = () => {
  const [testResult, setTestResult] = useState(null);
  const [statusResult, setStatusResult] = useState(null);
  const [fixResult, setFixResult] = useState(null);
  const [directResult, setDirectResult] = useState(null);
  const [swComResult, setSwComResult] = useState(null);
  const [configResult, setConfigResult] = useState(null);
  const [swNotifResult, setSwNotifResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  const runFcmTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await testFcmSetup();
      setTestResult(result);
      console.log('FCM Test Result:', result);
    } catch (err) {
      setError(err.message);
      console.error('FCM Test Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const showLocalNotification = () => {
    const result = showTestNotification();
    if (!result) {
      setError('Failed to show test notification. Check console for details.');
    }
  };
  
  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await checkNotificationStatus();
      setStatusResult(result);
      console.log('Notification Status:', result);
    } catch (err) {
      setError(err.message);
      console.error('Status Check Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fixNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fixNotificationRegistration();
      setFixResult(result);
      console.log('Notification Fix Result:', result);
      
      // After fixing, check status again to update UI
      await checkStatus();
    } catch (err) {
      setError(err.message);
      console.error('Notification Fix Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to fix admin status for the current user
  const fixAdminStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        setError('User not logged in');
        return;
      }
      
      // Update the user document to set admin status
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isAdmin: true,
        role: 'admin',
        userRole: 'admin'
      });
      
      console.log('Admin status fixed for user:', user.uid);
      
      // Check status again to update UI
      await checkStatus();
    } catch (err) {
      setError(err.message);
      console.error('Error fixing admin status:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to show a direct browser notification
  const showDirectNotificationTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await showDirectNotification();
      setDirectResult(result);
      console.log('Direct notification result:', result);
    } catch (err) {
      setError(err.message);
      console.error('Direct notification error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to test service worker communication
  const testSwCommunication = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await testServiceWorkerCommunication();
      setSwComResult(result);
      console.log('Service worker communication result:', result);
    } catch (err) {
      setError(err.message);
      console.error('Service worker communication error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to verify Firebase configuration
  const verifyConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await verifyFirebaseConfig();
      setConfigResult(result);
      console.log('Firebase config verification result:', result);
    } catch (err) {
      setError(err.message);
      console.error('Firebase config verification error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to test service worker notification
  const testSwNotification = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await testServiceWorkerNotification();
      setSwNotifResult(result);
      console.log('Service worker notification test result:', result);
    } catch (err) {
      setError(err.message);
      console.error('Service worker notification test error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to enable notifications in the user document
  const enableNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        setError('User not logged in');
        return;
      }
      
      // Update the user document to enable notifications
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        notificationsEnabled: true,
        notificationSettings: {
          gameCreated: true,
          gameClosingSoon: true,
          gameClosed: true,
          tournamentUpdates: true
        }
      });
      
      setNotificationsEnabled(true);
      console.log('Notifications enabled for user:', user.uid);
      
      // Check status again to update UI
      await checkStatus();
    } catch (err) {
      setError(err.message);
      console.error('Error enabling notifications:', err);
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
      margin: '0 auto',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
    },
    sectionHeading: {
      color: '#FFFFFF',
      marginTop: '20px',
      marginBottom: '10px',
      borderBottom: '1px solid #444444',
      paddingBottom: '5px'
    },
    buttonGroup: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      marginBottom: '15px'
    },
    heading: {
      color: '#FFFFFF',
      marginBottom: '15px'
    },
    button: {
      backgroundColor: '#4a4a4a',
      color: '#FFFFFF',
      border: 'none',
      padding: '10px 15px',
      borderRadius: '4px',
      margin: '5px 10px 5px 0',
      cursor: 'pointer',
      fontWeight: 'bold'
    },
    resultContainer: {
      backgroundColor: '#3a3a3a',
      padding: '15px',
      borderRadius: '4px',
      marginTop: '15px',
      border: '1px solid #555'
    },
    successText: {
      color: '#4caf50'
    },
    errorText: {
      color: '#f44336'
    },
    infoItem: {
      margin: '8px 0',
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontWeight: 'bold',
      marginBottom: '3px'
    },
    value: {
      wordBreak: 'break-all',
      backgroundColor: '#222',
      padding: '5px',
      borderRadius: '3px'
    }
  };
  
  const auth = getAuth();
  const user = auth.currentUser;
  
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Firebase Cloud Messaging Tester</h2>
      
      {!user && (
        <div style={{...styles.resultContainer, ...styles.errorText}}>
          <p>You must be logged in to test FCM functionality.</p>
        </div>
      )}
      
      {user && (
        <>
          <div>
            <h3 style={styles.sectionHeading}>Basic Tests</h3>
            <div style={styles.buttonGroup}>
              <button 
                style={styles.button} 
                onClick={runFcmTest} 
                disabled={loading}
              >
                {loading ? 'Testing...' : 'Test FCM Setup'}
              </button>
              
              <button 
                style={styles.button} 
                onClick={showLocalNotification}
              >
                Show Test Notification
              </button>
              
              <button 
                style={{...styles.button, backgroundColor: '#4caf50'}}
                onClick={checkStatus}
                disabled={loading}
              >
                Check Notification Status
              </button>
              
              <button 
                style={{...styles.button, backgroundColor: '#f44336'}}
                onClick={fixNotifications}
                disabled={loading}
              >
                Fix Notifications
              </button>
            </div>
            
            <h3 style={styles.sectionHeading}>Advanced Diagnostics</h3>
            <div style={styles.buttonGroup}>
              <button 
                style={{...styles.button, backgroundColor: '#2196f3'}}
                onClick={showDirectNotificationTest}
                disabled={loading}
              >
                Direct Browser Notification
              </button>
              
              <button 
                style={{...styles.button, backgroundColor: '#2196f3'}}
                onClick={testSwCommunication}
                disabled={loading}
              >
                Test SW Communication
              </button>
              
              <button 
                style={{...styles.button, backgroundColor: '#2196f3'}}
                onClick={verifyConfig}
                disabled={loading}
              >
                Verify Firebase Config
              </button>
              
              <button 
                style={{...styles.button, backgroundColor: '#2196f3'}}
                onClick={testSwNotification}
                disabled={loading}
              >
                Test SW Notification
              </button>
            </div>
            
            <h3 style={styles.sectionHeading}>User Settings</h3>
            <div style={styles.buttonGroup}>
              {statusResult && !statusResult.notificationsEnabled && (
                <button 
                  style={{...styles.button, backgroundColor: '#9c27b0'}}
                  onClick={enableNotifications}
                  disabled={loading}
                >
                  Enable Notifications
                </button>
              )}
              
              {statusResult && !statusResult.isAdmin && (
                <button 
                  style={{...styles.button, backgroundColor: '#ff9800'}}
                  onClick={fixAdminStatus}
                  disabled={loading}
                >
                  Fix Admin Status
                </button>
              )}
            </div>
          </div>
          
          {error && (
            <div style={{...styles.resultContainer, ...styles.errorText}}>
              <p>Error: {error}</p>
            </div>
          )}
          
          {testResult && (
            <div style={styles.resultContainer}>
              <h3 style={testResult.success ? styles.successText : styles.errorText}>
                {testResult.success ? 'FCM Setup Successful!' : 'FCM Setup Failed'}
              </h3>
              
              {testResult.error && (
                <div style={styles.infoItem}>
                  <span style={styles.label}>Error:</span>
                  <span style={{...styles.value, ...styles.errorText}}>{testResult.error}</span>
                </div>
              )}
              
              {testResult.success && (
                <>
                  <div style={styles.infoItem}>
                    <span style={styles.label}>FCM Token (prefix):</span>
                    <span style={styles.value}>{testResult.token}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Service Worker Active:</span>
                    <span style={styles.value}>{testResult.serviceWorkerActive ? 'Yes' : 'No'}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Notification Permission:</span>
                    <span style={styles.value}>{testResult.notificationPermission}</span>
                  </div>
                </>
              )}
            </div>
          )}
          
          {statusResult && (
            <div style={{...styles.resultContainer, marginTop: '20px'}}>
              <h3 style={statusResult.status === 'success' ? styles.successText : styles.errorText}>
                Notification Status Check
              </h3>
              
              {statusResult.status === 'error' ? (
                <div style={styles.infoItem}>
                  <span style={styles.label}>Error:</span>
                  <span style={{...styles.value, ...styles.errorText}}>{statusResult.message}</span>
                </div>
              ) : (
                <>
                  <div style={styles.infoItem}>
                    <span style={styles.label}>User ID:</span>
                    <span style={styles.value}>{statusResult.userId}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Email:</span>
                    <span style={styles.value}>{statusResult.email}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Admin User:</span>
                    <span style={styles.value}>{statusResult.isAdmin ? 'Yes' : 'No'}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>FCM Tokens:</span>
                    <span style={styles.value}>{statusResult.hasTokens ? `${statusResult.tokenCount} tokens` : 'No tokens'}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Registered Devices:</span>
                    <span style={styles.value}>{statusResult.deviceCount}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Service Worker:</span>
                    <span style={styles.value}>{statusResult.serviceWorkerActive ? 'Active' : 'Not active'}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Notification Permission:</span>
                    <span style={styles.value}>{statusResult.notificationPermission}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Notifications Enabled:</span>
                    <span style={styles.value}>{statusResult.notificationsEnabled ? 'Yes' : 'No'}</span>
                  </div>
                </>
              )}
            </div>
          )}
          
          {fixResult && (
            <div style={{...styles.resultContainer, marginTop: '20px', backgroundColor: fixResult.success ? '#2a3b2a' : '#3a2a2a'}}>
              <h3 style={fixResult.success ? styles.successText : styles.errorText}>
                {fixResult.success ? 'Notification Registration Fixed!' : 'Fix Failed'}
              </h3>
              
              {fixResult.error && (
                <div style={styles.infoItem}>
                  <span style={styles.label}>Error:</span>
                  <span style={{...styles.value, ...styles.errorText}}>{fixResult.error}</span>
                </div>
              )}
              
              {fixResult.success && (
                <>
                  <div style={styles.infoItem}>
                    <span style={styles.label}>FCM Token (prefix):</span>
                    <span style={styles.value}>{fixResult.token}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Admin User:</span>
                    <span style={styles.value}>{fixResult.isAdmin ? 'Yes' : 'No'}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Service Worker Active:</span>
                    <span style={styles.value}>{fixResult.serviceWorkerActive ? 'Yes' : 'No'}</span>
                  </div>
                  
                  <p style={{color: '#4caf50', fontWeight: 'bold', marginTop: '15px'}}>
                    Notification registration has been fixed. You should now receive notifications properly.
                  </p>
                </>
              )}
            </div>
          )}
          
          {/* Advanced Diagnostics Results */}
          {directResult && (
            <div style={{...styles.resultContainer, marginTop: '20px', backgroundColor: directResult.success ? '#2a3b2a' : '#3a2a2a'}}>
              <h3 style={styles.sectionHeading}>Direct Browser Notification Result</h3>
              
              {directResult.error ? (
                <div style={styles.infoItem}>
                  <span style={styles.label}>Error:</span>
                  <span style={{...styles.value, ...styles.errorText}}>{directResult.error}</span>
                </div>
              ) : (
                <div style={styles.infoItem}>
                  <span style={styles.label}>Status:</span>
                  <span style={styles.value}>{directResult.success ? 'Notification shown successfully' : 'Failed to show notification'}</span>
                </div>
              )}
            </div>
          )}
          
          {swComResult && (
            <div style={{...styles.resultContainer, marginTop: '20px', backgroundColor: swComResult.success ? '#2a3b2a' : '#3a2a2a'}}>
              <h3 style={styles.sectionHeading}>Service Worker Communication Result</h3>
              
              {swComResult.error ? (
                <div style={styles.infoItem}>
                  <span style={styles.label}>Error:</span>
                  <span style={{...styles.value, ...styles.errorText}}>{swComResult.error}</span>
                </div>
              ) : (
                <>
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Status:</span>
                    <span style={styles.value}>{swComResult.success ? 'Communication successful' : 'Communication failed'}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Service Worker Active:</span>
                    <span style={styles.value}>{swComResult.active ? 'Yes' : 'No'}</span>
                  </div>
                  
                  {swComResult.serviceWorkerResponse && (
                    <div style={styles.infoItem}>
                      <span style={styles.label}>Response:</span>
                      <span style={styles.value}>{JSON.stringify(swComResult.serviceWorkerResponse)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {configResult && (
            <div style={{...styles.resultContainer, marginTop: '20px', backgroundColor: configResult.success ? '#2a3b2a' : '#3a2a2a'}}>
              <h3 style={styles.sectionHeading}>Firebase Configuration Result</h3>
              
              {configResult.error ? (
                <div style={styles.infoItem}>
                  <span style={styles.label}>Error:</span>
                  <span style={{...styles.value, ...styles.errorText}}>{configResult.error}</span>
                </div>
              ) : (
                <>
                  <div style={styles.infoItem}>
                    <span style={styles.label}>FCM Token (prefix):</span>
                    <span style={styles.value}>{configResult.token}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Token Exists in Firestore:</span>
                    <span style={styles.value}>{configResult.tokenExists ? 'Yes' : 'No'}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Token Count:</span>
                    <span style={styles.value}>{configResult.tokenCount}</span>
                  </div>
                </>
              )}
            </div>
          )}
          
          {swNotifResult && (
            <div style={{...styles.resultContainer, marginTop: '20px', backgroundColor: swNotifResult.success ? '#2a3b2a' : '#3a2a2a'}}>
              <h3 style={styles.sectionHeading}>Service Worker Notification Test</h3>
              
              {swNotifResult.error ? (
                <div style={styles.infoItem}>
                  <span style={styles.label}>Error:</span>
                  <span style={{...styles.value, ...styles.errorText}}>{swNotifResult.error}</span>
                </div>
              ) : (
                <div style={styles.infoItem}>
                  <span style={styles.label}>Status:</span>
                  <span style={styles.value}>{swNotifResult.message || 'Test notification sent to service worker'}</span>
                </div>
              )}
              
              <p style={{color: '#FFFFFF', marginTop: '10px'}}>
                Check the browser console for detailed logs about the notification display process.
              </p>
            </div>
          )}
        </>
      )}
      
      <div style={{...styles.resultContainer, marginTop: '20px'}}>
        <h3 style={styles.heading}>Troubleshooting Tips</h3>
        <ul>
          <li>Make sure you've granted notification permissions in your browser</li>
          <li>Check that your service worker is properly registered</li>
          <li>Verify that your VAPID key is correctly configured</li>
          <li>Ensure you're testing in a supported browser (Chrome works best)</li>
          <li>Check the browser console for detailed logs</li>
        </ul>
      </div>
    </div>
  );
};

export default FcmTester;
