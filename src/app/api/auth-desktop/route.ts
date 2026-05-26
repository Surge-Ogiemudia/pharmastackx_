import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { action, email, password, pharmacyName, phone } = body;

    if (!action || !email) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'check') {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        return NextResponse.json({ success: true, exists: true, slug: user.slug });
      } else {
        return NextResponse.json({ success: true, exists: false });
      }
    }

    if (action === 'guest') {
      const crypto = require('crypto');
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const randomId = crypto.randomBytes(4).toString('hex');
      const guestSlug = `guest-${randomId}`;

      const newUser = await User.create({
        username: `Guest Pharmacy ${randomId}`,
        email: `${guestSlug}@synkk.pharmastackx.com`,
        password: randomPassword, // Ghost password
        role: 'pharmacy',
        businessName: `Guest Pharmacy`,
        slug: guestSlug,
        isStorePublished: true,
        canManageStore: true
      });

      return NextResponse.json({ success: true, slug: newUser.slug, message: 'Guest account created' });
    }

    if (action === 'register') {
      if (!password || !pharmacyName || !phone) {
        return NextResponse.json({ success: false, error: 'Missing registration fields' }, { status: 400 });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json({ success: false, error: 'User already exists' }, { status: 400 });
      }

      // Generate slug from pharmacy name
      let baseSlug = pharmacyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (await User.findOne({ slug: uniqueSlug })) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        username: pharmacyName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'pharmacy',
        businessName: pharmacyName,
        phoneNumber: phone,
        slug: uniqueSlug,
        isStorePublished: true,
        canManageStore: true
      });

      return NextResponse.json({ success: true, slug: newUser.slug, message: 'Registration successful' });
    }

    if (action === 'login') {
      if (!password) {
        return NextResponse.json({ success: false, error: 'Missing password' }, { status: 400 });
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
      }

      return NextResponse.json({ success: true, slug: user.slug, message: 'Login successful' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error("Auth error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
