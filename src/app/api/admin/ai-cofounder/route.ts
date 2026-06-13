import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pusherServer } from '@/lib/pusher';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Optional: Add strict admin role checking here.

    const { targetPharmacySlug, naturalLanguageCommand } = await req.json();

    if (!targetPharmacySlug || !naturalLanguageCommand) {
      return NextResponse.json({ error: 'Missing slug or command' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Gemini API Key' }, { status: 500 });
    }

    const geminiClient = new GoogleGenerativeAI(apiKey);
    const model = geminiClient.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: `You are the Omni-Node AI Co-Founder for PharmastackX.
Your job is to translate natural language commands into safe, executable JavaScript that runs securely on the Synkk desktop client.

You have access to the following globals in the execution sandbox:
- require (to load built-in Node modules like 'fs', 'path')
- fetch
- __omniResolve(result) -> MUST BE CALLED with the final result object or string when finished.
- __omniReject(error)
- electron.BrowserWindow

RULES:
1. Output ONLY valid JavaScript code. NO markdown wrapping (no \`\`\`javascript).
2. Do NOT write destructive code outside of the AppData/synkk folder.
3. ALWAYS call __omniResolve(data) at the end of your script to send the ACK back to the dashboard.

Example Output:
const fs = require('fs');
const data = fs.readdirSync('C:/');
__omniResolve({ success: true, files: data });`
    });

    // 1. Generate the JS payload via Gemini
    console.log(`[AI-CoFounder] Generating script for command: "${naturalLanguageCommand}"`);
    const prompt = `Write a JS script for the Omni-Node to achieve this: ${naturalLanguageCommand}`;
    const result = await model.generateContent(prompt);
    
    let generatedScript = result.response.text().trim();
    if (generatedScript.startsWith('```javascript')) {
      generatedScript = generatedScript.replace(/```javascript/g, '').replace(/```/g, '').trim();
    } else if (generatedScript.startsWith('```')) {
      generatedScript = generatedScript.replace(/```/g, '').trim();
    }

    console.log(`[AI-CoFounder] Generated script:\n${generatedScript}`);

    // 2. Push the payload to the specific pharmacy via Pusher
    const commandId = uuidv4();
    const payload = {
      id: commandId,
      command: 'execute_script',
      payload: {
        script: generatedScript
      },
      timestamp: new Date().toISOString()
    };

    await pusherServer.trigger(`pharmacy-${targetPharmacySlug}`, 'remote-command', payload);

    return NextResponse.json({ 
      status: 'success', 
      message: 'Command translated and pushed to Omni-Node successfully.',
      commandId,
      script: generatedScript
    });

  } catch (error: any) {
    console.error('[AI-CoFounder] Error generating/pushing script:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
