import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkRequests() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
        
        // Use a dynamic schema or look for the collection
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));
        
        const collectionName = collections.find(c => c.name.includes('whatsapp'))?.name || 'whatsapprequests';
        const collection = db.collection(collectionName);
        
        const latest = await collection.find().sort({ createdAt: -1 }).limit(5).toArray();
        
        if (latest.length === 0) {
            console.log("❌ No WhatsApp requests found in DB.");
        } else {
            console.log("✅ Found", latest.length, "requests:");
            latest.forEach(r => {
                console.log(`- [${r.createdAt}] ${r.rawText.substring(0, 50)}... (Status: ${r.status})`);
            });
        }
        
        await mongoose.disconnect();
    } catch (err) {
        console.error("DB Error:", err);
    }
}

checkRequests();
