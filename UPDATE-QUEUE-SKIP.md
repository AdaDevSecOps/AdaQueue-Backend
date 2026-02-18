# 🎯 อัปเดต: เพิ่มการข้ามคิว (Queue Skipping) และรองรับ null status

## 📝 สรุปการเปลี่ยนแปลง

### 1️⃣ **เพิ่มการค้นหาคิวที่มี status = `null`**
เดิมค้นหาเฉพาะ: `['WAITING', 'WAIT', 'WAIT_TABLE', 'PENDING']`  
**ตอนนี้**: รวม `null` ด้วย → `['WAITING', 'WAIT', 'WAIT_TABLE', 'PENDING', null]`

### 2️⃣ **เพิ่มฟีเจอร์ข้ามคิว (Queue Skipping) ด้วย `docNo`**
สามารถส่ง `docNo` เพื่อข้ามไปยังคิวเฉพาะได้ทันที โดยไม่ต้องค้นหาคิวถัดไป

**Logic:**
- **ถ้ามี `docNo`**: ตรวจสอบว่าคิวนั้นมีสถานะที่เรียกได้ (`null`, `WAITING`, `WAIT`, `WAIT_TABLE`, `PENDING`) แล้ว update สถานะ
- **ถ้าไม่มี `docNo`**: ค้นหาคิวถัดไปที่รออยู่ตามปกติ

---

## ✅ ไฟล์ที่แก้ไข (6 ไฟล์)

### 1. **DTO** - [`call-next.dto.ts`](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\src\modules\queue\dto\call-next.dto.ts)
เพิ่ม field `docNo`:

```typescript
@ApiPropertyOptional({
  description: 'Document number for skipping to a specific queue',
  example: 'Q1739702400000',
  type: String
})
docNo?: string;
```

### 2. **TypeORM Repository** - [`queue.repository.typeorm.ts`](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\src\modules\queue\repositories\queue.repository.typeorm.ts)
แก้ไข WHERE clause เพื่อรวม `null`:

```typescript
queryBuilder.where('(queue.status IS NULL OR queue.status IN (:...statuses))', { 
  statuses: ['WAITING', 'WAIT', 'WAIT_TABLE', 'PENDING'] 
});
```

### 3. **Mock Repository** - [`queue.repository.mock.ts`](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\src\modules\queue\repositories\queue.repository.mock.ts)
เพิ่ม `null` ใน array:

```typescript
const waitingStatuses = ['WAITING', 'WAIT', 'WAIT_TABLE', 'PENDING', null];
```

### 4. **Service** - [`queue.service.ts`](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\src\modules\queue\queue.service.ts)
เพิ่ม logic สำหรับ queue skipping:

```typescript
async callNextQueue(
  docNo?: string,           // ✨ เพิ่มใหม่
  profileId?: string, 
  serviceGroup?: string, 
  targetStatus?: string
): Promise<QueueEntity | null> {
  // กรณี 1: มี docNo = ข้ามคิว
  if (docNo) {
    nextQueue = await this.queueRepository.findByDocNo(docNo);
    
    // ตรวจสอบสถานะ
    const allowedStatuses = ['WAITING', 'WAIT', 'WAIT_TABLE', 'PENDING', null];
    if (!allowedStatuses.includes(nextQueue.status)) {
      throw new BadRequestException('Cannot call queue with this status');
    }
  } 
  // กรณี 2: ไม่มี docNo = ค้นหาคิวถัดไป
  else {
    nextQueue = await this.queueRepository.findNextWaiting(profileId, serviceGroup);
  }
  
  // อัพเดทสถานะ
  await this.queueRepository.updateStatus(nextQueue.docNo, targetStatus || 'CALLING');
}
```

### 5. **Controller** - [`staff-console.controller.ts`](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\src\modules\queue\staff-console.controller.ts)
- อัพเดท `@ApiOperation` description
- เพิ่มตัวอย่าง "Skip to Specific Queue" ใน Swagger
- ส่ง `docNo` ไปยัง service

### 6. **Test File** - [`test-call-next.html`](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\test-call-next.html)
เพิ่ม input field สำหรับ `docNo`

---

## 📖 วิธีใช้งาน

### 🔹 **Use Case 1: เรียกคิวถัดไปตามปกติ**

**Request:**
```json
{
  "profileId": "TEST-PROFILE-001",
  "serviceGroup": "Q-TEST-001"
}
```

**Result:** ค้นหาคิวถัดไปที่รออยู่ (status = `null`, `WAITING`, `WAIT`, etc.)

---

### 🔹 **Use Case 2: ข้ามไปยังคิวเฉพาะ (Queue Skipping)**

