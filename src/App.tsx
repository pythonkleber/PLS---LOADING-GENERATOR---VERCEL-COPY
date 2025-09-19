import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { DataTable } from './components/DataTable';
import { Loader } from './components/Loader';
import { ColumnMappingDialog } from './components/ColumnMappingDialog';
import { VectorLoadCasesTable } from './components/VectorLoadCasesTable';
import { RawDataTable } from './components/RawDataTable';
import { RenameColumnDialog } from './components/RenameColumnDialog';
import { AnalysisTab } from './components/AnalysisTab'; // Import the new component
import { extractTableFromImage } from './services/geminiService';
import { exportToCsv, exportToXlsx } from './exportUtils';
import type { TableData, TableRow, FormState, GeneratedRow, OlfRow } from './types';
import { STANDARD_FIELDS } from './constants';

interface VectorMapping {
    loadCase: string;
    wind: string;
    deadLoad: string;
    iceThick: string;
    temp: string;
}

export interface DisplayedColumn {
    key: string;
    label: string;
}

type ViewMode = 'initial' | 'raw' | 'mapped';

interface RenameDialogState {
    isOpen: boolean;
    columnKey: string;
    currentLabel: string;
}

const App: React.FC = () => {
    // Initial image state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

    // Supplemental image state
    const [supplementalIsLoading, setSupplementalIsLoading] = useState(false);
    const [supplementalError, setSupplementalError] = useState<string | null>(null);
    const [supplementalImageFile, setSupplementalImageFile] = useState<File | null>(null);
    const [supplementalData, setSupplementalData] = useState<TableData>([]);
    const [supplementalHeaders, setSupplementalHeaders] = useState<string[]>([]);


    // Raw data from Gemini - kept pristine after extraction
    const [initialExtractedData, setInitialExtractedData] = useState<TableData>([]);
    // Data that gets manipulated (numbering, row adds, etc.)
    const [extractedData, setExtractedData] = useState<TableData>([]);
    const [extractedHeaders, setExtractedHeaders] = useState<string[]>([]);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

    
    const [displayedColumns, setDisplayedColumns] = useState<DisplayedColumn[]>([]);
    const [columnClipboard, setColumnClipboard] = useState<string | null>(null);
    
    const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
    const [renameDialogState, setRenameDialogState] = useState<RenameDialogState>({ isOpen: false, columnKey: '', currentLabel: '' });
    const [copySuccess, setCopySuccess] = useState(false);

    // --- State lifted from child components ---
    // Vector Load Cases State
    const [vectorMapping, setVectorMapping] = useState<VectorMapping>({
        loadCase: '', wind: '', deadLoad: '', iceThick: '', temp: ''
    });
    const [vectorJoinKeys, setVectorJoinKeys] = useState({ initial: '', supplemental: '' });
    const [vectorWindAreaFactor, setVectorWindAreaFactor] = useState<number | string>(1);
    
    // Analysis Tab State
    const [analysisFormState, setAnalysisFormState] = useState<FormState>({
        numShields: 1, numConductors: 3, shieldLabel: 'SW', conductorLabel: 'C', customLoads: [], generateUnfactored: false,
    });
    const [analysisGeneratedRows, setAnalysisGeneratedRows] = useState<GeneratedRow[]>([]);
    const [olfData, setOlfData] = useState<OlfRow[]>([]);
    // --- End of lifted state ---


    const [activeTab, setActiveTab] = useState<'extracted' | 'vector' | 'analysis'>('extracted');
    const [viewMode, setViewMode] = useState<ViewMode>('initial');

    useEffect(() => {
        if (imageFile) {
            setImagePreviewUrl(URL.createObjectURL(imageFile));
        } else {
            setImagePreviewUrl(null);
        }
        return () => {
            if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreviewUrl);
            }
        }
    }, [imageFile]);

    // Effect to auto-generate OLF data. It now depends on `extractedData` to stay in sync with user edits.
    useEffect(() => {
        if (extractedData.length > 0 && fieldMapping.load_case) {
            const loadCaseHeader = fieldMapping.load_case;
            const newOlfData = extractedData.map((row) => ({
                loadCase: String(row[loadCaseHeader] || ''), // The value is already prefixed here
                verticalOlf: 1,
                tensionOlf: 1,
            }));
            setOlfData(newOlfData);
        } else {
            setOlfData([]);
        }
    }, [extractedData, fieldMapping]);
    
    const getAutoVectorMapping = (currentFieldMapping: Record<string, string>): VectorMapping => {
        return {
            loadCase: currentFieldMapping.load_case || '',
            wind: currentFieldMapping.wind_psf || '',
            deadLoad: '',
            iceThick: '',
            temp: '',
        };
    };

    const handleImageSelect = async (file: File) => {
        setIsLoading(true);
        setError(null);
        setImageFile(file);
        setInitialExtractedData([]);
        setExtractedData([]);
        setExtractedHeaders([]);
        setDisplayedColumns([]);
        setFieldMapping({});
        setViewMode('initial');
        
        // Reset all lifted state
        setVectorMapping({ loadCase: '', wind: '', deadLoad: '', iceThick: '', temp: '' });
        setVectorJoinKeys({ initial: '', supplemental: '' });
        setVectorWindAreaFactor(1);
        setAnalysisFormState({ numShields: 1, numConductors: 3, shieldLabel: 'SW', conductorLabel: 'C', customLoads: [], generateUnfactored: false });
        setAnalysisGeneratedRows([]);
        setOlfData([]);
        
        setSupplementalImageFile(null);
        setSupplementalData([]);
        setSupplementalHeaders([]);
        setSupplementalError(null);
        
        setActiveTab('extracted');

        try {
            const tableData = await extractTableFromImage(file);
            if (tableData.length > 0) {
                const headers = Object.keys(tableData[0]);
                setInitialExtractedData(tableData);
                setExtractedData(tableData);
                setExtractedHeaders(headers);
                setViewMode('raw');
            } else {
                setError("No table data could be extracted from the image.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSupplementalImageSelect = async (file: File) => {
        setSupplementalIsLoading(true);
        setSupplementalError(null);
        setSupplementalImageFile(file);
        setSupplementalData([]);
        setSupplementalHeaders([]);

        try {
            const tableData = await extractTableFromImage(file);
            if (tableData.length > 0) {
                const headers = Object.keys(tableData[0]);
                setSupplementalData(tableData);
                setSupplementalHeaders(headers);
            } else {
                setSupplementalError("No table data could be extracted from the supplemental image.");
            }
        } catch (err) {
            setSupplementalError(err instanceof Error ? err.message : "An unknown error occurred while processing the supplemental image.");
        } finally {
            setSupplementalIsLoading(false);
        }
    };

    const handleMappingConfirm = (mapping: Record<string, string>, additionalHeaders: string[]) => {
        setFieldMapping(mapping);
        const loadCaseKey = Object.keys(STANDARD_FIELDS).find(k => k === 'load_case');
        let processedData = [...initialExtractedData];

        if (loadCaseKey && mapping[loadCaseKey]) {
            const loadCaseHeader = mapping[loadCaseKey];
            processedData = processedData.map((row, index) => ({
                ...row,
                [loadCaseHeader]: `${index + 1}. ${row[loadCaseHeader]}`
            }));
        }

        const mappedColumns = Object.entries(mapping).map(([key, header]) => ({ key: header, label: STANDARD_FIELDS[key] }));
        const additionalColumns = additionalHeaders.map(header => ({ key: header, label: header.replace(/_/g, ' ') }));
        const allColumns = [...mappedColumns, ...additionalColumns];

        const autoVectorMapping = getAutoVectorMapping(mapping);
        setVectorMapping(autoVectorMapping);
        setVectorJoinKeys({ initial: autoVectorMapping.loadCase, supplemental: '' });
        setVectorWindAreaFactor(1);

        setExtractedData(processedData);
        setDisplayedColumns(allColumns);
        setIsMappingDialogOpen(false);
        setViewMode('mapped');
    };
    
    const handleVectorConfigReset = () => {
        const autoMapping = getAutoVectorMapping(fieldMapping);
        setVectorMapping(autoMapping);
        setVectorJoinKeys({ initial: autoMapping.loadCase, supplemental: '' });
        setVectorWindAreaFactor(1);
    };

    const handleAddRow = () => {
        const newRow: TableRow = displayedColumns.reduce((acc, col) => {
            acc[col.key] = '';
            return acc;
        }, {} as TableRow);
        setExtractedData(prev => [...prev, newRow]);
    };

    const handleColumnRenameRequest = (columnKey: string, currentLabel: string) => {
        setRenameDialogState({ isOpen: true, columnKey, currentLabel });
    };

    const handleConfirmRename = (newLabel: string) => {
        const { columnKey } = renameDialogState;
        setDisplayedColumns(prev => prev.map(c => c.key === columnKey ? { ...c, label: newLabel } : c));
        setRenameDialogState({ isOpen: false, columnKey: '', currentLabel: '' });
    };
    
    const handleColumnReorder = (draggedKey: string, targetKey: string) => {
        setDisplayedColumns(prev => {
            const draggedIndex = prev.findIndex(c => c.key === draggedKey);
            const targetIndex = prev.findIndex(c => c.key === targetKey);
            if (draggedIndex === -1 || targetIndex === -1) return prev;

            const newCols = [...prev];
            const [draggedItem] = newCols.splice(draggedIndex, 1);
            newCols.splice(targetIndex, 0, draggedItem);
            return newCols;
        });
    };

    const handleInsertColumn = (targetKey: string, side: 'left' | 'right') => {
        const newKey = `new_col_${Date.now()}`;
        const newColumn: DisplayedColumn = { key: newKey, label: 'New Column' };

        setDisplayedColumns(prev => {
            const targetIndex = prev.findIndex(c => c.key === targetKey);
            if (targetIndex === -1) return prev;
            const newCols = [...prev];
            newCols.splice(targetIndex + (side === 'right' ? 1 : 0), 0, newColumn);
            return newCols;
        });

        setExtractedData(prev => prev.map(row => ({ ...row, [newKey]: '' })));
    };

    const handleDeleteColumn = (keyToDelete: string) => {
        setDisplayedColumns(prev => prev.filter(c => c.key !== keyToDelete));
    };

    const handleCopyColumn = (keyToCopy: string) => setColumnClipboard(keyToCopy);

    const handlePasteColumn = (targetKey: string) => {
        if (!columnClipboard) return;
        setExtractedData(prev => prev.map(row => ({
            ...row,
            [targetKey]: row[columnClipboard]
        })));
    };

    const handleCopyTable = () => {
        if (displayedColumns.length === 0 || extractedData.length === 0) return;
        
        const headerText = displayedColumns.map(c => c.label).join('\t');
        const rowsText = extractedData.map(row => 
            displayedColumns.map(c => String(row[c.key] ?? '')).join('\t')
        ).join('\n');
        
        navigator.clipboard.writeText(`${headerText}\n${rowsText}`).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    return (
        <div className="min-h-screen text-gray-800 dark:text-gray-200">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Image Table Extractor</h1>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('extracted')}
                            className={`${
                                activeTab === 'extracted'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Extracted Data
                        </button>
                        <button
                            onClick={() => setActiveTab('vector')}
                            className={`${
                                activeTab === 'vector'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Vector Load Cases
                        </button>
                        <button
                            onClick={() => setActiveTab('analysis')}
                            className={`${
                                activeTab === 'analysis'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Analysis
                        </button>
                    </nav>
                </div>

                {activeTab === 'extracted' && (
                    <div className="space-y-8">
                        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                             <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">1. Upload Image</h2>
                             <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select an image file containing a table.</p>
                             <ImageUploader onImageSelect={handleImageSelect} imagePreviewUrl={imagePreviewUrl} isLoading={isLoading} />
                        </div>

                        {isLoading && <div className="flex justify-center"><Loader /></div>}
                        {error && <p className="text-red-500 text-center bg-red-100 dark:bg-red-900/20 p-3 rounded-md">{error}</p>}
                        
                        {(viewMode === 'raw' || viewMode === 'mapped') && initialExtractedData.length > 0 && (
                            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 space-y-4">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">2. Raw Extracted Data</h2>
                                <RawDataTable headers={Object.keys(initialExtractedData[0])} data={initialExtractedData} />
                                {viewMode === 'raw' && (
                                     <div className="flex justify-center pt-4">
                                        <button
                                            onClick={() => setIsMappingDialogOpen(true)}
                                            className="px-6 py-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Start Mapping Columns
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {viewMode === 'mapped' && (
                             <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">3. Mapped & Editable Data</h2>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => setIsMappingDialogOpen(true)} className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/50">Remap Columns</button>
                                        <button onClick={handleCopyTable} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">{copySuccess ? 'Copied!' : 'Copy Table'}</button>
                                        <button onClick={() => exportToCsv('extracted-data.csv', displayedColumns, extractedData)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Export CSV</button>
                                        <button onClick={() => exportToXlsx('extracted-data.xlsx', displayedColumns, extractedData)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Export Excel</button>
                                    </div>
                                </div>
                                <DataTable
                                    columns={displayedColumns}
                                    data={extractedData}
                                    onDataChange={setExtractedData}
                                    onAddRow={handleAddRow}
                                    onColumnRenameRequest={handleColumnRenameRequest}
                                    onColumnReorder={handleColumnReorder}
                                    onInsertColumn={handleInsertColumn}
                                    onDeleteColumn={handleDeleteColumn}
                                    onCopyColumn={handleCopyColumn}
                                    onPasteColumn={handlePasteColumn}
                                    columnClipboard={columnClipboard}
                                />
                             </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'vector' && (
                    <VectorLoadCasesTable
                        initialData={extractedData}
                        headers={extractedHeaders}
                        mapping={vectorMapping}
                        onMappingChange={setVectorMapping}
                        joinKeys={vectorJoinKeys}
                        onJoinKeysChange={setVectorJoinKeys}
                        windAreaFactor={vectorWindAreaFactor}
                        onWindAreaFactorChange={setVectorWindAreaFactor}
                        onConfigReset={handleVectorConfigReset}

                        supplementalImageFile={supplementalImageFile}
                        onSupplementalImageSelect={handleSupplementalImageSelect}
                        supplementalData={supplementalData}
                        supplementalHeaders={supplementalHeaders}
                        supplementalIsLoading={supplementalIsLoading}
                        supplementalError={supplementalError}
                        analysisGeneratedRows={analysisGeneratedRows}
                    />
                )}

                {activeTab === 'analysis' && (
                    <AnalysisTab 
                        loadCaseData={extractedData}
                        fieldMapping={fieldMapping}
                        formState={analysisFormState}
                        onFormStateChange={setAnalysisFormState}
                        generatedRows={analysisGeneratedRows}
                        onGeneratedRowsChange={setAnalysisGeneratedRows}
                        olfData={olfData}
                        onOlfDataChange={setOlfData}
                        displayedColumns={displayedColumns}
                    />
                )}
            </main>

            <ColumnMappingDialog
                isOpen={isMappingDialogOpen}
                headers={extractedHeaders}
                onClose={() => setIsMappingDialogOpen(false)}
                onConfirm={handleMappingConfirm}
                initialMapping={fieldMapping}
            />
            <RenameColumnDialog 
                isOpen={renameDialogState.isOpen}
                currentLabel={renameDialogState.currentLabel}
                onClose={() => setRenameDialogState({ ...renameDialogState, isOpen: false })}
                onConfirm={handleConfirmRename}
            />
        </div>
    );
};

export default App;