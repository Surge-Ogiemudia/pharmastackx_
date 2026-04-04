import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import Log from '@/models/Log';
import User from '@/models/User'; // We need the User model to identify the actor

// This must match the secret used in your login route
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

/**
 * A helper function to get the currently authenticated user from the session token cookie.
 * This mirrors the logic in your api/auth/session route.
 */
async function getCurrentUser() {
    const cookieStore = await cookies(); // CORRECTED: Added 'await' here
    const tokenCookie = cookieStore.get('session_token');
  
    if (!tokenCookie?.value) {
      return null;
    }
  
    try {
      await dbConnect();
      const payload = jwt.verify(tokenCookie.value, JWT_SECRET) as { userId: string };
      if (!payload.userId) {
        return null;
      }
      
      // Fetch the user from the database and return the plain object
      const user = await User.findById(payload.userId).select('businessName email role').lean();
      if (!user) return null;
      
      // Return a plain object with a string ID
      return { ...user, _id: user._id.toString() };
  
    } catch (error) {
      // This can happen if the token is expired or invalid
      console.error("Log auth helper error:", error);
      return null;
    }
  }
  

// GET function: To fetch logs for the admin view
export async function GET() {
  const user = await getCurrentUser();

  // This is a protected route: only admins can view the activity log
  if (user?.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }

  await dbConnect();
  try {
    // Fetch the 200 most recent logs, sorted from newest to oldest
    const logs = await Log.find({}).sort({ timestamp: -1 }).limit(200);
    return NextResponse.json(logs);
  } catch (error) {
    console.error('API/LOGS_GET_ERROR:', error);
    return NextResponse.json({ message: 'Failed to fetch logs' }, { status: 500 });
  }
}

// POST function: To create a new log entry from any user action
export async function POST(req: Request) {
  const user = await getCurrentUser();
  
  // Any authenticated user can create a log entry for their own actions
  if (!user) {
    // This request might come from an unauthenticated page, so we don't return an error,
    // we just don't log it.
    return NextResponse.json({ message: 'No session, log ignored.' }, { status: 200 });
  }
  
  await dbConnect();
  try {
    const body = await req.json();

    const { action, target, status, details } = body;
    // Basic validation
    if (!action || !status) {
      return NextResponse.json({ message: 'Action and status are required for logging' }, { status: 400 });
    }

    // Create a new log document using the Log model
    const newLog = new Log({
      actor: {
        id: user._id, // The user's MongoDB ObjectId as a string
        name: user.businessName || user.email, // Use businessName or fall back to email
      },
      action,
      target,
      status,
      details,
    });

    await newLog.save(); // Save the log to the database
    return NextResponse.json({ message: 'Log created' }, { status: 201 });

  } catch (error) {
    console.error('API/LOGS_POST_ERROR:', error);
    // This is a background task, so we should not show an error to the user.
    // We just return a success response and log the error on the server.
    return NextResponse.json({ message: 'Log creation failed silently on server' }, { status: 200 });
  }
}
