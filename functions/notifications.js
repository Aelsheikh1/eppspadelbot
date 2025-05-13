const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Send push notifications for a specific event type to all users who opted in.
 * @param {Object} param0 { eventType, title, body, data, userIdsOverride }
 */
async function sendEventPushNotification({ eventType, title, body, data = {}, userIdsOverride = null }) {
  // 1. Get all users who have enabled this event in their notificationSettings
  let userIds = [];
  if (userIdsOverride) {
    userIds = userIdsOverride;
  } else {
    const usersSnapshot = await admin.firestore().collection('users').get();
    usersSnapshot.forEach(doc => {
      const settings = doc.data().notificationSettings || {};
      if (settings[eventType]) {
        userIds.push(doc.id);
      }
    });
  }
  if (userIds.length === 0) {
    console.log(`No users opted in for ${eventType}`);
    return { success: true, successCount: 0 };
  }
  // 2. Get FCM tokens for these users
  let tokens = [];
  if (userIds.length > 10) {
    // Firestore 'in' queries are limited to 10 items per query
    for (let i = 0; i < userIds.length; i += 10) {
      const batchIds = userIds.slice(i, i + 10);
      const tokensSnapshot = await admin.firestore().collection('fcmTokens').where('userId', 'in', batchIds).get();
      tokens.push(...tokensSnapshot.docs.map(doc => doc.data().token));
    }
  } else {
    const tokensSnapshot = await admin.firestore().collection('fcmTokens').where('userId', 'in', userIds).get();
    tokens = tokensSnapshot.docs.map(doc => doc.data().token);
  }
  if (tokens.length === 0) {
    console.log(`No tokens found for users of ${eventType}`);
    return { success: true, successCount: 0 };
  }
  // 3. Build and send the notification
  const message = {
    notification: { title, body },
    data: { ...data, type: eventType, timestamp: Date.now().toString() },
    webpush: {
      notification: {
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'View' },
          { action: 'close', title: 'Dismiss' }
        ]
      },
      fcmOptions: {
        link: data.url || 'https://eppspadelbot.vercel.app'
      }
    },
    android: {
      notification: {
        title,
        body,
        icon: 'ic_notification', // use your app icon or default
        color: '#2A2A2A',
        channel_id: 'default',
      }
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title,
            body
          },
          sound: 'default',
          badge: 1
        }
      }
    },
    tokens
  };
  const response = await admin.messaging().sendMulticast(message);
  console.log(`Sent ${eventType} notification to ${response.successCount} devices`);
  return { success: true, successCount: response.successCount };
}

