import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function GET(req) {
  try {
    await dbConnect();

    const cookieHeader = req.headers.get('cookie');
    const sessionCookie = cookieHeader?.split('; ').find(c => c.startsWith('session_token='));
    const sessionToken = sessionCookie?.split('=')[1];

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = jwt.verify(sessionToken, JWT_SECRET);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await User.findById(payload.userId).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('API /user/me GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
