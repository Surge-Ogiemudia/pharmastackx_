import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import DailyPost from '@/models/DailyPost';
import Product from '@/models/Product';
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

function clean(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  return ['N/A', 'n/a', 'NA', 'null', 'undefined'].includes(s) ? '' : s;
}

function sanitiseTokens(prompt: string, data: Record<string, string>): string {
  let out = prompt;
  for (const [token, val] of Object.entries(data)) {
    out = out.split(token).join(val);
  }
  return out.replace(/\{\{[^}]+\}\}/g, '').replace(/\{[A-Z_]{3,}\}/g, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { pharmacyId, customPrompt, attachments } = await req.json();
    // attachments: Array<{ data: string; mimeType: string }> — base64 images for context

    if (!pharmacyId || !customPrompt?.trim()) {
      return NextResponse.json({ message: 'Missing pharmacyId or customPrompt' }, { status: 400 });
    }

    const pharmacy = await User.findById(pharmacyId);
    if (!pharmacy) return NextResponse.json({ message: 'User not found' }, { status: 404 });
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ message: 'GEMINI_API_KEY not configured' }, { status: 500 });

    // ── Check weekly special request limit (1 per week) ───────────────────────
    const now   = new Date();
    const day   = now.getUTCDay();
    const diff  = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
    const weekEnd   = new Date(weekStart); weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

    const existingSpecial = await DailyPost.findOne({
      pharmacyId,
      isSpecialRequest: true,
      scheduledDate: { $gte: weekStart, $lt: weekEnd },
    });
    if (existingSpecial) {
      return NextResponse.json({ message: 'Special request limit reached (1 per week).' }, { status: 429 });
    }

    // ── Pharmacy data ─────────────────────────────────────────────────────────
    const pd = {
      name:           clean(pharmacy.businessName) || 'Pharmacy',
      url:            pharmacy.slug ? `${pharmacy.slug}.psx.ng` : 'psx.ng',
      phone:          clean(pharmacy.phoneNumber),
      city:           clean(pharmacy.city) || 'Nigeria',
      primaryColor:   pharmacy.brandKit?.primaryColor   || '#0F6E56',
      secondaryColor: pharmacy.brandKit?.secondaryColor || '#C84B8F',
      tagline:        clean(pharmacy.brandKit?.tagline),
    };

    // ── Published stock (for reference only) ─────────────────────────────────
    let stock = await Product.find({ businessName: pharmacy.businessName, isPublished: true, quantity: { $gt: 0 } })
      .select('itemName activeIngredient').limit(30).lean();
    if (stock.length === 0 && pharmacy.slug) {
      stock = await Product.find({ slug: pharmacy.slug, isPublished: true, quantity: { $gt: 0 } })
        .select('itemName activeIngredient').limit(30).lean();
    }
    const stockList = stock.map(p => { const s = clean(p.activeIngredient); return `${clean(p.itemName)}${s ? ` (${s})` : ''}`; }).join(', ') || 'no published stock';

    const tokenMap: Record<string, string> = {
      '{{PHARMACY_NAME}}': pd.name, '{{URL}}': pd.url, '{{PHARMACY_URL}}': pd.url,
      '{{PRIMARY_COLOUR}}': pd.primaryColor, '{{SECONDARY_COLOUR}}': pd.secondaryColor,
      '{{PHONE}}': pd.phone, '{{CITY}}': pd.city, '{{TAGLINE}}': pd.tagline,
    };

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ── Caption — multimodal if images attached ───────────────────────────────
    let caption = '', hashtags: string[] = [], videoIdeaText = '';
    try {
      const txtModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
      const baseCtx  = `You are creating a social media post for "${pd.name}", a pharmacy in ${pd.city}, Nigeria. Website: ${pd.url}. ${pd.tagline ? `Tagline: "${pd.tagline}".` : ''} Published medicines for reference (do not invent others): ${stockList}.`;
      const safeBrief = sanitiseTokens(customPrompt.trim(), tokenMap);

      const contentParts: any[] = [{
        text: `${baseCtx}\n\nCustom brief from the pharmacy owner:\n"${safeBrief}"\n\nWrite a short engaging Instagram/Facebook caption based exactly on their brief. Return ONLY valid JSON: {"caption":"...","hashtags":["tag1","tag2"],"videoIdea":"one sentence TikTok idea"}`,
      }];

      // Add any reference images as inline context
      if (Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments.slice(0, 3)) {
          if (att?.data && att?.mimeType) {
            contentParts.push({ inlineData: { data: att.data, mimeType: att.mimeType } });
          }
        }
      }

      const txtRes  = await txtModel.generateContent({ contents: [{ role: 'user', parts: contentParts }] });
      const json    = extractFirstJSON(txtRes.response.text());
      if (json) {
        const d       = JSON.parse(json);
        caption       = d.caption   || '';
        hashtags      = d.hashtags  || [];
        videoIdeaText = d.videoIdea || '';
      }
    } catch (e) { console.error('Special post caption gen failed:', e); }

    // ── Image ─────────────────────────────────────────────────────────────────
    let imageUrl = '', imageError = '';
    try {
      const safeBrief   = sanitiseTokens(customPrompt.trim(), tokenMap);
      const imagePrompt = `${safeBrief}

PHARMACY PERSONALISATION — apply naturally:
- Pharmacy name: "${pd.name}" — small elegant text in one corner only
- Brand primary colour: ${pd.primaryColor}
- Brand secondary colour: ${pd.secondaryColor}
- Website: ${pd.url} — render ONLY this URL
- Location: ${pd.city}, Nigeria
${pd.tagline ? `- Tagline: "${pd.tagline}"` : ''}

Create a stunning 1:1 social media image. High quality, premium, on-brand. Do not invent any medicine names not in the brief. Do not add any price, quantity or invented text to any packaging shown.`;

      const imgModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image' });
      const imgRes   = await (imgModel as any).generateContent({
        contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      });

      const imgPart = (imgRes.response.candidates?.[0]?.content?.parts ?? []).find((p: any) => p.inlineData);
      if (imgPart?.inlineData) {
        try {
          imageUrl = await uploadBase64ToBlob(imgPart.inlineData.data, imgPart.inlineData.mimeType, `social/${pharmacyId}/special-${Date.now()}.jpg`);
        } catch (blobErr: any) {
          imageError = `Blob upload failed: ${blobErr?.message ?? String(blobErr)}`;
        }
      } else {
        imageError = 'Model returned no image data.';
      }
    } catch (e: any) {
      imageError = e?.message ?? String(e);
      console.error('Special post image gen failed:', imageError);
    }

    // ── Save post ─────────────────────────────────────────────────────────────
    // Schedule for today so it appears in the current week's context
    const today = new Date(); today.setUTCHours(12, 0, 0, 0);

    const post = await DailyPost.create({
      pharmacyId,
      scheduledDate:        today,
      type:                 'both',
      status:               'ready_to_post',
      caption,
      hashtags,
      imageUrl,
      videoIdeaText,
      category:             'Special Request',
      isSpecialRequest:     true,
      specialRequestPrompt: customPrompt.trim(),
      regenCount:           0,
    });

    return NextResponse.json({ success: true, post, imageError: imageError || null });
  } catch (error) {
    console.error('generate-special-post error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
