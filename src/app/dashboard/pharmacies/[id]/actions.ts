'use server';

import { dbConnect } from '@/lib/mongoConnect';
import RejectedProduct from '@/models/RejectedProduct';
import Product from '@/models/Product';
import { revalidatePath } from 'next/cache';

export async function overrideRejectedProduct(rejectedProductId: string, path: string): Promise<void> {
  try {
    await dbConnect();
    
    // Find the rejected product
    const rejectedItem = await RejectedProduct.findById(rejectedProductId);
    if (!rejectedItem) {
      throw new Error('Rejected product not found.');
    }

    // Insert into Products
    await Product.findOneAndUpdate(
      { itemName: rejectedItem.itemName, slug: rejectedItem.pharmacySlug },
      {
        $set: {
          amount: rejectedItem.amount,
          quantity: rejectedItem.qty,
          source: 'synkk',
          classificationMethod: 'manual_override',
          isPublished: true,
          POM: false,
          enrichmentStatus: 'pending',
          businessName: rejectedItem.businessName,
        }
      },
      { upsert: true }
    );

    // Delete from RejectedProducts
    await RejectedProduct.findByIdAndDelete(rejectedProductId);

    revalidatePath(path);
  } catch (error: any) {
    console.error("Manual override failed:", error);
  }
}
