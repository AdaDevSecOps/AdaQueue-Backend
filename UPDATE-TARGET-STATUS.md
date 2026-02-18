# 🔄 อัปเดต: รับค่า targetStatus จาก Request

## 📝 สรุปการเปลี่ยนแปลง

เดิม API `/api/staff/console/call-next` จะเปลี่ยนสถานะคิวเป็น **"CALLING"** แบบ hard code

**ตอนนี้**: รับค่า `targetStatus` จาก request แทน พร้อม default value เป็น "CALLING"

---

## ✅ ไฟล์ที่แก้ไข (4 ไฟล์)

### 1. **DTO Class** - `call-next.dto.ts`
เพิ่ม field `targetStatus` ใน `CallNextQueueDto`

```typescript
export class CallNextQueueDto {
  profileId?: string;
  serviceGroup?: string;
  targetStatus?: string;  // ✨ เพิ่มใหม่
}
```

**Properties:**
- Type: `string` (optional)
- Default: `CALLING`
- Enum: `['CALLING', 'SERVING', 'IN_PROGRESS']`
- Description: "Target status to set for the called queue"

### 2. **Service** - `queue.service.ts`
อัปเดต method `callNextQueue()` เพื่อรับ parameter `targetStatus`

```typescript
async callNextQueue(
  profileId?: string, 
  serviceGroup?: string, 
  targetStatus?: string  // ✨ เพิ่มใหม่
): Promise<QueueEntity | null>
```

**Logic:**
```typescript
// ใช้ค่าที่รับมา หรือ default เป็น 'CALLING'
const newStatus = targetStatus || 'CALLING';
await this.queueRepository.updateStatus(nextQueue.docNo, newStatus);
```

### 3. **Controller** - `staff-console.controller.ts`
- อัปเดต `@ApiOperation` description
- เพิ่มตัวอย่างใน `@ApiBody` examples
- ส่ง `targetStatus` ไปยัง service

```typescript
async callNextQueue(@Body() body: CallNextQueueDto) {
  const nextQueue = await this.queueService.callNextQueue(
    body.profileId, 
    body.serviceGroup,
    body.targetStatus  // ✨ เพิ่มใหม่
  );
}
```

### 4. **Test Files**
- ✅ `test-call-next.js` - เพิ่ม parameter `targetStatus`
- ✅ `test-call-next.html` - เพิ่ม dropdown เลือก target status

---

## 📖 วิธีใช้งาน

### 🔹 Request Body (ตัวอย่าง)

**1. ใช้ค่า default (CALLING):**
```json
{
  "profileId": "TEST-PROFILE-001",
  "serviceGroup": "Q-TEST-001"
}
```

**2. กำหนดเป็น SERVING:**
```json
{
  "profileId": "TEST-PROFILE-001",
  "serviceGroup": "Q-TEST-001",
  "targetStatus": "SERVING"
}
```

**3. กำหนดเป็น IN_PROGRESS:**
```json
{
  "targetStatus": "IN_PROGRESS"
}
```

**4. ไม่ระบุอะไรเลย (ใช้ default ทั้งหมด):**
```json
{}
```

---

## 🎯 Response

Response ยังคงเหมือนเดิม แต่ `status` จะเป็นค่าที่กำหนดใน `targetStatus`

**Example (targetStatus = "SERVING"):**
```json
{
  "success": true,
  "message": "เรียกคิวสำเร็จ",
  "queue": {
    "docNo": "Q1739702400000",
    "queueNo": 1,
    "customerName": "คุณสมชาย ใจดี",
    "tel": "081-111-1111",
    "status": "SERVING",  // ✨ เปลี่ยนตาม targetStatus
    "queueType": "Q-TEST-001",
    "data": {...}
  }
}
```

---

## 🧪 วิธีทดสอบ

### 1. ทดสอบด้วย Command Line

**ใช้ค่า default (CALLING):**
```bash
node test-call-next.js test
```

**กำหนด targetStatus เป็น SERVING:**
```bash
node test-call-next.js test TEST-PROFILE-001 Q-TEST-001 SERVING
```

**กำหนด targetStatus เป็น IN_PROGRESS:**
```bash
node test-call-next.js test TEST-PROFILE-001 Q-TEST-001 IN_PROGRESS
```

### 2. ทดสอบด้วย Web UI

เปิดไฟล์ `test-call-next.html` แล้ว:
1. เลือก Target Status จาก dropdown
   - CALLING (เรียกคิว)
   - SERVING (กำลังให้บริการ)
   - IN_PROGRESS (กำลังดำเนินการ)
2. กด "CALL NEXT"
3. ดูผลลัพธ์

### 3. ทดสอบด้วย cURL

**ตัวอย่างที่ 1 - Default CALLING:**
```bash
curl -X POST http://localhost:3000/api/staff/console/call-next \
  -H "Content-Type: application/json" \
  -d '{"profileId": "TEST-PROFILE-001"}'
```

