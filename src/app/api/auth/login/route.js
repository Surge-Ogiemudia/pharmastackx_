import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req) {
  await dbConnect();
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  
  if (!user) {
    return NextResponse.json({ error: 'No account found with this email.' }, { status: 404 }); 
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });
  }

  const token = jwt.sign(
    { userId: user._id, role: user.role, email: user.email, pharmacyId: user.pharmacy },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // --- Start of The Fix ---
  // Create a response object to return user data
  const response = NextResponse.json({
    message: "Login successful",
    user: { name: user.name, email: user.email, role: user.role }
  });

  // Set the session token as a secure, HttpOnly cookie
  response.cookies.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: '/', // Available to all paths
  });

  // Set a non-httpOnly cookie for the frontend to have an optimistic role hint
  response.cookies.set('psx_user_role', user.role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
  // --- End of The Fix ---
}
