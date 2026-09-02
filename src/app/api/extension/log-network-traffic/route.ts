import { dbConnect } from '@/lib/mongoConnect';
import NetworkLog from '@/models/NetworkLog';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { pharmacyId, logs } = await req.json();

    if (!pharmacyId || !Array.isArray(logs)) {
      return NextResponse.json({ success: false, error: 'Pharmacy ID and logs array required' }, { status: 400 });
    }

    const docs = logs.map(l => ({
      pharmacyId,
      timestamp: new Date(),
      method: l.method,
      url: l.url,
      requestPayload: l.requestPayload,
      responseStatus: l.responseStatus,
      responseSnippet: l.responseSnippet
    }));

    await NetworkLog.insertMany(docs);

    return NextResponse.json({
      success: true,
      message: `Logged ${docs.length} network packets`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const pharmacyId = searchParams.get('pharmacyId');

    const query = pharmacyId ? { pharmacyId } : {};
    const logs = await NetworkLog.find(query).sort({ timestamp: -1 }).limit(100);

    return NextResponse.json({
      success: true,
      logs
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