**ตัวอย่างที่ 2 - กำหนด SERVING:**
```bash
curl -X POST http://localhost:3000/api/staff/console/call-next \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "TEST-PROFILE-001",
    "serviceGroup": "Q-TEST-001",
    "targetStatus": "SERVING"
  }'
```

**ตัวอย่างที่ 3 - กำหนด IN_PROGRESS:**
```bash
curl -X POST http://localhost:3000/api/staff/console/call-next \
  -H "Content-Type: application/json" \
  -d '{"targetStatus": "IN_PROGRESS"}'
```

### 4. ทดสอบใน Swagger UI

1. เปิด `http://localhost:3000/api/docs`
2. หา endpoint **POST /api/staff/console/call-next**
3. คลิก "Try it out"
4. เลือกตัวอย่างจาก dropdown:
   - "With All Parameters"
   - "Custom Status"
5. หรือกรอก Request Body เอง:
   ```json
   {
     "profileId": "TEST-PROFILE-001",
     "targetStatus": "SERVING"
   }
   ```
6. คลิก "Execute"
7. ดู Response

---

## 🎨 Swagger UI Examples

Swagger UI จะแสดงตัวอย่าง 4 แบบ:

### 1. With All Parameters
```json
{
  "profileId": "TEST-PROFILE-001",
  "serviceGroup": "Q-TEST-001",
  "targetStatus": "CALLING"
}
```

### 2. With Filters Only
```json
{
  "profileId": "TEST-PROFILE-001",
  "serviceGroup": "Q-TEST-001"
}
```

### 3. Without Filters
```json
{}
```

### 4. Custom Status
```json
{
  "targetStatus": "SERVING"
}
```

---

## 🔍 เปรียบเทียบก่อนและหลัง

### ❌ ก่อนแก้ไข

**Request:**
```json
{
  "profileId": "TEST-PROFILE-001"
}
```

**Result:**
- สถานะเปลี่ยนเป็น **"CALLING"** เสมอ (hard code)

### ✅ หลังแก้ไข

**Request 1:**
```json
{
  "profileId": "TEST-PROFILE-001"
}
```
**Result:** สถานะเปลี่ยนเป็น **"CALLING"** (default)

**Request 2:**
```json
{
  "profileId": "TEST-PROFILE-001",
  "targetStatus": "SERVING"
}
```
**Result:** สถานะเปลี่ยนเป็น **"SERVING"** ตามที่กำหนด

**Request 3:**
```json
{
  "targetStatus": "IN_PROGRESS"
}
```
**Result:** สถานะเปลี่ยนเป็น **"IN_PROGRESS"** ตามที่กำหนด

---

## 💡 Use Cases

### Use Case 1: เรียกคิวแบบทั่วไป
```json
{
  "profileId": "BANK-001",
  "serviceGroup": "COUNTER-A"
}
```
➡️ สถานะเปลี่ยนเป็น **"CALLING"** (default)

### Use Case 2: เรียกและเริ่มให้บริการทันที
```json
{
  "profileId": "BANK-001",
  "serviceGroup": "COUNTER-A",
  "targetStatus": "SERVING"
}
```
➡️ สถานะเปลี่ยนเป็น **"SERVING"** (ข้ามขั้น CALLING)

### Use Case 3: เรียกและเริ่มดำเนินการทันที
```json
{
  "profileId": "HOSPITAL-001",
  "targetStatus": "IN_PROGRESS"
}
```
➡️ สถานะเปลี่ยนเป็น **"IN_PROGRESS"**

---

## ✨ ข้อดีของการเปลี่ยนแปลง

1. **ความยืดหยุ่น** - สามารถกำหนดสถานะได้ตามต้องการ
2. **Backward Compatible** - ถ้าไม่ส่ง targetStatus จะใช้ default (CALLING)
3. **ใช้งานง่าย** - มี dropdown ใน UI, มีตัวอย่างใน Swagger
4. **ครอบคลุมหลาย Use Case** - รองรับหลายสถานการณ์การใช้งาน

---

## 📋 Status Options

| Status | ความหมาย | Use Case |
|--------|----------|----------|
| **CALLING** | กำลังเรียก | เรียกคิวแบบทั่วไป (default) |
| **SERVING** | กำลังให้บริการ | เริ่มให้บริการทันที (ข้ามขั้น CALLING) |
| **IN_PROGRESS** | กำลังดำเนินการ | เริ่มประมวลผลทันที |

---

## 🎉 สรุป

การอัปเดตนี้ทำให้:
- ✅ API มีความยืดหยุ่นมากขึ้น
- ✅ รองรับหลาย workflow
- ✅ ยังคง backward compatible
- ✅ มี default value ที่เหมาะสม
- ✅ Documentation ครบถ้วนใน Swagger

**พร้อมใช้งานแล้ว!** 🚀

---

**อัปเดตเมื่อ:** 2026-02-16  
**Version:** 2.0.0
