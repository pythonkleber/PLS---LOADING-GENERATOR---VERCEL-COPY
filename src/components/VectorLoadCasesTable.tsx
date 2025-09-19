import React, { useState, useEffect, useMemo } from 'react';
import { VECTOR_LOAD_CASES_HEADERS, VECTOR_LOAD_CASES_TEMPLATE } from '../constants';
import type { TableData, TableRow, GeneratedRow } from '../types';
import { ImageUploader } from './ImageUploader';
import { Loader } from './Loader';
import { exportToCsv, exportToXlsx } from '../exportUtils';
import type { DisplayedColumn } from '../App';
import { RawDataTable } from './RawDataTable';


interface VectorMapping {
    loadCase: string;
    wind: string;
    deadLoad: string;
    iceThick: string;
    temp: string;
}

interface VectorLoadCasesTableProps {
    initialData: TableData;
    headers: string[];
    mapping: VectorMapping;
    onMappingChange: (newMapping: VectorMapping) => void;
    joinKeys: { initial: string; supplemental: string; };
    onJoinKeysChange: (newKeys: { initial: string; supplemental: string; }) => void;
    windAreaFactor: number | string;
    onWindAreaFactorChange: (newValue: number | string) => void;
    onConfigReset: () => void;
    
    // Supplemental data props
    supplementalImageFile: File | null;
    onSupplementalImageSelect: (file: File) => void;
    supplementalData: TableData;
    supplementalHeaders: string[];
    supplementalIsLoading: boolean;
    supplementalError: string | null;

    // Analysis results
    analysisGeneratedRows: GeneratedRow[];
}

const DataTableCell: React.FC<{ value: string | number, onUpdate: (newValue: string) => void }> = ({ value, onUpdate }) => {
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
            {value}
        </td>
    );
};

