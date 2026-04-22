import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import AnalyticsEvent from '@/models/AnalyticsEvent';

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
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '7', 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const filter = { component: { $exists: true }, createdAt: { $gte: since } };

  const [totalToday, totalPeriod, byComponent, recent] = await Promise.all([
    AnalyticsEvent.countDocuments({ ...filter, createdAt: { $gte: startOfToday } }),
    AnalyticsEvent.countDocuments(filter),

    // Group by component + event + label
    AnalyticsEvent.aggregate([
      { $match: filter },
      { $group: { _id: { component: '$component', event: '$event', label: '$label' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
      { $project: { _id: 0, component: '$_id.component', event: '$_id.event', label: '$_id.label', count: 1 } },
    ]),

    // Recent feed
    AnalyticsEvent.find(filter)
      .sort({ createdAt: -1 })
      .limit(60)
      .select('event component label meta userId createdAt')
      .lean(),
  ]);

  // Conversion funnel
  const funnelSteps = [
    { step: 'Request Submitted', event: 'request_submitted' },
    { step: 'Payment Initiated', event: 'payment_initiated' },
    { step: 'Payment Confirmed', event: 'payment_confirmed' },
    { step: 'Rider Dispatched', event: 'rider_dispatched' },
    { step: 'Rider Confirmed', event: 'rider_confirmed' },
  ];

  const funnelCounts = await Promise.all(
    funnelSteps.map(({ event }) =>
      AnalyticsEvent.countDocuments({ event, createdAt: { $gte: since } })
    )
  );

  const funnel = funnelSteps.map(({ step }, i) => ({ step, count: funnelCounts[i] }));

  return NextResponse.json({ totalToday, totalPeriod, byComponent, recent, funnel, days });
}
