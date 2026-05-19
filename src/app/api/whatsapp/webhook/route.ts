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
import DeliverySession from '@/models/DeliverySession';
import DmConversation from '@/models/DmConversation';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { sendWhatsAppMessage } from '@/lib/whapi';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function parseQuoteRegex(text: string): Promise<{ available: boolean; price: number | null } | null> {
    const cleanText = text.trim().toUpperCase();
    
    // Check for "NOT AVAILABLE" / "NA" etc
    if (cleanText.includes("NOT AVAILABLE") || cleanText.includes("UNAVAILABLE") || cleanText === "X" || cleanText === "NO") {
        return { available: false, price: null };
    }

    // Match patterns like "AVAILABLE 5000", "AVAILABLE 5,000", "AVAILABLE N5000"
    const availMatch = cleanText.match(/AVAILABLE\s*(?:N|₦)?\s*([\d,]+)/i);
    if (availMatch) {
        const price = parseInt(availMatch[1].replace(/,/g, ''));
        if (!isNaN(price)) return { available: true, price };
    }

    // Fallback match for just a number if the message is only a number
    if (/^\d+$/.test(cleanText.replace(/,/g, ''))) {
        const price = parseInt(cleanText.replace(/,/g, ''));
        return { available: true, price };
    }

    return null; // No clear regex match, move to AI
}

async function parseQuoteReply(messageText: string): Promise<{ available: boolean; price: number | null }> {
    console.log(`🤖 Attempting AI Parsing for: "${messageText}"`);
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
        if (!jsonMatch) {
            console.error("❌ AI Parsing failed: No JSON found in response");
            return { available: false, price: null };
        }
        const parsed = JSON.parse(jsonMatch[0]);
        console.log("✅ AI Parsing successful:", parsed);
        return parsed;
    } catch (err: any) {
        console.error("❌ AI Parsing Error:", err.message);
        return { available: false, price: null };
    }
}

