// updateNotificationSettings.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./src/service-account.json');

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const defaultSettings = {
  gameCreated: true,
  gameClosingSoon: true,
  gameClosed: true,
  tournamentUpdates: true,
};

async function updateAllUsers() {
  const usersSnapshot = await db.collection('users').get();
  let updatedCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    const data = userDoc.data();
    if (!data.notificationSettings) {
      await userDoc.ref.update({ notificationSettings: defaultSettings });
      updatedCount++;
      console.log(`Updated user: ${userDoc.id}`);
    }
  }

  console.log(`Done! Updated ${updatedCount} users.`);
}

updateAllUsers().catch(console.error); 