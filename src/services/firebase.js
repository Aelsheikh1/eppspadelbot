import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  serverTimestamp,
  runTransaction,
  query,
  where,
  orderBy,
  addDoc
} from 'firebase/firestore';

// Detect if we're on a mobile device
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Function to check if messaging is supported
const isMessagingSupported = () => {
  return (
    typeof window !== 'undefined' && 
    'serviceWorker' in navigator && 
    typeof getMessaging === 'function' &&
    typeof getToken === 'function'
  );
};

// Check if messaging is supported before importing
let getMessaging, getToken, onMessage, sendMulticast;

// Only try to import messaging if not on a mobile device
if (!isMobileDevice && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const firebaseMessaging = require('firebase/messaging');
    getMessaging = firebaseMessaging.getMessaging;
    getToken = firebaseMessaging.getToken;
    onMessage = firebaseMessaging.onMessage;
    sendMulticast = firebaseMessaging.sendMulticast;
  } catch (error) {
    console.warn('Firebase messaging not supported in this browser:', error);
  }
}

const firebaseConfig = {
  apiKey: "AIzaSyAyZAakNVP3eOnIeJ1qB1Ki-6qRgZ4VBg8",
  authDomain: "padelbolt-5d9a2.firebaseapp.com",
  projectId: "padelbolt-5d9a2",
  storageBucket: "padelbolt-5d9a2.firebasestorage.app",
  messagingSenderId: "773090904452",
  appId: "1:773090904452:web:e33380da424fe8d69e75d1",
  measurementId: "G-1PRKH5C8NV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Only initialize messaging if it's supported
export let messaging = null;
export let messagingSupported = false;

// Skip messaging initialization on mobile devices
if (!isMobileDevice) {
  try {
    // Only try to initialize if the functions are available
    if (typeof getMessaging === 'function' && app) {
      messaging = getMessaging(app);
      messagingSupported = true;
      console.log('🔔 Firebase messaging initialized successfully');
    } else {
      console.log('📱 Firebase messaging not available - skipping initialization');
    }
  } catch (error) {
    console.log('📱 Firebase messaging initialization error:', error.message);
    messagingSupported = false;
  }
} else {
  console.log('📱 Firebase messaging not initialized on mobile device');
}

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// User Management Functions
export const createUser = async (userData) => {
  try {
    const { email, name, role } = userData;
    // Create a new document with auto-generated ID
    const userRef = doc(collection(db, 'users'));
    await setDoc(userRef, {
      email,
      name: name || 'User',
      role: role || 'user',
      createdAt: new Date().toISOString(),
      notificationSettings: {
        gameCreated: true,
        gameClosingSoon: true,
        gameClosed: true,
        tournamentUpdates: true
      }
    });
    return userRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const userRef = doc(db, 'users', user.uid);
    
    try {
      const userDoc = await getDoc(userRef);
      const names = user.displayName ? user.displayName.split(' ') : [];
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        photoURL: user.photoURL,
        lastLogin: new Date().toISOString()
      };

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          ...userData,
          role: 'user',
          createdAt: new Date().toISOString(),
          notificationSettings: {
            gameCreated: true,
            gameClosingSoon: true,
            gameClosed: true,
            tournamentUpdates: true
          }
        });
      } else {
        await updateDoc(userRef, userData);
      }
    } catch (firestoreError) {
      console.error('Firestore error:', firestoreError);
    }

    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const createUserWithEmail = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore
    const userRef = doc(db, 'users', user.uid);
    const username = email.split('@')[0];
    const displayName = username.charAt(0).toUpperCase() + username.slice(1);
    
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      firstName: '',
      lastName: '',
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      notificationSettings: {
        gameCreated: true,
        gameClosingSoon: true,
        gameClosed: true,
        tournamentUpdates: true
      }
    });

    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update user document in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const username = email.split('@')[0];
      const displayName = username.charAt(0).toUpperCase() + username.slice(1);
      
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        firstName: '',
        lastName: '',
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        notificationSettings: {
          gameCreated: true,
          gameClosingSoon: true,
          gameClosed: true,
          tournamentUpdates: true
        }
      });
    } else {
      await updateDoc(userRef, {
        lastLogin: new Date().toISOString()
      });
    }

    return user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user document from Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Create user document if it doesn't exist
      const displayName = email.split('@')[0];
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        firstName: '',
        lastName: '',
        role: 'user',
        createdAt: new Date().toISOString(),
        notificationSettings: {
          gameCreated: true,
          gameClosingSoon: true,
          gameClosed: true,
          tournamentUpdates: true
        }
      });
    }

    return userCredential;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    // Clear any local state if needed
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Game Functions
export const joinGame = async (gameId, userId) => {
  if (!gameId || !userId) {
    throw new Error('Invalid game or user ID');
  }

  try {
    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      throw new Error('Game not found');
    }

    const gameData = gameDoc.data();
    const currentPlayers = gameData.players || [];

    // Check if game is full
    if (currentPlayers.length >= gameData.maxPlayers) {
      throw new Error('Game is full');
    }

    // Check if game is closed
    if (gameData.status === 'closed' || !gameData.isOpen) {
      throw new Error('Game is closed');
    }

    // Check if player is already in the game
    if (currentPlayers.includes(userId)) {
      throw new Error('Looks like you\'re already signed up for this game! 🎾');
    }

    // Update game document with arrayUnion to prevent duplicates and ensure atomic update
    await updateDoc(gameRef, {
      players: arrayUnion(userId)
    });

    // Verify the update was successful
    const updatedDoc = await getDoc(gameRef);
    const updatedPlayers = updatedDoc.data().players || [];
    
    if (!updatedPlayers.includes(userId)) {
      throw new Error('Failed to join game. Please try again.');
    }

    return true;
  } catch (error) {
    console.error('Error joining game:', error);
    throw error;
  }
};

