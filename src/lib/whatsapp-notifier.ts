import { getFirebaseAdmin } from '@/lib/firebase-admin';
import axios from 'axios';
import User from '@/models/User';
import { IWhatsAppRequest } from '@/models/WhatsAppRequest';

const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const ADMIN_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER; // e.g. "2348157788101"

export async function notifyPharmacists(request: any) {
    const { medicines, location, _id } = request;
    const medicineNames = medicines.map((m: any) => m.name).join(', ');
    
    // 1. Find pharmacists in the same state/location
    const pharmacists = await User.find({
        role: 'pharmacy',
        state: location || 'Edo', // Fallback to Edo if not specified
        fcmTokens: { $exists: true, $not: { $size: 0 } }
    });

    console.log(`📣 Notifying ${pharmacists.length} pharmacists for request: ${medicineNames}`);

    // 2. Send FCM Push Notifications (Primary)
    const admin = getFirebaseAdmin();
    const tokens = pharmacists.flatMap(p => p.fcmTokens || []).filter(t => !!t) as string[];

    if (tokens.length > 0) {
        const message = {
            notification: {
                title: '🔔 New Medicine Request!',
                body: `Need: ${medicineNames}\nLocation: ${location || 'Nearby'}`
            },
            data: {
                requestId: _id.toString(),
                type: 'whatsapp_request'
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
