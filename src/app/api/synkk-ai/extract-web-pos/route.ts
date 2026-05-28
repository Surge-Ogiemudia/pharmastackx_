import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { pageText, schema } = await req.json();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Gemini API Key on Vercel Backend' }, { status: 500 });
    }

    const geminiClient = new GoogleGenerativeAI(apiKey);
    const model = geminiClient.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
    
    const prompt = `System Instruction: You are an expert data scraper working for Synkk. 
You are extracting inventory from a Web POS.
Here is the schema mapping we agreed on previously:
${JSON.stringify(schema, null, 2)}

Here is the raw text from the live POS page:
${pageText.substring(0, 15000)}

Extract the medications and return ONLY a JSON array of objects with keys "name", "qty", and "price".
Return NOTHING ELSE. NO markdown.`;

    const response = await model.generateContent(prompt);
    let aiResponse = response.response.text().trim();
    if (aiResponse.startsWith('```json')) aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    if (aiResponse.startsWith('```')) aiResponse = aiResponse.replace(/```/g, '').trim();

    let data;
    try {
      data = JSON.parse(aiResponse);
    } catch (e) {
      console.error("AI returned malformed JSON array:", aiResponse);
      return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in extract-web-pos route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