**Request:**
```json
{
  "docNo": "Q1739702400000",
  "targetStatus": "CALLING"
}
```

**Result:** 
- ตรวจสอบว่าคิว `Q1739702400000` มีสถานะที่เรียกได้หรือไม่
- ถ้าได้ → อัพเดทเป็น `CALLING`
- ถ้าไม่ได้ → Error

---

### 🔹 **Use Case 3: ข้ามคิวและเริ่มให้บริการทันที**

**Request:**
```json
{
  "docNo": "Q1739702400123",
  "targetStatus": "SERVING"
}
```

**Result:** ข้ามไปยังคิว `Q1739702400123` และเปลี่ยนสถานะเป็น `SERVING` ทันที

---

## 🎯 การตรวจสอบสถานะ

### ✅ **Allowed Statuses** (สามารถเรียกได้)
- `null` ✨ **ใหม่!**
- `WAITING`
- `WAIT`
- `WAIT_TABLE`
- `PENDING`

### ❌ **Not Allowed** (ไม่สามารถเรียกได้)
- `CALLING`
- `SERVING`
- `COMPLETED`
- `CANCELLED`
- อื่นๆ

---

## 🧪 วิธีทดสอบ

### **1. ทดสอบด้วย Web UI**

เปิดไฟล์ `test-call-next.html`:

**A. เรียกคิวถัดไป (ปกติ):**
1. เว้นช่อง DocNo ว่างไว้
2. กรอก Profile ID และ Service Group (optional)
3. เลือก Target Status
4. กด "CALL NEXT"

**B. ข้ามไปยังคิวเฉพาะ:**
1. กรอก **DocNo** (เช่น `Q1739702400000`)
2. เลือก Target Status
3. กด "CALL NEXT"

---

### **2. ทดสอบด้วย cURL**

**A. เรียกคิวถัดไป:**
```bash
curl -X POST http://localhost:3000/api/staff/console/call-next \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "TEST-PROFILE-001",
    "serviceGroup": "Q-TEST-001"
  }'
```

**B. ข้ามไปยังคิวเฉพาะ:**
```bash
curl -X POST http://localhost:3000/api/staff/console/call-next \
  -H "Content-Type: application/json" \
  -d '{
    "docNo": "Q1739702400000",
    "targetStatus": "CALLING"
  }'
```

**C. ข้ามคิว + เริ่มให้บริการทันที:**
```bash
curl -X POST http://localhost:3000/api/staff/console/call-next \
  -H "Content-Type: application/json" \
  -d '{
    "docNo": "Q1739702400000",
    "targetStatus": "SERVING"
  }'
```

---

### **3. ทดสอบใน Swagger UI**

1. เปิด `http://localhost:3000/api/docs`
2. หา **POST /api/staff/console/call-next**
3. คลิก "Try it out"
4. เลือกตัวอย่าง **"Skip to Specific Queue (docNo)"**
5. แก้ไข `docNo` เป็นค่าจริงจากฐานข้อมูล
6. คลิก "Execute"

---

## 📊 Flow Diagram

```
┌─────────────────────────────────────────────────┐
│  POST /api/staff/console/call-next             │
└───────────────┬─────────────────────────────────┘
                │
                ▼
        ┌───────────────┐
        │ มี docNo?     │
        └───────┬───────┘
                │
        ┌───────┴───────┐
        │               │
        ▼ YES           ▼ NO
┌──────────────┐   ┌──────────────────┐
│ findByDocNo  │   │ findNextWaiting  │
└──────┬───────┘   └────────┬─────────┘
       │                    │
       ▼                    │
┌──────────────┐            │
│ Check status │            │
│ allowed?     │            │
└──────┬───────┘            │
       │                    │
   ┌───┴───┐                │
   │  YES  │                │
   └───┬───┘                │
       │                    │
       └────────┬───────────┘
                │
                ▼
        ┌──────────────┐
        │ updateStatus │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │   Response   │
        └──────────────┘
```

---

## 📋 Response Examples

### ✅ **Success - เรียกคิวถัดไป**
```json
{
  "success": true,
  "message": "เรียกคิวสำเร็จ",
  "queue": {
    "docNo": "Q1739702400001",
    "queueNo": 5,
    "customerName": "คุณสมชาย ใจดี",
    "tel": "081-111-1111",
    "status": "CALLING",
    "queueType": "Q-TEST-001"
  }
}
```

### ✅ **Success - ข้ามคิว**
```json
{
  "success": true,
  "message": "เรียกคิวสำเร็จ",
  "queue": {
    "docNo": "Q1739702400000",
    "queueNo": 10,
    "customerName": "คุณมานี มีสุข",
    "tel": "082-222-2222",
    "status": "SERVING",
    "queueType": "Q-TEST-001"
  }
}
```

