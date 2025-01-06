
import React from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { formatRelativeTime } from '../utils/date';
import { TopicTag } from './TopicTag';

const ArticleCard = ({ article, isBookmarked, onBookmark, onReadMore, style }) => {
  return (
    <div 
      style={style}
      className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"
    >
      <div className="flex justify-between items-start">
        <div 
          onClick={() => onReadMore(article.slug)}
          className="flex-1 cursor-pointer"
        >
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            {article.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {article.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatRelativeTime(article.timestamp)}
              </span>
              <TopicTag topic={article.topic} />
            </div>
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Read →
            </span>
          </div>
        </div>
        <button
          onClick={() => onBookmark(article)}
          className="ml-4 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
        >
          {isBookmarked ? (
            <BookmarkCheck className="h-5 w-5" />
          ) : (
            <Bookmark className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ArticleCard;