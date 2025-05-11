import { db } from '../services/firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { sendFCMNotification } from './fcmNotifications';
import { format } from 'date-fns';

/**
 * Send a notification for a game event
 * @param {string} type - Type of notification (gameCreated, gameJoined, gameClosed, gameClosingSoon, gameConfirmation)
 * @param {Object} gameData - Game data
 * @param {Array} specificUserIds - Optional array of specific user IDs to notify
 */
export const sendGameNotification = async (type, gameData, specificUserIds = null) => {
  try {
    // Create notification content based on type
    let notificationDetails = {
      title: '',
      body: '',
      type,
      showPopup: true,
      data: {
        gameId: gameData.id,
        url: `/games/${gameData.id}`
      }
    };

    switch (type) {
      case 'gameCreated':
        notificationDetails.title = 'New Game Available';
        notificationDetails.body = `A new game has been created at ${gameData.location} on ${gameData.formattedDate || gameData.date} at ${gameData.time}.`;
        break;
      case 'gameJoined':
      case 'gameConfirmation':
        notificationDetails.title = 'Game Registration Confirmed';
        notificationDetails.body = `You are registered for the game at ${gameData.location} on ${gameData.formattedDate || gameData.date} at ${gameData.time}. See you on the court!`;
        notificationDetails.type = 'gameConfirmation';
        break;
      case 'gameClosed':
        notificationDetails.title = 'Game Registration Closed';
        notificationDetails.body = `Registration for the game at ${gameData.location} on ${gameData.formattedDate || gameData.date} is now closed.`;
        break;
      case 'gameClosingSoon':
        notificationDetails.title = 'Game Closing Soon';
        notificationDetails.body = `Registration for the game at ${gameData.location} on ${gameData.formattedDate || gameData.date} closes in ${gameData.hoursRemaining} hours`;
        break;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    // Determine which users to notify
    let userIds = [];
    const usersRef = collection(db, 'users');
    let usersQuery;

    if (specificUserIds && specificUserIds.length > 0) {
      // Use the specific user IDs provided
      userIds = specificUserIds;
    } else {
      // Query users based on notification type
      // For all notification types, get users who haven't explicitly disabled notifications
      usersQuery = query(usersRef, where('notificationSettings.gameCreated', '!=', false));
      
      // If no notification settings exist, the user will still get notifications by default

      const usersSnapshot = await getDocs(usersQuery);
      userIds = usersSnapshot.docs.map(doc => doc.id);
    }

    if (userIds.length === 0) {
      console.log('No users found to notify');
      return false;
    }

    console.log(`Sending notifications to ${userIds.length} users`);

    // Create notifications for each user
    const notificationsRef = collection(db, 'notifications');
    const notificationPromises = userIds.map(async (userId) => {
      // Create the notification without checking for duplicates
      // This ensures notifications are always created and avoids permission issues

      try {
        // Create the notification without duplicate checking
        return await addDoc(notificationsRef, {
          userId,
          title: notificationDetails.title,
          body: notificationDetails.body,
          type: notificationDetails.type,
          data: {
            gameId: gameData.id,
            location: gameData.location,
            date: gameData.date,
            time: gameData.time,
            url: `/games/${gameData.id}`,
            style: {
              background: '#2A2A2A',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '16px',
            }
          },
          read: false,
          createdAt: serverTimestamp(),
          showPopup: notificationDetails.showPopup
        });
      } catch (error) {
        console.error(`Error creating notification for user ${userId}:`, error);
        return null;
      }
    });

    // Send FCM notifications to all users
    if (userIds.length > 0) {
      await sendFCMNotification(userIds, {
        title: notificationDetails.title,
        body: notificationDetails.body,
        data: notificationDetails.data
      });
    }

    // Wait for all notifications to be created
    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(result => result !== null).length;

    console.log(`Successfully sent ${type} notifications to ${successCount} users`);
    return true;
  } catch (error) {
    console.error(`Error sending ${type} notifications:`, error);
    return false;
  }
};

/**
 * Send a confirmation notification to a user when they join a game
 * @param {string} userId - ID of the user who joined
 * @param {string} gameId - ID of the game they joined
 */
export const sendGameRegistrationConfirmation = async (userId, gameId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      throw new Error('Game not found');
    }

    const game = gameDoc.data();
    const gameDate = new Date(`${game.date}T${game.time}`);
    const formattedDate = format(gameDate, 'MMMM do, yyyy');

    await sendGameNotification('gameConfirmation', {
      id: gameId,
      ...game,
      formattedDate
    }, [userId]);

    return true;
  } catch (error) {
    console.error('Error sending game registration confirmation:', error);
    return false;
  }
};

