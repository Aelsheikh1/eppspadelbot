import { viewNotifications, handleNotificationError } from './authAndViewNotifications';

export const displayNotifications = async () => {
    try {
        const token = await viewNotifications();
        if (token) {
            console.log('Displaying notifications for token:', token);
            // Add your notification display logic here
        }
    } catch (error) {
        handleNotificationError(error);
        throw error;
    }
};

export const checkNotificationAvailability = () => {
    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('Notifications are not supported in this browser');
            return false;
        }

        // Check current permission status
        const permission = Notification.permission;
        console.log('Current notification permission:', permission);

        return permission === 'granted';
    } catch (error) {
        console.error('Error checking notification availability:', error);
        return false;
    }
};

export const requestNotificationPermission = async () => {
    try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission granted:', permission === 'granted');
        return permission;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        throw error;
    }
};

export const updateNotificationSettings = async (settings) => {
    try {
        // Update notification settings in your database or storage
        console.log('Updating notification settings:', settings);
        // Add your update logic here
    } catch (error) {
        console.error('Error updating notification settings:', error);
        throw error;
    }
};