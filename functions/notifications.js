const functions = require('firebase-functions');
const admin = require('firebase-admin');

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
      
      // Create the notification message
      const message = {
        notification: {
          title: 'New Game Available!',
          body: `${game.location} - ${game.date} at ${game.time}`
        },
        data: {
          gameId,
          url: `/games/${gameId}`,
          type: 'newGame'
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
                title: 'View Game'
              },
              {
                action: 'close',
                title: 'Dismiss'
              }
            ]
          },
          fcmOptions: {
            link: `https://eppspadelbot.vercel.app/games/${gameId}`
          }
        },
        tokens // Send to multiple devices
      };

      // Send the notification
      const response = await admin.messaging().sendMulticast(message);
      console.log('Notification sent successfully:', response);

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
