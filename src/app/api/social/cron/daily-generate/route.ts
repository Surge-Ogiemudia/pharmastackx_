import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import ContentPlan from '@/models/ContentPlan';
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

// Returns the Monday (UTC) of the week containing the given date
function getMondayOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

// Posts go out Mon (offset 0), Wed (offset 2), Fri (offset 4), Sat (offset 5)
const WEEKLY_OFFSETS = [0, 2, 4, 5];

export async function GET(req: NextRequest) {
  try {
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

    const now = new Date();
    const thisMonday = getMondayOfWeek(now);
    const thisSunday = new Date(thisMonday);
    thisSunday.setUTCDate(thisSunday.getUTCDate() + 6);

    // Find all active or pending plans covering this week
    const activePlans = await ContentPlan.find({
      status: 'active',
      startDate: { $lte: thisSunday },
      endDate: { $gte: thisMonday }
    });

    let generatedCount = 0;

    for (const plan of activePlans.slice(0, 5)) {
      const pharmacy = await User.findById(plan.pharmacyId);
      if (!pharmacy) continue;

      const brandKitContext = pharmacy.brandKit?.tagline ? `Tagline: ${pharmacy.brandKit.tagline}` : '';
      const contactContext = `Address: ${pharmacy.businessAddress || 'N/A'}, Phone: ${pharmacy.phoneNumber || 'N/A'}, City: ${pharmacy.city || 'N/A'}`;
      const photosContext = pharmacy.socialPhotos?.filter((p: any) => p.description).map((p: any) => p.description).join(', ') || 'No photos available';
      const baseContext = `Pharmacy Profile:\nName: "${pharmacy.businessName || 'Pharmacy'}"\nContact Info: ${contactContext}\n${brandKitContext}\nKnown physical store context from photos: ${photosContext}`;

      // Generate any missing posts for this week
      for (let i = 0; i < plan.schedule.length; i++) {
        const topicItem = plan.schedule[i];
        const postDate = new Date(topicItem.date);
        const postDateEnd = new Date(postDate);
        postDateEnd.setUTCDate(postDateEnd.getUTCDate() + 1);

        const existingPost = await DailyPost.findOne({
          pharmacyId: plan.pharmacyId,
          scheduledDate: { $gte: postDate, $lt: postDateEnd }
        });
        if (existingPost) continue;

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
        } catch (err) {
          console.error(`Generation failed for plan ${plan._id} item ${i}`, err);
        }

        try {
          const vidModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
          const vidRes = await vidModel.generateContent(`${baseContext}\nWrite a short 3-step video script idea for a TikTok/Reel about "${topicItem.topic}". Keep it very simple and practical.`);
          videoIdeaText = vidRes.response.text().trim();
        } catch (err) {
          console.error(`Video generation failed for plan ${plan._id} item ${i}`, err);
        }

        await DailyPost.create({
          pharmacyId: pharmacy._id,
          scheduledDate: topicItem.date,
          type: 'both',
          status: 'pending_review',
          caption,
          hashtags,
          imageUrl,
          videoIdeaText
        });

        generatedCount++;
      }
    }

    return NextResponse.json({ success: true, generatedCount });
  } catch (error) {
    console.error('API /api/social/cron/daily-generate error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
