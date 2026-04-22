import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import AnalyticsEvent from '@/models/AnalyticsEvent';

export async function POST(req: NextRequest) {
  try {
    const { event, component, label, meta } = await req.json();
    if (!event || !component) return NextResponse.json({ ok: false }, { status: 400 });

    await dbConnect();

    const sessionId = req.cookies.get('psx_session')?.value
      || req.cookies.get('psx_guest_id')?.value
      || 'unknown';

    await AnalyticsEvent.create({
      event,
      path: component,
      component,
      label: label ?? undefined,
      meta: meta ?? undefined,
      sessionId,
      internal: false,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
