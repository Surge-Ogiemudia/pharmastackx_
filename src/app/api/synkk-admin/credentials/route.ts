import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { decryptMasterData } from '@/lib/encryption';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(req: Request) {
  try {
    const cookies = req.headers.get('cookie') || '';
    const match = cookies.match(/session_token=([^;]+)/);
    const token = match ? match[1] : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ slug }).select('encryptedWebPosData').lean();
    if (!user || !user.encryptedWebPosData) {
      return NextResponse.json({ error: 'No credentials found' }, { status: 404 });
    }

    let credentials;
    try {
      const decryptedData = decryptMasterData(user.encryptedWebPosData);
      credentials = JSON.parse(decryptedData);
    } catch (e) {
      console.error('Decryption error:', e);
      return NextResponse.json({ error: 'Failed to decrypt credentials' }, { status: 500 });
    }

    return NextResponse.json({
      username: credentials.username || credentials.email,
      password: credentials.password,
      url: credentials.url || credentials.loginUrl
    });
  } catch (error: any) {
    console.error('Credentials API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
