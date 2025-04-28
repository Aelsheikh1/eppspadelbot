
import { getAuth } from 'firebase/auth';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

// Subscribe to topic for specific game notifications
export const subscribeToGame = async (gameId) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('User not logged in. Cannot subscribe to game.');
      return false;
    }
    
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      subscribedGames: arrayUnion(gameId)
    });
    
    console.log(`Subscribed to game: ${gameId}`);
    return true;
  } catch (error) {
    console.error('Error subscribing to game:', error);
    return false;
  }
};

// Update notification settings
export const updateNotificationSettings = async (settings) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('User not logged in. Cannot update notification settings.');
      return false;
    }
    
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      notificationSettings: settings
    });
    
    console.log('Notification settings updated.');
    return true;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return false;
  }
};


