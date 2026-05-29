import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Order from '@/models/Order';
import Payout from '@/models/Payout';
import User from '@/models/User';
import { transporter } from '@/lib/nodemailer';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// GET — returns unpaid balance
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(payload.userId).select('businessName name email phone').lean() as any;
    if (!user?.businessName) return NextResponse.json({ error: 'No business' }, { status: 403 });

    const [totalRevenue, totalPaidOut] = await Promise.all([
      Order.aggregate([
        { $match: { businesses: user.businessName, status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Payout.aggregate([
        { $match: { businessName: user.businessName } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const revenue = totalRevenue[0]?.total || 0;
    const paidOut = totalPaidOut[0]?.total || 0;
    const unpaid = Math.max(0, revenue - paidOut);

    return NextResponse.json({ unpaid, totalRevenue: revenue, totalPaidOut: paidOut });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — submit payout request + send email
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(payload.userId).select('businessName name email phone').lean() as any;
    if (!user?.businessName) return NextResponse.json({ error: 'No business' }, { status: 403 });

    const { accountNumber, bankName, accountName, amount } = await req.json();
    if (!accountNumber || !bankName || !accountName || !amount) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    // Record payout request
    const payout = await Payout.create({
      businessName: user.businessName,
      pharmacyName: user.businessName,
      pharmacistName: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      amount,
      accountNumber,
      bankName,
      accountName,
    });

    // Send email to sales team
    const emailHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:12px;">
        <h2 style="color:#0F6E56;margin-bottom:4px;">💰 New Payout Request</h2>
        <p style="color:#666;margin-bottom:24px;font-size:14px;">${new Date().toLocaleString('en-NG', { dateStyle: 'full', timeStyle: 'short' })}</p>

        <table style="width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;">
          <tr style="background:#0F6E56;color:white;">
            <th colspan="2" style="padding:12px 16px;text-align:left;font-size:13px;letter-spacing:0.5px;">PHARMACY DETAILS</th>
          </tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#666;border-bottom:1px solid #f0f0f0;">Pharmacy</td><td style="padding:10px 16px;font-size:13px;font-weight:700;border-bottom:1px solid #f0f0f0;">${user.businessName}</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#666;border-bottom:1px solid #f0f0f0;">Contact Name</td><td style="padding:10px 16px;font-size:13px;font-weight:700;border-bottom:1px solid #f0f0f0;">${user.name || '—'}</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#666;border-bottom:1px solid #f0f0f0;">Email</td><td style="padding:10px 16px;font-size:13px;font-weight:700;border-bottom:1px solid #f0f0f0;">${user.email || '—'}</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#666;">Phone</td><td style="padding:10px 16px;font-size:13px;font-weight:700;">${user.phone || '—'}</td></tr>
        </table>

        <table style="width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;margin-top:16px;">
          <tr style="background:#0F6E56;color:white;">
            <th colspan="2" style="padding:12px 16px;text-align:left;font-size:13px;letter-spacing:0.5px;">PAYMENT DETAILS</th>
          </tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#666;border-bottom:1px solid #f0f0f0;">Amount Requested</td><td style="padding:10px 16px;font-size:15px;font-weight:900;color:#0F6E56;border-bottom:1px solid #f0f0f0;">₦${Number(amount).toLocaleString()}</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#666;border-bottom:1px solid #f0f0f0;">Bank</td><td style="padding:10px 16px;font-size:13px;font-weight:700;border-bottom:1px solid #f0f0f0;">${bankName}</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#666;border-bottom:1px solid #f0f0f0;">Account Number</td><td style="padding:10px 16px;font-size:13px;font-weight:700;border-bottom:1px solid #f0f0f0;">${accountNumber}</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#666;">Account Name</td><td style="padding:10px 16px;font-size:13px;font-weight:700;">${accountName}</td></tr>
        </table>

        <p style="margin-top:24px;font-size:12px;color:#999;">Request ID: ${payout._id}</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'pharmastackxsales@gmail.com',
      subject: `Payout Request — ${user.businessName} — ₦${Number(amount).toLocaleString()}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true, requestId: payout._id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
