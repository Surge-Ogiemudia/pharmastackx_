import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import ContentPlan from '@/models/ContentPlan';
import DailyPost from '@/models/DailyPost';

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

function getMondayOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

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
      refDate = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    } else {
      refDate = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate()));
    }

    const planStart = getMondayOfWeek(refDate);
    const planEnd   = new Date(planStart);
    planEnd.setUTCDate(planEnd.getUTCDate() + 6);

    const toneMap: Record<string, string> = {
      warm:         'warm, friendly, and approachable',
      professional: 'professional, clinical, and authoritative',
      bold:         'bold, energetic, and attention-grabbing',
    };
    const brandKitContext = pharmacy.brandKit?.tagline ? `Tagline: ${pharmacy.brandKit.tagline}` : '';
    const contactContext  = `Address: ${pharmacy.businessAddress || 'N/A'}, Phone: ${pharmacy.phoneNumber || 'N/A'}, City: ${pharmacy.city || 'N/A'}`;
    const photosContext   = pharmacy.socialPhotos?.filter((p: any) => p.description).map((p: any) => p.description).join(', ') || 'No photos available';
    const toneContext     = tone ? `Tone: ${toneMap[tone] ?? 'warm and friendly'}` : '';
    const priceContext    = showPrices === true ? 'Include specific product prices where relevant.' : 'Do not mention specific prices.';

    const baseContext = `Pharmacy Profile:
Name: "${pharmacy.businessName || 'Pharmacy'}"
Contact Info: ${contactContext}
${brandKitContext}
${toneContext}
${priceContext}
Known physical store context from photos: ${photosContext}`;

    // 1. Generate the weekly schedule
    const model  = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = `Generate a weekly social media content plan for a pharmacy.
${baseContext}
Return a JSON object with a "schedule" array of exactly 4 items — one for each posting day: Monday (dayOffset 0), Wednesday (dayOffset 2), Friday (dayOffset 4), Saturday (dayOffset 5).
Each item must have: "dayOffset" (one of: 0, 2, 4, 5), "category" (e.g., "Health Tip", "Product Spotlight"), "type" (must be "image"), and "topic" (a brief description).
{ "schedule": [ { "dayOffset": 0, "category": "Health Tip", "type": "image", "topic": "Benefits of Vitamin C" } ] }`;

    const result  = await model.generateContent(prompt);
    const jsonStr = extractFirstJSON(result.response.text().trim());

    if (!jsonStr) return NextResponse.json({ message: 'Failed to generate plan' }, { status: 500 });

    const data = JSON.parse(jsonStr);
    const normalizedSchedule = WEEKLY_OFFSETS.map((offset, i) => {
      const item = data.schedule.find((s: any) => s.dayOffset === offset) || data.schedule[i] || { category: 'Health Tip', type: 'image', topic: 'Pharmacy Health Tip' };
      const d    = new Date(planStart);
      d.setUTCDate(d.getUTCDate() + offset);
      return { date: d, category: item.category, type: 'image', topic: item.topic };
    });

    const createdPlan = await ContentPlan.create({
      pharmacyId: pharmacy._id,
      startDate:  planStart,
      endDate:    planEnd,
      status:     'active',
      schedule:   normalizedSchedule,
    });

    // 2. Generate text content (captions + video ideas) for all 4 posts in parallel.
    //    Images are intentionally skipped here — the client calls /api/social/generate-image
    //    per post in parallel so each gets its own 60s serverless budget.
    const posts = await Promise.all(
      createdPlan.schedule.map(async (topicItem: any, i: number) => {
        let caption = '', hashtags: string[] = [], videoIdeaText = '';

        try {
          const txtModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
          const [captionRes, videoRes] = await Promise.all([
            txtModel.generateContent(`${baseContext}\nWrite a short, engaging social media caption. Topic: ${topicItem.topic}. Return JSON: {"caption":"...","hashtags":["..."]}`),
            txtModel.generateContent(`${baseContext}\nWrite a short 3-step TikTok/Reel script idea about "${topicItem.topic}". Keep it practical.`),
          ]);

          const captionJson = extractFirstJSON(captionRes.response.text());
          if (captionJson) {
            const d  = JSON.parse(captionJson);
            caption  = d.caption  || '';
            hashtags = d.hashtags || [];
          }
          videoIdeaText = videoRes.response.text().trim();
        } catch (err) {
          console.error(`Text gen failed for post ${i}`, err);
        }

        return DailyPost.create({
          pharmacyId:    pharmacy._id,
          scheduledDate: topicItem.date,
          type:          'both',
          status:        i === 0 ? 'ready_to_post' : 'pending_review',
          caption,
          hashtags,
          imageUrl:      '',   // filled in by /api/social/generate-image
          videoIdeaText,
        });
      })
    );

    return NextResponse.json({
      success: true,
      plan:    createdPlan,
      postIds: posts.map((p: any) => String(p._id)),
    });
  } catch (error) {
    console.error('generate-plan error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
