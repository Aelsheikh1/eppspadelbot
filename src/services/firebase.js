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

const firebaseConfig = {
  apiKey: "AIzaSyAyZAakNVP3eOnIeJ1qB1Ki-6qRgZ4VBg8",
  authDomain: "padelbolt-5d9a2.firebaseapp.com",
  projectId: "padelbolt-5d9a2",
  storageBucket: "padelbolt-5d9a2.appspot.com",
  messagingSenderId: "773090904452",
  appId: "1:773090904452:web:e33380da424fe8d69e75d1",
  measurementId: "G-1PRKH5C8NV"
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
            vapidKey: 'BIq74BpG72bX8YlHuDMfYpDtrcd2Q-Wg5U_5-aPV1dVTN4zBMwN_gZdwY0D3EzUYXWz7ONiRaPW-_jVzYpHppTo',
            serviceWorkerRegistration: registration
          });
          console.log('FCM Token:', token);

          // Store the token in Firestore
          if (token && auth.currentUser) {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
              fcmToken: token,
              lastTokenUpdate: serverTimestamp()
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
      if (Notification.permission === 'granted') {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/logo192.png',
          tag: 'game-notification',
          data: {
            url: 'https://eppspadelbot.vercel.app/games'
          }
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

// Notification Functions
async function sendNotificationToUser(userId, title, body) {
  console.log('Sending notification to user:', userId);
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    console.log('User data:', userData);
    
    if (userData?.fcmToken) {
      console.log('Found FCM token:', userData.fcmToken);
      // Store notification in Firestore
      const notificationRef = await addDoc(collection(db, 'notifications'), {
        token: userData.fcmToken,
        title,
        body,
        userId,
        createdAt: serverTimestamp(),
        read: false,
        type: 'game',
        link: '/games'
      });
      console.log('Notification stored with ID:', notificationRef.id);

      // Display notification if user is in foreground
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/logo192.png',
          tag: 'game-notification',
          data: {
            url: window.location.origin + '/games'
          }
        });
      }
    } else {
      console.warn('No FCM token found for user:', userId);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

async function sendNotificationToAllUsers(title, body, excludeUserId = null) {
  console.log('Sending notifications to all users:', { title, body, excludeUserId });
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log('Found users:', usersSnapshot.size);
    
    const batch = writeBatch(db);
    const notifications = [];

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (doc.id !== excludeUserId && userData.fcmToken) {
        console.log('Creating notification for user:', doc.id);
        const notificationRef = doc(collection(db, 'notifications'));
        const notification = {
          token: userData.fcmToken,
          title,
          body,
          userId: doc.id,
          createdAt: serverTimestamp(),
          read: false,
          type: 'game',
          link: '/games'
        };
        notifications.push({ ref: notificationRef, data: notification });
        batch.set(notificationRef, notification);
      } else {
        console.log('Skipping user:', doc.id, 'No token or excluded user');
      }
    });

    if (notifications.length > 0) {
      await batch.commit();
      console.log('Successfully stored notifications for', notifications.length, 'users');
    } else {
      console.warn('No notifications to send - no users with FCM tokens found');
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
}

export async function getUserNotifications(userId) {
  try {
    const notificationsSnapshot = await getDocs(
      query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
    );
    return notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

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
  console.log('Creating game with data:', gameData);
  try {
    // Add the game to Firestore
    const gameRef = await addDoc(collection(db, 'games'), {
      ...gameData,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.uid,
      players: [auth.currentUser.uid],
      status: 'open'
    });
    console.log('Game created with ID:', gameRef.id);

    // Format the notification message
    const title = 'New Game Created!';
    const body = `${gameData.date} at ${gameData.time}\nLocation: ${gameData.location}\nPlayers: ${gameData.maxPlayers}\nLevel: ${gameData.level}\nPrice: ${gameData.price}`;

    // Send notifications to all users except the creator
    console.log('Sending notifications for new game');
    await sendNotificationToAllUsers(title, body, auth.currentUser.uid);

    return gameRef;
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
};
