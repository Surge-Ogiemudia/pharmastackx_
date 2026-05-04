import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Post from '@/models/Post';
import PageView from '@/models/PageView';

export async function POST(req: NextRequest) {
    try {
        const { action, slug } = await req.json();
        if (!slug || !['view', 'like', 'unlike', 'share'].includes(action)) {
            return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
        }

        await dbConnect();

        if (action === 'view') {
            await Post.findOneAndUpdate({ slug }, { $inc: { views: 1 } });
            const today = new Date().toISOString().slice(0, 10);
            await PageView.findOneAndUpdate(
                { date: today },
                { $inc: { count: 1 } },
                { upsert: true }
            );
        } else if (action === 'like') {
            await Post.findOneAndUpdate({ slug }, { $inc: { likes: 1 } });
        } else if (action === 'unlike') {
            await Post.findOneAndUpdate({ slug }, { $inc: { likes: -1 } });
        } else if (action === 'share') {
            await Post.findOneAndUpdate({ slug }, { $inc: { shares: 1 } });
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('TRACK_ERROR', error.message);
        return NextResponse.json({ message: 'Failed to track' }, { status: 500 });
    }
}
