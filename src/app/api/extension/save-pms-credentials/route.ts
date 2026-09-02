import { dbConnect } from '@/lib/mongoConnect';
import PMSCredential from '@/models/PMSCredential';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { pharmacyId, pmsName, pmsUrl, username, password } = await req.json();

    if (!pharmacyId) {
      return NextResponse.json({ success: false, error: 'Pharmacy ID is required' }, { status: 400 });
    }

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

    const creds = await PMSCredential.findOneAndUpdate(
      { pharmacyId },
      { 
        pharmacyId,
        pmsName: cleanName || 'Web PMS',
        pmsUrl,
        username,
        password,
        lastUpdated: new Date()
      },
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
