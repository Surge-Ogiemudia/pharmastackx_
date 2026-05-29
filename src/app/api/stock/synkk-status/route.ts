import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import User from '@/models/User';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
    const user = await User.findById(payload.userId).select('slug').lean();
    if (!user || !(user as any).slug) return NextResponse.json({ connected: false, itemCount: 0, lastSync: null });

    const slug = (user as any).slug;

    const [itemCount, lastSyncedProduct] = await Promise.all([
      Product.countDocuments({ slug, source: 'synkk' }),
      Product.findOne({ slug, source: 'synkk' }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
    ]);

    return NextResponse.json({
      connected: itemCount > 0,
      itemCount,
      lastSync: lastSyncedProduct ? (lastSyncedProduct as any).updatedAt : null,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
