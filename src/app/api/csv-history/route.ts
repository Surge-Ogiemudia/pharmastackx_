
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import BulkUpload from '@/models/BulkUpload';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const businessName = req.nextUrl.searchParams.get("businessName");

    // This is the clean, isolated logic.
    // If a businessName is provided, we filter for it.
    // If not (for an admin), the query is empty {} and finds all documents.
    const query = businessName ? { businessName } : {};

    const uploads = await BulkUpload.find(query)
      .sort({ createdAt: -1 }) // Sort by creation date, newest first.
      .limit(50); // Limit to the last 50 records for performance.

    return NextResponse.json({ uploads });

  } catch (error) {
    console.error('[CSV-HISTORY-GET] Error fetching bulk upload history:', error);
    return NextResponse.json({ message: 'Internal server error while fetching history.' }, { status: 500 });
  }
}
