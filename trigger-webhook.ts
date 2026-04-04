import axios from 'axios';

async function triggerWebhook() {
    const url = 'https://ph-stackx-crntt4dnl-pharmastackxs-projects.vercel.app/api/whatsapp/webhook';
    const payload = {
        chat_name: "Test Group",
        messages: [{
            type: "text",
            chat_id: "test-chat-123",
            text: { body: "Drug search Zinnat 500mg tablet" }
        }]
    };
    
    try {
        console.log("📤 Sending mock payload to:", url);
        const res = await axios.post(url, payload);
        console.log("✅ Response:", res.status, res.data);
    } catch (err) {
        console.error("❌ Webhook Trigger Error:", err.response?.status, err.response?.data || err.message);
    }
}

triggerWebhook();
