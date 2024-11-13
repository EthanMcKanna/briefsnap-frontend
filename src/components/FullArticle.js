import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { db } from '../firebase'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card"
import Header from './Header'
import { Share2, ArrowLeft } from 'lucide-react'
import { Spinner } from './ui/Spinner'

export default function FullArticle() {
  const { articleId } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          <button
            onClick={handleShare}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </button>
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}