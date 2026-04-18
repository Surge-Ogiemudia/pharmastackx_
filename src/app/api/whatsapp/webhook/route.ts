import { NextRequest, NextResponse } from "next/server";
import dns from "dns";
import { dbConnect } from "@/lib/mongoConnect";

// Force IPv4 resolution for outbound requests (fixes Vercel ETIMEDOUT / fetch failed)
dns.setDefaultResultOrder("ipv4first");

import WhatsAppRequest from "@/models/WhatsAppRequest";
import RequestModel from "@/models/Request";
import UserModel from "@/models/User";
import { classifyWhatsAppMessage, classifyWhatsAppImage } from "@/lib/whatsapp-classifier";
import { notifyPharmacists } from "@/lib/whatsapp-notifier";
import { GoogleGenerativeAI } from '@google/generative-ai';
import WhatsAppSession from '@/models/WhatsAppSession';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function parseQuoteReply(messageText: string): Promise<{ available: boolean; price: number | null }> {
    const model = genAI.getGenerativeModel({ model: 'gemma-4-26b-a4b-it' });
    const prompt = `Parse this WhatsApp reply from a pharmacy about medicine availability. Extract:
- available: true if they have it, false if not
- price: the total price in Naira as a number, or null if not available or not mentioned

Reply: "${messageText}"

Output ONLY valid JSON. No explanation. No markdown.
Format: {"available": true, "price": 3500}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return { available: false, price: null };
        return JSON.parse(jsonMatch[0]);
    } catch {
        return { available: false, price: null };
    }
}

async function handleQuoteReply(senderPhone: string, messageText: string) {
    // 1. Find the most recent active session for this phone
    // Normalize phone from Whapi (e.g. "2348157788101@s.whatsapp.net" -> "2348157788101")
    const phone = senderPhone.split('@')[0];

    const session = await WhatsAppSession.findOne({
        phone: phone,
        status: 'waiting',
        expiresAt: { $gt: new Date() }
    }).sort({ sentAt: -1 });

    if (!session) return; // No active session — ignore message

    const parsed = await parseQuoteReply(messageText);

    // Mark session as replied regardless of outcome
    session.status = 'replied';
    await session.save();

    if (!parsed.available) return; // Not available — no quote to add

    const request = await RequestModel.findById(session.requestId);
    if (!request || request.status === 'cancelled' || request.status === 'confirmed') return;

    // Build quote items from request items with the single price split evenly
    // (WhatsApp contacts give a total price, not per-item)
    const itemCount = request.items.length;
    const pricePerItem = parsed.price ? Math.round(parsed.price / itemCount) : 0;

    const quoteItems = request.items.map((item: any) => ({
        name: item.name,
        form: item.form,
        strength: item.strength,
        price: pricePerItem,
        isAvailable: true,
        pharmacyQuantity: item.quantity
    }));

    request.quotes.push({
        pharmacy: null,
        externalContact: {
            name: session.contactName,
            phone: session.phone
        },
        source: 'whatsapp',
        items: quoteItems,
        notes: `Quote received via WhatsApp. Total: ₦${parsed.price?.toLocaleString()}`,
        status: 'offered',
        quotedAt: new Date()
    });

    await request.save();

    // Notify patient via FCM
    try {
        const patient = await UserModel.findById(request.user).lean() as any;
        if (patient?.fcmTokens?.length > 0) {
            const admin = getFirebaseAdmin();
            await admin.messaging().sendEachForMulticast({
                notification: {
                    title: '💊 You have a new quote!',
                    body: `${session.contactName} has quoted ₦${parsed.price?.toLocaleString()} for your request.`
                },
                webpush: { fcmOptions: { link: `/my-requests/${request._id}` } },
                tokens: patient.fcmTokens
            } as any);
        }
    } catch (fcmErr) {
        console.error('[webhook] FCM notify failed:', fcmErr);
    }
}

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
        
        // 1. Establish DB Connection synchronously for reliable serverless execution
        // This is fast if a connection is cached.
        await dbConnect();

        // 2. Process all messages synchronously so Vercel doesn't suspend the function
        try {
            const FIVE_MINUTES_AGO = Math.floor(Date.now() / 1000) - 300;
            for (const msg of messages) {
                // 0. Ignore old backlogged messages
                if (msg.timestamp && msg.timestamp < FIVE_MINUTES_AGO) {
                    console.log(`⌛ Skipping backlogged message: ${msg.id}`);
                    continue;
                }

                // 1. Determine Message Type & Content
                let classification: any = null;
                let rawText = "";
                let isImage = false;
                let mediaBase64: string | null = null;

                if (msg.type === 'text') {
                    rawText = msg.text?.body || "";
                    // Cheap Regex Filter for text
                    if (!DRUG_KEYWORDS.test(rawText) || NOISE_KEYWORDS.test(rawText)) {
                        console.log("⏭️ Skipping non-drug message:", rawText.substring(0, 50));
                        // However, it could be a quote reply!
                        await handleQuoteReply(msg.from, rawText);
                        continue;
                    }

                    // Before classification, check if it's a quote reply for an active session
                    await handleQuoteReply(msg.from, rawText);
                } else if (msg.type === 'image' || (msg.type === 'document' && msg.document?.mime_type?.startsWith('image/'))) {
                    isImage = true;
                    const mediaId = msg.image?.id || msg.document?.id;
                    if (mediaId && process.env.WHAPI_TOKEN) {
                        try {
                            console.log(`📸 Fetching media from Whapi: ${mediaId}`);
                            const mediaRes = await fetch(`https://gate.whapi.cloud/media/${mediaId}`, {
                                headers: { 'Authorization': `Bearer ${process.env.WHAPI_TOKEN}` }
                            });
                            if (mediaRes.ok) {
                                const buffer = await mediaRes.arrayBuffer();
                                mediaBase64 = Buffer.from(buffer).toString('base64');
                            }
                        } catch (err) {
                            console.error("❌ Failed to fetch Whapi media:", err);
                        }
                    }
                } else {
                    continue; // Skip other types (audio, video, etc.)
                }

                // 2. Extract Group Name via Whapi API if not in payload
                let chatName = payload.chat_name || "WhatsApp Group";
                if (!payload.chat_name && msg.chat_id && msg.chat_id.endsWith('@g.us')) {
                    try {
                        const whapiToken = process.env.WHAPI_TOKEN;
                        if (whapiToken) {
                            const chatRes = await fetch(`https://gate.whapi.cloud/chats/${msg.chat_id}`, {
                                headers: { 'Authorization': `Bearer ${whapiToken}`, 'Accept': 'application/json' }
                            });
                            if (chatRes.ok) {
                                const chatData = await chatRes.json();
                                chatName = chatData.name || chatName;
                            }
                        }
                    } catch (err) {
                        console.error("⚠️ Failed to fetch group name from Whapi:", err);
                    }
                }

                // 3. AI Classification
                if (isImage && mediaBase64) {
                    console.log(`🤖 Classifying prescription image in: ${chatName}...`);
                    classification = await classifyWhatsAppImage(mediaBase64, chatName);
                } else if (!isImage && rawText) {
                    console.log(`🤖 Classifying potential drug request in: ${chatName}...`);
                    classification = await classifyWhatsAppMessage(rawText, chatName);
                }

                if (classification?.isDrugRequest && classification.confidence > 0.6) {
                    console.log("✅ Verified Request. Saving to DB...");
                    
                    // 4. Create/Find WhatsApp System User
                    let botUser = await UserModel.findOne({ username: 'whatsapp_bot' });
                    if (!botUser) {
                        botUser = await UserModel.create({
                            username: 'whatsapp_bot',
                            email: 'whatsapp@pharmastackx.com',
                            password: 'system_bot_password_123', // Internal use
                            role: 'customer',
                            name: 'WhatsApp Automated Bot'
                        });
                    }

                    // 5. Save to Main Platform Requests (Integration)
                    const platformRequest = await RequestModel.create({
                        user: botUser._id,
                        phoneNumber: msg.from || "WhatsApp",
                        state: classification.location || "National",
                        requestType: isImage ? 'prescription' : 'drug-list',
                        items: (classification.medicines || []).map((m: any) => ({
                            name: m.name,
                            strength: m.strength,
                            form: m.form,
                            quantity: m.quantity || 1
                        })),
                        status: 'pending',
                        notes: `[WHAPI AUTOMATED] From Group: ${chatName}\nRaw: ${rawText || '[IMAGE/DOCUMENT]'}`,
                        prescriptionImage: isImage ? `data:image/jpeg;base64,${mediaBase64}` : null
                    });

                    // 6. Save to WhatsApp Tracking DB
                    const newRequest = await WhatsAppRequest.create({
                        source: 'whatsapp_group',
                        groupId: msg.chat_id,
                        groupName: chatName,
                        rawText: rawText || "[Prescription Image]",
                        medicines: classification.medicines,
                        location: classification.location || "National",
                        urgency: classification.urgency || "normal",
                        confidence: classification.confidence,
                        status: 'open',
                        platform_request_id: platformRequest._id, // Back-link
                        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours expiry
                    });

                    // 7. Trigger Notifications
                    await notifyPharmacists(newRequest);
                }
            }
        } catch (err) {
            console.error("🔥 Webhook Synchronous Processing Error:", err);
            // We log the error but still return 200 below so Whapi doesn't infinitely retry bad messages
        }

        // 3. Return 200 OK *AFTER* processing finishes
        return NextResponse.json({ status: "received", count: messages.length }, { status: 200 });

    } catch (error) {
    console.error("🔥 Webhook Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
}
