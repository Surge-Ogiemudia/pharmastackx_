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

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { pharmacyId } = await req.json();

    if (!pharmacyId) return NextResponse.json({ message: 'Missing pharmacyId' }, { status: 400 });
    
    const pharmacy = await User.findById(pharmacyId);
    if (!pharmacy) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ message: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Generate the 30-day plan
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = `Generate a 30-day social media content plan for a Nigerian pharmacy named "${pharmacy.businessName || 'Pharmacy'}".
Return a JSON object with a "schedule" array of exactly 30 items.
Each item must have: "dayOffset" (1 to 30), "category" (e.g., "Health Tip", "Product Spotlight"), "type" (either "image" or "video_idea"), and "topic" (a brief description).
Make sure to mix in images and video ideas.
{ "schedule": [ { "dayOffset": 1, "category": "Health Tip", "type": "image", "topic": "Benefits of Vitamin C" } ] }`;
    
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const jsonStr = extractFirstJSON(raw);
    
    let createdPlan = null;
    if (jsonStr) {
      const data = JSON.parse(jsonStr);
      const planStart = new Date(tomorrow); // Start tomorrow
      const planEnd = new Date(planStart);
      planEnd.setDate(planEnd.getDate() + 30);

      const schedule = data.schedule.map((item: any) => {
        const d = new Date(planStart);
        d.setDate(d.getDate() + item.dayOffset - 1);
        return { date: d, category: item.category, type: item.type, topic: item.topic };
      });

      createdPlan = await ContentPlan.create({
        pharmacyId: pharmacy._id,
        startDate: planStart,
        endDate: planEnd,
        status: 'pending_approval',
        schedule
      });
    }

    if (!createdPlan) {
      return NextResponse.json({ message: 'Failed to generate plan' }, { status: 500 });
    }

    // 2. Generate tomorrow's post (dayOffset 1)
    const tomorrowTopic = createdPlan.schedule[0];
    
    let caption = '', hashtags: string[] = [], imageUrl = '', videoIdeaText = '';

    if (tomorrowTopic.type === 'image') {
      const txtModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
      const txtRes = await txtModel.generateContent(`Write a short, engaging caption for a Nigerian pharmacy named "${pharmacy.businessName}". Topic: ${tomorrowTopic.topic}. Return JSON with "caption" and "hashtags" array.`);
      const txtJsonStr = extractFirstJSON(txtRes.response.text());
      if (txtJsonStr) {
        const tData = JSON.parse(txtJsonStr);
        caption = tData.caption;
        hashtags = tData.hashtags;
      }

      try {
        const imgModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image' });
        const imgRes = await (imgModel as any).generateContent({
          contents: [{ role: 'user', parts: [{ text: `Design a stunning 1:1 social media post for Nigerian pharmacy "${pharmacy.businessName}". Topic: ${tomorrowTopic.topic}. Clean, professional.` }] }],
          generationConfig: { responseModalities: ['image'] },
        });
        const imgPart = imgRes.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (imgPart?.inlineData) {
          imageUrl = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
        }
      } catch (imgErr) {
        console.error('Image gen failed', imgErr);
      }
    } else {
      const vidModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
      const vidRes = await vidModel.generateContent(`Write a short 3-step video script idea for a Nigerian pharmacy ("${pharmacy.businessName}") TikTok/Reel about "${tomorrowTopic.topic}". Keep it very simple and practical.`);
      videoIdeaText = vidRes.response.text().trim();
    }

    await DailyPost.create({
      pharmacyId: pharmacy._id,
      scheduledDate: tomorrow,
      type: tomorrowTopic.type,
      status: 'pending_review',
      caption,
      hashtags,
      imageUrl,
      videoIdeaText
    });

    return NextResponse.json({ success: true, plan: createdPlan });
  } catch (error) {
    console.error('API /api/social/generate-plan error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
