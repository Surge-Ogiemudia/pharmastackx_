import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import RejectedProduct from '@/models/RejectedProduct';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { classifyProducts } from '@/lib/classificationEngine';

export const maxDuration = 60; // Increase Vercel timeout to 60 seconds to allow Gemini to finish classifying batch inventory

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
    const { pharmacy_slug, updates, deletes, sync_tier } = body;

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

    // 3.5 Classification Filter (AI + Database)
    const { approved: approvedUpdates, rejected: rejectedUpdates } = await classifyProducts(updates);

    // 4. Bulk Upsert Operations for Approved Updates
    // We strictly UPSERT based on itemName and slug so we don't destroy AI-enriched fields (imageUrl, info, etc)
    const bulkOps = approvedUpdates.map((item: any) => {
      // Clean up the incoming data
      const itemName = item.name;
      const amount = Number(item.price) || 0;
      const quantity = Number(item.qty) || 0;
      const classificationMethod = item.classificationMethod || 'ai_classified';

      return {
        updateOne: {
          filter: { itemName: itemName, slug: actual_slug },
          update: {
            $set: {
              amount: amount,
              quantity: quantity,
              source: 'synkk',
              classificationMethod: classificationMethod
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

    // Execute the bulk upsert for approved products
    let upsertCount = 0;
    if (bulkOps.length > 0) {
      const result = await Product.bulkWrite(bulkOps);
      upsertCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
    }

    // Handle Rejected Products
    let rejectedCount = 0;
    if (rejectedUpdates.length > 0) {
      const rejectedOps = rejectedUpdates.map((item: any) => ({
        updateOne: {
          filter: { itemName: item.name, pharmacySlug: actual_slug },
          update: {
            $set: {
              amount: Number(item.price) || 0,
              qty: Number(item.qty) || 0,
              reason: item.reason,
              rejectionMethod: item.rejectionMethod || 'ai_classified'
            },
            $setOnInsert: {
              itemName: item.name,
              pharmacyId: pharmacyUser._id,
              pharmacySlug: actual_slug,
              businessName: businessName
            }
          },
          upsert: true
        }
      }));
      const rejectedResult = await RejectedProduct.bulkWrite(rejectedOps);
      rejectedCount = (rejectedResult.upsertedCount || 0) + (rejectedResult.modifiedCount || 0);
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

    // 6. Update Pharmacy User with sync metadata
    const userUpdateFields: any = { lastSyncTime: new Date() };
    if (sync_tier !== undefined) userUpdateFields.lastSyncTier = sync_tier;
    if (body.app_version) userUpdateFields.appVersion = body.app_version;

    await User.updateOne(
      { slug: actual_slug },
      { $set: userUpdateFields }
    );

    return NextResponse.json({
      success: true,
      message: `Sync complete. Upserted ${upsertCount} items. Rejected ${rejectedCount} items. Removed ${deletedCount} out-of-stock items.`,
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
