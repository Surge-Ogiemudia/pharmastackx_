import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();

    // Query for any businessName that matches the user's list (case-insensitive regex)
    const users = await User.find({
      $or: [
        { businessName: { $regex: /nat\s*k/i } },
        { businessName: { $regex: /mantle/i } },
        { businessName: { $regex: /ernosa/i } },
        { businessName: { $regex: /divine\s*lifegate/i } }
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
