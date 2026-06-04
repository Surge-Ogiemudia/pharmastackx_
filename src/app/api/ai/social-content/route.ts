import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

function extractFirstJSON(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { category, detail, pharmacyName, storeUrl, tagline, brandPrimary, brandSecondary, action } = await req.json();

  if (!category || !pharmacyName || !action) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ message: 'AI service not configured' }, { status: 503 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const categoryLabel = category.replace(/_/g, ' ');

  try {
    if (action === 'text') {
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
      const prompt = `You are a social media content creator for Nigerian pharmacies.
Write a social media caption for a pharmacy called "${pharmacyName}"${tagline ? ` with tagline "${tagline}"` : ''}.
Post category: ${categoryLabel}
${detail ? `Topic: ${detail}` : ''}

Return ONLY a single valid JSON object, no markdown, no explanation:
{
  "caption": "2-3 sentence caption, warm and engaging, ends with a subtle call to action",
  "hashtags": ["5-8", "relevant", "hashtags", "no", "hash", "symbol"]
}`;
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();
      const json = extractFirstJSON(raw);
      const data = json ? JSON.parse(json) : { caption: '', hashtags: [] };
      return NextResponse.json(data);
    } 
    
    if (action === 'image') {
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image' });
      const imagePrompt = `Design a stunning, professional social media post image (1:1 square, Instagram-ready) for a Nigerian pharmacy brand.

Pharmacy name: ${pharmacyName}
${tagline ? `Tagline: ${tagline}` : ''}
Store URL: ${storeUrl}
Post theme: ${categoryLabel}
${detail ? `Topic: ${detail}` : ''}
Primary brand colour: ${brandPrimary}
Secondary brand colour: ${brandSecondary}

Visual design requirements:
- The pharmacy name "${pharmacyName}" must appear prominently, spelled exactly as written
- Show "${storeUrl}" at the bottom of the image, small but legible
- Use ${brandPrimary} and ${brandSecondary} as the brand accent colours
- Premium, modern graphic design — clean layout, strong typography, visual hierarchy
- Feels like it was made by a professional designer for a high-end Nigerian pharmacy brand
- No watermarks, no lorem ipsum, no generic clip art
- One bold focal element (colour block, large text, or lifestyle visual) that draws the eye immediately`;

      const result = await (model as any).generateContent({
        contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      });

      const parts = result.response.candidates?.[0]?.content?.parts ?? [];
      const imgPart = parts.find((p: any) => p.inlineData);
      if (!imgPart?.inlineData) throw new Error('No image returned by model');
      
      const { data, mimeType } = imgPart.inlineData;
      return NextResponse.json({ imageData: data, mimeType: mimeType || 'image/jpeg' });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Social post generation error:', msg);
    return NextResponse.json({ message: `Generation failed: ${msg}` }, { status: 500 });
  }
}
