import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const uri = process.env.MONGO_URI;

async function testConnection() {
    if (!uri) {
        console.error('❌ MONGO_URI is not defined in .env.local');
        return;
    }

    console.log('🔗 Attempting to connect to:', uri.split('@')[1] || uri); // Hide credentials
    
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 10000,
    });

    try {
        console.log('⏳ Connecting...');
        await client.connect();
        console.log('✅ Connection successful!');
        
        const db = client.db();
        console.log('--- Scanning Requests ---');
        const waRequests = await db.collection('whatsapprequests').find().sort({ createdAt: -1 }).limit(3).toArray();
        console.log('📱 Latest WhatsApp Requests:', JSON.stringify(waRequests, null, 2));
        
        const platformRequests = await db.collection('requests').find({ source: 'whatsapp' }).sort({ createdAt: -1 }).limit(3).toArray();
        console.log('🌐 Latest Platform Requests (WhatsApp source):', JSON.stringify(platformRequests, null, 2));
        
    } catch (err: any) {
        console.error('❌ Connection failed!');
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);
        if (err.reason) {
            console.error('Reason:', JSON.stringify(err.reason, null, 2));
        }
    } finally {
        await client.close();
    }
}

testConnection();
