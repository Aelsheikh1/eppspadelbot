const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Listen for new games and send notifications to all users
exports.onGameCreated = functions.firestore
  .document('games/{gameId}')
  .onCreate(async (snap, context) => {
    try {
      const game = snap.data();
      const gameId = context.params.gameId;
      
      // Get all users except the creator
      const usersSnapshot = await admin.firestore()
        .collection('fcmTokens')
        .where('userId', '!=', game.createdBy)
        .get();

      if (usersSnapshot.empty) {
        console.log('No users to notify');
        return null;
      }

      const tokens = usersSnapshot.docs.map(doc => doc.data().token);
      
      // Create the notification message
      const message = {
        notification: {
          title: 'New Game Available!',
          body: `${game.location} - ${game.date} at ${game.time}`
        },
        data: {
          gameId,
          url: `/games/${gameId}`
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

      // Store notifications in Firestore
      const batch = admin.firestore().batch();
      usersSnapshot.docs.forEach(userDoc => {
        const notificationRef = admin.firestore()
          .collection('notifications')
          .doc();
        
        batch.set(notificationRef, {
          userId: userDoc.data().userId,
          title: 'New Game Available!',
          body: `${game.location} - ${game.date} at ${game.time}`,
          gameId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
      });
      
      await batch.commit();
      return null;
    } catch (error) {
      console.error('Error sending game notification:', error);
      return null;
    }
  });

// Clean up old notifications
exports.cleanupOldNotifications = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const oneMonthAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const batch = admin.firestore().batch();
    const snapshot = await admin.firestore()
      .collection('notifications')
      .where('createdAt', '<', oneMonthAgo)
      .get();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} old notifications`);
    return null;
  });

// Clean up invalid FCM tokens
exports.cleanupInvalidTokens = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    try {
      const tokensSnapshot = await admin.firestore()
        .collection('fcmTokens')
        .get();

      const tokens = tokensSnapshot.docs.map(doc => ({
        token: doc.data().token,
        ref: doc.ref
      }));

      // Test tokens in batches of 100
      const batchSize = 100;
      const batch = admin.firestore().batch();
      let invalidTokens = 0;

      for (let i = 0; i < tokens.length; i += batchSize) {
        const batchTokens = tokens.slice(i, i + batchSize);
        const message = {
          data: { test: 'true' },
          tokens: batchTokens.map(t => t.token)
        };

        const response = await admin.messaging().sendMulticast(message);
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
            batch.delete(batchTokens[idx].ref);
            invalidTokens++;
          }
        });
      }

      if (invalidTokens > 0) {
        await batch.commit();
        console.log(`Cleaned up ${invalidTokens} invalid tokens`);
      }

      return null;
    } catch (error) {
      console.error('Error cleaning up tokens:', error);
      return null;
    }
  });
