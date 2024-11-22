import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useCache } from '../contexts/CacheContext';
import { Spinner } from './ui/Spinner';

export default function Sitemap() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getCachedSitemapArticles, cacheSitemapArticles } = useCache();

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const cachedArticles = getCachedSitemapArticles();
        if (cachedArticles) {
          const articlesWithDates = cachedArticles.map(article => ({
            ...article,
            timestamp: article.timestamp ? new Date(article.timestamp) : null
          }));
          setArticles(articlesWithDates);
          setLoading(false);
          return;
        }

        const articlesRef = collection(db, 'articles');
        const q = query(articlesRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        const articlesData = querySnapshot.docs.map(doc => ({
          slug: doc.data().slug,
          title: doc.data().title,
          timestamp: doc.data().timestamp?.toDate() || null
        }));

        setArticles(articlesData);
        const articlesForCache = articlesData.map(article => ({
          ...article,
          timestamp: article.timestamp?.toISOString()
        }));
        cacheSitemapArticles(articlesForCache);
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [getCachedSitemapArticles, cacheSitemapArticles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Sitemap</h1>
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Static Pages</h2>
            <ul className="space-y-2 text-blue-600 dark:text-blue-400">
              <li><a href="/" className="hover:underline">/</a></li>
              <li><a href="/articles" className="hover:underline">/articles</a></li>
              <li><a href="/bookmarks" className="hover:underline">/bookmarks</a></li>
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Articles</h2>
            <ul className="space-y-2">
              {articles.map((article) => (
                <li key={article.slug} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <a 
                    href={`/article/${article.slug}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    /article/{article.slug}
                  </a>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {article.timestamp ? new Date(article.timestamp).toLocaleDateString() : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}