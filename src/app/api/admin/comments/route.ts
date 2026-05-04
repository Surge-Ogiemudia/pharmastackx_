import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import Comment from '@/models/Comment';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function authorizeAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token');
    if (!token?.value) return null;
    try {
        const payload: any = jwt.verify(token.value, JWT_SECRET);
        const user = await User.findById(payload.userId).lean();
        return user && (user as any).role === 'admin' ? user : null;
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const admin = await authorizeAdmin();
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    const postSlug = req.nextUrl.searchParams.get('postSlug');
    try {
        await dbConnect();
        const query: any = postSlug ? { postSlug } : {};
        const comments = await Comment.find(query).sort({ createdAt: -1 }).lean();
        return NextResponse.json(comments);
    } catch {
        return NextResponse.json({ message: 'Failed to fetch comments' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const admin = await authorizeAdmin();
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    try {
        const { id, approved } = await req.json();
        if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });
        await dbConnect();
        await Comment.findByIdAndUpdate(id, { approved });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ message: 'Failed to update comment' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const admin = await authorizeAdmin();
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });
    try {
        await dbConnect();
        await Comment.findByIdAndDelete(id);
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ message: 'Failed to delete comment' }, { status: 500 });
    }
}
