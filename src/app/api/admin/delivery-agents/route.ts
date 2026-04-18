import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import DeliveryAgent from '@/models/DeliveryAgent';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const state = req.nextUrl.searchParams.get('state');
  if (!state) return NextResponse.json({ error: 'state required' }, { status: 400 });

  const doc = await DeliveryAgent.findOne({ state }).lean();
  return NextResponse.json({ agents: doc?.agents ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
