const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Listen for new notifications and send FCM messages
exports.sendNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    try {
      const notification = snap.data();
      const { token, title, body } = notification;

      const message = {
        token,
        notification: {
          title,
          body,
        },
        webpush: {
          fcmOptions: {
            link: 'https://padelbolt-5d9a2.firebaseapp.com/games'
          }
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
