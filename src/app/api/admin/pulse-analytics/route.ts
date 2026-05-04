import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import Subscriber from '@/models/Subscriber';
import PageView from '@/models/PageView';
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

    try {
        await dbConnect();

        const [posts, subscribers, pageViews] = await Promise.all([
            Post.find({ status: 'published' })
                .select('title slug category views likes shares showViews showLikes showComments showShares createdAt')
                .sort({ createdAt: -1 })
                .lean(),
            Subscriber.countDocuments({ confirmed: true }),
            PageView.find().sort({ date: -1 }).limit(30).lean(),
        ]);

        const postIds = posts.map((p: any) => p._id);
        const commentCounts = await Comment.aggregate([
            { $match: { postId: { $in: postIds } } },
            { $group: { _id: '$postId', total: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$approved', false] }, 1, 0] } } } },
        ]);

        const commentMap: Record<string, { total: number; pending: number }> = {};
        commentCounts.forEach((c: any) => { commentMap[c._id.toString()] = { total: c.total, pending: c.pending }; });

        const enrichedPosts = posts.map((p: any) => ({
            ...p,
            comments: commentMap[p._id.toString()]?.total || 0,
            pendingComments: commentMap[p._id.toString()]?.pending || 0,
        }));

        const totalViews = posts.reduce((s: number, p: any) => s + (p.views || 0), 0);
        const totalLikes = posts.reduce((s: number, p: any) => s + (p.likes || 0), 0);
        const totalShares = posts.reduce((s: number, p: any) => s + (p.shares || 0), 0);
        const totalComments = Object.values(commentMap).reduce((s, c) => s + c.total, 0);
        const pendingComments = Object.values(commentMap).reduce((s, c) => s + c.pending, 0);

        return NextResponse.json({
            subscribers,
            totalViews,
            totalLikes,
            totalShares,
            totalComments,
            pendingComments,
            posts: enrichedPosts,
            dailyViews: pageViews,
        });
    } catch (error: any) {
        console.error('ANALYTICS_ERROR', error.message);
        return NextResponse.json({ message: 'Failed to fetch analytics' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const admin = await authorizeAdmin();
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    try {
        const { postId, field, value } = await req.json();
        const allowed = ['showViews', 'showLikes', 'showComments', 'showShares'];
        if (!postId || !allowed.includes(field)) {
            return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
        }

        await dbConnect();
        await Post.findByIdAndUpdate(postId, { [field]: value });
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to update setting' }, { status: 500 });
    }
}
