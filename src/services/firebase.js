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
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { sendNotification } from './fcm';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const messaging = getMessaging(app);

console.log('Firebase initialized with messaging');

// Initialize messaging
let currentToken = '';

// Request notification permission and get the token
export const requestNotificationPermission = async () => {
  console.log('Requesting notification permission...');
  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    
    if (permission === 'granted') {
      // Register service worker for production
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });
          console.log('Service Worker registered:', registration);

          // Get the messaging token
          const token = await getToken(messaging, {
            vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration
          });
          console.log('FCM Token:', token);

          // Store the token in Firestore
          if (token && auth.currentUser) {
            const tokenRef = doc(db, 'fcmTokens', auth.currentUser.uid);
            await setDoc(tokenRef, {
              token,
              userId: auth.currentUser.uid,
              lastUpdated: serverTimestamp()
            });
            console.log('Token stored in Firestore');
          }

          return token;
        } catch (error) {
          console.error('Error registering service worker:', error);
          throw error;
        }
      } else {
        console.warn('Service workers are not supported');
        return null;
      }
    } else {
      console.warn('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    throw error;
  }
};

// Function to handle foreground messages
export function setupForegroundMessaging() {
  console.log('Setting up foreground messaging...');
  try {
    if (!messaging) {
      console.error('Messaging is not initialized!');
      return;
    }

    onMessage(messaging, (payload) => {
      console.log('Received foreground message:', payload);
      if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/logo192.png',
            badge: '/logo192.png',
            tag: 'game-notification',
            data: payload.data || {
              url: 'https://eppspadelbot.vercel.app/games'
            },
            actions: [
              {
                action: 'open',
                title: 'View Game'
              }
            ],
            requireInteraction: true
          });
        });
      }
    });

    // Add click handler for notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Received message from service worker:', event.data);
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          window.location.href = event.data.url || 'https://eppspadelbot.vercel.app/games';
        }
      });
    }
  } catch (error) {
    console.error('Error setting up messaging:', error);
  }
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

// Function to get user's FCM token
export const getUserFCMToken = async (userId) => {
  try {
    const tokenDoc = await getDoc(doc(db, 'fcmTokens', userId));
    return tokenDoc.exists() ? tokenDoc.data().token : null;
  } catch (error) {
    console.error('Error getting user FCM token:', error);
    return null;
  }
};

// Function to send notification to a specific user
export const sendNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    // Get the user's FCM token
    const fcmToken = await getUserFCMToken(userId);
    if (!fcmToken) {
      console.warn('No FCM token found for user:', userId);
      return;
    }

    // Store notification in Firestore
    const notificationRef = await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      body,
      data,
      timestamp: serverTimestamp(),
      read: false
    });

    console.log('Notification stored in Firestore:', notificationRef.id);
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

// Function to get user's notifications
export const getUserNotifications = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

// Function to mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Function to send notification to all users
export const sendNotificationToAllUsers = async (title, body, excludeUserId = null) => {
  console.log('Sending notifications to all users:', { title, body, excludeUserId });
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log('Found users:', usersSnapshot.size);
    
    const batch = writeBatch(db);
    const notifications = [];
    const currentUser = auth.currentUser;

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (doc.id !== excludeUserId) {
        console.log('Creating notification for user:', doc.id);
        const notificationRef = doc(collection(db, 'notifications'));
        const notification = {
          userId: doc.id,
          title,
          body,
          timestamp: serverTimestamp(),
          read: false
        };
        notifications.push({ ref: notificationRef, data: notification });
        batch.set(notificationRef, notification);
      } else {
        console.log('Skipping user:', doc.id, 'Excluded user');
      }
    });

    if (notifications.length > 0) {
      await batch.commit();
      console.log('Successfully stored notifications for', notifications.length, 'users');
    } else {
      console.warn('No notifications to send - no users found');
    }

    // Display notifications for users in foreground
    if (Notification.permission === 'granted' && auth.currentUser?.uid !== excludeUserId) {
      new Notification(title, {
        body,
        icon: '/logo192.png',
        tag: 'game-notification',
        data: {
          url: window.location.origin + '/games'
        }
      });
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
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
