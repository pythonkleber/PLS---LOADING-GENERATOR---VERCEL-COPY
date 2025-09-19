import type { TableData } from './types';
import type { DisplayedColumn } from './App';

// TypeScript declaration for the SheetJS library loaded from a CDN.
declare var XLSX: any;

const escapeCsvCell = (cell: string | number | undefined | null): string => {
    if (cell === undefined || cell === null) {
        return '';
    }
    const cellStr = String(cell);
    if (/[",\n]/.test(cellStr)) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
};

export const exportToCsv = (filename: string, columns: DisplayedColumn[], data: TableData) => {
    if (!data || data.length === 0) {
        alert("No data available to export.");
        return;
    }

    const csvRows: string[] = [];
    // Use the displayed labels for the header row
    csvRows.push(columns.map(col => escapeCsvCell(col.label)).join(','));

    // Use the column keys to access data in the correct order
    for (const row of data) {
        const values = columns.map(col => escapeCsvCell(row[col.key]));
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const exportToXlsx = (filename: string, columns: DisplayedColumn[], data: TableData) => {
    if (typeof XLSX === 'undefined') {
        alert("Excel export library is not available.");
        return;
    }
    if (!data || data.length === 0) {
        alert("No data available to export.");
        return;
    }

    // Prepare data in an array-of-arrays format for SheetJS
    const headerRow = columns.map(col => col.label);
    const dataRows = data.map(row => 
        columns.map(col => row[col.key] === undefined || row[col.key] === null ? '' : row[col.key])
    );

    const worksheetData = [headerRow, ...dataRows];
    
    // Create worksheet and workbook
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ExtractedData');

    // Trigger the download
    XLSX.writeFile(wb, filename);
};