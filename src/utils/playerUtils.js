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
  console.group(`🔍 Fetching Player Data: ${playerId}`);
  console.log('Current User ID:', currentUserId);
  
  // Setup real-time listener for this user
  setupUserListener(playerId);
  
  // Check cache first
  if (playerCache.has(playerId)) {
    console.log('🟢 Cache Hit:', playerCache.get(playerId));
    console.groupEnd();
    return playerCache.get(playerId);
  }

  try {
    const userRef = doc(db, 'users', playerId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.warn(`⚠️ No user document found for: ${playerId}`);
      const defaultData = {
        id: playerId,
        displayName: playerId === currentUserId ? 'You' : 'Unknown Player',
        email: null,
        photoURL: null,
        color: playerId === currentUserId ? 'primary' : 'default',
        initials: '?',
      };
      playerCache.set(playerId, defaultData);
      console.log('🔴 Returning Default Data:', defaultData);
      console.groupEnd();
      return defaultData;
    }

    const userData = userDoc.data();
    console.log('📦 Raw Firestore User Data:', userData);

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

    // Validate and normalize photoURL
    const rawPhotoURL = userData.photoURL;
    const isValidPhotoURL = rawPhotoURL && typeof rawPhotoURL === 'string' && (
      rawPhotoURL.startsWith('http://') || 
      rawPhotoURL.startsWith('https://') || 
      rawPhotoURL.startsWith('data:image') ||
      rawPhotoURL.startsWith('blob:')
    );

    const playerData = {
      id: playerId,
      ...userData,
      displayName: displayName || 'Unknown Player',
      color: playerId === currentUserId ? 'primary' : 
             userData.role === 'admin' ? 'secondary' : 'default',
      initials: initials || '?',
      // Ensure photoURL is always included, even if null
      photoURL: isValidPhotoURL ? rawPhotoURL : null,
    };

    console.log('✅ Final Player Data:', {
      ...playerData,
      photoURLDetails: isValidPhotoURL ? {
        original: rawPhotoURL,
        protocol: rawPhotoURL.split('://')[0],
        domain: rawPhotoURL.split('://')[1]?.split('/')[0],
        length: rawPhotoURL.length
      } : null
    });

    // Validate photoURL
    if (isValidPhotoURL) {
      console.log('🖼️ Valid Avatar URL:', rawPhotoURL);
    } else {
      console.warn('⚠️ Invalid or Missing Avatar URL:', {
        rawPhotoURL,
        type: typeof rawPhotoURL,
        isNull: rawPhotoURL === null,
        isUndefined: rawPhotoURL === undefined
      });
    }

    // Cache the result
    playerCache.set(playerId, playerData);
    console.groupEnd();
    return playerData;
  } catch (error) {
    console.error(`🔴 Error fetching player data for ${playerId}:`, error);
    const fallbackData = {
      id: playerId,
      displayName: playerId === currentUserId ? 'You' : 'Unknown Player',
      email: null,
      photoURL: null,
      color: playerId === currentUserId ? 'primary' : 'default',
      initials: '?',
    };
    playerCache.set(playerId, fallbackData);
    console.log('🚨 Returning Fallback Data:', fallbackData);
    console.groupEnd();
    return fallbackData;
  }
};

export const getPlayersData = async (playerIds, currentUserId = null) => {
  console.group('🔍 Fetching Players Data');
  console.log('Input Player IDs:', playerIds);
  console.log('Current User ID:', currentUserId);

  // Validate input
  if (!playerIds || playerIds.length === 0) {
    console.warn('⚠️ No player IDs provided');
    console.groupEnd();
    return {};
  }

  const uniqueIds = [...new Set(playerIds)];
  console.log('Unique Player IDs:', uniqueIds);

  try {
    const playerDataPromises = uniqueIds.map(id => {
      console.log(`🔎 Fetching data for player: ${id}`);
      return getPlayerData(id, currentUserId);
    });

    const playersData = await Promise.all(playerDataPromises);

    // Log each player's data
    playersData.forEach((playerData, index) => {
      console.log(`💫 Player ${index + 1} Data:`, {
        id: playerData.id,
        displayName: playerData.displayName,
        photoURL: playerData.photoURL ? 'Available' : 'Not Available'
      });
    });

    const result = Object.fromEntries(playersData.map(data => [data.id, data]));

    console.log('✅ Final Players Data:', Object.keys(result));
    console.groupEnd();

    return result;
  } catch (error) {
    console.error('🔴 Error in getPlayersData:', error);
    console.groupEnd();
    return {};
  }
};
