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
import { getMessaging, getToken } from 'firebase/messaging';

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
      createdAt: new Date().toISOString()
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
      lastLogin: new Date().toISOString()
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
        lastLogin: new Date().toISOString()
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
        createdAt: new Date().toISOString()
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

// FCM: Request permission and get token
export const requestFcmToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey: 'BLF0nO_s9jj43GrZg9SgOnCtDYodczIJ8sL5Mx1vNl05RlToKnjrcQSVPip_lFc3CYipnzIjx0Q0r3FRw6vCa_s' });
      console.log('FCM Token:', token);
      return token;
    } else {
      console.warn('Notification permission not granted');
      return null;
    }
  } catch (err) {
    console.error('Error getting FCM token:', err);
    return null;
  }
};


