import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { historyCollection } from '../firebase';

const HistoryContext = createContext();

export function HistoryProvider({ children }) {
  const { user } = useAuth();
  const [readingHistory, setReadingHistory] = useState([]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) {
        setReadingHistory([]);
        return;
      }

      try {
        const historyDoc = await getDoc(doc(db, 'reading_history', user.uid));
        if (historyDoc.exists()) {
          setReadingHistory(historyDoc.data().articles || []);
        }
      } catch (error) {
        console.error('Error loading history:', error);
      }
    };

    loadHistory();
  }, [user]);

  const addToHistory = async (article) => {
    if (!user || !article) return;

    const historyItem = {
      id: article.id,
      title: article.title,
      description: article.description,
      readAt: new Date().toISOString(),
    };

    try {
      const userHistoryRef = doc(db, historyCollection, user.uid);
      const historyDoc = await getDoc(userHistoryRef);
      
      let articles = [];
      if (historyDoc.exists()) {
        articles = historyDoc.data().articles || [];
        // Remove duplicate if exists
        articles = articles.filter(item => item.id !== article.id);
      }
      
      // Add new item at the beginning
      articles.unshift(historyItem);
      
      // Keep only last 100 items
      if (articles.length > 100) {
        articles = articles.slice(0, 100);
      }

      await setDoc(userHistoryRef, { articles }, { merge: true });
      setReadingHistory(articles);
    } catch (error) {
      console.error('Error adding to history:', error);
    }
  };

  const clearHistory = async () => {
    if (!user) return;

    try {
      await setDoc(doc(db, 'reading_history', user.uid), { articles: [] });
      setReadingHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  return (
    <HistoryContext.Provider value={{ readingHistory, addToHistory, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export const useHistory = () => useContext(HistoryContext);