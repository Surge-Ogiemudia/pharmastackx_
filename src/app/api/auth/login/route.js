import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req) {
  await dbConnect();
  const { email, phoneNumber, password } = await req.json();

  if ((!email && !phoneNumber) || !password) {
    return NextResponse.json({ error: 'Email or phone number and password are required.' }, { status: 400 });
  }

  // Normalize phone number to catch common local vs international formats
  let phoneVariants = [phoneNumber];
  if (phoneNumber) {
    let cleanPhone = phoneNumber.replace(/\D/g, ''); // Remove spaces, +, etc
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    if (cleanPhone.startsWith('234')) cleanPhone = cleanPhone.substring(3);

    phoneVariants = [
      phoneNumber,           // exact typed
      cleanPhone,            // base digits (8157788101)
      `0${cleanPhone}`,      // local format (08157788101)
      `234${cleanPhone}`,    // intl without + (2348157788101)
      `+234${cleanPhone}`,   // intl with + (+2348157788101)
    ];
  }

  // Find user by either email or phone number (handling multiple phone formats)
  const query = email 
    ? { email: email.toLowerCase() } 
    : { phoneNumber: { $in: phoneVariants } };
    
  const user = await User.findOne(query);
  
  if (!user) {
    return NextResponse.json({ error: 'No account found with these credentials.' }, { status: 404 }); 
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
  const userObj = { 
    id: user._id.toString(),
    name: user.name || user.businessName || user.username, 
    email: user.email, 
    role: user.role,
    pharmacyId: user.pharmacy ? user.pharmacy.toString() : user._id.toString(),
    businessName: user.businessName,
    slug: user.slug
  };

  const response = NextResponse.json({
    message: 'Login successful',
    user: userObj,
    token: token
  });

  const cookieDomain = process.env.NODE_ENV === 'production' ? '.psx.ng' : undefined;

  // Set the session token as a secure, HttpOnly cookie
  response.cookies.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: '/', // Available to all paths
    domain: cookieDomain,
  });

  // Set a non-httpOnly cookie for the frontend to have an optimistic role hint
  response.cookies.set('psx_user_role', user.role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    domain: cookieDomain,
  });

  return response;
  // --- End of The Fix ---
}
