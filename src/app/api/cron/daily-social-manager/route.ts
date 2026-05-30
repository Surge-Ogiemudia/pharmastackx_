import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import ContentPlan from '@/models/ContentPlan';
import DailyPost from '@/models/DailyPost';
import { transporter, mailOptions } from '@/lib/nodemailer';

export const maxDuration = 60; // Max allowed for Hobby/Pro on Vercel
export const dynamic = 'force-dynamic';

function extractFirstJSON(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

export async function GET(req: NextRequest) {
  // Security check: Only allow authorized cron requests
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await dbConnect();
    const pharmacies = await User.find({ role: 'pharmacy' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let processedUsers = 0;
    
    for (const pharmacy of pharmacies) {
      if (!process.env.GEMINI_API_KEY) break;
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      // 1. Check if they need a new Content Plan (>20 days old or no active plan)
      const activePlan = await ContentPlan.findOne({ pharmacyId: pharmacy._id, status: 'active' });
      const pendingPlan = await ContentPlan.findOne({ pharmacyId: pharmacy._id, status: 'pending_approval' });
      
      let needsNewPlan = false;
      if (!activePlan && !pendingPlan) needsNewPlan = true;
      if (activePlan && !pendingPlan) {
        const daysRemaining = Math.floor((new Date(activePlan.endDate).getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (daysRemaining <= 10) needsNewPlan = true;
      }

      if (needsNewPlan) {
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
          const prompt = `Generate a 30-day social media content plan for a Nigerian pharmacy named "${pharmacy.businessName || 'Pharmacy'}".
Return a JSON object with a "schedule" array of exactly 30 items.
Each item must have: "dayOffset" (0 to 29), "category" (e.g., "Health Tip", "Product Spotlight"), "type" (must be "image"), and "topic" (a brief description).
All 30 posts must be images. Do not include video ideas.
{ "schedule": [ { "dayOffset": 0, "category": "Health Tip", "type": "image", "topic": "Benefits of Vitamin C" } ] }`;
          
          const result = await model.generateContent(prompt);
          const raw = result.response.text().trim();
          const jsonStr = extractFirstJSON(raw);
          if (jsonStr) {
            const data = JSON.parse(jsonStr);
            const planStart = new Date(today);
            planStart.setDate(planStart.getDate() + (activePlan ? 10 : 1)); // start after active plan or tomorrow
            const planEnd = new Date(planStart);
            planEnd.setDate(planEnd.getDate() + 30);

            const schedule = data.schedule.map((item: any) => {
              const d = new Date(planStart);
              d.setDate(d.getDate() + item.dayOffset);
              return { date: d, category: item.category, type: item.type, topic: item.topic };
            });

            await ContentPlan.create({
              pharmacyId: pharmacy._id,
              startDate: planStart,
              endDate: planEnd,
              status: 'pending_approval',
              schedule
            });
            
            // Notify about new plan
            await transporter.sendMail({
              ...mailOptions,
              to: pharmacy.email,
              subject: 'Action Required: Your New 30-Day Social Media Plan is Ready',
              text: 'Hello ' + pharmacy.businessName + ',\n\nYour next 30-day social media content plan has been generated. Please log in to your dashboard to review and approve it.\n\nBest,\nPharmastackX Team'
            }).catch(console.error);
          }
        } catch (err) {
          console.error(`Failed to generate plan for ${pharmacy._id}`, err);
        }
      }

      // 2. Generate tomorrow's post if there is an active plan
      if (activePlan) {
        // Find tomorrow's topic
        const tomorrowTopic = activePlan.schedule.find(s => {
          const sDate = new Date(s.date);
          return sDate.getDate() === tomorrow.getDate() && sDate.getMonth() === tomorrow.getMonth() && sDate.getFullYear() === tomorrow.getFullYear();
        });

        if (tomorrowTopic) {
          // Check if post already generated
          const existingPost = await DailyPost.findOne({ pharmacyId: pharmacy._id, scheduledDate: tomorrow });
          if (!existingPost) {
            try {
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

                // Try generating image (wrapped in try-catch in case of billing/quota errors)
                try {
                  const imgModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image' });
                  const imgRes = await (imgModel as any).generateContent({
                    contents: [{ role: 'user', parts: [{ text: `Design a stu\n\ning 1:1 social media post for Nigerian pharmacy "${pharmacy.businessName}". Topic: ${tomorrowTopic.topic}. Clean, professional.` }] }],
                    generationConfig: { responseModalities: ['image'] },
                  });
                  const imgPart = imgRes.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
                  if (imgPart?.inlineData) {
                    imageUrl = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
                  }
                } catch (imgErr) {
                  console.error('Image gen failed in cron', imgErr);
                }
              } // Closed if block

              // Standalone Video Idea (always generated daily)
              const vidModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
              const vidRes = await vidModel.generateContent(`Write a short 3-step video script idea for a Nigerian pharmacy ("${pharmacy.businessName}") TikTok/Reel. Keep it very simple and practical. Provide just the idea.`);
              videoIdeaText = vidRes.response.text().trim();

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

              // Notify to review
              await transporter.sendMail({
                ...mailOptions,
                to: pharmacy.email,
                subject: "Review Tomorrow's Social Post",
                text: 'Hello ' + pharmacy.businessName + ',\n\nTomorrow\'s social media post has been drafted. Please log in to review, edit, or approve it.\n\nBest,\\nPharmastackX Team'
              }).catch(console.error);

            } catch (err) {
              console.error(`Failed to generate tomorrow's post for ${pharmacy._id}`, err);
            }
          }
        }
      }

      processedUsers++;
    }

    return NextResponse.json({ success: true, processedUsers });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
