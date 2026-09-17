import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) return NextResponse.json({ error: 'Missing MONGO_URI' }, { status: 500 });

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URI);
    }
    const db = mongoose.connection.db;
    
    // Hash the new password
    const newPassword = 'courageousizzy';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the Apcare admin
    const result = await db.collection('users').updateOne(
      { email: 'courageomoregbee@gmail.com' },
      { $set: { password: hashedPassword } }
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password reset to courageousizzy',
      matched: result.matchedCount, 
      modified: result.modifiedCount 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
