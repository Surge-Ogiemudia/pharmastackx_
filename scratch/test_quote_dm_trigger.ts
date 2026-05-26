import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const { dbConnect } = await import('../src/lib/mongoConnect');
    const RequestModel = (await import('../src/models/Request')).default;
    const WhatsAppSession = (await import('../src/models/WhatsAppSession')).default;
    const DmConversation = (await import('../src/models/DmConversation')).default;
    const UserModel = (await import('../src/models/User')).default;

    await dbConnect();
    console.log('✅ Connected to MongoDB');

    // Clean up any old dummy user first
    const testEmail = 'test_patient_payment@test.com';
    await UserModel.deleteOne({ email: testEmail });

    // 1. Create a dummy patient user
    const dummyUser = await UserModel.create({
        username: 'test_patient_payment',
        email: testEmail,
        password: 'test_password_123',
        role: 'customer',
        name: 'Test Patient Payment'
    });

    // 2. Create a dummy request representing a WhatsApp request
    const patientPhone = '2348123456789';
    const dummyRequest = await RequestModel.create({
        user: dummyUser._id,
        phoneNumber: patientPhone,
        state: 'Bauchi',
        requestType: 'drug-list',
        items: [{ name: 'Amlodipine', quantity: 1, strength: '5mg', form: 'tablet' }],
        status: 'pending'
    });

    // 3. Create a dummy WhatsAppSession for the pharmacist
    const pharmacistPhone = '2348099887766';
    const dummySession = await WhatsAppSession.create({
        phone: pharmacistPhone,
        requestId: dummyRequest._id,
        contactName: 'Alhaji Bauchi Pharmacy',
        requestState: 'Bauchi',
        status: 'waiting'
    });

    console.log('Dummy records set up:');
    console.log(`- Request ID: ${dummyRequest._id}`);
    console.log(`- Session ID: ${dummySession._id}`);

    // Import handleQuoteReply
    const { handleQuoteReply } = await import('../src/app/api/whatsapp/webhook/route');

    console.log('\n--- Simulating Pharmacist quote reply ("available 4500") ---');
    
    // We expect handleQuoteReply to fail to send the Whapi message (because no valid credentials/internet during local run)
    // but the database writes should still succeed because we put DmConversation write before sendWhatsAppMessage.
    await handleQuoteReply(pharmacistPhone + '@s.whatsapp.net', 'available 4500');

    // 4. Verify Database state
    console.log('\nVerifying database state...');

    // A. Check that the pharmacist session is marked as 'replied'
    const updatedSession = await WhatsAppSession.findById(dummySession._id).lean() as any;
    console.log(`- Updated Session status: "${updatedSession?.status}" (expected: "replied")`);

    // B. Check that the quote is appended to the request
    const updatedRequest = await RequestModel.findById(dummyRequest._id).lean() as any;
    console.log(`- Request status: "${updatedRequest?.status}"`);
    console.log(`- Quotes length: ${updatedRequest?.quotes?.length} (expected: 1)`);
    if (updatedRequest?.quotes?.length > 0) {
        console.log(`- Quote Details: Source: ${updatedRequest.quotes[0].source}, Price (total): ${updatedRequest.quotes[0].items[0].price}`);
    }

    // C. Check that the patient's DmConversation session is created with step 'awaiting_payment'
    const patientSession = await DmConversation.findOne({ phone: patientPhone }).lean() as any;
    console.log(`- Patient DmConversation step: "${patientSession?.step}" (expected: "awaiting_payment")`);
    console.log(`- Patient DmConversation requestId: "${patientSession?.requestId}" (expected: "${dummyRequest._id}")`);

    const dbSuccess = 
        updatedSession?.status === 'replied' &&
        updatedRequest?.quotes?.length === 1 &&
        patientSession?.step === 'awaiting_payment' &&
        patientSession?.requestId?.toString() === dummyRequest._id.toString();

    // Clean up
    console.log('\n🧹 Cleaning up test database records...');
    await UserModel.deleteOne({ _id: dummyUser._id });
    await RequestModel.deleteOne({ _id: dummyRequest._id });
    await WhatsAppSession.deleteOne({ _id: dummySession._id });
    await DmConversation.deleteOne({ phone: patientPhone });
    console.log('🧹 Cleaned.');

    if (dbSuccess) {
        console.log('✅ SUCCESS: Step 2 logic verified and database state is correct!');
        process.exit(0);
    } else {
        console.error('❌ FAILURE: Database state does not match expected values.');
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
