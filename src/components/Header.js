import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bookmark, Newspaper } from 'lucide-react';
import UserMenu from './UserMenu';

export default function Header() {
  const { user, login } = useAuth();

  return (
    <header className="border-b dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
            BriefSnap
          </Link>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <Link
                  to="/articles"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  <Newspaper className="h-5 w-5" />
                </Link>
                <Link
                  to="/bookmarks"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  <Bookmark className="h-5 w-5" />
                </Link>
              </>
            )}

            {user ? (
              <UserMenu />
            ) : (
              <button
                onClick={login}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}