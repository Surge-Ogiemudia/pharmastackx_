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

    // Parse today using YYYY-MM-DD matching the server's current UTC date
    // Note: The client's 'today' might differ slightly from server's UTC 'today', 
    // but the client explicitly passes the 'date' param which we use for selectedPost.
    // For todaysPost and tomorrowsPost, if dateParam is passed, we can calculate based on it,
    // or just use server's UTC today. Let's use the dateParam as the source of truth if provided.
    const dateParam = url.searchParams.get('date');
    let baseDateStr = dateParam;
    if (!baseDateStr) {
      const now = new Date();
      baseDateStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    }

    const [y, m, d] = baseDateStr.split('-');
    const clientToday = new Date(Date.UTC(Number(y), Number(m)-1, Number(d)));

    const tomorrow = new Date(clientToday);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);

    // We consider 'todaysPost' to be the post matching the date the client is looking at
    // if dateParam is today's date for them.
    const todaysPost = await DailyPost.findOne({ pharmacyId, scheduledDate: { $gte: clientToday, $lt: tomorrow } });
    const tomorrowsPost = await DailyPost.findOne({ pharmacyId, scheduledDate: { $gte: tomorrow, $lt: dayAfter } });

    // selectedPost is technically just todaysPost since we use the requested date as clientToday
    let selectedPost = todaysPost;

    return NextResponse.json({
      activePlan,
      pendingPlan,
      todaysPost,
      tomorrowsPost,
      selectedPost
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
