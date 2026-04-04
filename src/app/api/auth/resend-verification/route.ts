
import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { transporter, mailOptions } from '@/lib/nodemailer';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req: NextRequest) {
    await dbConnect();
    const sessionToken = req.cookies.get('session_token');

    if (!sessionToken) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
        const userId = payload.userId;

        if (!userId) {
            throw new Error('Invalid token payload');
        }

        const user = await User.findById(userId);

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        if (user.emailVerified) {
            return NextResponse.json({ message: 'Email is already verified' }, { status: 400 });
        }

        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationTokenExpires = new Date(Date.now() + 3600000); // 1 hour

        user.emailVerificationToken = emailVerificationToken;
        user.emailVerificationTokenExpires = emailVerificationTokenExpires;
        await user.save();

        const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
        const protocol = req.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = `${protocol}://${host}`;
        const verificationUrl = `${baseUrl}/api/auth/verify-and-redirect?token=${emailVerificationToken}`;

        // Send verification email in the background (non-blocking)
        transporter.sendMail({
            ...mailOptions,
            to: user.email,
            subject: 'Verify your email address',
            text: `Please click the following link to verify your email address: ${verificationUrl}`,
            html: `<p>Please click the following link to verify your email address: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
        }).then(() => {
            console.log('Verification email sent to:', user.email);
        }).catch(err => {
            console.error('Email sending failed in background:', err);
        });

        return NextResponse.json({ message: 'Verification email sent' }, { status: 200 });

    } catch (error) {
        console.error('Resend Verification Error:', error);
        if (error instanceof jwt.JsonWebTokenError) {
             return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
