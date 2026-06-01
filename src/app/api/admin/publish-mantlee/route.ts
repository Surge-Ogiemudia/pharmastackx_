import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import User from '@/models/User';

export async function GET() {
    await dbConnect();

    // Find the pharmacy user by slug to get their exact businessName
    const user = await User.findOne({ slug: 'mantlee' }).select('businessName slug').lean();
    if (!user) {
        return NextResponse.json({ error: 'User with slug mantlee not found' }, { status: 404 });
    }

    const result = await Product.updateMany(
        { businessName: user.businessName },
        { $set: { isPublished: true } }
    );

    return NextResponse.json({
        businessName: user.businessName,
        matched: result.matchedCount,
        updated: result.modifiedCount
    });
}
