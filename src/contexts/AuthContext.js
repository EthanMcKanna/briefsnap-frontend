import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, userCollection, calendarTokensCollection } from '../firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPreferences, setUserPreferences] = useState({
    emailNotifications: true,
    theme: 'system',
    articleLanguage: 'en'
  });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isCalendarAuthorizing, setIsCalendarAuthorizing] = useState(false);
  const [calendarToken, setCalendarToken] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, userCollection, user.uid));
          console.log('User preferences loaded:', userDoc.exists() ? 'Found' : 'Not found');
          
          if (userDoc.exists()) {
            const prefs = userDoc.data().preferences || {};
            setUserPreferences(prefs);
            console.log('Calendar integration setting:', prefs.calendarIntegration);
            
            const tokenDoc = await getDoc(doc(db, calendarTokensCollection, user.uid));
            console.log('Calendar token status:', tokenDoc.exists() ? 'Found' : 'Not found');
            if (tokenDoc.exists()) {
              const token = tokenDoc.data().token;
              console.log('Setting calendar token');
              setCalendarToken(token);
            }
          } else {
            // Create new user profile
            await setDoc(doc(db, userCollection, user.uid), {
              email: user.email,
              name: user.displayName,
              photoURL: user.photoURL,
              preferences: userPreferences,
              createdAt: new Date()
            });
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
        }
      } else {
        setCalendarToken(null);
      }
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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

  const authorizeCalendar = async () => {
    console.log('Attempting calendar authorization');
    if (isCalendarAuthorizing) {
      console.log('Calendar authorization already in progress');
      return null;
    }
    
    try {
      setIsCalendarAuthorizing(true);
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        await setDoc(doc(db, calendarTokensCollection, user.uid), {
          token: credential.accessToken,
          timestamp: new Date()
        });
        setCalendarToken(credential.accessToken);
        return credential.accessToken;
      }
      return null;
    } catch (error) {
      console.error('Calendar authorization error:', error);
      throw error;
    } finally {
      setIsCalendarAuthorizing(false);
    }
  };

  const fetchCalendarEvents = async () => {
    console.log('Attempting to fetch calendar events');
    console.log('Current state:', {
      userExists: !!user,
      calendarIntegration: userPreferences?.calendarIntegration,
      hasToken: !!calendarToken
    });

    if (!user || !userPreferences?.calendarIntegration) {
      console.log('Skipping calendar fetch - user or integration not ready');
      return;
    }
    
    try {
      let accessToken = calendarToken;
      console.log('Using stored token:', !!accessToken);
      
      if (!accessToken) {
        console.log('No token found, requesting authorization');
        accessToken = await authorizeCalendar();
        if (!accessToken) {
          console.log('Failed to get new token');
          return;
        }
      }

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      console.log('Calendar API response status:', response.status);

      if (response.status === 401) {
        console.log('Token expired, attempting reauthorization');
        await deleteDoc(doc(db, calendarTokensCollection, user.uid));
        setCalendarToken(null);
        accessToken = await authorizeCalendar();
        if (!accessToken) {
          console.log('Reauthorization failed, disabling calendar integration');
          await updatePreferences({ calendarIntegration: false });
          return;
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${today.toISOString()}&timeMax=${tomorrow.toISOString()}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!calendarResponse.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      const data = await calendarResponse.json();
      const events = data.items?.filter(event => event.status !== 'cancelled') || [];
      setCalendarEvents(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      if (error.code === 'auth/popup-blocked') {
        await updatePreferences({ calendarIntegration: false });
      }
      setCalendarEvents([]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    if (userPreferences?.calendarIntegration && !isCalendarAuthorizing) {
      console.log('Calendar integration enabled, attempting fetch');
      fetchCalendarEvents().catch(error => {
        if (isMounted) {
          console.error('Failed to fetch calendar events:', error);
        }
      });
    } else {
      console.log('Calendar fetch skipped:', {
        integrationEnabled: userPreferences?.calendarIntegration,
        isAuthorizing: isCalendarAuthorizing
      });
    }

    return () => {
      isMounted = false;
    };
  }, [userPreferences?.calendarIntegration, calendarToken]);

  const login = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      
      if (userPreferences?.calendarIntegration) {
        provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      }
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (userPreferences?.calendarIntegration && credential?.accessToken) {
        await fetchCalendarEvents();
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
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
      updatePreferences,
      calendarEvents,
      fetchCalendarEvents,
      calendarToken,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);