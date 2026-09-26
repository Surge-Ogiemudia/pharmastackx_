import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { getAdminFromRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }
  try {
    await dbConnect();

    const users = await User.find({
      $or: [
        { businessName: { $regex: /divine/i } },
        { businessName: { $regex: /lifegate/i } }
      ]
    }).select('businessName slug email _id');

    return NextResponse.json({ 
      count: users.length,
      pharmacies: users 
    });

  } catch (error: any) {
    console.error('Verify error:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
