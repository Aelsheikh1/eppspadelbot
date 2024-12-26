import { db } from '../services/firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { emailGameReport } from './pdfGenerator';

export const checkAdminStatus = async (userId) => {
  try {
    if (!userId) return false;
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    return userData?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const toggleGameStatus = async (gameId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) {
      throw new Error('Game not found');
    }

    const gameData = gameSnap.data();
    const newStatus = !gameData.isOpen;
    
    await updateDoc(gameRef, {
      isOpen: newStatus,
      lastUpdated: new Date().toISOString(),
      ...(newStatus && { reopenCount: (gameData.reopenCount || 0) + 1 })
    });

    // If game is being closed, send email to admins
    if (!newStatus) {  // game is being closed
      try {
        await emailGameReport(gameId);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't throw here, as the game status was already updated
      }
    }

    return { success: true, isOpen: newStatus };
  } catch (error) {
    console.error('Error toggling game status:', error);
    throw error;
  }
};

export const distributePlayersRandomly = async (gameId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) {
      throw new Error('Game not found');
    }

    const gameData = gameSnap.data();
    if (gameData.isOpen) {
      throw new Error('Cannot distribute players while game is open');
    }

    // Get complete player details
    const players = await Promise.all(
      (gameData.players || []).map(async (player) => {
        const playerId = player.id || player;
        if (!playerId) return null;
        
        try {
          const playerDoc = await getDoc(doc(db, 'users', playerId));
          if (playerDoc.exists()) {
            const playerData = playerDoc.data();
            return {
              id: playerId,
              name: playerData.name,
              email: playerData.email
            };
          }
        } catch (error) {
          console.error(`Error fetching player ${playerId}:`, error);
        }
        return null;
      })
    );

    // Filter out any null values and ensure minimum players
    const validPlayers = players.filter(p => p !== null);
    if (validPlayers.length < 2) {
      throw new Error('Need at least 2 valid players to distribute');
    }

    // Shuffle players
    const shuffled = [...validPlayers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Create balanced pairs
    const pairs = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      pairs.push({
        player1: shuffled[i],
        player2: i + 1 < shuffled.length ? shuffled[i + 1] : null,
        score: 0
      });
    }

    // Update game with pairs
    const updateData = {
      pairs,
      lastDistributed: new Date().toISOString(),
      distributionComplete: true
    };

    await updateDoc(gameRef, updateData);

    // Send email with distribution
    try {
      await emailGameReport(gameId);
    } catch (emailError) {
      console.error('Error sending distribution email:', emailError);
      // Don't throw here as distribution was successful
    }

    return pairs;
  } catch (error) {
    console.error('Error distributing players:', error);
    throw error;
  }
};
