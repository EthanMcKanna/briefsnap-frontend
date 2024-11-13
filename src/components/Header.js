import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Newspaper, Bookmark } from 'lucide-react'
import { useBookmarks } from '../contexts/BookmarkContext'

export default function Header() {
  const location = useLocation();
  const { bookmarks } = useBookmarks();
  
  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="w-full max-w-4xl flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-75 transition-opacity">
            <Newspaper className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700 dark:text-gray-300" />
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">BriefSnap</span>
          </Link>
          
          <nav className="flex space-x-4 items-center">
            <Link
              to="/"
              className={`flex items-center px-3 py-2 rounded-md ${
                location.pathname === '/' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
            >
              <Newspaper className="h-5 w-5 mr-1" />
              <span>Home</span>
            </Link>
            
            <Link
              to="/bookmarks"
              className={`flex items-center px-3 py-2 rounded-md ${
                location.pathname === '/bookmarks' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
            >
              <Bookmark className="h-5 w-5 mr-1" />
              <span>Bookmarks</span>
              {bookmarks.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 rounded-full">
                  {bookmarks.length}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </nav>
    </header>
  );
}