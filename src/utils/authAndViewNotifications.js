import { initializeNotifications, setupForegroundMessages, checkNotificationStatus, logNotificationError } from './notificationDiagnostics';
import { getToken } from 'firebase/messaging';

export const authenticateNotifications = async () => {
    try {
        const status = checkNotificationStatus();
        console.log('Current notification status:', status);

        if (!status.isSupported) {
            throw new Error('Notifications are not supported in this browser');
        }

        if (status.hasPermission) {
            console.log('Already have notification permission');
            return;
        }

        // Initialize notifications
        const token = await initializeNotifications();
        if (token) {
            console.log('Successfully initialized notifications');
            setupForegroundMessages();
        }
    } catch (error) {
        logNotificationError(error);
        throw error;
    }
};

export const viewNotifications = async () => {
    try {
        const status = checkNotificationStatus();
        if (!status.hasPermission) {
            throw new Error('Notification permission not granted');
        }

        // Get the current token
        const token = await getToken();
        if (!token) {
            throw new Error('No FCM token available');
        }

        console.log('Current FCM Token:', token);
        return token;
    } catch (error) {
        logNotificationError(error);
        throw error;
    }
};

export const handleNotificationError = (error) => {
    console.error('Notification error occurred:', {
        errorType: error.name,
        errorMessage: error.message,
        errorStack: error.stack
    });

    // Handle specific error cases
    switch (error.name) {
        case 'NotAllowedError':
            console.log('User denied notification permission');
            break;
        case 'FirebaseError':
            console.log('Firebase error occurred:', error.message);
            break;
        default:
            console.log('Unknown error occurred');
    }
};

export const resetNotificationSettings = async () => {
    try {
        await resetNotificationState();
        console.log('Notification settings reset successfully');
    } catch (error) {
        logNotificationError(error);
        throw error;
    }
};