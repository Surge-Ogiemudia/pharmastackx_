const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGO_URI = process.env.MONGO_URI;

async function checkRecentActivity() {
    if (!MONGO_URI) {
        console.error("MONGO_URI not found");
        return;
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        // Define schemas loosely
        const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
        const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));
        const DeliverySession = mongoose.models.DeliverySession || mongoose.model('DeliverySession', new mongoose.Schema({}, { strict: false }));

        console.log("\n--- RECENT ORDERS ---");
        const latestOrders = await Order.find().sort({ createdAt: -1 }).limit(1);
        for (const order of latestOrders) {
            console.log(`Order ID: ${order._id}`);
            console.log(`Status: ${order.status}`);
            console.log(`Patient: ${order.patientName}`);
            console.log(`Created: ${order.createdAt}`);
            console.log(`Request ID: ${order.requestId}`);
        }

        if (latestOrders.length > 0 && latestOrders[0].requestId) {
            console.log("\n--- ASSOCIATED REQUEST ---");
            const requestId = latestOrders[0].requestId;
            const request = await Request.findById(requestId);
            if (request) {
                console.log(`Request Status: ${request.status}`);
                console.log(`Patient Phone: ${request.patientPhone}`);
                console.log(`Quotes: ${request.quotes ? request.quotes.length : 'N/A'}`);
            } else {
                console.log(`Request ${requestId} not found.`);
            }

            console.log("\n--- DELIVERY SESSIONS ---");
            const sessions = await DeliverySession.find({ requestId: requestId.toString() }).sort({ createdAt: -1 });
            if (sessions.length > 0) {
                for (const session of sessions) {
                    console.log(`Agent: ${session.agentName}`);
                    console.log(`Status: ${session.status}`);
                    console.log(`Created: ${session.createdAt}`);
                    console.log(`Expires: ${session.expiresAt}`);
                }
            } else {
                console.log("No delivery sessions found for this request ID.");
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

checkRecentActivity();
