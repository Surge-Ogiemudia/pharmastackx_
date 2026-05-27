import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { action, email, password, pharmacyName, phone } = body;

    if (!action || (action !== 'guest' && action !== 'update-guest' && !email)) {
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

    if (action === 'update-guest') {
      const { oldSlug, newSlug, pharmacyName } = body;
      
      if (!oldSlug || !newSlug) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
      }

      if (oldSlug !== newSlug) {
        const existingUser = await User.findOne({ slug: newSlug });
        if (existingUser) {
          return NextResponse.json({ success: false, error: 'That storefront link is already taken. Please try another one.' }, { status: 400 });
        }
      }

      const user = await User.findOne({ slug: oldSlug });
      if (!user) {
         return NextResponse.json({ success: false, error: 'Guest account not found.' }, { status: 404 });
      }

      if (!user.email.endsWith('@synkk.pharmastackx.com')) {
         return NextResponse.json({ success: false, error: 'Only guest accounts can be updated this way.' }, { status: 403 });
      }

      user.oldGuestSlug = user.slug;
      user.slug = newSlug;
      if (pharmacyName) user.businessName = pharmacyName;
      user.email = `${newSlug}@synkk.pharmastackx.com`;

      await user.save();

      return NextResponse.json({ success: true, slug: user.slug, message: 'Guest account updated' });
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
      if (!user || !user.password) {
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
      }

      const isMatch = await bcrypt.compare(password, user.password as string);
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
