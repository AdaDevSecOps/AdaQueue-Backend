const fetch = require('node-fetch'); // Ensure node-fetch is available or use native fetch in Node 18+

const API_URL = 'http://localhost:3000/api/workflow-designer';

async function testProfilePersistence() {
    console.log('--- Starting Profile Persistence Test ---');

    // 1. Define a Mock Profile Payload (matching Frontend structure)
    const profilePayload = {
        profileId: 'PF-TEST-001',
        profileCode: 'TEST-BRANCH-01',
        profileName: 'Test Branch for Persistence',
        description: 'Created by Verification Script',
        serviceGroups: [
            {
                code: 'Q-TEST-A',
                name: 'Test Queue A',
                priority: 'High',
                states: {
                    'WAIT': { code: 'WAIT', label: 'Waiting', type: 'INITIAL', transitions: [] }
                }
            }
        ],
        servicePoints: [],
        kiosks: [],
        displayBoards: []
    };

    try {
        // 2. SAVE Profile
        console.log(`\n[1] Saving Profile: ${profilePayload.profileName}...`);
        const saveRes = await fetch(`${API_URL}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profilePayload)
        });

        if (!saveRes.ok) {
            throw new Error(`Save failed: ${saveRes.status} ${saveRes.statusText}`);
        }
        const saveJson = await saveRes.json();
        console.log('✅ Save Success:', saveJson);

        // 3. LOAD Profile
        console.log(`\n[2] Loading Profile: ${profilePayload.profileId}...`);
        const loadRes = await fetch(`${API_URL}/${profilePayload.profileId}`);
        
        if (!loadRes.ok) {
            throw new Error(`Load failed: ${loadRes.status} ${loadRes.statusText}`);
        }
        const loadJson = await loadRes.json();
        
        // 4. Verify Data
        console.log('✅ Load Success');
        if (loadJson.profileName === profilePayload.profileName) {
            console.log('✅ Data Match: Profile Name Verified');
        } else {
            console.error('❌ Data Mismatch:', loadJson.profileName, 'expected', profilePayload.profileName);
        }

        if (loadJson.serviceGroups && loadJson.serviceGroups.length > 0) {
             console.log('✅ Data Match: Service Groups Preserved');
        } else {
             console.error('❌ Data Mismatch: Service Groups missing');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    }
}

// Check if node version supports fetch, if not use require
if (!global.fetch) {
    console.log('Using node-fetch...');
    // Assuming node-fetch is installed, otherwise this might fail.
    // In this env, native fetch is likely available in Node 18+
}

testProfilePersistence();
