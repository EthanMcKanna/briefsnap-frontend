import React from 'react';

export function Spinner({ size = "md" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]} border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400 rounded-full`} />
  );
}