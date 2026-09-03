import { dbConnect } from '@/lib/mongoConnect';
import SyncRequest from '@/models/SyncRequest';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const pharmacyId = searchParams.get('pharmacyId');

    if (!pharmacyId) {
      return NextResponse.json({ success: false, error: 'Pharmacy ID is required' }, { status: 400 });
    }

    const doc = await SyncRequest.findOne({ pharmacyId });
    return NextResponse.json({
      success: true,
      syncRequested: !!(doc && doc.requested),
      requestedAt: doc?.requestedAt || null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { pharmacyId, action } = body;

    if (!pharmacyId) {
      return NextResponse.json({ success: false, error: 'Pharmacy ID is required' }, { status: 400 });
    }

    if (action === 'trigger') {
      await SyncRequest.findOneAndUpdate(
        { pharmacyId },
        { requested: true, requestedAt: new Date() },
        { upsert: true, new: true }
      );
      return NextResponse.json({ success: true, message: 'Sync triggered successfully' });
    }

    if (action === 'acknowledge') {
      await SyncRequest.findOneAndUpdate(
        { pharmacyId },
        { requested: false, completedAt: new Date() },
        { upsert: true, new: true }
      );
      return NextResponse.json({ success: true, message: 'Sync acknowledged and completed' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
