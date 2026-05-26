import { dbConnect } from '../src/lib/mongoConnect';
import RequestModel from '../src/models/Request';
import WhatsAppRequest from '../src/models/WhatsAppRequest';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debug() {
    await dbConnect();
    const reqs = await RequestModel.find().sort({ createdAt: -1 }).limit(10).lean();
    console.log('--- Platform Requests ---');
    reqs.forEach((r: any) => {
        console.log(`ID: ${r._id}, State: ${r.state}, Phone: ${r.phoneNumber}, Notes: ${r.notes}`);
    });

    const waReqs = await WhatsAppRequest.find().sort({ createdAt: -1 }).limit(10).lean();
    console.log('\n--- WhatsApp Requests ---');
    waReqs.forEach((r: any) => {
        console.log(`ID: ${r._id}, Location: ${r.location}, GroupName: ${r.groupName}, Text: ${r.rawText}`);
    });

    process.exit(0);
}

debug();
