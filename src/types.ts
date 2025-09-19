// Fix: Define and export all shared types to resolve circular dependency and missing export errors.
export type TableRow = {
  [key: string]: string | number;
};

export type TableData = TableRow[];

export interface CustomLoad {
  id: number;
  jointLabel: string;
  numJoints: number;
  verticalSource: string;
  transverseSource: string;
  longitudinalSource: string;
}

export interface FormState {
  numShields: number;
  numConductors: number;
  shieldLabel: string;
  conductorLabel: string;
  customLoads: CustomLoad[];
  generateUnfactored: boolean;
}

export interface LoadCaseRow {
  'LOAD CASE': string;
  'C-V'?: number;
  'C-T'?: number;
  'C-L'?: number;
  'SW-V'?: number;
  'SW-T'?: number;
  'SW-L'?: number;
  [key: string]: any; // Allow for other columns from the source data
}

export interface GeneratedRow extends TableRow {
  'Row #': number;
  'Load Case': string;
  'Joint Label': string;
  'Vertical Load (lbs)': number;
  'Transverse Load (lbs)': number;
  'Longitudinal Loads (lbs)': number;
}

export interface OlfRow {
  loadCase: string;
  verticalOlf: number;
  tensionOlf: number;
}