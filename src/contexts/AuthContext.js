import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, userCollection } from '../firebase';

const AuthContext = createContext();

const defaultPreferences = {
  emailNotifications: true,
  theme: 'system',
  articleLanguage: 'en'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPreferences, setUserPreferences] = useState(defaultPreferences);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Load user profile and preferences
        const userDoc = await getDoc(doc(db, userCollection, user.uid));
        if (userDoc.exists()) {
          setUserPreferences(userDoc.data().preferences || defaultPreferences);
        } else {
          // Create new user profile
          await setDoc(doc(db, userCollection, user.uid), {
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
            preferences: defaultPreferences,
            createdAt: new Date()
          });
        }
      }
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []); // Removed userPreferences from dependencies

  const updatePreferences = async (newPreferences) => {
    if (!user) return;
    
    try {
      await setDoc(doc(db, userCollection, user.uid), {
        preferences: { ...userPreferences, ...newPreferences }
      }, { merge: true });
      setUserPreferences(prev => ({ ...prev, ...newPreferences }));
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading,
      userPreferences,
      updatePreferences 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);