import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bookmark, Newspaper, X } from 'lucide-react';
import UserMenu from './UserMenu';
import { AuthForms } from './AuthForms';

export default function Header() {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <header className="border-b dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
              BriefSnap
            </Link>

            <div className="flex items-center space-x-4 sm:space-x-6">
              {user && (
                <>
                  <Link
                    to="/articles"
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    <Newspaper className="h-5 w-5" />
                    <span className="hidden sm:inline">Articles</span>
                  </Link>
                  <Link
                    to="/bookmarks"
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    <Bookmark className="h-5 w-5" />
                    <span className="hidden sm:inline">Bookmarks</span>
                  </Link>
                </>
              )}

              {user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
            <AuthForms onSuccess={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}
    </>
  );
}