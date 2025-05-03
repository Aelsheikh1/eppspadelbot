import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Send notifications to users about game-related events
 * @param {string} type - Type of notification (gameClosingSoon, gameConfirmation, gameClosed)
 * @param {Object} gameData - Details of the game
 * @param {string[]} [specificUserIds] - Optional list of specific user IDs to notify
 */
export const sendGameNotification = async (type, gameData, specificUserIds = null) => {
  try {
    // Prepare notification details based on type
    let notificationDetails;
    switch (type) {
      case 'gameClosingSoon':
        notificationDetails = {
          title: 'Game Registration Closing Soon',
          body: `Registration for the game at ${gameData.location} on ${gameData.date} closes in ${gameData.hoursRemaining} hours.`,
          type: 'gameClosingSoon'
        };
        break;
      case 'gameConfirmation':
        notificationDetails = {
          title: 'Game Registration Confirmed',
          body: `You are registered for the game at ${gameData.location} on ${gameData.date} at ${gameData.time}. See you on the court!`,
          type: 'gameConfirmation'
        };
        break;
      case 'gameClosed':
        notificationDetails = {
          title: 'Game Registration Closed',
          body: `Registration for the game at ${gameData.location} on ${gameData.date} is now closed.`,
          type: 'gameClosed'
        };
        break;
      default:
        throw new Error(`Unsupported notification type: ${type}`);
    }

    // Determine users to notify
    const usersRef = collection(db, 'users');
    let usersQuery;
    
    if (specificUserIds) {
      // If specific user IDs are provided, use them
      usersQuery = query(
        usersRef, 
        where('__name__', 'in', specificUserIds)
      );
    } else {
      // Otherwise, query users who have this type of notification enabled
      usersQuery = query(
        usersRef, 
        where(`notificationSettings.${type}`, '!=', false)
      );
    }

    const usersSnapshot = await getDocs(usersQuery);

    // Create notifications for each user
    const notificationsRef = collection(db, 'notifications');
    const notificationPromises = usersSnapshot.docs.map(async (userDoc) => {
      const userId = userDoc.id;

      // Create notification document
      const gameId = gameData.id;
      const gameLink = `/games/${gameId}`; // Consistent route for game details
        
      await addDoc(notificationsRef, {
        userId,
        title: notificationDetails.title,
        body: notificationDetails.body,
        type: notificationDetails.type,
        data: {
          gameId,
          location: gameData.location,
          date: gameData.date,
          time: gameData.time,
          link: gameLink // Consistent link generation
        },
        link: gameLink, // Duplicate link for easier access
        read: false,
        createdAt: serverTimestamp()
      });
    });

    // Wait for all notifications to be created
    await Promise.all(notificationPromises);

    console.log(`Sent ${type} notifications for game ${gameData.id}`);
    return true;
  } catch (error) {
    console.error(`Error sending ${type} notifications:`, error);
    return false;
  }
};

/**
 * Check and send game closing soon notifications
 * This should be run periodically (e.g., via a cloud function or scheduled task)
 */
export const checkAndSendGameClosingSoonNotifications = async () => {
  try {
    const gamesRef = collection(db, 'games');
    const now = new Date();
    
    // Find games closing soon (within next 24 hours)
    const closingSoonGames = await getDocs(query(
      gamesRef,
      where('isOpen', '==', true),
      where('deadline', '<=', new Date(now.getTime() + 24 * 60 * 60 * 1000))
    ));

    for (const gameDoc of closingSoonGames.docs) {
      const gameData = gameDoc.data();
      
      // Calculate hours remaining
      const deadlineDate = new Date(gameData.deadline);
      const hoursRemaining = Math.ceil((deadlineDate - now) / (1000 * 60 * 60));

      // Send notifications
      await sendGameNotification('gameClosingSoon', {
        id: gameDoc.id,
        location: gameData.location,
        date: gameData.date,
        hoursRemaining
      });

      // Optionally update game status if needed
      if (hoursRemaining <= 0) {
        await updateDoc(doc(db, 'games', gameDoc.id), {
          isOpen: false,
          status: 'closed'
        });
      }
    }
  } catch (error) {
    console.error('Error checking games closing soon:', error);
  }
};

/**
 * Send game registration confirmation to a specific user
 * @param {string} gameId - ID of the game
 * @param {string} userId - ID of the user being registered
 */
export const sendGameRegistrationConfirmation = async (gameId, userId) => {
  try {
    // Fetch game details
    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (!gameDoc.exists()) {
      console.error(`Game not found: ${gameId}`);
      return false;
    }

    const gameData = gameDoc.data();

    // Validate game data
    if (!gameData.location || !gameData.date || !gameData.time) {
      console.error('Incomplete game data', gameData);
      return false;
    }

    // Send confirmation to the specific user
    return await sendGameNotification('gameConfirmation', {
      id: gameId,
      location: gameData.location,
      date: gameData.date,
      time: gameData.time
    }, [userId]);
  } catch (error) {
    console.error('Error sending game registration confirmation:', {
      gameId, 
      userId, 
      errorMessage: error.message,
      errorStack: error.stack
    });
    return false;
  }
};