export const leaveGame = async (gameId, userId) => {
  if (!gameId || !userId) {
    throw new Error('Invalid game or user ID');
  }

  try {
    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      throw new Error('Game not found');
    }

    const gameData = gameDoc.data();
    const currentPlayers = gameData.players || [];

    // Check if player is in the game
    if (!currentPlayers.includes(userId)) {
      throw new Error('You are not in this game');
    }

    // Update game document with arrayRemove to ensure atomic update
    await updateDoc(gameRef, {
      players: arrayRemove(userId)
    });

    // Verify the update was successful
    const updatedDoc = await getDoc(gameRef);
    const updatedPlayers = updatedDoc.data().players || [];
    
    if (updatedPlayers.includes(userId)) {
      throw new Error('Failed to leave game. Please try again.');
    }

    return true;
  } catch (error) {
    console.error('Error leaving game:', error);
    throw error;
  }
};

export const deleteGame = async (gameId) => {
  const batch = writeBatch(db);
  
  try {
    // Delete the game document
    const gameRef = doc(db, 'games', gameId);
    batch.delete(gameRef);

    // Commit the batch
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error deleting game:', error);
    throw error;
  }
};

export const updateGame = async (gameId, gameData) => {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, gameData);
};

export const getGameById = async (gameId) => {
  try {
    const gameDoc = await getDoc(doc(db, 'games', gameId));
    if (!gameDoc.exists()) {
      throw new Error('Game not found');
    }
    return { id: gameDoc.id, ...gameDoc.data() };
  } catch (error) {
    console.error('Error getting game:', error);
    throw error;
  }
};

export const getAllGames = async () => {
  try {
    const gamesSnapshot = await getDocs(collection(db, 'games'));
    return gamesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting games:', error);
    throw error;
  }
};

export const isUserAdmin = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() && userDoc.data().role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const getAllUsers = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

export const updateUserRole = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    const { role, firstName, lastName } = userData;
    
    await updateDoc(userRef, {
      role,
      firstName: firstName || '',
      lastName: lastName || '',
      lastUpdated: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    // Delete user document from Firestore
    await deleteDoc(doc(db, 'users', userId));
    
    // Remove user from all games they're part of
    const gamesSnapshot = await getDocs(collection(db, 'games'));
    const batch = writeBatch(db);
    
    gamesSnapshot.forEach((gameDoc) => {
      const gameData = gameDoc.data();
      if (gameData.players && gameData.players.some(player => player === userId)) {
        const updatedPlayers = gameData.players.filter(player => player !== userId);
        batch.update(gameDoc.ref, { players: updatedPlayers });
      }
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export const adminAddPlayer = async (gameId, playerData) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
      players: arrayUnion(playerData)
    });
    return true;
  } catch (error) {
    console.error('Error adding player:', error);
    throw error;
  }
};

export const adminRemovePlayer = async (gameId, playerId) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) {
      throw new Error('Game not found');
    }

    const gameData = gameSnap.data();
    const playerToRemove = gameData.players.find(p => p === playerId);

    if (!playerToRemove) {
      throw new Error('Player not found');
    }

    await updateDoc(gameRef, {
      players: arrayRemove(playerToRemove)
    });

    return true;
  } catch (error) {
    console.error('Error removing player:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId, profileData) => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID');
  }

  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...profileData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const getUserData = async (userId) => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID');
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

