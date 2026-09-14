import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

const SHIPBUBBLE_API_KEY = process.env.SHIPBUBBLE_API_KEY || 'sb_prod_da9fee47730a44feb587a42067544eed04a785555a131a3040c153fd2781048a';
const SHIPBUBBLE_BASE_URL = 'https://api.shipbubble.com/v1';

// Default category: Dry food and supplements / Pharmaceuticals
const DEFAULT_CATEGORY_ID = 98190590;

export interface CourierResult {
  courierId: string;
  courierName: string;
  courierImage?: string;
  serviceCode: string;
  serviceType: string;
  total: number;
  deliveryEta: string;
  pickupEta?: string;
  isCheapest?: boolean;
  isFastest?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pharmacyName,
      deliveryAddress,
      deliveryCity,
      deliveryState,
      recipientName,
      recipientPhone,
      recipientEmail,
      items
    } = body;

    if (!deliveryAddress || deliveryAddress.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid delivery address.' },
        { status: 400 }
      );
    }

    // 1. Determine Sender (Pharmacy) origin address
    await dbConnect();
    let originAddress = '';
    let originCity = 'Lagos';
    let originState = 'Lagos';
    let originPhone = '08011223344';
    let originName = pharmacyName || 'PharmaStackX Hub';

    if (pharmacyName) {
      try {
        const pharmacyUser = await User.findOne({
          $or: [
            { businessName: new RegExp(`^${pharmacyName}$`, 'i') },
            { username: new RegExp(`^${pharmacyName}$`, 'i') },
            { slug: pharmacyName.toLowerCase() }
          ]
        });

        if (pharmacyUser) {
          originAddress = pharmacyUser.businessAddress || '';
          originCity = pharmacyUser.city || originCity;
          originState = pharmacyUser.state || originState;
          originPhone = pharmacyUser.phoneNumber || pharmacyUser.mobile || originPhone;
          originName = pharmacyUser.businessName || originName;
        }
      } catch (dbErr) {
        console.warn('[Shipbubble] Pharmacy lookup warning:', dbErr);
      }
    }

    // Ensure origin address format has city, state and Nigeria
    if (!originAddress || originAddress.trim().length < 5) {
      originAddress = '62 Old Yaba Rd, Adekunle, Lagos, Nigeria';
    } else {
      if (!originAddress.toLowerCase().includes('nigeria')) {
        originAddress = `${originAddress}, ${originCity}, ${originState}, Nigeria`;
      }
    }

    // 2. Format Recipient (Patient) destination address
    let destAddress = deliveryAddress.trim();
    if (deliveryCity && !destAddress.toLowerCase().includes(deliveryCity.trim().toLowerCase())) {
      destAddress += `, ${deliveryCity.trim()}`;
    }
    if (deliveryState && !destAddress.toLowerCase().includes(deliveryState.trim().toLowerCase())) {
      destAddress += `, ${deliveryState.trim()}`;
    }
    if (!destAddress.toLowerCase().includes('nigeria')) {
      destAddress += `, Nigeria`;
    }

    // Helper to call Shipbubble REST API
    const callShipbubble = async (endpoint: string, method: string, payload?: any) => {
      const res = await fetch(`${SHIPBUBBLE_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${SHIPBUBBLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: payload ? JSON.stringify(payload) : undefined
      });
      const data = await res.json().catch(() => null);
      return { ok: res.ok, status: res.status, data };
    };

    // 3. Validate Origin Address
    let senderCode: number | null = null;
    const originValidation = await callShipbubble('/shipping/address/validate', 'POST', {
      name: originName,
      email: 'logistics@psx.ng',
      phone: originPhone.startsWith('+') ? originPhone : `+234${originPhone.replace(/^0+/, '')}`,
      address: originAddress
    });

    if (originValidation.ok && originValidation.data?.data?.address_code) {
      senderCode = originValidation.data.data.address_code;
    } else {
      // Fallback origin to default verified Lagos dispatch hub
      const fallbackOrigin = await callShipbubble('/shipping/address/validate', 'POST', {
        name: 'PharmaStackX Central Hub',
        email: 'logistics@psx.ng',
        phone: '+2348011223344',
        address: '62 Old Yaba Rd, Adekunle, Lagos, Nigeria'
      });
      if (fallbackOrigin.ok && fallbackOrigin.data?.data?.address_code) {
        senderCode = fallbackOrigin.data.data.address_code;
      }
    }

    // 4. Validate Destination Address
    const cleanPhone = (recipientPhone || '08012345678').trim();
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+234${cleanPhone.replace(/^0+/, '')}`;

    const destValidation = await callShipbubble('/shipping/address/validate', 'POST', {
      name: recipientName || 'Valued Patient',
      email: recipientEmail || 'patient@psx.ng',
      phone: formattedPhone,
      address: destAddress
    });

    if (!destValidation.ok || !destValidation.data?.data?.address_code) {
      console.warn('[Shipbubble] Destination validation failed:', destValidation.data?.message || destValidation.status);
      return NextResponse.json({
        success: false,
        message: destValidation.data?.message || 'Could not validate destination address. Please check street, city, and state.',
        fallbackRate: 1500
      }, { status: 422 });
    }

    const recipientCode = destValidation.data.data.address_code;
    const geocodedAddress = destValidation.data.data.formatted_address || destAddress;

    // 5. Query Package Category (with cached/default fallback)
    let categoryId = DEFAULT_CATEGORY_ID;
    try {
      const catRes = await callShipbubble('/shipping/labels/categories', 'GET');
      if (catRes.ok && Array.isArray(catRes.data?.data) && catRes.data.data.length > 0) {
        categoryId = catRes.data.data[0].category_id;
      }
    } catch {
      categoryId = DEFAULT_CATEGORY_ID;
    }

    // 6. Request Live Rates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pickupDate = tomorrow.toISOString().split('T')[0];

    // Compute approximate weight and amount from items
    const itemCount = Array.isArray(items) ? items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0) : 1;
    const estimatedWeight = Math.min(Math.max(itemCount * 0.2, 0.5), 10);
    const estimatedAmount = Array.isArray(items) 
      ? items.reduce((acc: number, it: any) => acc + ((Number(it.price) || 1000) * (Number(it.quantity) || 1)), 0)
      : 5000;

    const ratePayload = {
      sender_address_code: senderCode,
      reciever_address_code: recipientCode,
      pickup_date: pickupDate,
      category_id: categoryId,
      package_items: [
        {
          name: 'Pharmaceutical Care Package',
          description: 'Medication supplies and health care package',
          unit_weight: estimatedWeight,
          unit_amount: estimatedAmount,
          weight: estimatedWeight,
          amount: estimatedAmount,
          quantity: 1
        }
      ],
      package_dimension: {
        length: 12,
        width: 12,
        height: 12
      }
    };

    const ratesRes = await callShipbubble('/shipping/fetch_rates', 'POST', ratePayload);

    if (!ratesRes.ok || !ratesRes.data?.data?.couriers) {
      console.warn('[Shipbubble] Rates fetch failed:', ratesRes.data);
      return NextResponse.json({
        success: true,
        fallback: true,
        geocodedAddress,
        couriers: [
          {
            courierId: 'standard_fallback',
            courierName: 'Standard Courier Delivery',
            courierImage: 'https://res.cloudinary.com/delivry/image/upload/v1646216432/courier_images/bubble_delivery_aojavr.png',
            serviceCode: 'standard_dispatch',
            serviceType: 'pickup',
            total: 1500,
            deliveryEta: 'Within 24 – 48 Hours',
            isCheapest: true,
            isFastest: false
          },
          {
            courierId: 'express_fallback',
            courierName: 'Priority Express Delivery',
            courierImage: 'https://res.cloudinary.com/delivry/image/upload/v1646216432/courier_images/bubble_delivery_aojavr.png',
            serviceCode: 'express_dispatch',
            serviceType: 'pickup',
            total: 2500,
            deliveryEta: 'Within 2 – 4 Hours',
            isCheapest: false,
            isFastest: true
          }
        ],
        requestToken: null,
        message: 'Live couriers temporarily unavailable; fallback rates loaded.'
      });
    }

    const ratesData = ratesRes.data.data;
    const cheapestId = ratesData.cheapest_courier?.courier_id;
    const fastestId = ratesData.fastest_courier?.courier_id;

    const couriers: CourierResult[] = (ratesData.couriers || []).map((c: any) => ({
      courierId: c.courier_id,
      courierName: c.courier_name,
      courierImage: c.courier_image,
      serviceCode: c.service_code,
      serviceType: c.service_type || 'pickup',
      total: Math.round(Number(c.total) || 0),
      deliveryEta: c.delivery_eta || 'Within 24 – 48 Hours',
      pickupEta: c.pickup_eta,
      isCheapest: c.courier_id === cheapestId,
      isFastest: c.courier_id === fastestId
    }));

    // Sort couriers by price ascending
    couriers.sort((a, b) => a.total - b.total);

    return NextResponse.json({
      success: true,
      fallback: false,
      geocodedAddress,
      couriers,
      requestToken: ratesData.request_token,
      cheapestCourier: couriers.find(c => c.isCheapest) || couriers[0],
      fastestCourier: couriers.find(c => c.isFastest) || couriers[0]
    });

  } catch (error: any) {
    console.error('[Shipbubble Rates Route Error]:', error);
    return NextResponse.json({
      success: true,
      fallback: true,
      couriers: [
        {
          courierId: 'standard_fallback',
          courierName: 'Standard Courier Delivery',
          courierImage: 'https://res.cloudinary.com/delivry/image/upload/v1646216432/courier_images/bubble_delivery_aojavr.png',
          serviceCode: 'standard_dispatch',
          serviceType: 'pickup',
          total: 1500,
          deliveryEta: 'Within 24 – 48 Hours',
          isCheapest: true,
          isFastest: false
        }
      ],
      requestToken: null,
      message: error.message || 'Error fetching shipping rates'
    });
  }
}
