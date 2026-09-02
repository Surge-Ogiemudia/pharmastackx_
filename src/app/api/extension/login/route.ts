import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Direct password match fallback
    let isMatch = (user.password === password);
    if (!isMatch && user.password) {
      try {
        const bcrypt = require('bcryptjs');
        isMatch = await bcrypt.compare(password, user.password);
      } catch (e) {}
    }

    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const pharmacyId = String(user._id);
    const pharmacyName = user.businessName || user.username || user.slug || 'My Pharmacy';

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      pharmacyId: pharmacyId,
      pharmacyName: pharmacyName,
      user: {
        id: pharmacyId,
        email: user.email,
        name: pharmacyName
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
