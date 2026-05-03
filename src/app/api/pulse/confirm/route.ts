import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Subscriber from '@/models/Subscriber';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://psx.ng';

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
        return NextResponse.redirect(`${BASE_URL}/pulse?subscribed=error`);
    }

    try {
        await dbConnect();
        const subscriber = await Subscriber.findOneAndUpdate(
            { token },
            { confirmed: true },
            { new: true }
        );

        if (!subscriber) {
            return NextResponse.redirect(`${BASE_URL}/pulse?subscribed=error`);
        }

        return NextResponse.redirect(`${BASE_URL}/pulse?subscribed=true`);
    } catch (error: any) {
        console.error('CONFIRM_ERROR', error.message);
        return NextResponse.redirect(`${BASE_URL}/pulse?subscribed=error`);
    }
}
