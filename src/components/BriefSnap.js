// src/components/BriefSnap.js
import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/Card"
import { ScrollArea } from "./ui/ScrollArea"
import { Newspaper } from 'lucide-react'
import { db } from '../firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import Header from './Header'

export default function BriefSnap() {
  const [summary, setSummary] = useState('')
  const [stories, setStories] = useState([])
  const [timestamp, setTimestamp] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const summariesRef = collection(db, 'news_summaries')
        const q = query(summariesRef, orderBy('timestamp', 'desc'), limit(1))
        const querySnapshot = await getDocs(q)

        console.log('Query snapshot size:', querySnapshot.size) // Debug log

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0]
          const data = doc.data()
          console.log('Retrieved document data:', data) // Debug log

          if (!data.summary) {
            throw new Error('Summary field is missing from the document')
          }

          setSummary(data.summary)
          setStories(data.stories || [])
          
          if (data.timestamp) {
            if (data.timestamp.toDate) {
              const date = data.timestamp.toDate()
              setTimestamp(`Last updated: ${formatDate(date)}`)
            } else {
              console.error('Timestamp is not a Firestore timestamp:', data.timestamp)
              setTimestamp(`Last updated: Unknown`)
            }
          } else {
            setTimestamp('No timestamp available')
          }
        } else {
          console.error('No documents found in the collection')
          setSummary("No summaries available. Please check back later.")
          setStories([])
          setTimestamp('')
        }
      } catch (err) {
        console.error("Error fetching summary:", err)
        setError(`Failed to load the latest summary: ${err.message}`)
        setSummary("")
        setStories([])
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [])

  // Helper function to format date with relative time
  const formatDate = (date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    } else if (isYesterday) {
      return `Yesterday at ${timeStr}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      });
    }
  }

  const handleReadMore = (articleId) => {
    navigate(`/article/${articleId}`)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-3xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <Newspaper className="h-6 w-6 text-gray-700" />
              <CardTitle className="text-2xl font-bold">Today's Briefing</CardTitle>
            </div>
            <CardDescription>Your Daily AI-Powered News Summary</CardDescription>
          </CardHeader>
          <CardContent>
            <h2 className="text-xl font-semibold mb-4">{currentDate}</h2>
            {loading ? (
              <div className="text-center text-gray-500">Loading latest summary...</div>
            ) : error ? (
              <div className="text-center text-red-500">{error}</div>
            ) : (
              <>
                <ScrollArea className="rounded-md border p-4 bg-gray-50 mb-6">
                  <h3 className="font-semibold mb-2">Summary:</h3>
                  <div className="text-sm text-gray-600 prose prose-sm max-w-none">
                    <ReactMarkdown>{summary}</ReactMarkdown>
                  </div>
                </ScrollArea>

                {stories.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-4">Top Stories:</h3>
                    <div className="space-y-4">
                      {stories.map((story) => (
                        <div key={story.id} className="rounded-lg border p-4 bg-white">
                          <h4 className="font-medium text-gray-900 mb-2">{story.title}</h4>
                          <p className="text-sm text-gray-600">{story.description}</p>
                          <button 
                            className="text-blue-500 hover:underline mt-2"
                            onClick={() => handleReadMore(story.id)}
                          >
                            Read More
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {timestamp && (
                  <div className="mt-4 text-sm text-gray-500 text-center">
                    {timestamp}
                  </div>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} BriefSnap. All rights reserved. Created by <a href="https://www.ethanmckanna.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Ethan McKanna</a>.
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}