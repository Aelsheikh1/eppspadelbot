import { getMessaging } from 'firebase/messaging';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * Utility for testing push notifications locally
 */
export const testNotification = async (type = 'gameCreated') => {
  try {
    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('User not logged in. Cannot test notifications.');
      return false;
    }
    
    // Get user document to check notification settings
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('User document not found.');
      return false;
    }
    
    const userData = userDoc.data();
    const notificationSettings = userData.notificationSettings || {};
    
    // Check if this notification type is enabled
    if (notificationSettings[type] === false) {
      console.warn(`Notifications for ${type} are disabled in user settings.`);
    }
    
    // Create a test notification based on the type
    let title, body, data;
    
    switch (type) {
      case 'gameCreated':
        title = 'Test: New Game Available';
        body = 'This is a test notification for a new game.';
        data = { type: 'gameCreated', gameId: 'test-game-id' };
        break;
      case 'gameClosingSoon':
        title = 'Test: Registration Closing Soon';
        body = 'This is a test notification for a game closing soon.';
        data = { type: 'gameClosingSoon', gameId: 'test-game-id' };
        break;
      case 'gameClosed':
        title = 'Test: Game Registration Closed';
        body = 'This is a test notification for a closed game.';
        data = { type: 'gameClosed', gameId: 'test-game-id' };
        break;
      case 'tournamentUpdates':
        title = 'Test: Tournament Updated';
        body = 'This is a test notification for tournament updates.';
        data = { type: 'tournamentUpdates', gameId: 'test-game-id' };
        break;
      case 'gameConfirmation':
        title = 'Test: Game Registration Confirmed';
        body = 'You are registered for the game at Test Location on 2025-05-01 at 18:00. See you on the court!';
        data = { type: 'gameConfirmation', gameId: 'test-game-id' };
        break;
      default:
        title = 'Test Notification';
        body = 'This is a general test notification.';
        data = { type: 'test' };
    }
    
    // Display a notification using the Notifications API
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        data
      });
      
      notification.onclick = function() {
        console.log('Notification clicked', data);
        window.focus();
        this.close();
      };
      
      console.log('Test notification sent:', { title, body, data });
      return true;
    } else {
      console.error('Notifications not supported or permission not granted.');
      return false;
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
};

/**
 * Test all notification types
 */
export const testAllNotifications = async () => {
  const types = ['gameCreated', 'gameClosingSoon', 'gameClosed', 'tournamentUpdates'];
  
  for (const type of types) {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between notifications
    await testNotification(type);
  }
};
