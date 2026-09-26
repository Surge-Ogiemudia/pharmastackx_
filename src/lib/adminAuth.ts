import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

/**
 * Resolves the logged-in admin from the session_token cookie.
 * Returns the admin user document, or null if the caller is not an authenticated admin.
 * The role is re-read from the database so a demoted user loses access immediately.
 */
export async function getAdminFromRequest(req: NextRequest | Request) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)session_token=([^;]+)/);
  if (!match) return null;

  try {
    const payload = jwt.verify(decodeURIComponent(match[1]), secret) as { userId?: string };
    if (!payload?.userId) return null;
    await dbConnect();
    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'admin') return null;
    return user;
  } catch {
    return null;
  }
}
