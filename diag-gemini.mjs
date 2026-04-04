import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function diag() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    
    console.log(`🚀 Diagnostic Fetch to: ${url.replace(key, "AIza...")}`);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hi" }] }]
            })
        });
        
        console.log(`📡 Status: ${response.status} ${response.statusText}`);
        const data = await response.json();
        console.log(`📦 Response:`, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`❌ Fetch Error:`, e.message);
    }
}

diag();
