import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import UserModel from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const IMPERSONATE_SECRET = 'feelnew-temp-2024-delete-me';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const slug = searchParams.get('slug');

    if (secret !== IMPERSONATE_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ slug });
    if (!user) {
      return NextResponse.json({ error: 'User not found with that slug' }, { status: 404 });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email, pharmacyId: user.pharmacy },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    if (baseUrl && !baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;
    const response = NextResponse.redirect(`${baseUrl}/store-management`);

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60,
      path: '/',
    });

    response.cookies.set('psx_user_role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('[impersonate] Error:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
