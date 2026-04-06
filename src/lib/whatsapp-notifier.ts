import { getFirebaseAdmin } from '@/lib/firebase-admin';
import axios from 'axios';
import User from '@/models/User';
import { dbConnect } from '@/lib/mongoConnect';

const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const ADMIN_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER; // e.g. "2348157788101"

/**
 * Shared logic to find recipient tokens - Mirrored from /api/notify-pharmacists
 */
async function getRecipientTokens(requestState?: string): Promise<string[]> {
    await dbConnect();
    const recipientTokens = new Set<string>();

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

    return Array.from(recipientTokens);
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

    // 1. Get Recipients (Unified Mirror)
    const tokens = await getRecipientTokens(location);
    console.log(`📣 Notifying ${tokens.length} recipients for request: ${medicineNamesString} in ${location || 'National'}`);

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
            const response = await admin.messaging().sendEachForMulticast(message as any);
            console.log(`✅ FCM sent successfully: ${response.successCount} messages delivered.`);
        } catch (error) {
            console.error("❌ FCM Error:", error);
        }
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
