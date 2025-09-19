import React, { useMemo, useState } from 'react';
import type { TableData, FormState, LoadCaseRow, GeneratedRow, OlfRow, CustomLoad } from '../types';
import { generateLoadCases } from '../services/calculationService';
import { STANDARD_FIELDS } from '../constants';
import { exportToCsv, exportToXlsx } from '../exportUtils';
import type { DisplayedColumn } from '../App';

interface AnalysisTabProps {
  loadCaseData: TableData;
  fieldMapping: Record<string, string>;
  formState: FormState;
  onFormStateChange: (newState: FormState) => void;
  generatedRows: GeneratedRow[];
  onGeneratedRowsChange: (newRows: GeneratedRow[]) => void;
  olfData: OlfRow[];
  onOlfDataChange: (newOlfData: OlfRow[]) => void;
  displayedColumns: DisplayedColumn[];
}

const ResultsTable: React.FC<{ rows: GeneratedRow[] }> = ({ rows }) => {
  if (rows.length === 0) {
    return (
      <div className="text-center py-10 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Results Generated</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Configure the inputs and click "Generate" to see the results.</p>
      </div>
    );
  }

  const headers = Object.keys(rows[0]);

  return (
    <div className="w-full overflow-hidden rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-900/50">
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                {headers.map((header) => (
                  <td key={`${rowIndex}-${header}`} className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700">
                    {String(row[header as keyof GeneratedRow] ?? '')}
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

const OlfTable: React.FC<{ olfData: OlfRow[]; onOlfDataChange: (newOlfData: OlfRow[]) => void; }> = ({ olfData, onOlfDataChange }) => {
    const handleOlfChange = (index: number, field: 'verticalOlf' | 'tensionOlf', value: string) => {
        const newOlfData = [...olfData];
        const numValue = parseFloat(value);
        newOlfData[index] = {
            ...newOlfData[index],
            [field]: isNaN(numValue) ? 0 : numValue,
        };
        onOlfDataChange(newOlfData);
    };

    if (olfData.length === 0) {
        return null;
    }

    return (
        <div className="w-full overflow-hidden rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">Load Case</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">Vertical OLF</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tension OLF</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-700">
                        {olfData.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700">{row.loadCase}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm border-r border-gray-200 dark:border-gray-700">
                                    <input
                                        type="number"
                                        value={row.verticalOlf}
                                        onChange={(e) => handleOlfChange(index, 'verticalOlf', e.target.value)}
                                        className="w-full p-1 text-sm bg-transparent border-none rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        step="0.1"
                                    />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                     <input
                                        type="number"
                                        value={row.tensionOlf}
                                        onChange={(e) => handleOlfChange(index, 'tensionOlf', e.target.value)}
                                        className="w-full p-1 text-sm bg-transparent border-none rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        step="0.1"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


export const AnalysisTab: React.FC<AnalysisTabProps> = ({ 
    loadCaseData, fieldMapping, formState, onFormStateChange, generatedRows, onGeneratedRowsChange, olfData, onOlfDataChange, displayedColumns
}) => {
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    onFormStateChange({
      ...formState,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    });
  };

  const handleAddCustomLoad = () => {
    const newCustomLoad: CustomLoad = {
      id: Date.now(),
      jointLabel: '',
      numJoints: 1,
      verticalSource: '',
      transverseSource: '',
      longitudinalSource: '',
    };
    onFormStateChange({
      ...formState,
      customLoads: [...formState.customLoads, newCustomLoad],
    });
  };

  const handleCustomLoadChange = (id: number, field: keyof Omit<CustomLoad, 'id'>, value: string | number) => {
    const newCustomLoads = formState.customLoads.map(load => 
      load.id === id ? { ...load, [field]: value } : load
    );
    onFormStateChange({ ...formState, customLoads: newCustomLoads });
  };

  const handleRemoveCustomLoad = (id: number) => {
    onFormStateChange({
      ...formState,
      customLoads: formState.customLoads.filter(load => load.id !== id),
    });
  };

  const transformedLoadCases: LoadCaseRow[] = useMemo(() => {
    if (!fieldMapping.load_case || !loadCaseData) {
        return [];
    }

    return loadCaseData.map(row => {
        const newRow: LoadCaseRow = { ...row, 'LOAD CASE': '' };
        
        for (const [standardKey, standardLabel] of Object.entries(STANDARD_FIELDS)) {
            const mappedHeader = fieldMapping[standardKey];
            const hasValue = mappedHeader && row[mappedHeader] !== undefined && row[mappedHeader] !== null;

            if (standardKey === 'load_case') {
                newRow['LOAD CASE'] = hasValue ? String(row[mappedHeader]) : '';
            } else {
                const key = standardLabel as keyof Omit<LoadCaseRow, 'LOAD CASE'>;
                if (hasValue) {
                    newRow[key] = Number(row[mappedHeader]) || 0;
                }
            }
        }
        
        return newRow;
    }).filter(row => row['LOAD CASE'] && row['LOAD CASE'].trim() !== '');
  }, [loadCaseData, fieldMapping]);

  const handleGenerate = () => {
    setError(null);
    if (transformedLoadCases.length === 0) {
      setError("No valid load case data found. Please check your column mapping on the 'Extracted Data' tab.");
      onGeneratedRowsChange([]);
      return;
    }
    const result = generateLoadCases(formState, transformedLoadCases, olfData);
    if (result.error) {
      setError(result.error);
      onGeneratedRowsChange([]);
    } else {
      onGeneratedRowsChange(result.generatedRows);
    }
  };
  
  const handleCopyTable = () => {
    if (generatedRows.length === 0) return;
    
    const headers = Object.keys(generatedRows[0]);
    const headerText = headers.join('\t');
    const rowsText = generatedRows.map(row => 
        headers.map(h => String(row[h as keyof GeneratedRow] ?? '')).join('\t')
    ).join('\n');
    
    navigator.clipboard.writeText(`${headerText}\n${rowsText}`).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
      if (generatedRows.length === 0) return;
      const headers = Object.keys(generatedRows[0]);
      const displayedColumns: DisplayedColumn[] = headers.map(h => ({ key: h, label: h }));
      if (format === 'csv') {
          exportToCsv('analysis-results.csv', displayedColumns, generatedRows);
      } else {
          exportToXlsx('analysis-results.xlsx', displayedColumns, generatedRows);
      }
  };

  if (loadCaseData.length === 0) {
    return (
        <div className="text-center py-10 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Data for Analysis</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Please process an image on the "Extracted Data" tab first.</p>
        </div>
    );
  }

  const baseInputClass = "mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";


  return (
    <div className="space-y-8">
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">1. Analysis Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="numShields" className="block text-sm font-medium text-gray-700 dark:text-gray-300"># of Shield Wires</label>
              <input type="number" id="numShields" name="numShields" value={formState.numShields} onChange={handleInputChange} className={baseInputClass} min="0" />
            </div>
            <div>
              <label htmlFor="numConductors" className="block text-sm font-medium text-gray-700 dark:text-gray-300"># of Conductors</label>
              <input type="number" id="numConductors" name="numConductors" value={formState.numConductors} onChange={handleInputChange} className={baseInputClass} min="0" />
            </div>
            <div>
              <label htmlFor="shieldLabel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shield Wire Label</label>
              <input type="text" id="shieldLabel" name="shieldLabel" value={formState.shieldLabel} onChange={handleInputChange} className={baseInputClass} />
            </div>
            <div>
              <label htmlFor="conductorLabel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Conductor Label</label>
              <input type="text" id="conductorLabel" name="conductorLabel" value={formState.conductorLabel} onChange={handleInputChange} className={baseInputClass} />
            </div>
          </div>
        </div>
        
        <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">2. Custom Joint Loads</h2>
            {formState.customLoads.map((load) => (
                <div key={load.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Joint Label</label>
                        <input type="text" value={load.jointLabel} onChange={(e) => handleCustomLoadChange(load.id, 'jointLabel', e.target.value)} className={baseInputClass} placeholder="e.g., Antenna" />
                    </div>
                    <div className="md:col-span-1">
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">#</label>
                         <input type="number" value={load.numJoints} onChange={(e) => handleCustomLoadChange(load.id, 'numJoints', parseInt(e.target.value) || 0)} className={baseInputClass} min="0" />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vertical Src</label>
                        <select value={load.verticalSource} onChange={(e) => handleCustomLoadChange(load.id, 'verticalSource', e.target.value)} className={baseInputClass}>
                            <option value="">-- None --</option>
                            {displayedColumns.map(c => <option key={`v-${c.key}`} value={c.key}>{c.label}</option>)}
                        </select>
                    </div>
                     <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transverse Src</label>
                        <select value={load.transverseSource} onChange={(e) => handleCustomLoadChange(load.id, 'transverseSource', e.target.value)} className={baseInputClass}>
                            <option value="">-- None --</option>
                            {displayedColumns.map(c => <option key={`t-${c.key}`} value={c.key}>{c.label}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Longitudinal Src</label>
                        <select value={load.longitudinalSource} onChange={(e) => handleCustomLoadChange(load.id, 'longitudinalSource', e.target.value)} className={baseInputClass}>
                            <option value="">-- None --</option>
                            {displayedColumns.map(c => <option key={`l-${c.key}`} value={c.key}>{c.label}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                         <button onClick={() => handleRemoveCustomLoad(load.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                         </button>
                    </div>
                </div>
            ))}
            <button
                onClick={handleAddCustomLoad}
                className="mt-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
                + Add Custom Joint Load
            </button>
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">3. Overload Factors (OLF)</h2>
            <OlfTable olfData={olfData} onOlfDataChange={onOlfDataChange} />
            <div className="flex items-center justify-between pt-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300" id="unfactored-label">
                    Generate Unfactored Load Cases
                </span>
                <label htmlFor="unfactored-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        id="unfactored-toggle" 
                        className="sr-only peer" 
                        checked={formState.generateUnfactored}
                        onChange={(e) => onFormStateChange({ ...formState, generateUnfactored: e.target.checked })}
                        aria-labelledby="unfactored-label"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
            </div>
        </div>

        <div className="flex justify-center pt-4">
            <button
                onClick={handleGenerate}
                className="px-8 py-3 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                Generate Load Cases
            </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-center bg-red-100 dark:bg-red-900/20 p-3 rounded-md">{error}</p>}
      
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">4. Generated Results</h2>
            {generatedRows.length > 0 && (
                <div className="flex items-center space-x-2">
                    <button onClick={handleCopyTable} className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/50">{copySuccess ? 'Copied!' : 'Copy Table'}</button>
                    <button onClick={() => handleExport('csv')} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Export CSV</button>
                    <button onClick={() => handleExport('xlsx')} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Export Excel</button>
                </div>
            )}
        </div>
        <ResultsTable rows={generatedRows} />
      </div>
    </div>
  );
};