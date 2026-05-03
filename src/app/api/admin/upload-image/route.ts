import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import Media from '@/models/Media';

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
        const { data, contentType, filename } = await req.json();

        if (!data || !contentType) {
            return NextResponse.json({ message: 'Missing image data' }, { status: 400 });
        }

        await dbConnect();
        const media = await Media.create({ data, contentType, filename: filename || 'image' });

        const url = `/api/media/${media._id}`;
        return NextResponse.json({ url });
    } catch (error: any) {
        console.error('UPLOAD_IMAGE_ERROR', error.message);
        return NextResponse.json({ message: error.message || 'Upload failed' }, { status: 500 });
    }
}
