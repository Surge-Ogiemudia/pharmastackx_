import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import DailyPost from '@/models/DailyPost';
import MasterPrompt from '@/models/MasterPrompt';
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

// Fallback prompts used when no master prompts exist for a category
const FALLBACK_PROMPTS: Record<string, string> = {
  'Medicine Spotlight': `A single amber prescription bottle with a clean white label stands centered on a rich forest-green surface. Shot from a 45-degree elevated angle. Soft natural light from upper-left casts a gentle shadow. Beside the bottle, exactly three small white circular pills arranged in a loose diagonal. Background is solid deep green with a barely-visible subtle grid texture. Ultra-clean, premium editorial product photography. Negative space fills 40% of the frame. No cluttered shelves. 1:1 square format.`,

  'Health Awareness': `Close-up of warm dark-skinned hands — one elderly, one young — gently clasped together on a soft cream fabric surface. Warm golden afternoon light. Shallow depth of field, background softly blurred into warm amber. Small sprig of green leaves in the lower-left corner. No medical equipment, no clinical setting. Documentary warmth. Nigerian context — dark skin tones, a local story. 1:1 square format.`,

  'Low Stock Alert': `Bold typographic poster. Stark dark background. A single product silhouette centered with dramatic spotlight illumination. Three bold horizontal amber/orange bars slice behind the product creating urgency and visual tension. High contrast. Clean graphic design energy — not photographic realism. Feels like a luxury brand announcing a limited drop. 70% bold negative space. 1:1 square format.`,

  'Human Moment': `Candid scene at a pharmacy counter in Nigeria. A pharmacist in a neat white coat leans slightly forward, speaking warmly to a middle-aged woman in colourful ankara. Both in frame, eye contact between them. Pharmacy interior softly blurred behind them. Warm fluorescent with natural side light. Genuine human connection — not posed. Rich warm skin tones, lifted shadows. 1:1 square format.`,
};

