import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CacheContext = createContext();

export function CacheProvider({ children }) {
  const CACHE_EXPIRY = useMemo(() => 5 * 60 * 1000, []);
  const [articlesCache, setArticlesCache] = useState(new Map());
  const [summaryCache, setSummaryCache] = useState(null);
  const [commentsCache, setCommentsCache] = useState(new Map());

  const cacheArticles = useCallback((articles, query = 'default') => {
    console.log(`💾 Caching articles (${query})`);
    setArticlesCache(prev => new Map(prev).set(query, {
      data: articles,
      timestamp: Date.now()
    }));
  }, []);

  const getCachedArticles = useCallback((query = 'default') => {
    const cached = articlesCache.get(query);
    if (!cached) {
      console.log(`🔍 Cache miss: articles (${query})`);
      return null;
    }
    if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
      console.log(`⌛ Cache expired: articles (${query})`);
      setArticlesCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(query);
        return newCache;
      });
      return null;
    }
    console.log(`✅ Cache hit: articles (${query})`);
    return cached.data;
  }, [articlesCache, CACHE_EXPIRY]);

  const cacheArticle = useCallback((slug, article) => {
    console.log(`💾 Caching article (${slug})`);
    setArticlesCache(prev => new Map(prev).set(`article_${slug}`, {
      data: article,
      timestamp: Date.now()
    }));
  }, []);

  const getCachedArticle = useCallback((slug) => {
    const cached = articlesCache.get(`article_${slug}`);
    if (!cached) {
      console.log(`🔍 Cache miss: article (${slug})`);
      return null;
    }
    if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
      console.log(`⌛ Cache expired: article (${slug})`);
      setArticlesCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(`article_${slug}`);
        return newCache;
      });
      return null;
    }
    console.log(`✅ Cache hit: article (${slug})`);
    return cached.data;
  }, [articlesCache, CACHE_EXPIRY]);

  const cacheSummary = useCallback((summary) => {
    console.log('💾 Caching summary');
    setSummaryCache({
      data: summary,
      timestamp: Date.now()
    });
  }, []);

  const getCachedSummary = useCallback(() => {
    if (!summaryCache) {
      console.log('🔍 Cache miss: summary');
      return null;
    }
    if (Date.now() - summaryCache.timestamp > CACHE_EXPIRY) {
      console.log('⌛ Cache expired: summary');
      setSummaryCache(null);
      return null;
    }
    console.log('✅ Cache hit: summary');
    return summaryCache.data;
  }, [summaryCache, CACHE_EXPIRY]);

  const cacheComments = useCallback((articleId, comments) => {
    console.log(`💾 Caching comments (${articleId})`);
    setCommentsCache(prev => new Map(prev).set(articleId, {
      data: comments,
      timestamp: Date.now()
    }));
  }, []);

  const getCachedComments = useCallback((articleId, sortBy = 'likes') => {
    const cached = commentsCache.get(articleId);
    if (!cached) {
      console.log(`🔍 Cache miss: comments (${articleId})`);
      return null;
    }
    if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
      console.log(`⌛ Cache expired: comments (${articleId})`);
      setCommentsCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(articleId);
        return newCache;
      });
      return null;
    }
    console.log(`✅ Cache hit: comments (${articleId})`);
    
    const sortedComments = [...cached.data].sort((a, b) => {
      if (sortBy === 'likes') {
        return b.likes - a.likes;
      } else {
        return b.timestamp - a.timestamp;
      }
    });
    
    return sortedComments;
  }, [commentsCache, CACHE_EXPIRY]);

  const cacheSitemapArticles = (articles) => {
    localStorage.setItem('sitemap_articles', JSON.stringify({
      data: articles,
      timestamp: Date.now()
    }));
  };

  const getCachedSitemapArticles = () => {
    const cached = localStorage.getItem('sitemap_articles');
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    // Cache expires after 1 hour
    if (Date.now() - timestamp > 3600000) {
      localStorage.removeItem('sitemap_articles');
      return null;
    }

    return data;
  };

  const clearCache = useCallback(() => {
    console.log('🧹 Clearing all caches');
    setArticlesCache(new Map());
    setSummaryCache(null);
    setCommentsCache(new Map());
  }, []);

  return (
    <CacheContext.Provider value={{
      cacheArticles,
      getCachedArticles,
      cacheArticle,
      getCachedArticle,
      cacheSummary,
      getCachedSummary,
      cacheComments,
      getCachedComments,
      cacheSitemapArticles,
      getCachedSitemapArticles,
      clearCache
    }}>
      {children}
    </CacheContext.Provider>
  );
}

export const useCache = () => useContext(CacheContext);