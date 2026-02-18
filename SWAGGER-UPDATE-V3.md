# 📚 Swagger Documentation Update V3.0

## ✅ สรุปการอัปเดต

อัปเดต Swagger documentation เพื่อสะท้อนการเปลี่ยนแปลงล่าสุด:
1. เพิ่มฟีเจอร์ Queue Skipping ด้วย `docNo`
2. รองรับ `null` status ในการค้นหาคิว
3. เพิ่ม Response examples ที่ครบถ้วนกว่า
4. เพิ่ม Error examples แบบละเอียด

---

## 📁 ไฟล์ที่แก้ไข (2 ไฟล์)

### 1. [`staff-console.controller.ts`](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\src\modules\queue\staff-console.controller.ts)
- อัปเดท `@ApiOperation` description
- เพิ่ม example "Skip to Specific Queue (docNo)" ใน `@ApiBody`
- เพิ่ม Response examples 4 กรณี
- เพิ่ม Error examples 3 กรณี

### 2. [`call-next.dto.ts`](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\src\modules\queue\dto\call-next.dto.ts)
- เพิ่มคำอธิบายละเอียดใน class comments
- อัปเดทคำอธิบายของแต่ละ field
- เพิ่ม usage examples ใน class documentation

---

## 🎨 Swagger UI - Request Examples

### **5 ตัวอย่าง Request:**

#### 1. **Skip to Specific Queue (docNo)** ✨ ใหม่!
```json
{
  "docNo": "Q1739702400000",
  "targetStatus": "CALLING"
}
```
**Use Case:** ข้ามไปยังคิวเฉพาะ (VIP, Emergency, Fast Track)

---

#### 2. **With All Parameters**
```json
{
  "profileId": "TEST-PROFILE-001",
  "serviceGroup": "Q-TEST-001",
  "targetStatus": "CALLING"
}
```
**Use Case:** เรียกคิวถัดไปพร้อมกรองตาม profile และ service group

---

#### 3. **With Filters Only**
```json
{
  "profileId": "TEST-PROFILE-001",
  "serviceGroup": "Q-TEST-001"
}
```
**Use Case:** เรียกคิวถัดไป (ใช้ default status = CALLING)

---

#### 4. **Without Filters**
```json
{}
```
**Use Case:** เรียกคิวถัดไปทั้งหมด (ไม่กรอง)

---

#### 5. **Custom Status**
```json
{
  "targetStatus": "SERVING"
}
```
**Use Case:** เรียกคิวและเริ่มให้บริการทันที

---

## 📤 Swagger UI - Response Examples

### ✅ **Success Responses (200 OK)**

#### **1. Success - Next Queue (Auto)** 🔄
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
**Description:** เรียกคิวถัดไปอัตโนมัติ (ไม่ระบุ docNo)

---

#### **2. Success - Skip to Specific Queue** 🎯 ใหม่!
```json
{
  "success": true,
  "message": "เรียกคิวสำเร็จ",
  "queue": {
    "docNo": "Q1739702400999",
    "queueNo": 15,
    "customerName": "คุณมานี VIP",
    "tel": "082-222-2222",
    "status": "SERVING",
    "queueType": "Q-VIP-001",
    "data": {
      "serviceGroup": "Q-VIP-001",
      "profileId": "TEST-PROFILE-001",
      "category": "VIP",
      "priority": "HIGH"
    }
  }
}
```
**Description:** ข้ามไปยังคิวเฉพาะด้วย docNo

---

#### **3. Success - Queue with null status** ✨ ใหม่!
```json
{
  "success": true,
  "message": "เรียกคิวสำเร็จ",
  "queue": {
    "docNo": "Q1739702400123",
    "queueNo": 8,
    "customerName": "คุณสมหญิง ยิ้มแย้ม",
    "tel": "083-333-3333",
    "status": "CALLING",
    "queueType": "Q-TEST-001",
    "data": {
      "serviceGroup": "Q-TEST-001",
      "profileId": "TEST-PROFILE-001"
    }
  }
}
```
**Description:** เรียกคิวที่มี status = null สำเร็จ

---

#### **4. No Queue Available** ⚠️
```json
{
  "success": false,
  "message": "ไม่มีคิวที่รออยู่",
  "queue": null
}
```
**Description:** ไม่พบคิวที่รออยู่ในระบบ

