const fs = require('fs');

const path = 'C:/Users/HP/Desktop/zipped pharmastackx/src/lib/whatsapp-notifier.ts';
let content = fs.readFileSync(path, 'utf-8');

const newCheckSynkk = `async function checkSynkkInventoryAndAlert(
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
                { stateOfPractice: new RegExp(\`^\${location}$\`, 'i') },
                { state: new RegExp(\`^\${location}$\`, 'i') }
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
                    console.log(\`[whatsapp-notifier] 🔔 Firing Pusher 'synkk-drug-request' to \${user.slug} (hasStock: \${hasStock})\`);
                    pusherServer.trigger(\`pharmacy-\${user.slug}\`, 'synkk-drug-request', {
                        platformRequestId: platformRequestId || requestId,
                        medicines: requestedMedicines,
                        location,
                        hasStock,
                        matches: matches.map(m => ({ name: m.itemName, price: m.amount, quantity: m.quantity }))
                    });
                } catch (pushErr: any) {
                    console.error(\`[whatsapp-notifier] ❌ Failed to fire Pusher to \${user.slug}:\`, pushErr?.message);
                }
            }

            // If they have stock, also send the traditional Admin Match Email
            if (hasStock) {
                const matchRows = matches.map((m: any) =>
                    \`<tr>
                        <td style="padding:6px 12px;border-bottom:1px solid #eee">\${m.itemName}</td>
                        <td style="padding:6px 12px;border-bottom:1px solid #eee;color:\${m.amount != null ? '#0F6E56' : '#999'}">
                            \${m.amount != null ? \`₦\${m.amount.toLocaleString()}\` : 'Price not listed'}
                        </td>
                        <td style="padding:6px 12px;border-bottom:1px solid #eee">
                            \${m.quantity != null ? m.quantity : 'N/A'}
                        </td>
                    </tr>\`
                ).join('');

                const requestedRow = requestedMedicines.map(m => m.name).join(', ');
                const pharmacyName = user.businessName || user.slug;

                const html = \`
<div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden">
    <div style="background:#1e3a8a;padding:18px 24px">
        <h2 style="margin:0;color:#fff;font-size:18px">🔄 Synkk Desktop App Match!</h2>
    </div>
    <div style="padding:20px 24px">
        <p style="margin:0 0 16px;font-size:14px;color:#333">
            A WhatsApp drug request in <strong>\${location}</strong> matches live inventory synced from a desktop app.
        </p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 4px">Requested</p>
        <p style="margin:0 0 20px;font-size:14px;color:#111">\${requestedRow}</p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 6px">Matched Pharmacy (Synkk)</p>
        <p style="margin:0 0 20px;font-size:14px;font-weight:700;color:#111">\${pharmacyName}</p>

        <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin:0 0 6px">Matched Items</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="background:#f5f5f5">
                    <th style="padding:6px 12px;text-align:left;color:#555">Medicine</th>
                    <th style="padding:6px 12px;text-align:left;color:#555">Price</th>
                    <th style="padding:6px 12px;text-align:left;color:#555">Stock Qty</th>
                </tr>
            </thead>
            <tbody>\${matchRows}</tbody>
        </table>

        <div style="margin-top:20px;padding:12px;background:#f9f9f9;border-radius:6px;font-size:12px;color:#888">
            Request ID: \${requestId}
        </div>
    </div>
</div>\`;

                try {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: ALERT_EMAIL,
                        subject: \`🔄 SYNKK MATCH — \${requestedRow} (\${pharmacyName})\`,
                        html
                    });
                    console.log(\`[whatsapp-notifier] 📧 Synkk match email sent for \${pharmacyName}\`);
                } catch (emailErr: any) {
                    console.error(\`[whatsapp-notifier] ❌ Failed to send Synkk match email:\`, emailErr?.message);
                }
            }
        }
    } catch (err: any) {
        console.error('[whatsapp-notifier] Synkk check error:', err?.message);
    }
}`;

content = content.replace(/async function checkSynkkInventoryAndAlert\([\s\S]*?(?=export async function notifyPharmacists)/, newCheckSynkk + '\n\n');

fs.writeFileSync(path, content);
console.log('updated whatsapp-notifier');
