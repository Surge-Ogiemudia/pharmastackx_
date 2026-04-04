import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '../../../../models/User';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req) {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = jwt.verify(sessionToken, JWT_SECRET);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { coordinates } = body;
    
    if (!coordinates || typeof coordinates.latitude === 'undefined' || typeof coordinates.longitude === 'undefined') {
      return NextResponse.json({ error: 'Coordinates object with latitude and longitude are missing' }, { status: 400 });
    }

    // --- START OF THE FIX ---

    // 1. Fetch the currently logged-in user
    const loggedInUser = await User.findById(payload.userId);

    if (!loggedInUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Determine which user ID to update
    let targetUserId = payload.userId; // Default to the logged-in user
    if (loggedInUser.role === 'pharmacist' && loggedInUser.pharmacy) {
        // If the user is a pharmacist, target their associated pharmacy instead
        targetUserId = loggedInUser.pharmacy;
    }

    // 3. Update the target user's record (either the pharmacist or the pharmacy)
    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      {
        $set: {
          businessCoordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          }
        }
      },
      { new: true }
    ).select('slug businessCoordinates');

    // --- END OF THE FIX ---


    if (!updatedUser) {
      // This might happen if the pharmacist has a pharmacy ID that doesn't exist
      return NextResponse.json({ error: 'Target user for location update not found' }, { status: 404 });
    }
    
    
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('API /user/location error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
