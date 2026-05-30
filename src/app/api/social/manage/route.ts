import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import ContentPlan from '@/models/ContentPlan';
import DailyPost from '@/models/DailyPost';

// Replace with however next-auth session is configured, or just use user email from request if using custom auth.
// Based on typical PharmastackX pattern, we might receive user info in headers or body.

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    // In a real implementation, extract userId from session. We will assume the client passes pharmacyId in query for now.
    const url = new URL(req.url);
    const pharmacyId = url.searchParams.get('pharmacyId');
    
    if (!pharmacyId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const activePlan = await ContentPlan.findOne({ pharmacyId, status: 'active' }).sort({ createdAt: -1 });
    const pendingPlan = await ContentPlan.findOne({ pharmacyId, status: 'pending_approval' }).sort({ createdAt: -1 });

    // Fetch posts for today and tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const todaysPost = await DailyPost.findOne({ pharmacyId, scheduledDate: { $gte: today, $lt: tomorrow } });
    const tomorrowsPost = await DailyPost.findOne({ pharmacyId, scheduledDate: { $gte: tomorrow, $lt: dayAfter } });

    return NextResponse.json({
      activePlan,
      pendingPlan,
      todaysPost,
      tomorrowsPost
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const { postId, status, caption, hashtags } = await req.json();
    
    if (!postId || !status) return NextResponse.json({ message: 'Missing fields' }, { status: 400 });

    const updateData: any = { status };
    if (caption) updateData.caption = caption;
    if (hashtags) updateData.hashtags = hashtags;

    const post = await DailyPost.findByIdAndUpdate(postId, updateData, { new: true });
    
    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
