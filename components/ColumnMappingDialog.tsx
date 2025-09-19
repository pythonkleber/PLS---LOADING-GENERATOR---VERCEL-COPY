// components/ColumnMappingDialog.tsx
import React, { useState, useEffect } from 'react';
import { STANDARD_FIELDS } from '../constants';

interface ColumnMappingDialogProps {
  isOpen: boolean;
  headers: string[];
  onClose: () => void;
  onConfirm: (mapping: Record<string, string>, additionalHeaders: string[]) => void;
  initialMapping?: Record<string, string>;
}

export const ColumnMappingDialog: React.FC<ColumnMappingDialogProps> = ({ isOpen, headers, onClose, onConfirm, initialMapping = {} }) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [additionalHeaders, setAdditionalHeaders] = useState<Set<string>>(new Set());

  const unmappedHeaders = headers.filter(h => !Object.values(mapping).includes(h));

  useEffect(() => {
    if (isOpen) {
      if (Object.keys(initialMapping).length > 0) {
        // If there's an existing mapping, use it
        setMapping(initialMapping);
      } else if (headers.length > 0) {
        // Otherwise, perform auto-detection for the first time
        const autoMapping: Record<string, string> = {};
        const usedHeaders = new Set<string>();

        Object.keys(STANDARD_FIELDS).forEach(key => {
          const standardText = STANDARD_FIELDS[key].toLowerCase().replace(/[^a-z0-9]/g, '');
          let bestMatch: string | undefined = undefined;
          let bestMatchScore = 0;

          headers.forEach(h => {
            if (usedHeaders.has(h)) return;

            const sanitizedHeader = h.toLowerCase().replace(/_/g, ' ').replace(/[^a-z0-9\s]/g, '');
            
            if (sanitizedHeader.includes(standardText)) {
              const score = standardText.length / sanitizedHeader.length;
              if (score > bestMatchScore) {
                bestMatch = h;
                bestMatchScore = score;
              }
            }
          });
          
          if (bestMatch) {
              autoMapping[key] = bestMatch;
              usedHeaders.add(bestMatch);
          } else {
              autoMapping[key] = 'none';
          }
        });
        setMapping(autoMapping);
      }
      setAdditionalHeaders(new Set()); // Reset on open
    }
  }, [isOpen, headers, initialMapping]);

  if (!isOpen) {
    return null;
  }

  const handleSelectChange = (standardFieldKey: string, selectedHeader: string) => {
    setMapping(prev => ({ ...prev, [standardFieldKey]: selectedHeader }));
  };

  const handleAdditionalHeaderToggle = (header: string) => {
      setAdditionalHeaders(prev => {
          const newSet = new Set(prev);
          if (newSet.has(header)) {
              newSet.delete(header);
          } else {
              newSet.add(header);
          }
          return newSet;
      });
  };

  const handleSubmit = () => {
    const finalMapping: Record<string, string> = {};
    for (const key in mapping) {
      if (mapping[key] && mapping[key] !== 'none') {
        finalMapping[key] = mapping[key];
      }
    }
    onConfirm(finalMapping, Array.from(additionalHeaders));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg m-4 border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Map Extracted Columns</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Match standard fields and select any additional columns you want to include from the image.
          </p>
        </div>
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Standard Fields</h3>
            <div className="space-y-4">
              {Object.entries(STANDARD_FIELDS).map(([key, label]) => (
                <div key={key} className="grid grid-cols-2 gap-4 items-center">
                  <label htmlFor={`select-${key}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                  </label>
                  <select
                    id={`select-${key}`}
                    value={mapping[key] || 'none'}
                    onChange={(e) => handleSelectChange(key, e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="none">-- Not Applicable --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>
                        {h.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          {unmappedHeaders.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Include Additional Columns</h3>
              <div className="space-y-2">
                {unmappedHeaders.map(header => (
                  <label key={header} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50">
                    <input
                      type="checkbox"
                      checked={additionalHeaders.has(header)}
                      onChange={() => handleAdditionalHeaderToggle(header)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-100 dark:bg-gray-900 dark:checked:bg-indigo-600 dark:checked:border-indigo-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{header.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end items-center p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Confirm Mapping
          </button>
        </div>
      </div>
    </div>
  );
};
