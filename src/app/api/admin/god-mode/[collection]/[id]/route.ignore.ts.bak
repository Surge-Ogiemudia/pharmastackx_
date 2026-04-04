import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';

// TS Models
import User from '@/models/User';
import Product from '@/models/Product';
import Post from '@/models/Post';
import Message from '@/models/Message';
import MedicineRequest from '@/models/MedicineRequest';
import BulkUpload from '@/models/BulkUpload';
import DraftStock from '@/models/DraftStock';
import EnrichmentLock from '@/models/EnrichmentLock';
import Log from '@/models/Log';
import UploadLog from '@/models/UploadLog';
import Request from '@/models/Request.js';

// JS Models
const Order = require('../../../../../../../backend/models/Order');
const DispatchHistory = require('../../../../../../../backend/models/DispatchHistory');

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
    'dispatch-histories': DispatchHistory,
    'requests': Request
};

async function getParamsFromUrl(req: NextRequest) {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    // Expected URL format: /api/admin/god-mode/[collection]/[id]
    const collection = pathSegments[4];
    const id = pathSegments[5];
    return { collection, id };
}

// Handler for updating a document
export async function PUT(req: NextRequest) {
    await dbConnect();
    try {
        const { collection, id } = await getParamsFromUrl(req);
        
        if (!collection || !id) {
            return NextResponse.json({ message: 'Missing collection or id in URL' }, { status: 400 });
        }

        if (!models[collection]) {
            return NextResponse.json({ message: `Invalid collection: ${collection}` }, { status: 400 });
        }
        const Model = models[collection];
        const body = await req.json();

        delete body._id;

        const updatedDoc = await Model.findByIdAndUpdate(id, body, { new: true });

        if (!updatedDoc) {
            return NextResponse.json({ message: 'Document not found' }, { status: 404 });
        }

        return NextResponse.json(updatedDoc);
    } catch (error: any) {
        console.error(`Error in god-mode PUT:`, error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

// Handler for deleting a document
export async function DELETE(req: NextRequest) {
    await dbConnect();
    try {
        const { collection, id } = await getParamsFromUrl(req);

        if (!collection || !id) {
            return NextResponse.json({ message: 'Missing collection or id in URL' }, { status: 400 });
        }

        if (!models[collection]) {
            return NextResponse.json({ message: `Invalid collection: ${collection}` }, { status: 400 });
        }
        const Model = models[collection];

        const deletedDoc = await Model.findByIdAndDelete(id);

        if (!deletedDoc) {
            return NextResponse.json({ message: 'Document not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Document deleted successfully' });
    } catch (error: any) {
        console.error(`Error in god-mode DELETE:`, error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
