import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import ContentPlan from '@/models/ContentPlan';
import DailyPost from '@/models/DailyPost';
import { transporter, mailOptions } from '@/lib/nodemailer';
import { uploadBase64ToBlob } from '@/lib/uploadToBlob';
import { sendWebPush } from '@/lib/webPush';

export const maxDuration = 60;
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
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await dbConnect();
    const pharmacies = await User.find({ role: 'pharmacy' });

    const today = new Date();
    const thisMonday = getMondayOfWeek(today);
    const thisSunday = new Date(thisMonday);
    thisSunday.setUTCDate(thisSunday.getUTCDate() + 6);

    let processedUsers = 0;

    for (const pharmacy of pharmacies) {
      if (!process.env.GEMINI_API_KEY) break;
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const brandKitContext = pharmacy.brandKit?.tagline ? `Tagline: ${pharmacy.brandKit.tagline}` : '';
      const contactContext = `Address: ${pharmacy.businessAddress || 'N/A'}, Phone: ${pharmacy.phoneNumber || 'N/A'}, City: ${pharmacy.city || 'N/A'}`;
      const photosContext = pharmacy.socialPhotos?.filter((p: any) => p.description).map((p: any) => p.description).join(', ') || 'No photos available';

      const baseContext = `Pharmacy Profile:
Name: "${pharmacy.businessName || 'Pharmacy'}"
Contact Info: ${contactContext}
${brandKitContext}
Known physical store context from photos: ${photosContext}`;

      // Check if a plan already covers this week
      const existingWeekPlan = await ContentPlan.findOne({
        pharmacyId: pharmacy._id,
        status: 'active',
        startDate: { $lte: thisSunday },
        endDate: { $gte: thisMonday }
      });

      if (existingWeekPlan) {
        processedUsers++;
        continue;
      }

      // Generate this week's plan
      try {
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

        if (!jsonStr) {
          console.error(`Failed to parse plan JSON for ${pharmacy._id}`);
          continue;
        }

        const data = JSON.parse(jsonStr);

        const normalizedSchedule = WEEKLY_OFFSETS.map((offset, i) => {
          const item = data.schedule.find((s: any) => s.dayOffset === offset) || data.schedule[i] || { category: 'Health Tip', type: 'image', topic: 'Pharmacy Health Tip' };
          const d = new Date(thisMonday);
          d.setUTCDate(d.getUTCDate() + offset);
          return { date: d, category: item.category, type: 'image', topic: item.topic };
        });

        const createdPlan = await ContentPlan.create({
          pharmacyId: pharmacy._id,
          startDate: thisMonday,
          endDate: thisSunday,
          status: 'active',
          schedule: normalizedSchedule
        });

        // Generate all 4 posts for the week
        for (let i = 0; i < createdPlan.schedule.length; i++) {
          const topicItem = createdPlan.schedule[i];

          // Skip if post already exists for this date
          const postDate = new Date(topicItem.date);
          const postDateEnd = new Date(postDate);
          postDateEnd.setUTCDate(postDateEnd.getUTCDate() + 1);
          const existing = await DailyPost.findOne({ pharmacyId: pharmacy._id, scheduledDate: { $gte: postDate, $lt: postDateEnd } });
          if (existing) continue;

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

            try {
              const imgModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image' });
              const imgRes = await (imgModel as any).generateContent({
                contents: [{ role: 'user', parts: [{ text: `${baseContext}\nDesign a stunning 1:1 social media post. Topic: ${topicItem.topic}. Clean, professional.` }] }],
                generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
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
              console.error('Image gen failed in weekly cron', imgErr);
            }
          } catch (err) {
            console.error(`Caption gen failed for pharmacy ${pharmacy._id}`, err);
          }

          try {
            const vidModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
            const vidRes = await vidModel.generateContent(`${baseContext}\nWrite a short 3-step video script idea for a TikTok/Reel. Keep it very simple and practical. Provide just the idea.`);
            videoIdeaText = vidRes.response.text().trim();
          } catch (err) {
            console.error(`Video gen failed for pharmacy ${pharmacy._id}`, err);
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

        const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
        const weekRange = `${fmtDate(thisMonday)} – ${fmtDate(thisSunday)}`;
        const notifTitle = 'Your 4 posts for this week are ready';
        const notifBody  = `Tap to view and download your content for ${weekRange}.`;
        const notifUrl   = '/store-management?tab=1';

        // Web push (if subscribed)
        if (pharmacy.webPushSubscription?.endpoint) {
          const result = await sendWebPush(
            pharmacy.webPushSubscription as any,
            { title: notifTitle, body: notifBody, url: notifUrl }
          );
          // If subscription expired, clean it up
          if (result === 'expired') {
            await User.findByIdAndUpdate(pharmacy._id, { $unset: { webPushSubscription: '' } });
          }
        }

        // Email (always)
        await transporter.sendMail({
          ...mailOptions,
          to: pharmacy.email,
          subject: notifTitle,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#0F6E56;margin-bottom:8px">Your 4 posts for this week are ready 🎉</h2>
              <p style="color:#444;font-size:15px;line-height:1.6">
                Hello <strong>${pharmacy.businessName}</strong>,<br><br>
                Your social media posts for <strong>${weekRange}</strong> (Mon, Wed, Fri, Sat) have been generated and are ready for review.
              </p>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL ? 'https://' + process.env.NEXT_PUBLIC_BASE_URL : 'https://pharmastackx.com'}${notifUrl}"
                style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0F6E56;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
                View this week's posts →
              </a>
              <p style="color:#999;font-size:12px;margin-top:24px">PharmastackX Social Studio</p>
            </div>
          `,
        }).catch(console.error);

      } catch (err) {
        console.error(`Failed to generate weekly plan for ${pharmacy._id}`, err);
      }

      processedUsers++;
    }

    return NextResponse.json({ success: true, processedUsers });
  } catch (error) {
    console.error('Weekly cron job error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
