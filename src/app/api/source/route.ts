import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Product from '@/models/Product';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const excludeSlug = searchParams.get('exclude');

    if (!query || query.length < 3) {
      return NextResponse.json({ message: 'Query too short' }, { status: 400 });
    }

    // Search for products matching the query
    const regex = new RegExp(query, 'i');
    const searchFilter: any = {
      itemName: regex,
      isPublished: true,
      quantity: { $gt: 0 } // Only find items actually in stock
    };

    if (excludeSlug) {
      searchFilter.slug = { $ne: excludeSlug };
    }

    const matchingProducts = await Product.find(searchFilter).lean();

    if (!matchingProducts.length) {
      return NextResponse.json({ success: true, results: [] });
    }

    // Group by pharmacy slug to fetch contact info efficiently
    const pharmacySlugs = [...new Set(matchingProducts.map(p => p.slug))];
    const pharmacies = await User.find({ slug: { $in: pharmacySlugs } })
      .select('businessName slug state address phoneNumber businessCoordinates')
      .lean();

    const pharmacyMap = pharmacies.reduce((acc, p) => {
      if (p.slug) {
        acc[p.slug] = p;
      }
      return acc;
    }, {} as any);

    // Get requester coordinates
    let requesterCoords: { latitude: number, longitude: number } | null = null;
    if (excludeSlug) {
      const requester = await User.findOne({ slug: excludeSlug }).select('businessCoordinates').lean();
      if (requester?.businessCoordinates?.latitude && requester?.businessCoordinates?.longitude) {
        requesterCoords = requester.businessCoordinates as { latitude: number, longitude: number };
      }
    }

    // Haversine formula
    function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    // Format the results to show to the requesting pharmacist
    const results = matchingProducts.map(p => {
      const pharmacy = pharmacyMap[p.slug];
      
      let distanceText = null;
      let distanceValue = Infinity;

      if (pharmacy && requesterCoords && pharmacy.businessCoordinates?.latitude && pharmacy.businessCoordinates?.longitude) {
        const distKm = getDistance(
          requesterCoords.latitude, requesterCoords.longitude, 
          pharmacy.businessCoordinates.latitude, pharmacy.businessCoordinates.longitude
        );
        distanceValue = distKm;
        
        if (distKm < 1) {
          distanceText = `${Math.round(distKm * 1000)}m away`;
        } else {
          distanceText = `${distKm.toFixed(1)}km away`;
        }
      }

      return {
        _id: p._id,
        itemName: p.itemName,
        price: p.amount,
        qty: p.quantity,
        distanceValue,
        pharmacy: pharmacy ? {
          name: pharmacy.businessName,
          state: pharmacy.state,
          address: pharmacy.address,
          phoneNumber: pharmacy.phoneNumber,
          distanceText
        } : null
      };
    }).filter(p => p.pharmacy !== null); // Drop orphans

    // Sort by distance ascending first, then by price ascending
    results.sort((a, b) => {
      const distA = a.distanceValue || Infinity;
      const distB = b.distanceValue || Infinity;
      if (distA !== distB) {
        return distA - distB;
      }
      return (a.price || 0) - (b.price || 0);
    });

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Error in GET /api/source:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
