
import { dbConnect } from '../../../lib/mongoConnect';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper to format the price into Nigerian Naira (NGN)
const formatPrice = (price) => {
  const numericPrice = Number(price);
  if (isNaN(numericPrice)) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(0);
  }
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(numericPrice);
};

// Helper to parse the coordinate string
const parseCoordinatesString = (coordString) => {
  if (typeof coordString !== 'string') { return null; }
  try {
    const latMatch = coordString.match(/Lat: ([\\d.-]+)/);
    const lonMatch = coordString.match(/Lon: ([\\d.-]+)/);
    if (latMatch && lonMatch) {
      const lat = parseFloat(latMatch[1]);
      const lon = parseFloat(lonMatch[1]);
      if (!isNaN(lat) && !isNaN(lon)) { return { lat, lon }; }
    }
    return null;
  } catch (error) {
    console.error("Error parsing coordinate string:", coordString, error);
    return null;
  }
};

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = req.nextUrl;
    const slug = searchParams.get('slug');
    const search = searchParams.get('search');
    const drugClass = searchParams.get('drugClass');
    const sortBy = searchParams.get('sortBy') || 'recommended'; // Default to recommended
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 12;
    const skip = (page - 1) * limit;

    // Build the base match query
    let query = { isPublished: true };
    if (slug) {
      query.slug = slug;
    }
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { itemName: searchRegex },
        { activeIngredient: searchRegex },
        { category: searchRegex }
      ];
      if (!slug) {
        query.$or.push({ businessName: searchRegex });
      }
    }
    if (drugClass && drugClass !== 'all') {
      query.category = { $regex: `^${drugClass}$`, $options: 'i' };
    }

    let products;
    let totalProducts;

    if (sortBy === 'recommended') {
      const pipeline = [
        { $match: query },
        {
          $addFields: {
            completenessScore: {
              $add: [
                { $cond: [{ $and: ['$imageUrl', { $ne: ['$imageUrl', ''] }] }, 1, 0] },
                { $cond: [{ $and: ['$info', { $ne: ['$info', ''] }] }, 1, 0] }
              ]
            }
          }
        },
      ];

      const countPipeline = [...pipeline, { $count: "total" }];
      const resultsPipeline = [...pipeline, { $sort: { completenessScore: -1, _id: 1 } }, { $skip: skip }, { $limit: limit }];

      const countResult = await Product.aggregate(countPipeline);
      totalProducts = countResult.length > 0 ? countResult[0].total : 0;
      products = await Product.aggregate(resultsPipeline);

    } else {
      let sortOption = {};
      if (sortBy === 'name') {
        sortOption.itemName = 1;
      } else if (sortBy === 'price') {
        sortOption.amount = 1;
      }

      totalProducts = await Product.countDocuments(query);
      products = await Product.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean();
    }

    const transformedProducts = products.map(product => {
      try {
         if (!product.itemName || typeof product.amount === 'undefined') {
          throw new Error('Product record is missing required fields: itemName or amount.');
        }
        return {
          id: product._id.toString(),
          image: product.imageUrl || 'https://via.placeholder.com/150',
          name: product.itemName,
          activeIngredients: product.activeIngredient || '',
          drugClass: product.category || 'N/A',
          price: product.amount,
          formattedPrice: formatPrice(product.amount),
          pharmacy: product.businessName || 'Unknown Pharmacy',
          pharmacyCoordinates: parseCoordinatesString(product.coordinates),
          POM: product.POM || false,
          info: product.info,
          slug: product.slug,
          inStock: true,
        };
      } catch (error) {
        console.error('Error transforming product:', { 
          productId: product && product._id ? product._id.toString() : 'Unknown', 
          error: error.message 
        });
        return null;
      }
    }).filter(p => p !== null);

    return NextResponse.json({
      success: true,
      data: transformedProducts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts: totalProducts,
      },
    }, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }
    });

  } catch (error) {
    console.error("Fatal uncaught error in /api/products:", error);
    return NextResponse.json({ 
      success: false, 
      error: "A critical error occurred on the server." 
    }, { status: 500 });
  }
}
