import { dbConnect } from '@/lib/mongoConnect';
import PMSCredential from '@/models/PMSCredential';
import { NextResponse } from 'next/server';
import { extensionPharmacyId } from '@/lib/extensionAuth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const pharmacyId = await extensionPharmacyId(req, body);
    if (!pharmacyId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { pmsName, pmsUrl, username, password } = body;

    let cleanName = pmsName;
    if (!cleanName && pmsUrl) {
      try {
        const u = new URL(pmsUrl);
        let host = u.hostname.replace('www.', '');
        cleanName = host.split('.')[0];
        if (cleanName.length < 3) cleanName = host;
        cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      } catch (e) {}
    }

    // Build the update object — only include fields that have real values
    // This prevents a later call with empty username/password from erasing previously saved credentials
    const updateFields: any = {
      pharmacyId,
      lastUpdated: new Date()
    };
    if (cleanName) updateFields.pmsName = cleanName;
    if (pmsUrl) updateFields.pmsUrl = pmsUrl;
    if (username) updateFields.username = username;
    if (password) updateFields.password = password;

    const creds = await PMSCredential.findOneAndUpdate(
      { pharmacyId },
      { $set: updateFields },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      message: 'PMS credentials saved successfully',
      credentials: creds
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
