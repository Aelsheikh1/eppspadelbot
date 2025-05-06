import { messaging } from '../firebase/config';

let currentToken = null;

export const initializeNotifications = async () => {
    try {
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
            
            // Send token to service worker
            navigator.serviceWorker.ready.then((registration) => {
                registration.active.postMessage({
                    type: 'REFRESH_TOKEN',
                    token: token
                });
            });
        }

        return token;
    } catch (error) {
        console.error('Error initializing notifications:', error);
        throw error;
    }
};

export const setupForegroundMessages = () => {
    try {
        onMessage(messaging, (payload) => {
            console.log('Received foreground message:', payload);
            
            // Show notification in foreground
            const notificationTitle = payload.notification?.title || 'New Message';
            const notificationBody = payload.notification?.body || 'You have a new message';
            const notificationId = payload.data?.notificationId || 'default-notification';
            
            // Check if notification is already showing
            const existingNotification = Array.from(document.getElementsByTagName('notification')).find(
                n => n.tag === notificationId
            );

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
                if (!notification.closed) {
                    notification.close();
                }
            }, 5000);
        });
    } catch (error) {
        console.error('Error setting up foreground messages:', error);
    }
};

export const checkNotificationStatus = () => {
    const isSupported = 'Notification' in window;
    const hasPermission = Notification.permission === 'granted';
    const permission = Notification.permission;
    
    return {
        isSupported,
        hasPermission,
        permission,
        isDenied: permission === 'denied',
        isEnabled: permission === 'granted'
    };
};

export const logNotificationError = (error) => {
    console.error('FCM Error:', {
        timestamp: new Date().toISOString(),
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
        const token = await getToken(messaging);
        if (token) {
            await messaging.deleteToken(token);
            console.log('Token deleted successfully');
        }

        // Reset permission
        if (Notification.permission === 'denied') {
            console.log('Notification permission was denied');
            // Permission cannot be reset programmatically if denied
            return false;
        } else {
            console.log('Notification permission reset');
            return true;
        }
    } catch (error) {
        console.error('Error resetting notification state:', error);
        throw error;
    }
};

export const refreshToken = async () => {
    try {
        const token = await getToken(messaging, {
            vapidKey: process.env.REACT_APP_VAPID_KEY
        });

        if (token && token !== currentToken) {
            currentToken = token;
            console.log('Token refreshed successfully');
            
            // Send token to service worker
            navigator.serviceWorker.ready.then((registration) => {
                registration.active.postMessage({
                    type: 'REFRESH_TOKEN',
                    token: token
                });
            });

            return token;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        throw error;
    }
};