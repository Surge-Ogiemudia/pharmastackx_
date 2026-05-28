import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { text, url } = await req.json();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Gemini API Key on Vercel Backend' }, { status: 500 });
    }

    const geminiClient = new GoogleGenerativeAI(apiKey);
    const model = geminiClient.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
    const prompt = `System Instruction: You are an expert data scraper. I am providing you the raw text extracted from a Pharmacy POS inventory webpage.
Your job is to semantically parse this text and find the medication inventory data.
Extract all medications, their quantities, and their prices.

URL Context: ${url}

Webpage Text:
${text.substring(0, 15000)}

Output Requirements:
Return ONLY a valid JSON object containing:
- "schema": An object with "nameCol", "qtyCol", and "priceCol" mapping the generic fields to the actual terminology found on the page (e.g. "Product Name", "Stock Level", "Retail Price").
- "sample": An array of up to 5 JSON objects representing the first few medications found, using the exact column names you identified in the schema.

Do not wrap the JSON in markdown code blocks. Return purely the JSON string.`;

    const result = await model.generateContent(prompt);
    let aiResponse = result.response.text().trim();
    
    // Clean up markdown just in case
    if (aiResponse.startsWith('```json')) aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    if (aiResponse.startsWith('```')) aiResponse = aiResponse.replace(/```/g, '').trim();

    let parsedData;
    try {
      parsedData = JSON.parse(aiResponse);
    } catch (e) {
      console.error("AI returned malformed JSON object:", aiResponse);
      return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 500 });
    }

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error('Error in scrape-pos route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
