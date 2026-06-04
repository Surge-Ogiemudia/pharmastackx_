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

    // 2. Generate image — capture exact failure reason for frontend display
    let imageUrl  = '';
    let imageError = '';
    try {
      const imgPrompts: Record<string, string> = {
        'Medicine Spotlight': `Create a bold, editorial-style 1:1 social media graphic. Style: clean flat-lay on a solid deep green background. Show ONE featured medicine or supplement product — styled artistically, not like a stock photo. Add a subtle decorative element like a leaf or geometric shape. The pharmacy name "${pharmacy.businessName}" should appear as small elegant text in one corner. No cluttered shelves, no multiple products, no stock photography look. Modern, minimalist, Instagram-worthy.`,

        'Health Awareness': `Create an uplifting, warm 1:1 social media graphic about health and wellness. Style: lifestyle illustration or soft-focus photography feel with a calming colour palette — greens, soft yellows, warm neutrals. Show a human element — hands holding fruit, someone walking, a warm cup of tea, or a simple wellness symbol. The pharmacy name "${pharmacy.businessName}" as small subtle text. No clinical or hospital imagery. Should feel encouraging and human, not medical.`,

        'Low Stock Alert': `Create an urgent but visually clean 1:1 social media graphic. Style: bold typography-focused design with a warm amber or orange accent colour on dark background. Show a simple icon or minimal graphic of the featured product type. Add a sense of urgency through colour and composition — not through scary imagery. The pharmacy name "${pharmacy.businessName}" in small text. Clean, modern, punchy. Think bold brand announcement, not warning label.`,

        'Human Moment': `Create a warm, community-focused 1:1 social media graphic. Style: candid lifestyle feel — a pharmacist helping a customer, a family, an elderly person being cared for, or a moment of human connection in a pharmacy setting. Warm lighting, real emotions, Nigerian context if possible — dark skin tones, local setting. The pharmacy name "${pharmacy.businessName}" as small elegant text overlay. Should feel genuine and heartwarming, not staged or stock-photo-like.`,
      };

      const imagePrompt = imgPrompts[category] ?? `Create a vibrant, modern 1:1 social media graphic for "${pharmacy.businessName}" pharmacy. Bold colours, clean design, professional. Instagram-worthy.`;

      const imgModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image' });
      const imgRes   = await (imgModel as any).generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: imagePrompt }],
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      });

      const candidates = imgRes.response.candidates ?? [];
      const parts      = candidates[0]?.content?.parts ?? [];
      const imgPart    = parts.find((p: any) => p.inlineData);
      const textPart   = parts.find((p: any) => p.text);
      const finishReason = candidates[0]?.finishReason ?? '';
      const safetyRatings = candidates[0]?.safetyRatings ?? [];

      console.log(`[generate-image] category="${category}" candidates=${candidates.length} parts=${parts.length} hasImage=${!!imgPart} finishReason=${finishReason}`);

      if (imgPart?.inlineData) {
        try {
          imageUrl = await uploadBase64ToBlob(
            imgPart.inlineData.data,
            imgPart.inlineData.mimeType,
            `social/${pharmacyId}/${Date.now()}.jpg`
          );
        } catch (blobErr: any) {
          imageError = `Blob upload failed: ${blobErr?.message ?? String(blobErr)}`;
          console.error('[generate-post] Blob error:', imageError);
        }
      } else {
        // Build a human-readable reason
        if (finishReason && finishReason !== 'STOP') {
          imageError = `Model stopped: ${finishReason}`;
        } else if (textPart?.text) {
          imageError = `Model returned text instead of image: "${textPart.text.slice(0, 120)}"`;
        } else if (candidates.length === 0) {
          imageError = 'Model returned no candidates — likely a quota or billing issue.';
        } else {
          imageError = `Model returned ${parts.length} part(s) but none contained image data.`;
        }

        const blocked = safetyRatings.filter((r: any) => r.blocked);
        if (blocked.length) {
          imageError += ` Blocked by safety filter: ${blocked.map((r: any) => r.category).join(', ')}.`;
        }
        console.error('[generate-image] No image data:', imageError);
      }
    } catch (e: any) {
      imageError = e?.message ?? String(e);
      console.error('Image gen threw:', imageError);
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

    return NextResponse.json({ success: true, post, imageError: imageError || null });
  } catch (error) {
    console.error('generate-post error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
