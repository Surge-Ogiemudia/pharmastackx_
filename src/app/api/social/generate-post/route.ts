import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import DailyPost from '@/models/DailyPost';
import MasterPrompt from '@/models/MasterPrompt';
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

// Fallback prompts used when no master prompts exist for a category
const FALLBACK_PROMPTS: Record<string, string> = {
  'Medicine Spotlight': `A single amber prescription bottle with a clean white label stands centered on a rich forest-green surface. Shot from a 45-degree elevated angle. Soft natural light from upper-left casts a gentle shadow. Beside the bottle, exactly three small white circular pills arranged in a loose diagonal. Background is solid deep green with a barely-visible subtle grid texture. Ultra-clean, premium editorial product photography. Negative space fills 40% of the frame. No cluttered shelves. 1:1 square format.`,

  'Health Awareness': `Close-up of warm dark-skinned hands — one elderly, one young — gently clasped together on a soft cream fabric surface. Warm golden afternoon light. Shallow depth of field, background softly blurred into warm amber. Small sprig of green leaves in the lower-left corner. No medical equipment, no clinical setting. Documentary warmth. Nigerian context — dark skin tones, a local story. 1:1 square format.`,

  'Low Stock Alert': `Bold typographic poster. Stark dark background. A single product silhouette centered with dramatic spotlight illumination. Three bold horizontal amber/orange bars slice behind the product creating urgency and visual tension. High contrast. Clean graphic design energy — not photographic realism. Feels like a luxury brand announcing a limited drop. 70% bold negative space. 1:1 square format.`,

  'Human Moment': `Candid scene at a pharmacy counter in Nigeria. A pharmacist in a neat white coat leans slightly forward, speaking warmly to a middle-aged woman in colourful ankara. Both in frame, eye contact between them. Pharmacy interior softly blurred behind them. Warm fluorescent with natural side light. Genuine human connection — not posed. Rich warm skin tones, lifted shadows. 1:1 square format.`,
};

// ── Pharmacy data bag — single source of truth passed to all prompts ──────────
interface PharmacyData {
  name:           string;
  slug:           string;
  url:            string;
  phone:          string;
  city:           string;
  address:        string;
  primaryColor:   string;
  secondaryColor: string;
  tagline:        string;
  logoUrl:        string;
  photosCtx:      string;
}

function buildPharmacyData(pharmacy: any): PharmacyData {
  return {
    name:           pharmacy.businessName  || 'Pharmacy',
    slug:           pharmacy.slug          || '',
    url:            pharmacy.slug          ? `${pharmacy.slug}.psx.ng` : 'psx.ng',
    phone:          pharmacy.phoneNumber   || '',
    city:           pharmacy.city          || 'Nigeria',
    address:        pharmacy.businessAddress || '',
    primaryColor:   pharmacy.brandKit?.primaryColor   || '#0F6E56',
    secondaryColor: pharmacy.brandKit?.secondaryColor || '#C84B8F',
    tagline:        pharmacy.brandKit?.tagline || '',
    logoUrl:        pharmacy.brandKit?.logoUrl || '',
    photosCtx:      (pharmacy.socialPhotos || [])
                      .filter((p: any) => p.description)
                      .map((p: any) => p.description)
                      .join('; ') || '',
  };
}

// ── Replace admin template tokens with real values, strip any unresolved ones ─
function resolveTokens(prompt: string, pd: PharmacyData, product?: any): string {
  const map: Record<string, string> = {
    '{{PHARMACY_NAME}}':   pd.name,
    '{{PRIMARY_COLOUR}}':  pd.primaryColor,
    '{{SECONDARY_COLOUR}}':pd.secondaryColor,
    '{{PHONE}}':           pd.phone,
    '{{CITY}}':            pd.city,
    '{{ADDRESS}}':         pd.address,
    '{{TAGLINE}}':         pd.tagline,
    '{{LOGO}}':            pd.logoUrl,
    '{{SLUG}}':            pd.slug,
    '{{URL}}':             pd.url,
    '{{PHARMACY_URL}}':    pd.url,
    '{{MEDICINE_NAME}}':   product?.itemName        || '',
    '{{MEDICINE_STRENGTH}}': product?.activeIngredient || '',
    '{{PRODUCT_IMAGE}}':   product?.imageUrl        || '',
  };

  let out = prompt;
  for (const [token, val] of Object.entries(map)) {
    out = out.split(token).join(val);   // replaceAll without regex flags
  }

  // Strip any remaining unresolved tokens so they never reach Gemini
  out = out.replace(/\{\{[^}]+\}\}/g, '').replace(/\{[A-Z_]{3,}\}/g, '');
  return out.trim();
}