export const createGame = async (gameData) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be logged in to create a game');
    }

    // Add the game to Firestore
    const gameRef = await addDoc(collection(db, 'games'), {
      ...gameData,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      status: 'open',
      players: [currentUser.uid]
    });

    return gameRef.id;
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
};


// Function to create a new tournament
export const createTournament = async (tournamentData) => {
  try {
    // First check if the user is an admin
    const isAdmin = await isUserAdmin(auth.currentUser?.uid);
    
    if (!isAdmin) {
      throw new Error('Only admins can create tournaments');
    }
    
    // Sanitize the data to remove any undefined values
    const sanitizedData = sanitizeData(tournamentData);
    
    // Use a batch write to ensure atomicity
    const batch = writeBatch(db);
    
    // Create a new document reference
    const tournamentRef = doc(collection(db, 'tournaments'));
    
    // Add the tournament data to the batch
    batch.set(tournamentRef, {
      ...sanitizedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Add admin flag to ensure permissions
      createdByAdmin: true
    });
    
    // If this tournament is linked to a game, update the game
    if (sanitizedData.originalGameId) {
      const gameRef = doc(db, 'games', sanitizedData.originalGameId);
      batch.update(gameRef, {
        tournamentId: tournamentRef.id,
        isConvertedToTournament: true,
        updatedAt: serverTimestamp()
      });
    }
    
    // Commit the batch
    await batch.commit();
    
    return tournamentRef.id;
  } catch (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
};

// Helper function to sanitize data before sending to Firestore
// Removes undefined values and converts null to empty strings or arrays
const sanitizeData = (data) => {
  if (!data) return {};
  
  // Create a new object to avoid modifying the original
  const sanitized = {};
  
  // Process each key in the object
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    // Skip undefined values
    if (value === undefined) return;
    
    // Handle null values
    if (value === null) {
      // Convert null to appropriate default based on expected type
      if (key.includes('date') || key.includes('time')) {
        sanitized[key] = '';
      } else if (key.includes('teams') || key.includes('rounds') || key.includes('players')) {
        sanitized[key] = [];
      } else {
        sanitized[key] = '';
      }
      return;
    }
    
    // Handle nested objects (like teams, rounds, etc.)
    if (typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeData(value);
      return;
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return sanitizeData(item);
        }
        return item === undefined ? null : item;
      }).filter(item => item !== undefined);
      return;
    }
    
    // For all other values, just copy them
    sanitized[key] = value;
  });
  
  return sanitized;
};

// Function to get tournament by ID
export const getTournamentById = async (tournamentId) => {
  try {
    const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    return { id: tournamentDoc.id, ...tournamentDoc.data() };
  } catch (error) {
    console.error('Error getting tournament:', error);
    throw error;
  }
};

// Function to update tournament
export const updateTournament = async (tournamentId, tournamentData) => {
  try {
    await updateDoc(doc(db, 'tournaments', tournamentId), {
      ...tournamentData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating tournament:', error);
    throw error;
  }
};

// Function to get all tournaments
export const getAllTournaments = async () => {
  try {
    const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
    const tournaments = [];
    tournamentsSnapshot.forEach((doc) => {
      tournaments.push({ id: doc.id, ...doc.data() });
    });
    return tournaments;
  } catch (error) {
    console.error('Error getting tournaments:', error);
    throw error;
  }
};

// VAPID key for web push notifications
const VAPID_KEY = 'BMzSIFpKw-T23cx8aoIfssl2Q8oYxKZVIXY5qYkrAVOzXXOzN3eIhhyQhsuA6_mnC4go0hk9IWQ06Dwqe-eHSfE';

// Initialize service worker for push notifications
export const initializeServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // First check if service worker is already registered
      const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      
      if (existingRegistration) {
        console.log('[SW] Service Worker already registered with scope:', existingRegistration.scope);
        
        // Ensure it's active and controlling
        if (existingRegistration.active) {
          console.log('[SW] Service Worker is active');
          
          // Send Firebase config to the service worker
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'FIREBASE_CONFIG',
              config: firebaseConfig
            });
            console.log('[SW] Firebase config sent to existing Service Worker');
          }
          
          return existingRegistration;
        }
      }
      
      // Register the service worker if not already registered or not active
      console.log('[SW] Registering new Service Worker...');
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      
      console.log('[SW] Service Worker registered with scope:', registration.scope);
      
      // Wait for the service worker to be activated
      if (registration.installing) {
        console.log('[SW] Service Worker installing...');
        
        // Wait for installation to complete
        await new Promise(resolve => {
          registration.installing.addEventListener('statechange', (event) => {
            if (event.target.state === 'activated') {
              console.log('[SW] Service Worker activated');
              resolve();
            }
          });
        });
      }
      
      // Send Firebase config to the service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'FIREBASE_CONFIG',
          config: firebaseConfig
        });
        console.log('[SW] Firebase config sent to Service Worker');
      }
      
      return registration;
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
      return null;
    }
  } else {
    console.warn('[SW] Service workers are not supported in this browser');
    return null;
  }
};

