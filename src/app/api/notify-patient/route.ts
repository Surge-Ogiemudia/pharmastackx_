
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongoConnect';
import Request from '../../../models/Request';
import User from '../../../models/User';
import { getFirebaseAdmin } from '../../../lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { requestId } = await req.json();

    if (!requestId) {
      return NextResponse.json({ message: 'Request ID is required' }, { status: 400 });
    }

    const request = await Request.findById(requestId).populate('user');

    if (!request) {
      return NextResponse.json({ message: 'Request not found' }, { status: 404 });
    }

    const user = request.user as any; 

    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return NextResponse.json({ message: 'User or FCM tokens not found for this request' }, { status: 404 });
    }

    const admin = getFirebaseAdmin();
    const message = {
      notification: {
        title: 'You have a new quote!',
        body: `A pharmacist has responded to your request.`,
      },
      webpush: {
        fcm_options: {
          link: `/my-requests/${requestId}`,
        },
      },
      tokens: user.fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message as any);

    const tokensToDelete: string[] = [];
    response.responses.forEach((result, index) => {
      if (!result.success) {
        const errorInfo = result.error;
        if (errorInfo && errorInfo.code === 'messaging/registration-token-not-registered') {
          tokensToDelete.push(user.fcmTokens[index]);
        }
      }
    });

    if (tokensToDelete.length > 0) {
      await User.findByIdAndUpdate(user._id, { $pullAll: { fcmTokens: tokensToDelete } });
    }

    return NextResponse.json({ message: 'Notification sent successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Error sending notification to patient:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
