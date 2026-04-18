import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import DeliveryAgent from '@/models/DeliveryAgent';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

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

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const state = req.nextUrl.searchParams.get('state');
  if (!state) return NextResponse.json({ error: 'state required' }, { status: 400 });

  const doc = await DeliveryAgent.findOne({ state }).lean();
  return NextResponse.json({ agents: doc?.agents ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const { state, agents } = await req.json();
  if (!state || !Array.isArray(agents)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const doc = await DeliveryAgent.findOneAndUpdate(
    { state },
    { $set: { agents } },
    { upsert: true, new: true }
  );
  return NextResponse.json({ agents: doc.agents });
}
