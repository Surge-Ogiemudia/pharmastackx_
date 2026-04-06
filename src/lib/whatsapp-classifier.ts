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
    // Remove markdown code blocks
    let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Find the LAST actual { ... } block (Gemma 4 sometimes thinks out loud first)
    const lastStartIndex = cleaned.lastIndexOf('{');
    const lastEndIndex = cleaned.lastIndexOf('}');
    
    if (lastStartIndex !== -1 && lastEndIndex !== -1 && lastEndIndex > lastStartIndex) {
        return cleaned.substring(lastStartIndex, lastEndIndex + 1);
    }
    return cleaned;
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
