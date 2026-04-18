
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import UserModel from '@/models/User';
import RequestModel from '@/models/Request';
import TopContact from '@/models/TopContact';
import WhatsAppSession from '@/models/WhatsAppSession';
import { sendWhatsAppMessage } from '@/lib/whapi';

async function getRecipientTokens(requestState?: string): Promise<string[]> {
    await dbConnect();
    const recipientTokens = new Set<string>();

    // 1. Get all admin tokens
    const admins = await UserModel.find({ role: 'admin', fcmTokens: { $exists: true, $ne: [] } }).lean();
    admins.forEach(admin => {
        if (admin.fcmTokens) {
            admin.fcmTokens.forEach(token => recipientTokens.add(token));
        }
    });
    console.log(`[getRecipientTokens] Found ${admins.length} admin users.`);

    // 2. If a state is provided, get all providers in that state
    if (requestState) {
        console.log(`[getRecipientTokens] Searching for providers with state/stateOfPractice: ${requestState}`);
        
        const providersInState = await UserModel.find({
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
        console.log(`[getRecipientTokens] Found ${providersInState.length} providers in ${requestState}.`);
    } else {
        // Fallback for requests without a state: notify all relevant providers
        console.log('[getRecipientTokens] No state provided, searching for all providers.');
        const allProviders = await UserModel.find({
            role: { $in: ['pharmacist', 'pharmacy', 'clinic'] },
            fcmTokens: { $exists: true, $ne: [] }
        }).lean();

        allProviders.forEach(user => {
            if (user.fcmTokens) {
                user.fcmTokens.forEach(token => recipientTokens.add(token));
            }
        });
    }

    const tokens = Array.from(recipientTokens);
    console.log(`[getRecipientTokens] Total unique tokens found: ${tokens.length}`);
    return tokens;
}

// Helper function to generate a dynamic notification title
function haversineKm(lng1: number, lat1: number, lng2: number, lat2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function createDynamicTitle(drugNames: string[]): string {
    if (!drugNames || drugNames.length === 0) {
        return 'New Dispatch Request';
    }

    const count = drugNames.length;
    let title = 'Request for ';

    if (count === 1) {
        title += `${drugNames[0]}`;
    } else if (count === 2) {
        title += `${drugNames[0]} and ${drugNames[1]}`;
    } else if (count === 3) {
        title += `${drugNames[0]}, ${drugNames[1]}, and ${drugNames[2]}`;
    } else {
        title += `${drugNames[0]}, ${drugNames[1]}, ${drugNames[2]}, and ${count - 3} other items`;
    }

    return title;
}

function buildWhatsAppMessage(items: any[], requestId: string, state: string, distanceKm?: number): string {
    const itemList = items.map((item: any) =>
        `• ${item.name}${item.strength ? ` ${item.strength}` : ''}${item.form ? ` (${item.form})` : ''} x${item.quantity}`
    ).join('\n');

    const distanceLine = distanceKm != null
        ? `\n📍 *Patient is ~${distanceKm.toFixed(1)}km from your location*`
        : '';

    return `🔔 *New Medicine Request — PharmaStackX*\n\nA patient in *${state}* needs:\n${itemList}${distanceLine}\n\n*Reply with:*\n✅ AVAILABLE [total price in Naira]\n❌ NOT AVAILABLE\n\n_Example: AVAILABLE 3500_\n\n_Ref: ${requestId.toString().slice(-6).toUpperCase()}_\n_This request expires in 24 hours._`;
}

export async function POST(req: NextRequest) {
    console.log('Received notification request');
    try {
        const { requestId, drugNames } = await req.json();
        console.log(`Request ID: ${requestId}, Drug Names: ${drugNames}`);

        if (!requestId) {
            console.log('Request ID is missing');
            return NextResponse.json({ message: 'Request ID is required' }, { status: 400 });
        }

        const request = await RequestModel.findById(requestId).lean() as { state?: string };
        console.log('Fetched request:', request);

        if (!request) {
            console.log('Request not found');
            return NextResponse.json({ message: 'Request not found' }, { status: 404 });
        }

        const tokens = await getRecipientTokens(request.state);

        if (tokens.length === 0) {
            console.log('No recipients to notify');
            return NextResponse.json({ message: 'No recipients to notify' }, { status: 200 });
        }

        const admin = getFirebaseAdmin();
        const notificationUrl = `/review-request/${requestId}`;

        // Create the dynamic title and body
        const notificationTitle = createDynamicTitle(drugNames);
        const notificationBody = 'A new dispatch request is available for you to quote.';

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

        console.log(`[notify-pharmacists] Sending FCM to ${tokens.length} tokens...`);
        const response = await admin.messaging().sendEachForMulticast(message as any);
        console.log('[notify-pharmacists] Firebase response:', JSON.stringify(response, null, 2));

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`[notify-pharmacists] Token ${idx} failure:`, resp.error);
                }
            });
        }

        // --- WhatsApp dispatch to top contacts ---
        try {
            const topContactDoc = await TopContact.findOne({ state: (request as any).state });
            if (topContactDoc?.contacts?.length > 0) {
                let activeContacts = topContactDoc.contacts.filter((c: any) => c.isActive);

                // Sort by distance from patient if both patient and contact have coordinates
                const patientCoords = (request as any).coordinates; // [lng, lat]
                if (patientCoords?.length === 2) {
                    activeContacts = activeContacts.sort((a: any, b: any) => {
                        if (!a.coordinates && !b.coordinates) return 0;
                        if (!a.coordinates) return 1; // push contacts without coords to end
                        if (!b.coordinates) return -1;
                        const distA = haversineKm(patientCoords[0], patientCoords[1], a.coordinates[0], a.coordinates[1]);
                        const distB = haversineKm(patientCoords[0], patientCoords[1], b.coordinates[0], b.coordinates[1]);
                        return distA - distB;
                    });
                }

                for (const contact of activeContacts) {
                    try {
                        let distanceKm: number | undefined;
                        if (patientCoords?.length === 2 && contact.coordinates?.length === 2) {
                            distanceKm = haversineKm(
                                patientCoords[0],
                                patientCoords[1],
                                contact.coordinates[0],
                                contact.coordinates[1]
                            );
                        }

                        const waMessage = buildWhatsAppMessage(
                            (request as any).items || [],
                            requestId,
                            (request as any).state || 'your state',
                            distanceKm
                        );

                        await sendWhatsAppMessage(contact.phone, waMessage);

                        await WhatsAppSession.create({
                            phone: contact.phone,
                            requestId,
                            contactName: contact.name,
                            requestState: (request as any).state,
                            status: 'waiting'
                        });
                    } catch (waErr) {
                        console.error(`[notify] WhatsApp failed for ${contact.phone}:`, waErr);
                    }
                }
            }
        } catch (waErr) {
            console.error('[notify] WhatsApp dispatch error:', waErr);
            // Non-fatal — FCM already sent, don't fail the whole request
        }

        return NextResponse.json({ success: true, message: `Notified ${response.successCount} recipients via FCM + WhatsApp contacts.` });

    } catch (error) {
        console.error('Error sending notification:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
