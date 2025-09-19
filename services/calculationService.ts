import { FormState, LoadCaseRow, GeneratedRow, OlfRow } from '../types';

export const generateLoadCases = (
  inputs: FormState,
  loadCasesData: LoadCaseRow[],
  olfData: OlfRow[],
): { generatedRows: GeneratedRow[], error?: string } => {
  const generatedRows: GeneratedRow[] = [];
  let rowNum = 1;

  // Generate factored loads
  for (const loadCase of loadCasesData) {
    // Shield wire loads
    for (let i = 1; i <= inputs.numShields; i++) {
      generatedRows.push({
        'Row #': rowNum++,
        'Load Case': loadCase['LOAD CASE'],
        'Joint Label': inputs.numShields > 1 ? `${inputs.shieldLabel}${i}` : inputs.shieldLabel,
        'Vertical Load (lbs)': (loadCase['SW-V'] || 0) * 1000,
        'Transverse Load (lbs)': (loadCase['SW-T'] || 0) * 1000,
        'Longitudinal Loads (lbs)': (loadCase['SW-L'] || 0) * 1000,
      });
    }

    // Conductor loads
    for (let i = 1; i <= inputs.numConductors; i++) {
      generatedRows.push({
        'Row #': rowNum++,
        'Load Case': loadCase['LOAD CASE'],
        'Joint Label': `${inputs.conductorLabel}${i}`,
        'Vertical Load (lbs)': (loadCase['C-V'] || 0) * 1000,
        'Transverse Load (lbs)': (loadCase['C-T'] || 0) * 1000,
        'Longitudinal Loads (lbs)': (loadCase['C-L'] || 0) * 1000,
      });
    }

    // Custom Joint Loads
    if (loadCase['LOAD CASE'] && inputs.customLoads) {
      for (const customLoad of inputs.customLoads) {
        if (!customLoad.jointLabel || customLoad.numJoints <= 0) continue;
        
        for (let i = 1; i <= customLoad.numJoints; i++) {
          const verticalLoad = customLoad.verticalSource ? (loadCase[customLoad.verticalSource] || 0) : 0;
          const transverseLoad = customLoad.transverseSource ? (loadCase[customLoad.transverseSource] || 0) : 0;
          const longitudinalLoad = customLoad.longitudinalSource ? (loadCase[customLoad.longitudinalSource] || 0) : 0;
          
          generatedRows.push({
            'Row #': rowNum++,
            'Load Case': loadCase['LOAD CASE'],
            'Joint Label': customLoad.numJoints > 1 ? `${customLoad.jointLabel}${i}` : customLoad.jointLabel,
            'Vertical Load (lbs)': (Number(verticalLoad) || 0) * 1000,
            'Transverse Load (lbs)': (Number(transverseLoad) || 0) * 1000,
            'Longitudinal Loads (lbs)': (Number(longitudinalLoad) || 0) * 1000,
          });
        }
      }
    }
  }

  // Generate unfactored loads if requested
  if (inputs.generateUnfactored) {
    let unfactoredCaseCount = 0;
    for (const loadCase of loadCasesData) {
      const olfRow = olfData.find(olf => olf.loadCase === loadCase['LOAD CASE']);
      if (!olfRow) {
        continue; // Skip if no matching OLF data is found for this load case
      }

      const { verticalOlf, tensionOlf } = olfRow;

      if (verticalOlf === 0 || tensionOlf === 0) {
        return { generatedRows: [], error: `Calculation error: OLF value cannot be zero for load case "${loadCase['LOAD CASE']}". Please correct the value in the Overload Factors table.` };
      }

      // Only generate if OLF values are not 1 (to avoid redundant data)
      if (verticalOlf !== 1 || tensionOlf !== 1) {
        // Remove existing prefix to get the base description
        const baseDescription = String(loadCase['LOAD CASE']).replace(/^\d+\.\s*/, '');
        
        // Create the new sequential number and the full unfactored name
        const newCaseNumber = loadCasesData.length + unfactoredCaseCount + 1;
        const unfactoredLoadCaseName = `${newCaseNumber}. ${baseDescription} UNFACT`;

        // Unfactored shield wire loads
        for (let i = 1; i <= inputs.numShields; i++) {
          generatedRows.push({
            'Row #': rowNum++,
            'Load Case': unfactoredLoadCaseName,
            'Joint Label': inputs.numShields > 1 ? `${inputs.shieldLabel}${i}` : inputs.shieldLabel,
            'Vertical Load (lbs)': ((loadCase['SW-V'] || 0) * 1000) / verticalOlf,
            'Transverse Load (lbs)': ((loadCase['SW-T'] || 0) * 1000) / tensionOlf,
            'Longitudinal Loads (lbs)': ((loadCase['SW-L'] || 0) * 1000) / tensionOlf,
          });
        }

        // Unfactored conductor loads
        for (let i = 1; i <= inputs.numConductors; i++) {
          generatedRows.push({
            'Row #': rowNum++,
            'Load Case': unfactoredLoadCaseName,
            'Joint Label': `${inputs.conductorLabel}${i}`,
            'Vertical Load (lbs)': ((loadCase['C-V'] || 0) * 1000) / verticalOlf,
            'Transverse Load (lbs)': ((loadCase['C-T'] || 0) * 1000) / tensionOlf,
            'Longitudinal Loads (lbs)': ((loadCase['C-L'] || 0) * 1000) / tensionOlf,
          });
        }

        // Unfactored Custom Joint Loads
        if (loadCase['LOAD CASE'] && inputs.customLoads) {
            for (const customLoad of inputs.customLoads) {
                if (!customLoad.jointLabel || customLoad.numJoints <= 0) continue;
                
                for (let i = 1; i <= customLoad.numJoints; i++) {
                    const verticalLoad = customLoad.verticalSource ? (loadCase[customLoad.verticalSource] || 0) : 0;
                    const transverseLoad = customLoad.transverseSource ? (loadCase[customLoad.transverseSource] || 0) : 0;
                    const longitudinalLoad = customLoad.longitudinalSource ? (loadCase[customLoad.longitudinalSource] || 0) : 0;
                    
                    generatedRows.push({
                        'Row #': rowNum++,
                        'Load Case': unfactoredLoadCaseName,
                        'Joint Label': customLoad.numJoints > 1 ? `${customLoad.jointLabel}${i}` : customLoad.jointLabel,
                        'Vertical Load (lbs)': ((Number(verticalLoad) || 0) * 1000) / verticalOlf,
                        'Transverse Load (lbs)': ((Number(transverseLoad) || 0) * 1000) / tensionOlf,
                        'Longitudinal Loads (lbs)': ((Number(longitudinalLoad) || 0) * 1000) / tensionOlf,
                    });
                }
            }
        }
        unfactoredCaseCount++;
      }
    }
  }

  return { generatedRows };
};