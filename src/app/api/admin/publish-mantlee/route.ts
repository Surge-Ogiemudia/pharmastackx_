import { NextResponse } from 'next/server';
import mongoConnect from '@/lib/mongoConnect';
import Product from '@/models/Product';

export async function POST() {
    await mongoConnect();
    const result = await Product.updateMany(
        { slug: 'mantlee' },
        { $set: { isPublished: true } }
    );
    return NextResponse.json({ updated: result.modifiedCount, matched: result.matchedCount });
}
