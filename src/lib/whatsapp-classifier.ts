import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
    model: "gemma-4-26b-a4b-it",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
    }
});

const SYSTEM_PROMPT = `
ACT AS A RAW DATA PROCESSOR for PharmaStackX. 
Analyze the WhatsApp message and return ONLY a valid JSON object.
DO NOT include any markdown, code blocks, or conversational text.
DO NOT INCLUDE REASONING, CHAIN OF THOUGHT, OR ANY TEXT OUTSIDE THE JSON STARTING WITH '{' AND ENDING WITH '}'.

SCHEMA:
{
  "isDrugRequest": boolean,
  "medicines": [{
    "name": "string",
    "strength": "string or null",
    "form": "string or null",
    "quantity": number or null,
    "unit": "string or null"
  }],
  "location": "string or null",
  "urgency": "urgent or normal",
  "confidence": 0.0 to 1.0,
  "rawText": "string"
}

LOCATION RULE:
If no location is in the message, use the provided Group Name.
If not a drug request, return: {"isDrugRequest": false}
`;

const IMAGE_PROMPT = `
Analyze this prescription image and return ONLY a valid JSON object.
DO NOT include any markdown or text outside the JSON.

SCHEMA:
{
  "isDrugRequest": true,
  "medicines": [{ "name": "string", "strength": "string", "form": "string", "quantity": number, "unit": "string" }],
  "location": "string or null",
  "urgency": "urgent or normal",
  "confidence": 0.0 to 1.0
}
`;

function cleanJson(text: string) {
    if (!text) return "{}";
    
    // Find all top-level { ... } blocks using balanced brace matching
    const results: string[] = [];
    let braceCount = 0;
    let start = -1;
    
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
            if (braceCount === 0) start = i;
            braceCount++;
        } else if (text[i] === '}') {
            braceCount--;
            if (braceCount === 0 && start !== -1) {
                results.push(text.substring(start, i + 1));
                start = -1;
            }
        }
    }

    // If we found multiple top-level objects, pick the last one (usually the final answer)
    if (results.length > 0) {
        return results[results.length - 1];
    }
    
    // Fallback to simple strip if no balanced braces found
    return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

export async function classifyWhatsAppMessage(text: string, chat_name?: string) {
    try {
        const result = await model.generateContent([
            { text: SYSTEM_PROMPT + `\n\nCONTEXT:\n- WhatsApp Group Name: "${chat_name || 'Unknown'}"` },
            { text: `MESSAGE TO ANALYZE: "${text}"` }
        ]);
        
        const responseText = result.response.text();
        console.log("🤖 [Classifier Response]:", responseText);
        const jsonContent = cleanJson(responseText);
        return JSON.parse(jsonContent);
    } catch (error) {
        console.error("AI Classification Error:", error);
        return { isDrugRequest: false, error: "Classification failed" };
    }
}

export async function classifyWhatsAppImage(base64Data: string, chat_name?: string) {
    try {
        const generationModel = genAI.getGenerativeModel({ 
            model: "gemma-4-26b-a4b-it", 
            generationConfig: { responseMimeType: "application/json" } 
        });

        const result = await generationModel.generateContent([
            IMAGE_PROMPT + `\n\nCONTEXT: WhatsApp Group Name: "${chat_name || 'Unknown'}"`,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg",
                },
            },
        ]);

        const responseText = result.response.text();
        console.log("🤖 [Image Classifier Response]:", responseText);
        const jsonContent = cleanJson(responseText);
        return JSON.parse(jsonContent);
    } catch (error) {
        console.error("AI Image Classification Error:", error);
        return { isDrugRequest: false, error: "Image classification failed" };
    }
}
