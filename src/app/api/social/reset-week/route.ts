import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import DailyPost from '@/models/DailyPost';
import User from '@/models/User';

// TEMPORARY dev/test endpoint — delete this route before going to production
export async function DELETE(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_RESET) {
    return NextResponse.json({ message: 'Not allowed in production' }, { status: 403 });
  }

  await dbConnect();
  const { pharmacyId, slug } = await req.json();

  let resolvedId = pharmacyId;
  if (!resolvedId && slug) {
    const user = await User.findOne({ slug });
    if (!user) return NextResponse.json({ message: `No user found with slug "${slug}"` }, { status: 404 });
    resolvedId = String(user._id);
  }
  if (!resolvedId) return NextResponse.json({ message: 'Missing pharmacyId or slug' }, { status: 400 });

  const now    = new Date();
  const day    = now.getUTCDay();
  const diff   = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 7);

  const result = await DailyPost.deleteMany({
    pharmacyId: resolvedId,
    scheduledDate: { $gte: monday, $lt: sunday },
  });

  return NextResponse.json({ success: true, deleted: result.deletedCount });
}
