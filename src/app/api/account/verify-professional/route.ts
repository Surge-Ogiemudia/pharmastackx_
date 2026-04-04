import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { transporter } from '@/lib/nodemailer';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req: Request) {
    try {
        await dbConnect();

        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session_token');

        if (!sessionToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let userId: string;
        try {
            const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
            userId = payload.userId;
        } catch (error) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Convert file to Buffer for email attachment
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Update user status
        await User.findByIdAndUpdate(userId, {
            professionalVerificationStatus: 'pending_review',
            // We can store the filename as a placeholder in the array
            $push: { verificationDocuments: file.name }
        });

        // Send Email to Admin (Async/Non-blocking)
        const mailOptions = {
            from: process.env.EMAIL_USER || 'pharmastackx@gmail.com',
            to: 'pharmastackx@gmail.com',
            subject: `Professional Verification Request: ${user.username}`,
            text: `User ${user.username} (${user.email}) has uploaded their professional verification document for review.\n\nRole: ${user.role}\nBusiness: ${user.businessName || 'N/A'}`,
            attachments: [
                {
                    filename: file.name,
                    content: buffer
                }
            ]
        };

        // Fire and forget email sending to speed up response
        transporter.sendMail(mailOptions).then(() => {
            console.log('Verification email sent for:', user.username);
        }).catch((emailError) => {
            console.error('Email sending failed in background:', emailError);
        });

        return NextResponse.json({ message: 'Document submitted for review successfully' });

    } catch (error) {
        console.error('RX Verification Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
