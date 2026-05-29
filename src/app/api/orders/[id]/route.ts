import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Order from '@/models/Order';
import { getSession } from '@/lib/session';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  const session = await getSession(req);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const { status } = await req.json();
    const allowed = ['Completed', 'Cancelled'];
    if (!allowed.includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    const order = await Order.findOneAndUpdate(
      { _id: params.id, user: session.userId },
      { status, ...(status === 'Completed' ? { completedAt: new Date() } : {}) },
      { new: true }
    );

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    return NextResponse.json({ success: true, status: order.status });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
