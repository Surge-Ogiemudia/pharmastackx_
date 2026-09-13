
import { dbConnect } from '../../../lib/mongoConnect';
import Product from '@/models/Product';
import User from '@/models/User';
import Partner from '@/models/Partner';
import { NextResponse } from 'next/server';


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

    // Build the base match query — exclude items with zero or missing price
    let query = { isPublished: true, amount: { $gt: 0 } };
    // Check if the slug corresponds to a B2B Partner storefront
    let partner = null;
    let markupPct = 0;
    if (slug) {
      partner = await Partner.findOne({ slug: slug.toLowerCase(), isActive: true }).lean();
      if (partner) {
        markupPct = partner.markupPercentage || 18;
        if (partner.curatedProductIds && partner.curatedProductIds.length > 0) {
          query._id = { $in: partner.curatedProductIds };
        } else {
          // Store is empty until the partner curates and drops products into their shelf
          query._id = { $in: [] };
        }
        // When it is a partner storefront, do NOT restrict to a single pharmacy's slug
      } else {
        query.slug = slug;
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const searchConditions = [
        { itemName: searchRegex },
        { activeIngredient: searchRegex },
        { category: searchRegex }
      ];
      if (!slug || partner) {
        searchConditions.push({ businessName: searchRegex });
      }

      if (query.$or) {
        const existingOr = query.$or;
        delete query.$or;
        query.$and = [
          { $or: existingOr },
          { $or: searchConditions }
        ];
      } else {
        query.$or = searchConditions;
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
            },
            inStockSort: { $cond: [{ $gt: ['$quantity', 0] }, 0, 1] },
            priceScore: { $cond: [{ $gte: ['$amount', 250] }, 1, 0] }
          }
        },
      ];

      const countPipeline = [...pipeline, { $count: "total" }];
      const resultsPipeline = [...pipeline, { $sort: { inStockSort: 1, priceScore: -1, quantity: -1, completenessScore: -1, _id: 1 } }, { $skip: skip }, { $limit: limit }];

      const countResult = await Product.aggregate(countPipeline);
      totalProducts = countResult.length > 0 ? countResult[0].total : 0;
      products = await Product.aggregate(resultsPipeline);

    } else {
      let sortOption = {};
      if (sortBy === 'name') {
        sortOption = { itemName: 1 };
      } else if (sortBy === 'price') {
        sortOption = { amount: 1 };
      }
      sortOption = { ...sortOption };

      totalProducts = await Product.countDocuments(query);
      products = await Product.find(query)
        .sort({ quantity: -1, ...sortOption })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    // Build a map of businessName -> businessCoordinates from User collection
    const uniqueBusinessNames = [...new Set(products.map(p => p.businessName).filter(Boolean))];
    const pharmacyUsers = await User.find(
      { businessName: { $in: uniqueBusinessNames } },
      { businessName: 1, businessCoordinates: 1 }
    ).lean();
    const coordMap = {};
    pharmacyUsers.forEach(u => {
      if (u.businessCoordinates?.latitude && u.businessCoordinates?.longitude) {
        coordMap[u.businessName] = {
          lat: u.businessCoordinates.latitude,
          lon: u.businessCoordinates.longitude,
        };
      }
    });

    const partnerProductMarkups = partner?.productMarkups instanceof Map 
      ? Object.fromEntries(partner.productMarkups) 
      : (partner?.productMarkups || {});

    const transformedProducts = products.map(product => {
      try {
         if (!product.itemName || typeof product.amount === 'undefined') {
          throw new Error('Product record is missing required fields: itemName or amount.');
        }
        const prodId = product._id.toString();
        const effectiveMarkup = partnerProductMarkups[prodId] !== undefined 
          ? Number(partnerProductMarkups[prodId]) 
          : markupPct;
        const finalPrice = effectiveMarkup > 0 ? Math.round(product.amount * (1 + effectiveMarkup / 100)) : product.amount;
        return {
          id: prodId,
          image: product.imageUrl || 'https://via.placeholder.com/150',
          name: product.itemName,
          activeIngredients: product.activeIngredient || '',
          drugClass: product.category || '',
          price: finalPrice,
          formattedPrice: formatPrice(finalPrice),
          basePrice: product.amount,
          pharmacy: partner ? partner.name : (product.businessName || 'Unknown Pharmacy'),
          businessName: partner ? partner.name : (product.businessName || 'Unknown Pharmacy'),
          pharmacyCoordinates: coordMap[product.businessName] || null,
          POM: product.POM || false,
          info: product.info,
          slug: product.slug,
          partnerSlug: partner ? partner.slug : null,
          isPartnerProduct: !!partner,
          productMarkupPercentage: effectiveMarkup,
          stockQty: typeof product.quantity === 'number' ? product.quantity : null,
          inStock: typeof product.quantity === 'number' ? product.quantity > 0 : true,
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
      partner: partner ? {
        name: partner.name,
        slug: partner.slug,
        logoUrl: partner.logoUrl,
        primaryColor: partner.primaryColor,
        tagline: partner.tagline,
        markupPercentage: markupPct,
      } : null,
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