// Function to unregister service worker if needed
export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const unregistered = await registration.unregister();
        if (unregistered) {
          console.log('Service Worker successfully unregistered');
          return true;
        } else {
          console.warn('Service Worker unregistration failed');
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Error unregistering Service Worker:', error);
      return false;
    }
  }
  return false;
};

// Foreground FCM message handler: show notification using Notification API
// Only set up if messaging is available
if (messaging && typeof onMessage === 'function') {
  try {
    onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      if (payload.notification && payload.notification.title) {
    // Use a simpler notification approach with dark mode styling
    const notification = new Notification(payload.notification.title, {
      body: payload.notification.body || '',
      icon: '/logo192.png',
      tag: payload.data?.gameId || 'default',
      renotify: true,
      silent: false,
      // Dark mode styling for notification
      badge: '/logo192.png'
    });

    // Handle click to navigate to game
    notification.onclick = () => {
      window.focus();
      if (payload.data?.gameId) {
        window.location.href = `/games/${payload.data.gameId}`;
      }
      notification.close();
    };
      }
    });
  } catch (error) {
    console.warn('[FCM] Error setting up onMessage handler:', error);
  }
}

// Handle token refresh
export const setupTokenRefresh = async () => {
  try {
    // Skip if messaging is not supported
    if (!messaging || !getToken) {
      console.warn('[FCM] Messaging not supported in this browser/device');
      return null;
    }
    
    if (!('serviceWorker' in navigator)) {
      console.warn('[FCM] Service workers not supported in this browser');
      return null;
    }
    
    // Set up a timer to periodically check and refresh the token
    // This is a workaround since onTokenRefresh is deprecated in newer Firebase versions
    const refreshInterval = setInterval(async () => {
      console.log('[FCM] Checking if token needs refresh...');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('[FCM] No user logged in, skipping token refresh');
        return;
      }
      
      try {
        // Ensure service worker is ready
        const swRegistration = await navigator.serviceWorker.ready;
        console.log('[FCM] Service worker ready for token refresh');
        
        // Get a fresh token
        const freshToken = await getToken(messaging, { 
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swRegistration
        });
        
        if (freshToken) {
          console.log('[FCM] Token refreshed:', freshToken.substring(0, 10) + '...');
          
          // Send to service worker
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'UPDATE_FCM_TOKEN',
              token: freshToken
            });
            console.log('[FCM] Refreshed token sent to service worker');
          } else {
            console.warn('[FCM] No service worker controller available for token update');
          }
          
          // Update in Firestore
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          
          // Check if this is actually a new token
          const existingTokens = userDoc.exists() && userDoc.data().fcmTokens ? userDoc.data().fcmTokens : [];
          if (!existingTokens.includes(freshToken)) {
            await updateDoc(userRef, {
              fcmTokens: arrayUnion(freshToken),
              lastTokenUpdate: new Date().toISOString()
            });
            console.log('[FCM] New refreshed token saved to Firestore');
          } else {
            console.log('[FCM] Token already exists in Firestore, updating timestamp');
            await updateDoc(userRef, {
              lastTokenUpdate: new Date().toISOString()
            });
          }
        } else {
          console.warn('[FCM] Failed to get fresh token during refresh check');
        }
      } catch (error) {
        console.error('[FCM] Error during token refresh check:', error);
      }
    }, 12 * 60 * 60 * 1000); // Check twice per day for more reliability
    
    // Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(refreshInterval);
    });
    
    console.log('[FCM] Token refresh monitoring set up');
  } catch (error) {
    console.error('[FCM] Error setting up token refresh:', error);
  }
};

