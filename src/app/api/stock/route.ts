
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import { isValidObjectId } from 'mongoose';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// Helper to escape special characters for RegExp
function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&'); // $& means the whole matched string
}

// Helper function to check if an item is incomplete
const isItemIncomplete = (item: any): boolean => {
    const hasMissingInfo = (
        !item.activeIngredient || item.activeIngredient === 'N/A' ||
        !item.category || item.category === 'N/A' ||
        !item.imageUrl || item.imageUrl.trim() === '' ||
        !item.info || item.info.trim() === ''
    );
    return hasMissingInfo;
};

export async function GET(req: NextRequest) {
  console.time('⏱️ GET_STOCK');
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const businessName = searchParams.get('businessName');
  const limit = parseInt(searchParams.get('limit') || '12');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    let userRole: string | null = null;
    let userBusinessName: string | null = null;

    if (sessionToken) {
      try {
        const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
        const user = await User.findById(payload.userId).select('role businessName').lean();
        if (user) {
          userRole = user.role ?? null;
          userBusinessName = user.businessName ?? null;
        }
      } catch (e) {
        userRole = null;
      }
    }

    let query: any = {};
    if (userRole === 'admin' || userRole === 'stockManager') {
      // No filter for admin or stockManager - fetch all products
    } else if (businessName) {
      if (userBusinessName === businessName || userRole === 'admin') {
        query.businessName = { $regex: new RegExp(`^${escapeRegex(businessName)}$`, 'i') };
      } else {
        query.businessName = { $regex: new RegExp(`^${escapeRegex(businessName)}$`, 'i') };
        query.isPublished = true;
      }
    } else {
      query.isPublished = true;
    }

    // Execute paginated query
    const itemsFromDB = await Product.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
    
    // Compute stats for the requested scope
    const totalCount = await Product.countDocuments(query);
    const publishedCount = await Product.countDocuments({ ...query, isPublished: true });
    const attentionCount = await Product.countDocuments({ ...query, $or: [{ imageUrl: '' }, { imageUrl: null }, { info: '' }, { info: null }] });

    console.timeEnd('⏱️ GET_STOCK');
    console.log(`📦 Page [Offset: ${offset}] Found ${itemsFromDB.length}/${totalCount} items.`);

    return NextResponse.json({ 
        items: itemsFromDB, 
        total: totalCount,
        published: publishedCount,
        attention: attentionCount
    }, {
        headers: {
            'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        }
    });

  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // AUTH CHECK
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
    const user = await User.findById(payload.userId).select('role businessName canManageStore').lean();
    
    if (!user || !['admin', 'pharmacy', 'pharmacist', 'stockManager'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      itemName, 
      activeIngredient, 
      category, 
      amount, 
      businessName, 
      imageUrl, 
      coordinates, 
      info, 
      POM,
      slug,
      quantity,
      manufacturer,
      expiryDate
    } = body;

    // OWNERSHIP CHECK
    if (user.role !== 'admin' && user.role !== 'stockManager' && user.businessName !== businessName) {
      return NextResponse.json({ error: 'Forbidden: You can only manage your own business' }, { status: 403 });
    }

    if (!itemName || !activeIngredient || !category || amount === undefined || amount === null || !businessName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingProduct = await Product.findOne({ itemName, businessName });
    if (existingProduct) {
      return NextResponse.json({ error: 'Product with this name already exists for this business' }, { status: 409 });
    }

    let newVector: number[] = [];
    try {
      if (embeddingModel) {
        const result = await embeddingModel.embedContent(itemName);
        newVector = result.embedding.values;
      }
    } catch (e) {
      console.warn('⚠️ Gemini embedding skipped:', e);
    }

    const newProduct = new Product({
      itemName,
      activeIngredient,
      category,
      amount,
      businessName,
      imageUrl: imageUrl || '',
      coordinates: coordinates || '',
      info: info || '',
      POM: POM || false,
      slug: slug || itemName.toLowerCase().replace(/ /g, '-'),
      quantity: quantity || 0,
      manufacturer: manufacturer || '',
      expiryDate: expiryDate || null,
      isPublished: true,
      itemNameVector: newVector,
      enrichmentStatus: 'completed'
    });

    const savedProduct = await newProduct.save();
    return NextResponse.json({ message: 'Product added successfully', product: savedProduct }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error adding stock:', error);
    return NextResponse.json({ error: error.message || 'Failed to add stock' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
    try {
        await dbConnect();
        
        // AUTH CHECK
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session_token');
        if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
        const user = await User.findById(payload.userId).select('role businessName').lean();
        
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id || !isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid or missing product ID' }, { status: 400 });
        }

        const product = await Product.findById(id).select('businessName').lean();
        if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

        // OWNERSHIP CHECK
        if (user?.role !== 'admin' && user?.role !== 'stockManager' && user?.businessName !== product.businessName) {
            return NextResponse.json({ error: 'Forbidden: You can only delete your own products' }, { status: 403 });
        }

        await Product.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Product deleted successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error deleting stock:', error);
        return NextResponse.json({ error: 'Failed to delete stock' }, { status: 500 });
    }
}
