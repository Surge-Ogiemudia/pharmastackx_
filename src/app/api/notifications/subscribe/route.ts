import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { pharmacyId, subscription } = await req.json();

    if (!pharmacyId || !subscription?.endpoint) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    await User.findByIdAndUpdate(pharmacyId, {
      webPushSubscription: {
        endpoint:       subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: {
          p256dh: subscription.keys?.p256dh ?? '',
          auth:   subscription.keys?.auth   ?? '',
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { pharmacyId } = await req.json();
    if (!pharmacyId) return NextResponse.json({ message: 'Missing pharmacyId' }, { status: 400 });
    await User.findByIdAndUpdate(pharmacyId, { $unset: { webPushSubscription: '' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
