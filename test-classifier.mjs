import { classifyWhatsAppMessage } from './src/lib/whatsapp-classifier.js';
import dotenv from 'dotenv';
dotenv.config();

const testMessages = [
    "Good morning fam. Drug search - Catacure eye drop. Please kindly dm if you have",
    "Chelsea fans Una dey watch match so ?",
    "Urgent Drug Search‼️‼️ *Flixonase suspension* Kindly indicate availability pls. Thanks.",
    "Wholesale please 🙏🏾 Tetanus Toxoid vaccine(for newly delivered women). Please kindly indicate if available.",
    "I just dey preserve my virginity.. Calibacy is the way✅✅✅✅",
    "Drug Search... Cap. Ampiflux or Flumox"
];

async function runTest() {
    console.log("🚀 Testing WhatsApp Classifier (ESM mode)...\n");
    for (const msg of testMessages) {
        console.log(`💬 Message: "${msg}"`);
        try {
            const result = await classifyWhatsAppMessage(msg);
            console.log(`🤖 AI Result: ${JSON.stringify(result, null, 2)}\n`);
        } catch (e) {
            console.error(`❌ Error classifying: ${e.message}`);
        }
    }
}

runTest();
