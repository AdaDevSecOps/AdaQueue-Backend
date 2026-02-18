# 🎯 ระบบเรียกคิวถัดไป (Call Next Queue)

## 📋 สรุปฟีเจอร์

ฟีเจอร์ "Call Next Queue" ช่วยให้พนักงานสามารถเรียกคิวถัดไปที่รออยู่ได้อย่างอัตโนมัติ โดยระบบจะดึงคิวที่มีสถานะ "รอ" (WAITING, WAIT, WAIT_TABLE, PENDING) ที่เก่าที่สุดมาแสดง

---

## 🚀 API Endpoint

### **POST** `/api/staff/console/call-next`

เรียกคิวถัดไปที่รออยู่

#### Request Body (ทั้งหมดเป็น optional)
```json
{
  "profileId": "TEST-PROFILE-001",
  "serviceGroup": "Q-TEST-001"
}
```

#### Response (มีคิว)
```json
{
  "success": true,
  "message": "เรียกคิวสำเร็จ",
  "queue": {
    "docNo": "Q1739702400000",
    "queueNo": 1,
    "customerName": "คุณสมชาย ใจดี",
    "tel": "081-111-1111",
    "status": "CALLING",
    "queueType": "Q-TEST-001",
    "data": {
      "serviceGroup": "Q-TEST-001",
      "profileId": "TEST-PROFILE-001",
      "category": "GENERAL"
    }
  }
}
```

#### Response (ไม่มีคิว)
```json
{
  "success": false,
  "message": "ไม่มีคิวที่รออยู่",
  "queue": null
}
```

---

## 🛠️ การติดตั้งและทดสอบ

### 1. เริ่มต้น Backend Server

```bash
npm run dev
```

Server จะรันที่ `http://localhost:3000`

### 2. สร้างคิวตัวอย่างสำหรับทดสอบ

```bash
# สร้างคิวตัวอย่าง 5 คิว
node test-call-next.js create
```

### 3. ทดสอบเรียกคิว

```bash
# ทดสอบเรียกคิวผ่าน Command Line
node test-call-next.js test

# หรือทำทั้งสร้างคิวและทดสอบในคำสั่งเดียว
node test-call-next.js all

# ระบุ profileId และ serviceGroup
node test-call-next.js test TEST-PROFILE-001 Q-TEST-001
```

### 4. ทดสอบผ่าน Web UI

เปิดไฟล์ `test-call-next.html` ในเบราว์เซอร์:

```bash
# Windows
start test-call-next.html

# หรือเปิดด้วย browser โดยตรง
```

---

## 📁 ไฟล์ที่เกี่ยวข้อง

### Backend Files

1. **Queue Service** - `src/modules/queue/queue.service.ts`
   - ฟังก์ชัน `callNextQueue()` - ดึงคิวถัดไปที่รออยู่
   
2. **Staff Console Controller** - `src/modules/queue/staff-console.controller.ts`
   - Endpoint `POST /staff/console/call-next` - API สำหรับเรียกคิว

3. **Queue Repository Interface** - `src/modules/queue/repositories/queue.repository.interface.ts`
   - เพิ่ม method `findNextWaiting()` - ค้นหาคิวถัดไปที่รอ

4. **TypeORM Repository** - `src/modules/queue/repositories/queue.repository.typeorm.ts`
   - Implement `findNextWaiting()` สำหรับ SQL Server

5. **Mock Repository** - `src/modules/queue/repositories/queue.repository.mock.ts`
   - Implement `findNextWaiting()` สำหรับการทดสอบ

### Test Files

- `test-call-next.js` - สคริปต์สำหรับสร้างคิวตัวอย่างและทดสอบ API
- `test-call-next.html` - หน้าเว็บสำหรับทดสอบปุ่ม Call Next แบบ UI

---

## 🎨 การใช้งาน UI (Frontend Integration)

### ตัวอย่างโค้ด HTML + JavaScript

```html
<button 
  id="callNextBtn"
  class="h-32 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 flex flex-col items-center justify-center gap-2 transition-transform active:scale-95"
>
  <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
  </svg>
  <span class="text-lg font-bold">CALL NEXT</span>
</button>

<script>
document.getElementById('callNextBtn').addEventListener('click', async () => {
  try {
    const response = await fetch('http://localhost:3000/api/staff/console/call-next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: 'TEST-PROFILE-001',
        serviceGroup: 'Q-TEST-001'
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.queue) {
      // แสดงข้อมูลคิว
      console.log('Queue No:', data.queue.queueNo);
      console.log('Customer:', data.queue.customerName);
      console.log('Status:', data.queue.status);
      
      // อัพเดท UI เพื่อแสดงคิว
      displayQueue(data.queue);
    } else {
      // ไม่มีคิว
      alert(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('เกิดข้อผิดพลาดในการเรียกคิว');
  }
});

function displayQueue(queue) {
  // ตัวอย่างการแสดงผลคิว
  document.getElementById('queueDisplay').innerHTML = `
    <div class="queue-card">
      <h2>Queue No: ${queue.queueNo}</h2>
      <p>Customer: ${queue.customerName}</p>
      <p>Tel: ${queue.tel}</p>
      <p>Status: ${queue.status}</p>
    </div>
  `;
}
</script>
```

