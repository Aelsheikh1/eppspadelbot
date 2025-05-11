// Try to import Firebase messaging, but provide fallbacks if not supported
let messaging;
let getToken;
let onMessage;
let isSupported;

// Wrap Firebase imports in try-catch to handle unsupported browsers
try {
  const firebaseConfig = require('../firebase/config');
  messaging = firebaseConfig.messaging;
  
  // Dynamic imports to avoid errors in unsupported browsers
  const firebaseMessaging = require('firebase/messaging');
  getToken = firebaseMessaging.getToken;
  onMessage = firebaseMessaging.onMessage;
  isSupported = firebaseMessaging.isSupported;
} catch (error) {
  console.warn('Firebase messaging not supported in this browser:', error);
  // Create stub functions for unsupported browsers
  messaging = null;
  getToken = async () => null;
  onMessage = () => {};
  isSupported = async () => false;
}

let currentToken = null;

// Detect platform
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);

// Request notification permission
export const requestNotificationPermission = async () => {
    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.warn('Notifications are not supported in this browser');
            return false;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);

        return permission === 'granted';
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
};

// Show a notification using the appropriate method for the platform
export const showNotification = (title, options = {}) => {
    try {
        // Apply dark mode styling based on user preference
        const darkModeOptions = {
            ...options,
            icon: options.icon || '/logo192.png',
            badge: options.badge || '/logo192.png',
            // Dark mode styling
            style: {
                backgroundColor: '#2A2A2A',
                color: '#FFFFFF',
                ...options.style
            }
        };
        
        if (isMobile) {
            return showMobileNotification({
                notification: {
                    title,
                    ...darkModeOptions
                }
            });
        } else {
            return showDesktopNotification({
                notification: {
                    title,
                    ...darkModeOptions
                }
            });
        }
    } catch (error) {
        console.error('Error showing notification:', error);
        return false;
    }
};

export const initializeNotifications = async () => {
    try {
        // Check if FCM is supported on this platform
        const fcmSupported = await isFCMSupported();
        
        if (!fcmSupported) {
            console.warn('Firebase Cloud Messaging is not supported on this platform');
            return await initializeFallbackNotifications();
        }

        // Different approach based on platform
        if (isMobile) {
            console.log('Mobile platform detected:', isIOS ? 'iOS' : isAndroid ? 'Android' : 'Other mobile');
            return await initializeMobileNotifications();
        } else {
            console.log('Desktop platform detected');
            return await initializeDesktopNotifications();
        }
    } catch (error) {
        console.error('Error initializing notifications:', error);
        logPlatformInfo();
        throw error;
    }
};

const initializeDesktopNotifications = async () => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
        throw new Error('Notifications are not supported in this browser');
    }

    // Request permission to send notifications
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);

    if (permission !== 'granted') {
        throw new Error('Notification permission denied');
    }

    // Get the token for the current user
    const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_VAPID_KEY
    });

    if (!token) {
        throw new Error('Failed to get FCM token');
    }

    if (token !== currentToken) {
        currentToken = token;
        console.log('New FCM Token:', token);
        
        // Send token to service worker if available
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.active.postMessage({
                    type: 'REFRESH_TOKEN',
                    token: token
                });
            });
        }
    }

    return token;
};

const initializeMobileNotifications = async () => {
    try {
        // For mobile platforms, we use a different approach
        console.log('Initializing mobile notifications');
        
        // Check if FCM is supported on this mobile platform
        if (await isFCMSupported()) {
            // Get FCM token directly without browser notification permission
            const token = await getToken(messaging, {
                vapidKey: process.env.REACT_APP_VAPID_KEY
            });

            if (!token) {
                console.warn('Failed to get FCM token on mobile, using fallback');
                return await initializeFallbackNotifications();
            }

            console.log('Mobile FCM Token:', token);
            currentToken = token;
            
            return token;
        } else {
            console.warn('FCM not supported on this mobile platform, using fallback');
            return await initializeFallbackNotifications();
        }
    } catch (error) {
        console.error('Mobile notification initialization error:', error);
        console.warn('Using fallback notification system');
        return await initializeFallbackNotifications();
    }
};

