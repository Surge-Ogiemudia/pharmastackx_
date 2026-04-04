
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token');

  if (!sessionToken) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  try {
    await dbConnect();

    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { 
      userId: string; 
      role?: string; 
      pharmacyId?: string;
    };
    const userId = payload.userId;

    if (!userId) {
      throw new Error('Invalid token payload');
    }

    const user = await User.findById(userId).select('-password -verificationDocuments -fcmTokens').lean();

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });

  } catch (error) {
    console.error('Session API Error:', error);
    return NextResponse.json({ message: 'Authentication failed' }, { status: 401 });
  }
}