/**
 * Check and send game closing soon notifications
 * This should be run periodically (e.g., via a cloud function or scheduled task)
 */
export const checkAndSendGameClosingSoonNotifications = async () => {
  try {
    const now = new Date();
    const gamesRef = collection(db, 'games');
    const gamesQuery = query(gamesRef, where('isOpen', '==', true));
    const gamesSnapshot = await getDocs(gamesQuery);
    const notificationPromises = [];

    gamesSnapshot.forEach(gameDoc => {
      const game = gameDoc.data();
      const gameId = gameDoc.id;

      // Skip games without a date or time
      if (!game.date || !game.time) return;

      // Parse the game date and time
      const gameDateTime = new Date(`${game.date}T${game.time}`);

      // Skip invalid dates
      if (isNaN(gameDateTime.getTime())) return;

      // Calculate hours until game
      const hoursUntilGame = (gameDateTime - now) / (1000 * 60 * 60);

      // Send notifications for games closing in 24 hours
      if (hoursUntilGame > 23 && hoursUntilGame < 25) {
        console.log(`Game ${gameId} is closing in about 24 hours`);

        const formattedDate = format(gameDateTime, 'MMMM do, yyyy');
        const notificationPromise = sendGameNotification('gameClosingSoon', {
          id: gameId,
          ...game,
          formattedDate,
          hoursRemaining: Math.round(hoursUntilGame)
        });

        notificationPromises.push(notificationPromise);
      }
    });

    await Promise.all(notificationPromises);
    console.log('Finished checking for games closing soon');
  } catch (error) {
    console.error('Error checking for games closing soon:', error);
  }
};

/**
 * Send notifications when a game is closed
 * @param {string} gameId - ID of the game that was closed
 */
export const sendGameClosedNotifications = async (gameId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      console.error(`Game ${gameId} not found`);
      return false;
    }

    const game = gameDoc.data();
    const playerIds = game.players || [];

    if (playerIds.length === 0) {
      console.log(`No players in game ${gameId}`);
      return false;
    }

    const gameDate = new Date(`${game.date}T${game.time}`);
    const formattedDate = format(gameDate, 'MMMM do, yyyy');

    return sendGameNotification('gameClosed', {
      id: gameId,
      ...game,
      formattedDate
    }, playerIds);
  } catch (error) {
    console.error('Error sending game closed notifications:', error);
    return false;
  }
};

/**
 * Legacy function for backward compatibility
 * @param {string} gameId - ID of the game
 * @param {Object} gameData - Game data
 */
export const sendGameCreatedNotifications = async (gameId, gameData) => {
  console.log('Using legacy sendGameCreatedNotifications function');
  const gameDate = new Date(gameData.date);
  return sendGameNotification('gameCreated', {
    id: gameId,
    ...gameData,
    formattedDate: format(gameDate, 'MMMM do, yyyy')
  });
};

/**
 * Fetch all open games from Firestore
 * @returns {Promise<Array>} Array of open game objects
 */
export const fetchOpenGames = async () => {
  try {
    const gamesRef = collection(db, 'games');
    const gamesQuery = query(gamesRef, where('isOpen', '==', true));
    const gamesSnapshot = await getDocs(gamesQuery);
    
    return gamesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      title: doc.data().title || `Game at ${doc.data().location}`
    }));
  } catch (error) {
    console.error('Error fetching open games:', error);
    return [];
  }
};