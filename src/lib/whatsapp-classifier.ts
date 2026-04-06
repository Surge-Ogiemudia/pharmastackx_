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
You are a medicine request classifier for PharmaStackX, a Nigerian medicine discovery platform. 
Your job is to analyze WhatsApp messages from Nigerian pharmacist group chats and determine if they contain medicine requests. 

LOCATION EXTRACTION RULE:
You MUST accurately identify the "location" (State or City). Look closely at the WhatsApp Group Name. If the group name contains a Nigerian State (e.g., Lagos, Abuja, Edo, Rivers, Delta, Kano, Enugu, Oyo, Ogun, Anambra) or City, set the "location" to that State/City. Only override this if the sender explicitly specifies a different city/state inside the message itself.

PHARMACIST REQUEST PATTERNS:
- "Drug search Betahistine 8mg"
- "I’m looking for ketorolac tablet o"
- "Good Afternoon.... Please who has Zinnat suspension..... Abeg 🙏🙏"
- "Urgent Drug Search‼️‼️ *Flixonase suspension*"
- "Drug Search. Tab. Ursodiol (Ursodeoxycholic acid) 250mg or 300mg. Tab. Duodart"
- "Drug Search... Cap. Ampiflux or Flumox"

Extract and return ONLY this JSON:
{
  "isDrugRequest": boolean,
  "medicines": [{
    "name": "string",
    "strength": "string or null",
    "form": "tablet/syrup/injection/etc or null",
    "quantity": number or null,
    "unit": "strips/vials/bottles/etc or null"
  }],
  "location": "city or state mentioned or null",
  "urgency": "urgent or normal",
  "confidence": 0.0 to 1.0,
  "rawText": "string"
}

If it is NOT a drug request (e.g., general chat, football talk, vacancies, or adverts), return only: {"isDrugRequest": false}.
`;

const IMAGE_PROMPT = `
You are an expert pharmacist for PharmaStackX. 
Analyze this prescription image and extract all medications. 
Extract the following for each medicine:
- name: The medicine's brand or generic name.
- strength: The dose (e.g., '500mg', '10mg/5ml').
- form: One of ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Inhaler"].
- quantity: The total amount prescribed (as a number).
- unit: One of ["Strips", "Packs", "Bottles", "Vials", "Sachets", "Pieces"]. Pick the most appropriate packaging unit.

Return ONLY this JSON format:
{
  "isDrugRequest": true,
  "medicines": [{ "name": "string", "strength": "string", "form": "string", "quantity": number, "unit": "string" }],
  "location": "Infer if possible from stamps or text, otherwise null",
  "urgency": "urgent or normal",
  "confidence": 0.0 to 1.0
}
`;

export async function classifyWhatsAppMessage(text: string, chat_name?: string) {
    try {
        const result = await model.generateContent([
            { text: SYSTEM_PROMPT + `\n\nCONTEXT:\n- WhatsApp Group Name: "${chat_name || 'Unknown'}"\n- Rule: If the message has no location, infer it from the Group Name (e.g., "Lagos Pharm" -> "Lagos").` },
            { text: `Analyze this message: "${text}"` }
        ]);
        
        const responseText = result.response.text();
        return JSON.parse(responseText);
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
        return JSON.parse(responseText);
    } catch (error) {
        console.error("AI Image Classification Error:", error);
        return { isDrugRequest: false, error: "Image classification failed" };
    }
}