export async function handleQuoteReply(senderPhone: string, messageText: string) {
    console.log(`💬 Processing potentially a quote reply from ${senderPhone}: "${messageText}"`);
    // 1. Find the most recent active session for this phone
    // Normalize phone from Whapi (e.g. "2348157788101@s.whatsapp.net" -> "2348157788101")
    const phone = senderPhone.split('@')[0];
    console.log(`📱 Normalized phone: ${phone}`);

    const session = await WhatsAppSession.findOne({
        phone: phone,
        status: 'waiting',
        expiresAt: { $gt: new Date() }
    }).sort({ sentAt: -1 });

    if (!session) {
        console.log(`⏭️ No active session found for ${phone}. Ignoring message.`);
        return; 
    }

    console.log(`✅ Session found! RequestId: ${session.requestId}, Contact: ${session.contactName}`);

    // Try Regex First (Fast, 0 Cost)
    let parsed = await parseQuoteRegex(messageText);
    if (parsed) {
        console.log("⚡ Regex Match successful:", parsed);
    } else {
        // Fallback to AI
        parsed = await parseQuoteReply(messageText);
    }

    // Mark session as replied regardless of outcome
    session.status = 'replied';
    await session.save();
    console.log(`🔄 Session status updated to 'replied'`);

    if (!parsed.available) {
        console.log("🚫 Quote marked as not available. Skipping insertion.");
        return; 
    }

    const request = await RequestModel.findById(session.requestId);
    if (!request) {
        console.error(`❌ Request ${session.requestId} not found in DB!`);
        return;
    }
    
    if (request.status === 'cancelled' || request.status === 'confirmed') {
        console.log(`⏭️ Request status is ${request.status}. Skipping quote.`);
        return;
    }

    console.log(`📝 Inserting quote into request ${request._id}...`);

    // Build quote items from request items with the single price split evenly
    const itemCount = request.items.length;
    const pricePerItem = (parsed.price && itemCount > 0) ? Math.round(parsed.price / itemCount) : 0;

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
    console.log("🎯 Quote successfully added to request!");

    // Notify patient via FCM
    try {
        const patient = await UserModel.findById(request.user).lean() as any;
        if (patient?.fcmTokens?.length > 0) {
            console.log(`🔔 Notifying patient (${patient.username}) via FCM...`);
            const admin = getFirebaseAdmin();
            await admin.messaging().sendEachForMulticast({
                notification: {
                    title: '💊 You have a new quote!',
                    body: `${session.contactName} has quoted ₦${parsed.price?.toLocaleString()} for your request.`
                },
                webpush: { fcmOptions: { link: `/my-requests/${request._id}` } },
                tokens: patient.fcmTokens
            } as any);
        } else {
            console.log("🔕 Patient has no registered FCM tokens. Skipping FCM.");
        }
    } catch (fcmErr: any) {
        console.error('[webhook] FCM notify failed:', fcmErr.message);
    }

    // Notify patient via WhatsApp if request has a valid phone number (e.g. from WhatsApp group or DM)
    try {
        const patientPhone = request.phoneNumber;
        if (patientPhone && patientPhone !== 'WhatsApp' && /^\+?\d+/.test(patientPhone.replace(/\s+/g, ''))) {
            const targetJid = patientPhone.includes('@') ? patientPhone : `${patientPhone.replace(/[\+\s]/g, '')}@s.whatsapp.net`;
            
            const medicineNames = request.items.map((i: any) => i.name).join(', ');
            const paystackLink = process.env.PAYSTACK_PAYMENT_URL || 'https://paystack.com/pay/pharmastackx';
            
            const patientMessage = 
                `💊 *PharmaStackX Update*\n\n` +
                `Good news! Your medicine request for *${medicineNames}* is available! 🥳\n\n` +
                `💰 *Price:* ₦${parsed.price?.toLocaleString()}\n\n` +
                `💳 *Pay Here:* ${paystackLink}\n\n` +
                `Once you've made the payment, please reply *DONE* to this chat or upload a screenshot of your payment receipt. Thank you! 🙏`;

            const DmConversation = (await import('@/models/DmConversation')).default;
            const cleanPhoneOnly = targetJid.split('@')[0];
            await DmConversation.findOneAndUpdate(
                { phone: cleanPhoneOnly },
                {
                    step: 'awaiting_payment',
                    requestId: request._id,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours to pay
                },
                { upsert: true, new: true }
            );
            console.log(`💾 Patient DmConversation updated to 'awaiting_payment' for request ${request._id}`);

            try {
                console.log(`✉️ Sending WhatsApp payment instructions to patient: ${targetJid}`);
                await sendWhatsAppMessage(targetJid, patientMessage);
            } catch (apiErr: any) {
                console.error(`[webhook] Failed to send WhatsApp message to patient ${targetJid}:`, apiErr.message);
            }
        } else {
            console.log(`ℹ️ Request phone number (${patientPhone}) is not a valid WhatsApp patient. Skipping WhatsApp notify.`);
        }
    } catch (waErr: any) {
        console.error('[webhook] Patient WhatsApp notify failed:', waErr.message);
    }
}

