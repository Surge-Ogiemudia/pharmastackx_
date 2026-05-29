import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Order from '@/models/Order';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const session = await getSession(req);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const { status } = await req.json();
    const allowed = ['Completed', 'Cancelled'];
    if (!allowed.includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    const order = await Order.findOneAndUpdate(
      { _id: id, user: session.userId },
      { status, ...(status === 'Completed' ? { completedAt: new Date() } : {}) },
      { new: true }
    );

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    return NextResponse.json({ success: true, status: order.status });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
