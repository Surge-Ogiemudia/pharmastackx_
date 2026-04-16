import { NextRequest, NextResponse } from "next/server";
import Consultation from "@/models/Consultation";
import { dbConnect } from "@/lib/mongoConnect";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { consultationId } = await req.json();

    if (!consultationId) {
        return NextResponse.json({ error: "Missing consultationId" }, { status: 400 });
    }

    const consultation = await Consultation.findById(consultationId);
    if (!consultation || consultation.status !== 'escalated') {
        return NextResponse.json({ error: "Invalid consultation or not currently escalated" }, { status: 400 });
    }

    consultation.status = 'ai';
    consultation.messages.push({ sender: 'ai', text: 'I am back! How can I help you further?', timestamp: new Date() });
    
    // Reset AI move count to give the user a fresh session limit
    consultation.aiMoveCount = 0;
    
    await consultation.save();

    return NextResponse.json({ 
        status: 'ai',
        message: 'I am back! How can I help you further?' 
    });

  } catch (error: any) {
    console.error("Switch to AI Error:", error);
    return NextResponse.json({ error: "Failed to switch back to AI" }, { status: 500 });
  }
}
