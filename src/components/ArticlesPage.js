import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, limit, startAfter, where } from 'firebase/firestore';
import Header from './Header';
import Footer from './Footer';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Spinner } from './ui/Spinner';
import { useBookmarks } from '../contexts/BookmarkContext';
import { Bookmark, BookmarkCheck, Newspaper, Search, ChevronDown } from 'lucide-react';

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef(null);
  const navigate = useNavigate();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const ARTICLES_PER_PAGE = 100;
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);
  const topicMenuRef = useRef(null);

  const TOPICS = [
    { value: 'ALL', label: 'All Topics' },
    { value: 'TOP_NEWS', label: 'Top News' },
    { value: 'WORLD', label: 'World' },
    { value: 'NATION', label: 'Nation' },
    { value: 'BUSINESS', label: 'Business' },
    { value: 'TECHNOLOGY', label: 'Technology' },
    { value: 'ENTERTAINMENT', label: 'Entertainment' },
    { value: 'SPORTS', label: 'Sports' },
    { value: 'SCIENCE', label: 'Science' },
    { value: 'HEALTH', label: 'Health' },
  ];

  const fetchArticles = useCallback(async (isInitial = false) => {
    try {
      console.log('Fetching articles, isInitial:', isInitial);
      const articlesRef = collection(db, 'articles');
      let baseQuery = [];

      // Only add topic filter if not showing all
      if (selectedTopic !== 'ALL') {
        baseQuery.push(where('topic', '==', selectedTopic));
      }

      baseQuery.push(orderBy('timestamp', 'desc'));

      let q;
      if (isInitial) {
        q = query(
          articlesRef,
          ...baseQuery,
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
          ...baseQuery,
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
  }, [selectedTopic]);

  useEffect(() => {
    fetchArticles(true);
  }, [fetchArticles]);

  useEffect(() => {
    const filtered = articles.filter(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredArticles(filtered);
  }, [searchQuery, articles]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (topicMenuRef.current && !topicMenuRef.current.contains(event.target)) {
        setTopicMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset and refetch when topic changes
  useEffect(() => {
    setArticles([]);
    setHasMore(true);
    lastDocRef.current = null;
    fetchArticles(true);
  }, [selectedTopic, fetchArticles]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchArticles(false);
  };

  const TopicMenu = () => (
    <div ref={topicMenuRef} className="relative">
      <button
        onClick={() => setTopicMenuOpen(!topicMenuOpen)}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 
          transition-colors duration-200"
      >
        <span className="text-gray-700 dark:text-gray-300">
          {TOPICS.find(t => t.value === selectedTopic)?.label}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transform transition-transform duration-200
          ${topicMenuOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {topicMenuOpen && (
        <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 
          ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu">
            {TOPICS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  setSelectedTopic(value);
                  setTopicMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200
                  ${selectedTopic === value
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

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
            <div className="mt-4 flex flex-col sm:flex-row gap-4">
              <TopicMenu />
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {filteredArticles.map((article) => (
                <div 
                  key={article.id}
                  className="flex items-start justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/article/${article.slug}`)}>
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
              {filteredArticles.length === 0 && !loading && (
                <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No articles match your search.' : 'No articles available.'}
                </div>
              )}
              {!searchQuery && hasMore && (
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