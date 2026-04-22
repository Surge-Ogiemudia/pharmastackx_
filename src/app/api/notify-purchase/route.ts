import { NextRequest, NextResponse } from 'next/server';
import { transporter } from '@/lib/nodemailer';
import { sendWhatsAppMessage } from '@/lib/whapi';

const ADMIN_EMAIL = 'pharmastackx@gmail.com';
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP_NUMBER;

export async function POST(req: NextRequest) {
  try {
    const { patientName, deliveryState, deliveryOption, total, items, requestId } = await req.json();

    const itemsList = (items || []).map((i: any) => `• ${i.name} x${i.qty}`).join('\n');
    const deliveryLabel = deliveryOption === 'pickup' ? 'Pickup' : deliveryOption === 'express' ? 'Express Delivery' : 'Standard Delivery';

    const waMessage =
      `✅ *New Order Confirmed!*\n\n` +
      `👤 *Patient:* ${patientName || 'N/A'}\n` +
      `📍 *State:* ${deliveryState || 'N/A'}\n` +
      `🚚 *Delivery:* ${deliveryLabel}\n` +
      `💰 *Total:* ₦${Number(total || 0).toLocaleString()}\n\n` +
      `💊 *Items:*\n${itemsList || 'N/A'}\n\n` +
      `🔗 Request ID: ${requestId || 'N/A'}`;

    const emailHtml = `
      <h2 style="color:#0F6E56">New Order Confirmed</h2>
      <p><strong>Patient:</strong> ${patientName || 'N/A'}</p>
      <p><strong>State:</strong> ${deliveryState || 'N/A'}</p>
      <p><strong>Delivery:</strong> ${deliveryLabel}</p>
      <p><strong>Total:</strong> ₦${Number(total || 0).toLocaleString()}</p>
      <h3>Items</h3>
      <ul>${(items || []).map((i: any) => `<li>${i.name} x${i.qty} — ₦${Number(i.price * i.qty).toLocaleString()}</li>`).join('')}</ul>
      <p style="color:#888;font-size:12px">Request ID: ${requestId || 'N/A'}</p>
    `;

    const results = await Promise.allSettled([
      ADMIN_WHATSAPP
        ? sendWhatsAppMessage(ADMIN_WHATSAPP, waMessage)
        : Promise.resolve(),
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: ADMIN_EMAIL,
        subject: `New Order — ${patientName || 'Patient'} · ₦${Number(total || 0).toLocaleString()}`,
        html: emailHtml,
      }),
    ]);

    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`[notify-purchase] channel ${i} failed:`, r.reason);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[notify-purchase] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
