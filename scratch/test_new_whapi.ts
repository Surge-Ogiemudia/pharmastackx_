import axios from 'axios';

const token = 'pGZBHW0nAZCRylGF9WW7kq4ZBMoitmPl';
const adminPhone = '2349134589572'; // from .env.local

async function test() {
    console.log('🚀 Testing Whapi Token:', token);
    try {
        const response = await axios.post(`https://gate.whapi.cloud/messages/text`, {
            typing_time: 0,
            to: `${adminPhone}@s.whatsapp.net`,
            body: 'Hello! This is a test message from your new Whapi token. If you receive this, the token is working!'
        }, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        console.log('✅ SUCCESS!', response.data);
    } catch (error: any) {
        console.error('❌ FAILED!', error.response ? {
            status: error.response.status,
            data: error.response.data
        } : error.message);
    }
}

test();
