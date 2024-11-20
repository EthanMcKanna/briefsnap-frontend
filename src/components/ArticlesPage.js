import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';
import Header from './Header';
import Footer from './Footer';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Spinner } from './ui/Spinner';
import { useBookmarks } from '../contexts/BookmarkContext';
import { Bookmark, BookmarkCheck, Newspaper } from 'lucide-react';

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef(null);
  const navigate = useNavigate();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const ARTICLES_PER_PAGE = 10;

  const fetchArticles = useCallback(async (isInitial = false) => {
    try {
      console.log('Fetching articles, isInitial:', isInitial);
      const articlesRef = collection(db, 'articles');
      let q;

      if (isInitial) {
        q = query(
          articlesRef,
          orderBy('timestamp', 'desc'),
          limit(ARTICLES_PER_PAGE)
        );
        lastDocRef.current = null;
      } else {
        if (!lastDocRef.current) {
          console.log('No last doc available');
          setHasMore(false);
          return;
        }
        q = query(
          articlesRef,
          orderBy('timestamp', 'desc'),
          startAfter(lastDocRef.current),
          limit(ARTICLES_PER_PAGE)
        );
      }

      const querySnapshot = await getDocs(q);
      console.log('Fetched docs count:', querySnapshot.docs.length);
      
      if (querySnapshot.empty) {
        setHasMore(false);
        return;
      }

      const articlesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1];
      
      if (isInitial) {
        setArticles(articlesData);
      } else {
        setArticles(prev => [...prev, ...articlesData]);
      }
      
      setHasMore(querySnapshot.docs.length === ARTICLES_PER_PAGE);

    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load content");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []); // Empty dependency array

  useEffect(() => {
    fetchArticles(true);
  }, [fetchArticles]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchArticles(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Header />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-red-500 dark:text-red-400 text-center">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Header />
      <div className="max-w-4xl mx-auto p-4 flex-grow">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <Newspaper className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Stories</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {articles.map((article) => (
                <div 
                  key={article.id}
                  className="flex items-start justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/article/${article.id}`)}>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 hover:text-blue-600 dark:hover:text-blue-400">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{article.description}</p>
                  </div>
                  <button
                    onClick={() => toggleBookmark(article)}
                    className="ml-4 p-1.5 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {bookmarks.some(b => b.id === article.id) ? (
                      <BookmarkCheck className="h-5 w-5" />
                    ) : (
                      <Bookmark className="h-5 w-5" />
                    )}
                  </button>
                </div>
              ))}
              {articles.length === 0 && !loading && (
                <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                  No articles available.
                </div>
              )}
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
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}