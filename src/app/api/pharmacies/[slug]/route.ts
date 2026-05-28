import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await dbConnect();
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 });
    }

    const pharmacy = await User.findOne({ slug, role: { $in: ['pharmacy', 'pharmacist'] } })
      .select('businessName businessAddress city state professionalVerificationStatus profilePicture')
      .lean();

    if (!pharmacy) {
      return NextResponse.json({ success: false, error: 'Pharmacy not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, pharmacy }, { 
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      }
    });

  } catch (error) {
    console.error('Error fetching pharmacy by slug:', error);
    return NextResponse.json({ success: false, error: 'An internal server error occurred.' }, { status: 500 });
  }
}
