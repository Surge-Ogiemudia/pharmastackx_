
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { promises as fs } from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/verifications');

// Helper to ensure the upload directory exists
const ensureUploadDirExists = async () => {
    try {
        await fs.access(UPLOAD_DIR);
    } catch {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
};

export async function POST(req: Request) {
    await dbConnect();

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');

    if (!sessionToken) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
        const userId = payload.userId;

        if (!userId) {
            throw new Error('Invalid token payload');
        }

        await ensureUploadDirExists();
        
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ message: 'No file uploaded.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${userId}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filepath = path.join(UPLOAD_DIR, filename);
        const publicPath = `/uploads/verifications/${filename}`;

        await fs.writeFile(filepath, buffer);

        const user = await User.findById(userId);

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        user.professionalVerificationStatus = 'pending_review';
        user.verificationDocuments.push(publicPath);
        await user.save();

        return NextResponse.json({ message: 'File uploaded successfully', user }, { status: 200 });

    } catch (error) {
        console.error('Upload Verification Error:', error);
        if (error instanceof jwt.JsonWebTokenError) {
             return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
