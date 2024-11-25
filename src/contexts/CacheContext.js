import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CacheContext = createContext();

export function CacheProvider({ children }) {
  const CACHE_EXPIRY = useMemo(() => 5 * 60 * 1000, []);
  const [articlesCache, setArticlesCache] = useState(new Map());
  const [summaryCache, setSummaryCache] = useState(null);
  const [commentsCache, setCommentsCache] = useState(new Map());
  const [pinnedTopicsCache, setPinnedTopicsCache] = useState(new Map());
  const [weatherCache, setWeatherCache] = useState(new Map());
  const [calendarCache, setCalendarCache] = useState(null);

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

  const cacheSummary = useCallback((summary, timestamp) => {
    console.log('💾 Caching summary');
    setSummaryCache({
      data: { summary, timestamp },
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

  const cachePinnedTopic = useCallback((topic, content) => {
    console.log(`💾 Caching pinned topic (${topic})`);
    setPinnedTopicsCache(prev => new Map(prev).set(topic, {
      data: content,
      timestamp: Date.now()
    }));
  }, []);

  const getCachedPinnedTopic = useCallback((topic) => {
    const cached = pinnedTopicsCache.get(topic);
    if (!cached) {
      console.log(`🔍 Cache miss: pinned topic (${topic})`);
      return null;
    }
    if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
      console.log(`⌛ Cache expired: pinned topic (${topic})`);
      setPinnedTopicsCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(topic);
        return newCache;
      });
      return null;
    }
    console.log(`✅ Cache hit: pinned topic (${topic})`);
    return cached.data;
  }, [pinnedTopicsCache, CACHE_EXPIRY]);

  const cacheWeather = useCallback((location, data) => {
    console.log(`💾 Caching weather for ${location}`);
    setWeatherCache(prev => new Map(prev).set(location.toLowerCase(), {
      data,
      timestamp: Date.now()
    }));
  }, []);

  const getCachedWeather = useCallback((location) => {
    const cached = weatherCache.get(location.toLowerCase());
    if (!cached) {
      console.log(`🔍 Cache miss: weather for ${location}`);
      return null;
    }
    if (Date.now() - cached.timestamp > 30 * 60 * 1000) {
      console.log(`⌛ Cache expired: weather for ${location}`);
      setWeatherCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(location.toLowerCase());
        return newCache;
      });
      return null;
    }
    console.log(`✅ Cache hit: weather for ${location}`);
    return cached.data;
  }, [weatherCache]);

  const cacheCalendarEvents = useCallback((events) => {
    console.log('💾 Caching calendar events');
    setCalendarCache({
      data: events,
      timestamp: Date.now()
    });
  }, []);

  const getCachedCalendarEvents = useCallback(() => {
    if (!calendarCache) {
      console.log('🔍 Cache miss: calendar events');
      return null;
    }
    if (Date.now() - calendarCache.timestamp > CACHE_EXPIRY) {
      console.log('⌛ Cache expired: calendar events');
      setCalendarCache(null);
      return null;
    }
    console.log('✅ Cache hit: calendar events');
    return calendarCache.data;
  }, [calendarCache, CACHE_EXPIRY]);

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
    setWeatherCache(new Map());
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
      cachePinnedTopic,
      getCachedPinnedTopic,
      cacheWeather,
      getCachedWeather,
      cacheCalendarEvents,
      getCachedCalendarEvents,
      cacheSitemapArticles,
      getCachedSitemapArticles,
      clearCache
    }}>
      {children}
    </CacheContext.Provider>
  );
}

export const useCache = () => useContext(CacheContext);