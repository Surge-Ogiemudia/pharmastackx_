import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { allFolders } = await req.json();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Gemini API Key on Vercel Backend' }, { status: 500 });
    }

    const geminiClient = new GoogleGenerativeAI(apiKey);
    const model = geminiClient.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
    const prompt = `System Instruction: You are an expert IT system scanner. I am going to give you a list of installed program folders on a user's Windows computer. 
Your job is to identify which of these folders are highly likely to contain Point of Sale (POS), Pharmacy Management, or retail inventory software (for example: VirtualRx, Square, PioneerRx, Rx30, Liberty, etc. but could be ANY unknown POS).
Return ONLY a valid JSON array of strings containing the exact folder names you identified. No markdown wrapping. If none match, return [].

Folders:
${JSON.stringify(allFolders)}`;

    const result = await model.generateContent(prompt);
    let aiResponse = result.response.text().trim();
    
    // Clean up markdown just in case
    if (aiResponse.startsWith('```json')) aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    if (aiResponse.startsWith('```')) aiResponse = aiResponse.replace(/```/g, '').trim();

    let identifiedFolders: string[] = [];
    try {
      identifiedFolders = JSON.parse(aiResponse);
    } catch (e) {
      console.error("AI returned malformed JSON array:", aiResponse);
      return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 500 });
    }

    return NextResponse.json({ identifiedFolders });

  } catch (error: any) {
    console.error('Error in scan-pos route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
