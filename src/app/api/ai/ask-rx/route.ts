import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import Consultation from "@/models/Consultation";
import AISettings from "@/models/AISettings";
import { dbConnect } from "@/lib/mongoConnect";
import { transporter } from "@/lib/nodemailer";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function sanitizeResponse(text: string): string {
  // If the model is leaking its chain of thought, we need to find the REAL answer.
  // We look for common "Final Answer" markers used by LLMs when they "think out loud".
  const markers = [
    /\*?\*?Final Response\*?\*?:\s*/i,
    /\*?\*?Final Result\*?\*?:\s*/i,
    /\*?\*?Final Text\*?\*?:\s*/i,
    /\*?\*?Selected Response\*?\*?:\s*/i,
    /\*?\*?Response\*?\*?:\s*/i,
    /\*?\*?Your reply\*?\*?:\s*/i
  ];

  let cleaned = text;

  for (const marker of markers) {
    if (marker.test(cleaned)) {
      const parts = cleaned.split(marker);
      cleaned = parts[parts.length - 1].trim();
      break;
    }
  }

  // If it still contains asterisks or seems like a meta-commentary, try to strip everything before the last quote
  if (cleaned.includes('*')) {
     const sections = cleaned.split(/\*[^*]+\*/);
     if (sections.length > 1) {
       cleaned = sections.pop()?.trim() || cleaned;
     }
  }

  // Final cleanup: remove residual metadata labels
  cleaned = cleaned.replace(/^User says:.*$/im, '')
                   .replace(/^Context:.*$/im, '')
                   .replace(/^Persona:.*$/im, '')
                   .replace(/^Constraint Check:.*$/im, '')
                   .replace(/^Drafting response:.*$/im, '')
                   .trim();
                   
  // Deduplication: if the model doubled the output (e.g. "Hello! Hello!")
  const mid = Math.floor(cleaned.length / 2);
  const firstHalf = cleaned.substring(0, mid).trim();
  const secondHalf = cleaned.substring(mid).trim();
  if (firstHalf === secondHalf && firstHalf.length > 5) {
      return firstHalf;
  }

  return cleaned || "I apologize, I'm having a technical glitch. How can I help with your medication questions?";
}


export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { message, userId, consultationId } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
        console.error("CRITICAL: GEMINI_API_KEY is missing from environment variables");
        return NextResponse.json({ error: "AI service is currently unconfigured. Please contact support." }, { status: 503 });
    }

    if (!message || !userId) {
        return NextResponse.json({ error: "Missing required fields: message or userId" }, { status: 400 });
    }

    let consultation;
    if (consultationId) {
      consultation = await Consultation.findById(consultationId);
    } else {
      // Find existing active AI consultation for this user or create new
      consultation = await Consultation.findOne({ userId, status: 'ai' }).sort({ createdAt: -1 });
      if (!consultation || consultation.status !== 'ai') {
        consultation = new Consultation({ userId, messages: [], status: 'ai', aiMoveCount: 0 });
      }
    }

    if (!consultation) {
        return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    // Check move count
    if (consultation.aiMoveCount >= 5 && consultation.status === 'ai') {
        consultation.status = 'pending_escalation';
        await consultation.save();
        return NextResponse.json({ 
            text: "If you would like to connect with a professional pharmacist please indicate or continue chatting with me (AI).", 
            status: 'pending_escalation' 
        });
    }

    // Prepare history for AI
    let baseHistory = consultation.messages.map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    // Fetch dynamic AI settings
    const settings = await AISettings.findOne();
    const systemPrompt = settings?.systemPrompt || `You are Ask Rx, a friendly medicine expert.\n\nSTRICT RULE: Only output the conversational reply. NEVER output labels. NEVER think out loud. No asterisks.\n\nIf a symptom sounds severe, include the text: ESCALATE_TO_PHARMACIST`;

    // Inject Golden Rules as few-shot examples if any exist
    let chatHistory = [...baseHistory];
    if (settings?.goldenRules && settings.goldenRules.length > 0) {
        const rulesHistory = [];
        for (const rule of settings.goldenRules) {
            rulesHistory.push({ role: 'user', parts: [{ text: rule.input }] });
            rulesHistory.push({ role: 'model', parts: [{ text: rule.output }] });
        }
        chatHistory = [...rulesHistory, ...chatHistory];
    }

    // Using gemma-4-26b-a4b-it based on availability
    const model = genAI.getGenerativeModel({ 
      model: "gemma-4-26b-a4b-it",
      systemInstruction: systemPrompt
    });

    const chat = model.startChat({
        history: chatHistory,
        generationConfig: { maxOutputTokens: 500 }
    });

    const promptMessage = message;

    const result = await chat.sendMessage(promptMessage);
    const response = await result.response;
    let aiText = sanitizeResponse(response.text().trim());

    const shouldEscalate = aiText.includes("ESCALATE_TO_PHARMACIST");
    if (shouldEscalate) {
        aiText = aiText.replace("ESCALATE_TO_PHARMACIST", "").trim();
        if (!aiText) aiText = "This case requires a professional review. Would you like me to connect you to our pharmacist right now?";
        consultation.status = 'pending_escalation';
    }

    // Save messages
    consultation.messages.push({ sender: 'user', text: message });
    consultation.messages.push({ sender: 'ai', text: aiText });
    consultation.aiMoveCount += 1;
    await consultation.save();

    return NextResponse.json({ 
        text: aiText, 
        consultationId: consultation._id,
        status: consultation.status 
    });

  } catch (error: any) {
    console.error("AI Consultation Error:", error);
    
    try {
        const settings = await AISettings.findOne();
        if (settings?.isAlertingEnabled && settings?.alertEmail) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: settings.alertEmail,
                subject: '🚨 URGENT: AI System Error / Fault in Ask Rx',
                html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2>AI Consultation Error Detected</h2>
                        <p>The system encountered a critical error while trying to process a user's health query.</p>
                        <p><strong>Error Details:</strong></p>
                        <pre style="background: #f4f4f4; padding: 10px; border-radius: 6px;">${error.message}</pre>
                    </div>
                `
            });
        }
    } catch (emailErr) {
        console.error("Failed to send AI fault alert:", emailErr);
    }

    return NextResponse.json({ 
        error: "Consultation failed: " + (error.message || "Unknown AI error"),
        details: error.stack 
    }, { status: 500 });
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
                    <p>A user has been escalated from the AI "Ask Rx" system and needs professional assistance.</p>
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
