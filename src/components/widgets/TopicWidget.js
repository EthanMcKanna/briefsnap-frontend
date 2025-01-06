
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { ScrollArea } from "../ui/ScrollArea";
import { Newspaper, Bookmark, BookmarkCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBookmarks } from '../../contexts/BookmarkContext';
import ReactMarkdown from 'react-markdown';
import { TOPICS } from '../../utils/constants';
import { formatRelativeTime } from '../../utils/date';

const TopicWidget = ({ topic, content }) => {
  const navigate = useNavigate();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const topicLabel = TOPICS.find(t => t.value === topic)?.label || topic;

  if (!content) return null;

  return (
    <Card className="h-full dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">
          <div className="flex items-center space-x-2">
            <Newspaper className="w-4 h-4" />
            <span>{topicLabel}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content.summary && (
          <ScrollArea className="h-28 rounded-md mb-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <ReactMarkdown>{content.summary}</ReactMarkdown>
            </div>
          </ScrollArea>
        )}

        <div className="space-y-3">
          {content.articles.slice(0, 3).map((article) => (
            <div 
              key={article.id}
              className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
            >
              <div className="flex justify-between items-start gap-2">
                <div 
                  onClick={() => navigate(`/article/${article.slug}`)}
                  className="cursor-pointer flex-1"
                >
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {article.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(article.timestamp)}
                  </p>
                </div>
                <button
                  onClick={() => toggleBookmark(article)}
                  className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {bookmarks.some(b => b.id === article.id) ? (
                    <BookmarkCheck className="w-4 h-4" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {content.articles.length > 3 && (
          <button
            onClick={() => navigate(`/articles?topic=${topic}`)}
            className="w-full mt-3 text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all {topicLabel} stories →
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default TopicWidget;