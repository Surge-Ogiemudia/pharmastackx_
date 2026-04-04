
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import UserModel from '@/models/User';
import RequestModel from '@/models/Request';

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

        const response = await admin.messaging().sendEachForMulticast(message as any);
        console.log('Firebase response:', JSON.stringify(response, null, 2));

        return NextResponse.json({ success: true, message: `Notified ${response.successCount} recipients.` });

    } catch (error) {
        console.error('Error sending notification:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
