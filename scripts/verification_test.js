
// Native fetch in Node 18+

const API_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('🚀 Starting Backend Persistence Verification...\n');

  // --- 1. Test Workflow Persistence ---
  console.log('1️⃣  Testing Workflow Persistence...');
  const workflowPayload = {
    flowCode: 'FLOW_TEST_AUTO_01',
    industry: 'TEST_INDUSTRY',
    version: '1.0',
    initialState: 'WAIT',
    states: {
      WAIT: {
        code: 'WAIT',
        label: 'Waiting',
        type: 'INITIAL',
        transitions: [{ to: 'SERVING', label: 'Call' }]
      },
      SERVING: {
        code: 'SERVING',
        label: 'Serving',
        type: 'NORMAL',
        transitions: [{ to: 'DONE', label: 'Finish' }]
      },
      DONE: {
        code: 'DONE',
        label: 'Completed',
        type: 'FINAL',
        transitions: []
      }
    }
  };

  try {
    const resWorkflow = await fetch(`${API_URL}/workflow-designer/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowPayload)
    });
    const dataWorkflow = await resWorkflow.json();
    console.log('   ✅ API Response:', dataWorkflow);
  } catch (err) {
    console.error('   ❌ API Failed:', err.message);
  }

  // --- 2. Test Profile Persistence ---
  console.log('\n2️⃣  Testing Profile Persistence...');
  const profilePayload = {
    code: 'PF-TEST-AUTO-01',
    name: 'Auto Test Branch',
    workflowCode: 'FLOW_TEST_AUTO_01',
    config: {
      kiosks: [{ code: 'K01', name: 'Test Kiosk' }],
      servicePoints: [{ code: 'SP01', name: 'Test Counter' }]
    }
  };

  try {
    const resProfile = await fetch(`${API_URL}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profilePayload)
    });
    const dataProfile = await resProfile.json();
    console.log('   ✅ API Response:', dataProfile);
  } catch (err) {
    console.error('   ❌ API Failed:', err.message);
  }

  // --- 3. Test Queue Transaction Persistence ---
  console.log('\n3️⃣  Testing Queue Creation...');
  const queuePayload = {
    customerName: 'Test Customer',
    tel: '0999999999',
    industry: 'TEST_INDUSTRY', // Must match workflow industry
    attributes: { notes: 'Testing backend' }
  };

  try {
    const resQueue = await fetch(`${API_URL}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queuePayload)
    });
    const dataQueue = await resQueue.json();
    console.log('   ✅ API Response:', dataQueue);
    return dataQueue; // Return created queue for further checks if needed
  } catch (err) {
    console.error('   ❌ API Failed:', err.message);
  }
}

runTests();
