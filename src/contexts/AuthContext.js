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
  const [userCalendars, setUserCalendars] = useState([]);
  const [calendarVisibility, setCalendarVisibility] = useState({});

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
            setCalendarVisibility(userDoc.data().calendarVisibility || {});
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

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch events from all calendars
      const eventsPromises = calendars.map(async (calendar) => {
        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?timeMin=${today.toISOString()}&timeMax=${tomorrow.toISOString()}&singleEvents=true&orderBy=startTime`,
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
      login, 
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