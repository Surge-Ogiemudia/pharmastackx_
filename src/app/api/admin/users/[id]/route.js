import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const { role } = await req.json(); // Changed userType to role

    if (!role) {
      return NextResponse.json({ error: 'Role is required.' }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role }, // Changed userType to role
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
