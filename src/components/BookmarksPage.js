import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Trash2 } from 'lucide-react';
import { useBookmarks } from '../contexts/BookmarkContext';
import Header from './Header';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

export default function BookmarksPage() {
  const { bookmarks, toggleBookmark } = useBookmarks();
  const navigate = useNavigate();

  if (bookmarks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto p-4">
          <Card className="dark:bg-gray-800/50 dark:border-gray-700">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Bookmark className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No bookmarks yet</h2>
              <p className="text-gray-500 dark:text-gray-400">Articles you bookmark will appear here</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="max-w-4xl mx-auto p-4">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-gray-100">
              <Bookmark className="h-5 w-5 mr-2" />
              Your Bookmarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookmarks.map((story) => (
                <div 
                  key={story.id} 
                  className="flex items-start justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex-1">
                    <h3 
                      onClick={() => navigate(`/article/${story.id}`)}
                      className="font-medium text-gray-900 dark:text-gray-100 mb-2 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                    >
                      {story.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{story.description}</p>
                  </div>
                  <button
                    onClick={() => toggleBookmark(story)}
                    className="ml-4 p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Remove bookmark"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}