async function handleDeliveryReply(senderPhone: string, incomingText: string) {
    const phone = senderPhone.split('@')[0];
    const deliverySession = await DeliverySession.findOne({
        phone: phone,
        status: 'waiting',
        expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!deliverySession) return false; // Not a delivery agent reply

    const replyUpper = incomingText.trim().toUpperCase();
    const googleMapsLink = (coords: [number, number]) => `https://maps.google.com/?q=${coords[1]},${coords[0]}`;

    if (replyUpper === 'ACCEPT') {
        deliverySession.status = 'accepted';
        await deliverySession.save();

        await RequestModel.findByIdAndUpdate(deliverySession.requestId, {
            'delivery.agentName': deliverySession.agentName,
            'delivery.agentPhone': deliverySession.phone,
            'delivery.status': 'assigned',
            'delivery.assignedAt': new Date(),
        });

        // Confirm to agent
        await sendWhatsAppMessage(deliverySession.phone, 
            `✅ Delivery confirmed! Please proceed to pickup.\n\n` +
            `📦 Pickup: ${deliverySession.pickupAddress}\n` +
            `🗺️ ${googleMapsLink(deliverySession.pickupCoords)}\n` +
            `📞 Call pharmacist: ${deliverySession.pharmacistPhone}\n\n` +
            `🏠 Dropoff: ${deliverySession.dropoffAddress}\n` +
            `🗺️ ${googleMapsLink(deliverySession.dropoffCoords)}\n` +
            `📞 Call patient: ${deliverySession.patientPhone}\n\n` +
            `Thank you! 🙏`
        );

        // Expire others
        await DeliverySession.updateMany(
            { orderId: deliverySession.orderId, status: 'waiting', _id: { $ne: deliverySession._id } },
            { $set: { status: 'expired' } }
        );
        return true;
    }

    if (replyUpper === 'DECLINE') {
        deliverySession.status = 'declined';
        await deliverySession.save();
        await sendWhatsAppMessage(deliverySession.phone, `Okay, no worries! We'll find another agent. 👍`);
        return true;
    }

    // fallback
    await sendWhatsAppMessage(deliverySession.phone, `Reply *ACCEPT* to take the delivery or *DECLINE* to pass.`);
    return true;
}

export async function handlePatientPaymentReply(msg: any, session: any) {
    const phone = msg.from.split('@')[0];
    const replyTo = msg.from.includes('@') ? msg.from : `${phone}@s.whatsapp.net`;
    const isImage = msg.type === 'image' || (msg.type === 'document' && msg.document?.mime_type?.startsWith('image/'));
    const textBody = (msg.text?.body || "").trim().toUpperCase();

    // Check if the reply is a text confirmation like "DONE" or an image receipt
    const isConfirmed = textBody === 'DONE' || isImage;

    if (!isConfirmed) {
        // If they replied with something else, gently nudge them
        await sendWhatsAppMessage(replyTo, 
            `We are awaiting your payment confirmation. Please reply with *DONE* or upload a screenshot of your payment receipt once you've completed the payment. 🙏`
        ).catch(() => {});
        return;
    }

    try {
        console.log(`💳 [Payment Confirmation] Received from patient ${phone} for request ${session.requestId}`);

        const RequestModel = (await import('@/models/Request')).default;
        const request = await RequestModel.findById(session.requestId);
        if (!request) {
            console.error(`❌ Request ${session.requestId} not found during payment confirmation!`);
            return;
        }

        // Find the accepted quote, or accept the most recent offered quote
        let quoteToAccept = request.quotes.find((q: any) => q.status === 'accepted');
        if (!quoteToAccept) {
            quoteToAccept = request.quotes.find((q: any) => q.status === 'offered');
            if (quoteToAccept) {
                quoteToAccept.status = 'accepted';
            }
        }

        request.status = 'awaiting-confirmation';
        await request.save();

        // Mark the patient session as complete
        session.step = 'complete';
        await session.save();

        // Send Confirmation reply to Patient
        await sendWhatsAppMessage(replyTo,
            `✅ *Payment Received!*\n\nThank you! We've received your payment confirmation. We are verifying it now and notifying the pharmacy to hold your medicine. We will update you shortly! 🙏`
        );

        // Notify the Quoting Pharmacist
        if (quoteToAccept && quoteToAccept.externalContact?.phone) {
            const pharmacistJid = quoteToAccept.externalContact.phone.includes('@') 
                ? quoteToAccept.externalContact.phone 
                : `${quoteToAccept.externalContact.phone.replace(/[\+\s]/g, '')}@s.whatsapp.net`;
            
            const medicineNames = request.items.map((i: any) => i.name).join(', ');
            const pharmacistMessage = 
                `📦 *PharmaStackX Order Alert*\n\n` +
                `Good news! The patient has completed payment for *${medicineNames}*.\n\n` +
                `🔒 Please *HOLD* the medicine. We are preparing the payout transfer to your account now. Thank you! 🙏`;

            console.log(`✉️ Notifying pharmacist to hold: ${pharmacistJid}`);
            await sendWhatsAppMessage(pharmacistJid, pharmacistMessage).catch(err => {
                console.error(`[webhook] Failed to notify pharmacist ${pharmacistJid}:`, err.message);
            });
        }

        // Notify Admin
        const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
        if (adminPhone) {
            const adminJid = adminPhone.includes('@') ? adminPhone : `${adminPhone.replace(/[\+\s]/g, '')}@s.whatsapp.net`;
            const medicineNames = request.items.map((i: any) => i.name).join(', ');
            const price = quoteToAccept ? quoteToAccept.items.reduce((acc: number, item: any) => acc + (item.price || 0) * (item.pharmacyQuantity || 1), 0) : 0;
            
            const adminMessage = 
                `💳 *Payment Alert (WhatsApp)*\n\n` +
                `Patient *${phone}* has uploaded payment confirmation for:\n` +
                `💊 *Items:* ${medicineNames}\n` +
                `💰 *Total Price:* ₦${price.toLocaleString()}\n` +
                `🔗 *Request ID:* ${request._id}\n\n` +
                `Please verify the transaction on Paystack/Dashboard and proceed to dispatch delivery agents.`;

            console.log(`✉️ Notifying admin of payment: ${adminJid}`);
            await sendWhatsAppMessage(adminJid, adminMessage).catch(err => {
                console.error(`[webhook] Failed to notify admin ${adminJid}:`, err.message);
            });
        }
    } catch (err: any) {
        console.error('[webhook] handlePatientPaymentReply error:', err.message);
        await sendWhatsAppMessage(replyTo, 
            `Sorry, we encountered an error while processing your payment confirmation. Please try again or contact support. 🙏`
        ).catch(() => {});
    }
}

// ── Private DM conversation handler ─────────────────────────────────────────

const NIGERIAN_STATES = [
  'abia','adamawa','akwa ibom','anambra','bauchi','bayelsa','benue','borno',
  'cross river','delta','ebonyi','edo','ekiti','enugu','fct','abuja','gombe',
  'imo','jigawa','kaduna','kano','katsina','kebbi','kogi','kwara','lagos',
  'nasarawa','niger','ogun','ondo','osun','oyo','plateau','rivers','sokoto',
  'taraba','yobe','zamfara',
];

// Major Nigerian cities that don't share a name with their state
const CITY_TO_STATE: Record<string, string> = {
  'port harcourt': 'Rivers', 'ph': 'Rivers',
  'benin city': 'Edo',
  'uyo': 'Akwa Ibom',
  'owerri': 'Imo',
  'calabar': 'Cross River',
  'makurdi': 'Benue',
  'awka': 'Anambra',
  'ibadan': 'Oyo',
  'abeokuta': 'Ogun',
  'ilorin': 'Kwara',
  'minna': 'Niger',
  'gusau': 'Zamfara',
  'jalingo': 'Taraba',
  'damaturu': 'Yobe',
  'dutse': 'Jigawa',
  'lafia': 'Nasarawa',
  'lokoja': 'Kogi',
  'abakaliki': 'Ebonyi',
  'asaba': 'Delta',
  'yenagoa': 'Bayelsa',
  'umuahia': 'Abia',
  'maiduguri': 'Borno',
  'sokoto city': 'Sokoto',
  'katsina city': 'Katsina',
};

export function extractState(text: string): string | null {
  const lower = text.toLowerCase().replace(/\bstate\b/g, '').trim();

  // Match state names; allow hyphens between words (e.g. "Akwa-Ibom")
  for (const s of NIGERIAN_STATES) {
    const escaped = s.replace(/\s+/g, '[\\s\\-]+');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(lower)) {
      return s === 'fct' || s === 'abuja' ? 'FCT - Abuja' :
        s.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    }
  }

  // Fall back to city → state lookup
  for (const [city, state] of Object.entries(CITY_TO_STATE)) {
    const escaped = city.replace(/\s+/g, '[\\s\\-]+');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(lower)) return state;
  }

  return null;
}

