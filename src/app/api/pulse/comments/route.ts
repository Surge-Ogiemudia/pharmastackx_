import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Post from '@/models/Post';
import Comment from '@/models/Comment';

export async function GET(req: NextRequest) {
    const slug = req.nextUrl.searchParams.get('slug');
    if (!slug) return NextResponse.json({ message: 'Missing slug' }, { status: 400 });

    try {
        await dbConnect();
        const comments = await Comment.find({ postSlug: slug, approved: true })
            .select('name content createdAt')
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json(comments);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch comments' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { slug, name, email, content } = await req.json();
        if (!slug || !name?.trim() || !content?.trim()) {
            return NextResponse.json({ message: 'Name and comment are required' }, { status: 400 });
        }
        if (content.length > 1000) {
            return NextResponse.json({ message: 'Comment too long (max 1000 characters)' }, { status: 400 });
        }

        await dbConnect();
        const post = await Post.findOne({ slug }).select('_id').lean() as { _id: any } | null;
        if (!post) return NextResponse.json({ message: 'Post not found' }, { status: 404 });

        await Comment.create({
            postId: post._id,
            postSlug: slug,
            name: name.trim().slice(0, 80),
            email: email?.trim().toLowerCase() || undefined,
            content: content.trim(),
        });

        return NextResponse.json({ message: 'Comment submitted and awaiting approval' }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to submit comment' }, { status: 500 });
    }
}
