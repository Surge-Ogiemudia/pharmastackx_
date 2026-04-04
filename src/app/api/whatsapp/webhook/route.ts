import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoConnect";
import WhatsAppRequest from "@/models/WhatsAppRequest";
import { classifyWhatsAppMessage } from "@/lib/whatsapp-classifier";
import { notifyPharmacists } from "@/lib/whatsapp-notifier";

// Keyword filter to save AI costs (regex)
const DRUG_KEYWORDS = /drug search|who has|looking for|urgently needed|in need of|needed|available|where can i get|pls who has|anybody has|who get|searching for|qty|strength|location:|loc:/i;
const NOISE_KEYWORDS = /meeting|lecture|dues|election|football|chelsea|arsenal|politics/i;

console.log("🚀 [Whapi Webhook] Route Initialized");

// Deployment Trace: Clean Build 2026-04-04
export async function POST(req: NextRequest) {
    console.log("📥 [Whapi Webhook] POST request received");
    try {
    let payload: any;
    try {
        payload = await req.json();
    } catch (e) {
        const raw = await req.text();
        console.error("❌ JSON Parse Failed. Raw Body:", raw);
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
        
        // Whapi sends messages in messages array
        const messages = payload.messages || [];
        
        // Immediate 200 OK to prevent Whapi timeout
        const response = NextResponse.json({ status: "received" }, { status: 200 });

        // Process in background (detach from response)
        (async () => {
            try {
                if (!process.env.MONGO_URI) {
                    console.error("❌ MONGO_URI is missing in Vercel Environment Variables");
                    return;
                }
                await dbConnect();
                
                for (const msg of messages) {
                // 1. Only process text messages
                if (msg.type !== 'text') continue;
                
                const rawText = msg.text?.body || "";
                
                // 2. Cheap Regex Filter
                if (!DRUG_KEYWORDS.test(rawText) || NOISE_KEYWORDS.test(rawText)) {
                    console.log("⏭️ Skipping non-drug message:", rawText.substring(0, 50));
                    continue;
                }

                console.log("🤖 Classifying potential drug request...");
                
                // 3. AI Classification (Gemini 2.5 Flash)
                const classification = await classifyWhatsAppMessage(rawText);
                
                if (classification.isDrugRequest && classification.confidence > 0.6) {
                    console.log("✅ Verified Drug Request. Saving to DB...");
                    
                    // 4. Save to MongoDB
                    const newRequest = await WhatsAppRequest.create({
                        source: 'whatsapp_group',
                        groupId: msg.chat_id,
                        groupName: payload.chat_name || "WhatsApp Group",
                        rawText: rawText,
                        medicines: classification.medicines,
                        location: classification.location || "National",
                        urgency: classification.urgency || "normal",
                        confidence: classification.confidence,
                        status: 'open',
                        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours expiry
                    });

                    // 5. Trigger Notifications
                    await notifyPharmacists(newRequest);
                }
            }
        } catch (err) {
            console.error("🔥 Webhook Background Processing Error:", err);
        }
    })().catch(err => {
        console.error("🔥 Webhook Uncaught Background Error:", err);
    });

    return response;

} catch (error) {
    console.error("🔥 Webhook Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
}
