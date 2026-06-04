import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import DailyPost from '@/models/DailyPost';

// TEMPORARY dev/test endpoint — delete this route before going to production
export async function DELETE(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_RESET) {
    return NextResponse.json({ message: 'Not allowed in production' }, { status: 403 });
  }

  await dbConnect();
  const { pharmacyId } = await req.json();
  if (!pharmacyId) return NextResponse.json({ message: 'Missing pharmacyId' }, { status: 400 });

  const now    = new Date();
  const day    = now.getUTCDay();
  const diff   = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 7);

  const result = await DailyPost.deleteMany({
    pharmacyId,
    scheduledDate: { $gte: monday, $lt: sunday },
  });

  return NextResponse.json({ success: true, deleted: result.deletedCount });
}