---

### ❌ **Error Responses (400 Bad Request)**

#### **1. Queue Not Found** 🔍
```json
{
  "statusCode": 400,
  "message": "Queue with docNo Q9999999999 not found",
  "error": "Bad Request"
}
```
**Description:** ไม่พบคิวที่ระบุ docNo

---

#### **2. Invalid Queue Status** 🚫
```json
{
  "statusCode": 400,
  "message": "Cannot call queue with status: COMPLETED. Allowed statuses: WAITING, WAIT, WAIT_TABLE, PENDING, or null",
  "error": "Bad Request"
}
```
**Description:** คิวมีสถานะที่ไม่สามารถเรียกได้

**Allowed Statuses:**
- `null` ✨
- `WAITING`
- `WAIT`
- `WAIT_TABLE`
- `PENDING`

**Not Allowed:**
- `CALLING`
- `SERVING`
- `COMPLETED`
- `CANCELLED`
- อื่นๆ

---

#### **3. General Error** ⚡
```json
{
  "statusCode": 400,
  "message": "Failed to call next queue",
  "error": "Bad Request"
}
```
**Description:** ข้อผิดพลาดทั่วไป

---

## 📖 DTO Documentation Updates

### **CallNextQueueDto** (Request DTO)

เพิ่มคำอธิบาย:
```typescript
/**
 * DTO for Call Next Queue Request
 * 
 * This DTO supports two modes:
 * 1. Auto mode (no docNo): Automatically find the next waiting queue
 * 2. Skip mode (with docNo): Skip to a specific queue by document number
 * 
 * @example Auto mode - Call next queue
 * {
 *   profileId: 'TEST-PROFILE-001',
 *   serviceGroup: 'Q-TEST-001',
 *   targetStatus: 'CALLING'
 * }
 * 
 * @example Skip mode - Jump to specific queue
 * {
 *   docNo: 'Q1739702400000',
 *   targetStatus: 'SERVING'
 * }
 */
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `docNo` | string | No | Document number สำหรับข้ามคิว (ถ้ามีจะไม่ค้นหาคิวถัดไป) |
| `profileId` | string | No | กรองตาม Profile ID (ใช้เฉพาะเมื่อไม่มี docNo) |
| `serviceGroup` | string | No | กรองตาม Service Group (ใช้เฉพาะเมื่อไม่มี docNo) |
| `targetStatus` | string | No | สถานะที่ต้องการเปลี่ยน (default: CALLING) |

---

### **CallNextQueueResponseDto** (Response DTO)

เพิ่มคำอธิบาย:
```typescript
/**
 * DTO for Call Next Queue Response
 * 
 * Success response includes:
 * - success: true
 * - message: Success message in Thai
 * - queue: Queue details (QueueResponseDto)
 * 
 * No queue available response:
 * - success: false
 * - message: "ไม่มีคิวที่รออยู่"
 * - queue: null
 * 
 * Error response (400):
 * - statusCode: 400
 * - message: Error description
 * - error: "Bad Request"
 */
