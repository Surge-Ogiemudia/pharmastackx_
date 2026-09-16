import ConciergeSession from '@/models/ConciergeSession';
import ConciergePharmacy from '@/models/ConciergePharmacy';
import Order from '@/models/Order';
import { createShipbubbleLabel } from './shipbubble';
import axios from 'axios';

export async function handleConciergeReply(selectionStr: string, overridePhone: string | null) {
    const selectionIndex = parseInt(selectionStr, 10) - 1;

    // Find the latest active finding session
    const session = await ConciergeSession.findOne({ status: 'finding' }).sort({ createdAt: -1 });
    if (!session) {
        await sendWhatsAppResponse('❌ No active Concierge Session found to dispatch.');
        return 'No active session';
    }

    if (selectionIndex < 0 || selectionIndex >= session.topPharmacies.length) {
        await sendWhatsAppResponse(`❌ Invalid selection. Please reply with 1-${session.topPharmacies.length}.`);
        return 'Invalid selection';
    }

    const selectedPharmacy = session.topPharmacies[selectionIndex];
    let finalPhone = selectedPharmacy.phone;

    // Handle Override Phone
    if (overridePhone) {
        finalPhone = overridePhone.replace(/[^\d\+]/g, '');
        // Update the DB silently so next time it uses this number
        await ConciergePharmacy.findByIdAndUpdate(selectedPharmacy.pharmacyId, {
            preferredPickupPhone: finalPhone
        });
        session.assignedPhone = finalPhone;
    }

    session.selectedPharmacyId = selectedPharmacy.pharmacyId;
    session.status = 'assigned';
    await session.save();

    const order = await Order.findById(session.orderId);
    if (!order) {
        await sendWhatsAppResponse('❌ Order not found in database.');
        return 'Order not found';
    }

    // Book Rider on Shipbubble
    if (!order.shipbubbleRequestToken || !order.courierId) {
        await sendWhatsAppResponse('❌ Order is missing Shipbubble Token or Courier ID. Cannot dispatch automatically.');
        return 'Missing shipping token';
    }

    const shipbubbleRes = await createShipbubbleLabel({
        requestToken: order.shipbubbleRequestToken,
        courierId: order.courierId,
        originName: `PharmaStackx (c/o ${selectedPharmacy.name})`,
        originPhone: finalPhone, // As requested: Use pharmacy's verified number
        originAddress: selectedPharmacy.address,
        originLat: selectedPharmacy.lat,
        originLng: selectedPharmacy.lng,
        destName: order.patientName || 'Customer',
        destPhone: order.deliveryPhone,
        destAddress: order.deliveryAddress,
    });

    if (shipbubbleRes.success) {
        // Update Order
        order.status = 'Dispatched';
        order.shipbubbleTrackingUrl = shipbubbleRes.trackingUrl;
        order.shipbubbleOrderCode = shipbubbleRes.orderCode;
        order.distanceKm = selectedPharmacy.distanceKm;
        await order.save();

        const successMsg = `✅ *Rider Booked Successfully!*\n\n*Courier:* Heading to ${selectedPharmacy.name}\n*Pickup Contact:* ${finalPhone}\n*Tracking Link:* ${shipbubbleRes.trackingUrl}\n\n_Order #${(order._id as any).toString().slice(-5).toUpperCase()} is now Dispatched._`;
        await sendWhatsAppResponse(successMsg);
        return 'Dispatched successfully';
    } else {
        session.status = 'failed';
        await session.save();
        
        const failMsg = `❌ *Failed to book rider on Shipbubble!*\nError: ${shipbubbleRes.error}\n\nPlease dispatch manually on the Shipbubble Dashboard.`;
        await sendWhatsAppResponse(failMsg);
        return 'Shipbubble error';
    }
}

async function sendWhatsAppResponse(msg: string) {
    const ADMIN_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER || '2349050006638';
    const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
    if (!WHAPI_TOKEN) return;

    try {
        await axios.post(`https://gate.whapi.cloud/messages/text`, {
            typing_time: 0,
            to: `${ADMIN_NUMBER}@s.whatsapp.net`,
            body: msg
        }, {
            headers: { 'Authorization': `Bearer ${WHAPI_TOKEN}` }
        });
    } catch (err) {
        console.error('[ConciergeWebhookHelper] Error sending response:', err);
    }
}
