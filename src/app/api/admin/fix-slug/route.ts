import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import Product from '@/models/Product';
import RejectedProduct from '@/models/RejectedProduct';
import { pusherServer } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();

    // Find the user by businessName or slug
    const user = await User.findOne({
      $or: [
        { businessName: { $regex: /feel/i } },
        { slug: 'feel' },
        { slug: 'free' }
      ]
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const oldSlug = user.slug;
    const sanitizedSlug = 'feelnewpharmacy';

    if (oldSlug === sanitizedSlug) {
      return NextResponse.json({ message: 'Slug is already feelnewpharmacy', user });
    }

    // 1. Update User
    user.slug = sanitizedSlug;
    await user.save();

    // 2. Bulk update Products
    if (oldSlug) {
      await Product.updateMany(
        { $or: [{ slug: oldSlug }, { pharmacySlug: oldSlug }] },
        { $set: { slug: sanitizedSlug, pharmacySlug: sanitizedSlug } }
      );

      // 3. Bulk update RejectedProducts
      await RejectedProduct.updateMany(
        { pharmacySlug: oldSlug },
        { $set: { pharmacySlug: sanitizedSlug } }
      );

      // 4. Emit Pusher Event
      try {
        await pusherServer.trigger(`pharmacy-${oldSlug}`, 'slug-updated', { newSlug: sanitizedSlug });
      } catch (pusherErr) {
        console.error('Failed to emit slug-updated pusher event:', pusherErr);
      }
    }

    return NextResponse.json({ 
      message: 'Store link force updated successfully', 
      oldSlug,
      newSlug: sanitizedSlug,
      user
    });

  } catch (error: any) {
    console.error('Update slug error:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
