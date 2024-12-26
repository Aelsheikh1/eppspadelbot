import { db, auth } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const makeUserAdmin = async () => {
  try {
    if (!auth.currentUser) {
      console.error('No user logged in');
      return;
    }

    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, {
      email: auth.currentUser.email,
      role: 'admin',
      name: auth.currentUser.displayName || auth.currentUser.email.split('@')[0]
    }, { merge: true });

    console.log('Successfully made user admin:', auth.currentUser.email);
    return true;
  } catch (error) {
    console.error('Error making user admin:', error);
    return false;
  }
};
