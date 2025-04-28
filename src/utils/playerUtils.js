import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

// Cache for player data to avoid repeated fetches
const playerCache = new Map();

// Add real-time listener for user changes
const userListeners = new Map();

const setupUserListener = (userId) => {
  if (userListeners.has(userId)) return;

  const userRef = doc(db, 'users', userId);
  const unsubscribe = onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      // Clear cache for this user when their data changes
      playerCache.delete(userId);
      // Force a refresh of the data
      getPlayerData(userId);
    }
  });

  userListeners.set(userId, unsubscribe);
};

// Clear cache when needed (e.g., after profile updates)
export const clearPlayerCache = (userId = null) => {
  if (userId) {
    playerCache.delete(userId);
  } else {
    playerCache.clear();
  }
};

// Cleanup function to remove listeners
export const cleanupUserListeners = () => {
  userListeners.forEach((unsubscribe) => unsubscribe());
  userListeners.clear();
};

export const getPlayerData = async (playerId, currentUserId = null) => {
  console.log('Fetching player data for:', playerId);
  
  // Setup real-time listener for this user
  setupUserListener(playerId);
  
  // Check cache first
  if (playerCache.has(playerId)) {
    console.log('Found in cache:', playerCache.get(playerId));
    return playerCache.get(playerId);
  }

  try {
    const userRef = doc(db, 'users', playerId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('No user document found for:', playerId);
      const defaultData = {
        id: playerId,
        displayName: playerId === currentUserId ? 'You' : 'Unknown Player',
        email: null,
        color: playerId === currentUserId ? 'primary' : 'default',
        initials: '?',
      };
      playerCache.set(playerId, defaultData);
      return defaultData;
    }

    const userData = userDoc.data();
    console.log('Raw user data from Firestore:', userData);
    // Determine display name
    let displayName = '';
    if (userData.firstName && userData.lastName) {
      displayName = `${userData.firstName} ${userData.lastName}`;
    } else if (userData.displayName) {
      displayName = userData.displayName;
    } else if (userData.email) {
      displayName = userData.email.split('@')[0];
    }

    // Generate initials
    let initials = '';
    if (userData.firstName && userData.lastName) {
      initials = `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase();
    } else if (displayName) {
      const nameParts = displayName.split(' ').filter(part => part.length > 0);
      if (nameParts.length >= 2) {
        initials = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      } else {
        initials = displayName.substring(0, 2).toUpperCase();
      }
    }

    // Special case for current user
    if (playerId === currentUserId) {
      displayName = 'You';
    }

    const playerData = {
      id: playerId,
      ...userData,
      displayName: displayName || 'Unknown Player',
      color: playerId === currentUserId ? 'primary' : 
             userData.role === 'admin' ? 'secondary' : 'default',
      initials: initials || '?',
    };

    console.log('Final player data:', playerData);

    // Cache the result
    playerCache.set(playerId, playerData);
    return playerData;
  } catch (error) {
    console.error(`Error fetching player data for ${playerId}:`, error);
    const fallbackData = {
      id: playerId,
      displayName: playerId === currentUserId ? 'You' : 'Unknown Player',
      email: null,
      color: playerId === currentUserId ? 'primary' : 'default',
      initials: '?',
    };
    playerCache.set(playerId, fallbackData);
    return fallbackData;
  }
};

export const getPlayersData = async (playerIds, currentUserId = null) => {
  console.log('Getting data for players:', playerIds);
  const uniqueIds = [...new Set(playerIds)];
  const playerDataPromises = uniqueIds.map(id => getPlayerData(id, currentUserId));
  const playersData = await Promise.all(playerDataPromises);
  const result = Object.fromEntries(playersData.map(data => [data.id, data]));
  console.log('Final players data:', result);
  return result;
};
