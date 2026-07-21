import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logout successful' });

  const cookieDomain = process.env.NODE_ENV === 'production' ? '.psx.ng' : undefined;

  // Clear the httpOnly session cookie (must match login's domain + path)
  response.cookies.set('session_token', '', {
    expires: new Date(0),
    httpOnly: true,
    path: '/',
    domain: cookieDomain,
  });

  // Clear the non-httpOnly role hint cookie
  response.cookies.set('psx_user_role', '', {
    expires: new Date(0),
    httpOnly: false,
    path: '/',
    domain: cookieDomain,
  });

  return response;
}
