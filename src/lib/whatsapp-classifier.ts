import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
    }
});

const SYSTEM_PROMPT = `
You are a medicine request classifier for PharmaStackX, a Nigerian medicine discovery platform. 
Your job is to analyze WhatsApp messages from Nigerian pharmacist group chats and determine if they contain medicine requests. 

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
