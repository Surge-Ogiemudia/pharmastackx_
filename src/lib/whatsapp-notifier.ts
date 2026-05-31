import { getFirebaseAdmin } from '@/lib/firebase-admin';
import axios from 'axios';
import User from '@/models/User';
import RequestModel from '@/models/Request';
import TopContact from '@/models/TopContact';
import WhatsAppSession from '@/models/WhatsAppSession';
import { sendWhatsAppMessage } from '@/lib/whapi';
import { dbConnect } from '@/lib/mongoConnect';
import GlobalSettings from '@/models/GlobalSettings';
import { transporter } from '@/lib/nodemailer';
import Product from '@/models/Product';

const ALERT_EMAIL = 'pharmastackxsales@gmail.com';

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

async function checkInventoryAndAlert(
    activeContacts: any[],
    requestedMedicines: { name: string }[],
    location: string,
    requestId: string
) {
    const requestedNames = requestedMedicines.map(m => m.name.toLowerCase().trim());

    const alertPromises = activeContacts
        .filter(c => c.inventory?.length)
        .map(async contact => {
            const matches = contact.inventory.filter((item: any) => {
                const inv = item.medicineName.toLowerCase().trim();
                return requestedNames.some(req => inv.includes(req) || req.includes(inv));
            });

            if (matches.length === 0) return;

            const matchRows = matches.map((m: any) =>
                `<tr>
                    <td style="padding:6px 12px;border-bottom:1px solid #eee">${m.medicineName}</td>
                    <td style="padding:6px 12px;border-bottom:1px solid #eee;color:${m.price != null ? '#0F6E56' : '#999'}">
                        ${m.price != null ? `₦${m.price.toLocaleString()}` : 'Price not listed'}
                    </td>
                </tr>`
            ).join('');

            const requestedRow = requestedMedicines.map(m => m.name).join(', ');

            const html = `
<div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden">
    <div style="background:#0F6E56;padding:18px 24px">
        <h2 style="margin:0;color:#fff;font-size:18px">🚨 Inventory Match Alert</h2>
    </div>
    <div style="padding:20px 24px">
        <p style="margin:0 0 16px;font-size:14px;color:#333">
            A medicine request in <strong>${location}</strong> matches an inventory on file.
        </p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 4px">Requested</p>
        <p style="margin:0 0 20px;font-size:14px;color:#111">${requestedRow}</p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 6px">Matched Supplier</p>
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111">${contact.name}</p>
        <p style="margin:0 0 20px;font-size:13px;color:#555">+${contact.phone} &nbsp;·&nbsp; ${contact._state || location}</p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 6px">Matched Items</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="background:#f5f5f5">
                    <th style="padding:6px 12px;text-align:left;color:#555">Medicine</th>
                    <th style="padding:6px 12px;text-align:left;color:#555">Price</th>
                </tr>
            </thead>
            <tbody>${matchRows}</tbody>
        </table>

        <div style="margin-top:20px;padding:12px;background:#f9f9f9;border-radius:6px;font-size:12px;color:#888">
            Request ID: ${requestId}
        </div>
    </div>
</div>`;

            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: ALERT_EMAIL,
                    subject: `🚨 Inventory Match — ${requestedRow} in ${location}`,
                    html
                });
                console.log(`[whatsapp-notifier] 📧 Inventory match email sent for ${contact.name} (${matches.length} match(es))`);
            } catch (emailErr: any) {
                console.error(`[whatsapp-notifier] ❌ Failed to send match email:`, emailErr?.message);
            }
        });

    await Promise.allSettled(alertPromises);
}

