// Define standard fields for table column mapping.
export const STANDARD_FIELDS: Record<string, string> = {
  load_case: 'Load Case',
  c_v: 'C-V',
  c_t: 'C-T',
  c_l: 'C-L',
  sw_v: 'SW-V',
  sw_t: 'SW-T',
  sw_l: 'SW-L',
  wind_psf: 'WIND (PSF)',
};

export const VECTOR_LOAD_CASES_HEADERS = [
    "Row #", "Load Case Description", "Dead Load Factor", "Wind Area Factor", 
    "SF for Steel Poles Arms and Towers", "SF for Wood Poles", "SF for Conc. Ult.", 
    "SF for Conc. First Crack", "SF for Conc. Zero Tens.", "SF for Guys and Cables", 
    "SF for Non Tubular Arms", "SF for Braces", "SF for Insuls.", "SF for Hardware", 
    "SF For Found.", "SF For Climbing", "Point Loads", "Wind/Ice Model", 
    "Trans. Wind Pressure (psf)", "Longit. Wind Pressure (psf)", "Ice Thick. (in)", 
    "Ice Density (lbs/ft^3)", "Temperature (deg F)", "Pole Deflection Check", 
    "Pole Deflection Limit % or (ft)", "Joint Displ."
];

// Template for populating the Vector Load Cases table based on keywords in the load case description.
export const VECTOR_LOAD_CASES_TEMPLATE: Record<string, Record<string, string | number>> = {
    'default': {
        "Dead Load Factor": 1, "Wind Area Factor": 1, "SF for Steel Poles Arms and Towers": 1, "SF for Wood Poles": 0, "SF for Conc. Ult.": 0, "SF for Conc. First Crack": 0, "SF for Conc. Zero Tens.": 0, "SF for Guys and Cables": 0.9, "SF for Non Tubular Arms": 1, "SF for Braces": 1, "SF for Insuls.": 1, "SF for Hardware": 1, "SF For Found.": 1, "SF For Climbing": 0, "Point Loads": "", "Wind/Ice Model": "Wind on All", "Longit. Wind Pressure (psf)": 0, "Ice Thick. (in)": 0, "Ice Density (lbs/ft^3)": 57, "Temperature (deg F)": 0, "Pole Deflection Check": "No Limit", "Pole Deflection Limit % or (ft)": 0, "Joint Displ.": 0,
    },
    'b w/ olf': {
        "Dead Load Factor": 1.5, "Wind Area Factor": 1.1, "Longit. Wind Pressure (psf)": 10, "Ice Thick. (in)": 0.5, "Temperature (deg F)": 0,
    },
    'rule b': {
        "Dead Load Factor": 1.5, "Wind Area Factor": 1.1, "Temperature (deg F)": 30,
    },
    'rule c': {
        "Dead Load Factor": 1.1, "Wind Area Factor": 1.1, "Temperature (deg F)": 60,
    },
    'rule d': {
        "Dead Load Factor": 1.1, "Wind Area Factor": 1.1, "Ice Thick. (in)": 0.75, "Temperature (deg F)": 15,
    },
    'asce': {
        "Dead Load Factor": 1, "Wind Area Factor": 1.1, "Ice Thick. (in)": 1, "Temperature (deg F)": 32,
    },
};
