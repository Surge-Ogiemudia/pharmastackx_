
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/mongoConnect';
import Message from "@/models/Message";
import User from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function GET() {
  await dbConnect();
  const cookieStore = await cookies(); // Added await
  const sessionToken = cookieStore.get('session_token');

  if (!sessionToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = jwt.verify(sessionToken.value, JWT_SECRET) as { userId: string, role: string };
    const userId = payload.userId;

    if (payload.role !== 'pharmacist') {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const messages = await Message.find({ $or: [{ from: userId }, { to: userId }] })
      .sort({ createdAt: -1 })
      .populate('from', 'username profilePicture')
      .populate('to', 'username profilePicture');

    const conversations = messages.reduce((acc, msg) => {
      const otherUser = msg.from?._id?.toString() === userId ? msg.to : msg.from;

      if (otherUser && otherUser._id) {
        const otherUserId = otherUser._id.toString();
        if (!acc[otherUserId]) {
          acc[otherUserId] = {
            with: otherUser,
            lastMessage: msg,
          };
        }
      }
      return acc;
    }, {} as any);

    const conversationList = Object.values(conversations);
    return NextResponse.json(conversationList, { status: 200 });

  } catch (error) {
    console.error("Error fetching conversations:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
