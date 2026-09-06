import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import GlobalSettings from '@/models/GlobalSettings';

export async function GET() {
  try {
    await dbConnect();
    const settings = await GlobalSettings.findOne().lean();
    const chromeWebStoreUrl = settings?.chromeWebStoreUrl || process.env.CHROME_WEBSTORE_URL || null;
    return NextResponse.json({
      chromeWebStoreUrl,
      downloadZipUrl: 'https://www.psx.ng/downloads/synkk-extension.zip',
      version: '1.0.0'
    });
  } catch (error) {
    return NextResponse.json({
      chromeWebStoreUrl: process.env.CHROME_WEBSTORE_URL || null,
      downloadZipUrl: 'https://www.psx.ng/downloads/synkk-extension.zip',
      version: '1.0.0'
    });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { chromeWebStoreUrl } = body;
    const update: any = { $set: { chromeWebStoreUrl: chromeWebStoreUrl || null } };
    const settings = await GlobalSettings.findOneAndUpdate({}, update, { upsert: true, new: true });
    return NextResponse.json({ success: true, chromeWebStoreUrl: settings.chromeWebStoreUrl });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
