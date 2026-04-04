
import { NextResponse } from 'next/server';
import User from '@/models/User';
import { dbConnect } from '@/lib/mongoConnect';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ message: 'Token and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Find the user by the raw token, consistent with the rest of the app
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return NextResponse.json({ message: 'Invalid or expired password reset token.' }, { status: 400 });
    }

    // Assign the plain password. The User model's pre-save hook will hash it.
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return NextResponse.json({ message: 'Password has been successfully reset.' }, { status: 200 });

  } catch (error) {
    console.error('Reset Password API Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