---

## 🔍 วิธีการทำงานของระบบ

1. **กดปุ่ม CALL NEXT** - ส่ง POST request ไปที่ `/api/staff/console/call-next`

2. **ค้นหาคิวถัดไป** - ระบบค้นหาคิวที่มีสถานะ "รอ" จากฐานข้อมูล
   - ฟิลเตอร์ตาม `profileId` (optional)
   - ฟิลเตอร์ตาม `serviceGroup` (optional)
   - เรียงตามหมายเลขคิว (เก่าที่สุดก่อน)

3. **อัพเดทสถานะ** - เปลี่ยนสถานะคิวจาก "WAITING" เป็น "CALLING"

4. **ส่งข้อมูลกลับ** - ส่งข้อมูลคิวที่เรียกกลับไปยัง Frontend

---

## 📊 สถานะของคิว

| สถานะ | ความหมาย |
|-------|----------|
| WAITING | รอเรียก |
| WAIT | รอบริการ |
| WAIT_TABLE | รอโต๊ะ (ร้านอาหาร) |
| PENDING | รอดำเนินการ |
| CALLING | กำลังเรียก (หลังจากกด Call Next) |
| SERVING | กำลังให้บริการ |
| COMPLETED | เสร็จสิ้น |
| CANCELLED | ยกเลิก |

---

## 🧪 ตัวอย่างการทดสอบ

### ทดสอบด้วย cURL

```bash
# เรียกคิวถัดไป
curl -X POST http://localhost:3000/api/staff/console/call-next \
  -H "Content-Type: application/json" \
  -d '{"profileId": "TEST-PROFILE-001", "serviceGroup": "Q-TEST-001"}'

# เรียกคิวถัดไป (ไม่ระบุ filter)
curl -X POST http://localhost:3000/api/staff/console/call-next \
  -H "Content-Type: application/json" \
  -d '{}'
```

### ทดสอบด้วย Postman

1. เปิด Postman
2. สร้าง Request ใหม่
   - Method: **POST**
   - URL: `http://localhost:3000/api/staff/console/call-next`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
     ```json
     {
       "profileId": "TEST-PROFILE-001",
       "serviceGroup": "Q-TEST-001"
     }
     ```
3. กด Send

---

## 💡 Tips & Best Practices

1. **ระบุ profileId และ serviceGroup** เพื่อกรองคิวตาม profile และ service ที่ต้องการ

2. **จัดการกรณีไม่มีคิว** - ตรวจสอบ `data.success` ก่อนแสดงข้อมูลคิว

3. **แสดง Loading State** - แสดง loading indicator ขณะรอ response จาก API

4. **Refresh หลังเรียกคิว** - อาจต้องรีเฟรชรายการคิวหลังจากเรียกคิวสำเร็จ

5. **Error Handling** - จัดการ error กรณี network ขัดข้อง หรือ server error

---

## 🐛 Troubleshooting

### ปัญหา: API ไม่ตอบสนอง
- ตรวจสอบว่า Backend Server รันอยู่หรือไม่
- ตรวจสอบ URL และ Port (default: 3000)
- ดู log ใน console

### ปัญหา: ไม่มีคิวที่รออยู่
- ตรวจสอบว่ามีคิวในฐานข้อมูลหรือไม่
- รันคำสั่ง `node test-call-next.js create` เพื่อสร้างคิวตัวอย่าง
- ตรวจสอบสถานะของคิว (ต้องเป็น WAITING, WAIT, WAIT_TABLE, หรือ PENDING)

### ปัญหา: CORS Error
- ตรวจสอบการตั้งค่า CORS ใน Backend
- เพิ่ม `app.enableCors()` ใน `main.ts`

---

## 📞 ติดต่อสอบถาม

หากมีคำถามหรือพบปัญหา กรุณาติดต่อทีมพัฒนา

---

**สร้างเมื่อ:** 2026-02-16  
**Version:** 1.0.0
