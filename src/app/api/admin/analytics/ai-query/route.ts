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

  const dataContext = `PharmaStackX Analytics — ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}

Visitors today: ${visitorsToday.length} | Last 7 days: ${visitors7d.length} | Last 30 days: ${visitors30d.length}
Page views (30d): ${pageViews30d}

Top pages (30d): ${topPages.map(p => `${p._id} (${p.count} views)`).join(', ') || 'none'}
Top countries (30d): ${topCountries.map(c => `${c._id} (${c.count})`).join(', ') || 'none'}
Devices (30d): ${deviceBreakdown.map(d => `${d._id || 'Unknown'}: ${d.count}`).join(', ') || 'none'}
Top referrers (30d): ${referrerBreakdown.map(r => `${r._id}: ${r.count}`).join(', ') || 'none'}
Daily trend: ${dailyLastWeek.map((d: any) => `${d.date}: ${d.visitors}`).join(', ') || 'none'}`;

  const prompt = `You are a helpful analytics assistant for PharmaStackX. 

STRICT RULE: Only output the conversational reply. NEVER output labels like "User:", "Context:", or "Final Response:". NEVER think out loud or drafts. Be brief (1-3 sentences). Warm and human. No asterisks.

Current analytics data:
${dataContext}

Question: ${question}

Your reply:`;

function sanitizeResponse(text: string): string {
  const markers = [
    /\*?\*?Final Response\*?\*?:\s*/i,
    /\*?\*?Final Result\*?\*?:\s*/i,
    /\*?\*?Selected Response\*?\*?:\s*/i,
    /\*?\*?Response\*?\*?:\s*/i,
    /\*?\*?Your reply\*?\*?:\s*/i
  ];

  let cleaned = text;
  for (const marker of markers) {
    if (marker.test(cleaned)) {
      const parts = cleaned.split(marker);
      cleaned = parts[parts.length - 1].trim();
      break;
    }
  }

  if (cleaned.includes('*')) {
     const sections = cleaned.split(/\*[^*]+\*/);
     if (sections.length > 1) {
       cleaned = sections.pop()?.trim() || cleaned;
     }
  }

  cleaned = cleaned.replace(/^User says:.*$/im, '')
                   .replace(/^Context:.*$/im, '')
                   .replace(/^Drafting response:.*$/im, '')
                   .trim();

  // Deduplication
  const mid = Math.floor(cleaned.length / 2);
  const firstHalf = cleaned.substring(0, mid).trim();
  const secondHalf = cleaned.substring(mid).trim();
  if (firstHalf === secondHalf && firstHalf.length > 5) return firstHalf;

  return cleaned || "I couldn't find a direct answer in that data. Could you try rephrasing?";
}

  const model = genAI.getGenerativeModel({ model: 'gemma-4-26b-a4b-it' });
  const result = await model.generateContent(prompt);
  const answer = sanitizeResponse(result.response.text());

  return NextResponse.json({ answer });
}
