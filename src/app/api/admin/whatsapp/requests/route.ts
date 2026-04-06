import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import WhatsAppRequest from '@/models/WhatsAppRequest';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function getAdminSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token');
  if (!sessionToken) return null;

  try {
    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string; role?: string };
    if (payload.role !== 'admin') return null;
    return payload;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    // Fetch last 50 WhatsApp requests, sorted by newest first
    const requests = await WhatsAppRequest.find()
      .sort({ createdAt: -1 })
      .limit(50);
    
    return NextResponse.json(requests);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
