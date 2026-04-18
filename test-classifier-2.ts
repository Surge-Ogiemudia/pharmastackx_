import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Must import after dotenv
import { classifyWhatsAppMessage } from './src/lib/whatsapp-classifier.ts';

async function test() {
    const chatName = "Psx test Edo state";
    const text = "Sirdalud needed";
    
    console.log(`Testing classifier...`);
    console.log(`Chat Name: "${chatName}"`);
    console.log(`Text: "${text}"\n`);
    
    try {
        const result = await classifyWhatsAppMessage(text, chatName);
        console.log("AI Result:", JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("Test failed", err);
    }
}

test();
