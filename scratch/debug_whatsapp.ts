const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Now import the rest
const { dbConnect } = require('../src/lib/mongoConnect');
const TopContact = require('../src/models/TopContact').default;
const RequestModel = require('../src/models/Request').default;

async function debug() {
    try {
        await dbConnect();
        console.log('--- Checking Last 10 Requests ---');
        const requests = await RequestModel.find().sort({ createdAt: -1 }).limit(10);
        
        for (const req of requests) {
            console.log(`\nID: ${req._id} | State: "${req.state}" | Created: ${req.createdAt}`);
            const match = await TopContact.findOne({ state: req.state });
            if (match) {
                console.log(`✅ MATCH: Found ${match.contacts.length} contacts for ${req.state}`);
            } else {
                console.log(`❌ NO MATCH for ${req.state}`);
            }
        }

        const allTopStates = await TopContact.find({}, { state: 1 });
        console.log('\n--- All Configured States in TopContact ---');
        console.log(allTopStates.map((s: any) => s.state));

    } catch (err) {
        console.error('Debug failed:', err);
    }
    process.exit(0);
}

debug();