### ❌ **Error - คิวไม่พบ**
```json
{
  "statusCode": 400,
  "message": "Queue with docNo Q9999999999 not found",
  "error": "Bad Request"
}
```

### ❌ **Error - สถานะไม่ถูกต้อง**
```json
{
  "statusCode": 400,
  "message": "Cannot call queue with status: COMPLETED. Allowed statuses: WAITING, WAIT, WAIT_TABLE, PENDING, or null",
  "error": "Bad Request"
}
```

### ⚠️ **No Queue Available**
```json
{
  "success": false,
  "message": "ไม่มีคิวที่รออยู่",
  "queue": null
}
```

---

## 🎨 Swagger UI Examples

ตอนนี้ Swagger UI จะมีตัวอย่าง **5 แบบ**:

### 1. Skip to Specific Queue (docNo) ✨ **ใหม่!**
```json
{
  "docNo": "Q1739702400000",
  "targetStatus": "CALLING"
}
```

### 2. With All Parameters
```json
{
  "profileId": "TEST-PROFILE-001",
  "serviceGroup": "Q-TEST-001",
  "targetStatus": "CALLING"
}
```

### 3. With Filters Only
```json
{
  "profileId": "TEST-PROFILE-001",
  "serviceGroup": "Q-TEST-001"
}
```

### 4. Without Filters
```json
{}
```

### 5. Custom Status
```json
{
  "targetStatus": "SERVING"
}
```

---

## 💡 Use Cases

### **Case 1: Call Center - เรียกคิวถัดไปตามลำดับ**
```json
{
  "profileId": "BANK-001",
  "serviceGroup": "COUNTER-A"
}
```
→ เรียกคิวถัดไปที่รออยู่ในเคาน์เตอร์ A

### **Case 2: VIP Fast Track - ข้ามไปยังคิว VIP**
```json
{
  "docNo": "Q1739702400999",
  "targetStatus": "SERVING"
}
```
→ ข้ามไปยังคิว VIP และเริ่มให้บริการทันที

### **Case 3: Emergency - ข้ามคิวฉุกเฉิน**
```json
{
  "docNo": "Q1739702400888",
  "targetStatus": "CALLING"
}
```
→ เรียกคิวฉุกเฉินทันที

### **Case 4: ลูกค้าเรียกจากแอพ - ระบุคิวเฉพาะ**
```json
{
  "docNo": "Q1739702400777"
}
```
→ เรียกคิวที่ลูกค้าเลือกเอง (จาก mobile app)

---

## ⚡ ข้อดีของการเปลี่ยนแปลง

1. **รองรับ null status** - ไม่พลาดคิวที่ไม่ได้กำหนดสถานะ
2. **ข้ามคิวได้** - รองรับ VIP, ฉุกเฉิน, หรือ fast track
3. **ยืดหยุ่น** - ใช้งานได้หลายสถานการณ์
4. **Error Handling** - ตรวจสอบสถานะก่อน update
5. **Backward Compatible** - ไม่ระบุ docNo ก็ยังใช้งานแบบเดิมได้

---

## 🔍 เปรียบเทียบก่อนและหลัง

### ❌ **ก่อนแก้ไข**

**การค้นหา:**
```sql
WHERE status IN ('WAITING', 'WAIT', 'WAIT_TABLE', 'PENDING')
```
→ คิวที่มี status = `null` จะไม่ถูกค้นหา

**การใช้งาน:**
- เรียกคิวถัดไปเท่านั้น
- ไม่สามารถข้ามไปยังคิวเฉพาะได้

### ✅ **หลังแก้ไข**

**การค้นหา:**
```sql
WHERE (status IS NULL OR status IN ('WAITING', 'WAIT', 'WAIT_TABLE', 'PENDING'))
```
→ รวมคิวที่มี status = `null` ด้วย

**การใช้งาน:**
- เรียกคิวถัดไป (แบบเดิม)
- **ข้ามไปยังคิวเฉพาะได้** (ใหม่)
- **ตรวจสอบสถานะก่อน update** (ใหม่)

---

## 🎉 สรุป

การอัปเดตนี้ทำให้:
- ✅ รองรับคิวที่มี `status = null`
- ✅ สามารถข้ามไปยังคิวเฉพาะได้ด้วย `docNo`
- ✅ ตรวจสอบสถานะก่อน update เพื่อความปลอดภัย
- ✅ มี error handling ที่ชัดเจน
- ✅ ยังคง backward compatible

**พร้อมใช้งานแล้ว!** 🚀

---

**อัปเดตเมื่อ:** 2026-02-16  
**Version:** 3.0.0
