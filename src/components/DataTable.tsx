import React, { useState, useRef } from 'react';
import type { TableData } from '../types';
import type { DisplayedColumn } from '../App';

interface DataTableProps {
  columns: DisplayedColumn[];
  data: TableData;
  onDataChange: (newData: TableData) => void;
  onAddRow: () => void;
  onColumnRenameRequest: (columnKey: string, currentLabel: string) => void;
  onColumnReorder: (draggedKey: string, targetKey: string) => void;
  onInsertColumn: (targetKey: string, side: 'left' | 'right') => void;
  onDeleteColumn: (keyToDelete: string) => void;
  onCopyColumn: (keyToCopy: string) => void;
  onPasteColumn: (targetKey: string) => void;
  columnClipboard: string | null;
}

const EditableCell: React.FC<{ value: string | number; onUpdate: (newValue: string) => void }> = ({ value, onUpdate }) => {
    const handleBlur = (e: React.FocusEvent<HTMLTableCellElement>) => {
        onUpdate(e.currentTarget.textContent || '');
    };

    return (
        <td
            contentEditable
            suppressContentEditableWarning={true}
            onBlur={handleBlur}
            className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 focus:outline-none focus:bg-indigo-100 dark:focus:bg-indigo-900/50"
        >
            {String(value)}
        </td>
    );
};

const ColumnHeader: React.FC<{
    column: DisplayedColumn;
    onRenameRequest: () => void;
    onReorder: (draggedKey: string, targetKey: string) => void;
    onInsert: (side: 'left' | 'right') => void;
    onDelete: () => void;
    onCopy: () => void;
    onPaste: () => void;
    isPasteEnabled: boolean;
}> = ({ column, onRenameRequest, onReorder, onInsert, onDelete, onCopy, onPaste, isPasteEnabled }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleDragStart = (e: React.DragEvent<HTMLTableCellElement>) => e.dataTransfer.setData('columnKey', column.key);
    const handleDrop = (e: React.DragEvent<HTMLTableCellElement>) => {
        const draggedKey = e.dataTransfer.getData('columnKey');
        if (draggedKey && draggedKey !== column.key) {
            onReorder(draggedKey, column.key);
        }
        setDragOver(false);
    };

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    return (
        <th 
            scope="col"
            draggable
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`relative px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 cursor-move transition-colors ${dragOver ? 'bg-indigo-200 dark:bg-indigo-800/50' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div className="px-1 rounded">
                    {column.label}
                </div>
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isMenuOpen && (
                        <div className="absolute z-10 right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                            <button onClick={() => { onRenameRequest(); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Rename Column</button>
                            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                            <button onClick={() => { onInsert('left'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Insert Left</button>
                            <button onClick={() => { onInsert('right'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Insert Right</button>
                            <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                            <button onClick={() => { onCopy(); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Copy Column</button>
                            <button onClick={() => { onPaste(); setIsMenuOpen(false); }} disabled={!isPasteEnabled} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">Paste Column</button>
                        </div>
                    )}
                </div>
            </div>
        </th>
    );
};

export const DataTable: React.FC<DataTableProps> = ({ columns, data, onDataChange, onAddRow, onColumnRenameRequest, onColumnReorder, onInsertColumn, onDeleteColumn, onCopyColumn, onPasteColumn, columnClipboard }) => {
  const handleCellUpdate = (rowIndex: number, headerKey: string, value: string) => {
    const newData = [...data];
    const newRow = { ...newData[rowIndex] };
    const numValue = Number(value);
    newRow[headerKey] = !isNaN(numValue) && value.trim() !== '' ? numValue : value;
    newData[rowIndex] = newRow;
    onDataChange(newData);
  };

  if (columns.length === 0 || data.length === 0) {
    return (
        <div className="text-center py-10 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Data to Display</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Confirm column mapping to see your data table here.</p>
        </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-900/50">
                    <tr>
                        {columns.map(col => (
                           <ColumnHeader 
                                key={col.key}
                                column={col}
                                onRenameRequest={() => onColumnRenameRequest(col.key, col.label)}
                                onReorder={onColumnReorder}
                                onInsert={(side) => onInsertColumn(col.key, side)}
                                onDelete={() => onDeleteColumn(col.key)}
                                onCopy={() => onCopyColumn(col.key)}
                                onPaste={() => onPasteColumn(col.key)}
                                isPasteEnabled={!!columnClipboard}
                           />
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            {columns.map(col => (
                                <EditableCell
                                    key={`${rowIndex}-${col.key}`}
                                    value={row[col.key] === undefined || row[col.key] === null ? '' : row[col.key]}
                                    onUpdate={(newValue) => handleCellUpdate(rowIndex, col.key, newValue)}
                                />
                            ))}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={columns.length} className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
                           <button 
                                onClick={onAddRow}
                                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                            >
                                + Add Row
                            </button>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
  );
};