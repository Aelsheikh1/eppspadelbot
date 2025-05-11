const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with service account
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

// Import notification functions
const notifications = require('./notifications');

// Export notification functions
exports.sendGameNotification = notifications.sendGameNotification;
exports.sendDirectNotification = notifications.sendDirectNotification;
exports.sendNotificationToAll = notifications.sendNotificationToAll;

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