export const VectorLoadCasesTable: React.FC<VectorLoadCasesTableProps> = (props) => {
    const { 
        initialData, headers, mapping, onMappingChange,
        joinKeys, onJoinKeysChange, windAreaFactor, onWindAreaFactorChange, onConfigReset,
        supplementalImageFile, onSupplementalImageSelect, supplementalData,
        supplementalHeaders, supplementalIsLoading, supplementalError,
        analysisGeneratedRows
    } = props;
    
    const [vectorData, setVectorData] = useState<TableRow[]>([]);
    const [copySuccess, setCopySuccess] = useState(false);

    // Automatically set the initial join key when the main load case is mapped
    useEffect(() => {
        onJoinKeysChange({ ...joinKeys, initial: mapping.loadCase });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapping.loadCase]);


    const generatedData = useMemo(() => {
        const hasGeneratedRows = analysisGeneratedRows && analysisGeneratedRows.length > 0;
        
        // If there's no primary load case mapping, or no data source, return empty.
        if (!mapping.loadCase || (!hasGeneratedRows && initialData.length === 0)) {
            return [];
        }

        // Determine the source of load cases.
        // If generated rows exist, use their unique names. Otherwise, fall back to the initial data.
        const loadCaseNames = hasGeneratedRows
            ? [...new Set(analysisGeneratedRows.map(row => row['Load Case']))]
            : initialData.map(row => row[mapping.loadCase] as string);

        // Create a lookup map from the initial data, keyed by the base load case name (e.g., "NESC Heavy").
        // This is needed to retrieve original values like wind speed, etc., for each load case.
        const initialDataMap = new Map<string, TableRow>();
        initialData.forEach(row => {
            const originalLoadCase = row[mapping.loadCase] as string;
            if (originalLoadCase) {
                const baseName = originalLoadCase.replace(/^\d+\.\s*/, '').trim();
                if (!initialDataMap.has(baseName)) {
                    initialDataMap.set(baseName, row);
                }
            }
        });

        const supplementalMap = new Map<string, TableRow>();
        if (joinKeys.initial && joinKeys.supplemental && supplementalData.length > 0) {
            for (const row of supplementalData) {
                const key = String(row[joinKeys.supplemental]);
                if (key) {
                    supplementalMap.set(key, row);
                }
            }
        }

        return loadCaseNames.map((loadCaseName, index) => {
            if (!loadCaseName) return null;

            // Find the original data row corresponding to this load case name by stripping prefixes/suffixes.
            const baseNameForLookup = loadCaseName.replace(/^\d+\.\s*/, '').replace(/\sUNFACT$/, '').trim();
            const originalRow = initialDataMap.get(baseNameForLookup) || {};

            const loadCaseDescription = loadCaseName.toLowerCase();
            const templateKey = Object.keys(VECTOR_LOAD_CASES_TEMPLATE).find(key => key !== 'default' && loadCaseDescription.includes(key)) || 'default';
            const template = { ...VECTOR_LOAD_CASES_TEMPLATE.default, ...VECTOR_LOAD_CASES_TEMPLATE[templateKey] };
            
            const newRow: TableRow = { ...template };
            newRow["Row #"] = index + 1;
            newRow["Load Case Description"] = loadCaseName;
            
            newRow["Wind Area Factor"] = Number(windAreaFactor);
            newRow["Ice Density (lbs/ft^3)"] = 57;

            let initialJoinValue = String(originalRow[joinKeys.initial] || '');

            if (joinKeys.initial && joinKeys.initial === mapping.loadCase) {
                initialJoinValue = initialJoinValue.replace(/^\d+\.\s*/, '');
            }
            
            const supplementalRow = supplementalMap.get(initialJoinValue);
            
            const sources = {
                wind: 'Trans. Wind Pressure (psf)',
                deadLoad: 'Dead Load Factor',
                iceThick: 'Ice Thick. (in)',
                temp: 'Temperature (deg F)',
            };

            for (const [key, targetHeader] of Object.entries(sources)) {
                const mappedHeader = mapping[key as keyof VectorMapping];
                if (!mappedHeader) continue;

                if (supplementalRow && supplementalHeaders.includes(mappedHeader)) {
                    newRow[targetHeader] = supplementalRow[mappedHeader];
                } else if (headers.includes(mappedHeader)) {
                    newRow[targetHeader] = originalRow[mappedHeader];
                }
            }
            
            return newRow;
        }).filter(Boolean) as TableRow[];

    }, [initialData, mapping, supplementalData, joinKeys, headers, supplementalHeaders, windAreaFactor, analysisGeneratedRows]);

    useEffect(() => {
        setVectorData(generatedData);
    }, [generatedData]);

    const handleCellUpdate = (rowIndex: number, header: string, value: string) => {
        setVectorData(currentData => {
            const newData = [...currentData];
            const newRow = { ...newData[rowIndex] };
            
            const originalValue = newRow[header];
            if (typeof originalValue === 'number') {
                const numValue = parseFloat(value);
                newRow[header] = isNaN(numValue) ? value : numValue;
            } else {
                newRow[header] = value;
            }

            newData[rowIndex] = newRow;
            return newData;
        });
    };
    
    const handleCopyTable = () => {
        if (vectorData.length === 0) return;
        
        const headerText = VECTOR_LOAD_CASES_HEADERS.join('\t');
        const rowsText = vectorData.map(row => 
            VECTOR_LOAD_CASES_HEADERS.map(h => String(row[h] ?? '')).join('\t')
        ).join('\n');
        
        navigator.clipboard.writeText(`${headerText}\n${rowsText}`).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const handleExport = (format: 'csv' | 'xlsx') => {
        if (vectorData.length === 0) return;
        const displayedColumns: DisplayedColumn[] = VECTOR_LOAD_CASES_HEADERS.map(h => ({ key: h, label: h }));
        if (format === 'csv') {
            exportToCsv('vector-load-cases.csv', displayedColumns, vectorData);
        } else {
            exportToXlsx('vector-load-cases.xlsx', displayedColumns, vectorData);
        }
    };
    
    const renderMappingSelect = (id: string, label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, useTemplateOption: boolean = true) => (
         <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label} Source
            </label>
            <select
                id={id}
                value={value}
                onChange={onChange}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="">{useTemplateOption ? '-- Use Template --' : '-- Select Column --'}</option>
                <optgroup label="From Initial Image">
                    {headers.map(h => <option key={`initial-${h}`} value={h}>{h.replace(/_/g, ' ')}</option>)}
                </optgroup>
                {supplementalHeaders.length > 0 && (
                    <optgroup label="From Supplemental Image">
                         {supplementalHeaders.map(h => <option key={`supp-${h}`} value={h}>{h.replace(/_/g, ' ')}</option>)}
                    </optgroup>
                )}
            </select>
        </div>
    );

    if (initialData.length === 0) {
        return (
            <div className="text-center py-10 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Data to Process</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Please upload an image and map its columns on the "Extracted Data" tab first.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 space-y-6">
                 <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">1. Column Configuration</h2>
                    <button onClick={onConfigReset} className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/50">Reset Configuration</button>
                </div>
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {renderMappingSelect('load-case-select', "'Load Case Description'", mapping.loadCase, (e) => onMappingChange({ ...mapping, loadCase: e.target.value }), false)}
                        {renderMappingSelect('wind-pressure-select', "'Trans. Wind Pressure (psf)'", mapping.wind, (e) => onMappingChange({ ...mapping, wind: e.target.value }))}
                        {renderMappingSelect('dead-load-select', "'Dead Load Factor'", mapping.deadLoad, (e) => onMappingChange({ ...mapping, deadLoad: e.target.value }))}
                        {renderMappingSelect('ice-thick-select', "'Ice Thick. (in)'", mapping.iceThick, (e) => onMappingChange({ ...mapping, iceThick: e.target.value }))}
                        {renderMappingSelect('temp-select', "'Temperature (deg F)'", mapping.temp, (e) => onMappingChange({ ...mapping, temp: e.target.value }))}
                        <div>
                            <label htmlFor="wind-area-factor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Wind Area Factor (all rows)
                            </label>
                            <input
                                id="wind-area-factor"
                                type="number"
                                value={windAreaFactor}
                                onChange={(e) => onWindAreaFactorChange(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>
                 <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">2. (Optional) Upload Supplemental Image</h2>
                    <ImageUploader onImageSelect={onSupplementalImageSelect} imagePreviewUrl={supplementalImageFile ? URL.createObjectURL(supplementalImageFile) : null} isLoading={supplementalIsLoading} />
                    {supplementalIsLoading && <div className="flex justify-center mt-4"><Loader /></div>}
                    {supplementalError && <p className="text-red-500 text-center bg-red-100 dark:bg-red-900/20 p-3 rounded-md mt-4">{supplementalError}</p>}
                </div>

                {supplementalData.length > 0 && (
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
                        <div>
                             <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Supplemental Raw Data</h3>
                             <RawDataTable headers={supplementalHeaders} data={supplementalData} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Join On</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="initial-join-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Initial Image Column
                                    </label>
                                    <select
                                        id="initial-join-key"
                                        value={joinKeys.initial}
                                        onChange={(e) => onJoinKeysChange({...joinKeys, initial: e.target.value})}
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                                    >
                                        <option value="">-- Select Join Column --</option>
                                        {headers.map(h => <option key={h} value={h}>{h.replace(/_/g, ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="supplemental-join-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Supplemental Image Column
                                    </label>
                                    <select
                                        id="supplemental-join-key"
                                        value={joinKeys.supplemental}
                                        onChange={(e) => onJoinKeysChange({...joinKeys, supplemental: e.target.value})}
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                                    >
                                        <option value="">-- Select Join Column --</option>
                                        {supplementalHeaders.map(h => <option key={h} value={h}>{h.replace(/_/g, ' ')}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Final Table</h2>
                    <div className="flex items-center space-x-2">
                        <button onClick={handleCopyTable} className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/50">{copySuccess ? 'Copied!' : 'Copy Table'}</button>
                        <button onClick={() => handleExport('csv')} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Export CSV</button>
                        <button onClick={() => handleExport('xlsx')} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Export Excel</button>
                    </div>
                </div>
                <div className="w-full overflow-hidden rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-100 dark:bg-gray-900/50">
                            <tr>
                                {VECTOR_LOAD_CASES_HEADERS.map((header) => (
                                <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                                    {header}
                                </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-700">
                                {vectorData.length > 0 ? (
                                    vectorData.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            {VECTOR_LOAD_CASES_HEADERS.map(header => (
                                                <DataTableCell
                                                    key={`${rowIndex}-${header}`}
                                                    value={row[header] === undefined || row[header] === null ? '' : row[header]}
                                                    onUpdate={(newValue) => handleCellUpdate(rowIndex, header, newValue)}
                                                />
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={VECTOR_LOAD_CASES_HEADERS.length} className="text-center py-10 text-gray-500 dark:text-gray-400">
                                            {mapping.loadCase ? 'Generating data...' : 'Select a source for \'Load Case Description\' to populate the table.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};