import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { category, detail, pharmacyName, storeUrl, tagline, photoTags, tone } = await req.json();

  if (!category || !pharmacyName) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
    return NextResponse.json({ message: 'AI service not configured' }, { status: 503 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a social media content creator for Nigerian pharmacies.
Generate a social media post for a pharmacy called "${pharmacyName}"${tagline ? ` with tagline "${tagline}"` : ''}.
Their store URL is ${storeUrl || `${pharmacyName.toLowerCase().replace(/\s/g, '')}.psx.ng`}.

Post category: ${category}
${detail ? `Additional detail: ${detail}` : ''}
${photoTags?.length ? `Available photo types in their library: ${photoTags.join(', ')}` : ''}
${tone ? `Tone / angle for this variation: ${tone}` : ''}

Generate a post that feels authentic, warm, and professional for a Nigerian pharmacy audience.
Use Nigerian English naturally where appropriate. Keep it relatable and trustworthy.
Make this post feel distinctly different from other variations — different angle, different words.

Return ONLY valid JSON in this exact format:
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
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON in Gemini response:', text.slice(0, 200));
      throw new Error('No JSON in response');
    }
    const content = JSON.parse(jsonMatch[0]);
    return NextResponse.json(content);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Social content generation error:', msg);
    return NextResponse.json({ message: `Generation failed: ${msg}` }, { status: 500 });
  }
}
