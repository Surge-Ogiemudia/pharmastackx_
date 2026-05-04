import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Subscriber from '@/models/Subscriber';
import { transporter } from '@/lib/nodemailer';

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token');
    // Use the request origin so the redirect works on any domain (prod, preview, etc.)
    const origin = req.nextUrl.origin;

    if (!token) {
        return NextResponse.redirect(`${origin}/pulse?subscribed=error`);
    }

    try {
        await dbConnect();
        const subscriber = await Subscriber.findOneAndUpdate(
            { token, confirmed: false },
            { confirmed: true },
            { new: true }
        );

        if (!subscriber) {
            // Token not found or already used
            return NextResponse.redirect(`${origin}/pulse?subscribed=error`);
        }

        // Send welcome email
        await transporter.sendMail({
            from: `"PSX Pulse" <${process.env.EMAIL_USER}>`,
            to: subscriber.email,
            subject: "You're subscribed to PSX Pulse 🎉",
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
            <h2 style="margin:0 0 12px;font-size:22px;color:#1a1a1a;font-weight:800;">You're in! 🎉</h2>
            <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
              Welcome to <strong>PSX Pulse</strong>. You'll now receive pharmacist insights,
              drug trends, and health updates straight to your inbox.
            </p>
            <a href="${origin}/pulse"
               style="display:inline-block;background:#0f6e56;color:#fff;text-decoration:none;
                      padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;">
              Read the Latest Articles
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="margin:0;font-size:11px;color:#bbb;">
              © PharmaStackX &nbsp;·&nbsp;
              <a href="${origin}/pulse" style="color:#0f6e56;text-decoration:none;">Visit PSX Pulse</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });

        return NextResponse.redirect(`${origin}/pulse?subscribed=true`);
    } catch (error: any) {
        console.error('CONFIRM_ERROR', error.message);
        return NextResponse.redirect(`${origin}/pulse?subscribed=error`);
    }
}
