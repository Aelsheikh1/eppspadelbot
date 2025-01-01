const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Listen for new notifications and send FCM messages
exports.sendNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    try {
      const notification = snap.data();
      const { token, title, body, type, link } = notification;

      const message = {
        token,
        notification: {
          title,
          body,
          icon: '/logo192.png'
        },
        webpush: {
          notification: {
            icon: '/logo192.png',
            badge: '/logo192.png',
            actions: [
              {
                action: 'open',
                title: 'View Game'
              }
            ]
          },
          fcmOptions: {
            link: `https://padelbolt-5d9a2.firebaseapp.com${link || '/games'}`
          }
        },
        data: {
          type,
          link: link || '/games'
        }
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent notification:', response);
      
      return null;
    } catch (error) {
      console.error('Error sending notification:', error);
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
