import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import SynkkLog from '@/models/SynkkLog';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No session token found' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Requires admin role' }, { status: 403 });
      }
    } catch (e: any) {
      console.error('JWT Verify Error:', e.message);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await dbConnect();

    const users = await User.find({ 
      slug: { $exists: true, $nin: [null, ''] } 
    }).select('businessName slug lastSyncTime lastSyncTier appVersion encryptedWebPosData synkkMeta').lean();

    const pharmacyList = await Promise.all(users.map(async (user: any) => {
      const latestLog = await SynkkLog.findOne({ pharmacySlug: user.slug })
        .sort({ timestamp: -1 })
        .select('result timestamp errorCode errorMessage itemsExtracted')
        .lean();

      return {
        _id: user._id,
        businessName: user.businessName,
        slug: user.slug,
        lastSyncTime: user.lastSyncTime,
        lastSyncTier: user.lastSyncTier,
        appVersion: user.appVersion,
        hasCredentials: !!user.encryptedWebPosData,
        synkkMeta: user.synkkMeta,
        latestLog: latestLog || null
      };
    }));

    return NextResponse.json(pharmacyList);
  } catch (error: any) {
    console.error('Pharmacies list error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
