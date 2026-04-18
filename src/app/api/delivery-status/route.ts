import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import DeliverySession from '@/models/DeliverySession';

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get('requestId');

  if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 });

  const sessions = await DeliverySession.find({ requestId }).lean() as any[];

  if (!sessions.length) return NextResponse.json({ status: 'none' });

  const accepted = sessions.find((s) => s.status === 'accepted');
  if (accepted) {
    return NextResponse.json({
      status: 'confirmed',
      agentName: accepted.agentName,
      agentPhone: accepted.phone,
    });
  }

  const waiting = sessions.filter((s) => s.status === 'waiting');
  return NextResponse.json({
    status: 'waiting',
    agentCount: waiting.length,
  });
}
