import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import Partner from '@/models/Partner';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await dbConnect();
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().trim();

    const pharmacy = await User.findOne({ slug: cleanSlug, role: { $in: ['pharmacy', 'pharmacist', 'medical_rep', 'vendor'] } })
      .select('businessName businessAddress city state professionalVerificationStatus profilePicture companyName repType role')
      .lean();

    if (pharmacy) {
      return NextResponse.json({ success: true, pharmacy }, { 
        status: 200,
        headers: {
          'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
        }
      });
    }

    // Fallback: check if this is an active partner
    const partner: any = await Partner.findOne({ slug: cleanSlug, isActive: true }).lean();
    if (partner) {
      return NextResponse.json({ 
        success: true, 
        partner,
        pharmacy: {
          businessName: partner.name,
          profilePicture: partner.logoUrl,
          city: 'Nationwide Delivery',
          state: 'Discreet',
          professionalVerificationStatus: 'approved'
        }
      }, { 
        status: 200,
        headers: {
          'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Pharmacy not found' }, { status: 404 });

  } catch (error) {
    console.error('Error fetching pharmacy by slug:', error);
    return NextResponse.json({ success: false, error: 'An internal server error occurred.' }, { status: 500 });
  }
}