// Notification handler for new games
exports.sendGameNotification = functions.firestore
  .document('games/{gameId}')
  .onCreate(async (snap, context) => {
    try {
      const game = snap.data();
      const gameId = context.params.gameId;
      
      // Get all FCM tokens
      const tokensSnapshot = await admin.firestore()
        .collection('fcmTokens')
        .get();

      if (tokensSnapshot.empty) {
        console.log('No users to notify');
        return null;
      }
      
      // Filter out the game creator's tokens
      const creatorId = game.createdBy;
      console.log(`Excluding game creator: ${creatorId} from notifications`);
      
      const tokens = [];
      const userIds = [];
      tokensSnapshot.docs.forEach(doc => {
        const tokenData = doc.data();
        if (tokenData.userId !== creatorId && tokenData.token) {
          tokens.push(tokenData.token);
          userIds.push(tokenData.userId);
        }
      });
      
      if (tokens.length === 0) {
        console.log('No valid tokens found after filtering out game creator');
        return null;
      }
      
      console.log(`Sending notifications to ${tokens.length} users:`, userIds);
      
      // Send push notification to all users who opted in for game_created
      await sendEventPushNotification({
        eventType: 'game_created',
        title: 'New Game Available!',
        body: `${game.location} - ${game.date} at ${game.time}`,
        data: { gameId, url: `/games/${gameId}` }
      });

      // Handle failed tokens
      if (response.failureCount > 0) {
        const batch = admin.firestore().batch();
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const failedToken = tokens[idx];
            // Find and delete failed tokens
            admin.firestore()
              .collection('fcmTokens')
              .where('token', '==', failedToken)
              .get()
              .then(snapshot => {
                snapshot.forEach(doc => {
                  batch.delete(doc.ref);
                });
              });
          }
        });
        await batch.commit();
      }

      // Create notification in Firestore with improved handling for creators
      const createNotification = async (data) => {
        // Check if this is a creator (don't show popups to creators)
        const isCreator = data.creatorId === data.recipientId;

        // Add timestamp and required fields
        const notification = {
          ...data,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: isCreator, // Mark as read automatically for creators to prevent showing in their list
          delivered: isCreator, // Mark as delivered for creators
          popupShown: isCreator, // Mark as already shown for creators
          showPopup: !isCreator, // Never show popup for the creator
          dismissable: true, // Allow dismissing the notification
          priority: isCreator ? 'low' : 'high' // Lower priority for creators
        };

        // Add notification to Firestore
        try {
          // For creators, we'll first check if a similar notification already exists
          // to prevent duplicates
          if (isCreator) {
            // Check for existing notifications in the last 5 minutes with the same type and game
            const existingNotifs = await admin.firestore()
              .collection('notifications')
              .where('userId', '==', data.userId)
              .where('gameId', '==', data.gameId)
              .where('type', '==', data.type)
              .where('createdAt', '>', new Date(Date.now() - 5 * 60 * 1000)) // 5 minutes ago
              .get();

            // If a similar notification already exists, don't create a new one
            if (!existingNotifs.empty) {
              console.log('Skipping duplicate notification for creator');
              return { success: true, id: existingNotifs.docs[0].id, skipped: true };
            }
          }

          // Create the notification
          const notificationRef = admin.firestore().collection('notifications').doc();
          await notificationRef.set(notification);
          return { success: true, id: notificationRef.id };
        } catch (error) {
          console.error('Error creating notification:', error);
          return { success: false, error: error.message };
        }
      };

      // Store notifications in Firestore - one for each recipient
      const batch = admin.firestore().batch();
      
      // Loop through all user IDs from our tokens
      for (const userId of userIds) {
        // Create a notification for this specific user
        const notificationData = {
          userId: userId,  
          title: 'New Game Available!',
          body: `${game.location} - ${game.date} at ${game.time}`,
          gameId,
          creatorId: creatorId,
          recipientId: userId,
          type: 'newGame',
          data: {
            gameId,
            url: `/games/${gameId}`,
            type: 'newGame'
          }
        };
        
        // Create the notification with our enhanced function
        await createNotification(notificationData);
        
        console.log(`Created notification for user: ${userId}`);
      }
      
      await batch.commit();
      console.log(`Committed ${userIds.length} notifications to Firestore`);
      return null;
    } catch (error) {
      console.error('Error sending game notification:', error);
      return null;
    }
  });

// Example: Game Closed event handler (call this where you handle game closing)
// async function onGameClosed(game) {
//   await sendEventPushNotification({
//     eventType: 'gameClosed',
//     title: 'Game Closed',
//     body: `The game at ${game.location} on ${game.date} is now closed. See you on the court!`,
//     data: { gameId: game.id, url: `/games/${game.id}` },
//     userIdsOverride: game.players // Only send to participants
//   });
// }

/**
 * Callable function to test all notification events at once for admin/dev.
 * Sends a test notification for every event type to users who have opted in for each.
 */
exports.testAllEventNotifications = functions.https.onCall(async (data, context) => {
  // Only allow admin users to run this
  const userSnapshot = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!userSnapshot.exists || userSnapshot.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can test notifications.');
  }

  const testEvents = [
    // Game events
    { eventType: 'game_created', title: 'Test: Game Created', body: 'A new game has been created (test).' },
    { eventType: 'game_updated', title: 'Test: Game Updated', body: 'A game has been updated (test).' },
    { eventType: 'gameClosingSoon', title: 'Test: Game Closing Soon', body: 'A game is closing soon (test).' },
    { eventType: 'gameClosed', title: 'Test: Game Closed', body: 'A game has been closed (test).' },
    // Tournament events
    { eventType: 'tournament_created', title: 'Test: Tournament Created', body: 'A new tournament has been created (test).' },
    { eventType: 'tournament_deadline', title: 'Test: Tournament Deadline', body: 'A tournament registration deadline is approaching (test).' },
    { eventType: 'match_result', title: 'Test: Match Result', body: 'A match result has been posted (test).' },
    { eventType: 'tournament_winner', title: 'Test: Tournament Winner', body: 'A tournament winner has been announced (test).' },
    { eventType: 'bracket_update', title: 'Test: Bracket Update', body: 'A tournament bracket has been updated (test).' },
    { eventType: 'upcoming_match', title: 'Test: Upcoming Match', body: 'A match is coming up soon (test).' },
    // General
    { eventType: 'general', title: 'Test: General Notification', body: 'This is a general test notification.' }
  ];

  for (const evt of testEvents) {
    await sendEventPushNotification({
      eventType: evt.eventType,
      title: evt.title,
      body: evt.body,
      data: { test: 'true' }
    });
  }
  return { success: true, message: 'Test notifications sent for all event types.' };
});

