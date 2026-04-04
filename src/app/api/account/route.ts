
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function GET() {
  await dbConnect();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token');

  if (!sessionToken) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  try {
    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
    const userId = payload.userId;

    if (!userId) {
      throw new Error('Invalid token payload');
    }

    // Correctly populate the pharmacy details. Changed to populate the full document for robustness.
    const user = await User.findById(userId)
      .select('-password -verificationDocuments -fcmTokens')
      .populate('pharmacy') // Populate the full pharmacy document
      .lean();

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });

  } catch (error) {
    console.error('Account API Error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
    await dbConnect();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');

    if (!sessionToken) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
        const userId = payload.userId;

        if (!userId) {
            throw new Error('Invalid token payload');
        }

        const body = await req.json();
        const { 
            username, 
            profilePicture, 
            businessName, 
            businessAddress, 
            city, 
            state,
            phoneNumber,
            mobile,
            stateOfPractice,
            licenseNumber,
            latitude,
            longitude,
            slug
        } = body;

        const updateData: { [key: string]: any } = { 
            username, 
            profilePicture, 
            businessName, 
            businessAddress, 
            city, 
            state,
            phoneNumber,
            mobile,
            stateOfPractice,
            licenseNumber,
            slug
        };

        if (latitude !== undefined && longitude !== undefined) {
          updateData.businessCoordinates = { latitude, longitude };
        }

        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true })
        .select('-password -verificationDocuments -fcmTokens')
        .populate('pharmacy') // Also changed here for consistency
        .lean();

        if (!updatedUser) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(updatedUser, { status: 200 });

    } catch (error) {
        console.error('Account Update Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