// ── Inject verified pharmacy data into every prompt ───────────────────────────
function buildPersonalisedPrompt(
  variation: string,
  pd: PharmacyData,
  stock: any[],
  featuredProduct?: any,
): string {
  const stockList = stock.length
    ? stock.map(p => `  • ${p.itemName}${p.activeIngredient && p.activeIngredient !== 'N/A' ? ` (${p.activeIngredient})` : ''}`).join('\n')
    : '  (no published stock available — do not mention specific medicines)';

  let productBlock = '';
  if (featuredProduct) {
    const strength = featuredProduct.activeIngredient && featuredProduct.activeIngredient !== 'N/A'
      ? featuredProduct.activeIngredient : '';
    productBlock = `FEATURED PRODUCT (from this pharmacy's real published stock — use ONLY this):
  Medicine name: ${featuredProduct.itemName}${strength ? `\n  Strength: ${strength}` : ''}

  Build the entire image around this specific product. Make it look premium and realistic.
  STRICT RULES for the medicine packaging/visual:
  - Do NOT print any price, cost or currency on the packaging
  - Do NOT print any quantity count or tab count on the packaging
  - Do NOT print the pharmacy name on the medicine box or bottle itself
  - Do NOT add any text to the packaging beyond the medicine name and strength
  - Keep the packaging clean, minimal and realistic — like a real medicine you would buy`;
  } else {
    // No published stock at all — absolutely no medicines in the image
    productBlock = `CRITICAL: This pharmacy has no published stock. Do NOT show any medicine, drug, product name, packaging or bottle in the image whatsoever. Use only abstract health/pharmacy visual elements — people, colours, shapes, pharmacy context.`;
  }

  // Resolve tokens first, then append the verified data block
  const resolved = resolveTokens(variation, pd, featuredProduct);

  return `${resolved}

══ VERIFIED PHARMACY DATA — use EXACTLY as provided, never substitute or invent ══
Pharmacy name:      "${pd.name}"
Website URL:        ${pd.url}  ← render ONLY this URL, never hallucinate a different one
Phone:              ${pd.phone || 'NOT PROVIDED — do not display any phone number'}
City:               ${pd.city}
Brand primary:      ${pd.primaryColor}
Brand secondary:    ${pd.secondaryColor}
${pd.tagline ? `Tagline:            "${pd.tagline}"` : ''}
${pd.photosCtx ? `Store context:      ${pd.photosCtx}` : ''}

PUBLISHED STOCK (only reference medicines from this list — never invent names):
${stockList}

${productBlock}
══ END VERIFIED DATA ══

Apply brand colours and pharmacy name as instructed above. Keep the composition from the prompt above unchanged.`;
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

    // ── Collect ALL verified pharmacy data before any generation ────────────
    const pd = buildPharmacyData(pharmacy);

    // Fetch published, in-stock products — try businessName first, fallback to slug
    let publishedStock = await Product.find({
      businessName: pharmacy.businessName,
      isPublished:  true,
      quantity:     { $gt: 0 },
    }).select('itemName activeIngredient category imageUrl quantity').limit(50).lean();

    // Fallback: try matching by pharmacy slug if businessName returned nothing
    if (publishedStock.length === 0 && pharmacy.slug) {
      publishedStock = await Product.find({
        slug:        pharmacy.slug,
        isPublished: true,
        quantity:    { $gt: 0 },
      }).select('itemName activeIngredient category imageUrl quantity').limit(50).lean();
    }

    console.log(`[generate-post] Found ${publishedStock.length} published products for "${pharmacy.businessName}" (slug: ${pharmacy.slug})`);

    // For Medicine Spotlight: pick a real published product with preference for non-generic items
    let featuredProduct: any = undefined;
    if (category === 'Medicine Spotlight' && publishedStock.length > 0) {
      // Generic/very common names to de-prioritise (preference only, not hard exclusion)
      const genericNames = ['paracetamol', 'ibuprofen', 'aspirin', 'multivitamin', 'vitamin c', 'zinc'];
      const nonGeneric   = publishedStock.filter(p =>
        !genericNames.some(g => p.itemName.toLowerCase().includes(g))
      );
      const pool = nonGeneric.length > 0 ? nonGeneric : publishedStock;
      featuredProduct = pool[Math.floor(Math.random() * pool.length)];
    }

    const toneMap: Record<string, string> = {
      warm:         'warm, friendly, and approachable',
      professional: 'professional, clinical, and authoritative',
      bold:         'bold, energetic, and attention-grabbing',
    };
    const toneCtx  = tone ? `Write in a ${toneMap[tone] ?? 'warm and friendly'} tone.` : '';
    const priceCtx = showPrices ? 'Include specific product prices where relevant.' : 'Do not mention specific prices.';

    const stockSummary = publishedStock.length
      ? publishedStock.map(p => `${p.itemName}${p.activeIngredient && p.activeIngredient !== 'N/A' ? ` (${p.activeIngredient})` : ''}`).join(', ')
      : 'no published stock';

    const baseCtx = `You are creating social media content for "${pd.name}", a pharmacy in ${pd.city}, Nigeria.
Website: ${pd.url}. Phone: ${pd.phone || 'not provided'}.
${pd.tagline ? `Tagline: "${pd.tagline}".` : ''}
${toneCtx} ${priceCtx}
Only reference these published medicines (never invent names): ${stockSummary}.
${pd.photosCtx ? 'Store context: ' + pd.photosCtx : ''}`.trim();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 1. Caption + hashtags
    let caption = '', hashtags: string[] = [], videoIdeaText = '';
    try {
      const txtModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
      const featuredLine = featuredProduct
        ? `\nFeatured product: ${featuredProduct.itemName}${featuredProduct.activeIngredient && featuredProduct.activeIngredient !== 'N/A' ? ` (${featuredProduct.activeIngredient})` : ''}. Reference ONLY this product — no other medicine names.`
        : '';
      const txtRes   = await txtModel.generateContent(
        `${baseCtx}${featuredLine}\n\nWrite a short engaging Instagram/Facebook caption for a "${category}" post.\nReturn ONLY valid JSON: {"caption":"...","hashtags":["tag1","tag2",...],"videoIdea":"one sentence TikTok reel idea"}`
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
        const master    = masters[Math.floor(Math.random() * masters.length)];
        const pool      = master.variations.length > 0 ? master.variations : [master.basePrompt];
        const variation = pool[Math.floor(Math.random() * pool.length)];
        imagePrompt     = buildPersonalisedPrompt(variation, pd, publishedStock, featuredProduct);
        console.log(`[generate-post] Master: "${master.label}" var ${pool.indexOf(variation) + 1}/${pool.length} | stock: ${publishedStock.length} | featured: ${featuredProduct?.itemName ?? 'none'}`);
      } else {
        const base  = FALLBACK_PROMPTS[category] ?? FALLBACK_PROMPTS['Medicine Spotlight'];
        imagePrompt = buildPersonalisedPrompt(base, pd, publishedStock, featuredProduct);
        console.log(`[generate-post] Fallback prompt | stock: ${publishedStock.length} | featured: ${featuredProduct?.itemName ?? 'none'}`);
      }
    } catch (e) {
      console.error('Master prompt fetch failed, using fallback:', e);
      const base  = FALLBACK_PROMPTS[category] ?? FALLBACK_PROMPTS['Medicine Spotlight'];
      imagePrompt = buildPersonalisedPrompt(base, pd, publishedStock, featuredProduct);
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
