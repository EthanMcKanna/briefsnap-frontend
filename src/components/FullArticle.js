import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { db, commentsCollection, readingHistoryCollection } from '../firebase'
import { collection, query, orderBy, getDocs, where, deleteDoc, doc, setDoc, getDoc, increment } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card"
import Header from './Header'
import { Share2, ArrowLeft, Trash2, ThumbsUp, MessageCircle, Bookmark, BookmarkCheck, ChevronDown, SplitIcon, ListIcon } from 'lucide-react'
import { Spinner } from './ui/Spinner'
import { useAuth } from '../contexts/AuthContext'
import { useBookmarks } from '../contexts/BookmarkContext'
import Footer from './Footer';
import { Helmet } from 'react-helmet-async';
import { useCache } from '../contexts/CacheContext';
import RelatedArticles from './RelatedArticles';

function formatViewCount(count) {
  if (!count) return '0 views';
  if (count < 1000) return `${count} views`;
  if (count < 1000000) return `${Math.round(count/1000)}K views`;
  return `${Math.round(count/1000000)}M views`;
}

export default function FullArticle() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentLikes, setCommentLikes] = useState({});
  const [moderationError, setModerationError] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const { bookmarks, toggleBookmark } = useBookmarks();
  const [sortBy, setSortBy] = useState('likes');
  const [readingTime, setReadingTime] = useState(0);
  const [likingComments, setLikingComments] = useState({});
  const { getCachedComments, cacheComments, getCachedArticle, cacheArticle, getCachedArticleSummary, cacheArticleSummary } = useCache();
  const [summaryType, setSummaryType] = useState(null);
  const [summary, setSummary] = useState(null);
  const [keyPoints, setKeyPoints] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const processCitations = (text, citations) => {
    if (!citations || !text) return text;
    
    return text.replace(/\[(\d+)\]/g, (match, num) => {
      const index = parseInt(num) - 1;
      if (index >= 0 && index < citations.length) {
        return `[${match}](${citations[index]})`;
      }
      return match;
    });
  };

  const calculateReadingTime = (text) => {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  const loadComments = useCallback(async () => {
    if (!slug) return;
    setCommentsLoading(true);
    setCommentsError('');
    
    try {
      const cachedComments = getCachedComments(slug, sortBy);
      if (cachedComments) {
        setComments(cachedComments);
        setCommentsLoading(false);
        return;
      }

      const q = query(
        collection(db, commentsCollection),
        where('articleId', '==', slug),
        orderBy(sortBy === 'likes' ? 'likes' : 'timestamp', sortBy === 'likes' ? 'desc' : 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      const formattedComments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          likes: data.likes || 0,
          likedBy: data.likedBy || [],
          replyCount: data.replyCount || 0,
          timestamp: data.timestamp?.toDate() || new Date()
        };
      });
      
      setComments(formattedComments);
      cacheComments(slug, formattedComments);

      if (user) {
        const likes = {};
        formattedComments.forEach(comment => {
          likes[comment.id] = comment.likedBy?.includes(user.uid) || false;
        });
        setCommentLikes(likes);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setCommentsError('Failed to load comments');
    } finally {
      setCommentsLoading(false);
    }
  }, [slug, user, sortBy, getCachedComments, cacheComments]);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      
      setLoading(true);
      setError('');
      
      try {
        // Check cache first
        const cachedArticle = getCachedArticle(slug);
        if (cachedArticle) {
          setArticle(cachedArticle);
          if (cachedArticle.full_article) {
            setReadingTime(calculateReadingTime(cachedArticle.full_article));
          }
          setLoading(false);
          return;
        }

        const articlesRef = collection(db, 'articles');
        const q = query(articlesRef, where('slug', '==', slug));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const articleDoc = querySnapshot.docs[0];
          const articleData = { ...articleDoc.data(), docId: articleDoc.id };
          setArticle(articleData);
          cacheArticle(slug, articleData);

          if (articleData.full_article) {
            const time = calculateReadingTime(articleData.full_article);
            setReadingTime(time);
          }

          if (user && articleData) {
            try {
              const historyRef = doc(db, readingHistoryCollection, `${user.uid}_${articleData.id}`);
              const historySnap = await getDoc(historyRef);
              
              await setDoc(historyRef, {
                userId: user.uid,
                articleId: articleData.id,
                title: articleData.title,
                description: articleData.description,
                topic: articleData.topic,
                slug: articleData.slug,
                ...(!historySnap.exists() && { timestamp: new Date() }),
                lastRead: new Date()
              }, { merge: true });
            } catch (error) {
              console.error("Error updating reading history:", error);
            }
          }

          try {
            await setDoc(doc(db, 'articles', articleDoc.id), {
              viewCount: increment(1)
            }, { merge: true });
          } catch (error) {
            console.error("Error updating view count:", error);
          }

        } else {
          setError('Article not found. Please check the URL and try again.');
        }
      } catch (err) {
        console.error("Error fetching article:", err);
        setError('Failed to load the article. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug, getCachedArticle, cacheArticle, user]);

  useEffect(() => {
    if (showComments && !commentsLoaded) {
      loadComments();
      setCommentsLoaded(true);
    }
  }, [showComments, commentsLoaded, loadComments]);

  useEffect(() => {
    if (commentsLoaded) {
      loadComments();
    }
  }, [sortBy, loadComments, commentsLoaded]);

  const fetchOrGenerateSummary = async (type) => {
    if (!article) return;
    
    setLoadingSummary(true);
    setSummaryError('');

    try {
      const cached = getCachedArticleSummary(article.docId, type);
      if (cached) {
        if (type === 'summary') {
          setSummary(cached);
        } else {
          setKeyPoints(cached);
        }
        setLoadingSummary(false);
        return;
      }

      if (type === 'summary' && article.summary) {
        setSummary(article.summary);
        cacheArticleSummary(article.docId, type, article.summary);
        return;
      }
      if (type === 'keyPoints' && article.keyPoints) {
        setKeyPoints(article.keyPoints);
        cacheArticleSummary(article.docId, type, article.keyPoints);
        return;
      }

      const response = await fetch('https://generatesummary-t56b56emaq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.docId,
          type: type
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to generate summary');
      }

      if (type === 'summary') {
        setSummary(result.summary);
        cacheArticleSummary(article.docId, type, result.summary);
      } else {
        setKeyPoints(result.keyPoints);
        cacheArticleSummary(article.docId, type, result.keyPoints);
      }

    } catch (error) {
      console.error('Detailed error in fetchOrGenerateSummary:', error);
      setSummaryError('Failed to generate summary. Please try again.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGenerateClick = (type) => {
    if (type === summaryType) {
      setSummaryType(null);
      return;
    }
    
    setSummaryType(type);
    
    if (type === 'summary' && article.summary) {
      setSummary(article.summary);
      return;
    }
    if (type === 'keyPoints' && article.keyPoints) {
      setKeyPoints(article.keyPoints);
      return;
    }

    fetchOrGenerateSummary(type);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          url: window.location.href
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setModerationError('');

    try {
      const response = await fetch('https://addcomment-t56b56emaq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newComment.trim(),
          articleId: slug,
          user: {
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL
          }
        })
      });

      const result = await response.json();

      if (!response.ok || result.flagged) {
        setModerationError(result.message || 'Your comment violates our community guidelines.');
        return;
      }

      const newCommentObj = {
        id: result.commentId,
        content: newComment.trim(),
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        articleId: slug,
        timestamp: new Date(),
        likes: 0,
        likedBy: []
      };

      setComments(prev => [newCommentObj, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      setModerationError('Unable to post comment. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteComment = async (commentId) => {
    if (!user) return;
    
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      await deleteDoc(doc(db, commentsCollection, commentId));
      
      const updatedComments = comments.filter(comment => comment.id !== commentId);
      cacheComments(slug, updatedComments);
    } catch (error) {
      console.error('Error deleting comment:', error);

      await loadComments();
      alert('Failed to delete comment. Please try again.');
    }
  };

  const toggleLike = async (commentId, currentLikes, likedBy) => {
    if (!user || likingComments[commentId]) return;

    setLikingComments(prev => ({ ...prev, [commentId]: true }));
    try {
      const hasLiked = likedBy.includes(user.uid);
      const newLikedBy = hasLiked 
        ? likedBy.filter(id => id !== user.uid)
        : [...likedBy, user.uid];

      await setDoc(doc(db, commentsCollection, commentId), {
        likes: hasLiked ? currentLikes - 1 : currentLikes + 1,
        likedBy: newLikedBy
      }, { merge: true });

      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: hasLiked ? currentLikes - 1 : currentLikes + 1,
            likedBy: newLikedBy
          };
        }
        return comment;
      }));

      setCommentLikes(prev => ({
        ...prev,
        [commentId]: !hasLiked
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLikingComments(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const processedContent = useMemo(() => {
    if (!article?.full_article) return '';
    return processCitations(article.full_article, article.citations);
  }, [article]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {article && (
        <Helmet>
          <title>{article.title} | BriefSnap</title>
          <meta name="description" content={article.description || 'Read this article on BriefSnap'} />
          
          {/* OpenGraph meta tags */}
          <meta property="og:title" content={article.title} />
          <meta property="og:description" content={article.description || 'Read this article on BriefSnap'} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={window.location.href} />
          {article.img_url && (
            <>
              <meta property="og:image" content={article.img_url} />
              <meta property="og:image:secure_url" content={article.img_url} />
              <meta property="og:image:alt" content={article.title} />
            </>
          )}
          
          {/* Twitter Card meta tags */}
          <meta name="twitter:card" content={article.img_url ? "summary_large_image" : "summary"} />
          <meta name="twitter:title" content={article.title} />
          <meta name="twitter:description" content={article.description || 'Read this article on BriefSnap'} />
          {article.img_url && (
            <meta name="twitter:image" content={article.img_url} />
          )}
        </Helmet>
      )}
      <Header />
      <div className="py-8 px-4 flex-grow">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 flex justify-between items-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <div className="flex items-center space-x-4">
              {article && (
                <button
                  onClick={() => toggleBookmark(article)}
                  className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  {bookmarks.some(b => b.id === article.id) ? (
                    <BookmarkCheck className="w-4 h-4 mr-2" />
                  ) : (
                    <Bookmark className="w-4 h-4 mr-2" />
                  )}
                  {bookmarks.some(b => b.id === article.id) ? 'Bookmarked' : 'Bookmark'}
                </button>
              )}
              <button
                onClick={handleShare}
                className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </button>
            </div>
          </div>
          <div className="space-y-8">
            <Card className="w-full dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                {loading ? (
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                ) : error ? (
                  <div className="text-center text-red-500 dark:text-red-400">{error}</div>
                ) : (
                  <>
                    <CardTitle className="text-3xl font-bold dark:text-white">
                      {article.title}
                    </CardTitle>
                    <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                      <time dateTime={article.timestamp?.toDate().toISOString()}>
                        {article.timestamp?.toDate().toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </time>
                      <span>•</span>
                      <span>{readingTime} min read</span>
                      <span>•</span>
                      <span>{formatViewCount(article.viewCount)}</span>
                    </div>
                  </>
                )}
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8">
                    <Spinner size="lg" />
                  </div>
                ) : error ? (
                  <div className="text-center text-red-500">{error}</div>
                ) : (
                  <>
                    {article.img_url && (
                      <div className="mb-8 -mt-2 rounded-lg overflow-hidden">
                        <img 
                          src={article.img_url} 
                          alt={article.title}
                          className="w-full h-auto object-cover max-h-[400px]"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex gap-4 mb-8">
                      <button
                        onClick={() => handleGenerateClick('summary')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors
                          ${summaryType === 'summary' && summary
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300'
                            : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-300'
                          } ${loadingSummary && 'opacity-50 cursor-wait'}`}
                        disabled={loadingSummary}
                        title={summaryType === 'summary' && summary ? "Click to hide summary" : "Generate summary"}
                      >
                        <SplitIcon className="w-4 h-4" />
                        <span>{summaryType === 'summary' && summary ? "Hide Summary" : "Generate Summary"}</span>
                      </button>
                      <button
                        onClick={() => handleGenerateClick('keyPoints')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors
                          ${summaryType === 'keyPoints' && keyPoints
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300'
                            : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-300'
                          } ${loadingSummary && 'opacity-50 cursor-wait'}`}
                        disabled={loadingSummary}
                        title={summaryType === 'keyPoints' && keyPoints ? "Click to hide key points" : "Extract key points"}
                      >
                        <ListIcon className="w-4 h-4" />
                        <span>{summaryType === 'keyPoints' && keyPoints ? "Hide Key Points" : "Extract Key Points"}</span>
                      </button>
                    </div>

                    {summaryType && (loadingSummary || summaryError || summary || keyPoints) && (
                      <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <h2 className="text-lg font-semibold mb-4 dark:text-gray-100">
                          {summaryType === 'summary' ? 'Summary' : 'Key Points'}
                        </h2>
                        {loadingSummary ? (
                          <div className="flex justify-center p-4">
                            <Spinner size="md" />
                          </div>
                        ) : summaryError ? (
                          <div className="text-red-500 dark:text-red-400 p-4">{summaryError}</div>
                        ) : summaryType === 'summary' && summary ? (
                          <div className="prose prose-gray dark:prose-invert">
                            <p className="text-gray-800 dark:text-gray-200">{summary}</p>
                          </div>
                        ) : summaryType === 'keyPoints' && keyPoints ? (
                          <div className="prose prose-gray dark:prose-invert">
                            <ul className="list-disc pl-4 space-y-2">
                              {keyPoints.map((point, index) => (
                                <li key={index} className="text-gray-800 dark:text-gray-200">
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className="prose prose-lg dark:prose-invert max-w-none select-text">
                      <ReactMarkdown
                        components={{
                          p: ({children}) => (
                            <p className="mb-4 leading-relaxed dark:text-gray-300 select-text">
                              {children}
                            </p>
                          ),
                          h1: ({children}) => (
                            <h1 className="text-2xl font-bold my-4 dark:text-gray-100 select-text">
                              {children}
                            </h1>
                          ),
                          h2: ({children}) => (
                            <h2 className="text-xl font-bold my-3 dark:text-gray-200 select-text">
                              {children}
                            </h2>
                          ),
                          a: ({href, children}) => (
                            <a 
                              href={href}
                              className="text-blue-600 hover:underline dark:text-blue-400 select-text"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          )
                        }}
                      >
                        {processedContent}
                      </ReactMarkdown>
                    </div>

                    {article.citations && article.citations.length > 0 && (
                      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 dark:text-gray-200">Citations</h2>
                        <ol className="list-decimal list-inside space-y-2">
                          {article.citations.map((citation, index) => (
                            <li key={index} className="text-gray-600 dark:text-gray-400">
                              <a
                                href={citation}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline break-all dark:text-blue-400"
                              >
                                {citation}
                              </a>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {user && (
                      <div className="mt-8 border-t pt-8 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-xl font-semibold dark:text-gray-100">Comments</h2>
                          <button
                            onClick={() => setShowComments(!showComments)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200
                              ${showComments 
                                ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              } hover:bg-gray-200 dark:hover:bg-gray-600`}
                          >
                            <MessageCircle className="w-5 h-5" />
                            <span>{showComments ? 'Hide Comments' : 'Show Comments'}</span>
                            {!showComments && comments.length > 0 && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-500 dark:bg-blue-600 text-white text-sm rounded-full">
                                {comments.length}
                              </span>
                            )}
                          </button>
                        </div>

                        {showComments && (
                          <>
                            <div className="flex justify-between items-center mb-6">
                              <div className="flex items-center space-x-4">
                                <h2 className="text-xl font-semibold dark:text-gray-100">
                                  Comments {comments.length > 0 && `(${comments.length})`}
                                </h2>
                                <div className="relative">
                                  <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="appearance-none bg-white dark:bg-gray-700 border border-gray-200 
                                      dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 
                                      dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="likes">Most Liked</option>
                                    <option value="newest">Newest</option>
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 
                                    text-gray-500 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                            
                            <form onSubmit={addComment} className="mb-8">
                              <div className="relative">
                                <textarea
                                  value={newComment}
                                  onChange={(e) => {
                                    setNewComment(e.target.value);
                                    setModerationError('');
                                  }}
                                  className="w-full p-4 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 
                                    dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
                                    dark:focus:ring-blue-400 pr-24"
                                  placeholder="What are your thoughts?"
                                  rows="3"
                                  disabled={isSubmitting}
                                />
                                <button 
                                  type="submit"
                                  className="absolute bottom-3 right-3 px-4 py-2 bg-blue-600 text-white rounded-lg 
                                    hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                  disabled={isSubmitting || !newComment.trim()}
                                >
                                  {isSubmitting ? (
                                    <div className="flex items-center space-x-2">
                                      <Spinner size="sm" />
                                      <span>Posting...</span>
                                    </div>
                                  ) : (
                                    'Post'
                                  )}
                                </button>
                              </div>
                              {moderationError && (
                                <div className="mt-2 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                  {moderationError}
                                </div>
                              )}
                            </form>

                            {commentsError && (
                              <div className="text-red-500 dark:text-red-400 mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                {commentsError}
                              </div>
                            )}
                            
                            {commentsLoading ? (
                              <div className="flex justify-center p-4">
                                <Spinner size="md" />
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {comments.length === 0 ? (
                                  <div className="text-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400">
                                      No comments yet. Be the first to share your thoughts!
                                    </p>
                                  </div>
                                ) : (
                                  comments.map(comment => (
                                    <div 
                                      key={comment.id} 
                                      className="bg-white dark:bg-gray-800/50 rounded-lg p-4 shadow-sm 
                                        transition-shadow duration-200 hover:shadow-md"
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center">
                                          <img 
                                            src={comment.userPhoto} 
                                            alt={comment.userName}
                                            className="w-8 h-8 rounded-full mr-3 border dark:border-gray-700"
                                          />
                                          <div>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                              {comment.userName}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                              {comment.timestamp?.toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                              })}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <button
                                            onClick={() => toggleLike(comment.id, comment.likes, comment.likedBy || [])}
                                            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-all duration-200 
                                              ${commentLikes[comment.id]
                                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                              } ${likingComments[comment.id] ? 'opacity-50 cursor-wait' : ''}`}
                                            disabled={!user || likingComments[comment.id]}
                                            title={user ? 'Like comment' : 'Sign in to like comments'}
                                          >
                                            <ThumbsUp className={`w-4 h-4 ${likingComments[comment.id] ? 'animate-pulse' : ''}`} />
                                            <span className="font-medium">{comment.likes || 0}</span>
                                          </button>
                                          {user && comment.userId === user.uid && (
                                            <button
                                              onClick={() => deleteComment(comment.id)}
                                              className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 
                                                dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 
                                                transition-colors duration-200"
                                              title="Delete comment"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
                                        {comment.content}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
            {article && !loading && !error && (
              <RelatedArticles currentArticle={article} />
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}