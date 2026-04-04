import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const product = await Product.findById(id).select('businessName').lean();
    if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    // OWNERSHIP CHECK
    if (user.role !== 'admin' && user.role !== 'stockManager' && user.businessName !== product.businessName) {
      return NextResponse.json({ error: 'Forbidden: You can only update your own products' }, { status: 403 });
    }

    const body = await req.json();
    const updatedProduct = await Product.findByIdAndUpdate(id, body, { new: true });
    
    return NextResponse.json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
