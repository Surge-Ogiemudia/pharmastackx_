import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * POST /api/pos-sync
 *
 * Called by the POS after every product create / update / delete / sale.
 * Mirrors the Synkk /api/sync pattern but skips AI classification
 * (POS products are already categorised by the pharmacy).
 *
 * Body shape:
 * {
 *   pharmacy_slug: string,
 *   updates: [{ posProductId, name, price, qty, manufacturer, expiryDate }],
 *   deletes: [posProductId, …]
 * }
 */
export async function POST(req: Request) {
  try {
    await dbConnect();

    // ── Auth ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing Authorization header' },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];
    if (token !== (process.env.POS_SYNC_API_KEY || 'pos-dev-token')) {
      return NextResponse.json(
        { success: false, error: 'Invalid API Key' },
        { status: 403 }
      );
    }

    // ── Parse payload ────────────────────────────────────────────────
    const body = await req.json();
    const { pharmacy_slug, updates, deletes } = body;

    if (
      !pharmacy_slug ||
      !Array.isArray(updates) ||
      !Array.isArray(deletes)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload schema' },
        { status: 400 }
      );
    }

    // ── Resolve pharmacy identity from PSX user record ───────────────
    const pharmacyUser = await User.findOne({ slug: pharmacy_slug });
    if (!pharmacyUser) {
      return NextResponse.json(
        { success: false, error: 'Pharmacy not found for that slug' },
        { status: 404 }
      );
    }
    const businessName = pharmacyUser.businessName || 'Unknown Pharmacy';
    const actual_slug = pharmacyUser.slug;

    // ── Upsert products ──────────────────────────────────────────────
    //  • $set: fields that should always reflect the POS value (price, qty, manufacturer)
    //  • $setOnInsert: fields that should only be set on first insert (so PSX-side
    //    enrichment like imageUrl, info, activeIngredient is never overwritten)
    const bulkOps = updates.map((item: {
      posProductId: string;
      name: string;
      price: number;
      qty: number;
      manufacturer?: string;
      expiryDate?: string | null;
    }) => {
      return {
        updateOne: {
          filter: { posProductId: item.posProductId, slug: actual_slug },
          update: {
            $set: {
              amount: Number(item.price) || 0,
              quantity: Number(item.qty) || 0,
              manufacturer: item.manufacturer || '',
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              source: 'pos',
            },
            $setOnInsert: {
              itemName: item.name,
              posProductId: item.posProductId,
              businessName: businessName,
              slug: actual_slug,
              isPublished: true,
              POM: false,
              activeIngredient: 'N/A',
              enrichmentStatus: 'pending',
            },
          },
          upsert: true,
        },
      };
    });

    let upsertCount = 0;
    if (bulkOps.length > 0) {
      const result = await Product.bulkWrite(bulkOps);
      upsertCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
    }

    // ── Delete products ──────────────────────────────────────────────
    //  Only removes POS-sourced products — never touches manually-added
    //  or Synkk-sourced products.
    let deletedCount = 0;
    if (deletes.length > 0) {
      const deleteResult = await Product.deleteMany({
        slug: actual_slug,
        source: 'pos',
        posProductId: { $in: deletes },
      });
      deletedCount = deleteResult.deletedCount || 0;
    }

    // ── Update pharmacy user sync metadata ───────────────────────────
    await User.updateOne(
      { slug: actual_slug },
      { $set: { lastPosSyncTime: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: `POS sync complete. Upserted ${upsertCount} items. Removed ${deletedCount} items.`,
    });
  } catch (error: unknown) {
    console.error('Fatal error in /api/pos-sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
