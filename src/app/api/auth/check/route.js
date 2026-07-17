import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

export async function POST(req) {
  await dbConnect();
  try {
    const { email, phoneNumber } = await req.json();

    if (!email && !phoneNumber) {
      return NextResponse.json({ exists: false }, { status: 400 });
    }

    let phoneVariants = [phoneNumber];
    if (phoneNumber) {
      let cleanPhone = phoneNumber.replace(/\D/g, ''); 
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
      if (cleanPhone.startsWith('234')) cleanPhone = cleanPhone.substring(3);

      phoneVariants = [
        phoneNumber,
        cleanPhone,
        `0${cleanPhone}`,
        `234${cleanPhone}`,
        `+234${cleanPhone}`,
      ];
    }

    const query = email 
      ? { email: email.toLowerCase() } 
      : { phoneNumber: { $in: phoneVariants } };
      
    const user = await User.findOne(query);
    
    if (user) {
      return NextResponse.json({ exists: true });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error('Check user error:', error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
