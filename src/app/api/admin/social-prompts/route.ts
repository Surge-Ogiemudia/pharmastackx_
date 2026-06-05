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
    const { adminId, category, label, basePrompt, isNewMonth } = await req.json();

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

    // Generate 5 composition variations (reduced from 10 to stay within timeout)
    // The prompt is saved regardless — variations failing is non-fatal
    let variations: string[] = [];
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

      const variationPrompt = `You are a creative director specialising in social media visuals for pharmacies.

Given this master image prompt:
"${basePrompt}"

Generate exactly 5 variations. Each must:
1. Keep the exact same creative concept, mood and quality as the original
2. Change ONLY composition: object placement, camera angle, spatial layout, focal point
3. Name the specific composition technique used (rule of thirds, centred, diagonal, leading lines, etc.)
4. Be a complete standalone prompt — not a diff
5. Same premium quality standard throughout

Return ONLY valid JSON: { "variations": ["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5"] }`;

      const result  = await model.generateContent(variationPrompt);
      const jsonStr = extractFirstJSON(result.response.text().trim());
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        variations   = (parsed.variations || []).filter(Boolean);
      }
    } catch (varErr) {
      console.error('Variation generation failed (non-fatal):', varErr);
    }

    // Always fall back to base prompt if variations failed
    if (variations.length === 0) variations = [basePrompt];

    // If marking as new month, clear the flag on all other prompts first
    if (isNewMonth) await MasterPrompt.updateMany({}, { isNewMonth: false });

    const created = await MasterPrompt.create({
      category,
      label,
      basePrompt,
      variations,
      isActive:   true,
      isNewMonth: isNewMonth === true,
      createdBy:  adminId,
    });

    return NextResponse.json({ success: true, prompt: created });
  } catch (err) {
    console.error('POST social-prompts error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH — toggle isNewMonth flag on a prompt
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const { promptId, adminId, isNewMonth } = await req.json();
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }
    // Only one prompt should be marked as new month — clear others first
    if (isNewMonth) await MasterPrompt.updateMany({}, { isNewMonth: false });
    const updated = await MasterPrompt.findByIdAndUpdate(promptId, { isNewMonth }, { new: true });
    return NextResponse.json({ success: true, prompt: updated });
  } catch (err) {
    console.error('PATCH social-prompts error:', err);
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
