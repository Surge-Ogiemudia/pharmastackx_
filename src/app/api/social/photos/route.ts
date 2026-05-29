import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import Media from '@/models/Media';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token');
  if (!token) return null;
  try {
    const payload = jwt.verify(token.value, JWT_SECRET) as { userId: string };
    return payload.userId;
  } catch { return null; }
}

// POST — upload a photo to the library
export async function POST(req: NextRequest) {
  await dbConnect();
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });

  const { data, contentType, filename, tag } = await req.json();
  if (!data || !contentType) return NextResponse.json({ message: 'Missing image data' }, { status: 400 });

  const media = await Media.create({ data, contentType, filename: filename || 'photo' });
  const url = `/api/media/${media._id}`;

  await User.findByIdAndUpdate(userId, {
    $push: { socialPhotos: { url, tag: tag || 'other', uploadedAt: new Date() } },
  });

  return NextResponse.json({ url }, { status: 201 });
}

// DELETE — remove a photo by url
export async function DELETE(req: NextRequest) {
  await dbConnect();
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });

  const { url } = await req.json();
  if (!url) return NextResponse.json({ message: 'Missing url' }, { status: 400 });

  await User.findByIdAndUpdate(userId, { $pull: { socialPhotos: { url } } });

  // Also delete the Media document
  const mediaId = url.split('/api/media/')[1];
  if (mediaId) await Media.findByIdAndDelete(mediaId).catch(() => {});

  return NextResponse.json({ ok: true });
}
