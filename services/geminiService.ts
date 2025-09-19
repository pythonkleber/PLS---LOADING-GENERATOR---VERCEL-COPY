import { GoogleGenAI, Type } from "@google/genai";
import type { TableData, TableRow } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URI prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const extractTableFromImage = async (file: File): Promise<TableData> => {
    const base64Image = await fileToBase64(file);

    const textPart = {
        text: `Analyze the table in the provided image. Extract all data. Return a single JSON object with two keys: 'headers' and 'rows'.
'headers' should be an array of strings representing the sanitized column headers (e.g., 'Conductor (per phase)' becomes 'conductor_per_phase', and 'V (kips)' becomes 'V_kips').
'rows' should be an array of arrays, where each inner array represents a row of data. All data values in the rows, whether text or numeric, should be represented as strings.
If no table is found, return an object with empty 'headers' and 'rows' arrays.`,
    };

    const imagePart = {
        inlineData: {
            mimeType: file.type,
            data: base64Image,
        },
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        headers: {
                            type: Type.ARRAY,
                            description: "An array of strings for the table headers.",
                            items: { type: Type.STRING }
                        },
                        rows: {
                            type: Type.ARRAY,
                            description: "An array of arrays, where each inner array is a row.",
                            items: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.STRING
                                }
                            }
                        }
                    },
                    // FIX: The 'required' property is not a valid part of the responseSchema for the Google GenAI API.
                    // The model is instructed by the prompt and schema structure to return these fields.
                    // required: ['headers', 'rows'],
                },
            },
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        // FIX: Improved response parsing and data mapping.
        if (result && Array.isArray(result.headers) && Array.isArray(result.rows)) {
            const { headers, rows } = result as { headers: string[], rows: string[][] };

            if (headers.length === 0 || rows.length === 0) {
                return [];
            }

            const tableData: TableData = rows.map((row: string[]) => {
                const rowObject: TableRow = {};
                headers.forEach((header: string, index: number) => {
                    const value = row[index];
                    if (value === undefined || value === null) {
                        rowObject[header] = '';
                        return;
                    }
                    // Attempt to convert to number if it looks like one, but not for empty strings or non-numeric strings.
                    const trimmedValue = String(value).trim();
                    if (trimmedValue === '') {
                        rowObject[header] = '';
                        return;
                    }
                    const numValue = Number(trimmedValue);
                    rowObject[header] = !isNaN(numValue) ? numValue : value;
                });
                return rowObject;
            });
            
            return tableData;

        } else {
            console.error("API response is not in the expected format:", result);
            throw new Error("Could not parse table data from the image. The response format was incorrect.");
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to process the image with the AI model. Details: ${errorMessage}`);
    }
};
