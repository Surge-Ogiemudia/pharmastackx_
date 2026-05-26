import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const { dbConnect } = await import('../src/lib/mongoConnect');
    const RequestModel = (await import('../src/models/Request')).default;
    const DmConversation = (await import('../src/models/DmConversation')).default;
    const UserModel = (await import('../src/models/User')).default;

    await dbConnect();
    console.log('✅ Connected to MongoDB');

    // 1. Clean up old test data
    const patientPhone = '2348123456789';
    const testEmail = 'test_patient_payment@test.com';
    await UserModel.deleteOne({ email: testEmail });
    await DmConversation.deleteOne({ phone: patientPhone });

    // 2. Create a dummy patient user
    const dummyUser = await UserModel.create({
        username: 'test_patient_payment',
        email: testEmail,
        password: 'test_password_123',
        role: 'customer',
        name: 'Test Patient'
    });

    // 3. Create a dummy request with an offered quote
    const dummyRequest = await RequestModel.create({
        user: dummyUser._id,
        phoneNumber: patientPhone,
        state: 'Bauchi',
        requestType: 'drug-list',
        items: [{ name: 'Amlodipine', quantity: 1, strength: '5mg', form: 'tablet' }],
        quotes: [{
            pharmacy: null,
            externalContact: {
                name: 'Test Pharmacy Top Contact',
                phone: '2348000111222'
            },
            source: 'whatsapp',
            items: [{
                name: 'Amlodipine',
                form: 'tablet',
                strength: '5mg',
                price: 3400,
                isAvailable: true,
                pharmacyQuantity: 1
            }],
            notes: 'Quote received via WhatsApp. Total: ₦3,400',
            status: 'offered',
            quotedAt: new Date()
        }],
        status: 'quoted'
    });

    // 4. Create an active DmConversation session for the patient
    const dummySession = await DmConversation.create({
        phone: patientPhone,
        step: 'awaiting_payment',
        requestId: dummyRequest._id,
        rawText: 'Looking for Amlodipine'
    });

    console.log('Dummy records set up:');
    console.log(`- Request ID: ${dummyRequest._id}`);
    console.log(`- Session ID: ${dummySession._id}`);

    // Import handlePatientPaymentReply
    const { handlePatientPaymentReply } = await import('../src/app/api/whatsapp/webhook/route');

    console.log('\n--- 1. Simulating Invalid Patient Reply ("hello there") ---');
    const mockMsgInvalid = {
        from: patientPhone + '@s.whatsapp.net',
        type: 'text',
        text: { body: 'hello there' }
    };
    await handlePatientPaymentReply(mockMsgInvalid, dummySession);

    // Verify database state has NOT changed
    let reqAfterInvalid = await RequestModel.findById(dummyRequest._id).lean() as any;
    let sessionAfterInvalid = await DmConversation.findById(dummySession._id).lean() as any;
    console.log(`- Request status: "${reqAfterInvalid.status}" (expected: "quoted")`);
    console.log(`- Session step: "${sessionAfterInvalid.step}" (expected: "awaiting_payment")`);

    if (reqAfterInvalid.status !== 'quoted' || sessionAfterInvalid.step !== 'awaiting_payment') {
        console.error('❌ FAILURE: Database state changed on invalid reply!');
        process.exit(1);
    }

    console.log('\n--- 2. Simulating Valid Patient Reply ("done") ---');
    const mockMsgValid = {
        from: patientPhone + '@s.whatsapp.net',
        type: 'text',
        text: { body: 'done' }
    };
    await handlePatientPaymentReply(mockMsgValid, dummySession);

    // Verify database state has changed
    let reqAfterValid = await RequestModel.findById(dummyRequest._id).lean() as any;
    let sessionAfterValid = await DmConversation.findById(dummySession._id).lean() as any;
    console.log(`- Request status: "${reqAfterValid.status}" (expected: "awaiting-confirmation")`);
    console.log(`- Quote status: "${reqAfterValid.quotes[0].status}" (expected: "accepted")`);
    console.log(`- Session step: "${sessionAfterValid.step}" (expected: "complete")`);

    const success = 
        reqAfterValid.status === 'awaiting-confirmation' &&
        reqAfterValid.quotes[0].status === 'accepted' &&
        sessionAfterValid.step === 'complete';

    // Clean up
    console.log('\n🧹 Cleaning up test database records...');
    await UserModel.deleteOne({ _id: dummyUser._id });
    await RequestModel.deleteOne({ _id: dummyRequest._id });
    await DmConversation.deleteOne({ phone: patientPhone });
    console.log('🧹 Cleaned.');

    if (success) {
        console.log('✅ SUCCESS: Step 3 logic verified and database state is correct!');
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
