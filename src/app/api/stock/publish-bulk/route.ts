
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';

export async function POST(req: Request) {
  try {
    await dbConnect();
    
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: 'No product IDs provided.' }, { status: 400 });
    }

    // Here, we find all products that match the IDs and are NOT yet published.
    // We also ensure they are "complete" before publishing.
    const productsToPublish = await Product.find({
      _id: { $in: ids },
      isPublished: false,
      // Add server-side validation to ensure items are not incomplete
      imageUrl: { $ne: '' },
      activeIngredient: { $ne: 'N/A' },
      category: { $ne: 'N/A' },
      info: { $ne: 'N/A' }
    }).select('_id');

    const validatedIds = productsToPublish.map(p => p._id);

    if (validatedIds.length === 0) {
        return NextResponse.json({ message: 'No valid, unpublished items were found to publish.' }, { status: 400 });
    }

    const updateResult = await Product.updateMany(
      { _id: { $in: validatedIds } },
      { $set: { isPublished: true, updatedAt: new Date() } }
    );

    return NextResponse.json({
      message: `Successfully published ${updateResult.modifiedCount} products.`,
      publishedCount: updateResult.modifiedCount,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error in bulk-publish endpoint:", error);
    return NextResponse.json({ message: 'An unexpected server error occurred.', details: error.message }, { status: 500 });
  }
}

