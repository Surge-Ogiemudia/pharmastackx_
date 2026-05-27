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
    const { pharmacy_slug, updates, deletes } = body;

    if (!pharmacy_slug || !Array.isArray(updates) || !Array.isArray(deletes)) {
      return NextResponse.json({ success: false, error: 'Invalid payload schema' }, { status: 400 });
    }

    // 3. Find the Pharmacy to get their businessName
    const pharmacyUser = await User.findOne({ slug: pharmacy_slug });
    
    if (!pharmacyUser) {
      return NextResponse.json({ success: false, error: 'Pharmacy not found for that slug' }, { status: 404 });
    }
    const businessName = pharmacyUser.businessName || 'Unknown Pharmacy';
    const actual_slug = pharmacyUser.slug;

    // 4. Bulk Upsert Operations for Updates
    // We strictly UPSERT based on itemName and slug so we don't destroy AI-enriched fields (imageUrl, info, etc)
    const bulkOps = updates.map((item: any) => {
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
    let upsertCount = 0;
    if (bulkOps.length > 0) {
      const result = await Product.bulkWrite(bulkOps);
      upsertCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
    }

    // 5. Delete removed items
    let deletedCount = 0;
    if (deletes.length > 0) {
      const deleteResult = await Product.deleteMany({
        slug: actual_slug,
        source: 'synkk',
        itemName: { $in: deletes }
      });
      deletedCount = deleteResult.deletedCount || 0;
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete. Upserted ${upsertCount} items. Removed ${deletedCount} out-of-stock items.`,
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