async function checkSynkkInventoryAndAlert(
    requestedMedicines: { name: string }[],
    location: string,
    requestId: string,
    platformRequestId?: string
) {
    try {
        await dbConnect();
        const requestedNames = requestedMedicines.map(m => m.name.toLowerCase().trim());
        
        // 1. Identify all users who have Synkk products synced
        const synkkSlugs = await Product.distinct('slug', { source: 'synkk' });
        
        // 2. Filter these users by the requested location
        const userQuery: any = { slug: { $in: synkkSlugs } };
        if (location && location.toLowerCase() !== 'national') {
            userQuery.$or = [
                { stateOfPractice: new RegExp(`^${location}import { getFirebaseAdmin } from '@/lib/firebase-admin';
import axios from 'axios';
import User from '@/models/User';
import RequestModel from '@/models/Request';
import TopContact from '@/models/TopContact';
import WhatsAppSession from '@/models/WhatsAppSession';
import { sendWhatsAppMessage } from '@/lib/whapi';
import { dbConnect } from '@/lib/mongoConnect';
import GlobalSettings from '@/models/GlobalSettings';
import { transporter } from '@/lib/nodemailer';
import Product from '@/models/Product';

const ALERT_EMAIL = 'pharmastackxsales@gmail.com';

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
            console.log(`[whatsapp-notifier] [DISABLED] Notifications DISABLED for state: ${requestState}. Only notifying admins.`);
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

async function checkInventoryAndAlert(
    activeContacts: any[],
    requestedMedicines: { name: string }[],
    location: string,
    requestId: string
) {
    const requestedNames = requestedMedicines.map(m => m.name.toLowerCase().trim());

    const alertPromises = activeContacts
        .filter(c => c.inventory?.length)
        .map(async contact => {
            const matches = contact.inventory.filter((item: any) => {
                const inv = item.medicineName.toLowerCase().trim();
                return requestedNames.some(req => inv.includes(req) || req.includes(inv));
            });

            if (matches.length === 0) return;

            const matchRows = matches.map((m: any) =>
                `<tr>
                    <td style="padding:6px 12px;border-bottom:1px solid #eee">${m.medicineName}</td>
                    <td style="padding:6px 12px;border-bottom:1px solid #eee;color:${m.price != null ? '#0F6E56' : '#999'}">
                        ${m.price != null ? `₦${m.price.toLocaleString()}` : 'Price not listed'}
                    </td>
                </tr>`
            ).join('');

            const requestedRow = requestedMedicines.map(m => m.name).join(', ');

            const html = `
<div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden">
    <div style="background:#0F6E56;padding:18px 24px">
        <h2 style="margin:0;color:#fff;font-size:18px">🚨 Inventory Match Alert</h2>
    </div>
    <div style="padding:20px 24px">
        <p style="margin:0 0 16px;font-size:14px;color:#333">
            A medicine request in <strong>${location}</strong> matches an inventory on file.
        </p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 4px">Requested</p>
        <p style="margin:0 0 20px;font-size:14px;color:#111">${requestedRow}</p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 6px">Matched Supplier</p>
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111">${contact.name}</p>
        <p style="margin:0 0 20px;font-size:13px;color:#555">+${contact.phone} &nbsp;·&nbsp; ${contact._state || location}</p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 6px">Matched Items</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="background:#f5f5f5">
                    <th style="padding:6px 12px;text-align:left;color:#555">Medicine</th>
                    <th style="padding:6px 12px;text-align:left;color:#555">Price</th>
                </tr>
            </thead>
            <tbody>${matchRows}</tbody>
        </table>

        <div style="margin-top:20px;padding:12px;background:#f9f9f9;border-radius:6px;font-size:12px;color:#888">
            Request ID: ${requestId}
        </div>
    </div>
</div>`;

            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: ALERT_EMAIL,
                    subject: `🚨 Inventory Match — ${requestedRow} in ${location}`,
                    html
                });
                console.log(`[whatsapp-notifier] 📧 Inventory match email sent for ${contact.name} (${matches.length} match(es))`);
            } catch (emailErr: any) {
                console.error(`[whatsapp-notifier] ❌ Failed to send match email:`, emailErr?.message);
            }
        });

    await Promise.allSettled(alertPromises);
}

, 'i') },
                { state: new RegExp(`^${location}import { getFirebaseAdmin } from '@/lib/firebase-admin';
import axios from 'axios';
import User from '@/models/User';
import RequestModel from '@/models/Request';
import TopContact from '@/models/TopContact';
import WhatsAppSession from '@/models/WhatsAppSession';
import { sendWhatsAppMessage } from '@/lib/whapi';
import { dbConnect } from '@/lib/mongoConnect';
import GlobalSettings from '@/models/GlobalSettings';
import { transporter } from '@/lib/nodemailer';
import Product from '@/models/Product';

const ALERT_EMAIL = 'pharmastackxsales@gmail.com';

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

async function checkInventoryAndAlert(
    activeContacts: any[],
    requestedMedicines: { name: string }[],
    location: string,
    requestId: string
) {
    const requestedNames = requestedMedicines.map(m => m.name.toLowerCase().trim());

    const alertPromises = activeContacts
        .filter(c => c.inventory?.length)
        .map(async contact => {
            const matches = contact.inventory.filter((item: any) => {
                const inv = item.medicineName.toLowerCase().trim();
                return requestedNames.some(req => inv.includes(req) || req.includes(inv));
            });

            if (matches.length === 0) return;

            const matchRows = matches.map((m: any) =>
                `<tr>
                    <td style="padding:6px 12px;border-bottom:1px solid #eee">${m.medicineName}</td>
                    <td style="padding:6px 12px;border-bottom:1px solid #eee;color:${m.price != null ? '#0F6E56' : '#999'}">
                        ${m.price != null ? `₦${m.price.toLocaleString()}` : 'Price not listed'}
                    </td>
                </tr>`
            ).join('');

            const requestedRow = requestedMedicines.map(m => m.name).join(', ');

            const html = `
<div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden">
    <div style="background:#0F6E56;padding:18px 24px">
        <h2 style="margin:0;color:#fff;font-size:18px">🚨 Inventory Match Alert</h2>
    </div>
    <div style="padding:20px 24px">
        <p style="margin:0 0 16px;font-size:14px;color:#333">
            A medicine request in <strong>${location}</strong> matches an inventory on file.
        </p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 4px">Requested</p>
        <p style="margin:0 0 20px;font-size:14px;color:#111">${requestedRow}</p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 6px">Matched Supplier</p>
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111">${contact.name}</p>
        <p style="margin:0 0 20px;font-size:13px;color:#555">+${contact.phone} &nbsp;·&nbsp; ${contact._state || location}</p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 6px">Matched Items</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="background:#f5f5f5">
                    <th style="padding:6px 12px;text-align:left;color:#555">Medicine</th>
                    <th style="padding:6px 12px;text-align:left;color:#555">Price</th>
                </tr>
            </thead>
            <tbody>${matchRows}</tbody>
        </table>

        <div style="margin-top:20px;padding:12px;background:#f9f9f9;border-radius:6px;font-size:12px;color:#888">
            Request ID: ${requestId}
        </div>
    </div>
</div>`;

            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: ALERT_EMAIL,
                    subject: `🚨 Inventory Match — ${requestedRow} in ${location}`,
                    html
                });
                console.log(`[whatsapp-notifier] 📧 Inventory match email sent for ${contact.name} (${matches.length} match(es))`);
            } catch (emailErr: any) {
                console.error(`[whatsapp-notifier] ❌ Failed to send match email:`, emailErr?.message);
            }
        });

    await Promise.allSettled(alertPromises);
}

, 'i') }
            ];
        }
        
        const synkkUsers = await User.find(userQuery).select('slug businessName').lean() as any[];
        
        if (synkkUsers.length === 0) return;

        // Build regex conditions for each requested medicine name to search itemName
        const orConditions = requestedNames.map(req => ({
            itemName: { $regex: req, $options: 'i' }
        }));

        const { pusherServer } = require('@/lib/pusher');

        // Try to get patient phone if platformRequestId is provided
        let patientPhone = '';
        if (platformRequestId) {
            try {
                const platformReq = await RequestModel.findById(platformRequestId).lean() as any;
                if (platformReq?.phoneNumber && platformReq.phoneNumber !== 'WhatsApp') {
                    patientPhone = platformReq.phoneNumber;
                }
            } catch (err) { /* ignore */ }
        }

        // 3. For each Synkk user in the state, check stock and fire Pusher
        for (const user of synkkUsers) {
            let matches: any[] = [];
            if (orConditions.length > 0) {
                matches = await Product.find({
                    slug: user.slug,
                    source: 'synkk',
                    $or: orConditions
                }).lean() as any[];
            }

            const hasStock = matches.length > 0;

            // Trigger Pusher notification to the Synkk desktop client
            if (user.slug) {
                try {
                    console.log(`[whatsapp-notifier] 🔔 Firing Pusher 'synkk-drug-request' to ${user.slug} (hasStock: ${hasStock})`);
                    pusherServer.trigger(`pharmacy-${user.slug}`, 'synkk-drug-request', {
                        platformRequestId: platformRequestId || requestId,
                        medicines: requestedMedicines,
                        location,
                        patientPhone: patientPhone || '',
                        hasStock,
                        matches: matches.map(m => ({ name: m.itemName, price: m.amount, quantity: m.quantity }))
                    });
                } catch (pushErr: any) {
                    console.error(`[whatsapp-notifier] ❌ Failed to fire Pusher to ${user.slug}:`, pushErr?.message);
                }
            }

            // If they have stock, also send the traditional Admin Match Email
            if (hasStock) {
                const matchRows = matches.map((m: any) =>
                    `<tr>
                        <td style="padding:6px 12px;border-bottom:1px solid #eee">${m.itemName}</td>
                        <td style="padding:6px 12px;border-bottom:1px solid #eee;color:${m.amount != null ? '#0F6E56' : '#999'}">
                            ${m.amount != null ? `₦${m.amount.toLocaleString()}` : 'Price not listed'}
                        </td>
                        <td style="padding:6px 12px;border-bottom:1px solid #eee">
                            ${m.quantity != null ? m.quantity : 'N/A'}
                        </td>
                    </tr>`
                ).join('');

                const requestedRow = requestedMedicines.map(m => m.name).join(', ');
                const pharmacyName = user.businessName || user.slug;

                const html = `
<div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden">
    <div style="background:#1e3a8a;padding:18px 24px">
        <h2 style="margin:0;color:#fff;font-size:18px">🔄 Synkk Desktop App Match!</h2>
    </div>
    <div style="padding:20px 24px">
        <p style="margin:0 0 16px;font-size:14px;color:#333">
            A WhatsApp drug request in <strong>${location}</strong> matches live inventory synced from a desktop app.
        </p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 4px">Requested</p>
        <p style="margin:0 0 20px;font-size:14px;color:#111">${requestedRow}</p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 6px">Matched Pharmacy (Synkk)</p>
        <p style="margin:0 0 20px;font-size:14px;font-weight:700;color:#111">${pharmacyName}</p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 6px">Matched Items</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="background:#f5f5f5">
                    <th style="padding:6px 12px;text-align:left;color:#555">Medicine</th>
                    <th style="padding:6px 12px;text-align:left;color:#555">Price</th>
                    <th style="padding:6px 12px;text-align:left;color:#555">Stock Qty</th>
                </tr>
            </thead>
            <tbody>${matchRows}</tbody>
        </table>

        <div style="margin-top:20px;padding:12px;background:#f9f9f9;border-radius:6px;font-size:12px;color:#888">
            Request ID: ${requestId}
        </div>
    </div>
</div>`;

                try {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: ALERT_EMAIL,
                        subject: `🔄 SYNKK MATCH — ${requestedRow} (${pharmacyName})`,
                        html
                    });
                    console.log(`[whatsapp-notifier] 📧 Synkk match email sent for ${pharmacyName}`);
                } catch (emailErr: any) {
                    console.error(`[whatsapp-notifier] ❌ Failed to send Synkk match email:`, emailErr?.message);
                }
            }
        }
    } catch (err: any) {
        console.error('[whatsapp-notifier] Synkk check error:', err?.message);
    }
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
        const isNational = normalizedLocation === 'National';

        const topContactDoc = isNational ? null : await TopContact.findOne({
            state: new RegExp(`^${normalizedLocation}$`, 'i')
        }).lean() as any;

        // Inventory match: check state contacts if known, otherwise search all states
        try {
            let inventoryContacts: any[];
            if (!isNational && topContactDoc?.contacts?.length) {
                inventoryContacts = topContactDoc.contacts.filter((c: any) => c.isActive !== false && c.phone);
            } else {
                const allDocs = await TopContact.find().lean() as any[];
                inventoryContacts = allDocs.flatMap((doc: any) =>
                    (doc.contacts || [])
                        .filter((c: any) => c.isActive !== false && c.phone)
                        .map((c: any) => ({ ...c, _state: doc.state }))
                );
            }
            checkInventoryAndAlert(inventoryContacts, medicines, normalizedLocation, String(targetId)).catch(err =>
                console.error('[whatsapp-notifier] Inventory check error:', err?.message)
            );

            // --- NEW CODE: Check Synkk Database non-blocking (Nationwide) ---
            checkSynkkInventoryAndAlert(medicines, normalizedLocation, String(targetId), String(platform_request_id)).catch(err =>
                console.error('[whatsapp-notifier] Synkk DB check error:', err?.message)
            );
            // ----------------------------------------------------------------
        } catch (invErr: any) {
            console.error('[whatsapp-notifier] Inventory lookup error:', invErr?.message);
        }

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
