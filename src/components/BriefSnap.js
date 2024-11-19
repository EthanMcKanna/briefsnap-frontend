// src/components/BriefSnap.js
import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card"
import { ScrollArea } from "./ui/ScrollArea"
import { Newspaper, Bookmark, BookmarkCheck } from 'lucide-react'
import { Spinner } from './ui/Spinner'
import { db } from '../firebase'
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import { useBookmarks } from '../contexts/BookmarkContext';

export default function BriefSnap() {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [articles, setArticles] = useState([])
  const { bookmarks, toggleBookmark } = useBookmarks();
  const navigate = useNavigate()

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
        // Fetch summary
        const summariesRef = collection(db, 'news_summaries');
        const summaryQuery = query(summariesRef, orderBy('timestamp', 'desc'), limit(1));
        const summarySnapshot = await getDocs(summaryQuery);

        if (!summarySnapshot.empty) {
          const doc = summarySnapshot.docs[0];
          const data = doc.data();
          setSummary(data.summary || '');
        }

        // Fetch articles
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const articlesRef = collection(db, 'articles');
        const articlesQuery = query(
          articlesRef,
          where('timestamp', '>=', Timestamp.fromDate(today)),
          orderBy('timestamp', 'desc')
        );
        
        const articlesSnapshot = await getDocs(articlesQuery);
        const articlesData = articlesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setArticles(articlesData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryAndArticles();
  }, []);

  const handleReadMore = (articleId) => {
    navigate(`/article/${articleId}`)
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="flex flex-col items-center justify-center p-4">
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
                      <div key={article.id} className="rounded-lg border p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{article.title}</h4>
                          <button
                            onClick={() => toggleBookmark(article)}
                            className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                          >
                            {bookmarks.some(b => b.id === article.id) ? (
                              <BookmarkCheck className="h-5 w-5" />
                            ) : (
                              <Bookmark className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{article.description}</p>
                        <button 
                          className="text-blue-600 hover:underline mt-2 dark:text-blue-400"
                          onClick={() => handleReadMore(article.id)}
                        >
                          Read More
                        </button>
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
    </div>
  );
}