import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import Partner from '@/models/Partner';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const password = searchParams.get('password');
    const slug = searchParams.get('slug'); // for partners

    if (!password) {
      return NextResponse.json({ error: 'Password is required. Usage: ?email=...&password=... or ?slug=...&password=...' }, { status: 400 });
    }
    if (!email && !slug) {
      return NextResponse.json({ error: 'Either email or slug is required.' }, { status: 400 });
    }

    await dbConnect();

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let updated = false;
    let type = '';
    let accountName = '';

    // Check if it's a Partner (by slug or contactEmail)
    if (slug || email) {
      const query = slug ? { slug } : { contactEmail: email?.toLowerCase() };
      const partner = await Partner.findOne(query);
      if (partner) {
        partner.passwordHash = hashedPassword;
        await partner.save();
        updated = true;
        type = 'Partner';
        accountName = partner.name || partner.slug;
      }
    }

    // Check if it's a User (by email)
    if (!updated && email) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        user.password = hashedPassword;
        await user.save();
        updated = true;
        type = 'User';
        accountName = user.username || user.companyName || user.email;
      }
    }

    if (updated) {
      return NextResponse.json({
        success: true,
        message: `Password successfully updated for ${type}: ${accountName}`,
        identifier: email || slug,
      });
    } else {
      return NextResponse.json({ error: 'Account not found with that email or slug.' }, { status: 404 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
