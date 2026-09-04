import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Called cross-origin from the web terminal (e.g. pro.psx.ng calling www.psx.ng),
// which needs the session_token cookie included — that only happens with
// credentials:'include' on the client AND a non-wildcard Access-Control-Allow-Origin
// plus Access-Control-Allow-Credentials here. Reflecting any *.psx.ng origin keeps
// this working regardless of which terminal subdomain calls it.
function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
  if (origin && /^https:\/\/([a-z0-9-]+\.)*psx\.ng$/.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function GET(req: Request) {
  const headers = corsHeaders(req.headers.get('origin'));
  await dbConnect();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token');

  if (!sessionToken) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401, headers });
  }

  try {
    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
    const user = await User.findById(payload.userId).select('terminalModules allowedModules').lean();

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404, headers });
    }

    return NextResponse.json({
      terminalModules: user.terminalModules || {},
      allowedModules: (user as any).allowedModules || {}
    }, { status: 200, headers });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401, headers });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500, headers });
  }
}

export async function PUT(req: Request) {
  const headers = corsHeaders(req.headers.get('origin'));
  await dbConnect();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token');

  if (!sessionToken) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401, headers });
  }

  try {
    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
    const body = await req.json();

    const allowedKeys = ['psxWeb', 'pos', 'emr', 'dispensary', 'orders', 'source', 'staff'];
    const terminalModules: Record<string, boolean> = {};
    for (const key of allowedKeys) {
      if (typeof body[key] === 'boolean') terminalModules[key] = body[key];
    }

    const updatedUser = await User.findByIdAndUpdate(
      payload.userId,
      { terminalModules },
      { new: true }
    ).select('terminalModules').lean();

    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404, headers });
    }

    return NextResponse.json({ terminalModules: updatedUser.terminalModules || {} }, { status: 200, headers });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401, headers });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500, headers });
  }
}
