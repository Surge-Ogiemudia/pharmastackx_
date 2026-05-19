import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import TopContact from '@/models/TopContact';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const sessionCookie = req.cookies.get('session_token');
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { state, phone, inventory } = await req.json();
        if (!state || !phone || !Array.isArray(inventory)) {
            return NextResponse.json({ error: 'state, phone, and inventory array are required' }, { status: 400 });
        }

        const result = await TopContact.updateOne(
            { state, 'contacts.phone': phone },
            { $set: { 'contacts.$.inventory': inventory } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, itemCount: inventory.length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
