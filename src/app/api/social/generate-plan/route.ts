import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import ContentPlan from '@/models/ContentPlan';
import DailyPost from '@/models/DailyPost';
import { uploadBase64ToBlob } from '@/lib/uploadToBlob';

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

// Returns the Monday (UTC) of the week containing the given date
function getMondayOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

// Posts go out Mon (offset 0), Wed (offset 2), Fri (offset 4), Sat (offset 5)
const WEEKLY_OFFSETS = [0, 2, 4, 5];

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { pharmacyId, date, tone, showPrices } = await req.json();

    if (!pharmacyId) return NextResponse.json({ message: 'Missing pharmacyId' }, { status: 400 });

    const pharmacy = await User.findById(pharmacyId);
    if (!pharmacy) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ message: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    let refDate = new Date();
    if (date) {
      const [y, m, d] = date.split('-');
      refDate = new Date(Date.UTC(Number(y), Number(m)-1, Number(d)));
    } else {
      refDate = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate()));
    }

    const planStart = getMondayOfWeek(refDate);
    const planEnd = new Date(planStart);
    planEnd.setUTCDate(planEnd.getUTCDate() + 6); // Sunday

    const brandKitContext = pharmacy.brandKit?.tagline ? `Tagline: ${pharmacy.brandKit.tagline}` : '';
    const contactContext = `Address: ${pharmacy.businessAddress || 'N/A'}, Phone: ${pharmacy.phoneNumber || 'N/A'}, City: ${pharmacy.city || 'N/A'}`;
    const photosContext = pharmacy.socialPhotos?.filter((p: any) => p.description).map((p: any) => p.description).join(', ') || 'No photos available';

    const toneMap: Record<string, string> = {
      warm: 'warm, friendly, and approachable',
      professional: 'professional, clinical, and authoritative',
      bold: 'bold, energetic, and attention-grabbing',
    };
    const toneContext   = tone ? `Tone: ${toneMap[tone] ?? 'warm and friendly'}` : '';
    const priceContext  = showPrices === true ? 'Include specific product prices where relevant.' : 'Do not mention specific prices.';

    const baseContext = `Pharmacy Profile:
Name: "${pharmacy.businessName || 'Pharmacy'}"
Contact Info: ${contactContext}
${brandKitContext}
${toneContext}
${priceContext}
Known physical store context from photos: ${photosContext}`;

    // 1. Generate the 7-day weekly plan (4 posts: Mon, Wed, Fri, Sat)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = `Generate a weekly social media content plan for a pharmacy.
${baseContext}
Return a JSON object with a "schedule" array of exactly 4 items — one for each posting day this week: Monday (dayOffset 0), Wednesday (dayOffset 2), Friday (dayOffset 4), Saturday (dayOffset 5).
Each item must have: "dayOffset" (one of: 0, 2, 4, 5), "category" (e.g., "Health Tip", "Product Spotlight"), "type" (must be "image"), and "topic" (a brief description).
All 4 posts must be images. Do not include video ideas.
{ "schedule": [ { "dayOffset": 0, "category": "Health Tip", "type": "image", "topic": "Benefits of Vitamin C" } ] }`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const jsonStr = extractFirstJSON(raw);

    let createdPlan = null;
    if (jsonStr) {
      const data = JSON.parse(jsonStr);

      // Ensure exactly 4 items at the right offsets; fall back to defaults if AI drifts
      const normalizedSchedule = WEEKLY_OFFSETS.map((offset, i) => {
        const item = data.schedule.find((s: any) => s.dayOffset === offset) || data.schedule[i] || { category: 'Health Tip', type: 'image', topic: 'Pharmacy Health Tip' };
        const d = new Date(planStart);
        d.setUTCDate(d.getUTCDate() + offset);
        return { date: d, category: item.category, type: 'image', topic: item.topic };
      });

      createdPlan = await ContentPlan.create({
        pharmacyId: pharmacy._id,
        startDate: planStart,
        endDate: planEnd,
        status: 'active',
        schedule: normalizedSchedule
      });
    }

    if (!createdPlan) {
      return NextResponse.json({ message: 'Failed to generate plan' }, { status: 500 });
    }

    // 2. Generate all 4 posts for the week upfront
    for (let i = 0; i < createdPlan.schedule.length; i++) {
      const topicItem = createdPlan.schedule[i];
      let caption = '', hashtags: string[] = [], imageUrl = '', videoIdeaText = '';

      try {
        const txtModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
        const txtRes = await txtModel.generateContent(`${baseContext}\nWrite a short, engaging caption. Topic: ${topicItem.topic}. Return JSON with "caption" and "hashtags" array.`);
        const txtJsonStr = extractFirstJSON(txtRes.response.text());
        if (txtJsonStr) {
          const tData = JSON.parse(txtJsonStr);
          caption = tData.caption;
          hashtags = tData.hashtags;
        }

        const imgModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image' });
        const imgRes = await (imgModel as any).generateContent({
          contents: [{ role: 'user', parts: [{ text: `${baseContext}\nDesign a stunning 1:1 social media post. Topic: ${topicItem.topic}. Clean, professional.` }] }],
          generationConfig: { responseModalities: ['image'] },
        });
        const imgPart = imgRes.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (imgPart?.inlineData) {
          const uploaded = await uploadBase64ToBlob(
            imgPart.inlineData.data,
            imgPart.inlineData.mimeType,
            `social/${pharmacy._id}/post-${Date.now()}-${i}.jpg`
          );
          imageUrl = uploaded ?? '';
        }
      } catch (imgErr) {
        console.error('Image gen failed for week offset ' + WEEKLY_OFFSETS[i], imgErr);
      }

      try {
        const vidModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
        const vidRes = await vidModel.generateContent(`${baseContext}\nWrite a short 3-step video script idea for a TikTok/Reel about "${topicItem.topic}". Keep it very simple and practical.`);
        videoIdeaText = vidRes.response.text().trim();
      } catch (vidErr) {
        console.error('Video gen failed for week offset ' + WEEKLY_OFFSETS[i], vidErr);
      }

      await DailyPost.create({
        pharmacyId: pharmacy._id,
        scheduledDate: topicItem.date,
        type: 'both',
        status: i === 0 ? 'ready_to_post' : 'pending_review',
        caption,
        hashtags,
        imageUrl,
        videoIdeaText
      });
    }

    return NextResponse.json({ success: true, plan: createdPlan });
  } catch (error) {
    console.error('API /api/social/generate-plan error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
