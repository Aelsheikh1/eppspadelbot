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
    const isCurrentlyClosed = gameData.status === 'closed';
    const newStatus = isCurrentlyClosed ? 'open' : 'closed';
    
    await updateDoc(gameRef, {
      status: newStatus,
      isOpen: isCurrentlyClosed,
      registrationOpen: isCurrentlyClosed,
      lastUpdated: new Date().toISOString(),
      ...(isCurrentlyClosed ? { 
        closedAt: null,
        reopenCount: (gameData.reopenCount || 0) + 1 
      } : { 
        closedAt: new Date().toISOString() 
      })
    });

    // If game is being closed, send email to admins
    if (!isCurrentlyClosed) {  // game is being closed
      try {
        await emailGameReport(gameId);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't throw here, as the game status was already updated
      }
    }

    return { success: true, isOpen: isCurrentlyClosed };
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
              name: playerData.name || playerData.displayName || 'Unknown Player',
              email: playerData.email || null
            };
          } else {
            // If player document doesn't exist, create a default player object
            return {
              id: playerId,
              name: 'Unknown Player',
              email: null
            };
          }
        } catch (error) {
          console.error(`Error fetching player ${playerId}:`, error);
          // Return a default player object instead of null
          return {
            id: playerId,
            name: 'Unknown Player',
            email: null
          };
        }
      })
    );

    // Filter out any null values and ensure minimum players
    const validPlayers = players.filter(p => p !== null && p.id);
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
      const player1 = shuffled[i];
      const player2 = i + 1 < shuffled.length ? shuffled[i + 1] : null;
      
      // Ensure both players have valid data structure
      const pair = {
        player1: {
          id: player1.id,
          name: player1.name || 'Unknown Player',
          email: player1.email || null
        },
        player2: player2 ? {
          id: player2.id,
          name: player2.name || 'Unknown Player',
          email: player2.email || null
        } : null,
        score: 0
      };
      pairs.push(pair);
    }

    // Update game with pairs
    const updateData = {
      pairs,
      lastDistributed: new Date().toISOString(),
      distributionComplete: true
    };

    console.log('Updating game with data:', JSON.stringify(updateData, null, 2));
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
