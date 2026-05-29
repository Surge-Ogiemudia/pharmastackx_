import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import AnalyticsEvent from '@/models/AnalyticsEvent';

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

    await dbConnect();

    const sessionId = req.cookies.get('psx_session')?.value
      || req.cookies.get('psx_guest_id')?.value
      || req.cookies.get('psx_sid')?.value
      || 'unknown';

    const ua = req.headers.get('user-agent') || '';
    // Skip bots
    if (/bot|crawl|spider|scraper/i.test(ua)) return NextResponse.json({ ok: true });

    await AnalyticsEvent.create({
      event: 'store_visit',
      path: `/${slug}`,
      component: 'StorePage',
      label: slug,
      sessionId,
      internal: false,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
