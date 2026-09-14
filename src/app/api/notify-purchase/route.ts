import { NextRequest, NextResponse } from 'next/server';
import { transporter } from '@/lib/nodemailer';
import { sendWhatsAppMessage } from '@/lib/whapi';
import { dbConnect } from '@/lib/mongoConnect';
import Partner from '@/models/Partner';

const ADMIN_EMAILS = ['pharmastackxsales@gmail.com', 'pogiemudia@gmail.com'];
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP_NUMBER;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      orderId,
      patientName, 
      deliveryEmail,
      deliveryPhone,
      deliveryAddress,
      deliveryCity,
      deliveryState, 
      deliveryOption, 
      courierName,
      total, 
      items, 
      requestId,
      partnerSlug
    } = body;

    await dbConnect();

    // 1. Resolve Partner Contact Email if placed through a partner storefront
    let partnerEmail: string | undefined;
    let partnerName: string = 'PharmaStackX';
    if (partnerSlug) {
      try {
        const partner = await Partner.findOne({ slug: partnerSlug.toLowerCase() });
        if (partner) {
          partnerName = partner.name || partnerSlug;
          if (partner.contactEmail) {
            partnerEmail = partner.contactEmail.trim();
          }
        }
      } catch (pErr) {
        console.error('[notify-purchase] Partner lookup error:', pErr);
      }
    }

    const itemsList = (items || []).map((i: any) => `• ${i.name} x${i.qty}`).join('\n');
    const deliveryLabel = courierName || (deliveryOption === 'pickup' ? 'Pickup from Pharmacy' : deliveryOption === 'express' ? 'Express Delivery' : 'Standard Courier Delivery');
    const fullAddress = [deliveryAddress, deliveryCity, deliveryState].filter(Boolean).join(', ');

    // 2. Format WhatsApp notification
    const waMessage =
      `✅ *New Order Confirmed!* (${partnerName})\n\n` +
      `👤 *Patient:* ${patientName || 'N/A'}\n` +
      `📞 *Phone:* ${deliveryPhone || 'N/A'}\n` +
      `📍 *Address:* ${fullAddress || 'N/A'}\n` +
      `🚚 *Courier:* ${deliveryLabel}\n` +
      `💰 *Total:* ₦${Number(total || 0).toLocaleString()}\n\n` +
      `💊 *Items:*\n${itemsList || 'N/A'}\n\n` +
      `🔗 Order ID: ${orderId || requestId || 'N/A'}`;

    // 3. Customer Branded Receipt
    const customerHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #f1f5f9;">
        <div style="background: ${partnerSlug ? '#E11D48' : '#0F6E56'}; padding: 24px 32px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Order Confirmed! 🎉</h1>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Thank you for ordering with ${partnerName}</p>
        </div>
        
        <div style="padding: 28px 32px;">
          <p style="font-size: 15px; color: #334155; margin-top: 0;">Hi <strong>${patientName || 'Valued Customer'}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">Your payment has been successfully received and your order is now being prepared for dispatch.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span style="color: #64748b;">Order Reference:</span>
              <strong style="color: #0f172a; font-family: monospace;">${orderId || requestId || 'N/A'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span style="color: #64748b;">Delivery Method / Courier:</span>
              <strong style="color: #0f172a;">${deliveryLabel}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: #64748b;">Delivery Address:</span>
              <strong style="color: #0f172a;">${fullAddress || 'N/A'}</strong>
            </div>
          </div>

          <h3 style="font-size: 15px; color: #0f172a; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tbody>
              ${(items || []).map((i: any) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; color: #1e293b;">${i.name} <span style="color: #94a3b8;">x${i.qty}</span></td>
                  <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #0f172a;">₦${Number((i.price || 0) * (i.qty || 1)).toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr>
                <td style="padding: 16px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">Total Paid</td>
                <td style="padding: 16px 0 0 0; text-align: right; font-size: 18px; font-weight: 800; color: ${partnerSlug ? '#E11D48' : '#0F6E56'};">₦${Number(total || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 32px; text-align: center;">
            <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">You can track your order status directly from your device browser anytime.</p>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #64748b;">
          PharmaStackX Multi-Partner Network · Powered by Shipbubble Logistics
        </div>
      </div>
    `;

    // 4. Admin / Partner Notification HTML
    const internalNotificationHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0F6E56;">New Order Confirmed: ${partnerName}</h2>
        <p><strong>Order ID:</strong> ${orderId || requestId || 'N/A'}</p>
        <p><strong>Customer:</strong> ${patientName || 'N/A'} (${deliveryEmail || 'No email'} · ${deliveryPhone || 'No phone'})</p>
        <p><strong>Delivery Address:</strong> ${fullAddress || 'N/A'}</p>
        <p><strong>Courier:</strong> ${deliveryLabel}</p>
        <p><strong>Total Paid:</strong> ₦${Number(total || 0).toLocaleString()}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <h3>Items</h3>
        <ul>
          ${(items || []).map((i: any) => `<li><strong>${i.name}</strong> x${i.qty} — ₦${Number(i.price * i.qty).toLocaleString()}</li>`).join('')}
        </ul>
      </div>
    `;

    // 5. Gather All Destination Addresses
    const emailPromises: Promise<any>[] = [];

    // Customer email
    if (deliveryEmail && deliveryEmail.includes('@')) {
      emailPromises.push(
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: deliveryEmail.trim(),
          subject: `Order Confirmation — ${partnerName} · ₦${Number(total || 0).toLocaleString()}`,
          html: customerHtml,
        })
      );
    }

    // Admin emails (pharmastackxsales@gmail.com and pogiemudia@gmail.com)
    for (const adminEmail of ADMIN_EMAILS) {
      emailPromises.push(
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: adminEmail,
          subject: `[New Order] ${partnerName} — ${patientName || 'Customer'} · ₦${Number(total || 0).toLocaleString()}`,
          html: internalNotificationHtml,
        })
      );
    }

    // Partner Contact Email (Bubblegum)
    if (partnerEmail && !ADMIN_EMAILS.includes(partnerEmail.toLowerCase()) && partnerEmail.toLowerCase() !== deliveryEmail?.toLowerCase()) {
      emailPromises.push(
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: partnerEmail,
          subject: `New Storefront Order Received — ${partnerName} · ₦${Number(total || 0).toLocaleString()}`,
          html: internalNotificationHtml,
        })
      );
    }

    // WhatsApp Notification
    if (ADMIN_WHATSAPP) {
      emailPromises.push(sendWhatsAppMessage(ADMIN_WHATSAPP, waMessage));
    }

    const results = await Promise.allSettled(emailPromises);
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`[notify-purchase] dispatch ${i} failed:`, r.reason);
    });

    return NextResponse.json({ ok: true, dispatches: results.length });
  } catch (err: any) {
    console.error('[notify-purchase] error:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}
