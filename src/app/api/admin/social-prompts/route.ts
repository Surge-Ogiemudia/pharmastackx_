import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import MasterPrompt from '@/models/MasterPrompt';
import User from '@/models/User';

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

// GET — list all master prompts, optionally filtered by category
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const url      = new URL(req.url);
    const category = url.searchParams.get('category');
    const query: any = {};
    if (category) query.category = category;
    const prompts = await MasterPrompt.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ prompts });
  } catch (err) {
    console.error('GET social-prompts error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST — submit a new master prompt and auto-generate 10 composition variations
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { adminId, category, label, basePrompt } = await req.json();

    if (!adminId || !category || !label || !basePrompt) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ message: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // Generate 10 composition variations from the base prompt
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const variationPrompt = `You are a creative director and prompt engineer specialising in social media visual content for pharmacies.

Given this master image prompt:
"${basePrompt}"

Generate exactly 10 variations of this prompt. Each variation MUST:
1. Keep the exact same creative concept, mood, quality level, and visual style as the original
2. Change ONLY the composition: object placement, camera angle, spatial arrangement, visual hierarchy, focal point position
3. Reference specific composition techniques in each: rule of thirds, centred symmetry, diagonal tension, left-heavy, right-heavy, frame-within-frame, leading lines, wide negative space, close crop, bird's eye view, etc.
4. Be a complete, detailed, standalone image generation prompt — not a diff from the original
5. Maintain the same high-end, premium visual quality standard throughout
6. Each should feel like the same talented designer but with a noticeably different layout choice

Return ONLY valid JSON: { "variations": ["full prompt 1", "full prompt 2", "full prompt 3", "full prompt 4", "full prompt 5", "full prompt 6", "full prompt 7", "full prompt 8", "full prompt 9", "full prompt 10"] }`;

    const result     = await model.generateContent(variationPrompt);
    const jsonStr    = extractFirstJSON(result.response.text().trim());
    let variations: string[] = [];

    if (jsonStr) {
      const parsed = JSON.parse(jsonStr);
      variations   = parsed.variations || [];
    }

    // Ensure we have at least some variations, even if generation failed partially
    if (variations.length === 0) variations = [basePrompt];

    const created = await MasterPrompt.create({
      category,
      label,
      basePrompt,
      variations,
      isActive:  true,
      createdBy: adminId,
    });

    return NextResponse.json({ success: true, prompt: created });
  } catch (err) {
    console.error('POST social-prompts error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE — deactivate (soft delete) a master prompt
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { promptId, adminId } = await req.json();

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    await MasterPrompt.findByIdAndUpdate(promptId, { isActive: false });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE social-prompts error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