```

---

## 🎯 Swagger UI Features

### **เพิ่มใหม่:**

1. ✅ **5 Request Examples** - ครอบคลุมทุก use case
2. ✅ **4 Success Response Examples** - รวม queue skipping และ null status
3. ✅ **3 Error Response Examples** - แสดงทุก error case
4. ✅ **Detailed Field Descriptions** - คำอธิบายละเอียดของแต่ละ field
5. ✅ **Usage Examples in Comments** - ตัวอย่างการใช้งานใน DTO class

---

## 🔍 ทดสอบใน Swagger UI

### ขั้นตอน:

1. **เปิด Swagger UI:**
   ```
   http://localhost:3000/api/docs
   ```

2. **หา endpoint:**
   ```
   POST /api/staff/console/call-next
   ```

3. **ดู Documentation:**
   - อ่านคำอธิบาย API
   - ดูตัวอย่าง Request ทั้ง 5 แบบ
   - ดูตัวอย่าง Response ทั้ง 7 กรณี

4. **ทดสอบ API:**
   - คลิก "Try it out"
   - เลือกตัวอย่างจาก dropdown
   - แก้ไขค่าตามต้องการ
   - คลิก "Execute"
   - ดูผลลัพธ์

---

## 📊 เปรียบเทียบ Swagger V2 vs V3

### ❌ **V2 (เดิม)**

**Request Examples:** 4 แบบ
- With All Parameters
- With Filters Only
- Without Filters
- Custom Status

**Response Examples:** 2 กรณี
- Queue Found
- No Queue Available

**Error Examples:** ไม่มี (แค่ description)

---

### ✅ **V3 (ใหม่)**

**Request Examples:** 5 แบบ
- **Skip to Specific Queue (docNo)** ← ใหม่!
- With All Parameters
- With Filters Only
- Without Filters
- Custom Status

**Response Examples:** 4 กรณี
- Success - Next Queue (Auto)
- **Success - Skip to Specific Queue** ← ใหม่!
- **Success - Queue with null status** ← ใหม่!
- No Queue Available

**Error Examples:** 3 กรณี ← ใหม่!
- Queue Not Found
- Invalid Queue Status
- General Error

**DTO Documentation:** มีคำอธิบายละเอียดและตัวอย่างการใช้งาน ← ใหม่!

---

## 💡 ข้อดีของการอัปเดต

1. ✅ **ครบถ้วน** - ครอบคลุมทุก feature ที่เพิ่มมา
2. ✅ **ชัดเจน** - มีตัวอย่างและคำอธิบายละเอียด
3. ✅ **ใช้งานง่าย** - Developer เข้าใจได้ทันทีจากตัวอย่าง
4. ✅ **Error Handling** - แสดง error cases ทั้งหมด
5. ✅ **Professional** - เอกสารมีคุณภาพสูง

---

## 🎓 สำหรับ Developer

### **Frontend Developer:**
- ดูตัวอย่าง Request/Response ได้ครบ
- รู้ว่าต้องส่งข้อมูลอะไรบ้าง
- เห็น error cases และจัดการได้

### **Backend Developer:**
- เข้าใจ API logic ได้ง่าย
- มีตัวอย่างสำหรับทดสอบ
- ดู API spec ได้ชัดเจน

### **QA/Tester:**
- ทดสอบ API ได้ทันทีใน Swagger UI
- มี test cases ครบถ้วน
- ตรวจสอบ error handling

---

## 🚀 การใช้งาน

### **1. ดู API Documentation:**
```
http://localhost:3000/api/docs
```

### **2. Export OpenAPI Spec:**
```
http://localhost:3000/api/docs-json
```

### **3. Generate API Client:**
ใช้ OpenAPI Generator เพื่อสร้าง client code:
```bash
openapi-generator-cli generate \
  -i http://localhost:3000/api/docs-json \
  -g typescript-axios \
  -o ./generated-client
```

---

## 📚 เอกสารที่เกี่ยวข้อง

- [CALL-NEXT-README.md](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\CALL-NEXT-README.md) - คู่มือการใช้งาน Call Next API
- [UPDATE-TARGET-STATUS.md](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\UPDATE-TARGET-STATUS.md) - การอัปเดต targetStatus parameter
- [UPDATE-QUEUE-SKIP.md](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\UPDATE-QUEUE-SKIP.md) - การเพิ่ม Queue Skipping feature
- [SWAGGER-UPDATE.md](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\SWAGGER-UPDATE.md) - Swagger update V1
- [SWAGGER-SUMMARY-TH.md](file://d:\AdaQueue\New%20folder\AdaQueue-Backend\SWAGGER-SUMMARY-TH.md) - สรุป Swagger ภาษาไทย

---

## ✨ สรุป

การอัปเดต Swagger V3 นี้ทำให้:
- ✅ **เอกสารครบถ้วน** - ครอบคลุมทุก feature
- ✅ **มีตัวอย่างครบ** - Request/Response/Error
- ✅ **ใช้งานง่าย** - ทดสอบได้ทันทีใน Swagger UI
- ✅ **Professional** - คุณภาพระดับ production

**พร้อมใช้งานแล้ว!** 🎉

เปิด `http://localhost:3000/api/docs` เพื่อดู Swagger documentation ที่อัปเดตแล้ว

---

**อัปเดตเมื่อ:** 2026-02-16  
**Version:** 3.0.0
