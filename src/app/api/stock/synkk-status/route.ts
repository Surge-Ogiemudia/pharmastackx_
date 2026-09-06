import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import User from '@/models/User';
import ExtensionInventory from '@/models/ExtensionInventory';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    let user: any = null;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');

    if (sessionToken) {
      try {
        const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
        user = await User.findById(payload.userId).select('slug posType synkkMeta lastSyncTime businessName').lean();
      } catch (e) {}
    }

    // Fallback: check query parameter if session cookie is not set
    if (!user) {
      const slugParam = req.nextUrl.searchParams.get('slug') || req.nextUrl.searchParams.get('pharmacyId');
      if (slugParam) {
        user = await User.findOne({
          $or: [
            { slug: slugParam },
            { _id: /^[0-9a-fA-F]{24}$/.test(slugParam) ? slugParam : null }
          ].filter(Boolean)
        }).select('slug posType synkkMeta lastSyncTime businessName').lean();
      }
    }

    if (!user || !user.slug) {
      return NextResponse.json({ connected: false, itemCount: 0, lastSync: null, posType: 'unknown' });
    }

    const slug = user.slug;
    const pharmacyId = String(user._id);

    // 1. Check Extension Inventory
    const latestExtensionInv: any = await ExtensionInventory.findOne({
      $or: [
        { pharmacyId: pharmacyId },
        { pharmacyId: slug }
      ]
    }).sort({ lastSynced: -1 }).lean();

    // 2. Check Storefront Products
    const [productCount, lastSyncedProduct] = await Promise.all([
      Product.countDocuments({ slug, source: { $in: ['synkk', 'extension'] } }),
      Product.findOne({ slug, source: { $in: ['synkk', 'extension'] } }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
    ]);

    let isWebPosUser = false;
    if (user.posType === 'web-pos') {
      isWebPosUser = true;
    } else if (user.posType === 'desktop' || user.posType === 'local-app') {
      isWebPosUser = false;
    } else if (user.synkkMeta?.posMethod === 'web-pos') {
      isWebPosUser = true;
    } else if (latestExtensionInv && latestExtensionInv.items?.length > 0) {
      isWebPosUser = true;
    }

    if (isWebPosUser) {
      const extItemCount = latestExtensionInv?.items?.length || productCount || 0;
      const extLastSync = latestExtensionInv?.lastSynced || user.lastSyncTime || (lastSyncedProduct ? (lastSyncedProduct as any).updatedAt : null);

      return NextResponse.json({
        connected: extItemCount > 0,
        itemCount: extItemCount,
        lastSync: extLastSync,
        posType: 'web-pos',
        connectionType: 'web-pos',
        businessName: user.businessName
      });
    }

    // Desktop POS User
    return NextResponse.json({
      connected: productCount > 0,
      itemCount: productCount,
      lastSync: lastSyncedProduct ? (lastSyncedProduct as any).updatedAt : null,
      posType: 'desktop',
      connectionType: 'desktop',
      businessName: user.businessName
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
