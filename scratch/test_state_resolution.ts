import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const { extractState } = await import('../src/app/api/whatsapp/webhook/route');

    function testExtractState(input: string, expected: string | null) {
        const result = extractState(input);
        if (result === expected) {
            console.log(`✅ extractState("${input}") => "${result}" (expected: "${expected}")`);
        } else {
            console.error(`❌ extractState("${input}") => "${result}" (expected: "${expected}")`);
            process.exit(1);
        }
    }

    // Test cases for extractState
    console.log('--- Testing extractState ---');
    testExtractState("ypg bauchi state", "Bauchi");
    testExtractState("PSN-YPG DELTA STATE", "Delta");
    testExtractState("fct - abuja", "FCT - Abuja");
    testExtractState("lagos state", "Lagos");
    testExtractState("Drug search amlodipine needed urgently in bauchi", "Bauchi");
    testExtractState("Drug search: Amlodipine", null);

    // Test FCT normalization simulation
    console.log('\n--- Testing FCT / Abuja Normalization Simulation ---');
    const testCasesFct = ["FCT - Abuja", "Abuja", "fct", "Fct State", "Federal Capital Territory"];

    function normalizeFctForNotifications(state: string): string {
        let normalized = state.replace(/\bstate\b/gi, '').trim();
        if (/fct|abuja/i.test(normalized)) {
            return 'FCT';
        }
        return normalized;
    }

    testCasesFct.forEach(tc => {
        const res = normalizeFctForNotifications(tc);
        if (res === 'FCT') {
            console.log(`✅ FCT normalization for "${tc}" => "${res}"`);
        } else {
            console.log(`⚠️ FCT normalization for "${tc}" => "${res}" (not matching FCT)`);
        }
    });

    console.log('\nAll tests complete.');
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
