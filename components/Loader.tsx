
import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      <p className="text-indigo-500 dark:text-indigo-400 text-sm">Analyzing Image...</p>
    </div>
  );
};
