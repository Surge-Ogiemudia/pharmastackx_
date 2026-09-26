import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { decryptMasterData } from '@/lib/encryption';
import { getAdminFromRequest } from '@/lib/adminAuth';

// This is an admin-only "God-Mode" endpoint.
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }
  try {
    const searchParams = req.nextUrl.searchParams;
    const pharmacyId = searchParams.get('pharmacyId');

    if (!pharmacyId) {
      return NextResponse.json({ error: 'Missing pharmacyId parameter' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(pharmacyId).select('+encryptedWebPosData');
    if (!user) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });
    }

    if (!user.encryptedWebPosData) {
      return NextResponse.json({ error: 'No encrypted Web POS backup found for this pharmacy' }, { status: 404 });
    }

    // Decrypt the payload
    const decryptedPayload = decryptMasterData(user.encryptedWebPosData);
    const credentials = JSON.parse(decryptedPayload);

    return NextResponse.json({
      success: true,
      credentials
    });

  } catch (error: any) {
    console.error('[Web POS Decrypt API Error]:', error);
    return NextResponse.json({ 
      error: 'Failed to decrypt. The Master Key may be incorrect or the payload is corrupted.' 
    }, { status: 500 });
  }
}
