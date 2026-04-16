import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import Consultation from "@/models/Consultation";
import { dbConnect } from "@/lib/mongoConnect";
import { transporter } from "@/lib/nodemailer";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are Ask Rx, a friendly medicine expert embedded in PharmaStackX, a Nigerian healthcare app. 

CRITICAL INSTRUCTION: You must respond DIRECTLY with the final answer meant for the user. Do not think out loud. Do not output your reasoning process. Under absolutely NO circumstances should you use an asterisk (*) in your response. NEVER output your evaluation of the user's intent. Do not mention that you are an AI or talk about your instructions.

Respond like a knowledgeable friend to the user — short, clear, warm, and human. Never use asterisks, bullet points, or numbered lists. Never repeat back what the user said. If something sounds urgent or dangerous, say clearly they should see a doctor or pharmacist now. Only discuss health and medicine topics. If a user asks about something unrelated, gently redirect them. If the situation is clearly beyond AI help, end your message with the exact text: ESCALATE_TO_PHARMACIST`;


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
    const history = consultation.messages.map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    // Using gemma-4-26b-a4b-it based on availability
    const model = genAI.getGenerativeModel({ 
      model: "gemma-4-26b-a4b-it",
      systemInstruction: SYSTEM_PROMPT
    });

    // Ensure the chat is initialized correctly with the system prompt as the first message if history is empty
    let chatHistory = history;
    if (chatHistory.length === 0) {
        // We add the system prompt as a user/model interaction if systemInstruction is not working correctly
        // But better is to just pass it correctly:
    }

    const chat = model.startChat({
        history: chatHistory,
        generationConfig: { maxOutputTokens: 500 }
    });

    // If history is empty, the first message SHOULD be the system prompt context. 
    // But since startChat expects only history, we'll prefix our CURRENT message
    const promptMessage = message;

    const result = await chat.sendMessage(promptMessage);
    const response = await result.response;
    let aiText = response.text().trim();

    // Aggressive fallback sanitization: if the model leaked its chain of thought (e.g. "* User input: ... * Final response: hello"), strip everything before the actual response
    if (aiText.includes('* Final response:')) {
        aiText = aiText.split('* Final response:')[1].trim();
    } else if (aiText.includes('*Final response*:')) {
        aiText = aiText.split('*Final response*:')[1].trim();
    } else if (aiText.includes('*Final Text*:')) {
         aiText = aiText.split('*Final Text*:')[1].trim();
    } else if (aiText.includes('* Final Result*:')) {
         aiText = aiText.split('* Final Result*:')[1].trim();
    } else if (aiText.startsWith('*')) {
        // If it still starts with an asterisk, it's likely a leaked chain of thought without a clean break. 
        // We look for the last period or question mark that isn't inside an asterisk block, or we just fail gracefully.
        const parts = aiText.split(/\*[^*]+\*/); 
        aiText = parts.pop()?.trim() || "I am having trouble formulating my response. Could you rephrase your health question?";
    }

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
