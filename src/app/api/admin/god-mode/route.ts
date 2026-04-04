
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';

// TS Models
import User from '@/models/User';
import Product from '@/models/Product';
import Post from '@/models/Post';
import Message from '@/models/Message';
import MedicineRequest from '@/models/Request';
import BulkUpload from '@/models/BulkUpload';
import DraftStock from '@/models/DraftStock';
import EnrichmentLock from '@/models/EnrichmentLock';
import Log from '@/models/Log';
import UploadLog from '@/models/UploadLog';
import Order from '@/models/Order';
// import Request from '@/models/Request.js'; // Redundant with above

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

const models: { [key: string]: any } = {
    'users': User,
    'products': Product,
    'posts': Post,
    'messages': Message,
    'medicine-requests': MedicineRequest,
    'bulk-uploads': BulkUpload,
    'draft-stocks': DraftStock,
    'enrichment-locks': EnrichmentLock,
    'logs': Log,
    'upload-logs': UploadLog,
    'orders': Order,
    'requests': MedicineRequest
};

export async function GET(req: NextRequest) {
    await dbConnect();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');

    if (!sessionToken) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
        const user = await User.findById(payload.userId).lean();

        if (!user || user.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const collectionName = searchParams.get('collection');

        if (!collectionName) {
            const collectionNames = Object.keys(models);
            return NextResponse.json(collectionNames, { status: 200 });
        }

        if (!models[collectionName]) {
            return NextResponse.json({ message: 'Invalid collection' }, { status: 400 });
        }

        const Model = models[collectionName];
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = 100;
        const skip = (page - 1) * limit;
        const sortOrder = searchParams.get('sort') === 'asc' ? 1 : -1;
        const search = searchParams.get('search') || '';

        let query: any = {};
        if (search) {
            const stringFields = Object.keys(Model.schema.paths).filter(
                field => Model.schema.paths[field].instance === 'String'
            );

            if (stringFields.length > 0) {
                query.$or = stringFields.map(field => ({
                    [field]: { $regex: search, $options: 'i' }
                }));
            }
        }

        let dataQuery = Model.find(query).sort({ _id: sortOrder }).skip(skip).limit(limit);

        if (collectionName === 'requests') {
            dataQuery = dataQuery.populate('user', 'username email').populate('quotes.pharmacy', 'username email');
        }

        let data = await dataQuery.lean({ virtuals: true });
        const total = await Model.countDocuments(query);

        if (collectionName === 'users') {
            data = data.map((user: any) => ({
                ...user,
                isPWA: user.isPWA === true,
            }));
        }

        return NextResponse.json({ data, total, page, limit }, { status: 200 });

    } catch (error: any) {
        if (error instanceof jwt.JsonWebTokenError) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }
        console.error(`Error in god-mode API:`, error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
