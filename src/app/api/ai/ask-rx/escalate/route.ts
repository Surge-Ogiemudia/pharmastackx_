import { NextRequest, NextResponse } from "next/server";
import Consultation from "@/models/Consultation";
import { dbConnect } from "@/lib/mongoConnect";
import { transporter } from "@/lib/nodemailer";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { consultationId, consent } = await req.json();

    if (!consultationId) {
        return NextResponse.json({ error: "Missing consultationId" }, { status: 400 });
    }

    const consultation = await Consultation.findById(consultationId);
    if (!consultation || consultation.status !== 'pending_escalation') {
        return NextResponse.json({ error: "Invalid consultation or not pending escalation" }, { status: 400 });
    }

    if (consent) {
        consultation.status = 'escalated';
        consultation.messages.push({ sender: 'ai', text: 'I have notified the pharmacist. They will join this chat shortly.', timestamp: new Date() });
        await consultation.save();
        await sendEscalationEmail(consultation._id);
        
        return NextResponse.json({ 
            status: 'escalated',
            message: 'I have notified the pharmacist. They will join this chat shortly.' 
        });
    } else {
        consultation.status = 'ai';
        consultation.aiMoveCount = 0; // reset counter so they can keep chatting
        consultation.messages.push({ sender: 'ai', text: 'Alright! Let me know if you have any other questions.', timestamp: new Date() });
        await consultation.save();

        return NextResponse.json({ 
            status: 'ai',
            message: 'Alright! Let me know if you have any other questions.' 
        });
    }

  } catch (error: any) {
    console.error("Escalation Error:", error);
    return NextResponse.json({ error: "Escalation failed" }, { status: 500 });
  }
}

async function sendEscalationEmail(id: string) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'pogiemudia@gmail.com',
            subject: '🚨 URGENT: Pharmacist Consultation Needed',
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>New Escalated Consultation</h2>
                    <p>A user has agreed to escalate their session and needs professional assistance.</p>
                    <p><strong>Consultation ID:</strong> ${id}</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/account?view=consultations" 
                       style="background: #0F6E56; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; display: inline-block;">
                       Respond Now
                    </a>
                </div>
            `
        });
    } catch (e) {
        console.error("Failed to send escalation email:", e);
    }
}
