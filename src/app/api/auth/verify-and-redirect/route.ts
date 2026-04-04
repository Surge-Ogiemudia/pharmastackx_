
import { NextResponse, NextRequest } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

export async function GET(req: NextRequest) {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    const host = req.headers.get('host');
    const protocol = host?.startsWith('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    if (!token) {
        return NextResponse.redirect(`${baseUrl}/?error=verification_failed`);
    }

    try {
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationTokenExpires: { $gt: Date.now() },
        });

        if (!user) {
            return NextResponse.redirect(`${baseUrl}/?error=invalid_token`);
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationTokenExpires = undefined;
        await user.save();

        // Redirect to the homepage with a success query parameter
        return NextResponse.redirect(`${baseUrl}/?verification=success`);

    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.redirect(`${baseUrl}/?error=verification_failed`);
    }
}
