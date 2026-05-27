import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { action, email, password, pharmacyName, phone } = body;

    if (!action || (action !== 'login' && action !== 'register' && action !== 'check')) {
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

    if (action === 'register') {
      const { slug } = body; // The custom slug chosen by the user in StorefrontSetup
      if (!password || !pharmacyName || !phone) {
        return NextResponse.json({ success: false, error: 'Missing registration fields' }, { status: 400 });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json({ success: false, error: 'User already exists' }, { status: 400 });
      }

      let uniqueSlug = '';
      if (slug) {
        // User provided a custom slug from the desktop app setup screen
        uniqueSlug = slug.toLowerCase().replace(/[^a-z0-9\-]+/g, '');
        if (await User.findOne({ slug: uniqueSlug })) {
          return NextResponse.json({ success: false, error: 'That storefront link is already taken. Please choose another.' }, { status: 400 });
        }
      } else {
        // Generate slug from pharmacy name
        let baseSlug = pharmacyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        uniqueSlug = baseSlug;
        let counter = 1;
        while (await User.findOne({ slug: uniqueSlug })) {
          uniqueSlug = `${baseSlug}-${counter}`;
          counter++;
        }
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

      return NextResponse.json({ success: true, slug: user.slug, name: user.businessName, message: 'Login successful' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error("Auth error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
