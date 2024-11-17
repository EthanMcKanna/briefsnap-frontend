import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { db, commentsCollection } from '../firebase'
import { collection, query, orderBy, getDocs, where, deleteDoc, doc, setDoc } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card"
import Header from './Header'
import { Share2, ArrowLeft, Trash2, ThumbsUp, MessageCircle, Bookmark, BookmarkCheck } from 'lucide-react'
import { Spinner } from './ui/Spinner'
import { useAuth } from '../contexts/AuthContext'
import { useBookmarks } from '../contexts/BookmarkContext'

// Remove unused delay function
export default function FullArticle() {
  const { articleId } = useParams()
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

  // Remove unused checkModeration function since we handle it in the Cloudflare Worker

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

  const loadComments = useCallback(async () => {
    if (!articleId) return;
    setCommentsLoading(true);
    setCommentsError('');
    
    try {
      const q = query(
        collection(db, commentsCollection),
        where('articleId', '==', articleId),
        orderBy('likes', 'desc'),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      const formattedComments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          likes: data.likes || 0,
          likedBy: data.likedBy || [],
          timestamp: data.timestamp?.toDate() || new Date()
        };
      });
      
      setComments(formattedComments);

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
  }, [articleId, user]);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const summariesRef = collection(db, 'news_summaries')
        const q = query(summariesRef, orderBy('timestamp', 'desc'))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          let foundArticle = null
          
          for (const doc of querySnapshot.docs) {
            const summaryData = doc.data()
            const article = summaryData.stories.find(story => story.id === articleId)
            
            if (article) {
              foundArticle = article
              break
            }
          }
          
          if (foundArticle) {
            setArticle(foundArticle)
          } else {
            throw new Error('Article not found')
          }
        } else {
          throw new Error('No summaries available')
        }
      } catch (err) {
        console.error("Error fetching article:", err)
        setError(`Failed to load the article: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [articleId])

  useEffect(() => {
    if (showComments && !commentsLoaded) {
      loadComments();
      setCommentsLoaded(true);
    }
  }, [showComments, commentsLoaded, loadComments]); // Add missing dependencies

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
      const response = await fetch('/api/moderate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newComment.trim(),
          articleId,
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

      setNewComment('');
      await loadComments();
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
      await deleteDoc(doc(db, commentsCollection, commentId));
      await loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  };

  const toggleLike = async (commentId, currentLikes, likedBy) => {
    if (!user) return;

    try {
      const hasLiked = likedBy.includes(user.uid);
      const newLikedBy = hasLiked 
        ? likedBy.filter(id => id !== user.uid)
        : [...likedBy, user.uid];

      await setDoc(doc(db, commentsCollection, commentId), {
        likes: hasLiked ? currentLikes - 1 : currentLikes + 1,
        likedBy: newLikedBy
      }, { merge: true });

      await loadComments();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center">
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
        <Card className="w-full max-w-4xl mx-auto dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            {loading ? (
              <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
            ) : error ? (
              <div className="text-center text-red-500 dark:text-red-400">{error}</div>
            ) : (
              <CardTitle className="text-3xl font-bold dark:text-white">
                {article.title}
              </CardTitle>
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
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({node, children, ...props}) => <p className="mb-4 leading-relaxed dark:text-gray-300" {...props}>{children}</p>,
                      h1: ({node, children, ...props}) => <h1 className="text-2xl font-bold my-4 dark:text-gray-100" {...props}>{children}</h1>,
                      h2: ({node, children, ...props}) => <h2 className="text-xl font-bold my-3 dark:text-gray-200" {...props}>{children}</h2>,
                      a: ({node, children, ...props}) => (
                        <a 
                          className="text-blue-600 hover:underline inline-block dark:text-blue-400"
                          target="_blank"
                          rel="noopener noreferrer" 
                          {...props}
                        >
                          {children}
                        </a>
                      )
                    }}
                  >
                    {processCitations(article.full_article, article.citations)}
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
                        <form onSubmit={addComment} className="mb-6">
                          <textarea
                            value={newComment}
                            onChange={(e) => {
                              setNewComment(e.target.value);
                              setModerationError('');
                            }}
                            className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            placeholder="What are your thoughts?"
                            rows="3"
                            disabled={isSubmitting}
                          />
                          {moderationError && (
                            <div className="mt-2 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                              {moderationError}
                            </div>
                          )}
                          <div className="mt-2 flex justify-end">
                            <button 
                              type="submit"
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              disabled={isSubmitting || !newComment.trim()}
                            >
                              {isSubmitting ? (
                                <div className="flex items-center space-x-2">
                                  <Spinner size="sm" />
                                  <span>Posting...</span>
                                </div>
                              ) : (
                                'Post Comment'
                              )}
                            </button>
                          </div>
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
                                <div key={comment.id} className="bg-white dark:bg-gray-800/50 rounded-lg p-4 shadow-sm">
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
                                        className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors duration-200 ${
                                          commentLikes[comment.id]
                                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                        disabled={!user}
                                        title={user ? 'Like comment' : 'Sign in to like comments'}
                                      >
                                        <ThumbsUp className="w-4 h-4" />
                                        <span className="font-medium">{comment.likes || 0}</span>
                                      </button>
                                      {user && comment.userId === user.uid && (
                                        <button
                                          onClick={() => deleteComment(comment.id)}
                                          className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
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
      </div>
    </div>
  )
}