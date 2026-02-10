
const fetch = require('node-fetch');

async function testWorkflowSave() {
    const profileId = 'TEST-PROFILE-001';
    
    console.log('1. Creating/Saving Profile with Workflow Data...');
    const payload = {
        profileId: profileId,
        profileCode: profileId,
        profileName: 'Test Profile',
        agnCode: 'AGN001',
        description: 'Test Description',
        serviceGroups: [
            {
                code: 'Q-TEST-001',
                name: 'Test Queue',
                priority: 'High',
                initialState: 'WAIT',
                states: {}
            }
        ],
        servicePoints: [],
        kiosks: [],
        displayBoards: []
    };

    try {
        const res = await fetch('http://localhost:3000/api/workflow-designer/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        console.log('Save Response:', data);

        console.log('2. Reading back Profile...');
        const readRes = await fetch(`http://localhost:3000/api/workflow-designer/${profileId}`);
        const readData = await readRes.json();
        
        console.log('Read Data ServiceGroups:', JSON.stringify(readData.serviceGroups, null, 2));

        if (readData.serviceGroups && readData.serviceGroups.length > 0) {
            console.log('SUCCESS: Data persisted correctly.');
        } else {
            console.log('FAILURE: Data lost.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testWorkflowSave();
