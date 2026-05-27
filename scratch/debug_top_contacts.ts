import { dbConnect } from '../src/lib/mongoConnect';
import TopContact from '../src/models/TopContact';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debug() {
    await dbConnect();
    const edoContacts = await TopContact.findOne({ state: 'Edo' });
    console.log('--- Edo Contacts ---');
    console.log(JSON.stringify(edoContacts, null, 2));

    const allStates = await TopContact.find({}, { state: 1 });
    console.log('\n--- All States in TopContact ---');
    console.log(allStates.map(s => s.state));

    process.exit(0);
}

debug();
