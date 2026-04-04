import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// HELPER: Authorize Admin
async function authorizeAdmin() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    if (!sessionToken || !sessionToken.value) return null;
    try {
        const payload = jwt.verify(sessionToken.value, JWT_SECRET);
        const user = await User.findById(payload.userId).lean();
        if (user && user.role === 'admin') return user;
        return null;
    } catch (e) {
        return null;
    }
}

export async function GET(req) {
    const admin = await authorizeAdmin();
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;

        const users = await User.find({})
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);
        return NextResponse.json(users, { status: 200 });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ message: 'Server error while fetching users' }, { status: 500 });
    }
}

export async function POST(req) {
    const admin = await authorizeAdmin();
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    await dbConnect();
    try {
        const { email, password, role } = await req.json();

        if (!email || !password || !role) {
            return NextResponse.json({ message: 'Email, password, and role are required' }, { status: 400 });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username: email.split('@')[0], // FIX: Set username from email
            email,
            password: hashedPassword,
            role,
        });

        await newUser.save();

        // Exclude password from the returned object
        const userObject = newUser.toObject();
        delete userObject.password;

        return NextResponse.json({ message: 'User created successfully', user: userObject }, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ message: `Server error while creating user: ${error.message}` }, { status: 500 });
    }
}
