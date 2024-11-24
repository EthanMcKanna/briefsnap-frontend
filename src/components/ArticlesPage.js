import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, limit, startAfter, where } from 'firebase/firestore';
import Header from './Header';
import Footer from './Footer';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Spinner } from './ui/Spinner';
import { useBookmarks } from '../contexts/BookmarkContext';
import { Bookmark, BookmarkCheck, Newspaper, Search, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from "./ui/ScrollArea";

const TOPICS = [
  { value: 'ALL', label: 'All Topics' },
  { value: 'TOP_NEWS', label: 'Top News' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'TECHNOLOGY', label: 'Technology' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'WORLD', label: 'World' },
  { value: 'NATION', label: 'Nation' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'SCIENCE', label: 'Science' },
  { value: 'HEALTH', label: 'Health' },
];

const TOPIC_COLORS = {
  TOP_NEWS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  BUSINESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  TECHNOLOGY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  SPORTS: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  WORLD: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  NATION: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  ENTERTAINMENT: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  SCIENCE: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  HEALTH: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
};

const TopicTag = ({ topic }) => {
  if (!topic || topic === 'ALL') return null;
  const colorClasses = TOPIC_COLORS[topic] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  const label = TOPICS.find(t => t.value === topic)?.label || topic;
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${colorClasses}`}>
      {label}
    </span>
  );
};

const formatRelativeDate = (timestamp) => {
  if (!timestamp) return '';
  
  const date = timestamp.toDate();
  const now = new Date();
  
  const dateAtMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffDays = Math.floor((todayAtMidnight - dateAtMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    if (date <= now) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
  } else if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

const TopicMenu = ({ selectedTopic, onTopicChange }) => (
  <div className="relative">
    <select
      value={selectedTopic}
      onChange={(e) => {
        console.log('Topic changed to:', e.target.value);
        onTopicChange(e.target.value);
      }}
      className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 w-[200px] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {TOPICS.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
  </div>
);

const ArticleSkeleton = () => (
  <div className="flex items-start justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    <div className="flex-1">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2 animate-pulse"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1 animate-pulse"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2 animate-pulse"></div>
      <div className="flex items-center space-x-2 mt-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
      </div>
    </div>
    <div className="ml-4 h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
  </div>
);

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
  const [topicSummary, setTopicSummary] = useState({ summary: '', timestamp: null });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const fetchArticles = useCallback(async (isInitial = false) => {
    try {
      console.log('Fetching articles, isInitial:', isInitial, 'topic:', selectedTopic);
      const articlesRef = collection(db, 'articles');
      
      let queryConstraints = [orderBy('timestamp', 'desc')];
      
      if (selectedTopic !== 'ALL') {
        queryConstraints.unshift(where('topic', '==', selectedTopic));
        console.log('Adding topic filter for:', selectedTopic);
      }

      let q;
      if (isInitial) {
        q = query(
          articlesRef,
          ...queryConstraints,
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
          ...queryConstraints,
          startAfter(lastDocRef.current),
          limit(ARTICLES_PER_PAGE)
        );
      }

      const querySnapshot = await getDocs(q);
      console.log('Fetched docs count:', querySnapshot.docs.length, 'for topic:', selectedTopic);
      
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

  const handleTopicChange = useCallback((newTopic) => {
    console.log('Handling topic change:', newTopic);
    setSelectedTopic(newTopic);
    setFilteredArticles([]); 
    setArticles([]);
    setHasMore(true);
    lastDocRef.current = null;

    const fetchTopicSummary = async (topic) => {
      if (topic === 'ALL') {
        setTopicSummary({ summary: '', timestamp: null });
        return;
      }

      setSummaryLoading(true);
      try {
        const summariesRef = collection(db, 'news_summaries');
        const summaryQuery = query(
          summariesRef,
          where('topic', '==', topic),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const summarySnapshot = await getDocs(summaryQuery);

        if (!summarySnapshot.empty) {
          const doc = summarySnapshot.docs[0];
          const data = doc.data();
          setTopicSummary({ summary: data.summary || '', timestamp: data.timestamp });
        } else {
          setTopicSummary({ summary: '', timestamp: null });
        }
      } catch (err) {
        console.error("Error fetching summary:", err);
        setTopicSummary({ summary: '', timestamp: null });
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchTopicSummary(newTopic);
  }, []);

  useEffect(() => {
    const topicParam = searchParams.get('topic');
    if (topicParam && TOPICS.some(t => t.value === topicParam)) {
      handleTopicChange(topicParam);
    }
  }, [searchParams, handleTopicChange]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto p-4">
          <Card className="dark:bg-gray-800/50 dark:border-gray-700">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <Newspaper className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Stories</CardTitle>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-4">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-[200px] animate-pulse"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1 animate-pulse"></div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <ArticleSkeleton key={i} />
                ))}
              </div>
            </CardContent>
          </Card>
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
              <TopicMenu 
                selectedTopic={selectedTopic} 
                onTopicChange={handleTopicChange}
              />
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
            {selectedTopic !== 'ALL' && (
              <ScrollArea className="rounded-md border p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 mb-6">
                {summaryLoading ? (
                  <div className="flex justify-center p-4">
                    <Spinner size="sm" />
                  </div>
                ) : topicSummary.summary ? (
                  <>
                    <h3 className="font-semibold mb-2 dark:text-white">Today's {TOPICS.find(t => t.value === selectedTopic)?.label} Summary:</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{topicSummary.summary}</ReactMarkdown>
                    </div>
                    {topicSummary.timestamp && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                        Last updated: {formatRelativeDate(topicSummary.timestamp)}
                      </p>
                    )}
                  </>
                ) : null}
              </ScrollArea>
            )}
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
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeDate(article.timestamp)}
                      </span>
                      <TopicTag topic={article.topic} />
                    </div>
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
              {loadingMore && (
                <>
                  {[...Array(3)].map((_, i) => (
                    <ArticleSkeleton key={`more-${i}`} />
                  ))}
                </>
              )}
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