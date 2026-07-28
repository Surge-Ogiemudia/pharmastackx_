import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: Request) {
  try {
    const cookies = req.headers.get('cookie') || '';
    const match = cookies.match(/session_token=([^;]+)/);
    const token = match ? match[1] : null;

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
