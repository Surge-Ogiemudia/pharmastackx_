import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import Product from '@/models/Product';
import RejectedProduct from '@/models/RejectedProduct';
import jwt from 'jsonwebtoken';
import { pusherServer } from '@/lib/pusher';

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const { newSlug } = await req.json();

    if (!newSlug || typeof newSlug !== 'string') {
      return NextResponse.json({ message: 'Invalid slug' }, { status: 400 });
    }

    // Basic sanitization
    const sanitizedSlug = newSlug.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    if (sanitizedSlug === user.slug) {
      return NextResponse.json({ message: 'Slug is already set to this value' }, { status: 400 });
    }

    // Check uniqueness
    const existingUser = await User.findOne({ slug: sanitizedSlug });
    if (existingUser) {
      return NextResponse.json({ message: 'This store link is already taken' }, { status: 409 });
    }

    const oldSlug = user.slug;

    // 1. Update User
    user.slug = sanitizedSlug;
    await user.save();

    // 2. Bulk update Products
    if (oldSlug) {
      await Product.updateMany(
        { slug: oldSlug },
        { $set: { slug: sanitizedSlug, pharmacySlug: sanitizedSlug } }
      );

      // 3. Bulk update RejectedProducts
      await RejectedProduct.updateMany(
        { pharmacySlug: oldSlug },
        { $set: { pharmacySlug: sanitizedSlug } }
      );

      // 4. Emit Pusher Event to notify the connected Synkk Desktop App to switch channels
      try {
        await pusherServer.trigger(`pharmacy-${oldSlug}`, 'slug-updated', { newSlug: sanitizedSlug });
      } catch (pusherErr) {
        console.error('Failed to emit slug-updated pusher event:', pusherErr);
      }
    }

    return NextResponse.json({ 
      message: 'Store link updated successfully', 
      slug: sanitizedSlug 
    });

  } catch (error: any) {
    console.error('Update slug error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
