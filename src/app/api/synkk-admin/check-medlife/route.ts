import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();

    const users = await User.find({
      $or: [
        { businessName: { $regex: 'medlife', $options: 'i' } },
        { slug: { $regex: 'medlife', $options: 'i' } },
        { phoneNumber: { $regex: '8106292804' } },
        { mobile: { $regex: '8106292804' } }
      ]
    }).lean();

    return NextResponse.json({
      count: users.length,
      users: users.map(u => ({
        _id: u._id,
        businessName: u.businessName,
        slug: u.slug,
        role: u.role,
        phone: u.phoneNumber || u.mobile,
        email: u.email,
        appVersion: u.appVersion,
        lastSyncTime: u.lastSyncTime,
        hasCredentials: !!u.encryptedWebPosData,
        synkkMeta: u.synkkMeta
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
