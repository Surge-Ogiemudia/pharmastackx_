
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import User from '@/models/User';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function GET(req: NextRequest) {
  console.log('--- [GET /api/account/pharmacists] Received request ---');
  try {
    await dbConnect();
    console.log('Database connected.');

    const cookieStore = await cookies();
    // CORRECTED: Looking for 'session_token' instead of 'token'
    const sessionToken = cookieStore.get('session_token');

    if (!sessionToken) {
        console.log('Authentication failed: No session_token found.');
        return NextResponse.json({ message: 'Authentication failed' }, { status: 401 });
    }
    console.log('session_token found.');

    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
    const user = await User.findById(payload.userId).lean();

    if (!user || user.role !== 'pharmacy') {
      console.log(`Unauthorized access attempt. User ID: ${payload.userId}, Role: ${user?.role}`);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.log(`Authenticated as pharmacy: ${user.username} (ID: ${user._id})`);

    const pharmacyIdString = user._id.toString();
    console.log(`Querying for pharmacists with pharmacy ID (string): ${pharmacyIdString}`);

    const pharmacists = await User.find({
      role: 'pharmacist',
      pharmacy: pharmacyIdString, 
    }).select('username email profilePicture').lean();

    console.log(`Database query found ${pharmacists.length} pharmacist(s).`);
    if (pharmacists.length > 0) {
        console.log('Found pharmacists:', JSON.stringify(pharmacists, null, 2));
    }

    return NextResponse.json({ pharmacists }, { status: 200 });

  } catch (error: any) {
    console.error('--- [ERROR in /api/account/pharmacists] ---');
    console.error(`Error occurred: ${error.message}`);
    console.error(error.stack);
    if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ 
        message: 'An internal server error occurred.', 
        error: error.message 
    }, { status: 500 });
  }
}
