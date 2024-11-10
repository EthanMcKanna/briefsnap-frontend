// src/components/BriefSnap.js
import React, { useEffect, useState } from 'react'
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

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0]
          const data = doc.data()
          setSummary(data.summary || "Summary content is empty.")
          
          if (data.timestamp && data.timestamp.toDate) {
            const date = data.timestamp.toDate()
            setTimestamp(`Last updated: ${formatDate(date)}`)
          } else {
            setTimestamp('')
          }
        } else {
          setSummary("No summaries available at the moment.")
          setTimestamp('')
        }
      } catch (err) {
        console.error("Error fetching summary:", err)
        setError("Failed to load the latest summary.")
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [])

  // Helper function to format date
  const formatDate = (date) => {
    const options = {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
      timeZoneName: 'short'
    };
    return date.toLocaleDateString(undefined, options);
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
              <ScrollArea className="h-[400px] rounded-md border p-4 bg-gray-50">
                <h3 className="font-semibold mt-4 mb-2">Summary:</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {summary}
                </p>
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