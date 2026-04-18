import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoConnect';
import Request from '@/models/Request';
import DeliveryAgent from '@/models/DeliveryAgent';
import DeliverySession from '@/models/DeliverySession';
import TopContact from '@/models/TopContact';
import { sendWhatsAppMessage } from '@/lib/whapi';

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

function googleMapsLink(coords: [number, number]): string {
  const [lng, lat] = coords;
  return `https://maps.google.com/?q=${lat},${lng}`;
}

const normalizeState = (s: string) => (s || '').toLowerCase().replace(/state/g, '').trim();

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const { requestId } = await req.json();
    console.log(`[notify-agent] Triggered for Request: ${requestId}`);
    
    if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 });

    const request = await Request.findById(requestId).lean() as any;
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    const acceptedQuote = request.quotes?.find((q: any) => q.status === 'accepted');
    if (!acceptedQuote) {
        console.warn(`[notify-agent] No accepted quote found for ${requestId}`);
        return NextResponse.json({ error: 'No accepted quote' }, { status: 400 });
    }

    const dropoffCoords: [number, number] | undefined = request.deliveryCoords;
    const dropoffAddress: string = request.deliveryAddress || 'Patient delivery address';
    const patientPhone: string = request.patientPhone || '';

    let pickupCoords: [number, number] | undefined;
    let pickupAddress = '';
    let pharmacistPhone = '';
    let pharmacistName = '';

    const stateRaw: string = request.state || '';
    const stateNorm = normalizeState(stateRaw);

    console.log(`[notify-agent] Location Context - State: ${stateRaw} (normalized: ${stateNorm})`);

    // 1. Finding Pickup location
    if (acceptedQuote.externalContact?.phone) {
      const topContactDoc = await TopContact.findOne({ 
        state: new RegExp(`^${stateNorm}$`, 'i') 
      }).lean() as any;
      
      const contact = topContactDoc?.contacts?.find(
        (c: any) => c.phone === acceptedQuote.externalContact.phone
      );
      pickupCoords = contact?.coordinates;
      pickupAddress = contact?.address || 'Pharmacy location';
      pharmacistPhone = acceptedQuote.externalContact.phone;
      pharmacistName = acceptedQuote.externalContact.name || 'Pharmacist';
      
      // Fallback: Use any contact in state if specific one has no coords
      if (!pickupCoords && topContactDoc?.contacts?.length > 0) {
          const fallbackContact = topContactDoc.contacts.find((c: any) => c.coordinates);
          if (fallbackContact) {
              pickupCoords = fallbackContact.coordinates;
              console.log(`[notify-agent] Using state fallback pickup coords from: ${fallbackContact.name}`);
          }
      }
    } else if (acceptedQuote.pharmacy) {
      const topContactDoc = await TopContact.findOne({ 
        state: new RegExp(`^${stateNorm}$`, 'i') 
      }).lean() as any;
      const contact = topContactDoc?.contacts?.find((c: any) => c.coordinates);
      pickupCoords = contact?.coordinates;
      pickupAddress = contact?.address || 'Pharmacy location';
      pharmacistPhone = contact?.phone || '';
      pharmacistName = contact?.name || 'Pharmacist';
    }

    if (!dropoffCoords || !pickupCoords) {
      console.warn(`[notify-agent] MISSING COORDS - Pickup: ${!!pickupCoords}, Dropoff: ${!!dropoffCoords}`);
      return NextResponse.json({ error: 'Missing coordinates for pickup or dropoff' }, { status: 400 });
    }

    // 2. Sorting Agents
    const agentDoc = await DeliveryAgent.findOne({ 
      state: new RegExp(`^${stateNorm}$`, 'i') 
    }).lean() as any;
    
    if (!agentDoc || !agentDoc.agents?.length) {
        console.warn(`[notify-agent] No agents found in DB for state: ${stateRaw}`);
        return NextResponse.json({ error: 'No delivery agents available in state' }, { status: 404 });
    }

    const activeAgents = agentDoc.agents.filter((a: any) => a.isActive && a.coordinates);
    const sorted = activeAgents
      .map((a: any) => ({
        ...a,
        distanceKm: haversineKm(a.coordinates, pickupCoords!),
      }))
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
      .slice(0, 2);

    if (sorted.length === 0) {
      console.warn(`[notify-agent] 0 active agents with coords in ${stateRaw}`);
      return NextResponse.json({ error: 'No active delivery agents available' }, { status: 404 });
    }

    console.log(`[notify-agent] Notifying ${sorted.length} agents...`);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    for (const agent of sorted) {
      const message = `🚴 *PharmaStackX Delivery Request*\n\nYou have a new delivery nearby!\n\n📦 *Pickup (Pharmacy):*\n${pharmacistName}\n📍 ${pickupAddress}\n🗺️ ${googleMapsLink(pickupCoords)}\n📞 Pharmacist: ${pharmacistPhone}\n\n🏠 *Dropoff (Patient):*\n📍 ${dropoffAddress}\n🗺️ ${googleMapsLink(dropoffCoords)}\n📞 Patient: ${patientPhone}\n\n📏 Distance from you to pickup: ~${agent.distanceKm.toFixed(1)} km\n\nReply *ACCEPT* to take this delivery or *DECLINE* to pass.\nThis offer expires in 2 hours.`;

      await sendWhatsAppMessage(agent.phone, message);

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
    console.error('[notify-agent] FATAL ERROR:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
