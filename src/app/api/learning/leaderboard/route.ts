import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  await dbConnect();

  try {
    const url = new URL(req.url);
    const role = url.searchParams.get('role');
    const isCustomer = role === 'customer';
    
    const roleQuery = isCustomer 
        ? { role: 'customer' } 
        : { role: { $in: ['pharmacist', 'pharmacy', 'admin'] } };

    // Top 10 users ranked by XP
    const topUsers = await User.find(roleQuery)
      .sort({ xp: -1 })
      .limit(10)
      .select('username xp businessName profilePicture')
      .lean();

    return NextResponse.json(topUsers, { status: 200 });
  } catch (error) {
    console.error('Leaderboard GET API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
