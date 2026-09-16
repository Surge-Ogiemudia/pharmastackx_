import { IConciergePharmacy } from '@/models/ConciergePharmacy';
import ConciergePharmacy from '@/models/ConciergePharmacy';
import ConciergeSession from '@/models/ConciergeSession';
import axios from 'axios';

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
}

export async function findClosestPharmacies(lat: number, lng: number, limit = 5) {
    // 1. We fetch all active concierge pharmacies (or use $near if index is ready)
    // For MVP with 420 items, fetching all and sorting in JS is extremely fast and avoids 2dsphere index sync issues.
    const pharmacies = await ConciergePharmacy.find({ isActive: true }).lean();
    
    const mapped = pharmacies.map(p => {
        const pLng = p.location.coordinates[0];
        const pLat = p.location.coordinates[1];
        const dist = calculateDistance(lat, lng, pLat, pLng);
        return {
            pharmacyId: p._id,
            name: p.name,
            phone: p.preferredPickupPhone || p.phone,
            address: p.address,
            distanceKm: parseFloat(dist.toFixed(2)),
            lat: pLat,
            lng: pLng
        };
    });

    mapped.sort((a, b) => a.distanceKm - b.distanceKm);
    return mapped.slice(0, limit);
}

export async function createConciergeSession(order: any, customerLat: number, customerLng: number) {
    const top5 = await findClosestPharmacies(customerLat, customerLng, 5);
    
    const session = new ConciergeSession({
        orderId: order._id,
        status: 'finding',
        topPharmacies: top5
    });
    
    await session.save();

    // Fire WhatsApp message to Admin
    await sendAdminWhatsAppAlert(order, top5);

    return session;
}

async function sendAdminWhatsAppAlert(order: any, top5: any[]) {
    const ADMIN_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER || '2349050006638'; // Fallback to provided number
    const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

    if (!WHAPI_TOKEN) {
        console.warn('No WHAPI_TOKEN found, skipping Admin WhatsApp alert.');
        return;
    }

    const itemStr = order.items.map((i: any) => `📦 ${i.qty}x ${i.name}`).join('\n');
    
    let msg = `🚨 *New Bubblegum Concierge Order!*\n`;
    msg += `*Order ID:* #${order._id.toString().slice(-5).toUpperCase()}\n`;
    msg += `*Items:*\n${itemStr}\n\n`;
    msg += `*Closest Pharmacies:*\n`;

    top5.forEach((p, index) => {
        msg += `*[${index + 1}]* ${p.name}\n📞 ${p.phone} (${p.distanceKm}km away)\n\n`;
    });

    msg += `*Reply 1-5 to dispatch Shipbubble, or e.g. "2 0905000066" to override phone number.*`;

    try {
        await axios.post(`https://gate.whapi.cloud/messages/text`, {
            typing_time: 0,
            to: `${ADMIN_NUMBER}@s.whatsapp.net`,
            body: msg
        }, {
            headers: { 'Authorization': `Bearer ${WHAPI_TOKEN}` }
        });
        console.log(`[Concierge] Admin alert sent to ${ADMIN_NUMBER}`);
    } catch (error: any) {
        console.error('[Concierge] Error sending Admin WhatsApp alert:', error?.message);
    }
}
