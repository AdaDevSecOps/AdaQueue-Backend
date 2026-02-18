# 📚 Swagger Documentation Update - Call Next Queue API

## ✅ สิ่งที่อัปเดต

### 1. สร้าง DTO Classes ใหม่
**File:** `src/modules/queue/dto/call-next.dto.ts`

#### **CallNextQueueDto** (Request DTO)
```typescript
{
  profileId?: string;      // Optional - Profile ID to filter
  serviceGroup?: string;   // Optional - Service Group to filter
}
```

#### **QueueResponseDto** (Queue Data)
```typescript
{
  docNo: string;           // Document number
  queueNo: number;         // Queue number
  customerName: string;    // Customer name
  tel: string;            // Telephone
  status: string;         // Queue status
  queueType: string;      // Queue type
  data?: any;             // Additional data
}
```

#### **CallNextQueueResponseDto** (Response DTO)
```typescript
{
  success: boolean;        // Operation success
  message: string;         // Response message
  queue: QueueResponseDto | null;  // Queue data or null
}
```

---

### 2. เพิ่ม Swagger Decorators ใน Controller

**File:** `src/modules/queue/staff-console.controller.ts`

#### ✨ เพิ่ม Tag
```typescript
@ApiTags('Staff Console')
@Controller('staff/console')
```

#### 🔹 API: `POST /staff/console/call-next`

**Decorators เพิ่ม:**
- `@ApiOperation` - อธิบายฟังก์ชัน API
- `@ApiBody` - กำหนด Request Body schema พร้อมตัวอย่าง
- `@ApiResponse` - กำหนด Response schema พร้อมตัวอย่าง 2 กรณี:
  - ✅ มีคิวพร้อมใช้งาน
  - ⚠️ ไม่มีคิว

#### 🔹 API: `GET /staff/console/actions`

**Decorators เพิ่ม:**
- `@ApiOperation` - อธิบายการดึงรายการ actions
- `@ApiQuery` - กำหนด query parameters (docNo, industry)
- `@ApiResponse` - กำหนด Response schema

#### 🔹 API: `POST /staff/console/execute`

**Decorators เพิ่ม:**
- `@ApiOperation` - อธิบายการ execute action
- `@ApiBody` - กำหนด Request Body schema
- `@ApiResponse` - กำหนด Response และ error cases

---

## 📖 วิธีเข้าถึง Swagger UI

### 1. รัน Backend Server
```bash
npm run dev
```

### 2. เปิด Swagger UI
```
http://localhost:3000/api/docs
```

---

## 🎯 Swagger Documentation Preview

### **POST /api/staff/console/call-next**

#### 📥 Request Body

**Schema:**
```json
{
  "profileId": "string (optional)",
  "serviceGroup": "string (optional)"
}
```

**Example 1 - With Filters:**
```json
{
  "profileId": "TEST-PROFILE-001",
  "serviceGroup": "Q-TEST-001"
}
```

**Example 2 - Without Filters:**
```json
{}
```

#### 📤 Response

**Schema:**
```json
{
  "success": "boolean",
  "message": "string",
  "queue": {
    "docNo": "string",
    "queueNo": "number",
    "customerName": "string",
    "tel": "string",
    "status": "string",
    "queueType": "string",
    "data": "object (optional)"
  }
}
```

**Example 1 - Queue Found (200 OK):**
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

**Example 2 - No Queue Available (200 OK):**
```json
{
  "success": false,
  "message": "ไม่มีคิวที่รออยู่",
  "queue": null
}
```

**Example 3 - Error (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Failed to call next queue",
  "error": "Bad Request"
}
```

---

## 🔍 ทดสอบผ่าน Swagger UI

### ขั้นตอนการทดสอบ:

1. **เปิด Swagger UI**: `http://localhost:3000/api/docs`

2. **หา endpoint**: `POST /api/staff/console/call-next`

3. **คลิก "Try it out"**

4. **กรอก Request Body**:
   ```json
   {
     "profileId": "TEST-PROFILE-001",
     "serviceGroup": "Q-TEST-001"
   }
   ```

5. **คลิก "Execute"**

6. **ดูผลลัพธ์** ใน Response section

---

## 📋 API Endpoints Summary

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| **POST** | `/api/staff/console/call-next` | Call next queue | `CallNextQueueDto` | `CallNextQueueResponseDto` |
| **GET** | `/api/staff/console/actions` | Get allowed actions | Query params | Actions list |
| **POST** | `/api/staff/console/execute` | Execute action | `{ docNo, action, industry }` | State change result |

---

## 🎨 Swagger Features

### ✅ ที่เพิ่มเข้ามา:

- 📝 **API Description** - คำอธิบายละเอียดของแต่ละ endpoint
- 📥 **Request Schema** - โครงสร้าง request body พร้อม validation
- 📤 **Response Schema** - โครงสร้าง response พร้อมตัวอย่าง
- 🎯 **Multiple Examples** - ตัวอย่างหลายกรณี (success/no queue/error)
- 🏷️ **Type Definitions** - DTO classes พร้อม ApiProperty decorators
- 📑 **API Tags** - จัดกลุ่ม API เป็น "Staff Console"
- ✔️ **Validation Rules** - ระบุ required/optional fields

---

## 🚀 การใช้งาน Swagger UI

### 1. Browse API Documentation
- เปิดดู API ทั้งหมดที่มี
- อ่านคำอธิบายและตัวอย่าง

### 2. Test API Directly
- ทดสอบ API ได้ทันทีใน Swagger UI
- ไม่ต้องใช้ Postman หรือ cURL

### 3. Generate API Client
- Export OpenAPI spec เพื่อ generate client code
- รองรับหลายภาษา (TypeScript, Java, Python, etc.)

---

## 📁 ไฟล์ที่เกี่ยวข้อง

### ไฟล์ที่สร้างใหม่ (1 ไฟล์)
- ✅ `src/modules/queue/dto/call-next.dto.ts` - DTO definitions

### ไฟล์ที่แก้ไข (1 ไฟล์)
- ✅ `src/modules/queue/staff-console.controller.ts` - เพิ่ม Swagger decorators

---

## 💡 Tips

### ใช้ Swagger UI เพื่อ:
1. **Document API** - เอกสารอัตโนมัติจากโค้ด
2. **Test API** - ทดสอบได้ทันทีโดยไม่ต้องเขียนโค้ด
3. **Share with Team** - แชร์เอกสาร API กับทีม
4. **Generate Client** - สร้าง API client code อัตโนมัติ

---

## 🔗 Useful Links

- **Swagger UI**: `http://localhost:3000/api/docs`
- **API Base URL**: `http://localhost:3000/api`
- **OpenAPI JSON**: `http://localhost:3000/api/docs-json`

---

## ✨ Summary

การอัปเดตนี้ทำให้:
- ✅ API documentation ครบถ้วนและชัดเจน
- ✅ มี request/response examples หลายกรณี
- ✅ ทดสอบ API ได้ง่ายขึ้นผ่าน Swagger UI
- ✅ เข้าใจ API structure ได้เร็วขึ้น
- ✅ Frontend developer สามารถดู API spec ได้ทันที

---

**อัปเดตเมื่อ:** 2026-02-16  
**Version:** 1.0.0
