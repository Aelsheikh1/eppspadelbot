import React, { useEffect } from 'react';
import { authenticateNotifications, viewNotifications } from '../utils/authAndViewNotifications';
import { initializeNotifications } from '../utils/notificationDiagnostics';

const NotificationTest = () => {
    useEffect(() => {
        const initialize = async () => {
            try {
                console.log('Initializing notifications...');
                await authenticateNotifications();
                const token = await viewNotifications();
                console.log('FCM Token:', token);
            } catch (error) {
                console.error('Error initializing notifications:', error);
            }
        };

        initialize();
    }, []);

    return (
        <div>
            <h2>Notification Test</h2>
            <button onClick={() => initializeNotifications()}>Request Notification Permission</button>
        </div>
    );
};

export default NotificationTest;
