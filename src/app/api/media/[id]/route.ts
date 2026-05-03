import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Media from '@/models/Media';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await dbConnect();
        const media = await Media.findById(id).lean() as any;

        if (!media) return new NextResponse('Not found', { status: 404 });

        const base64 = media.data.includes(',') ? media.data.split(',')[1] : media.data;
        const buffer = Buffer.from(base64, 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': media.contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch {
        return new NextResponse('Error', { status: 500 });
    }
}
