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
            return {
              id: playerId,
              name: 'Unknown Player',
              email: null
            };
          }
        } catch (error) {
          console.error(`Error fetching player ${playerId}:`, error);
          return null;
        }
      })
    );

    // Filter out null values and shuffle players
    const validPlayers = players.filter(player => player !== null);
    for (let i = validPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [validPlayers[i], validPlayers[j]] = [validPlayers[j], validPlayers[i]];
    }

    // Create pairs as objects instead of arrays
    const pairs = [];
    for (let i = 0; i < validPlayers.length; i += 2) {
      const pair = {
        player1: validPlayers[i],
        player2: i + 1 < validPlayers.length ? validPlayers[i + 1] : null,
        score: 0
      };
      pairs.push(pair);
    }

    // Update game with pairs
    await updateDoc(gameRef, {
      pairs,
      lastUpdated: new Date().toISOString(),
      distributedAt: new Date().toISOString()
    });

    return pairs;
  } catch (error) {
    console.error('Error distributing players:', error);
    throw error;
  }
};

export const addPlayerToGame = async (gameId, playerId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) {
      throw new Error('Game not found');
    }

    const gameData = gameSnap.data();
    
    // Check if player is already in the game
    if (gameData.players && gameData.players.includes(playerId)) {
      throw new Error('Player is already in this game');
    }

    // Add player to the game
    const updatedPlayers = [...(gameData.players || []), playerId];
    
    await updateDoc(gameRef, {
      players: updatedPlayers,
      lastUpdated: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error adding player to game:', error);
    throw error;
  }
};
