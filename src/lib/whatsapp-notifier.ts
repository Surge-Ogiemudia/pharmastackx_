import { getFirebaseAdmin } from '@/lib/firebase-admin';
import axios from 'axios';
import User from '@/models/User';
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
    const normalizedLocation = location 
        ? location.replace(/\bstate\b/gi, '').trim() 
        : 'National';

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

    // 3. Send Admin WhatsApp Alert (Keep this as it's WhatsApp-specific)
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
}
