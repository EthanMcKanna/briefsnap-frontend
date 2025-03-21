import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, readingHistoryCollection } from '../firebase';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';
import Header from './Header';
import Footer from './Footer';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { History, Trash2, ChevronDown } from 'lucide-react';
import { Spinner } from './ui/Spinner';

const ITEMS_PER_PAGE = 100;

const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const formatRelativeDate = (date) => {
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else if (days === 1) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

const formatDateHeader = (date) => {
  const now = new Date();
  if (isSameDay(date, now)) return 'Today';
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

const groupByDate = (items) => {
  const groups = {};
  
  items.forEach(item => {
    const date = new Date(item.lastRead);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString();
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date,
        items: []
      };
    }
    groups[dateKey].items.push(item);
  });

  return Object.values(groups).sort((a, b) => b.date - a.date);
};

export default function ReadingHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('lastRead');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef(null);

  const fetchHistory = useCallback(async (isInitial = false) => {
    if (!user) return;
    
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const historyRef = collection(db, readingHistoryCollection);
      let q;

      if (isInitial) {
        q = query(
          historyRef,
          where('userId', '==', user.uid),
          orderBy(sortBy, 'desc'),
          limit(ITEMS_PER_PAGE)
        );
        lastDocRef.current = null;
      } else {
        if (!lastDocRef.current) {
          setHasMore(false);
          return;
        }
        q = query(
          historyRef,
          where('userId', '==', user.uid),
          orderBy(sortBy, 'desc'),
          startAfter(lastDocRef.current),
          limit(ITEMS_PER_PAGE)
        );
      }
      
      const snapshot = await getDocs(q);
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
        lastRead: doc.data().lastRead?.toDate()
      }));

      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      
      if (isInitial) {
        setHistory(historyData);
      } else {
        setHistory(prev => [...prev, ...historyData]);
      }
      
      setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error('Error fetching reading history:', err);
      setError('Failed to load reading history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, sortBy]);

  useEffect(() => {
    fetchHistory(true);
  }, [fetchHistory]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    await fetchHistory(false);
  };

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Header />
      <div className="flex-grow p-4">
        <Card className="max-w-4xl mx-auto dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Reading History
                </CardTitle>
              </div>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lastRead">Most Recent</option>
                  <option value="timestamp">First Read</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="flex justify-center p-8">
                <Spinner size="lg" />
              </div>
            ) : error ? (
              <div className="text-center text-red-500 dark:text-red-400">{error}</div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No reading history yet. Start reading articles to see them here!
              </div>
            ) : (
              <div className="space-y-6">
                {groupByDate(history).map(({ date, items }) => (
                  <div key={date.toISOString()} className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 sticky top-0 bg-gray-100 dark:bg-gray-900 py-2 px-4 z-10">
                      {formatDateHeader(date)}
                    </h2>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between p-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => navigate(`/article/${item.slug}`)}
                        >
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 hover:text-blue-600 dark:hover:text-blue-400">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {item.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Read at {item.lastRead.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            {item.timestamp !== item.lastRead && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                First read {formatRelativeDate(item.timestamp)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {loadingMore ? (
                        <div className="flex items-center space-x-2">
                          <Spinner size="sm" />
                          <span>Loading...</span>
                        </div>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
