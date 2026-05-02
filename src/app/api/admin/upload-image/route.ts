import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function authorizeAdmin() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    if (!sessionToken?.value) return null;
    try {
        const payload: any = jwt.verify(sessionToken.value, JWT_SECRET);
        await dbConnect();
        const user = await User.findById(payload.userId).lean();
        return user?.role === 'admin' ? user : null;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    const admin = await authorizeAdmin();
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const folder = (formData.get('folder') as string) || 'general';

        if (!file) return NextResponse.json({ message: 'No file provided' }, { status: 400 });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `pulse/${folder}/${Date.now()}.${ext}`;

        const adminInstance = getFirebaseAdmin();
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        const bucket = adminInstance.storage().bucket(bucketName);

        const fileRef = bucket.file(filename);
        await fileRef.save(buffer, {
            contentType: file.type,
            public: true,
            metadata: { cacheControl: 'public, max-age=31536000' },
        });

        const url = `https://storage.googleapis.com/${bucketName}/${filename}`;
        return NextResponse.json({ url });
    } catch (error: any) {
        console.error('UPLOAD_IMAGE_ERROR', error);
        return NextResponse.json({ message: 'Upload failed', error: error.message }, { status: 500 });
    }
}