const initializeFallbackNotifications = async () => {
    // Generate a pseudo-token for tracking
    const pseudoToken = `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    console.log('Using fallback notification system with pseudo-token:', pseudoToken);
    
    // Store the pseudo-token
    currentToken = pseudoToken;
    
    // Return the pseudo-token
    return pseudoToken;
};

const isFCMSupported = async () => {
    try {
        // First check if the isSupported function exists and is callable
        if (typeof isSupported !== 'function') {
            return false;
        }
        
        // Then check if FCM is supported on this platform
        return await isSupported();
    } catch (error) {
        console.warn('Error checking FCM support:', error);
        return false;
    }
};

export const setupForegroundMessages = () => {
    try {
        // Check if FCM is supported before setting up listeners
        if (!messaging) {
            console.warn('Firebase messaging not available, using fallback notification system');
            setupFallbackNotifications();
            return;
        }
        
        onMessage(messaging, (payload) => {
            console.log('Received foreground message:', payload);
            
            if (isMobile) {
                // For mobile, we'll use a custom UI notification
                showMobileNotification(payload);
            } else if ('Notification' in window) {
                // For desktop, use browser notifications
                showDesktopNotification(payload);
            } else {
                // Fallback for unsupported browsers
                alert(`${payload.notification?.title || 'New Message'}\n${payload.notification?.body || ''}`);
            }
        });
    } catch (error) {
        console.error('Error setting up foreground messages:', error);
        setupFallbackNotifications();
    }
};

const setupFallbackNotifications = () => {
    console.log('Setting up fallback notification system');
    
    // Set up a polling mechanism to check for notifications
    // This is a simple example - in a real app, you'd implement server polling
    const checkInterval = 30000; // 30 seconds
    
    // Start polling
    setInterval(() => {
        checkForNotifications();
    }, checkInterval);
    
    // Simulate a notification after 5 seconds for testing
    setTimeout(() => {
        const testPayload = {
            notification: {
                title: 'Fallback Notification System',
                body: 'This is a test notification from the fallback system'
            }
        };
        showMobileNotification(testPayload);
    }, 5000);
};

const checkForNotifications = async () => {
    // In a real implementation, this would call your server API
    // to check for new notifications
    console.log('Checking for new notifications (fallback system)');
    
    // This is just a placeholder - you would implement actual server polling here
};

const showDesktopNotification = (payload) => {
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationBody = payload.notification?.body || 'You have a new message';
    const notificationId = payload.data?.notificationId || 'default-notification';
    
    // Check if notification is already showing
    const existingNotifications = Array.from(document.getElementsByTagName('notification'));
    const existingNotification = existingNotifications.find(n => n.tag === notificationId);

    if (existingNotification) {
        console.log('Closing existing notification');
        existingNotification.close();
    }

    const notification = new Notification(notificationTitle, {
        body: notificationBody,
        icon: '/favicon-96x96.png',
        requireInteraction: true,
        tag: notificationId
    });

    // Handle notification click
    notification.onclick = () => {
        window.focus();
        notification.close();
    };

    // Auto-close after 5 seconds if not interacted with
    setTimeout(() => {
        if (notification && !notification.closed) {
            notification.close();
        }
    }, 5000);
};

const showMobileNotification = (payload) => {
    // Create a custom notification UI element for mobile
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationBody = payload.notification?.body || 'You have a new message';
    
    // Create notification element
    const notificationElement = document.createElement('div');
    notificationElement.className = 'mobile-notification';
    notificationElement.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 400px;
        background-color: #2A2A2A;
        color: #FFFFFF;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        display: flex;
        flex-direction: column;
    `;
    
    // Create title
    const titleElement = document.createElement('div');
    titleElement.style.cssText = `
        font-weight: bold;
        margin-bottom: 4px;
        font-size: 16px;
    `;
    titleElement.textContent = notificationTitle;
    
    // Create body
    const bodyElement = document.createElement('div');
    bodyElement.style.cssText = `
        font-size: 14px;
        margin-bottom: 8px;
    `;
    bodyElement.textContent = notificationBody;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
        align-self: flex-end;
        background: none;
        border: none;
        color: #FFFFFF;
        font-size: 14px;
        cursor: pointer;
        padding: 4px 8px;
    `;
    closeButton.textContent = 'Dismiss';
    
    // Add elements to notification
    notificationElement.appendChild(titleElement);
    notificationElement.appendChild(bodyElement);
    notificationElement.appendChild(closeButton);
    
    // Add to document
    document.body.appendChild(notificationElement);
    
    // Handle close button click
    closeButton.onclick = () => {
        document.body.removeChild(notificationElement);
    };
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notificationElement)) {
            document.body.removeChild(notificationElement);
        }
    }, 5000);
};

export const checkNotificationStatus = async () => {
    // Check FCM support
    const fcmSupported = await isFCMSupported();
    
    // Different checks based on platform
    if (isMobile) {
        // For mobile, we can't rely on Notification API
        return {
            isSupported: fcmSupported, // Report actual FCM support
            fcmSupported, // Add explicit FCM support flag
            hasPermission: true, // Assume permission for custom UI notifications
            permission: 'granted',
            isDenied: false,
            isEnabled: true,
            usingFallback: !fcmSupported, // Indicate if using fallback
            platform: isIOS ? 'iOS' : isAndroid ? 'Android' : 'Other mobile'
        };
    } else {
        // For desktop, use standard Notification API
        const notificationSupported = 'Notification' in window;
        const permission = notificationSupported ? Notification.permission : 'unsupported';
        const hasPermission = permission === 'granted';
        
        return {
            isSupported: notificationSupported && fcmSupported,
            fcmSupported, // Add explicit FCM support flag
            notificationSupported, // Add explicit Notification API support flag
            hasPermission,
            permission,
            isDenied: permission === 'denied',
            isEnabled: permission === 'granted',
            usingFallback: !fcmSupported, // Indicate if using fallback
            platform: 'Desktop'
        };
    }
};

export const logNotificationError = (error) => {
    console.error('FCM Error:', {
        timestamp: new Date().toISOString(),
        platform: isMobile ? (isIOS ? 'iOS' : isAndroid ? 'Android' : 'Other mobile') : 'Desktop',
        userAgent: navigator.userAgent,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        }
    });
};

export const resetNotificationState = async () => {
    try {
        // Delete existing token
        if (currentToken) {
            await messaging.deleteToken(currentToken);
            currentToken = null;
            console.log('Token deleted successfully');
        }

        // For desktop, check permission
        if (!isMobile && 'Notification' in window) {
            if (Notification.permission === 'denied') {
                console.log('Notification permission was denied');
                // Permission cannot be reset programmatically if denied
                return false;
            }
        }
        
        console.log('Notification state reset');
        return true;
    } catch (error) {
        console.error('Error resetting notification state:', error);
        throw error;
    }
};

export const refreshToken = async () => {
    try {
        // Check if FCM is supported
        if (await isFCMSupported()) {
            const token = await getToken(messaging, {
                vapidKey: process.env.REACT_APP_VAPID_KEY
            });

            if (token && token !== currentToken) {
                currentToken = token;
                console.log('Token refreshed successfully');
                
                // Send token to service worker if available
                if (!isMobile && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then((registration) => {
                        registration.active.postMessage({
                            type: 'REFRESH_TOKEN',
                            token: token
                        });
                    });
                }

                return token;
            }
            
            return currentToken;
        } else {
            // If FCM is not supported, return the current token or generate a new fallback token
            if (!currentToken || !currentToken.startsWith('fallback-')) {
                return await initializeFallbackNotifications();
            }
            return currentToken;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        // Return fallback token on error
        if (!currentToken || !currentToken.startsWith('fallback-')) {
            return await initializeFallbackNotifications();
        }
        return currentToken;
    }
};

const logPlatformInfo = async () => {
    console.log('Platform information:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isMobile,
        isIOS,
        isAndroid,
        hasNotificationAPI: 'Notification' in window,
        hasServiceWorker: 'serviceWorker' in navigator,
        fcmSupported: await isFCMSupported(),
        usingFallback: !await isFCMSupported()
    });
};
