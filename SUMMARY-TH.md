# 🎯 สรุปการพัฒนาฟีเจอร์ Call Next Queue

## ✅ สิ่งที่ทำเสร็จแล้ว

### 1. เพิ่ม API Endpoint ใหม่
- ✅ เพิ่ม `POST /api/staff/console/call-next` สำหรับเรียกคิวถัดไป
- ✅ รองรับการกรองตาม `profileId` และ `serviceGroup`

### 2. แก้ไขไฟล์ Backend (5 ไฟล์)

#### 📄 `src/modules/queue/repositories/queue.repository.interface.ts`
- เพิ่ม method `findNextWaiting()` ใน interface

#### 📄 `src/modules/queue/repositories/queue.repository.typeorm.ts`
- Implement `findNextWaiting()` สำหรับ SQL Server
- ใช้ QueryBuilder เพื่อค้นหาคิวที่รออยู่
- กรองตามสถานะ: WAITING, WAIT, WAIT_TABLE, PENDING
- เรียงลำดับตาม queueNo จากน้อยไปมาก

#### 📄 `src/modules/queue/repositories/queue.repository.mock.ts`
- Implement `findNextWaiting()` สำหรับ Mock Repository
- ใช้สำหรับการทดสอบ

#### 📄 `src/modules/queue/queue.service.ts`
- เพิ่มฟังก์ชัน `callNextQueue()` 
- ค้นหาคิวถัดไปที่รออยู่
- อัพเดทสถานะเป็น "CALLING"
- ส่งข้อมูลคิวกลับไป

#### 📄 `src/modules/queue/staff-console.controller.ts`
- เพิ่ม endpoint `POST /staff/console/call-next`
- จัดการ request/response
- แปลงข้อมูลให้อยู่ในรูปแบบที่เหมาะสม

### 3. สร้างไฟล์ทดสอบ (3 ไฟล์)

#### 📄 `test-call-next.js`
- สคริปต์สำหรับสร้างคิวตัวอย่าง
- ทดสอบเรียก API Call Next
- รองรับคำสั่ง: create, test, all

#### 📄 `test-call-next.html`
- หน้าเว็บสำหรับทดสอบปุ่ม CALL NEXT
- UI สวยงามด้วย Tailwind CSS
- แสดงผลลัพธ์แบบ Real-time
- แสดง JSON Response

#### 📄 `CALL-NEXT-README.md`
- เอกสารคู่มือการใช้งาน
- ตัวอย่างโค้ด
- วิธีทดสอบ
- Troubleshooting

---

## 🚀 วิธีใช้งาน

### 1. รัน Backend Server
```bash
npm run dev
```

### 2. สร้างคิวตัวอย่าง
```bash
node test-call-next.js create
```

### 3. ทดสอบเรียกคิว

**วิธีที่ 1: ใช้ Command Line**
```bash
node test-call-next.js test
```

**วิธีที่ 2: ใช้ Web UI**
- เปิดไฟล์ `test-call-next.html` ในเบราว์เซอร์
- กดปุ่ม "CALL NEXT"

**วิธีที่ 3: ใช้ cURL**
```bash
curl -X POST http://localhost:3000/api/staff/console/call-next \
  -H "Content-Type: application/json" \
  -d '{"profileId": "TEST-PROFILE-001"}'
```

---

## 📊 API Specification

### Request
```
POST /api/staff/console/call-next
Content-Type: application/json

{
  "profileId": "TEST-PROFILE-001",      // ไม่บังคับ
  "serviceGroup": "Q-TEST-001"          // ไม่บังคับ
}
```

### Response (Success - มีคิว)
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
    "data": {...}
  }
}
```

### Response (Success - ไม่มีคิว)
```json
{
  "success": false,
  "message": "ไม่มีคิวที่รออยู่",
  "queue": null
}
```

---

## 🎨 ตัวอย่างการใช้งานใน Frontend

```javascript
// กดปุ่ม Call Next
async function callNext() {
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
    // แสดงคิวที่เรียก
    showQueue(data.queue);
  } else {
    // ไม่มีคิว
    alert('ไม่มีคิวที่รออยู่');
  }
}
```

---

## 📁 ไฟล์ที่แก้ไข

### Backend (5 ไฟล์)
1. ✅ `src/modules/queue/repositories/queue.repository.interface.ts`
2. ✅ `src/modules/queue/repositories/queue.repository.typeorm.ts`
3. ✅ `src/modules/queue/repositories/queue.repository.mock.ts`
4. ✅ `src/modules/queue/queue.service.ts`
5. ✅ `src/modules/queue/staff-console.controller.ts`

### Test/Documentation (3 ไฟล์)
1. ✅ `test-call-next.js`
2. ✅ `test-call-next.html`
3. ✅ `CALL-NEXT-README.md`

---

## 🔍 วิธีการทำงาน

1. **Frontend** กดปุ่ม "CALL NEXT"
2. ส่ง **POST request** ไปที่ `/api/staff/console/call-next`
3. **Backend** ค้นหาคิวที่มีสถานะ "รอ" (WAITING, WAIT, ...)
4. เรียงตามหมายเลขคิว (เก่าที่สุดก่อน)
5. อัพเดทสถานะเป็น **"CALLING"**
6. ส่งข้อมูลคิวกลับไป **Frontend**
7. **Frontend** แสดงข้อมูลคิวบนหน้าจอ

---

## ✨ Features

- ✅ เรียกคิวถัดไปอัตโนมัติ
- ✅ กรองตาม Profile ID
- ✅ กรองตาม Service Group
- ✅ เรียงตามหมายเลขคิว (เก่าที่สุดก่อน)
- ✅ อัพเดทสถานะเป็น "CALLING"
- ✅ รองรับหลายสถานะรอ (WAITING, WAIT, WAIT_TABLE, PENDING)
- ✅ จัดการกรณีไม่มีคิว
- ✅ Error Handling

---

## 🎉 พร้อมใช้งาน!

ระบบพร้อมใช้งานแล้ว สามารถทดสอบได้ทันที:

```bash
# สร้างคิว + ทดสอบเรียกคิวในคำสั่งเดียว
node test-call-next.js all
```

หรือเปิด `test-call-next.html` เพื่อทดสอบผ่าน Web UI 🎯
