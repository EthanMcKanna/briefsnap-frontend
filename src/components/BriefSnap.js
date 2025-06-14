// src/components/BriefSnap.js
import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Helmet } from 'react-helmet-async'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card"
import { ScrollArea } from "./ui/ScrollArea"
import { Newspaper, Bookmark, BookmarkCheck, Calendar, X } from 'lucide-react'
import { Spinner } from './ui/Spinner'
import { db } from '../firebase'
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import { useBookmarks } from '../contexts/BookmarkContext';
import Footer from './Footer';
import { useCache } from '../contexts/CacheContext';
import { useAuth } from '../contexts/AuthContext';
import Weather from './Weather';
import CalendarEvents from './CalendarEvents';
import MarketWidget from './MarketWidget';
import { AuthForms } from './AuthForms';
import { useOnboarding } from '../contexts/OnboardingContext';
import { TOPICS } from '../utils/constants';

const TOPIC_COLORS = {
  TOP_NEWS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  BUSINESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  TECHNOLOGY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  // SPORTS: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  WORLD: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  // NATION: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  // ENTERTAINMENT: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  // SCIENCE: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  // HEALTH: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
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

const TopicCard = ({ topic, onClick }) => {
  const colorClasses = TOPIC_COLORS[topic.value] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
    >
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses} mb-2`}>
        {topic.label}
      </span>
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
        View {topic.label} Stories →
      </h3>
    </button>
  );
};

const formatRelativeTime = (timestamp) => {
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
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

const LoginPrompt = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="w-full max-w-3xl mx-auto mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Sign in to get more from BriefSnap
      </h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Create a free account to pin your favorite topics, bookmark articles for later, and customize your home page with weather, calendar, and other customizable widgets.
      </p>
      <button
        onClick={() => setShowAuthModal(true)}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Get Started
      </button>

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
            <AuthForms onSuccess={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

const DEFAULT_WIDGET_ORDER = ['weather', 'calendar', 'market'];

const WidgetComponent = ({ type, userPreferences, calendarEvents }) => {
  switch (type) {
    case 'weather':
      return userPreferences?.showWeather && userPreferences?.location ? (
        <Weather location={userPreferences.location} />
      ) : null;
    case 'calendar':
      return userPreferences?.calendarIntegration ? (
        <CalendarEvents events={calendarEvents} />
      ) : null;
    case 'market':
      return userPreferences?.showMarketWidget ? (
        <MarketWidget />
      ) : null;
    default:
      return null;
  }
};

export default function BriefSnap() {
  const { user, userPreferences, calendarEvents, fetchCalendarEvents } = useAuth();
  const { startOnboarding } = useOnboarding();
  
  useEffect(() => {
    if (user && userPreferences && !userPreferences.onboardingCompleted) {
      startOnboarding();
    }
  }, [user, userPreferences]);
  
  const [pinnedContent, setPinnedContent] = useState({});
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [articles, setArticles] = useState([])
  const { bookmarks, toggleBookmark } = useBookmarks();
  const navigate = useNavigate()
  const { getCachedArticles, cacheArticles, getCachedSummary, cacheSummary } = useCache();
  const [summaryTimestamp, setSummaryTimestamp] = useState(null);

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  const getFirstName = (displayName) => {
    if (!displayName) return '';
    return displayName.split(' ')[0];
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getEnabledWidgets = () => {
    return (userPreferences?.widgetOrder || DEFAULT_WIDGET_ORDER).filter(type => {
      switch (type) {
        case 'weather':
          return userPreferences?.showWeather && userPreferences?.location;
        case 'calendar':
          return userPreferences?.calendarIntegration;
        case 'market':
          return userPreferences?.showMarketWidget;
        default:
          return false;
      }
    });
  };

  useEffect(() => {
    const fetchSummaryAndArticles = async () => {
      setLoading(true);
      try {
        // Check cache first
        const cachedSummaryData = getCachedSummary();
        const cachedArticles = getCachedArticles('today');

        if (cachedSummaryData && cachedArticles) {
          setSummary(cachedSummaryData.summary);
          setSummaryTimestamp(cachedSummaryData.timestamp);
          setArticles(cachedArticles);
          setLoading(false);
          return;
        }

        // Fetch summary if not cached
        if (!cachedSummaryData) {
          const summariesRef = collection(db, 'news_summaries');
          const summaryQuery = query(
            summariesRef, 
            where('topic', '==', 'TOP_NEWS'),
            orderBy('timestamp', 'desc'), 
            limit(1)
          );
          const summarySnapshot = await getDocs(summaryQuery);

          if (!summarySnapshot.empty) {
            const doc = summarySnapshot.docs[0];
            const data = doc.data();
            setSummary(data.summary || '');
            setSummaryTimestamp(data.timestamp);
            cacheSummary(data.summary || '', data.timestamp);
          }
        } else {
          setSummary(cachedSummaryData.summary);
          setSummaryTimestamp(cachedSummaryData.timestamp);
        }

        // Fetch articles if not cached
        if (!cachedArticles) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const articlesRef = collection(db, 'articles');
          const articlesQuery = query(
            articlesRef,
            where('topic', '==', 'TOP_NEWS'),
            where('timestamp', '>=', Timestamp.fromDate(today)),
            orderBy('timestamp', 'desc')
          );
          
          const articlesSnapshot = await getDocs(articlesQuery);
          let articlesData = articlesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          if (articlesData.length < 3) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const yesterdayQuery = query(
              articlesRef,
              where('topic', '==', 'TOP_NEWS'),
              where('timestamp', '>=', Timestamp.fromDate(yesterday)),
              where('timestamp', '<', Timestamp.fromDate(today)),
              orderBy('timestamp', 'desc')
            );
            
            const yesterdaySnapshot = await getDocs(yesterdayQuery);
            const yesterdayArticles = yesterdaySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            articlesData = [...articlesData, ...yesterdayArticles];
          }
          
          setArticles(articlesData);
          cacheArticles(articlesData, 'today');
        } else {
          setArticles(cachedArticles);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryAndArticles();
  }, [getCachedSummary, cacheSummary, getCachedArticles, cacheArticles]);

  useEffect(() => {
    const fetchPinnedContent = async () => {
      const pinnedTopics = userPreferences?.pinnedTopics || [];
      if (pinnedTopics.length === 0) return;

      const content = {};
      
      for (const topic of pinnedTopics) {
        try {
          const summariesRef = collection(db, 'news_summaries');
          const summaryQuery = query(
            summariesRef,
            where('topic', '==', topic),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          const summarySnapshot = await getDocs(summaryQuery);
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const articlesRef = collection(db, 'articles');
          const todayQuery = query(
            articlesRef,
            where('topic', '==', topic),
            where('timestamp', '>=', Timestamp.fromDate(today)),
            orderBy('timestamp', 'desc')
          );
          
          const todaySnapshot = await getDocs(todayQuery);
          let articlesData = todaySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          if (articlesData.length < 3) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const yesterdayQuery = query(
              articlesRef,
              where('topic', '==', topic),
              where('timestamp', '>=', Timestamp.fromDate(yesterday)),
              where('timestamp', '<', Timestamp.fromDate(today)),
              orderBy('timestamp', 'desc')
            );
            
            const yesterdaySnapshot = await getDocs(yesterdayQuery);
            const yesterdayArticles = yesterdaySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            articlesData = [...articlesData, ...yesterdayArticles];
          }
          
          content[topic] = {
            summary: summarySnapshot.docs[0]?.data()?.summary || '',
            timestamp: summarySnapshot.docs[0]?.data()?.timestamp,
            articles: articlesData
          };
        } catch (err) {
          console.error(`Error fetching content for topic ${topic}:`, err);
        }
      }
      
      setPinnedContent(content);
    };

    fetchPinnedContent();
  }, [userPreferences?.pinnedTopics]);

  const handleReadMore = (slug) => {
    navigate(`/article/${slug}`)
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Helmet>
        <title>BriefSnap - Your Daily AI-Powered News Summary</title>
        <meta name="description" content="Stay informed with BriefSnap's AI-powered daily news summaries. Get concise, accurate breakdowns of the day's most important stories." />
        <link rel="canonical" href={process.env.NODE_ENV === 'production' ? 'https://briefsnap.com' : 'http://localhost:3000'} />
        
        {/* OpenGraph meta tags */}
        <meta property="og:title" content="BriefSnap - Your Daily AI-Powered News Summary" />
        <meta property="og:description" content="Stay informed with BriefSnap's AI-powered daily news summaries. Get concise, accurate breakdowns of the day's most important stories." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={process.env.NODE_ENV === 'production' ? 'https://briefsnap.com' : 'http://localhost:3000'} />
        <meta property="og:site_name" content="BriefSnap" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image" content={process.env.NODE_ENV === 'production' ? 'https://briefsnap.com/logo512.png' : 'http://localhost:3000/logo512.png'} />
        <meta property="og:image:secure_url" content={process.env.NODE_ENV === 'production' ? 'https://briefsnap.com/logo512.png' : 'http://localhost:3000/logo512.png'} />
        <meta property="og:image:alt" content="BriefSnap - AI-Powered News Summaries" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        
        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@briefsnap" />
        <meta name="twitter:title" content="BriefSnap - Your Daily AI-Powered News Summary" />
        <meta name="twitter:description" content="Stay informed with BriefSnap's AI-powered daily news summaries. Get concise, accurate breakdowns of the day's most important stories." />
        <meta name="twitter:image" content={process.env.NODE_ENV === 'production' ? 'https://briefsnap.com/logo512.png' : 'http://localhost:3000/logo512.png'} />
        <meta name="twitter:image:alt" content="BriefSnap - AI-Powered News Summaries" />
        
        {/* Additional meta tags */}
        <meta name="author" content="BriefSnap" />
        <meta name="robots" content="index, follow" />
        <meta name="keywords" content="news, AI, summary, daily news, briefing, current events" />
      </Helmet>
      <Header />
      <div className="flex flex-col items-center justify-center p-4 flex-grow">
        {user && (
          <>
            <div className="w-full max-w-3xl mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {getTimeBasedGreeting()}, {getFirstName(user.displayName)}
                </h1>
                <span className="text-2xl" role="img" aria-label="wave">
                  {getTimeBasedGreeting() === 'Good evening' ? '🌙' : '👋'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Here's your personalized briefing for today
              </p>
            </div>

            {getEnabledWidgets().length > 0 && (
              getEnabledWidgets().map((widgetType) => (
                <div key={widgetType} className="w-full max-w-3xl mb-8">
                  <WidgetComponent
                    type={widgetType}
                    userPreferences={userPreferences}
                    calendarEvents={calendarEvents}
                  />
                </div>
              ))
            )}
          </>
        )}

        <Card className="w-full max-w-3xl border-gray-200 dark:border-gray-800 dark:bg-gray-800 mb-8">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <Newspaper className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">Today's Briefing</CardTitle>
            </div>
            <CardDescription className="dark:text-gray-400">Your Daily AI-Powered News Summary</CardDescription>
          </CardHeader>
          <CardContent>
            <h2 className="text-xl font-semibold mb-4 dark:text-white">{currentDate}</h2>
            {loading ? (
              <div className="flex justify-center p-8">
                <Spinner size="lg" />
              </div>
            ) : error ? (
              <div className="text-center text-red-500">{error}</div>
            ) : (
              <>
                <ScrollArea className="rounded-md border p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 mb-6">
                  <h3 className="font-semibold mb-2 dark:text-white">Summary:</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{summary}</ReactMarkdown>
                  </div>
                  {!loading && !error && summaryTimestamp && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                      Last updated: {formatRelativeTime(summaryTimestamp)}
                    </p>
                  )}
                </ScrollArea>

                <div className="mt-6">
                  <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Today's Stories:</h3>
                  <div className="space-y-4">
                    {articles.map((article) => (
                      <div 
                        key={article.id} 
                        className="rounded-lg border p-4 bg-white dark:bg-gray-800 dark:border-gray-700 pointer-events-none"
                      >
                        <div className="flex justify-between items-start">
                          <div 
                            onClick={() => handleReadMore(article.slug)}
                            className="flex-1 pointer-events-auto cursor-pointer"
                          >
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{article.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{article.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatRelativeTime(article.timestamp)}
                                </span>
                                <TopicTag topic={article.topic} />
                              </div>
                              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
                                Read →
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleBookmark(article)}
                            className="ml-4 pointer-events-auto text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                          >
                            {bookmarks.some(b => b.id === article.id) ? (
                              <BookmarkCheck className="h-5 w-5" />
                            ) : (
                              <Bookmark className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                    {articles.length === 0 && (
                      <div className="text-center p-6 text-gray-500 dark:text-gray-400">
                        No articles available for today.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {userPreferences?.pinnedTopics?.length > 0 && (
          <div className="flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-3xl space-y-8">
              {(userPreferences.pinnedTopics || []).map((topic) => {
                const content = pinnedContent[topic];
                if (!content) return null;

                return (
                  <Card key={topic} className="border-gray-200 dark:border-gray-800 dark:bg-gray-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          {TOPICS.find(t => t.value === topic)?.label || topic}
                        </CardTitle>
                        <TopicTag topic={topic} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {content.summary && (
                        <ScrollArea className="rounded-md border p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 mb-6">
                          <div className="text-sm text-gray-600 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{content.summary}</ReactMarkdown>
                          </div>
                          {content.timestamp && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                              Last updated: {formatRelativeTime(content.timestamp)}
                            </p>
                          )}
                        </ScrollArea>
                      )}

                      {content.articles.length > 0 && (
                        <div className="space-y-4">
                          {content.articles.map((article) => (
                            <div key={article.id} className="rounded-lg border p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
                              <div className="flex justify-between items-start">
                                <div 
                                  onClick={() => handleReadMore(article.slug)}
                                  className="flex-1 pointer-events-auto cursor-pointer"
                                >
                                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{article.title}</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">{article.description}</p>
                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatRelativeTime(article.timestamp)}
                                      </span>
                                      <TopicTag topic={article.topic} />
                                    </div>
                                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
                                      Read →
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleBookmark(article)}
                                  className="ml-4 pointer-events-auto text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                                >
                                  {bookmarks.some(b => b.id === article.id) ? (
                                    <BookmarkCheck className="h-5 w-5" />
                                  ) : (
                                    <Bookmark className="h-5 w-5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div className="w-full max-w-3xl">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center">
            <Newspaper className="h-5 w-5 mr-2" />
            Other Topics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {TOPICS.filter(topic => (
              topic.value !== 'ALL' && 
              topic.value !== 'TOP_NEWS' && 
              !(userPreferences?.pinnedTopics || []).includes(topic.value)
            )).map((topic) => (
              <TopicCard
                key={topic.value}
                topic={topic}
                onClick={() => navigate(`/articles?topic=${topic.value}`)}
              />
            ))}
          </div>
        </div>
        {!user && <LoginPrompt />}
        <Footer />
      </div>
    </div>
  );
}