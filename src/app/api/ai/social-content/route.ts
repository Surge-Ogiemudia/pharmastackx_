import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// Walk from the first '{' to its matching '}', ignoring nested braces inside strings.
function extractFirstJSON(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
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
  const { category, detail, pharmacyName, storeUrl, tagline, photoTags } = await req.json();

  if (!category || !pharmacyName) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
    return NextResponse.json({ message: 'AI service not configured' }, { status: 503 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemma-4-26b-a4b-it' });

  const prompt = `You are a social media content creator for Nigerian pharmacies.
Generate a social media post for a pharmacy called "${pharmacyName}"${tagline ? ` with tagline "${tagline}"` : ''}.
Their store URL is ${storeUrl || `${pharmacyName.toLowerCase().replace(/\s/g, '')}.psx.ng`}.

Post category: ${category}
${detail ? `Additional detail: ${detail}` : ''}
${photoTags?.length ? `Available photo types in their library: ${photoTags.join(', ')}` : ''}

Generate a post that feels authentic, warm, and professional for a Nigerian pharmacy audience.
Use Nigerian English naturally where appropriate. Keep it relatable and trustworthy.

Return ONLY a single valid JSON object — no markdown, no explanation, nothing else:
{
  "headline": "short punchy headline, max 6 words, ALL CAPS",
  "caption": "2-3 sentence caption, warm and engaging, ends with a subtle call to action",
  "hashtags": ["array", "of", "5-8", "relevant", "hashtags", "no", "hash", "symbol"],
  "suggestedPhotoTag": "one of: staff | store | product | event | other",
  "colorMood": "one of: energetic | calm | warm | bold | fresh"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = extractFirstJSON(text);
    if (!jsonStr) {
      console.error('No JSON found in model response:', text.slice(0, 300));
      throw new Error('Model did not return JSON');
    }
    const content = JSON.parse(jsonStr);
    return NextResponse.json(content);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Social content generation error:', msg);
    return NextResponse.json({ message: `Generation failed: ${msg}` }, { status: 500 });
  }
}
