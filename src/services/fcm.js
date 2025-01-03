import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import serviceAccount from '../../service-account.json';

// Initialize Firebase Admin
const admin = initializeApp({
  credential: cert(serviceAccount)
}, 'admin');

export const sendNotification = async (tokens, title, body, data) => {
  try {
    const messaging = getMessaging(admin);
    
    // Prepare the message
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: data.url // For backward compatibility
      },
      tokens: Array.isArray(tokens) ? tokens : [tokens],
      webpush: {
        notification: {
          icon: '/logo192.png',
          badge: '/logo192.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            {
              action: 'open',
              title: 'View Game'
            },
            {
              action: 'close',
              title: 'Dismiss'
            }
          ]
        },
        fcmOptions: {
          link: data.url
        }
      }
    };

    // Send the message
    const response = await messaging.sendMulticast(message);
    
    console.log('Successfully sent notifications:', response);
    
    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error('Failed to send notification to token:', tokens[idx], resp.error);
        }
      });
      
      // TODO: Remove failed tokens from database
      return {
        success: response.successCount > 0,
        failedTokens
      };
    }

    return {
      success: true,
      failedTokens: []
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
