import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { db } from '../firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card"

export default function FullArticle() {
  const { articleId } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const summariesRef = collection(db, 'news_summaries')
        const q = query(summariesRef, orderBy('timestamp', 'desc'), limit(1))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const summaryDoc = querySnapshot.docs[0]
          const summaryData = summaryDoc.data()
          
          const article = summaryData.stories[parseInt(articleId)]
          
          if (article) {
            setArticle(article)
          } else {
            throw new Error('Article not found in the latest summary')
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

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          {loading ? (
            <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : (
            <CardTitle className="text-3xl font-bold">
              {article.title}
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : (
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown
                components={{
                  p: ({node, children, ...props}) => <p className="mb-4 leading-relaxed" {...props}>{children}</p>,
                  h1: ({node, children, ...props}) => <h1 className="text-2xl font-bold my-4" {...props}>{children}</h1>,
                  h2: ({node, children, ...props}) => <h2 className="text-xl font-bold my-3" {...props}>{children}</h2>,
                  a: ({node, children, ...props}) => <a className="text-blue-600 hover:underline" {...props}>{children}</a>
                }}
              >
                {article.full_article}
              </ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}