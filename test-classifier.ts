import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { classifyWhatsAppMessage } from './src/lib/whatsapp-classifier';
console.log("🔑 API Key Loaded:", process.env.GEMINI_API_KEY ? "YES (starts with " + process.env.GEMINI_API_KEY.substring(0, 5) + "...)" : "NO");

const testMessages = [
    "Good morning fam. Drug search - Catacure eye drop. Please kindly dm if you have",
    "Chelsea fans Una dey watch match so ?",
    "Urgent Drug Search‼️‼️ *Flixonase suspension* Kindly indicate availability pls. Thanks.",
    "Wholesale please 🙏🏾 Tetanus Toxoid vaccine(for newly delivered women). Please kindly indicate if available. Wholesale please",
    "Drug search Roliten ... sticker omitted",
    "Drug Search... Cap. Ampiflux or Flumox"
];

async function runTest() {
    console.log("🚀 Testing WhatsApp Classifier (TSX mode)...\n");
    for (const msg of testMessages) {
        console.log(`💬 Message: "${msg}"`);
        try {
            const result = await classifyWhatsAppMessage(msg);
            console.log(`🤖 AI Result: ${JSON.stringify(result, null, 2)}\n`);
        } catch (e: any) {
            console.error(`❌ Error classifying: ${e.message}`);
        }
    }
}

runTest();