// Function to send direct notification to specific users
exports.sendDirectNotification = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { title, body, tokens, gameId, notificationType } = data;

    if (!title || !body || !tokens || tokens.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Create notification message
    const message = {
      notification: {
        title,
        body
      },
      data: {
        gameId: gameId || '',
        type: notificationType || 'general',
        timestamp: Date.now().toString()
      },
      webpush: {
        notification: {
          icon: '/logo192.png',
          badge: '/logo192.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            {
              action: 'open',
              title: 'View'
            },
            {
              action: 'close',
              title: 'Dismiss'
            }
          ]
        },
        fcmOptions: {
          link: gameId ? `https://eppspadelbot.vercel.app/games/${gameId}` : 'https://eppspadelbot.vercel.app'
        }
      },
      android: {
        notification: {
          title,
          body,
          icon: 'ic_notification', // use your app icon or default
          color: '#2A2A2A',
          channel_id: 'default',
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body
            },
            sound: 'default',
            badge: 1
          }
        }
      },
      tokens
    };

    // Send notification
    const response = await admin.messaging().sendMulticast(message);
    console.log(`Sent direct notification to ${response.successCount} devices`);

    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });

      // Clean up failed tokens
      const batch = admin.firestore().batch();
      for (const token of failedTokens) {
        const snapshot = await admin.firestore()
          .collection('fcmTokens')
          .where('token', '==', token)
          .get();
        
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
      }
      
      if (failedTokens.length > 0) {
        await batch.commit();
      }
    }

    return { success: true, successCount: response.successCount };
  } catch (error) {
    console.error('Error sending direct notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Function to send notification to all users
exports.sendNotificationToAll = functions.https.onCall(async (data, context) => {
  try {
    // Verify admin authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if user is admin
    const userSnapshot = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();
    
    if (!userSnapshot.exists || userSnapshot.data().role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can send notifications to all users');
    }

    const { title, body, gameId, notificationType } = data;

    if (!title || !body) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Get all FCM tokens
    const tokensSnapshot = await admin.firestore()
      .collection('fcmTokens')
      .get();

    if (tokensSnapshot.empty) {
      return { success: true, successCount: 0 };
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

    // Create notification message
    const message = {
      notification: {
        title,
        body
      },
      data: {
        gameId: gameId || '',
        type: notificationType || 'announcement',
        timestamp: Date.now().toString()
      },
      webpush: {
        notification: {
          icon: '/logo192.png',
          badge: '/logo192.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            {
              action: 'open',
              title: 'View'
            },
            {
              action: 'close',
              title: 'Dismiss'
            }
          ]
        },
        fcmOptions: {
          link: gameId ? `https://eppspadelbot.vercel.app/games/${gameId}` : 'https://eppspadelbot.vercel.app'
        }
      },
      tokens
    };

    // Send notification in batches of 500 tokens (FCM limit)
    const batchSize = 500;
    let successCount = 0;
    let failureCount = 0;
    const failedTokens = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batchTokens = tokens.slice(i, i + batchSize);
      const batchMessage = { ...message, tokens: batchTokens };
      
      const response = await admin.messaging().sendMulticast(batchMessage);
      successCount += response.successCount;
      failureCount += response.failureCount;
      
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(batchTokens[idx]);
        }
      });
    }

    // Clean up failed tokens
    if (failedTokens.length > 0) {
      const batch = admin.firestore().batch();
      for (const token of failedTokens) {
        const snapshot = await admin.firestore()
          .collection('fcmTokens')
          .where('token', '==', token)
          .get();
        
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
      }
      
      await batch.commit();
    }

    return { 
      success: true, 
      successCount, 
      failureCount 
    };
  } catch (error) {
    console.error('Error sending notification to all:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
