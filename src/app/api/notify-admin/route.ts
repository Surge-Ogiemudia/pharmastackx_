
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import UserModel from '@/models/User';

async function getAdminTokens(): Promise<string[]> {
    await dbConnect();
    const users = await UserModel.find(
        { role: 'admin', fcmTokens: { $nin: [null, []] } },
        { fcmTokens: 1, _id: 0 }
    ).lean();
    return users.flatMap(user => user.fcmTokens).filter(Boolean) as string[];
}

export async function POST(req: NextRequest) {
    try {
        const { userName, userRole } = await req.json();

        if (!userName || !userRole) {
            return NextResponse.json({ message: 'User name and role are required' }, { status: 400 });
        }

        const tokens = await getAdminTokens();

        if (tokens.length === 0) {
            return NextResponse.json({ message: 'No admin to notify' }, { status: 200 });
        }

        const admin = getFirebaseAdmin();
        const notificationTitle = 'New User Signup';
        const notificationBody = `${userName} a ${userRole} just signed up.`;

        const message = {
            notification: {
                title: notificationTitle,
                body: notificationBody,
            },
            tokens: tokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message as any);
        console.log('Successfully sent message:', response);

        return NextResponse.json({ success: true, message: `Notified ${response.successCount} admins.` });

    } catch (error) {
        console.error('Error sending notification:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
