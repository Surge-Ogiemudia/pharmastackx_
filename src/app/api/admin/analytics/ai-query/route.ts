import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbConnect } from '@/lib/mongoConnect';
import AnalyticsEvent from '@/models/AnalyticsEvent';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { question } = await req.json();
  if (!question?.trim()) return NextResponse.json({ message: 'No question provided.' }, { status: 400 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ message: 'AI service not configured.' }, { status: 503 });
  }

  await dbConnect();

  // Build a compact data snapshot to feed the AI
  const now = new Date();
  const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
    dailyLastWeek,
  ] = await Promise.all([
    AnalyticsEvent.distinct('sessionId', { ...baseFilter, createdAt: { $gte: startOfToday } }),
    AnalyticsEvent.distinct('sessionId', { ...baseFilter, createdAt: { $gte: start7d } }),
    AnalyticsEvent.distinct('sessionId', { ...baseFilter, createdAt: { $gte: start30d } }),
    AnalyticsEvent.countDocuments({ ...baseFilter, event: 'page_view', createdAt: { $gte: start30d } }),
    AnalyticsEvent.aggregate([
      { $match: { ...baseFilter, event: 'page_view', createdAt: { $gte: start30d } } },
      { $group: { _id: '$path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: start30d }, country: { $nin: ['Unknown', 'Local'] } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: start30d } } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: start30d }, referrer: { $ne: '' } } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
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

  const dataContext = `
PharmaStackX Platform Analytics — Data snapshot as of ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}

VISITOR SUMMARY:
- Unique visitors today: ${visitorsToday.length}
- Unique visitors last 7 days: ${visitors7d.length}
- Unique visitors last 30 days: ${visitors30d.length}
- Total page views (30d): ${pageViews30d}

TOP PAGES (last 30 days):
${topPages.map(p => `  ${p._id}: ${p.count} views`).join('\n') || '  No data'}

TOP COUNTRIES (last 30 days):
${topCountries.map(c => `  ${c._id}: ${c.count} events`).join('\n') || '  No data'}

DEVICE BREAKDOWN (last 30 days):
${deviceBreakdown.map(d => `  ${d._id || 'Unknown'}: ${d.count}`).join('\n') || '  No data'}

TRAFFIC SOURCES / REFERRERS (last 30 days):
${referrerBreakdown.map(r => `  ${r._id}: ${r.count}`).join('\n') || '  No data'}

DAILY VISITOR TREND (last 7 days):
${dailyLastWeek.map((d: any) => `  ${d.date}: ${d.visitors} visitors`).join('\n') || '  No data'}
`.trim();

  const SYSTEM_PROMPT = `You are the PharmaStackX Data Centre AI — an intelligent analytics assistant for the PharmaStackX healthcare platform. 
You have access to real-time analytics data for the platform. Answer the admin's question accurately and concisely based ONLY on the data provided.
Be conversational but professional. Use numbers precisely. If data is insufficient to answer, say so honestly.
Do not make up numbers. Keep answers under 5 sentences unless a detailed breakdown is explicitly asked for.`;

  const model = genAI.getGenerativeModel({ model: 'gemma-4-26b-a4b-it' });
  const chat = model.startChat({ generationConfig: { maxOutputTokens: 600 } });

  const prompt = `${SYSTEM_PROMPT}\n\n--- ANALYTICS DATA ---\n${dataContext}\n\n--- ADMIN QUESTION ---\n${question}`;
  const result = await chat.sendMessage(prompt);
  const answer = result.response.text().trim();

  return NextResponse.json({ answer, dataContext: dataContext.substring(0, 200) + '...' });
}
