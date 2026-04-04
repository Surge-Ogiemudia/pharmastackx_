import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Consultation from '@/models/Consultation';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { transporter } from '@/lib/nodemailer';

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

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getSession(req);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(session.userId);
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
        const consultation = await Consultation.findById(id).populate('userId', 'username email');
        return NextResponse.json(consultation);
    }

    let query: any = {};
    if (user.role === 'admin') {
      // Admin sees all escalated or all consultations if needed
      const type = searchParams.get('type') || 'escalated';
      if (type === 'escalated') query.status = 'escalated';
    } else {
      query.userId = session.userId;
    }

    const consultations = await Consultation.find(query).sort({ updatedAt: -1 });
    return NextResponse.json(consultations);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getSession(req);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(session.userId);
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ message: 'Only admins can respond as pharmacists' }, { status: 403 });
    }

    const { consultationId, text } = await req.json();
    if (!consultationId || !text) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const consultation = await Consultation.findById(consultationId).populate('userId', 'email username');
    if (!consultation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    consultation.messages.push({
        sender: 'pharmacist',
        text: text,
        timestamp: new Date()
    });
    consultation.updatedAt = new Date();
    await consultation.save();

    // Notify user via email
    if (consultation.userId && consultation.userId.email) {
        await sendResponseEmail(consultation.userId.email, consultation.userId.username, text);
    }

    return NextResponse.json(consultation);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function sendResponseEmail(to: string, name: string, text: string) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: to,
            subject: '💊 New Response from your Pharmacist',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                    <h3>Hi ${name},</h3>
                    <p>Our pharmacist has responded to your consultation:</p>
                    <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #0F6E56; margin: 20px 0;">
                        "${text}"
                    </div>
                    <p>Open the PharmaStackX app to continue the conversation.</p>
                </div>
            `
        });
    } catch (e) {
        console.error("Mail err:", e);
    }
}
