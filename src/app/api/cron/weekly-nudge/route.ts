import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import DailyPost from '@/models/DailyPost';
import { transporter, mailOptions } from '@/lib/nodemailer';
import { sendWebPush } from '@/lib/webPush';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function getMondayUTC(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await dbConnect();
    const pharmacies = await User.find({ role: 'pharmacy' });

    const now       = new Date();
    const monday    = getMondayUTC(now);
    const wednesday = new Date(monday); wednesday.setUTCDate(monday.getUTCDate() + 2);
    const thursday  = new Date(wednesday); thursday.setUTCDate(wednesday.getUTCDate() + 1);

    let nudgedCount = 0;

    for (const pharmacy of pharmacies) {
      // Find Monday + Wednesday posts for this week
      const weekEnd = new Date(monday); weekEnd.setUTCDate(monday.getUTCDate() + 7);
      const weekPosts = await DailyPost.find({
        pharmacyId: pharmacy._id,
        scheduledDate: { $gte: monday, $lt: weekEnd },
      }).sort({ scheduledDate: 1 });

      // Posts[0] = Monday, posts[1] = Wednesday (by schedule)
      const mondayPost    = weekPosts[0];
      const wednesdayPost = weekPosts[1];

      const neitherPosted =
        (!mondayPost    || mondayPost.status    !== 'posted') &&
        (!wednesdayPost || wednesdayPost.status !== 'posted');

      if (!neitherPosted) continue;

      const notifTitle = "You haven't posted this week yet";
      const notifBody  = 'Your Monday and Wednesday content is waiting.';
      const notifUrl   = '/store-management?tab=1';

      // Web push
      if (pharmacy.webPushSubscription?.endpoint) {
        const result = await sendWebPush(
          pharmacy.webPushSubscription as any,
          { title: notifTitle, body: notifBody, url: notifUrl }
        );
        if (result === 'expired') {
          await User.findByIdAndUpdate(pharmacy._id, { $unset: { webPushSubscription: '' } });
        }
      }

      // Email
      await transporter.sendMail({
        ...mailOptions,
        to: pharmacy.email,
        subject: notifTitle,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#B45309;margin-bottom:8px">⏰ You haven't posted this week yet</h2>
            <p style="color:#444;font-size:15px;line-height:1.6">
              Hello <strong>${pharmacy.businessName}</strong>,<br><br>
              Your Monday and Wednesday social media content is sitting in your Social Studio, ready to go. Sharing just takes a tap.
            </p>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL ? 'https://' + process.env.NEXT_PUBLIC_BASE_URL : 'https://pharmastackx.com'}${notifUrl}"
              style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0F6E56;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
              Go to Social Studio →
            </a>
            <p style="color:#999;font-size:12px;margin-top:24px">PharmastackX Social Studio</p>
          </div>
        `,
      }).catch(console.error);

      nudgedCount++;
    }

    return NextResponse.json({ success: true, nudgedCount });
  } catch (error) {
    console.error('Weekly nudge cron error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
