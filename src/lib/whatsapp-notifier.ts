import { getFirebaseAdmin } from '@/lib/firebase-admin';
import axios from 'axios';
import User from '@/models/User';
import { IWhatsAppRequest } from '@/models/WhatsAppRequest';

const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const ADMIN_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER; // e.g. "2348157788101"

export async function notifyPharmacists(request: any) {
    const { medicines, location, _id } = request;
    const medicineNames = medicines.map((m: any) => m.name).join(', ');
    
    // 1. Find recipients (Admins + Relevant Providers in the same state)
    const requestState = location || 'Edo';
    const usersToNotify = await User.find({
        $or: [
            { role: 'admin' },
            { 
                role: { $in: ['pharmacy', 'pharmacist', 'clinic'] },
                $or: [
                    { state: requestState },
                    { stateOfPractice: requestState }
                ]
            }
        ],
        fcmTokens: { $exists: true, $not: { $size: 0 } }
    });

    console.log(`📣 Notifying ${usersToNotify.length} recipients for request: ${medicineNames} in ${requestState}`);

    // 2. Send FCM Push Notifications (Primary)
    const admin = getFirebaseAdmin();
    const tokens = usersToNotify.flatMap(p => p.fcmTokens || []).filter(t => !!t) as string[];

    if (tokens.length > 0) {
        const platformId = request.platform_request_id;
        const notificationUrl = platformId ? `/review-request/${platformId}` : `/admin/requests/${_id}`;
        
        const message = {
            notification: {
                title: medicineNames.length > 30 ? 'New Medicine Request' : `Request for ${medicineNames}`,
                body: `A new request from WhatsApp is available in ${requestState}.`
            },
            data: {
                requestId: _id.toString(),
                platformId: platformId?.toString() || '',
                url: notificationUrl
            },
            webpush: {
                fcmOptions: {
                    link: notificationUrl
                }
            },
            tokens: tokens
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`✅ FCM sent successfully: ${response.successCount} messages delivered.`);
        } catch (error) {
            console.error("❌ FCM Error:", error);
        }
    }

    // 3. Send Admin WhatsApp Alert (Manual Oversight)
    if (WHAPI_TOKEN && ADMIN_NUMBER) {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'psx.ng';
            const platformId = request.platform_request_id;
            const link = platformId 
                ? `https://${baseUrl}/admin/requests/${platformId}`
                : `https://${baseUrl}/admin/requests/${_id}`;

            const waMessage = `🔔 *New Request Intercepted*\n\n💊 *Drug:* ${medicineNames}\n📍 *Loc:* ${location || 'Unknown'}\n\nReview & Notify: ${link}`;
            
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