// Robust FCM token registration that ensures tokens are properly stored in both user document and tokens collection
export const requestFcmToken = async () => {
  try {
    // Skip if messaging is not supported
    if (!messaging || !getToken) {
      console.warn('[FCM] Messaging not supported in this browser/device');
      return null;
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('[FCM] No authenticated user for token registration');
      return null;
    }

    // Request permission if not already granted
    if (Notification.permission !== 'granted') {
      console.log('[FCM] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[FCM] Notification permission denied by user');
        return null;
      }
    }

    // User is already authenticated at this point

    // Wait for service worker to be ready
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready;
      console.log('[FCM] Service worker is ready for messaging');
    }

    // Get FCM token
    console.log('[FCM] Getting token for user:', currentUser.uid);
    const messaging = getMessaging(app);
    
    // Ensure service worker is ready before getting token
    const swRegistration = await navigator.serviceWorker.ready;
    console.log('[FCM] Service worker ready for token request');
    
    const token = await getToken(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration
    });
    
    if (!token) {
      console.error('[FCM] Failed to get FCM token');
      return null;
    }

    console.log('[FCM] Token obtained:', token.substring(0, 10) + '...');
    
    // Send token to service worker if available with user information
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      // Create a unique device identifier
      const deviceId = `${currentUser.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Get user role information
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      const isAdmin = userDoc.exists() ? userDoc.data().isAdmin === true : false;
      const userRole = isAdmin ? 'admin' : 'user';
      
      // Send complete user information to service worker
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_FCM_TOKEN',
        token: token,
        userId: currentUser.uid,
        userRole: userRole,
        deviceId: deviceId
      });
      
      console.log(`[FCM] Token sent to service worker for user ${currentUser.uid} with role ${userRole}`);
      
      // Also store device ID in user document
      try {
        await updateDoc(userRef, {
          devices: arrayUnion(deviceId)
        });
      } catch (deviceError) {
        console.warn('[FCM] Error storing device ID:', deviceError);
      }
    }
    
    // Store token in user document and dedicated tokens collection for better querying
    try {
      // 1. Store in user document
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      // Check if token already exists to avoid duplicates
      const existingTokens = userDoc.exists() && userDoc.data().fcmTokens ? userDoc.data().fcmTokens : [];
      if (existingTokens.includes(token)) {
        console.log('[FCM] Token already exists for user:', currentUser.uid);
        // Just update the timestamp
        await updateDoc(userRef, {
          lastTokenUpdate: new Date().toISOString()
        });
      } else {
        // Add the new token
        console.log('[FCM] Adding new token to user document');
        // Prepare user data with token and notification preferences
        const userData = {
          fcmTokens: arrayUnion(token),
          lastTokenUpdate: new Date().toISOString()
        };
        
        // If user doc doesn't exist or doesn't have notification settings, add default settings
        if (!userDoc.exists() || !userDoc.data().notificationSettings) {
          userData.notificationSettings = {
            gameCreated: true,
            gameClosingSoon: true,
            gameClosed: true,
            tournamentUpdates: true
          };
        }

        // Update the user document
        await updateDoc(userRef, userData);
        console.log('[FCM] Token added to user document for:', currentUser.uid);
      }
      
      // 2. Also store in fcmTokens collection for easier querying
      try {
        const tokenRef = doc(db, 'fcmTokens', token.substring(0, 40));
        const userRole = userDoc.exists() ? userDoc.data().isAdmin === true ? 'admin' : 'user' : 'user';
        await setDoc(tokenRef, {
          userId: currentUser.uid,
          email: currentUser.email,
          isAdmin: userDoc.exists() ? userDoc.data().isAdmin === true : false,
          userRole,
          token: token,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          device: navigator.userAgent
        });
        console.log('[FCM] Token also stored in fcmTokens collection');
      } catch (tokenError) {
        // Non-critical error, just log it
        console.warn('[FCM] Error storing token in fcmTokens collection:', tokenError);
      }

      console.log('[FCM] Token successfully registered for:', currentUser.uid);
      return token;
    } catch (error) {
      console.error('[FCM] Error updating user document with token:', error);
      return null;
    }
  } catch (err) {
    console.error('[FCM] Error in requestFcmToken:', err);
    return null;
  }
};

// Utility to force FCM token registration for the current user
export const forceRegisterFcmToken = async () => {
  try {
    // Skip if messaging is not supported
    if (!messaging || !getToken) {
      console.warn('[FCM] Messaging not supported in this browser/device');
      return null;
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('[FCM] No authenticated user for token registration');
      return null;
    }
    if (window.Notification && Notification.permission === 'granted') {
      const messaging = getMessaging(app);
      // Ensure service worker is ready
      const swRegistration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration 
      });
      if (token) {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, { fcmTokens: arrayUnion(token) });
        console.log('[FCM] Forced token added to Firestore for user:', currentUser.uid, token);
        return token;
      } else {
        console.warn('[FCM] No token returned from getToken');
      }
    } else {
      console.warn('[FCM] Notification permission not granted or Notification API not available');
    }
    return null;
  } catch (err) {
    console.error('[FCM] Error forcing FCM token registration:', err);
    return null;
  }
};


