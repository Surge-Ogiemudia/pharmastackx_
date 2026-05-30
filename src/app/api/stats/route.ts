import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Request from '@/models/Request';
import User from '@/models/User';

// Revalidate cached response every hour
export const revalidate = 3600;

export async function GET() {
  try {
    await dbConnect();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [searchCount, pharmacistCount, responseData] = await Promise.all([
      // Total requests in last 30 days → divide for daily average
      Request.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),

      // All pharmacy/pharmacist accounts
      User.countDocuments({ role: { $in: ['pharmacy', 'pharmacist'] } }),

      // Avg time from request created → first quote, across last 200 quoted requests
      Request.aggregate([
        { $match: { 'quotes.0': { $exists: true } } },
        { $sort: { createdAt: -1 } },
        { $limit: 200 },
        {
          $project: {
            responseMs: {
              $subtract: [
                { $arrayElemAt: ['$quotes.quotedAt', 0] },
                '$createdAt',
              ],
            },
          },
        },
        { $match: { responseMs: { $gt: 0 } } },
        { $group: { _id: null, avgMs: { $avg: '$responseMs' } } },
      ]),
    ]);

    const dailySearches = Math.round(searchCount / 30);
    const avgResponseMin = responseData[0]?.avgMs
      ? Math.max(1, Math.round(responseData[0].avgMs / 60000))
      : null;

    return NextResponse.json({
      dailySearches: Math.max(dailySearches, 1),
      pharmacists: pharmacistCount,
      avgResponseMin,
    });
  } catch (e) {
    console.error('Stats error:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
