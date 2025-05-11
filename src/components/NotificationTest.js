import React, { useEffect, useState } from 'react';
import { initializeNotifications, checkNotificationStatus, setupForegroundMessages } from '../utils/crossPlatformNotifications';

const NotificationTest = () => {
    const [status, setStatus] = useState(null);
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Check notification status on component mount
        const checkStatus = async () => {
            const status = await checkNotificationStatus();
            setStatus(status);
            console.log('Current notification status:', status);
        };
        
        checkStatus();
    }, []);

    const initialize = async () => {
        try {
            setError(null);
            console.log('Initializing notifications...');
            const newToken = await initializeNotifications();
            setToken(newToken);
            console.log('FCM Token:', newToken);
            
            // Setup foreground messages
            setupForegroundMessages();
            
            // Update status after initialization
            const newStatus = checkNotificationStatus();
            setStatus(newStatus);
        } catch (error) {
            console.error('Error initializing notifications:', error);
            setError(error.message);
        }
    };

    return (
        <div style={{ 
            backgroundColor: '#2A2A2A', 
            color: '#FFFFFF',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '600px',
            margin: '20px auto'
        }}>
            <h2 style={{ color: '#FFFFFF' }}>Notification Test</h2>
            
            {status && (
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ color: '#FFFFFF' }}>Platform Information</h3>
                    <p><strong>Platform:</strong> {status.platform || 'Unknown'}</p>
                    <p><strong>Firebase Messaging Supported:</strong> {status.fcmSupported ? 'Yes' : 'No'}</p>
                    {status.platform === 'Desktop' && (
                        <p><strong>Browser Notifications API:</strong> {status.notificationSupported ? 'Supported' : 'Not Supported'}</p>
                    )}
                    <p><strong>Permission Status:</strong> {status.permission}</p>
                    {status.usingFallback && (
                        <div style={{ 
                            backgroundColor: '#3A3A3A', 
                            padding: '10px', 
                            borderRadius: '4px',
                            marginTop: '10px',
                            borderLeft: '4px solid #FFA500'
                        }}>
                            <p style={{ margin: 0 }}><strong>Using Fallback System:</strong> Firebase Cloud Messaging is not supported on this device/browser. A fallback notification system will be used instead.</p>
                        </div>
                    )}
                </div>
            )}
            
            {token && (
                <div style={{ 
                    marginBottom: '20px', 
                    padding: '10px', 
                    backgroundColor: '#3A3A3A',
                    borderRadius: '4px',
                    wordBreak: 'break-all'
                }}>
                    <h3 style={{ color: '#FFFFFF' }}>{token.startsWith('fallback-') ? 'Fallback Token' : 'FCM Token'}</h3>
                    <p style={{ fontSize: '12px' }}>{token}</p>
                    {token.startsWith('fallback-') && (
                        <p style={{ fontSize: '12px', color: '#FFA500' }}>This is a fallback token. It will be used for the alternative notification system.</p>
                    )}
                </div>
            )}
            
            {error && (
                <div style={{ 
                    marginBottom: '20px', 
                    padding: '10px', 
                    backgroundColor: '#AA3333',
                    borderRadius: '4px'
                }}>
                    <h3 style={{ color: '#FFFFFF' }}>Error</h3>
                    <p>{error}</p>
                </div>
            )}
            
            <button 
                onClick={initialize}
                style={{
                    backgroundColor: '#4A90E2',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 15px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                }}
            >
                Initialize Notifications
            </button>
            
            <p style={{ marginTop: '20px', fontSize: '14px' }}>
                This notification system now supports both desktop and mobile platforms, with fallback support for browsers that don't support Firebase Cloud Messaging.
            </p>
            
            {status && status.usingFallback && (
                <div style={{ 
                    marginTop: '20px',
                    padding: '15px', 
                    backgroundColor: '#3A3A3A',
                    borderRadius: '4px',
                    borderLeft: '4px solid #FFA500'
                }}>
                    <h3 style={{ color: '#FFFFFF', margin: 0 }}>Fallback System Active</h3>
                    <p>Your browser doesn't support the APIs required for Firebase Cloud Messaging. We're using a fallback notification system instead.</p>
                    <p>With the fallback system:</p>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li>Notifications will appear as in-app notifications</li>
                        <li>You'll need to keep the app open to receive notifications</li>
                        <li>The app will periodically check for new notifications</li>
                    </ul>
                    <p>A test notification will appear shortly to demonstrate the fallback system.</p>
                </div>
            )}
        </div>
    );
};

export default NotificationTest;
