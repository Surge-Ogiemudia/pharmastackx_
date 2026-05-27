import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Order from '@/models/Order';
import User from '@/models/User';

// Fast endpoint designed exclusively for Synkk Desktop to fetch missed orders on startup
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Synkk sends the pharmacy_slug as a query param
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ message: 'Pharmacy slug is required' }, { status: 400 });
    }

    // 1. Resolve slug to business name
    const pharmacy = await User.findOne({ slug });
    if (!pharmacy || !pharmacy.businessName) {
      return NextResponse.json({ message: 'Pharmacy not found' }, { status: 404 });
    }

    // 2. Fast query: All orders for this pharmacy (so Desktop can build the Recent Activity archive)
    const pendingOrders = await Order.find({
      businesses: pharmacy.businessName
    }).sort({ createdAt: -1 }).populate('user', 'name email phone');

    // 3. Transform to clean payload
    const transformedOrders = pendingOrders.map(order => {
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

    return NextResponse.json({ success: true, orders: transformedOrders });

  } catch (error: any) {
    console.error('Error in GET /api/orders/pending:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