// AI-assisted state extraction when regex can't match (e.g. unusual group name formats)
async function extractStateFromGroupName(groupName: string): Promise<string | null> {
  try {
    const m = genAI.getGenerativeModel({ model: 'gemma-4-26b-a4b-it' });
    const result = await m.generateContent(
      `Which Nigerian state does this WhatsApp group belong to?\nGroup name: "${groupName}"\n\nOutput ONLY the Nigerian state name (e.g. Lagos, Rivers, Borno) or the word null. No explanation.`
    );
    const raw = result.response.text().trim().replace(/['"]/g, '');
    if (!raw || raw.toLowerCase() === 'null') return null;
    // Validate the AI output is actually a recognisable state
    return extractState(raw) || null;
  } catch {
    return null;
  }
}

async function handlePrivateDm(senderPhone: string, text: string) {
  const phone = senderPhone.split('@')[0];
  const replyTo = `${phone}@s.whatsapp.net`;
  const lowerText = text.toLowerCase().trim();

  // 1. Check if they're continuing an existing conversation (awaiting_state)
  const existing = await DmConversation.findOne({
    phone,
    step: 'awaiting_state',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (existing) {
    const state = extractState(text);
    if (!state) {
      await sendWhatsAppMessage(replyTo,
        `📍 I didn't catch that state. Please reply with just your state name.\n\nE.g. *Lagos*, *Abuja*, *Rivers*, *Kano*`
      );
      return;
    }

    // State received — create the platform request and notify
    await finaliseDmRequest(phone, existing.medicines, state, existing.rawText || text);
    existing.step = 'complete';
    await existing.save();
    return;
  }

  // 2. New message — classify it
  const classification = await classifyWhatsAppMessage(text, 'Private DM');
  if (!classification?.isDrugRequest || classification.confidence < 0.55) {
    // Not a drug request — send friendly help
    await sendWhatsAppMessage(replyTo,
      `👋 Hi! I'm *PharmaStackX*.\n\nTell me which medicine you're looking for and we'll connect you with pharmacists near you.\n\nE.g. _I need Amoxicillin 500mg, 2 packs_`
    );
    return;
  }

  const medicines: any[] = (classification.medicines || []).map((m: any) => ({
    name: m.name,
    strength: m.strength || '',
    form: m.form || 'Tablet',
    quantity: m.quantity || 1,
  }));

  if (!medicines.length) {
    await sendWhatsAppMessage(replyTo,
      `👋 Hi! I'd love to help.\n\nCould you please tell me:\n1️⃣ The *medicine name*\n2️⃣ The *quantity* you need\n3️⃣ Your *state*\n\nE.g. _Paracetamol 500mg x3, Lagos_`
    );
    return;
  }

  const state = extractState(classification.location || text);

  if (!state) {
    // Save session and ask for state
    await DmConversation.create({
      phone,
      step: 'awaiting_state',
      medicines,
      rawText: text,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const medList = medicines.map((m: any) =>
      `• ${m.name}${m.strength ? ` ${m.strength}` : ''} x${m.quantity}`
    ).join('\n');

    await sendWhatsAppMessage(replyTo,
      `Got it! I found your request:\n${medList}\n\n📍 Which *state* are you in? This helps us find the nearest pharmacists.\n\nE.g. *Lagos*, *Abuja*, *Rivers*`
    );
    return;
  }

  // We have everything — create request immediately
  await finaliseDmRequest(phone, medicines, state, text);
}

async function finaliseDmRequest(phone: string, medicines: any[], state: string, rawText: string) {
  const replyTo = `${phone}@s.whatsapp.net`;

  try {
    // Get or create the bot user
    let botUser = await UserModel.findOne({ username: 'whatsapp_bot' });
    if (!botUser) {
      botUser = await UserModel.create({
        username: 'whatsapp_bot',
        email: 'whatsapp@pharmastackx.com',
        password: 'system_bot_password_123',
        role: 'customer',
        name: 'WhatsApp Automated Bot',
      });
    }

    const platformRequest = await RequestModel.create({
      user: botUser._id,
      phoneNumber: phone,
      state,
      requestType: 'drug-list',
      items: medicines,
      status: 'pending',
      notes: `[WHAPI AUTOMATED] Private DM\nRaw: ${rawText}`,
    });

    // Notify pharmacists + top contacts (reuse the same flow as groups)
    const waRequest = await WhatsAppRequest.create({
      source: 'whatsapp_dm',
      groupId: `dm_${phone}`,
      groupName: 'Private DM',
      rawText,
      medicines,
      location: state,
      urgency: 'normal',
      confidence: 0.95,
      status: 'open',
      platform_request_id: platformRequest._id,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });

    await notifyPharmacists(waRequest);

    // Confirm to the user
    const medList = medicines.map((m: any) =>
      `• ${m.name}${m.strength ? ` ${m.strength}` : ''} x${m.quantity}`
    ).join('\n');

    await sendWhatsAppMessage(replyTo,
      `✅ *Request received!*\n\nWe're searching for:\n${medList}\n\n📍 *State:* ${state}\n\nPharmacists in your area have been notified. You'll receive a reply here shortly with pricing and availability. 🙏\n\n_PharmaStackX — Your health, our priority._`
    );
  } catch (err: any) {
    console.error('[DM] finaliseDmRequest error:', err?.message);
    await sendWhatsAppMessage(replyTo,
      `Sorry, something went wrong on our end. Please try again in a moment. 🙏`
    ).catch(() => {});
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
            const TWO_MIN_AGO = new Date(Date.now() - 2 * 60 * 1000);

            // ── Build group name map from chats_updates ──────────────────────────
            // Whapi embeds the group name in chats_updates.after_update.name.
            // The /chats and /groups API endpoints return 402 on the current plan,
            // so this is the only reliable source of group names.
            const groupNameMap: Record<string, string> = {};
            for (const update of (payload.chats_updates || [])) {
                const chatId = update.after_update?.id;
                const name   = update.after_update?.name;
                if (chatId && name && chatId.endsWith('@g.us')) {
                    groupNameMap[chatId] = name;
                    console.log(`📋 [chats_updates] Group name: "${name}" (${chatId})`);
                }
            }

            // ── Process drug requests from chats_updates directly ────────────────
            // When Whapi sends chats_updates and messages as separate HTTP calls,
            // whichever arrives first will own the processing. Dedup prevents double.
            for (const update of (payload.chats_updates || [])) {
                try {
                    const lastMsg   = update.after_update?.last_message;
                    const groupName = update.after_update?.name;
                    if (!lastMsg || !groupName || lastMsg.from_me || lastMsg.type !== 'text') continue;
                    if (!lastMsg.chat_id?.endsWith('@g.us')) continue;
                    if (lastMsg.timestamp && lastMsg.timestamp < FIVE_MINUTES_AGO) continue;

                    const msgText = lastMsg.text?.body || '';
                    if (!msgText || !DRUG_KEYWORDS.test(msgText) || NOISE_KEYWORDS.test(msgText)) continue;

                    // Dedup: if messages already created this request, correct its state instead of skipping.
                    // messages arrives before chats_updates so it saves with state "National" (no group name yet).
                    // chats_updates has the group name, so we patch the state and re-notify.
                    const dup = await WhatsAppRequest.findOne({ groupId: lastMsg.chat_id, rawText: msgText, createdAt: { $gt: TWO_MIN_AGO } });
                    if (dup) {
                        if (dup.location === 'National' && state && state !== 'National') {
                            dup.location = state;
                            dup.groupName = groupName;
                            await dup.save();
                            await RequestModel.findByIdAndUpdate(dup.platform_request_id, { state });
                            console.log(`🔄 [chats_updates] Patched state "National" → "${state}", notifying pharmacists`);
                            await notifyPharmacists(dup);
                        } else {
                            console.log(`⏭️ [chats_updates] Duplicate already has state "${dup.location}", skipping`);
                        }
                        continue;
                    }

                    console.log(`🤖 [chats_updates] Classifying drug request in: ${groupName}`);
                    const cls = await classifyWhatsAppMessage(msgText, groupName);
                    if (!cls?.isDrugRequest || cls.confidence <= 0.6) continue;

                    let botUser = await UserModel.findOne({ username: 'whatsapp_bot' });
                    if (!botUser) botUser = await UserModel.create({ username: 'whatsapp_bot', email: 'whatsapp@pharmastackx.com', password: 'system_bot_password_123', role: 'customer', name: 'WhatsApp Automated Bot' });

                    let state = extractState(cls.location || '') || extractState(groupName);
                    if (!state) { state = await extractStateFromGroupName(groupName); if (state) console.log(`🗺️ AI state from group "${groupName}" → ${state}`); }
                    state = state || 'National';

                    const pr = await RequestModel.create({
                        user: botUser._id, phoneNumber: lastMsg.from || 'WhatsApp', state,
                        requestType: 'drug-list',
                        items: (cls.medicines || []).map((m: any) => ({ name: m.name, strength: m.strength, form: m.form, quantity: m.quantity || 1 })),
                        status: 'pending',
                        notes: `[WHAPI AUTOMATED] From Group: ${groupName}\nRaw: ${msgText}`,
                    });
                    const waReq = await WhatsAppRequest.create({
                        source: 'whatsapp_group', groupId: lastMsg.chat_id, groupName, rawText: msgText,
                        medicines: cls.medicines, location: state, urgency: cls.urgency || 'normal',
                        confidence: cls.confidence, status: 'open', platform_request_id: pr._id,
                        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
                    });
                    console.log(`✅ [chats_updates] Saved: ${cls.medicines?.[0]?.name} in ${state}`);
                    await notifyPharmacists(waReq);
                } catch (err: any) {
                    console.error('[chats_updates] Error processing update:', err.message);
                }
            }

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

                // Skip messages sent by our own number
                if (msg.from_me) continue;

                // Private DM — handle conversationally, skip group flow
                const isDm = msg.chat_id && !msg.chat_id.endsWith('@g.us');
                if (isDm) {
                    const phone = msg.from.split('@')[0];
                    rawText = msg.text?.body || "";

                    // A. Check if patient is in payment confirmation step
                    const DmConversation = (await import('@/models/DmConversation')).default;
                    const paymentSession = await DmConversation.findOne({ phone, step: 'awaiting_payment' });
                    if (paymentSession) {
                        await handlePatientPaymentReply(msg, paymentSession);
                        continue;
                    }

                    // Only handle conversational text/onboarding if msg.type is text
                    if (msg.type === 'text') {
                        console.log(`📩 [DM] from ${msg.from}: ${rawText.substring(0, 80)}`);
                        // Delivery agent replies still take priority
                        const handledByDelivery = await handleDeliveryReply(msg.from, rawText);
                        if (!handledByDelivery) {
                            // Also check if they're replying to a pharmacist quote session
                            const handledByQuote = await (async () => {
                                const session = await WhatsAppSession.findOne({ phone, status: 'waiting', expiresAt: { $gt: new Date() } }).sort({ sentAt: -1 });
                                if (session) { await handleQuoteReply(msg.from, rawText); return true; }
                                return false;
                            })();
                            if (!handledByQuote) {
                                await handlePrivateDm(msg.from, rawText);
                            }
                        }
                    } else {
                        console.log(`ℹ️ [DM] Non-text message from ${msg.from} ignored (not in awaiting_payment step).`);
                    }
                    continue;
                }

                if (msg.type === 'text') {
                    rawText = msg.text?.body || "";
                    // Before classification, check if it's a delivery agent reply
                    const handledByDelivery = await handleDeliveryReply(msg.from, rawText);
                    if (handledByDelivery) continue;

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

                // 2. Resolve Group Name
                // Priority: same-payload chats_updates map → payload field → API (may be 402)
                let chatName: string = payload.chat_name || groupNameMap[msg.chat_id] || '';
                if (!chatName && msg.chat_id && msg.chat_id.endsWith('@g.us')) {
                    try {
                        const whapiToken = process.env.WHAPI_TOKEN;
                        if (whapiToken) {
                            const chatRes = await fetch(`https://gate.whapi.cloud/chats/${msg.chat_id}`, {
                                headers: { 'Authorization': `Bearer ${whapiToken}`, 'Accept': 'application/json' }
                            });
                            if (chatRes.ok) {
                                const chatData = await chatRes.json();
                                chatName = chatData.name || chatData.chat?.name || chatData.subject || '';
                                if (chatName) console.log(`📋 [Group Name] "${chatName}" (via /chats)`);
                            } else {
                                console.warn(`⚠️ [Group Name] /chats returned ${chatRes.status} for ${msg.chat_id}`);
                            }
                        }
                    } catch (err) {
                        console.error("⚠️ [Group Name] Fetch threw:", err);
                    }
                }
                chatName = chatName || 'WhatsApp Group';

                // 3. AI Classification
                if (isImage && mediaBase64) {
                    console.log(`🤖 Classifying prescription image in: ${chatName}...`);
                    classification = await classifyWhatsAppImage(mediaBase64, chatName);
                } else if (!isImage && rawText) {
                    console.log(`🤖 Classifying potential drug request in: ${chatName}...`);
                    classification = await classifyWhatsAppMessage(rawText, chatName);
                }

                if (classification?.isDrugRequest && classification.confidence > 0.6) {
                    // Dedup: skip if chats_updates already created this request
                    const dupCheck = await WhatsAppRequest.findOne({ groupId: msg.chat_id, rawText: rawText || '', createdAt: { $gt: TWO_MIN_AGO } });
                    if (dupCheck) { console.log(`⏭️ [messages] Duplicate skipped (chats_updates already processed it)`); continue; }

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

                    // Resolve state: AI location field → group name regex → group name AI → "National"
                    let resolvedState =
                      extractState(classification.location || '') ||
                      extractState(chatName || '');
                    if (!resolvedState && chatName && chatName !== 'WhatsApp Group') {
                      resolvedState = await extractStateFromGroupName(chatName);
                      if (resolvedState) console.log(`🗺️ AI resolved state from group name "${chatName}" → ${resolvedState}`);
                    }
                    resolvedState = resolvedState || 'National';

                    // 5. Save to Main Platform Requests (Integration)
                    const platformRequest = await RequestModel.create({
                        user: botUser._id,
                        phoneNumber: msg.from || "WhatsApp",
                        state: resolvedState,
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
                        location: resolvedState,
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
