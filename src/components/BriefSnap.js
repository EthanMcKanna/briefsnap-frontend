// src/components/BriefSnap.js
import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Helmet } from 'react-helmet-async'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card"
import { ScrollArea } from "./ui/ScrollArea"
import { Newspaper, Bookmark, BookmarkCheck } from 'lucide-react'
import { Spinner } from './ui/Spinner'
import { db } from '../firebase'
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import { useBookmarks } from '../contexts/BookmarkContext';
import Footer from './Footer';
import { useCache } from '../contexts/CacheContext';

export default function BriefSnap() {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [articles, setArticles] = useState([])
  const { bookmarks, toggleBookmark } = useBookmarks();
  const navigate = useNavigate()
  const { getCachedArticles, cacheArticles, getCachedSummary, cacheSummary } = useCache();

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  useEffect(() => {
    const fetchSummaryAndArticles = async () => {
      setLoading(true);
      try {
        // Check cache first
        const cachedSummary = getCachedSummary();
        const cachedArticles = getCachedArticles('today');

        if (cachedSummary && cachedArticles) {
          setSummary(cachedSummary);
          setArticles(cachedArticles);
          setLoading(false);
          return;
        }

        // Fetch summary if not cached
        if (!cachedSummary) {
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
            cacheSummary(data.summary || '');
          }
        } else {
          setSummary(cachedSummary);
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
          const articlesData = articlesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
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

  const handleReadMore = (slug) => { // Changed from articleId
    navigate(`/article/${slug}`)
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Helmet>
        <title>BriefSnap - Your Daily AI-Powered News Summary</title>
        <meta name="description" content="Stay informed with BriefSnap's AI-powered daily news summaries. Get concise, accurate breakdowns of the day's most important stories." />
        <meta property="og:title" content="BriefSnap - Your Daily AI-Powered News Summary" />
        <meta property="og:description" content="Stay informed with BriefSnap's AI-powered daily news summaries. Get concise, accurate breakdowns of the day's most important stories." />
      </Helmet>
      <Header />
      <div className="flex flex-col items-center justify-center p-4 flex-grow">
        <Card className="w-full max-w-3xl border-gray-200 dark:border-gray-800 dark:bg-gray-800">
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
                            <span className="text-blue-600 dark:text-blue-400 mt-2 inline-block">
                              Read More
                            </span>
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
      </div>
      <Footer />
    </div>
  );
}