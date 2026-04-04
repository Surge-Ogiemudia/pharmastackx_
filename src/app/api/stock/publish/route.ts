import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import { isValidObjectId } from 'mongoose';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// ... (errorMessages and getIncompleteFields remain same)
const errorMessages: { [key: string]: string } = {
    itemName: 'Please review the item name.',
    activeIngredient: 'Please include the active ingredient.',
    category: 'Please include the category.',
    amount: 'Please add a price.',
    imageUrl: 'Please upload an image.',
    info: 'Please fill in the unit info (e.g., \'1 sachet\').',
    businessName: 'The business name is missing.',
};

const getIncompleteFields = (product: any): string[] => {
    if (!product) return Object.keys(errorMessages);
    const missingFields: string[] = [];
    const requiredStringFields: (keyof typeof errorMessages)[] = ['itemName', 'activeIngredient', 'category', 'imageUrl', 'info', 'businessName'];
    requiredStringFields.forEach(f => {
        if (!product[f] || String(product[f]).trim() === '' || product[f] === 'N/A') {
            missingFields.push(f as string);
        }
    });
    if (typeof product.amount !== 'number' || product.amount <= 0) {
        missingFields.push('amount');
    }
    return missingFields;
};

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

        const productToPublish = await Product.findById(id);
        if (!productToPublish) {
            return NextResponse.json({ message: 'Product not found' }, { status: 404 });
        }

        // OWNERSHIP CHECK
        if (user.role !== 'admin' && user.role !== 'stockManager' && user.businessName !== productToPublish.businessName) {
            return NextResponse.json({ error: 'Forbidden: You can only publish your own products' }, { status: 403 });
        }

        const incompleteFields = getIncompleteFields(productToPublish);
        if (incompleteFields.length > 0) {
            const detailedErrorMessage = incompleteFields.map(field => errorMessages[field]).join(' \n');
            return NextResponse.json(
                { message: `Cannot publish. Please fix the following issues:\n${detailedErrorMessage}` },
                { status: 400 }
            );
        }

        productToPublish.isPublished = true;
        const updatedProduct = await productToPublish.save();

        return NextResponse.json({ 
            message: 'Product published successfully', 
            product: updatedProduct 
        });

    } catch (error: any) {
        console.error('Error publishing product:', error);
        return NextResponse.json({ message: 'Internal server error', details: error.message }, { status: 500 });
    }
}
