// src/components/BriefSnap.js
import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/Card"
import { ScrollArea } from "./ui/ScrollArea"
import { Newspaper } from 'lucide-react'
import { db } from '../firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'

export default function BriefSnap() {
  const [summary, setSummary] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          setTimestamp('')
        }
      } catch (err) {
        console.error("Error fetching summary:", err)
        setError(`Failed to load the latest summary: ${err.message}`)
        setSummary("")
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <Newspaper className="h-6 w-6 text-gray-700" />
            <CardTitle className="text-2xl font-bold">BriefSnap</CardTitle>
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
              <ScrollArea className="rounded-md border p-4 bg-gray-50">
                <h3 className="font-semibold mb-2">Summary:</h3>
                <div className="text-sm text-gray-600 prose prose-sm max-w-none">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              </ScrollArea>
              {timestamp && (
                <div className="mt-4 text-sm text-gray-500 text-center">
                  {timestamp}
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="text-center text-sm text-gray-500">
          © {new Date().getFullYear()} BriefSnap. All rights reserved.
        </CardFooter>
      </Card>
    </div>
  )
}