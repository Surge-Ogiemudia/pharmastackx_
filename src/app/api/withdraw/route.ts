import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { transporter, mailOptions } from '@/lib/nodemailer';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch (error) {
    return null;
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await getSession(req);
  
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const earningsBalance = user.earnings || 0;
    
    if (earningsBalance <= 0) {
      return NextResponse.json({ message: 'No earnings available for withdrawal.' }, { status: 400 });
    }

    // Email details
    const adminEmail = 'pharmastackx@gmail.com';
    const withdrawalDetails = {
      from: adminEmail, // As requested: from pharmastackx@gmail.com
      to: adminEmail,   // to pharmastackx@gmail.com
      subject: `💸 Withdrawal Request: ${user.businessName || user.username}`,
      text: `
        NEW WITHDRAWAL REQUEST
        -----------------------
        Business/User: ${user.businessName || user.username}
        User ID: ${user._id}
        User Email: ${user.email}
        Role: ${user.role}
        
        REQUESTED AMOUNT: ₦${earningsBalance.toLocaleString()}
        
        Please process this withdrawal and update the user's balance accordingly.
      `,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #006D5B;">New Withdrawal Request</h2>
          <hr />
          <p><strong>Business/User:</strong> ${user.businessName || user.username}</p>
          <p><strong>User ID:</strong> <code>${user._id}</code></p>
          <p><strong>User Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${user.role}</p>
          <br />
          <div style="background: #f4f4f4; padding: 20px; border-radius: 12px; display: inline-block;">
            <p style="margin: 0; font-size: 14px; color: #666;">Requested Amount</p>
            <p style="margin: 0; font-size: 24px; fontWeight: 900; color: #000;">₦${earningsBalance.toLocaleString()}</p>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">Sent via PharmaStackX Automated Mission Control</p>
        </div>
      `
    };

    // Send the email
    await transporter.sendMail(withdrawalDetails);

    // Note: We don't deduct earnings here yet, as the admin should process it manually first.
    // Or we could move them to a 'pendingWithdrawal' bucket. 
    // For now, based on instructions, we just send the mail.

    return NextResponse.json({ 
      success: true, 
      message: 'Withdrawal request sent successfully. Our team will process it shortly.' 
    });

  } catch (error: any) {
    console.error('Error in POST /api/withdraw:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
