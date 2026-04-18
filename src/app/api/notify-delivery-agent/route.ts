import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Request from '@/models/Request';
import DeliveryAgent from '@/models/DeliveryAgent';
import DeliverySession from '@/models/DeliverySession';
import TopContact from '@/models/TopContact';

const WHAPI_TOKEN = process.env.WHAPI_TOKEN!;
const WHAPI_URL = 'https://gate.whapi.cloud/messages/text';

function haversineKm(coord1: [number, number], coord2: [number, number]): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function sendWhatsApp(phone: string, message: string) {
  try {
    await fetch(WHAPI_URL, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${WHAPI_TOKEN}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        to: `${phone}@s.whatsapp.net`, 
        body: message 
      }),
    });
  } catch (e) {
    console.error(`[notify-agent] WhatsApp failed for ${phone}:`, e);
  }
}

function googleMapsLink(coords: [number, number]): string {
  const [lng, lat] = coords;
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const { requestId } = await req.json();
    if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 });

    const request = await Request.findById(requestId).lean() as any;
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    // Get accepted quote to find which pharmacist/contact filled it
    const acceptedQuote = request.quotes?.find((q: any) => q.status === 'accepted');
    if (!acceptedQuote) return NextResponse.json({ error: 'No accepted quote' }, { status: 400 });

    // Dropoff = patient delivery location
    const dropoffCoords: [number, number] | undefined = request.deliveryCoords;
    const dropoffAddress: string = request.deliveryAddress || 'Patient delivery address';
    const patientPhone: string = request.patientPhone || '';

    // Pickup = pharmacist/top contact location
    let pickupCoords: [number, number] | undefined;
    let pickupAddress = '';
    let pharmacistPhone = '';
    let pharmacistName = '';

    const state: string = request.state || '';

    if (acceptedQuote.externalContact?.phone) {
      // WhatsApp pharmacist — find in TopContacts by phone to get coords/address
      const topContactDoc = await TopContact.findOne({ state }).lean() as any;
      const contact = topContactDoc?.contacts?.find(
        (c: any) => c.phone === acceptedQuote.externalContact.phone
      );
      pickupCoords = contact?.coordinates;
      pickupAddress = contact?.address || 'Pharmacy location';
      pharmacistPhone = acceptedQuote.externalContact.phone;
      pharmacistName = acceptedQuote.externalContact.name || 'Pharmacist';
    } else if (acceptedQuote.pharmacy) {
      // App pharmacist — attempt to find matching top contact for geodata fallback
      const topContactDoc = await TopContact.findOne({ state }).lean() as any;
      // Best effort: pick first contact with coordinates if no exact phone match
      const contact = topContactDoc?.contacts?.find((c: any) => c.coordinates);
      pickupCoords = contact?.coordinates;
      pickupAddress = contact?.address || 'Pharmacy location';
      pharmacistPhone = contact?.phone || '';
      pharmacistName = contact?.name || 'Pharmacist';
    }

    if (!dropoffCoords || !pickupCoords) {
      console.warn(`[notify-agent] Missing coordinates. Pickup: ${!!pickupCoords}, Dropoff: ${!!dropoffCoords}`);
      return NextResponse.json({ error: 'Missing coordinates for pickup or dropoff' }, { status: 400 });
    }

    // Get delivery agents for state, sort by distance to pickup
    const agentDoc = await DeliveryAgent.findOne({ state }).lean() as any;
    const activeAgents = (agentDoc?.agents || []).filter((a: any) => a.isActive && a.coordinates);

    const sorted = activeAgents
      .map((a: any) => ({
        ...a,
        distanceKm: haversineKm(a.coordinates, pickupCoords!),
      }))
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
      .slice(0, 2); // Notify nearest 2 agents

    if (sorted.length === 0) {
      return NextResponse.json({ error: 'No delivery agents available in state' }, { status: 404 });
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours to accept

    for (const agent of sorted) {
      const message = `🚴 *PharmaStackX Delivery Request*\n\nYou have a new delivery nearby!\n\n📦 *Pickup (Pharmacy):*\n${pharmacistName}\n📍 ${pickupAddress}\n🗺️ ${googleMapsLink(pickupCoords)}\n📞 Pharmacist: ${pharmacistPhone}\n\n🏠 *Dropoff (Patient):*\n📍 ${dropoffAddress}\n🗺️ ${googleMapsLink(dropoffCoords)}\n📞 Patient: ${patientPhone}\n\n📏 Distance from you to pickup: ~${agent.distanceKm.toFixed(1)} km\n\nReply *ACCEPT* to take this delivery or *DECLINE* to pass.\nThis offer expires in 2 hours.`;

      await sendWhatsApp(agent.phone, message);

      await DeliverySession.create({
        phone: agent.phone,
        orderId: acceptedQuote._id?.toString() || requestId,
        requestId,
        agentName: agent.name,
        status: 'waiting',
        pickupAddress,
        pickupCoords,
        dropoffAddress,
        dropoffCoords,
        pharmacistPhone,
        patientPhone,
        expiresAt,
      });
    }

    return NextResponse.json({ dispatched: sorted.length });
  } catch (err: any) {
    console.error('[notify-agent] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
