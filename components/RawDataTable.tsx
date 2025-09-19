import React from 'react';
import type { TableData } from '../types';

interface RawDataTableProps {
  headers: string[];
  data: TableData;
}

export const RawDataTable: React.FC<RawDataTableProps> = ({ headers, data }) => {
  if (headers.length === 0 || data.length === 0) {
    return <p>No raw data to display.</p>;
  }

  return (
    <div className="w-full overflow-hidden rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-900/50">
                    <tr>
                        {headers.map((header) => (
                            <th
                                key={header}
                                scope="col"
                                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700"
                            >
                                {header.replace(/_/g, ' ')}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            {headers.map((header) => (
                                <td
                                    key={`${rowIndex}-${header}`}
                                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700"
                                >
                                    {String(row[header] === undefined || row[header] === null ? '' : row[header])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};
