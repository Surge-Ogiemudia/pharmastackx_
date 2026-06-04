import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import ContentPlan from '@/models/ContentPlan';
import DailyPost from '@/models/DailyPost';

function getMondayUTC(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const pharmacyId = url.searchParams.get('pharmacyId');
    if (!pharmacyId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const activePlan = await ContentPlan.findOne({ pharmacyId, status: 'active' }).sort({ createdAt: -1 });

    const dateParam = url.searchParams.get('date');
    let baseDateStr = dateParam;
    if (!baseDateStr) {
      const now = new Date();
      baseDateStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`;
    }

    const [y, m, d] = baseDateStr.split('-');
    const clientToday = new Date(Date.UTC(Number(y), Number(m)-1, Number(d)));

    // All posts for the week (Mon–Sun) that contains clientToday
    const weekStart = getMondayUTC(clientToday);
    const weekEnd   = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const weekPosts = await DailyPost.find({
      pharmacyId,
      scheduledDate: { $gte: weekStart, $lt: weekEnd },
    }).sort({ scheduledDate: 1 });

    return NextResponse.json({ activePlan, weekPosts });
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
