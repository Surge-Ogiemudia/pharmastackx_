import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Order from '@/models/Order';
import RequestModel from '@/models/Request.js';
import User from '@/models/User';
import Partner from '@/models/Partner';
import jwt from 'jsonwebtoken';
import { triggerNewOrder } from '@/lib/pusher';
import { createConciergeSession } from '@/lib/concierge';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');
  const partnerSlugParam = searchParams.get('partnerSlug') || searchParams.get('partner');

  // Allow guest customers on partner storefronts to retrieve their placed orders by IDs stored in their browser
  if (idsParam) {
    try {
      const ids = idsParam.split(',').map(id => id.trim()).filter(Boolean);
      const query: any = { _id: { $in: ids } };
      if (partnerSlugParam) {
        query.partnerSlug = partnerSlugParam.toLowerCase();
      }
      const guestOrders = await Order.find(query).sort({ createdAt: -1 });
      return NextResponse.json(guestOrders);
    } catch (err: any) {
      console.error('Error fetching guest orders by ids:', err);
      return NextResponse.json({ message: 'Error fetching orders', error: err.message }, { status: 500 });
    }
  }

  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const businessName = searchParams.get('businessName');
    const deliveryOption = searchParams.get('deliveryOption');

    let query: any = {};

    // Get the user to check their role
    const user = await User.findById(session.userId);
    const role = user?.role || session.role || 'customer';

    if (role === 'admin' || role === 'stockManager') {
      if (businessName) {
        query.businesses = businessName;
      }
    } else if (role === 'pharmacy' || role === 'pharmacist') {
      // See orders for their pharmacy AND any orders they personally placed as a patient
      query.$or = [
        { businesses: user?.businessName },
        { user: session.userId },
      ];
    } else {
      // Customers (and anyone whose user doc wasn't found) see their own orders
      query.user = session.userId;
    }

    if (deliveryOption) {
      query.deliveryOption = deliveryOption;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).populate('user', 'name email phone');
    
    // Transform for the frontend expectations if necessary
    const transformedOrders = orders.map(order => {
        const obj = order.toObject();
        const populatedUser = obj.user as any;
        return {
            ...obj,
            user: {
                name: populatedUser?.name || obj.patientName || 'N/A',
                email: populatedUser?.email || obj.deliveryEmail,
                phone: populatedUser?.phone || obj.deliveryPhone
            }
        };
    });

    return NextResponse.json(transformedOrders);
  } catch (error: any) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await getSession(req);
  const body = await req.json();
  const {
    patientName, patientAge, patientCondition,
    deliveryEmail, deliveryPhone, deliveryAddress, deliveryCity, deliveryState,
    items, coupon, deliveryOption, orderType, businesses,
    requestId, quoteId, sfcAmount, partnerSlug,
    courierName, courierId, courierLogo, deliveryFee, shipbubbleRequestToken,
    paymentMethod, paymentReference, isB2B, buyerPharmacyName, buyerPcnLicense,
    sellerDepotName, distanceKm, estimatedTransitTime, waybillNumber,
    deliveryLat, deliveryLng
  } = body;

  // If not logged in, allow guest checkout if partnerSlug or delivery contact is provided
  if (!session && !partnerSlug && !deliveryEmail && !buyerPharmacyName) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {

    // Calculate total amount if not provided or to verify
    const totalAmount = (items || []).reduce((sum: number, item: any) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.qty || item.quantity) || 0;
        return sum + (price * qty);
    }, 0);

    let partnerMarkupAmount = 0;
    let resolvedPartnerSlug = partnerSlug;
    if (partnerSlug) {
      try {
        const partner = await Partner.findOne({ slug: partnerSlug.toLowerCase(), isActive: true });
        if (partner) {
          resolvedPartnerSlug = partner.slug;
          const defaultPct = partner.markupPercentage || 18;
          const productMarkupsMap = partner.productMarkups instanceof Map
            ? Object.fromEntries(partner.productMarkups)
            : (partner.productMarkups || {});

          partnerMarkupAmount = (items || []).reduce((sum: number, item: any) => {
            const itemId = String(item.id || item._id || item.productId || '');
            const itemPct = productMarkupsMap[itemId] !== undefined ? Number(productMarkupsMap[itemId]) : defaultPct;
            const price = Number(item.price) || 0;
            const qty = Number(item.qty || item.quantity) || 0;
            const itemTotal = price * qty;
            // Retail price includes the markup: retail = base * (1 + pct / 100) -> markup = retail * (pct / (100 + pct))
            const itemProfit = itemPct > 0 ? Math.round(itemTotal * (itemPct / (100 + itemPct))) : 0;
            return sum + itemProfit;
          }, 0);

          if (partnerMarkupAmount > 0) {
            await Partner.findByIdAndUpdate(partner._id, {
              $inc: { payoutBalance: partnerMarkupAmount }
            });
          }
        }
      } catch (pErr) {
        console.error('[Orders] Partner lookup/credit error:', pErr);
      }
    }

    const generatedWaybill = waybillNumber || (isB2B ? `AIR-WB-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}` : undefined);

    const formattedItems = (items || []).map((item: any) => ({
      name: item.name,
      price: Number(item.price) || 0,
      qty: Number(item.qty || item.quantity) || 1,
      image: item.image,
      isQuoteItem: !!item.isQuoteItem,
      pharmacy: item.pharmacy,
      packForm: item.packForm || item.pack || undefined,
    }));

    const orderData = {
      user: session?.userId || undefined,
      patientName: patientName || buyerPharmacyName || 'B2B Client', 
      patientAge, 
      patientCondition,
      deliveryEmail, 
      deliveryPhone, 
      deliveryAddress, 
      deliveryCity, 
      deliveryState,
      items: formattedItems,
      coupon, 
      deliveryOption, 
      orderType: orderType || (isB2B ? 'S' : 'MN'), 
      businesses: businesses || (sellerDepotName ? [sellerDepotName] : []),
      totalAmount,
      sfcAmount: sfcAmount || 0,
      deliveryFee: deliveryFee || 0,
      courierName,
      courierId,
      courierLogo,
      shipbubbleRequestToken,
      requestId: (requestId && requestId.length === 24) ? requestId : undefined,
      quoteId,
      partnerSlug: resolvedPartnerSlug,
      partnerMarkupAmount,
      partnerSettlementStatus: 'pending',
      paymentMethod: paymentMethod || 'paystack',
      paymentReference: paymentReference || undefined,
      isB2B: !!isB2B,
      buyerPharmacyName: buyerPharmacyName || undefined,
      buyerPcnLicense: buyerPcnLicense || undefined,
      sellerDepotName: sellerDepotName || (isB2B ? 'Airen Wholesale Depot' : undefined),
      distanceKm: distanceKm != null ? Number(distanceKm) : undefined,
      estimatedTransitTime: estimatedTransitTime || undefined,
      waybillNumber: generatedWaybill,
      status: paymentReference ? 'Accepted' : 'Pending'
    };

    const newOrder = new Order(orderData);
    await newOrder.save();

    // Trigger WhatsApp ChatOps for Bubblegum Concierge
    if (resolvedPartnerSlug === 'bubblegum' && deliveryLat && deliveryLng) {
      try {
        await createConciergeSession(newOrder, Number(deliveryLat), Number(deliveryLng));
        console.log(`[Concierge] Triggered successfully for order ${newOrder._id}`);
      } catch (err: any) {
        console.error(`[Concierge] Error triggering session:`, err?.message);
      }
    }

    // If linked to a request, update the request status
    if (requestId && requestId.length === 24) {
        await RequestModel.findByIdAndUpdate(requestId, { status: 'confirmed' });
    }

    let debugStr = 'Pusher Not Attempted';

    // Trigger Pusher notification for Synkk Desktop
    if (businesses && businesses.length > 0) {
      debugStr = `Attempt: ${businesses[0]}`;
      // Find the pharmacy slug based on business name
      const pharmacy = await User.findOne({ businessName: businesses[0], role: { $in: ['pharmacy', 'pharmacist'] } });
      if (pharmacy) {
        const fallbackName = pharmacy.businessName || businesses[0] || 'pharmacy';
        const targetSlug = pharmacy.slug || fallbackName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        try {
          await triggerNewOrder(targetSlug, {
            orderId: String(newOrder._id),
            patientName: newOrder.patientName || 'Patient',
            itemsCount: newOrder.items?.length || 0,
            totalAmount: newOrder.totalAmount
          });
          debugStr = `Pusher Success: ${targetSlug}`;
          console.log(`Pusher notification successfully sent to pharmacy-${targetSlug}`);
        } catch (pushErr: any) {
          debugStr = `Pusher Error: ${pushErr.message}`;
          console.error("Failed to push notification:", pushErr);
        }
      } else {
        debugStr = `Pharmacy Not Found in DB: ${businesses[0]}`;
      }
    } else {
      debugStr = `Businesses array missing: ${JSON.stringify(businesses)}`;
    }

    // Attach debug string to condition so it's visible in UI
    await Order.findByIdAndUpdate(newOrder._id, { 
      patientCondition: (patientCondition ? patientCondition + ' | ' : '') + debugStr 
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/orders:', error);
    return NextResponse.json({ 
      message: 'Internal Server Error', 
      error: error.message 
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  await dbConnect();
  
  // Allow Synkk Desktop app to bypass session via Bearer token
  const authHeader = req.headers.get('Authorization');
  const isDesktopApp = authHeader === 'Bearer dev-token';
  
  const session = await getSession(req);
  if (!session && !isDesktopApp) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ message: 'Order ID and status are required' }, { status: 400 });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // --- PHARMACIST PERFORMANCE ENGINE (Live Stats Update) ---
    if (status === 'Completed' && updatedOrder.requestId && updatedOrder.quoteId) {
      try {
        const foundRequest = await RequestModel.findById(updatedOrder.requestId);
        if (foundRequest && foundRequest.quotes) {
          const acceptedQuote = (foundRequest.quotes as any[]).find((q: any) => q._id.toString() === (updatedOrder as any).quoteId);
          if (acceptedQuote && acceptedQuote.pharmacy) {
            const pharmacistId = acceptedQuote.pharmacy;
            
            // Increment Stats: Order Count, Earnings, and Reputation
            const updatedPharmacist = await User.findByIdAndUpdate(
              pharmacistId,
              { 
                $inc: { 
                  orderCount: 1, 
                  earnings: (updatedOrder.sfcAmount || 0) * 0.05,
                  reputationScore: 0.5 // Increment reputation for successful fulfillment
                }
              },
              { new: true }
            );

            // Cap Reputation at 100%
            if (updatedPharmacist && updatedPharmacist.reputationScore != null && updatedPharmacist.reputationScore > 100) {
              await User.findByIdAndUpdate(pharmacistId, { $set: { reputationScore: 100 } });
            }
            
            console.log(`[PerformanceEngine] Stats updated for Pharmacist: ${pharmacistId}`);
          }
        }
      } catch (err) {
        console.error('[PerformanceEngine] Error updating pharmacist stats:', err);
        // We don't fail the whole request if stats update fails, but we log it.
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('Error in PUT /api/orders:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
