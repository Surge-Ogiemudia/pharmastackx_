import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Partner from '@/models/Partner';
import Order from '@/models/Order';
import Product from '@/models/Product';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = req.nextUrl;
    const slug = searchParams.get('slug')?.toLowerCase().trim();

    if (!slug) {
      // List all partners if no slug provided
      const partners = await Partner.find({}).sort({ createdAt: -1 }).lean();
      return NextResponse.json({ success: true, partners });
    }

    let partner: any = await Partner.findOne({ slug }).lean();

    // Auto-seed Bubblegum Health default profile if it doesn't exist yet
    if (!partner && (slug === 'bubblegum' || slug === 'bubblegumhealth')) {
      const created = await Partner.create({
        name: 'Bubblegum Health',
        slug: 'bubblegum',
        markupPercentage: 18,
        logoUrl: 'https://vestv.nyc3.cdn.digitaloceanspaces.com/Bubblegum.png',
        primaryColor: '#F43F5E', // Rose/bubblegum pink
        tagline: 'Expert Women’s Reproductive Health & Wellness',
        contactEmail: 'Business@bubblegum.health',
        contactPhone: '07067593825',
        hideStockCount: true,
        bankDetails: {
          bankName: '',
          accountNumber: '',
          accountName: 'Bubblegum Health Ltd',
        },
        allowedCategories: ['Contraceptive Kits', 'Pain Relief', 'Reproductive Health', 'Supplements', 'Skincare', 'Antibiotic'],
        payoutBalance: 0,
        isActive: true,
      });
      partner = created.toObject();
    }

    // Auto-seed Airen Pharmacy Wholesale profile if requested
    if (!partner && (slug === 'demo.airen' || slug === 'airen' || slug === 'airenpharmacy')) {
      const created = await Partner.create({
        name: 'Airen Pharmacy & Wholesale Depot',
        slug: slug,
        markupPercentage: 0,
        logoUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&h=200&fit=crop',
        primaryColor: '#059669',
        tagline: 'Tier-1 Verified Distributor - Edo State',
        contactEmail: 'depot@airenpharmacy.com',
        contactPhone: '08037219904',
        hideStockCount: false,
        bankDetails: {
          bankName: 'Access Bank',
          accountNumber: '0812993410',
          accountName: 'Airen Pharmacy Wholesale Hub',
        },
        allowedCategories: ['Antibiotics', 'Antimalarials', 'Analgesics & Pain', 'Infusions & Injectables', 'Consumables & Surgical', 'OTC'],
        payoutBalance: 850000,
        isActive: true,
      });
      partner = created.toObject();
    }

    if (!partner) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 });
    }

    // Fetch orders attributed to this partner
    const orders = await Order.find({ partnerSlug: partner.slug })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const totalOrders = orders.length;
    const totalVolume = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalProfitEarned = orders.reduce((sum, o) => sum + (o.partnerMarkupAmount || 0), 0);
    const pendingPayout = partner.payoutBalance || 0;

    // Fetch curated products details if present
    let curatedProducts: any[] = [];
    const productMarkupsMap = partner.productMarkups instanceof Map 
      ? Object.fromEntries(partner.productMarkups)
      : (partner.productMarkups || {});

    const customProductImagesMap = partner.customProductImages instanceof Map
      ? Object.fromEntries(partner.customProductImages)
      : (partner.customProductImages || {});

    const catalogImageMap: Record<string, string> = {};
    if (Array.isArray(partner.curatedCatalog)) {
      partner.curatedCatalog.forEach((item: any) => {
        if (item.productId && item.imageUrl) {
          catalogImageMap[String(item.productId)] = item.imageUrl;
        }
      });
    }

    if (partner.curatedProductIds && partner.curatedProductIds.length > 0) {
      const rawProducts = await Product.find({ _id: { $in: partner.curatedProductIds } })
        .select('_id itemName amount quantity businessName category imageUrl activeIngredient POM info')
        .lean();
      curatedProducts = rawProducts.map((p: any) => {
        const prodId = String(p._id);
        const specificMarkup = productMarkupsMap[prodId] !== undefined ? Number(productMarkupsMap[prodId]) : null;
        const customImg = customProductImagesMap[prodId];
        const resolvedImage = (customImg === '__REMOVED__' || customImg === 'none') 
          ? '' 
          : (customImg || catalogImageMap[prodId] || p.imageUrl || '');
        return {
          id: prodId,
          name: p.itemName,
          amount: p.amount,
          quantity: p.quantity,
          category: p.category,
          image: resolvedImage,
          imageUrl: resolvedImage,
          activeIngredients: p.activeIngredient || '',
          POM: p.POM || false,
          info: p.info || '',
          markupPercentage: specificMarkup,
        };
      });
    }

    return NextResponse.json({
      success: true,
      partner,
      curatedProducts,
      stats: {
        totalOrders,
        totalVolume,
        totalProfitEarned,
        pendingPayout,
      },
      orders: orders.map(o => ({
        id: String(o._id),
        date: o.createdAt,
        patientName: o.patientName,
        deliveryCity: o.deliveryCity,
        deliveryState: o.deliveryState,
        deliveryOption: o.deliveryOption,
        status: o.status,
        totalAmount: o.totalAmount,
        partnerProfit: o.partnerMarkupAmount || 0,
        settlementStatus: o.partnerSettlementStatus || 'pending',
        itemsCount: o.items?.length || 0,
        itemsSummary: (o.items || []).map((i: any) => `${i.name} (x${i.qty})`).join(', ')
      }))
    });

  } catch (error: any) {
    console.error('[API /partner GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { slug, name, markupPercentage, logoUrl, primaryColor, tagline, contactEmail, contactPhone, bankDetails, allowedCategories, curatedProductIds, productMarkups, hideStockCount, customProductImages, curatedCatalog } = body;

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Partner slug is required' }, { status: 400 });
    }

    // Atomic action: Delete / remove product image
    if (body.action === 'delete-product-image') {
      const { productId } = body;
      if (!productId) {
        return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
      }
      // 1. Wipe image from Product document in MongoDB
      await Product.findByIdAndUpdate(productId, { $set: { imageUrl: '' } });

      // 2. Wipe from Partner customProductImages and curatedCatalog
      const partnerDoc = await Partner.findOne({ slug: slug.toLowerCase() });
      if (partnerDoc) {
        if (!partnerDoc.customProductImages) {
          partnerDoc.customProductImages = new Map();
        }
        if (partnerDoc.customProductImages instanceof Map) {
          partnerDoc.customProductImages.set(productId, '__REMOVED__');
        } else {
          (partnerDoc.customProductImages as any)[productId] = '__REMOVED__';
        }

        if (Array.isArray(partnerDoc.curatedCatalog)) {
          partnerDoc.curatedCatalog = partnerDoc.curatedCatalog.map((item: any) => {
            if (String(item.productId) === String(productId)) {
              item.imageUrl = '';
            }
            return item;
          });
        }
        await partnerDoc.save();
      }

      return NextResponse.json({ success: true, message: 'Product image removed successfully' });
    }

    // Atomic action: Update / set custom product image
    if (body.action === 'set-product-image') {
      const { productId, imageUrl } = body;
      if (!productId) {
        return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
      }
      const cleanUrl = String(imageUrl || '').trim();
      if (cleanUrl) {
        await Product.findByIdAndUpdate(productId, { $set: { imageUrl: cleanUrl } });
      }

      const partnerDoc = await Partner.findOne({ slug: slug.toLowerCase() });
      if (partnerDoc) {
        if (!partnerDoc.customProductImages) {
          partnerDoc.customProductImages = new Map();
        }
        if (partnerDoc.customProductImages instanceof Map) {
          partnerDoc.customProductImages.set(productId, cleanUrl || '__REMOVED__');
        } else {
          (partnerDoc.customProductImages as any)[productId] = cleanUrl || '__REMOVED__';
        }

        if (Array.isArray(partnerDoc.curatedCatalog)) {
          partnerDoc.curatedCatalog = partnerDoc.curatedCatalog.map((item: any) => {
            if (String(item.productId) === String(productId)) {
              item.imageUrl = cleanUrl;
            }
            return item;
          });
        }
        await partnerDoc.save();
      }

      return NextResponse.json({ success: true, message: 'Product image updated successfully', imageUrl: cleanUrl });
    }

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (markupPercentage !== undefined) updateFields.markupPercentage = Number(markupPercentage);
    if (logoUrl !== undefined) updateFields.logoUrl = logoUrl;
    if (primaryColor !== undefined) updateFields.primaryColor = primaryColor;
    if (tagline !== undefined) updateFields.tagline = tagline;
    if (contactEmail !== undefined) updateFields.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateFields.contactPhone = contactPhone;
    if (bankDetails !== undefined) updateFields.bankDetails = bankDetails;
    if (allowedCategories !== undefined) updateFields.allowedCategories = allowedCategories;
    if (curatedProductIds !== undefined) updateFields.curatedProductIds = curatedProductIds;
    if (productMarkups !== undefined) updateFields.productMarkups = productMarkups;
    if (hideStockCount !== undefined) updateFields.hideStockCount = Boolean(hideStockCount);
    if (customProductImages !== undefined) updateFields.customProductImages = customProductImages;
    if (curatedCatalog !== undefined) updateFields.curatedCatalog = curatedCatalog;

    const updated = await Partner.findOneAndUpdate(
      { slug: slug.toLowerCase() },
      { $set: updateFields },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json({ success: true, partner: updated });

  } catch (error: any) {
    console.error('[API /partner PUT] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { name, slug, markupPercentage, logoUrl, primaryColor, tagline, contactEmail, contactPhone, bankDetails, allowedCategories } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '').trim();
    const existing = await Partner.findOne({ slug: cleanSlug });
    if (existing) {
      return NextResponse.json({ success: false, error: 'A partner with this slug already exists' }, { status: 409 });
    }

    const partner = await Partner.create({
      name,
      slug: cleanSlug,
      markupPercentage: Number(markupPercentage) || 18,
      logoUrl: logoUrl || '',
      primaryColor: primaryColor || '#F43F5E',
      tagline: tagline || '',
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      bankDetails: bankDetails || { bankName: '', accountNumber: '', accountName: '' },
      allowedCategories: allowedCategories || [],
      payoutBalance: 0,
      isActive: true,
    });

    return NextResponse.json({ success: true, partner });

  } catch (error: any) {
    console.error('[API /partner POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