function buildPersonalisedPrompt(variation: string, pharmacy: any): string {
  const primary    = pharmacy.brandKit?.primaryColor   || '#0F6E56';
  const secondary  = pharmacy.brandKit?.secondaryColor || '#C84B8F';
  const city       = pharmacy.city       || 'Nigeria';
  const tagline    = pharmacy.brandKit?.tagline || '';
  const name       = pharmacy.businessName || 'Pharmacy';
  const photosCtx  = pharmacy.socialPhotos
    ?.filter((p: any) => p.description)
    .map((p: any) => p.description)
    .join(', ') || '';

  return `${variation}

PHARMACY PERSONALISATION — apply naturally, do not force:
- Pharmacy name: "${name}" — appear as small elegant text in one corner only
- Dominant brand colour: ${primary} — use as background, surface, or key accent
- Secondary accent colour: ${secondary} — use sparingly for highlights or contrast elements
- Location context: ${city}, Nigeria
${tagline ? `- Brand tagline: "${tagline}"` : ''}
${photosCtx ? `- Store visual context (for mood reference only): ${photosCtx}` : ''}

Keep the exact composition described above. Only adapt colours and branding identity to this specific pharmacy.`;
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
    const brandCtx  = pharmacy.brandKit?.tagline ? `Tagline: ${pharmacy.brandKit.tagline}.` : '';
    const contactCtx = `${pharmacy.city || ''} pharmacy`;
    const photosCtx  = pharmacy.socialPhotos?.filter((p: any) => p.description).map((p: any) => p.description).join(', ') || '';
    const toneCtx   = tone ? `Write in a ${toneMap[tone] ?? 'warm and friendly'} tone.` : '';
    const priceCtx  = showPrices ? 'Include specific product prices where relevant.' : 'Do not mention specific prices.';

    const baseCtx = `You are creating social media content for "${pharmacy.businessName || 'Pharmacy'}", a pharmacy in Nigeria. ${contactCtx}. ${brandCtx} ${toneCtx} ${priceCtx} ${photosCtx ? 'Store context: ' + photosCtx : ''}`.trim();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 1. Caption + hashtags
    let caption = '', hashtags: string[] = [], videoIdeaText = '';
    try {
      const txtModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
      const txtRes   = await txtModel.generateContent(
        `${baseCtx}\n\nWrite a short engaging Instagram/Facebook caption for a "${category}" post.\nReturn ONLY valid JSON: {"caption":"...","hashtags":["tag1","tag2",...],"videoIdea":"one sentence TikTok reel idea"}`
      );
      const json = extractFirstJSON(txtRes.response.text());
      if (json) {
        const d       = JSON.parse(json);
        caption       = d.caption   || '';
        hashtags      = d.hashtags  || [];
        videoIdeaText = d.videoIdea || '';
      }
    } catch (e) { console.error('Caption gen failed:', e); }

    // 2. Select image prompt — master prompt system with fallback
    let imagePrompt = '';
    try {
      const masters = await MasterPrompt.find({ category, isActive: true });
      if (masters.length > 0) {
        // Pick a random master prompt
        const master     = masters[Math.floor(Math.random() * masters.length)];
        const pool       = master.variations.length > 0 ? master.variations : [master.basePrompt];
        const variation  = pool[Math.floor(Math.random() * pool.length)];
        imagePrompt      = buildPersonalisedPrompt(variation, pharmacy);
        console.log(`[generate-post] Using master prompt "${master.label}" (${master._id}), variation ${pool.indexOf(variation) + 1}/${pool.length}`);
      } else {
        // No master prompts yet — use hardcoded fallback with basic personalisation
        const base  = FALLBACK_PROMPTS[category] ?? FALLBACK_PROMPTS['Medicine Spotlight'];
        imagePrompt = buildPersonalisedPrompt(base, pharmacy);
        console.log(`[generate-post] No master prompts for "${category}", using fallback`);
      }
    } catch (e) {
      console.error('Master prompt fetch failed, using fallback:', e);
      imagePrompt = buildPersonalisedPrompt(FALLBACK_PROMPTS[category] ?? FALLBACK_PROMPTS['Medicine Spotlight'], pharmacy);
    }

    // 3. Generate image
    let imageUrl   = '';
    let imageError = '';
    try {
      const imgModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image' });
      const imgRes   = await (imgModel as any).generateContent({
        contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      });

      const candidates   = imgRes.response.candidates ?? [];
      const parts        = candidates[0]?.content?.parts ?? [];
      const imgPart      = parts.find((p: any) => p.inlineData);
      const textPart     = parts.find((p: any) => p.text);
      const finishReason = candidates[0]?.finishReason ?? '';
      const blocked      = (candidates[0]?.safetyRatings ?? []).filter((r: any) => r.blocked);

      console.log(`[generate-post] image: category="${category}" hasImage=${!!imgPart} finishReason=${finishReason}`);

      if (imgPart?.inlineData) {
        try {
          imageUrl = await uploadBase64ToBlob(
            imgPart.inlineData.data,
            imgPart.inlineData.mimeType,
            `social/${pharmacyId}/${Date.now()}.jpg`
          );
        } catch (blobErr: any) {
          imageError = `Blob upload failed: ${blobErr?.message ?? String(blobErr)}`;
        }
      } else {
        if (finishReason && finishReason !== 'STOP') {
          imageError = `Model stopped: ${finishReason}`;
        } else if (textPart?.text) {
          imageError = `Model returned text instead of image: "${textPart.text.slice(0, 120)}"`;
        } else if (candidates.length === 0) {
          imageError = 'Model returned no candidates — likely a quota or billing issue.';
        } else {
          imageError = `Model returned ${parts.length} part(s) but none contained image data.`;
        }
        if (blocked.length) imageError += ` Safety filter blocked: ${blocked.map((r: any) => r.category).join(', ')}.`;
        console.error('[generate-post] No image data:', imageError);
      }
    } catch (e: any) {
      imageError = e?.message ?? String(e);
      console.error('Image gen threw:', imageError);
    }

    // 4. Delete any existing post for this date, then save
    const dateStart = new Date(scheduledDate);
    const dateEnd   = new Date(dateStart);
    dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);
    await DailyPost.deleteOne({ pharmacyId, scheduledDate: { $gte: dateStart, $lt: dateEnd } });

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
