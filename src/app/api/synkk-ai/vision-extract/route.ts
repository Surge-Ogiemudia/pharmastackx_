import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 120;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { screenshot, context, previousItems } = await req.json();

    if (!screenshot) {
      return NextResponse.json({ error: 'screenshot is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt = `You are looking at a screenshot of a pharmacy POS (Point of Sale) inventory screen.

Extract ALL medicine/product items visible on this screen. For each item return:
- name: the product/medicine name (string)
- qty: quantity in stock (number, parse from strings like "178.00 Pieces" → 178)
- price: selling price (number, parse from currency strings like "₦ 10,599.85" → 10599.85)

Return ONLY a JSON object with this exact structure:
{
  "items": [{"name": "...", "qty": 0, "price": 0}, ...],
  "hasMore": true/false
}

Set "hasMore" to true if you can see pagination controls, a scrollbar indicating more data below, or text like "showing 1-20 of 847".
Set "hasMore" to false if this appears to be the complete list.

Do NOT include header rows, action buttons, or empty entries.
Do NOT wrap in markdown code fences.`;

    if (context) {
      prompt += `\n\nAdditional context: ${context}`;
    }

    if (previousItems && previousItems.length > 0) {
      prompt += `\n\nIMPORTANT: We already captured ${previousItems.length} items from previous pages. Do NOT include duplicates. Only extract NEW items visible on this page.`;
    }

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: 'image/png',
          data: screenshot,
        },
      },
    ]);

    const text = result.response.text().trim();
    const cleaned = text
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error('[/api/synkk-ai/vision-extract] Error:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
