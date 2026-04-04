import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logout successful' });
  response.cookies.set('session_token', '', { expires: new Date(0), httpOnly: true });
  return response;
}
