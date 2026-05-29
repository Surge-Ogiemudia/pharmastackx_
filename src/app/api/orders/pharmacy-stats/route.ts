import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Order from '@/models/Order';
import User from '@/models/User';
import AnalyticsEvent from '@/models/AnalyticsEvent';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function getDateRange(filter: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  switch (filter) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start, end: now };
    }
    case 'week': {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start, end: now };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: now };
    }
    case 'custom': {
      const start = customStart ? new Date(customStart) : new Date(0);
      const end = customEnd ? new Date(customEnd) : now;
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    default: {
      // All time
      return { start: new Date(0), end: now };
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
    const user = await User.findById(payload.userId).select('businessName slug').lean() as any;
    if (!user?.businessName) return NextResponse.json({ error: 'No business found' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';
    const customStart = searchParams.get('start') || undefined;
    const customEnd = searchParams.get('end') || undefined;

    const { start, end } = getDateRange(filter, customStart, customEnd);
    const dateFilter = { createdAt: { $gte: start, $lte: end } };

    const [orders, visitCount] = await Promise.all([
      Order.find({
        businesses: user.businessName,
        status: { $ne: 'Cancelled' },
        ...dateFilter,
      })
        .sort({ createdAt: -1 })
        .populate('user', 'name email phone')
        .lean(),

      user.slug
        ? AnalyticsEvent.countDocuments({
            event: 'store_visit',
            label: user.slug,
            ...dateFilter,
          })
        : Promise.resolve(0),
    ]);

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      visitCount,
      orders: orders.map((o: any) => ({
        _id: o._id,
        patientName: o.patientName,
        patientAge: o.patientAge,
        patientCondition: o.patientCondition,
        deliveryEmail: o.deliveryEmail,
        deliveryPhone: o.deliveryPhone,
        deliveryAddress: o.deliveryAddress,
        deliveryCity: o.deliveryCity,
        deliveryState: o.deliveryState,
        items: o.items,
        totalAmount: o.totalAmount,
        deliveryOption: o.deliveryOption,
        status: o.status,
        createdAt: o.createdAt,
        user: {
          name: (o.user as any)?.name || o.patientName || 'N/A',
          email: (o.user as any)?.email || o.deliveryEmail,
          phone: (o.user as any)?.phone || o.deliveryPhone,
        }
      })),
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
