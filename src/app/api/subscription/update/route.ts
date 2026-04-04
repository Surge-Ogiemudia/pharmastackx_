import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req: Request) {
    await dbConnect();

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');

    if (!sessionToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    try {
        const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
        userId = payload.userId;
    } catch (error) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { promoCode, payment_success } = await req.json();

    const now = new Date();
    const oneMonthLater = new Date(now.setMonth(now.getMonth() + 1));

    if (promoCode?.toUpperCase() === 'ALLFREE' || payment_success === true) {
        try {
            const updatedUser = await User.findByIdAndUpdate(userId, {
                subscriptionStatus: 'subscribed',
                subscriptionExpiry: oneMonthLater,
                orderCount: 0,
            }, { new: true });

            if (!updatedUser) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            return NextResponse.json({ 
                message: 'Subscription updated successfully',
                user: {
                    subscriptionStatus: updatedUser.subscriptionStatus,
                    subscriptionExpiry: updatedUser.subscriptionExpiry
                }
            });
        } catch (error) {
            console.error('Error updating subscription:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
    } else {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
