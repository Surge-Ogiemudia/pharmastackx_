import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import DesktopRequestResponse from '@/models/DesktopRequestResponse';

export async function POST(req: Request) {
    try {
        await dbConnect();
        
        const body = await req.json();
        const { pharmacySlug, platformRequestId, items } = body;

        if (!pharmacySlug || !platformRequestId) {
            return NextResponse.json(
                { success: false, message: 'pharmacySlug and platformRequestId are required' },
                { status: 400 }
            );
        }

        const newResponse = await DesktopRequestResponse.create({
            pharmacySlug,
            platformRequestId,
            items: items || [],
            status: 'accepted'
        });

        console.log(`[synkk-accept] 📥 Recorded Accepted response from ${pharmacySlug} for request ${platformRequestId}`);

        return NextResponse.json({ success: true, data: newResponse }, { status: 200 });

    } catch (error: any) {
        console.error('[synkk-accept] ❌ Error recording response:', error?.message);
        return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
    }
}
