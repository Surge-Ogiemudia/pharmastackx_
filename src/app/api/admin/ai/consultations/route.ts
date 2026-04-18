import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Consultation from '@/models/Consultation';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const sessionCookie = req.cookies.get('session_token');
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Fetch the most recent consultations
    const consultations = await Consultation.find()
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(consultations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
