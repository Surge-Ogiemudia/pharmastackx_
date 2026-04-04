
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { businessName, email, password } = await req.json();

    if (!businessName || !email || !password) {
      return NextResponse.json({ error: 'Business name, email, and password are required.' }, { status: 400 });
    }
    
    const emailExists = await User.findOne({ email });
    if (emailExists) {
        return NextResponse.json({ error: 'This email is already in use. Please choose another one.' }, { status: 409 });
    }

    const claimablePharmacy = await User.findOne({
      businessName,
      role: 'pharmacy',
      email: { $regex: /@pharmacy\.placeholder$/, $options: 'i' }
    });

    if (!claimablePharmacy) {
      return NextResponse.json({ error: 'This pharmacy is not available to be claimed. It may have already been registered by another user.' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    claimablePharmacy.email = email;
    claimablePharmacy.password = hashedPassword;
    claimablePharmacy.emailVerified = false; 
    
    await claimablePharmacy.save();
    
    return NextResponse.json({ message: 'Pharmacy claimed successfully. You can now log in.' }, { status: 200 });

  } catch (error: any) {
    console.error("Claim Pharmacy API Error:", error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
        return NextResponse.json({ error: 'This email has just been taken. Please choose another one.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
