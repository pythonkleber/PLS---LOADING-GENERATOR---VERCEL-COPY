import type { TableData, TableRow } from '../types';

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

    try {
        const apiResponse = await fetch('/api/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: base64Image,
                mimeType: file.type,
            }),
        });

        if (!apiResponse.ok) {
            const errorResult = await apiResponse.json();
            throw new Error(errorResult.error || `API request failed with status ${apiResponse.status}`);
        }

        const result = await apiResponse.json();
        
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
        console.error("Error calling backend API:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to process the image. Details: ${errorMessage}`);
    }
};