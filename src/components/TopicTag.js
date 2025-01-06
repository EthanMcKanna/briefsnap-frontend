
import React from 'react';
import { TOPICS } from '../utils/constants';

const TOPIC_COLORS = {
  TOP_NEWS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  BUSINESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  TECHNOLOGY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  SPORTS: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  WORLD: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  NATION: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  ENTERTAINMENT: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  SCIENCE: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  HEALTH: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
};

export const TopicTag = ({ topic }) => {
  if (!topic || topic === 'ALL') return null;
  const colorClasses = TOPIC_COLORS[topic] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  const label = TOPICS.find(t => t.value === topic)?.label || topic;
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${colorClasses}`}>
      {label}
    </span>
  );
};