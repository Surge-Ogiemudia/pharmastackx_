import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import ContentPlan from '@/models/ContentPlan';
import DailyPost from '@/models/DailyPost';

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

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret if needed. For Vercel Cron, you can check authorization header
    if (process.env.CRON_SECRET) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    await dbConnect();
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ message: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 1. We want to generate posts for "Tomorrow" so they are ready before the user wakes up.
    // In UTC, "now" is the time the cron runs (e.g. 00:00 UTC).
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setUTCDate(tomorrowEnd.getUTCDate() + 1);

    // 2. Find all active or pending plans
    const activePlans = await ContentPlan.find({ 
      status: { $in: ['active', 'pending_approval'] },
      endDate: { $gte: tomorrow }
    });

    let generatedCount = 0;

    // Process up to 5 plans per cron run to avoid hitting the 60s limit.
    // If you have many users, you'd need a queue (like Inngest/Upstash) or higher limits.
    for (const plan of activePlans.slice(0, 5)) {
      // Check if tomorrow's post is already generated for this pharmacy
      const existingPost = await DailyPost.findOne({ 
        pharmacyId: plan.pharmacyId, 
        scheduledDate: { $gte: tomorrow, $lt: tomorrowEnd } 
      });

      if (existingPost) continue;

      // Find tomorrow's topic in the schedule
      // We look for a date in the schedule that falls within "tomorrow"
      const topicItem = plan.schedule.find((item: any) => {
        const itemDate = new Date(item.date);
        return itemDate >= tomorrow && itemDate < tomorrowEnd;
      });

      if (!topicItem) continue;

      const pharmacy = await User.findById(plan.pharmacyId);
      if (!pharmacy) continue;

      const brandKitContext = pharmacy.brandKit?.tagline ? `Tagline: ${pharmacy.brandKit.tagline}` : '';
      const contactContext = `Address: ${pharmacy.businessAddress || 'N/A'}, Phone: ${pharmacy.phoneNumber || 'N/A'}, City: ${pharmacy.city || 'N/A'}`;
      const photosContext = pharmacy.socialPhotos?.filter((p: any) => p.description).map((p: any) => p.description).join(', ') || 'No photos available';
      
      const baseContext = `Pharmacy Profile:\nName: "${pharmacy.businessName || 'Pharmacy'}"\nContact Info: ${contactContext}\n${brandKitContext}\nKnown physical store context from photos: ${photosContext}`;

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
          imageUrl = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
        }
      } catch (err) {
        console.error(`Generation failed for plan ${plan._id}`, err);
      }

      try {
        const vidModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
        const vidRes = await vidModel.generateContent(`${baseContext}\nWrite a short 3-step video script idea for a TikTok/Reel about "${topicItem.topic}". Keep it very simple and practical.`);
        videoIdeaText = vidRes.response.text().trim();
      } catch (err) {
        console.error(`Video generation failed for plan ${plan._id}`, err);
      }

      await DailyPost.create({
        pharmacyId: pharmacy._id,
        scheduledDate: tomorrow,
        type: 'both',
        status: 'pending_review',
        caption,
        hashtags,
        imageUrl,
        videoIdeaText
      });

      generatedCount++;
    }

    return NextResponse.json({ success: true, generatedCount });
  } catch (error) {
    console.error('API /api/social/cron/daily-generate error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
