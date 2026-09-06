import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const downloadUrl = new URL('/downloads/synkk-extension.zip', req.url);
  return NextResponse.redirect(downloadUrl);
}
