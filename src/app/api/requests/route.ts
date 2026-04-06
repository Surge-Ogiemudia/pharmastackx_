
import { NextResponse, NextRequest } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import RequestModel from '@/models/Request';
import UserModel from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Helper to get session from the request cookies
async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  console.log('\n--- [API /api/requests POST] ---');
  await dbConnect();
  console.log('[LOG] Database connected.');

  const session = await getSession(req);
  let userId;

  try {
    if (session?.userId) {
      console.log(`[LOG] Session found for userId: ${session.userId}`);
      userId = session.userId;
    } else {
      console.log('[LOG] No session found. Creating placeholder user.');
      const uniqueId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const newUser = new UserModel({
        username: uniqueId,
        email: `${uniqueId}@placeholder.com`,
        password: `GuestPassword_${uniqueId}`, // This should be securely generated and handled
        role: 'customer',
      });
      await newUser.save();
      userId = newUser._id;
      console.log(`[LOG] Placeholder user created with ID: ${userId}`);
    }

    const body = await req.json();
    console.log('[LOG] Request body parsed:', body);

    if (body.requestType === 'text') {
      console.log("[LOG] Correction: Converted requestType from 'text' to 'drug-list'.");
      body.requestType = 'drug-list';
    }

    const { requestType, items, phoneNumber, state, coordinates, notes, prescriptionImage } = body; 

    if (!requestType) {
      console.error('[ERROR] Validation failed: requestType is missing.');
      return NextResponse.json({ message: 'Request type is required' }, { status: 400 });
    }

    let parsedCoordinates = undefined;
    if (coordinates) {
        if (Array.isArray(coordinates.coordinates)) {
            parsedCoordinates = coordinates.coordinates; // Handle GeoJSON object
        } else if (Array.isArray(coordinates)) {
            parsedCoordinates = coordinates; // Handle plain array
        }
    }

    const requestData: any = {
      user: userId,
      requestType,
      items: (items || []).map((it: any) => ({
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        strength: it.strength,
        form: it.form,
        notes: it.notes,
        image: it.image
      })),
      status: 'pending',
      phoneNumber: phoneNumber,
      state: state,
      coordinates: parsedCoordinates,
      notes: notes,
      prescriptionImage: prescriptionImage
    };

    console.log('[LOG] Data prepared for database model:', requestData);
    const newRequest = new RequestModel(requestData);

    console.log('[LOG] Mongoose model created. About to save...');
    await newRequest.save();

    console.log('[LOG] Save successful! Document ID:', newRequest._id);
    
    const response = NextResponse.json(newRequest, { status: 201 });
    
    // If this was a guest request (no existing session), set a session cookie
    if (!session?.userId) {
      console.log('[LOG] Setting guest session cookie for new user:', userId);
      const token = jwt.sign(
        { userId: userId.toString(), role: 'customer' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      response.cookies.set('session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    return response;

  } catch (error: any) {
    console.error('[FATAL] Error creating request in database:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while creating request.', error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const source = searchParams.get('source');
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
  
    // For the dispatch form, we ONLY want to fetch by the provided userId.
    if (source === 'dispatch' && userId) {
      try {
        const requests = await RequestModel.find({ user: userId })
          .populate('user', 'name email')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        return NextResponse.json(requests, { status: 200 });
      } catch (error) {
        console.error('Error fetching requests for user:', error);
        return NextResponse.json({ message: 'Internal Server Error while fetching user requests.' }, { status: 500 });
      }
    }
  
    // Fallback to existing session-based logic for other parts of the application
    const session = await getSession(req);
    if (!session?.userId) {
      // If there's no session and it's not a dispatch request, return unauthorized.
      return NextResponse.json({ message: 'Unauthorized: No valid session found' }, { status: 401 });
    }
  
    try {
        const own = searchParams.get('own') === 'true';
        let query: any = {};
        const pharmacistRoles = ['pharmacist', 'pharmacy'];

        if (own || activeOnly) {
            // Filter by current user
            query = { user: session.userId };
            if (activeOnly) {
                query.status = { $in: ['pending', 'quoted'] };
            }
        } else if (pharmacistRoles.includes(session.role)) {
            // Pharmacists see open requests or requests where their quote was accepted.
            query = {
                $or: [
                    { status: { $in: ['pending', 'quoted'] } },
                    { 'quotes': { $elemMatch: { pharmacy: session.userId, status: 'accepted' } } }
                ]
            };
        } else if (session.role === 'admin') {
            // Admins see all requests.
            query = {};
        } else {
            // Regular users see their own requests.
            query = { user: session.userId };
        }

        // Optimization: Use projection if only the active status is needed
        const projection = activeOnly ? '_id status quotes items' : '';

        let queryBuilder = RequestModel.find(query, projection);
        if (!activeOnly) {
           queryBuilder = queryBuilder.populate('user', 'name email');
        }

        const requests = await queryBuilder
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);
  
        return NextResponse.json(requests, { 
            status: 200,
            headers: {
                'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
            }
        });

    } catch (error) {
      console.error('Error fetching requests:', error);
      return NextResponse.json({ message: 'Internal Server Error while fetching requests.' }, { status: 500 });
    }
}
