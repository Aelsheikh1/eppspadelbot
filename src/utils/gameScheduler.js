import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { sendGameNotification } from './gameNotifications';

/**
 * Check and send game closing soon notifications
 * This should be run periodically (e.g., via a cloud function or scheduled task)
 */
export const checkGamesClosingSoon = async () => {
  try {
    const gamesRef = collection(db, 'games');
    const now = new Date();
    
    // Find games closing soon (within next 24 hours)
    const closingSoonQuery = query(
      gamesRef,
      where('isOpen', '==', true),
      where('deadline', '<=', new Date(now.getTime() + 24 * 60 * 60 * 1000))
    );
    
    const closingSoonGames = await getDocs(closingSoonQuery);

    for (const gameDoc of closingSoonGames.docs) {
      const gameData = gameDoc.data();
      
      // Calculate hours remaining
      const deadlineDate = new Date(gameData.deadline);
      const hoursRemaining = Math.ceil((deadlineDate - now) / (1000 * 60 * 60));

      // Send notifications to registered players
      if (gameData.players && gameData.players.length > 0) {
        await sendGameNotification('gameClosingSoon', {
          id: gameDoc.id,
          location: gameData.location,
          date: gameData.date,
          hoursRemaining
        }, gameData.players);
      }

      // Close game if deadline has passed
      if (hoursRemaining <= 0) {
        await updateDoc(doc(db, 'games', gameDoc.id), {
          isOpen: false,
          status: 'closed'
        });

        // Send game closed notification to registered players
        if (gameData.players && gameData.players.length > 0) {
          await sendGameNotification('gameClosed', {
            id: gameDoc.id,
            location: gameData.location,
            date: gameData.date
          }, gameData.players);
        }
      }
    }

    console.log(`Checked ${closingSoonGames.size} games closing soon`);
  } catch (error) {
    console.error('Error checking games closing soon:', error);
  }
};

// Optional: Add a function to manually trigger the check
export const manualGameClosingCheck = async () => {
  console.log('Manually triggering game closing check...');
  await checkGamesClosingSoon();
};
