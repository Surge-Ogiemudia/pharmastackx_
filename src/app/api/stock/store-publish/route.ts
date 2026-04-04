
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req: NextRequest) {
    await dbConnect();
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session_token');
        if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
        const user = await User.findById(payload.userId);
        
        if (!user || !['admin', 'pharmacy', 'pharmacist', 'stockManager'].includes(user.role)) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { isPublished } = await req.json();

        user.isStorePublished = isPublished;
        await user.save();

        return NextResponse.json({ 
            message: `Store ${isPublished ? 'published' : 'unpublished'} successfully`, 
            isStorePublished: user.isStorePublished 
        });

    } catch (error: any) {
        console.error('Error toggling store publish:', error);
        return NextResponse.json({ message: 'Internal server error', details: error.message }, { status: 500 });
    }
}
