import { doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

/**
 * Store a mobile FCM token in Firebase
 * This function handles storing tokens from mobile devices
 * @param {string} token - The FCM token from the mobile device
 * @returns {Promise<boolean>} - Success status
 */
export const storeMobileToken = async (token) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('[Mobile FCM] No authenticated user for token storage');
      return false;
    }

    console.log('[Mobile FCM] Storing mobile token for user:', currentUser.uid);
    
    // 1. Store in user document
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    // Check if token already exists to avoid duplicates
    const existingTokens = userDoc.exists() && userDoc.data().fcmTokens ? userDoc.data().fcmTokens : [];
    if (existingTokens.includes(token)) {
      console.log('[Mobile FCM] Token already exists for user:', currentUser.uid);
      // Just update the timestamp
      await updateDoc(userRef, {
        lastTokenUpdate: new Date().toISOString()
      });
    } else {
      // Add the new token
      console.log('[Mobile FCM] Adding new mobile token to user document');
      // Prepare user data with token and notification preferences
      const userData = {
        fcmTokens: arrayUnion(token),
        lastTokenUpdate: new Date().toISOString(),
        hasMobileToken: true
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
      console.log('[Mobile FCM] Token added to user document for:', currentUser.uid);
    }
    
    // 2. Also store in fcmTokens collection for easier querying
    try {
      const tokenRef = doc(db, 'fcmTokens', `mobile_${token.substring(0, 30)}`);
      const userRole = userDoc.exists() ? userDoc.data().isAdmin === true ? 'admin' : 'user' : 'user';
      await setDoc(tokenRef, {
        userId: currentUser.uid,
        email: currentUser.email,
        isAdmin: userDoc.exists() ? userDoc.data().isAdmin === true : false,
        userRole,
        token: token,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        platform: 'mobile',
        deviceInfo: {
          platform: 'mobile',
          timestamp: new Date().toISOString()
        }
      });
      console.log('[Mobile FCM] Token also stored in fcmTokens collection');
    } catch (tokenError) {
      // Non-critical error, just log it
      console.warn('[Mobile FCM] Error storing token in fcmTokens collection:', tokenError);
    }

    console.log('[Mobile FCM] Token successfully registered for:', currentUser.uid);
    return true;
  } catch (error) {
    console.error('[Mobile FCM] Error storing mobile token:', error);
    return false;
  }
};

/**
 * Remove a mobile FCM token from Firebase
 * @param {string} token - The FCM token to remove
 * @returns {Promise<boolean>} - Success status
 */
export const removeMobileToken = async (token) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('[Mobile FCM] No authenticated user for token removal');
      return false;
    }

    // We can't directly remove from an array with Firestore, so we need to:
    // 1. Get the current tokens
    // 2. Filter out the one we want to remove
    // 3. Set the new array
    
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.warn('[Mobile FCM] User document not found for token removal');
      return false;
    }
    
    const userData = userDoc.data();
    const currentTokens = userData.fcmTokens || [];
    const updatedTokens = currentTokens.filter(t => t !== token);
    
    // Update the user document with the filtered tokens
    await updateDoc(userRef, {
      fcmTokens: updatedTokens,
      lastTokenUpdate: new Date().toISOString()
    });
    
    // Also try to remove from the fcmTokens collection
    try {
      const tokenRef = doc(db, 'fcmTokens', `mobile_${token.substring(0, 30)}`);
      await updateDoc(tokenRef, {
        active: false,
        lastActive: new Date().toISOString()
      });
    } catch (error) {
      console.warn('[Mobile FCM] Error updating token in fcmTokens collection:', error);
    }
    
    console.log('[Mobile FCM] Token successfully removed for user:', currentUser.uid);
    return true;
  } catch (error) {
    console.error('[Mobile FCM] Error removing mobile token:', error);
    return false;
  }
};
