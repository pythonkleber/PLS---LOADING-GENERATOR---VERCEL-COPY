import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!process.env.API_KEY) {
        console.error("API_KEY environment variable not set");
        return res.status(500).json({ error: 'Server configuration error: API_KEY is missing.' });
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
        return res.status(400).json({ error: 'Missing image data or mimeType' });
    }

    const textPart = {
        text: `Analyze the table in the provided image. Extract all data. Return a single JSON object with two keys: 'headers' and 'rows'.
'headers' should be an array of strings representing the sanitized column headers (e.g., 'Conductor (per phase)' becomes 'conductor_per_phase', and 'V (kips)' becomes 'V_kips').
'rows' should be an array of arrays, where each inner array represents a row of data. All data values in the rows, whether text or numeric, should be represented as strings.
If no table is found, return an object with empty 'headers' and 'rows' arrays.`,
    };

    const imagePart = {
        inlineData: {
            mimeType: mimeType,
            data: image,
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
                },
            },
        });
        
        const text = response.text;
        if (!text) {
            console.error("Gemini API returned an empty or undefined text response.");
            return res.status(500).json({ error: "AI model returned an empty response. This may be due to content safety filters or other issues." });
        }
        
        const jsonText = text.trim();
        const result = JSON.parse(jsonText);
        
        return res.status(200).json(result);

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return res.status(500).json({ error: `Failed to process the image with the AI model. Details: ${errorMessage}` });
    }
}
