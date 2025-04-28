import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db, signIn, signInWithGoogle, signOut } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (user && mounted) {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && mounted) {
            setCurrentUser({
              ...user,
              ...userDoc.data()
            });
            setIsAdmin(userDoc.data().role === 'admin');
          } else if (mounted) {
            setCurrentUser(user);
            setIsAdmin(false);
          }
        } else if (mounted) {
          setCurrentUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        if (mounted) {
          setError(error.message);
          setCurrentUser(null);
          setIsAdmin(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      return await signIn(email, password);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut();
      setCurrentUser(null);
      setIsAdmin(false);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const getUserRole = async (uid) => {
    try {
      setError(null);
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data().role;
      }
      return 'user'; // default role
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const refreshCurrentUser = async () => {
    if (!auth.currentUser) return;
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (userDoc.exists()) {
      setCurrentUser({
        ...auth.currentUser,
        ...userDoc.data()
      });
      setIsAdmin(userDoc.data().role === 'admin');
    }
  };

  const value = {
    currentUser,
    isAdmin,
    loading,
    error,
    login,
    logout,
    loginWithGoogle: signInWithGoogle,
    getUserRole,
    refreshCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
