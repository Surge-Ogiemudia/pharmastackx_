import axios from 'axios';

const SHIPBUBBLE_API_KEY = process.env.SHIPBUBBLE_API_KEY || 'sb_prod_da9fee47730a44feb587a42067544eed04a785555a131a3040c153fd2781048a';
const SHIPBUBBLE_BASE_URL = 'https://api.shipbubble.com/v1';

export async function createShipbubbleLabel(payload: {
    requestToken: string;
    courierId: string;
    originName: string;
    originPhone: string;
    originAddress: string;
    originLat: number;
    originLng: number;
    destName: string;
    destPhone: string;
    destAddress: string;
    destLat?: number;
    destLng?: number;
    itemName?: string;
}) {
    // Shipbubble POST /shipping/labels requires the request token, courier ID, and sender/receiver details
    // Reference: Shipbubble API Docs

    const labelPayload = {
        request_token: payload.requestToken,
        courier_id: payload.courierId,
        sender_details: {
            name: payload.originName,
            phone: payload.originPhone,
            address: payload.originAddress,
            // Depending on Shipbubble's exact label schema, you may pass coords if supported, usually address is enough since it was validated during rates.
        },
        receiver_details: {
            name: payload.destName,
            phone: payload.destPhone,
            address: payload.destAddress,
        }
    };

    try {
        const response = await axios.post(`${SHIPBUBBLE_BASE_URL}/shipping/labels`, labelPayload, {
            headers: {
                'Authorization': `Bearer ${SHIPBUBBLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.status === 'success') {
            return {
                success: true,
                trackingUrl: response.data.data.tracking_url || response.data.data.tracking_link,
                orderCode: response.data.data.order_code
            };
        } else {
            console.error('[Shipbubble] Label creation failed:', response.data);
            return { success: false, error: response.data?.message || 'Unknown error from Shipbubble' };
        }
    } catch (error: any) {
        console.error('[Shipbubble] Label creation error:', error?.response?.data || error?.message);
        return { success: false, error: error?.response?.data?.message || error?.message };
    }
}
