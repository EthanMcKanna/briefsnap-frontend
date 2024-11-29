import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, or } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Lightbulb, ArrowRight } from 'lucide-react';
import { Spinner } from './ui/Spinner';

export default function RelatedArticles({ currentArticle }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recommendationType, setRecommendationType] = useState('');

  useEffect(() => {
    const fetchRelatedArticles = async () => {
      if (!currentArticle) return;
      
      try {
        const articlesRef = collection(db, 'articles');
        let relatedArticles = [];

        if (user) {
          const historyQuery = query(
            articlesRef,
            where('topic', '==', currentArticle.topic),
            where('viewCount', '>', (currentArticle.viewCount || 0) * 0.5),
            orderBy('viewCount', 'desc'),
            limit(3)
          );
          
          const historySnapshot = await getDocs(historyQuery);
          relatedArticles = historySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(article => article.id !== currentArticle.id);

          if (relatedArticles.length > 0) {
            setRecommendationType('popular');
          }
        }

        if (relatedArticles.length < 3) {
          const queryConstraints = [
            where('topic', '==', currentArticle.topic),
            orderBy('timestamp', 'desc'),
            limit(5)
          ];

          if (currentArticle.keywords?.length > 0) {
            queryConstraints.unshift(
              or(
                where('topic', '==', currentArticle.topic),
                where('keywords', 'array-contains-any', currentArticle.keywords)
              )
            );
          }

          const topicQuery = query(articlesRef, ...queryConstraints);
          const topicSnapshot = await getDocs(topicQuery);
          const topicArticles = topicSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(article => 
              article.id !== currentArticle.id && 
              !relatedArticles.some(a => a.id === article.id)
            );

          relatedArticles = [...relatedArticles, ...topicArticles].slice(0, 3);
          if (relatedArticles.length > 0 && !recommendationType) {
            setRecommendationType('recent');
          }
        }

        setArticles(relatedArticles);
      } catch (error) {
        console.error('Error fetching related articles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedArticles();
  }, [currentArticle, user]);

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Spinner size="lg" />
      </div>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <CardTitle className="text-xl dark:text-white">
              {recommendationType === 'popular' 
                ? 'Popular in this topic'
                : 'More like this'}
            </CardTitle>
          </div>
          {recommendationType && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {recommendationType === 'popular' 
                ? 'Based on reader engagement'
                : 'Based on topic and keywords'}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {articles.map(article => (
            <div
              key={article.id}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 
                dark:hover:border-gray-600 cursor-pointer transition-all bg-white dark:bg-gray-800 
                hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => navigate(`/article/${article.slug}`)}
            >
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {article.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4">
                {article.description}
              </p>
              <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                Read more <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}