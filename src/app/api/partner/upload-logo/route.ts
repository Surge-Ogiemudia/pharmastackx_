import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `partner-logos/${Date.now()}-${cleanName}`;
      const blob = await put(filename, file, {
        access: 'public',
        token,
      });
      return NextResponse.json({ success: true, url: blob.url });
    } else {
      // Fallback to base64 data URL
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Url = `data:${file.type};base64,${buffer.toString('base64')}`;
      return NextResponse.json({ success: true, url: base64Url });
    }
  } catch (err: any) {
    console.error('Logo upload error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to upload logo' }, { status: 500 });
  }
}
