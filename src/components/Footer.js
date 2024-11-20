
import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-6 px-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          © {currentYear} BriefSnap. All rights reserved.
        </div>
        <div className="flex space-x-6">
          <Link 
            to="/privacy-policy" 
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Privacy Policy
          </Link>
          <Link 
            to="/terms-of-service" 
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}