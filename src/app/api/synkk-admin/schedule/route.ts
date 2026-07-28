import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { slug, schedule } = body;

    if (!slug || !schedule) {
      return NextResponse.json({ error: 'Missing slug or schedule' }, { status: 400 });
    }
    
    if (!['6h', '12h', '24h', 'off'].includes(schedule)) {
      return NextResponse.json({ error: 'Invalid schedule value' }, { status: 400 });
    }

    await dbConnect();

    await User.updateOne(
      { slug },
      { $set: { 'synkkMeta.cloudSyncSchedule': schedule } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Schedule API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
