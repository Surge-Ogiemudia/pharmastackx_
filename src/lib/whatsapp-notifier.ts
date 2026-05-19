import { getFirebaseAdmin } from '@/lib/firebase-admin';
import axios from 'axios';
import User from '@/models/User';
import RequestModel from '@/models/Request';
import TopContact from '@/models/TopContact';
import WhatsAppSession from '@/models/WhatsAppSession';
import { sendWhatsAppMessage } from '@/lib/whapi';
import { dbConnect } from '@/lib/mongoConnect';
import GlobalSettings from '@/models/GlobalSettings';

const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const ADMIN_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER; // e.g. "2348157788101"

/**
 * Shared logic to find recipient tokens - Mirrored from /api/notify-pharmacists
 */
async function getRecipientTokens(requestState?: string): Promise<string[]> {
    await dbConnect();
    const recipientTokens = new Set<string>();

    // Check Global Settings for disabled states
    if (requestState) {
        const settings = await GlobalSettings.findOne();
        if (settings && settings.disabledWhatsAppStates && settings.disabledWhatsAppStates.includes(requestState)) {
            console.log(`[whatsapp-notifier] 🚫 Notifications DISABLED for state: ${requestState}. Only notifying admins.`);
            // Only return admin tokens if the state is disabled
            const admins = await User.find({ role: 'admin', fcmTokens: { $exists: true, $ne: [] } }).lean();
            admins.forEach(admin => {
                if (admin.fcmTokens) {
                    admin.fcmTokens.forEach(token => recipientTokens.add(token));
                }
            });
            return Array.from(recipientTokens);
        }
    }

    // 1. Get all admin tokens
    const admins = await User.find({ role: 'admin', fcmTokens: { $exists: true, $ne: [] } }).lean();
    admins.forEach(admin => {
        if (admin.fcmTokens) {
            admin.fcmTokens.forEach(token => recipientTokens.add(token));
        }
    });

    // 2. If a state is provided, get all providers in that state
    if (requestState) {
        const providersInState = await User.find({
            role: { $in: ['pharmacist', 'pharmacy', 'clinic'] },
            $or: [
                { stateOfPractice: requestState },
                { state: requestState }
            ],
            fcmTokens: { $exists: true, $ne: [] }
        }).lean();

        providersInState.forEach(provider => {
            if (provider.fcmTokens) {
                provider.fcmTokens.forEach(token => recipientTokens.add(token));
            }
        });
    }

    const tokens = Array.from(recipientTokens);
    console.log(`[getRecipientTokens] Total unique tokens found: ${tokens.length}`);
    return tokens;
}

/**
 * Shared dynamic title logic - Mirrored from /api/notify-pharmacists
 */
function createDynamicTitle(drugNames: string[]): string {
    if (!drugNames || drugNames.length === 0) return 'New Medicine Request';
    const count = drugNames.length;
    if (count === 1) return `Request for ${drugNames[0]}`;
    if (count === 2) return `Request for ${drugNames[0]} and ${drugNames[1]}`;
    if (count === 3) return `Request for ${drugNames[0]}, ${drugNames[1]}, and ${drugNames[2]}`;
    return `Request for ${drugNames[0]}, ${drugNames[1]}, ${drugNames[2]}, and ${count - 3} other items`;
}

