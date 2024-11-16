import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const BookmarkContext = createContext();

export function BookmarkProvider({ children }) {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('bookmarks');
      if (!saved) return [];
      
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        localStorage.removeItem('bookmarks');
        return [];
      }
      
      return parsed;
    } catch (error) {
      console.error('Error parsing bookmarks:', error);
      localStorage.removeItem('bookmarks');
      return [];
    }
  });

  // Load bookmarks from Firestore when user logs in
  useEffect(() => {
    const loadUserBookmarks = async () => {
      if (user) {
        const docRef = doc(db, 'user_bookmarks', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBookmarks(docSnap.data().bookmarks);
        }
      }
    };

    loadUserBookmarks();
  }, [user]);

  const toggleBookmark = async (story) => {
    setBookmarks(prev => {
      try {
        const newBookmarks = prev.some(b => b.id === story.id)
          ? prev.filter(b => b.id !== story.id)
          : [...prev, story];

        localStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
        
        if (user) {
          setDoc(doc(db, 'user_bookmarks', user.uid), {
            bookmarks: newBookmarks
          });
        }

        return newBookmarks;
      } catch (error) {
        console.error('Error updating bookmarks:', error);
        return prev;
      }
    });
  };

  return (
    <BookmarkContext.Provider value={{ bookmarks, toggleBookmark }}>
      {children}
    </BookmarkContext.Provider>
  );
}

export const useBookmarks = () => useContext(BookmarkContext);