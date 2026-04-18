import axios from 'axios';

const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

/**
 * Sends a WhatsApp message via Whapi.cloud
 * @param phone International format without + (e.g. 2348012345678)
 * @param text The message body
 */
export async function sendWhatsAppMessage(phone: string, text: string) {
    if (!WHAPI_TOKEN) {
        console.error('[Whapi] WHAPI_TOKEN is not configured.');
        return;
    }

    // Ensure phone is in the correct format for Whapi (appends @s.whatsapp.net if missing)
    const recipient = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;

    try {
        const response = await axios.post(`https://gate.whapi.cloud/messages/text`, {
            typing_time: 0,
            to: recipient,
            body: text
        }, {
            headers: { 
                'Authorization': `Bearer ${WHAPI_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`[Whapi] Message sent to ${recipient}. ID: ${response.data.message?.id}`);
        return response.data;
    } catch (error: any) {
        console.error(`[Whapi] Failed to send message to ${recipient}:`, error.response?.data || error.message);
        throw error;
    }
}
