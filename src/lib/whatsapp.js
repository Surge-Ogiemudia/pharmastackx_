import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const adminPhoneNumber = process.env.RECIPIENT_PHONE_NUMBER; // Admin number to receive alerts

const client = twilio(accountSid, authToken);

// Existing function for order notifications
export async function sendWhatsAppNotification(order, targetPhoneNumber) {
  const recipient = targetPhoneNumber || adminPhoneNumber;
  if (!recipient) {
    console.error('WhatsApp Error: No recipient phone number specified and no default RECIPIENT_PHONE_NUMBER is set.');
    return;
  }
  if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.error('Twilio environment variables are not fully configured.');
    return;
  }
  const formattedRecipientNumber = recipient.startsWith('+') ? recipient : `+${recipient}`;
  try {
    const messageBody = `
*New Order Notification*

A new order has been placed on Pharmastackx.

*Order ID:* ${order._id.toString()}
*Customer:* ${order.user.name}
*Total Amount:* ₦${order.totalAmount.toLocaleString()}
*Order Type:* ${order.orderType}
*Delivery Option:* ${order.deliveryOption}

*Items:*
${order.items.map(item => `- ${item.name} (Quantity: ${item.qty})`).join('\n')}
    `.trim();

    await client.messages.create({
      body: messageBody,
      from: `whatsapp:${twilioPhoneNumber}`,
      to: `whatsapp:${formattedRecipientNumber}`
    });

    console.log(`WhatsApp notification sent successfully to ${formattedRecipientNumber} for order: ${order._id}`);
  } catch (error) {
    console.error(`Failed to send WhatsApp notification to ${formattedRecipientNumber} for order ${order._id}:`, error);
  }
}

/**
 * Sends a WhatsApp notification to the admin about a medicine that was not found.
 * @param {object} request - The medicine request object from the database.
 */
export async function sendMedicineNotFoundNotification(request) {
  if (!adminPhoneNumber) {
    console.error('WhatsApp Error: RECIPIENT_PHONE_NUMBER is not set for admin alerts.');
    return;
  }
  if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.error('Twilio environment variables are not fully configured.');
    return;
  }

  const formattedAdminNumber = adminPhoneNumber.startsWith('+') ? adminPhoneNumber : `+${adminPhoneNumber}`;

  try {
    const messageBody = `
*⚕️ Medicine Not Found Alert*

A user could not find a medicine on the website and submitted a request.

*User Details:*
- *Name:* ${request.userName}
- *Contact:* ${request.contact}

*Request Details:*
- *Searched for:* "${request.rawMedicineName}"
- *Notes:* ${request.notes || 'None'}

*🤖 Gemini AI Analysis:*
- *Standardized Name:* ${request.aiStandardizedName || 'N/A'}
- *Category:* ${request.aiRequestCategory || 'N/A'}
- *Urgency:* ${request.aiUrgency || 'N/A'}
- *Suggested Ingredients:* ${(request.aiSuggestedIngredients && request.aiSuggestedIngredients.length > 0) ? request.aiSuggestedIngredients.join(', ') : 'None'}
- *Suggested Alternatives:* ${(request.aiSuggestedAlternatives && request.aiSuggestedAlternatives.length > 0) ? request.aiSuggestedAlternatives.join(', ') : 'None'}

Please follow up with the user promptly.
    `.trim();

    await client.messages.create({
      body: messageBody,
      from: `whatsapp:${twilioPhoneNumber}`,
      to: `whatsapp:${formattedAdminNumber}`
    });

    console.log(`Medicine not found alert sent successfully to ${formattedAdminNumber} for request: ${request.rawMedicineName}`);

  } catch (error) {
    console.error(`Failed to send medicine not found alert for request "${request.rawMedicineName}":`, error);
  }
}
