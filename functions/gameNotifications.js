const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Sends a notification to all users subscribed to a game
 */
const sendGameNotification = async (gameId, title, body, data = {}) => {
  try {
    // Get the game document
    const gameDoc = await db.collection('games').doc(gameId).get();
    if (!gameDoc.exists) {
      console.error(`Game ${gameId} not found`);
      return false;
    }
    
    const gameData = gameDoc.data();
    
    // Get all users who are registered for this game
    const playerIds = gameData.players?.map(player => player.id) || [];
    
    // Add the game creator to the list if not already included
    if (gameData.createdBy && !playerIds.includes(gameData.createdBy)) {
      playerIds.push(gameData.createdBy);
    }
    
    // Get FCM tokens for all players
    const tokensSnapshot = await db.collection('users')
      .where('uid', 'in', playerIds)
      .get();
    
    const tokens = [];
    tokensSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.fcmTokens && userData.fcmTokens.length > 0) {
        // Check notification settings
        const notificationSettings = userData.notificationSettings || {
          gameCreated: true,
          gameClosingSoon: true,
          gameClosed: true,
          tournamentUpdates: true
        };
        
        // Only send notification if the user has enabled the specific type
        if ((data.type === 'gameCreated' && notificationSettings.gameCreated) ||
            (data.type === 'gameClosingSoon' && notificationSettings.gameClosingSoon) ||
            (data.type === 'gameClosed' && notificationSettings.gameClosed) ||
            (data.type === 'tournamentUpdates' && notificationSettings.tournamentUpdates)) {
          tokens.push(...userData.fcmTokens);
        }
      }
    });
    
    if (tokens.length === 0) {
      console.log(`No valid FCM tokens found for game ${gameId}`);
      return false;
    }
    
    // Prepare the notification message
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        gameId,
        gameName: gameData.name || '',
        gameDate: gameData.date || '',
        gameTime: gameData.time || '',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
      },
      tokens
    };
    
    // Send the notification
    const response = await messaging.sendMulticast(message);
    console.log(`Notifications sent for game ${gameId}:`, response.successCount, 'successful,', response.failureCount, 'failed');
    
    // Log the notification in Firestore
    await db.collection('notifications').add({
      title,
      body,
      data: message.data,
      sentTo: playerIds,
      successCount: response.successCount,
      failureCount: response.failureCount,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error sending game notification:', error);
    return false;
  }
};

/**
 * Cloud Function triggered when a game is created
 */
exports.onGameCreated = functions.firestore
  .document('games/{gameId}')
  .onCreate(async (snapshot, context) => {
    const gameId = context.params.gameId;
    const gameData = snapshot.data();
    
    // Don't send notifications for tournaments
    if (gameData.isTournament) return null;
    
    const title = 'New Game Available';
    const body = `A new game "${gameData.name}" has been created for ${gameData.date} at ${gameData.time}`;
    
    await sendGameNotification(gameId, title, body, { type: 'gameCreated' });
    return null;
  });

/**
 * Cloud Function to check for games closing soon and send notifications
 * This function runs on a schedule (every hour)
 */
exports.checkGamesClosingSoon = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async (context) => {
    try {
      // Get current time
      const now = admin.firestore.Timestamp.now();
      
      // Calculate the time 24 hours from now
      const oneDayFromNow = new Date(now.toMillis() + 24 * 60 * 60 * 1000);
      
      // Query for games that are closing within the next 24 hours
      const gamesSnapshot = await db.collection('games')
        .where('registrationDeadline', '>', now.toDate())
        .where('registrationDeadline', '<', oneDayFromNow)
        .where('notifiedClosingSoon', '==', false) // Only get games we haven't notified about yet
        .get();
      
      const batch = db.batch();
      const notificationPromises = [];
      
      gamesSnapshot.forEach(doc => {
        const gameData = doc.data();
        const gameId = doc.id;
        
        // Don't send notifications for tournaments
        if (gameData.isTournament) return;
        
        // Calculate hours remaining
        const hoursRemaining = Math.floor((gameData.registrationDeadline.toMillis() - now.toMillis()) / (60 * 60 * 1000));
        
        const title = 'Registration Closing Soon';
        const body = `Registration for "${gameData.name}" will close in ${hoursRemaining} hours`;
        
        // Add notification to promises array
        notificationPromises.push(
          sendGameNotification(gameId, title, body, { type: 'gameClosingSoon' })
        );
        
        // Mark the game as notified
        const gameRef = db.collection('games').doc(gameId);
        batch.update(gameRef, { notifiedClosingSoon: true });
      });
      
      // Send all notifications
      await Promise.all(notificationPromises);
      
      // Commit the batch to update all games
      await batch.commit();
      
      return null;
    } catch (error) {
      console.error('Error checking for games closing soon:', error);
      return null;
    }
  });

/**
 * Cloud Function triggered when a game is updated
 * Used to detect when a game is closed
 */
exports.onGameUpdated = functions.firestore
  .document('games/{gameId}')
  .onUpdate(async (change, context) => {
    const gameId = context.params.gameId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Don't send notifications for tournaments
    if (afterData.isTournament) return null;
    
    // Check if the game was just closed
    if (!beforeData.closed && afterData.closed) {
      const title = 'Game Registration Closed';
      const body = `Registration for "${afterData.name}" has been closed. ${afterData.players?.length || 0} players have registered.`;
      
      await sendGameNotification(gameId, title, body, { type: 'gameClosed' });
    }
    
    // Check if the game was converted to a tournament
    if (!beforeData.isTournament && afterData.isTournament) {
      const title = 'Game Converted to Tournament';
      const body = `"${afterData.name}" has been converted to a tournament. Check it out!`;
      
      await sendGameNotification(gameId, title, body, { type: 'tournamentUpdates' });
    }
    
    return null;
  });

/**
 * Cloud Function triggered when a tournament is updated
 * Used to detect when tournament results are updated
 */
exports.onTournamentUpdated = functions.firestore
  .document('games/{gameId}')
  .onUpdate(async (change, context) => {
    const gameId = context.params.gameId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Only process tournaments
    if (!afterData.isTournament) return null;
    
    // Check if tournament data was updated
    if (JSON.stringify(beforeData.tournamentData) !== JSON.stringify(afterData.tournamentData)) {
      const title = 'Tournament Updated';
      const body = `The tournament "${afterData.name}" has been updated with new results.`;
      
      await sendGameNotification(gameId, title, body, { type: 'tournamentUpdates' });
    }
    
    return null;
  });
