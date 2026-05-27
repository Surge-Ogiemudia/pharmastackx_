import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');

    if (!query || query.length < 3) {
      return NextResponse.json({ message: 'Query too short' }, { status: 400 });
    }

    // Search for products matching the query
    const regex = new RegExp(query, 'i');
    const matchingProducts = await Product.find({
      itemName: regex,
      isPublished: true,
      qty: { $gt: 0 } // Only find items actually in stock
    }).lean();

    if (!matchingProducts.length) {
      return NextResponse.json({ success: true, results: [] });
    }

    // Group by pharmacy slug to fetch contact info efficiently
    const pharmacySlugs = [...new Set(matchingProducts.map(p => p.slug))];
    const pharmacies = await User.find({ slug: { $in: pharmacySlugs } })
      .select('businessName slug state address phone')
      .lean();

    const pharmacyMap = pharmacies.reduce((acc, p) => {
      acc[p.slug] = p;
      return acc;
    }, {} as any);

    // Format the results to show to the requesting pharmacist
    const results = matchingProducts.map(p => {
      const pharmacy = pharmacyMap[p.slug];
      return {
        _id: p._id,
        itemName: p.itemName,
        price: p.price,
        qty: p.qty,
        pharmacy: pharmacy ? {
          name: pharmacy.businessName,
          state: pharmacy.state,
          address: pharmacy.address,
          phone: pharmacy.phone
        } : null
      };
    }).filter(p => p.pharmacy !== null); // Drop orphans

    // Sort by price ascending
    results.sort((a, b) => (a.price || 0) - (b.price || 0));

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Error in GET /api/source:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
