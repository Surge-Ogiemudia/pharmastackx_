import { dbConnect } from '@/lib/mongoConnect';
import SyncRequest from '@/models/SyncRequest';
import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { extensionPharmacyId } from '@/lib/extensionAuth';

export async function GET(req: Request) {
  try {
    const pharmacyId = await extensionPharmacyId(req);
    if (!pharmacyId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
    const body = await req.json();
    const { action } = body;

    // The extension acts for its own pharmacy; an admin (dashboard) names one.
    let pharmacyId = await extensionPharmacyId(req, body);
    if (!pharmacyId && (await getAdminFromRequest(req))) {
      pharmacyId = typeof body.pharmacyId === 'string' ? body.pharmacyId : null;
      if (!pharmacyId) {
        return NextResponse.json({ success: false, error: 'Pharmacy ID is required' }, { status: 400 });
      }
    }
    if (!pharmacyId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

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
