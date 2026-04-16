import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import AnalyticsEvent from '@/models/AnalyticsEvent';
import ExcludedDevice from '@/models/ExcludedDevice';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function parseUserAgent(ua: string = '') {
  let device = 'Desktop';
  let browser = 'Unknown';
  let os = 'Unknown';

  // Device
  if (/mobile|android|iphone|ipad|tablet/i.test(ua)) device = 'Mobile';
  if (/ipad|tablet/i.test(ua)) device = 'Tablet';

  // Browser
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua)) browser = 'Opera';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/msie|trident/i.test(ua)) browser = 'IE';

  // OS
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  return { device, browser, os };
}

async function resolveGeo(ip: string): Promise<{ country: string; city: string }> {
  try {
    // Skip private/local IPs
    if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.') || ip === '::1') {
      return { country: 'Local', city: 'Local' };
    }
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`, {
      signal: AbortSignal.timeout(2000), // 2s max — never block the response
    });
    if (!res.ok) return { country: 'Unknown', city: 'Unknown' };
    const data = await res.json();
    if (data.status !== 'success') return { country: 'Unknown', city: 'Unknown' };
    return { country: data.country || 'Unknown', city: data.city || 'Unknown' };
  } catch {
    return { country: 'Unknown', city: 'Unknown' };
  }
}

export async function POST(req: NextRequest) {
  try {
    // Always respond immediately — this is fire-and-forget from the client
    const payload = await req.json().catch(() => ({}));
    const { event = 'page_view', path = '/', sessionId = 'anon', referrer = '' } = payload;

    // --- Exclusion: Admin session check ---
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken.value, JWT_SECRET) as { role?: string };
        if (decoded.role === 'admin') {
          // Silently discard — admin traffic is internal
          return NextResponse.json({ ok: true });
        }
      } catch { /* invalid token — not admin, proceed */ }
    }

    // --- Exclusion: cookie-based device exclusion ---
    const excludeCookie = cookieStore.get('psx_exclude');
    if (excludeCookie?.value) {
      return NextResponse.json({ ok: true });
    }

    // --- Get IP ---
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = (forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || '');

    await dbConnect();

    // --- Exclusion: IP-based exclusion ---
    if (ip) {
      const excluded = await ExcludedDevice.findOne({ type: 'ip', value: ip });
      if (excluded) return NextResponse.json({ ok: true });
    }

    // --- Parse UA ---
    const ua = req.headers.get('user-agent') || '';
    const { device, browser, os } = parseUserAgent(ua);

    // --- Geo resolution (non-blocking) ---
    const { country, city } = await resolveGeo(ip);

    // --- Get userId from session if present ---
    let userId: string | undefined;
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken.value, JWT_SECRET) as { userId?: string };
        userId = decoded.userId;
      } catch { /* no userId */ }
    }

    await AnalyticsEvent.create({
      event,
      path,
      sessionId,
      ip,
      country,
      city,
      device,
      browser,
      os,
      referrer,
      userId,
      internal: false,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    // Never expose errors to the client — this is a silent background route
    console.error('[Analytics Track Error]', error.message);
    return NextResponse.json({ ok: true });
  }
}
