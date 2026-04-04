
import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import Message from "@/models/Message";

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

interface FrontendMessage {
  _id: string;
  sender: string;
  receiver: string;
  content: string;
  createdAt: string;
}

type RouteContext = {
  params: Promise<{ userId: string; }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  await dbConnect();

  // Await the resolution of the params promise to access the userId
  const { userId: otherUserId } = await context.params;
  
  // Await the cookies() function to get the cookie store
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token');

  if (!sessionToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string };
    const currentUserId = payload.userId;

    const dbMessages = await Message.find({
      $or: [
        { from: currentUserId, to: otherUserId },
        { from: otherUserId, to: currentUserId },
      ],
    })
    .sort({ createdAt: 'asc' })
    .lean();

    const formattedMessages: FrontendMessage[] = dbMessages.map((msg: any) => ({
      _id: msg._id.toString(),
      sender: msg.from.toString(),
      receiver: msg.to.toString(),
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    }));

    return NextResponse.json(formattedMessages, { status: 200 });

  } catch (error) {
    console.error("Error fetching messages:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
