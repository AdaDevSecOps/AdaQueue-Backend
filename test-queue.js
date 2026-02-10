async function run() {
  const base = 'http://localhost:3502/api';
  const payload = {
    customerName: 'Phone:0999999999',
    tel: '0999999999',
    industry: 'BANK',
    profileId: 'TEST-PROFILE-001',
    attributes: { pax: 2, category: 'Q-TEST-001', serviceGroup: 'Q-TEST-001' }
  };
  console.log('1) Create Queue...');
  const res = await fetch(`${base}/queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const created = await res.json();
  console.log('Create Response:', created);
  console.log('2) Fetch Queues by Profile...');
  const res2 = await fetch(`${base}/queue/profile/${payload.profileId}`);
  const list = await res2.json();
  console.log('Queues Count:', Array.isArray(list) ? list.length : 0);
  const last = Array.isArray(list) && list.length ? list[0] : null;
  console.log('Sample Queue:', last);
}
run().catch(e => { console.error('Test error:', e); process.exit(1); });
