import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import TopContact from '@/models/TopContact';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const sessionCookie = req.cookies.get('session_token');
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const state = req.nextUrl.searchParams.get('state');
        if (state) {
            const doc = await TopContact.findOne({ state }).lean();
            return NextResponse.json(doc || { state, contacts: [] });
        }

        const all = await TopContact.find().sort({ state: 1 }).lean();
        return NextResponse.json(all);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const sessionCookie = req.cookies.get('session_token');
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { state, contacts } = await req.json();
        if (!state) return NextResponse.json({ error: 'State is required' }, { status: 400 });
        if (contacts?.length > 10) return NextResponse.json({ error: 'Maximum 10 contacts per state' }, { status: 400 });

        const doc = await TopContact.findOneAndUpdate(
            { state },
            { state, contacts },
            { upsert: true, new: true }
        );
        return NextResponse.json(doc);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
