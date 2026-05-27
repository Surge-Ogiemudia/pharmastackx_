import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    await dbConnect();

    // 1. Basic Security Check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Missing Authorization header' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    if (token !== (process.env.SYNKK_API_KEY || 'dev-token')) {
      return NextResponse.json({ success: false, error: 'Invalid API Key' }, { status: 403 });
    }

    // 2. Parse Payload
    const body = await req.json();
    const { pharmacy_slug, sync_batch_id, inventory } = body;

    if (!pharmacy_slug || !sync_batch_id || !Array.isArray(inventory)) {
      return NextResponse.json({ success: false, error: 'Invalid payload schema' }, { status: 400 });
    }

    // 3. Find the Pharmacy to get their businessName
    const pharmacyUser = await User.findOne({ slug: pharmacy_slug });
    
    if (!pharmacyUser) {
      return NextResponse.json({ success: false, error: 'Pharmacy not found for that slug' }, { status: 404 });
    }
    const businessName = pharmacyUser.businessName || 'Unknown Pharmacy';
    const actual_slug = pharmacyUser.slug;

    // 4. Bulk Upsert Operations
    // We strictly UPSERT based on itemName and slug so we don't destroy AI-enriched fields (imageUrl, info, etc)
    const bulkOps = inventory.map((item: any) => {
      // Clean up the incoming data
      const itemName = item.name;
      const amount = Number(item.price) || 0;
      const quantity = Number(item.qty) || 0;

      return {
        updateOne: {
          filter: { itemName: itemName, slug: actual_slug },
          update: {
            $set: {
              amount: amount,
              quantity: quantity,
              syncBatchId: sync_batch_id,
              source: 'synkk'
            },
            // Only set these if it's a completely brand new item being inserted
            $setOnInsert: {
              itemName: itemName,
              businessName: businessName,
              slug: actual_slug,
              isPublished: true,
              POM: false,
              enrichmentStatus: 'pending' // Flag it so the AI enrichment engine knows to process it later
            }
          },
          upsert: true
        }
      };
    });

    // Execute the bulk upsert
    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }

    // 5. Clean up old deleted items
    // Anything that belongs to this pharmacy but does NOT have the new syncBatchId was deleted from their local POS.
    const deleteResult = await Product.deleteMany({
      slug: actual_slug,
      source: 'synkk',
      syncBatchId: { $ne: sync_batch_id }
    });

    return NextResponse.json({
      success: true,
      message: `Sync complete. Upserted ${inventory.length} items. Removed ${deleteResult.deletedCount} out-of-stock items.`,
      newSlug: actual_slug
    });

  } catch (error: any) {
    console.error("Fatal error in /api/sync:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
