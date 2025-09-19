import React, { useState, useEffect } from 'react';

interface RenameColumnDialogProps {
  isOpen: boolean;
  currentLabel: string;
  onClose: () => void;
  onConfirm: (newLabel: string) => void;
}

export const RenameColumnDialog: React.FC<RenameColumnDialogProps> = ({ isOpen, currentLabel, onClose, onConfirm }) => {
  const [newLabel, setNewLabel] = useState(currentLabel);

  useEffect(() => {
    if (isOpen) {
      setNewLabel(currentLabel);
    }
  }, [isOpen, currentLabel]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = () => {
    if (newLabel.trim() && newLabel.trim() !== currentLabel) {
      onConfirm(newLabel.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm m-4 border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Rename Column</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Enter a new name for the "{currentLabel}" column.</p>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
            className="mt-4 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex justify-end items-center p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 mr-3"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
