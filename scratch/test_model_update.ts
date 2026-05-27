import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const { dbConnect } = await import('../src/lib/mongoConnect');
    const DmConversation = (await import('../src/models/DmConversation')).default;

    await dbConnect();
    console.log('✅ Connected to MongoDB');

    const dummyPhone = '1234567890';
    const dummyRequestId = new mongoose.Types.ObjectId();

    // Clean up any old dummy data first
    await DmConversation.deleteOne({ phone: dummyPhone });

    // Create a new document with new fields
    console.log('Creating dummy DmConversation document...');
    const doc = await DmConversation.create({
        phone: dummyPhone,
        step: 'awaiting_payment',
        requestId: dummyRequestId,
        rawText: 'Test payment flow integration'
    });

    console.log('✅ Document created successfully:');
    console.log(doc);

    // Query it back
    console.log('\nQuerying document back from database...');
    const queried = await DmConversation.findOne({ phone: dummyPhone }).lean() as any;
    console.log('Queried document:', queried);

    if (queried && queried.step === 'awaiting_payment' && queried.requestId.toString() === dummyRequestId.toString()) {
        console.log('✅ SUCCESS: Model fields correctly written and read!');
    } else {
        console.error('❌ FAILURE: Model fields did not match expected values.');
        process.exit(1);
    }

    // Clean up
    await DmConversation.deleteOne({ phone: dummyPhone });
    console.log('🧹 Cleaned up dummy document.');

    process.exit(0);
}

run().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
