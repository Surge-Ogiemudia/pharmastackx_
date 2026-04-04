import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import { isValidObjectId } from 'mongoose';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req: NextRequest) {
    await dbConnect();

    try {
        // AUTH CHECK
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session_token');
        if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
        const user = await User.findById(payload.userId).select('role businessName').lean();
        
        if (!user || !['admin', 'pharmacy', 'pharmacist', 'stockManager'].includes(user.role)) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await req.json();
        if (!id || !isValidObjectId(id)) {
            return NextResponse.json({ message: 'A valid product ID is required' }, { status: 400 });
        }

        const productToUnpublish = await Product.findById(id);
        if (!productToUnpublish) {
            return NextResponse.json({ message: 'Product not found' }, { status: 404 });
        }

        // OWNERSHIP CHECK
        if (user.role !== 'admin' && user.role !== 'stockManager' && user.businessName !== productToUnpublish.businessName) {
            return NextResponse.json({ error: 'Forbidden: You can only unpublish your own products' }, { status: 403 });
        }

        if (!productToUnpublish.isPublished) {
            return new NextResponse(null, { status: 204 });
        }

        productToUnpublish.isPublished = false;
        await productToUnpublish.save();

        return new NextResponse(null, { status: 204 });

    } catch (error: any) {
        console.error('Error unpublishing product:', error);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
