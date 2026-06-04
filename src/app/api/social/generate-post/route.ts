import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import DailyPost from '@/models/DailyPost';
import { uploadBase64ToBlob } from '@/lib/uploadToBlob';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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
  try {
    await dbConnect();
    const { pharmacyId, scheduledDate, category, tone, showPrices } = await req.json();

    if (!pharmacyId || !scheduledDate || !category) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const pharmacy = await User.findById(pharmacyId);
    if (!pharmacy) return NextResponse.json({ message: 'User not found' }, { status: 404 });
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ message: 'GEMINI_API_KEY not configured' }, { status: 500 });

    const toneMap: Record<string, string> = {
      warm:         'warm, friendly, and approachable',
      professional: 'professional, clinical, and authoritative',
      bold:         'bold, energetic, and attention-grabbing',
    };
    const brandCtx   = pharmacy.brandKit?.tagline ? `Tagline: ${pharmacy.brandKit.tagline}.` : '';
    const contactCtx = `${pharmacy.city || ''} pharmacy, Phone: ${pharmacy.phoneNumber || 'N/A'}`;
    const photosCtx  = pharmacy.socialPhotos?.filter((p: any) => p.description).map((p: any) => p.description).join(', ') || '';
    const toneCtx    = tone ? `Write in a ${toneMap[tone] ?? 'warm and friendly'} tone.` : '';
    const priceCtx   = showPrices ? 'Include specific product prices where relevant.' : 'Do not mention specific prices.';

    const baseCtx = `You are creating social media content for "${pharmacy.businessName || 'Pharmacy'}", a pharmacy in Nigeria. ${contactCtx}. ${brandCtx} ${toneCtx} ${priceCtx} ${photosCtx ? 'Store context: ' + photosCtx : ''}`.trim();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 1. Generate caption + hashtags
    let caption = '', hashtags: string[] = [], videoIdeaText = '';
    const txtModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    try {
      const txtRes = await txtModel.generateContent(
        `${baseCtx}\n\nWrite a short engaging Instagram/Facebook caption for a post about: "${category}".\nReturn ONLY valid JSON: {"caption":"...","hashtags":["tag1","tag2",...],"videoIdea":"one sentence TikTok reel idea"}`
      );
      const json = extractFirstJSON(txtRes.response.text());
      if (json) {
        const d      = JSON.parse(json);
        caption      = d.caption      || '';
        hashtags     = d.hashtags     || [];
        videoIdeaText = d.videoIdea   || '';
      }
    } catch (e) {
      console.error('Caption gen failed:', e);
    }

    // 2. Generate image
    let imageUrl = '';
    try {
      const imgModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image' });
      const imgRes   = await (imgModel as any).generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: `Create a vibrant, professional 1:1 social media graphic for ${pharmacy.businessName || 'a pharmacy'} about: "${category}". Clean design, pharmacy branding, no text overlays.` }],
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      });

      const parts   = imgRes.response.candidates?.[0]?.content?.parts ?? [];
      const imgPart = parts.find((p: any) => p.inlineData);
      console.log(`[generate-post] category="${category}" parts=${parts.length} hasImage=${!!imgPart}`);

      if (imgPart?.inlineData) {
        const uploaded = await uploadBase64ToBlob(
          imgPart.inlineData.data,
          imgPart.inlineData.mimeType,
          `social/${pharmacyId}/${Date.now()}.jpg`
        );
        imageUrl = uploaded ?? '';
      }
    } catch (e) {
      console.error('Image gen failed:', e);
    }

    // 3. Delete any existing post for this date (clean re-generate)
    const dateStart = new Date(scheduledDate);
    const dateEnd   = new Date(dateStart);
    dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);
    await DailyPost.deleteOne({ pharmacyId, scheduledDate: { $gte: dateStart, $lt: dateEnd } });

    // 4. Save post
    const post = await DailyPost.create({
      pharmacyId,
      scheduledDate: dateStart,
      type:          'both',
      status:        'ready_to_post',
      caption,
      hashtags,
      imageUrl,
      videoIdeaText,
      regenCount:    0,
    });

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('generate-post error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
