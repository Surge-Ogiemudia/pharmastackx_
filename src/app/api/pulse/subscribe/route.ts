import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Subscriber from '@/models/Subscriber';
import { transporter } from '@/lib/nodemailer';
import { randomUUID } from 'crypto';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://psx.ng';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
        }

        await dbConnect();
        const token = randomUUID();

        await Subscriber.findOneAndUpdate(
            { email: email.toLowerCase() },
            { token, confirmed: false, subscribedAt: new Date() },
            { upsert: true, new: true }
        );

        const confirmUrl = `${BASE_URL}/api/pulse/confirm?token=${token}`;

        await transporter.sendMail({
            from: `"PSX Pulse" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Confirm your PSX Pulse subscription',
            html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8f8f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid rgba(0,0,0,0.07);">
        <tr>
          <td style="background:#0f6e56;padding:28px 32px;">
            <h1 style="margin:0;font-size:22px;color:#fff;font-weight:800;letter-spacing:-0.5px;">
              PharmaStack<span style="color:#e91e8c">X</span> &nbsp;<em style="font-style:italic;font-weight:300;">Pulse</em>
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;">
            <h2 style="margin:0 0 12px;font-size:22px;color:#1a1a1a;font-weight:800;">One click to confirm</h2>
            <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">
              You're almost subscribed to <strong>PSX Pulse</strong> — real-time trends,
              pharmacist insights, and health updates from PharmaStackX.
              Click the button below to confirm your subscription.
            </p>
            <a href="${confirmUrl}"
               style="display:inline-block;background:#0f6e56;color:#fff;text-decoration:none;
                      padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;">
              Confirm Subscription
            </a>
            <p style="margin:28px 0 0;font-size:12px;color:#aaa;line-height:1.5;">
              If you didn't request this, you can safely ignore this email.<br>
              This link expires once used.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="margin:0;font-size:11px;color:#bbb;">
              © PharmaStackX &nbsp;·&nbsp; <a href="${BASE_URL}/pulse" style="color:#0f6e56;text-decoration:none;">Visit PSX Pulse</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });

        return NextResponse.json({ message: 'Confirmation email sent! Check your inbox.' });
    } catch (error: any) {
        console.error('SUBSCRIBE_ERROR', error.message);
        return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}
