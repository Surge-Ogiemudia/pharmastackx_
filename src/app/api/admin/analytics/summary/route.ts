import { NextResponse } from 'next/server';
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

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await dbConnect();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const baseFilter = { internal: false };

  const [
    visitorsToday,
    visitors7d,
    visitors30d,
    pageViews30d,
    topPages,
    topCountries,
    deviceBreakdown,
    referrerBreakdown,
    hourlyToday,
    dailyLastWeek,
  ] = await Promise.all([
    // Unique sessions today
    AnalyticsEvent.distinct('sessionId', { ...baseFilter, createdAt: { $gte: startOfToday } }),
    // Unique sessions 7d
    AnalyticsEvent.distinct('sessionId', { ...baseFilter, createdAt: { $gte: start7d } }),
    // Unique sessions 30d
    AnalyticsEvent.distinct('sessionId', { ...baseFilter, createdAt: { $gte: start30d } }),
    // Raw page views 30d
    AnalyticsEvent.countDocuments({ ...baseFilter, event: 'page_view', createdAt: { $gte: start30d } }),
    // Top 8 pages (30d)
    AnalyticsEvent.aggregate([
      { $match: { ...baseFilter, event: 'page_view', createdAt: { $gte: start30d } } },
      { $group: { _id: '$path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    // Top 6 countries (30d)
    AnalyticsEvent.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: start30d }, country: { $nin: ['Unknown', 'Local'] } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    // Device breakdown (30d)
    AnalyticsEvent.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: start30d } } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Referrer breakdown (30d)
    AnalyticsEvent.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: start30d }, referrer: { $ne: '' } } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    // Hourly breakdown today
    AnalyticsEvent.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: startOfToday } } },
      { $group: {
        _id: { $hour: { date: '$createdAt', timezone: 'Africa/Lagos' } },
        count: { $sum: 1 }
      }},
      { $sort: { '_id': 1 } },
    ]),
    // Daily visitors last 7 days
    AnalyticsEvent.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: start7d } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Africa/Lagos' } },
        sessions: { $addToSet: '$sessionId' }
      }},
      { $project: { date: '$_id', visitors: { $size: '$sessions' } } },
      { $sort: { date: 1 } },
    ]),
  ]);

  return NextResponse.json({
    summary: {
      visitorsToday: visitorsToday.length,
      visitors7d: visitors7d.length,
      visitors30d: visitors30d.length,
      pageViews30d,
    },
    topPages: topPages.map(p => ({ path: p._id, count: p.count })),
    topCountries: topCountries.map(c => ({ country: c._id, count: c.count })),
    deviceBreakdown: deviceBreakdown.map(d => ({ device: d._id || 'Unknown', count: d.count })),
    referrerBreakdown: referrerBreakdown.map(r => ({ referrer: r._id, count: r.count })),
    hourlyToday: hourlyToday.map(h => ({ hour: h._id, count: h.count })),
    dailyLastWeek: dailyLastWeek.map(d => ({ date: d.date, visitors: d.visitors })),
    generatedAt: new Date().toISOString(),
  });
}
