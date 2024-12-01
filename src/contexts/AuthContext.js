import React, { createContext, useState, useContext, useEffect } from 'react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { auth } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, userCollection, calendarTokensCollection } from '../firebase';
import { useTheme } from './ThemeContext';
import { useCache } from './CacheContext';

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
  const [userCalendars, setUserCalendars] = useState([]);
  const [calendarVisibility, setCalendarVisibility] = useState({});
  const { setTheme } = useTheme();
  const cache = useCache();

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
            if (prefs.theme) {
              setTheme(prefs.theme);
            }
            console.log('Calendar integration setting:', prefs.calendarIntegration);
            
            const tokenDoc = await getDoc(doc(db, calendarTokensCollection, user.uid));
            console.log('Calendar token status:', tokenDoc.exists() ? 'Found' : 'Not found');
            if (tokenDoc.exists()) {
              const token = tokenDoc.data().token;
              console.log('Setting calendar token');
              setCalendarToken(token);
            }
            setCalendarVisibility(userDoc.data().calendarVisibility || {});
          } else {
            // Create new user profile
            await setDoc(doc(db, userCollection, user.uid), {
              email: user.email,
              name: user.displayName,
              photoURL: user.photoURL,
              preferences: { ...userPreferences, onboardingCompleted: false },
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
    if (!user) {
      console.error('Cannot update preferences: No user logged in');
      return;
    }
    
    console.log('Updating preferences:', {
      current: userPreferences,
      new: newPreferences,
      merged: { ...userPreferences, ...newPreferences }
    });
    
    try {
      const userDocRef = doc(db, userCollection, user.uid);
      await setDoc(userDocRef, {
        preferences: { ...userPreferences, ...newPreferences }
      }, { merge: true });
      
      console.log('Preferences updated in Firestore successfully');
      setUserPreferences(prev => {
        const updated = { ...prev, ...newPreferences };
        console.log('New preferences state:', updated);
        return updated;
      });
    } catch (error) {
      console.error('Error updating preferences:', error, {
        userId: user.uid,
        preferences: newPreferences
      });
      throw error;
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

  const fetchUserCalendars = async (accessToken) => {
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.status === 401) {
        await deleteDoc(doc(db, calendarTokensCollection, user.uid));
        setCalendarToken(null);
        const newToken = await authorizeCalendar();
        if (newToken) {
          return fetchUserCalendars(newToken);
        }
        throw new Error('Failed to refresh calendar authorization');
      }

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      setUserCalendars(data.items || []);
      return data.items;
    } catch (error) {
      console.error('Error fetching calendars:', error);
      if (error.message.includes('Failed to refresh')) {
        await updatePreferences({ calendarIntegration: false });
      }
      return [];
    }
  };

  const fetchCalendarEvents = async () => {
    console.log('Attempting to fetch calendar events');
    
    if (cache?.getCachedCalendarEvents) {
      const cachedEvents = cache.getCachedCalendarEvents();
      if (cachedEvents) {
        setCalendarEvents(cachedEvents);
        return;
      }
    }

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
          throw new Error('Failed to get calendar authorization');
        }
      }

      const calendars = await fetchUserCalendars(accessToken);
      if (!calendars.length) {
        throw new Error('No calendars available');
      }

      const today = startOfWeek(new Date());
      today.setHours(0, 0, 0, 0);
      const endDate = endOfWeek(today);

      // Fetch events from all calendars
      const eventsPromises = calendars.map(async (calendar) => {
        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?timeMin=${today.toISOString()}&timeMax=${endDate.toISOString()}&singleEvents=true&orderBy=startTime`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!calendarResponse.ok) {
          throw new Error(`Failed to fetch events for calendar ${calendar.id}`);
        }

        const data = await calendarResponse.json();
        return data.items?.map(event => ({
          ...event,
          calendarId: calendar.id,
          calendarSummary: calendar.summary,
          backgroundColor: calendar.backgroundColor,
          foregroundColor: calendar.foregroundColor
        })) || [];
      });

      const allEvents = await Promise.all(eventsPromises);
      const mergedEvents = allEvents.flat().filter(event => event.status !== 'cancelled');
      setCalendarEvents(mergedEvents);
      
      // Cache the events if caching is available
      if (cache?.cacheCalendarEvents) {
        cache.cacheCalendarEvents(mergedEvents);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      if (error.message.includes('authorization') || error.code === 'auth/popup-blocked') {
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

  const loginWithGoogle = async () => {
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

  const loginWithEmail = async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Email login error:', error);
      throw error;
    }
  };

  const registerWithEmail = async (email, password, displayName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Use the imported updateProfile function instead of the method
      await updateProfile(result.user, { 
        displayName,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`
      });
      
      // Create user profile in Firestore
      await setDoc(doc(db, userCollection, result.user.uid), {
        email: result.user.email,
        name: displayName,
        photoURL: result.user.photoURL,
        preferences: userPreferences,
        createdAt: new Date(),
        lastLogin: new Date()
      });
      
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const logout = () => signOut(auth);

  const updateCalendarVisibility = async (calendarId, isVisible) => {
    if (!user) return;
    
    try {
      const newVisibility = { ...calendarVisibility, [calendarId]: isVisible };
      await setDoc(doc(db, userCollection, user.uid), {
        calendarVisibility: newVisibility
      }, { merge: true });
      setCalendarVisibility(newVisibility);
    } catch (error) {
      console.error('Error updating calendar visibility:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      resetPassword,
      logout, 
      loading,
      userPreferences,
      updatePreferences,
      calendarEvents,
      fetchCalendarEvents,
      calendarToken,
      userCalendars,
      calendarVisibility,
      updateCalendarVisibility,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);