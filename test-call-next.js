// สคริปต์สำหรับสร้างคิวตัวอย่างเพื่อทดสอบระบบ Call Next
const API_BASE = 'http://localhost:3000/api';

async function createSampleQueues() {
  console.log('🚀 กำลังสร้างคิวตัวอย่าง...\n');

  const sampleQueues = [
    {
      customerName: 'คุณสมชาย ใจดี',
      tel: '081-111-1111',
      industry: 'BANK',
      profileId: 'TEST-PROFILE-001',
      agnCode: 'AGN001',
      attributes: { 
        serviceGroup: 'Q-TEST-001',
        queueType: 'Q-TEST-001',
        category: 'GENERAL'
      }
    },
    {
      customerName: 'คุณมานี มีสุข',
      tel: '082-222-2222',
      industry: 'BANK',
      profileId: 'TEST-PROFILE-001',
      agnCode: 'AGN001',
      attributes: { 
        serviceGroup: 'Q-TEST-001',
        queueType: 'Q-TEST-001',
        category: 'GENERAL'
      }
    },
    {
      customerName: 'คุณสมหญิง ยิ้มแย้ม',
      tel: '083-333-3333',
      industry: 'BANK',
      profileId: 'TEST-PROFILE-001',
      agnCode: 'AGN001',
      attributes: { 
        serviceGroup: 'Q-TEST-001',
        queueType: 'Q-TEST-001',
        category: 'GENERAL'
      }
    },
    {
      customerName: 'คุณปิติ รุ่งเรือง',
      tel: '084-444-4444',
      industry: 'BANK',
      profileId: 'TEST-PROFILE-001',
      agnCode: 'AGN001',
      attributes: { 
        serviceGroup: 'Q-TEST-001',
        queueType: 'Q-TEST-001',
        category: 'VIP'
      }
    },
    {
      customerName: 'คุณจิตรา สว่างใจ',
      tel: '085-555-5555',
      industry: 'BANK',
      profileId: 'TEST-PROFILE-001',
      agnCode: 'AGN001',
      attributes: { 
        serviceGroup: 'Q-TEST-001',
        queueType: 'Q-TEST-001',
        category: 'GENERAL'
      }
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const queue of sampleQueues) {
    try {
      const response = await fetch(`${API_BASE}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queue)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ สร้างคิวสำเร็จ - Queue No: ${result.queueNo} | ${queue.customerName}`);
      successCount++;
    } catch (error) {
      console.error(`❌ สร้างคิวล้มเหลว - ${queue.customerName}:`, error.message);
      failCount++;
    }
  }

  console.log('\n📊 สรุปผลการสร้างคิว:');
  console.log(`   ✅ สำเร็จ: ${successCount} คิว`);
  console.log(`   ❌ ล้มเหลว: ${failCount} คิว`);
  console.log('\n🎯 พร้อมทดสอบ Call Next แล้ว!\n');
}

async function testCallNext(profileId = 'TEST-PROFILE-001', serviceGroup = 'Q-TEST-001', targetStatus = 'CALLING') {
  console.log('🔔 กำลังเรียกคิวถัดไป...\n');

  try {
    const payload = { profileId, serviceGroup };
    if (targetStatus) {
      payload.targetStatus = targetStatus;
    }

    const response = await fetch(`${API_BASE}/staff/console/call-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('📋 ผลลัพธ์:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.queue) {
      console.log(`\n🎉 เรียกคิวสำเร็จ!`);
      console.log(`   หมายเลขคิว: ${result.queue.queueNo}`);
      console.log(`   ชื่อลูกค้า: ${result.queue.customerName}`);
      console.log(`   เบอร์โทร: ${result.queue.tel}`);
      console.log(`   สถานะ: ${result.queue.status}`);
    } else {
      console.log(`\n⚠️  ${result.message}`);
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'create') {
    await createSampleQueues();
  } else if (command === 'test') {
    const profileId = args[1] || 'TEST-PROFILE-001';
    const serviceGroup = args[2] || 'Q-TEST-001';
    const targetStatus = args[3] || 'CALLING';
    await testCallNext(profileId, serviceGroup, targetStatus);
  } else if (command === 'all') {
    await createSampleQueues();
    console.log('\n⏳ รอ 2 วินาที...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await testCallNext();
  } else {
    console.log('📖 วิธีใช้งาน:');
    console.log('   node test-call-next.js create          - สร้างคิวตัวอย่าง');
    console.log('   node test-call-next.js test            - ทดสอบเรียกคิว');
    console.log('   node test-call-next.js all             - สร้างคิว + ทดสอบเรียกคิว');
    console.log('   node test-call-next.js test [profileId] [serviceGroup] [targetStatus]');
    console.log('\n   ตัวอย่าง:');
    console.log('   node test-call-next.js test TEST-PROFILE-001 Q-TEST-001 SERVING');
  }
}

main().catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});
