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
    // Get game data
    const gameRef = db.collection('games').doc(gameId);
    const gameSnapshot = await gameRef.get();
    
    if (!gameSnapshot.exists) {
      console.log(`Game ${gameId} not found`);
      return false;
    }
    
    const gameData = gameSnapshot.data();
    const creatorId = gameData.createdBy;
    
    console.log(`Processing notification for game ${gameId}, creator: ${creatorId}`);
    
    // Get all users who are registered for this game
    const playerIds = gameData.players || [];
    console.log(`Player IDs: ${JSON.stringify(playerIds)}`);
    
    // Determine which users should receive notifications based on notification type
    let targetUserIds = [];
    
    if (data.type === 'gameCreated') {
      // For game creation, we need to get all users except the creator
      console.log('This is a gameCreated notification - targeting all users');
      // We'll get all users in the next step
    } else {
      // For game updates (closing soon, closed, etc.), only notify participating players
      console.log(`This is a ${data.type} notification - targeting only participating players`);
      targetUserIds = playerIds;
      console.log('Target user IDs:', targetUserIds);
      
      if (targetUserIds.length === 0) {
        console.log('No target users for this notification');
        return false;
      }
    }
    
    // Get FCM tokens directly from user documents
    let userDocs = [];
    
    if (data.type === 'gameCreated') {
      // For game creation: get all users
      console.log('Querying all users for gameCreated notification');
      const usersSnapshot = await db.collection('users').get();
      userDocs = usersSnapshot.docs.filter(doc => doc.id !== creatorId); // Exclude creator
      console.log(`Found ${userDocs.length} users (excluding creator) for game creation notification`);
    } else {
      // For game updates: only get participating players
      // Handle Firestore's limit of 10 values in 'in' queries
      if (targetUserIds.length <= 10) {
        // Single query for 10 or fewer users
        const usersSnapshot = await db.collection('users')
          .where(admin.firestore.FieldPath.documentId(), 'in', targetUserIds)
          .get();
        userDocs = usersSnapshot.docs;
        console.log(`Queried ${userDocs.length} specific players`);
      } else {
        // Multiple queries for more than 10 users
        console.log(`Too many players (${targetUserIds.length}), using multiple queries`);
        const queryPromises = [];
        
        // Split into chunks of 10
        for (let i = 0; i < targetUserIds.length; i += 10) {
          const chunk = targetUserIds.slice(i, i + 10);
          queryPromises.push(
            db.collection('users')
              .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
              .get()
          );
        }
        
        // Execute all queries and combine results
        const snapshots = await Promise.all(queryPromises);
        userDocs = snapshots.flatMap(snapshot => snapshot.docs);
        console.log(`Retrieved ${userDocs.length} users from multiple queries`);
      }
    }
    
    if (userDocs.length === 0) {
      console.log('No users found for notification');
      return false;
    }
    
    console.log(`Found ${userDocs.length} total users to potentially notify`);
    
    // Create a map to collect all valid FCM tokens
    const userTokenMap = new Map();
    
    // Extract FCM tokens from user documents
    userDocs.forEach(userDoc => {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Skip the creator
      if (userId === creatorId) return;
      
      // Skip users without FCM tokens
      if (!userData.fcmTokens || !Array.isArray(userData.fcmTokens) || userData.fcmTokens.length === 0) {
        console.log(`User ${userId} has no FCM tokens`);
        return;
      }
      
      // Check notification preferences if they exist
      const notificationSettings = userData.notificationSettings || {
        gameCreated: true,
        gameClosingSoon: true,
        gameClosed: true,
        tournamentUpdates: true
      };
      
      // Skip if user has disabled this notification type
      if ((data.type === 'gameCreated' && !notificationSettings.gameCreated) ||
          (data.type === 'gameClosingSoon' && !notificationSettings.gameClosingSoon) ||
          (data.type === 'gameClosed' && !notificationSettings.gameClosed) ||
          (data.type === 'tournamentUpdates' && !notificationSettings.tournamentUpdates)) {
        console.log(`User ${userId} has disabled ${data.type} notifications`);
        return;
      }
      
      // Use the most recent token (last in the array)
      const token = userData.fcmTokens[userData.fcmTokens.length - 1];
      
      if (token) {
        userTokenMap.set(userId, {
          token,
          userId
        });
        console.log(`Added token for user ${userId}`);
      }
    });
    
    // DEBUG LOG: Print all tokens and userIds before filtering
    console.log('DEBUG: All user tokens to consider:', Array.from(userTokenMap.values()));
    
    // Now collect tokens with user notification settings
    const tokenPromises = Array.from(userTokenMap.values()).map(async (tokenData) => {
      const userId = tokenData.userId;
      const token = tokenData.token;
      
      try {
        // Get user notification settings
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
          console.log(`User document not found for ${userId}`);
          return null;
        }
        
        const userData = userDoc.data();
        const notificationSettings = userData.notificationSettings || {
          gameCreated: true,
          gameClosingSoon: true,
          gameClosed: true,
          tournamentUpdates: true
        };
        
        // Check if this notification type is enabled for the user
        if ((data.type === 'gameCreated' && notificationSettings.gameCreated) ||
            (data.type === 'gameClosingSoon' && notificationSettings.gameClosingSoon) ||
            (data.type === 'gameClosed' && notificationSettings.gameClosed) ||
            (data.type === 'tournamentUpdates' && notificationSettings.tournamentUpdates)) {
          console.log(`Adding token for user ${userId}`);
          return token;
        }
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
      }
      
      return null;
    });
    
    // Wait for all promises to resolve and filter out null values
    const tokens = (await Promise.all(tokenPromises)).filter(token => token !== null);
    
    // Remove any duplicate tokens that might still exist
    const uniqueTokens = [...new Set(tokens)];

    // DEBUG LOG: Print unique tokens and intended recipients
    console.log('DEBUG: Unique tokens to send notification to:', uniqueTokens);
    console.log('DEBUG: Notification payload:', { title, body, data });
    console.log('DEBUG: Player IDs:', playerIds);
    console.log('DEBUG: Creator/admin ID:', creatorId);
    
    if (uniqueTokens.length === 0) {
      console.log(`No valid FCM tokens found for game ${gameId}`);
      return false;
    }
    
    // Prepare the notification message with enhanced configuration for popup notifications
    const message = {
      notification: {
        title,
        body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: `game-${gameId}`
      },
      data: {
        ...data,
        gameId,
        gameName: gameData.name || '',
        gameDate: gameData.date || '',
        gameTime: gameData.time || '',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        // Include notification content in data payload for service worker
        title,
        body,
        forcePopup: 'true'
      },
      // Set high priority for better popup chances
      android: {
        priority: 'high',
        notification: {
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          icon: '/logo192.png',
          priority: 'max',
          channelId: 'game_notifications'
        }
      },
      // Set critical priority for iOS
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
            mutableContent: true,
            priority: 10
          }
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert'
        }
      },
      // Set web push specific options
      webpush: {
        notification: {
          icon: '/logo192.png',
          badge: '/logo192.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: 'View Game'
            },
            {
              action: 'close',
              title: 'Dismiss'
            }
          ]
        },
        fcmOptions: {
          link: `/games/${gameId}`
        },
        headers: {
          TTL: '86400',
          Urgency: 'high'
        }
      },
      tokens: uniqueTokens
    };

    // DEBUG LOG: Message before sending
    console.log('DEBUG: Sending FCM message:', JSON.stringify(message, null, 2));
    
    // Send the notification using the new recommended method instead of deprecated sendMulticast
    const response = await messaging.sendEachForMulticast(message);
    console.log(`Notifications sent for game ${gameId}:`, response.successCount, 'successful,', response.failureCount, 'failed');
    console.log('DEBUG: FCM response:', response);
    
    // Log the notification in Firestore
    await db.collection('notifications').add({
      title,
      body,
      data: message.data,
      type: data.type || 'unknown',
      gameId: gameId,
      creatorId: creatorId,
      // For sentTo, use the actual recipients based on notification type
      sentTo: data.type === 'gameCreated' 
        ? 'all_users_except_creator' // For game creation, we notified all users
        : playerIds.filter(id => id !== creatorId), // For game updates, only participating players
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
    
    // Track the source of the notification as the game creator
    // This ensures the creator doesn't get notified about their own action
    const sourceData = {
      type: 'gameCreated',
      sourceUserId: gameData.createdBy, // Add the creator ID as the source
      sourceType: 'creator'
    };
    
    await sendGameNotification(gameId, title, body, sourceData);
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
