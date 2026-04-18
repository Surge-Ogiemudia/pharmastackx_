import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    try {
        // Raw fetch to list models
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            console.error("❌ Error listing models:", JSON.stringify(data.error, null, 2));
        } else {
            console.log("✅ Available Models:");
            data.models.forEach(m => console.log(` - ${m.name} (${m.supportedGenerationMethods})`));
        }
    } catch (e) {
        console.error("❌ Fatal Error:", e.message);
    }
}

listModels();