export async function notifyPharmacists(request: any) {
    const { medicines, location, _id, platform_request_id } = request;
    const medicineNamesArray = medicines.map((m: any) => m.name);
    const medicineNamesString = medicineNamesArray.join(', ');
    
    // Use platform ID if available, fallback to tracking ID
    const targetId = platform_request_id || _id;

    // Normalize location (e.g., "Bayelsa state" -> "Bayelsa", " Lagos " -> "Lagos")
    let normalizedLocation = location 
        ? location.replace(/\bstate\b/gi, '').trim() 
        : 'National';

    if (/fct|abuja/i.test(normalizedLocation)) {
        normalizedLocation = 'FCT';
    }

    // 1. Get Recipients (Unified Mirror)
    const tokens = await getRecipientTokens(normalizedLocation);
    console.log(`📣 [whatsapp-notifier] Notifying ${tokens.length} recipients for request: ${medicineNamesString} in ${normalizedLocation}`);

    // 2. Send FCM Push Notifications (Mirrored Payload)
    if (tokens.length > 0) {
        const admin = getFirebaseAdmin();
        const notificationUrl = `/review-request/${targetId}`;
        const notificationTitle = createDynamicTitle(medicineNamesArray);
        const notificationBody = 'A new request from WhatsApp is available for you to quote.';

        const message = {
            notification: {
                title: notificationTitle,
                body: notificationBody,
            },
            data: {
                url: notificationUrl
            },
            webpush: {
                fcmOptions: {
                    link: notificationUrl
                }
            },
            tokens: tokens,
        };

        try {
            console.log(`📤 Sending FCM to ${tokens.length} tokens...`);
            const response = await admin.messaging().sendEachForMulticast(message as any);
            console.log(`✅ FCM Result: ${response.successCount} success, ${response.failureCount} failure.`);
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.error(`❌ Token ${idx} failure:`, resp.error);
                    }
                });
            }
        } catch (error) {
            console.error("❌ Fatal FCM Error:", error);
        }
    } else {
        console.warn("⚠️ No FCM tokens found to notify.");
    }

    // 3. Send Admin WhatsApp Alert
    if (WHAPI_TOKEN && ADMIN_NUMBER) {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'psx.ng';
            const link = `https://${baseUrl}/admin/requests/${targetId}`;

            const waMessage = `🔔 *New Request Intercepted*\n\n💊 *Drug:* ${medicineNamesString}\n📍 *Loc:* ${location || 'Unknown'}\n\nReview & Notify: ${link}`;

            await axios.post(`https://gate.whapi.cloud/messages/text`, {
                typing_time: 0,
                to: `${ADMIN_NUMBER}@s.whatsapp.net`,
                body: waMessage
            }, {
                headers: { 'Authorization': `Bearer ${WHAPI_TOKEN}` }
            });
            console.log("✅ Admin WhatsApp alert sent.");
        } catch (error) {
            console.error("❌ Admin WhatsApp Error:", error);
        }
    }

    // 4. Dispatch WhatsApp to top contacts in the detected state (same as web flow)
    try {
        const topContactDoc = await TopContact.findOne({
            state: new RegExp(`^${normalizedLocation}$`, 'i')
        }).lean() as any;

        if (!topContactDoc?.contacts?.length) {
            console.log(`[whatsapp-notifier] No top contacts found for state: ${normalizedLocation}`);
            return;
        }

        const activeContacts = topContactDoc.contacts.filter((c: any) => c.isActive !== false && c.phone);
        console.log(`[whatsapp-notifier] Dispatching to ${activeContacts.length} top contacts in ${normalizedLocation}`);

        // Fetch platform request items for the proper message format
        let requestItems: any[] = medicines.map((m: any) => ({
            name: m.name,
            strength: m.strength,
            form: m.form,
            quantity: m.quantity || 1
        }));

        if (platform_request_id) {
            try {
                const platformReq = await RequestModel.findById(platform_request_id).lean() as any;
                if (platformReq?.items?.length) requestItems = platformReq.items;
            } catch { /* use medicines fallback */ }
        }

        const itemList = requestItems.map((item: any) =>
            `• ${item.name}${item.strength ? ` ${item.strength}` : ''}${item.form ? ` (${item.form})` : ''} x${item.quantity || 1}`
        ).join('\n');

        for (const contact of activeContacts) {
            try {
                const waMsg = `🔔 *New Medicine Request — PharmaStackX*\n\nA patient in *${normalizedLocation}* needs:\n${itemList}\n\n*Reply with:*\n✅ AVAILABLE [total price in Naira]\n❌ NOT AVAILABLE\n\n_Example: AVAILABLE 3500_\n\n_Ref: ${String(targetId).slice(-6).toUpperCase()}_\n_This request expires in 24 hours._`;

                await sendWhatsAppMessage(contact.phone, waMsg);

                await WhatsAppSession.create({
                    phone: contact.phone,
                    requestId: platform_request_id || _id,
                    contactName: contact.name,
                    requestState: normalizedLocation,
                    status: 'waiting',
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                });

                console.log(`[whatsapp-notifier] ✅ WhatsApp sent + session created for ${contact.name} (${contact.phone})`);
            } catch (contactErr: any) {
                console.error(`[whatsapp-notifier] ❌ Failed for ${contact.phone}:`, contactErr?.message);
            }
        }
    } catch (topContactErr: any) {
        console.error('[whatsapp-notifier] Top contact dispatch error:', topContactErr?.message);
    }
}
