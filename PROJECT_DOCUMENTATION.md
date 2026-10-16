# 🏋️ Gym Management API — Project Documentation

เอกสารฉบับนี้จัดทำขึ้นเพื่อวิเคราะห์ สรุปโครงสร้าง และอธิบายสถาปัตยกรรมการทำงานของระบบ **Gym Management API** สำหรับผู้พัฒนาและผู้ดูแลระบบ โดยครอบคลุมทั้งภาพรวม ภาพโครงสร้างไฟล์ ระบบการทำงานหลัก คู่มือการติดตั้ง และแนวทางการพัฒนาต่อในอนาคต

---

## 1. ภาพรวมโครงการ (Project Overview)

### 🎯 วัตถุประสงค์หลักของระบบ
**Gym Management API** เป็นระบบหลังบ้าน (Backend RESTful API) สำหรับบริหารจัดการธุรกิจยิมและฟิตเนสแบบครบวงจร ออกแบบมาเพื่อรองรับการทำงานของพนักงานหน้าร้าน (Staff) และผู้ดูแลระบบ (Admin) โดยมีจุดมุ่งหมายหลักดังนี้:
1. **ระบบบริหารสมาชิก (Member Management):** จัดการข้อมูลสมาชิก ออกบัตรสแกนบาร์โค้ด/QR Code และคำนวณวันหมดอายุ/จำนวนครั้งการใช้งานอัตโนมัติ
2. **ระบบสแกนเข้าใช้บริการ (Scan Check-in):** ตรวจสอบสิทธิ์การเข้ายิมแบบเรียลไทม์ พร้อมระบบป้องกันการสแกนซ้ำซ้อน (**Anti-Passback Logic**) 
3. **ระบบการเงินและรับชำระเงิน (Payments & Multi-Currency):** รับชำระเงินค่าแพ็กเกจและสินค้า รองรับหลายสกุลเงิน (LAK, THB, USD) ทั้งเงินสด (Cash) และ QR Code พร้อมคำนวณเงินทอนและอัปเดตสถานะสมาชิกทันที
4. **ระบบขายสินค้าหน้าร้านและคลังสินค้า (POS & Inventory):** รองรับการขายสินค้า/อาหารเสริม สแกนบาร์โค้ด และตัดสต็อกสินค้าแบบอัตโนมัติ
5. **ระบบบริหารรายจ่ายหน้าร้าน (Petty Cash & Expense):** ติดตามรายจ่ายย่อยของยิม (ค่าน้ำ, ค่าไฟ, อุปกรณ์, ซ่อมบำรุง)
6. **ระบบรายงานวิเคราะห์ผลประกอบการ (Financial & Member Analytics):** สรุปรายรับ รายจ่าย กำไร-ขาดทุน และสถิติการใช้งานยิมตามช่วงเวลา
7. **ระบบจัดเก็บสื่อบนคลาวด์ (Cloud Storage Integration):** จัดเก็บรูปภาพสมาชิกและรูปสินค้าบน **Supabase Storage** พร้อมกลไกการลบไฟล์อัตโนมัติเพื่อประหยัดพื้นที่

---

### 🛠️ Tech Stack & เครื่องมือที่ใช้

| หมวดหมู่ | เทคโนโลยี / เครื่องมือ | รายละเอียด |
| :--- | :--- | :--- |
| **Language** | TypeScript 5.x / 6.x | พัฒนาด้วย Strict Type Safety เพื่อลดข้อผิดพลาดในระดับ Compile-time |
| **Framework** | NestJS v12 | สถาปัตยกรรม Modular Architecture, Dependency Injection และ Decorator-driven |
| **Runtime** | Node.js | เอนจินสำหรับการประมวลผลเซิร์ฟเวอร์ |
| **Database** | PostgreSQL | ฐานข้อมูลเชิงสัมพันธ์ประสิทธิภาพสูง (Relational Database) โฮสต์บน **Supabase** |
| **Connection Pooler** | PgBouncer / `@prisma/adapter-pg` | รองรับการเชื่อมต่อแบบ Transaction & Session pooling บนคลาวด์ |
| **ORM** | Prisma ORM v7 | Object-Relational Mapping สำหรับจัดการ Schema, Migrations และ Type-safe Database Queries |
| **Authentication** | JWT (`@nestjs/jwt`, `passport-jwt`) | ระบบยืนยันตัวตนแบบ Stateless Token พร้อม Role-based Access Control (RBAC) |
| **Security** | Bcrypt | เข้ารหัสผ่าน (Salt & Hashing) สำหรับผู้ใช้งานและพนักงาน |
| **Data Validation** | `class-validator`, `class-transformer` | ตรวจสอบและแปลงรูปแบบข้อมูล DTO (Request Body, Query Params) โดยอัตโนมัติ |
| **File Storage** | Supabase Storage (`@supabase/supabase-js`) | จัดเก็บรูปภาพโปรไฟล์สมาชิกและรูปภาพสินค้าบน Object Storage Bucket |
| **Local Uploads** | Multer (`@nestjs/platform-express`) | จัดการการอัปโหลดไฟล์แบบ Multipart/Form-data และ Memory Storage |
| **Observability** | `@nestjs/observe` | ตรวจจับ Tracing, Error Telemetry, และ Application Performance Monitoring |
| **Code Quality** | Oxlint, Prettier | เครื่องมือ Linter และ Code Formatter ความเร็วสูง |

---

## 2. โครงสร้างไฟล์ (Project Structure)

### 🌲 โครงสร้างไดเรกทอรีหลัก (Tree View)

```text
d:/BE-api/api-web/
├── prisma/
│   └── schema.prisma            # นิยาม Database Schema, Enums และ Relations ทั้งหมด
├── src/
│   ├── app.controller.ts        # Health check และ Default Controller
│   ├── app.module.ts            # Root Module ที่รวบรวม Module ทั้งหมดในระบบ
│   ├── app.service.ts           # Root Service
│   ├── main.ts                  # จุดเริ่มต้น Application (Bootstrap, CORS, Pipes, Static Assets)
│   ├── auth/                    # ระบบยืนยันตัวตน (Authentication & Authorization)
│   │   ├── auth.controller.ts   # Route สำหรับ Login และ Get Profile (/auth/login, /auth/me)
│   │   ├── auth.module.ts       # โมดูลลงทะเบียน JWT และ Passport
│   │   ├── auth.service.ts      # Logic การตรวจสอบ Password และการสร้าง Access Token
│   │   ├── decorators/          # Custom Decorators (@Roles, @Public)
│   │   ├── guards/              # Custom Guards (JwtAuthGuard, RolesGuard)
│   │   └── strategies/          # Passport Strategy (JwtStrategy)
│   ├── users/                   # ระบบจัดการผู้ใช้และพนักงาน (Admin, Staff)
│   ├── members/                 # ระบบจัดการสมาชิก, สแกน Check-in, อัปโหลดรูปภาพ
│   ├── packages/                # ระบบแพ็กเกจยิม (รายวัน, รายเดือน, คูปองจำนวนครั้ง)
│   ├── products/                # ระบบสินค้า, การสแกนบาร์โค้ด, การตัดสต็อกสินค้า
│   ├── payments/                # ระบบบันทึกการชำระเงิน, คำนวณเงินหลายสกุล, การต่ออายุสมาชิก
│   ├── expenses/                # ระบบบันทึกรายจ่ายและเงินสดย่อย
│   ├── reports/                 # ระบบรายงานทางการเงิน กำไร-ขาดทุน และสถิติ Check-in
│   └── prisma/                  # Prisma Module & PrismaService แบบ Global Provider
├── uploads/                     # โฟลเดอร์สำรองสำหรับ Local File Storage (Members & Products)
├── api-endpoints.json           # Postman Collection v2.1.0 พร้อมตัวแปร Environment และ Test Script
├── package.json                 # รายการ Dependencies, Scripts และ Config ของโปรเจกต์
├── prisma7.config.ts            # การตั้งค่า Prisma CLI v7 สำหรับ Migration และ Seeding
└── tsconfig.json                # TypeScript Compiler Configuration
```

### 📋 คำอธิบายหน้าที่ของแต่ละโมดูลหลัก

| โมดูล (Module) | หน้าที่และความรับผิดชอบหลัก |
| :--- | :--- |
| **`AuthModule`** | จัดการการเข้าสู่ระบบของพนักงานด้วยเบอร์โทรศัพท์และรหัสผ่าน การออก JSON Web Token (JWT) และการป้องกัน Endpoint ด้วย Guard |
| **`UsersModule`** | จัดการข้อมูลพนักงานและผู้ดูแลระบบ (เพิ่ม, แก้ไข, ลบ, แสดงรายชื่อ) จำกัดสิทธิ์เฉพาะผู้ใช้ระดับ `ADMIN` |
| **`MembersModule`** | จัดการฐานข้อมูลสมาชิก, บันทึกรูปภาพ (Supabase Storage), รหัสสมาชิก (Unique Card Code), ตรวจสอบวันหมดอายุ และระบบสแกนเช็กอิน (**Anti-Passback**) |
| **`PackagesModule`** | จัดการราคาและเงื่อนไขของแพ็กเกจ เช่น จำนวนวันเปิดใช้งาน (`durationDays`) และจำนวนครั้งที่เข้าได้ (`sessions`) |
| **`ProductsModule`** | จัดการสินค้าหน้าร้าน (บาร์โค้ด, ราคาต้นทุน, ราคาขาย, จำนวนในสต็อก, หมวดหมู่, รูปภาพสินค้า) |
| **`PaymentsModule`** | แกนกลางการบันทึกการเงิน: รับชำระเงินหลายสกุล, คำนวณอัตราแลกเปลี่ยน, ตัดสต็อกสินค้าอัตโนมัติ และต่ออายุสมาชิกแบบ Transaction Atomic |
| **`ExpensesModule`** | บันทึกรายจ่ายของยิม แบ่งตามหมวดหมู่ (ค่าน้ำ, ค่าไฟ, อุปกรณ์, เบ็ดเตล็ด) และแนบรูปใบเสร็จ |
| **`ReportsModule`** | ประมวลผลข้อมูลสรุป: รายรับรวม, รายจ่ายรวม, กำไรสุทธิ, สัดส่วนการชำระเงิน (CASH vs QR) และสถิติความถี่ในการเข้าใช้บริการของสมาชิก |
| **`PrismaModule`** | Global Database Provider ที่ให้บริการ `PrismaService` เชื่อมต่อฐานข้อมูล PostgreSQL แก่ทุกโมดูลในระบบ |

---

## 3. ฟังก์ชันและระบบหลัก (Key Features & Core Architecture)

```mermaid
flowchart TD
    Client([Client: Web POS / Mobile / Front Desk])
    
    subgraph NestJS App
        Main[main.ts / Validation & CORS] --> AppMod[AppModule]
        AppMod --> AuthMod[Auth & Guards]
        
        AuthMod --> MemberMod[Members Module]
        AuthMod --> ProductMod[Products Module]
        AuthMod --> PaymentMod[Payments Module]
        AuthMod --> ExpenseMod[Expenses Module]
        AuthMod --> ReportMod[Reports Module]
        
        PaymentMod -->|Auto-Deduct Stock| ProductMod
        PaymentMod -->|Auto-Renew Package| MemberMod
        
        MemberMod -.->|Delete/Upload Image| Storage[(Supabase Storage)]
        ProductMod -.->|Delete/Upload Image| Storage
        
        MemberMod --> Prisma[Prisma ORM Service]
        ProductMod --> Prisma
        PaymentMod --> Prisma
        ExpenseMod --> Prisma
        ReportMod --> Prisma
    end
    
    Prisma --> DB[(PostgreSQL Database)]
```

### 🧠 Logic การทำงานสำคัญในแต่ละระบบ

#### 1. ระบบยืนยันตัวตนและการควบคุมสิทธิ์ (Auth & RBAC)
- พนักงานล็อกอินผ่านเบอร์โทรศัพท์และรหัสผ่าน (`phone` + `password`)
- รหัสผ่านถูกเข้ารหัสและตรวจสอบด้วย **Bcrypt**
- เมื่อยืนยันถูกต้อง ระบบจะออก **JWT Access Token** ที่แนบข้อมูล `{ sub: id, phone, role }`
- ควบคุมการเข้าถึงด้วย `@UseGuards(JwtAuthGuard, RolesGuard)` และ Decorator `@Roles(Role.ADMIN)`

#### 2. ระบบสแกนเช็กอินสมาชิกและ Anti-Passback (Member Check-in)
เมื่อมีผู้สแกนเข้าใช้บริการ ระบบจะตรวจสอบเงื่อนไขตามลำดับดังนี้:
1. **Anti-Passback Check:** ตรวจสอบเวลาที่สแกนล่าสุด (`lastCheckIn`) หากสมาชิกเพิ่งสแกนไปไม่เกิน 1 นาที ระบบจะปฏิเสธการสแกนทันที เพื่อป้องกันการส่งบัตรใบเดียวให้ผู้อื่นสแกนซ้ำ
2. **Package Expiration Check:** ตรวจสอบว่าวันที่ปัจจุบันเกินกว่าวันหมดอายุของแพ็กเกจหรือไม่ (`expireDate < now`)
3. **Session Quota Check:** หากเป็นแพ็กเกจแบบนับจำนวนครั้ง (Session Package) ระบบจะตรวจสอบว่า `remainingSessions > 0` หรือไม่
4. **Action:** หากผ่านทุกเงื่อนไข ระบบจะบันทึกเวลา `lastCheckIn` เป็นปัจจุบัน และหักจำนวนครั้งคงเหลือลง 1 (`remainingSessions - 1`) พร้อมคำนวณจำนวนวันที่เหลือ (`remainingDays`) ส่งกลับไปให้หน้าบ้าน

#### 3. ระบบชำระเงินและตัดสต็อกสินค้าอัตโนมัติ (Payment Transaction Logic)
ทำงานภายใต้ `prisma.$transaction` เพื่อรับประกันความปลอดภัยของข้อมูล (Atomicity):
- **กรณีซื้อสินค้า (`productId`):** ระบบตรวจสอบสต็อกสินค้า หากมีสินค้าพร้อมขาย จะทำการสร้างใบเสร็จ และสั่ง **`decrement: 1`** ในตาราง Product โดยอัตโนมัติ
- **กรณีซื้อ/ต่ออายุแพ็กเกจ (`memberId` + `packageId`):**
  - หากแพ็กเกจมีกำหนดวัน (`durationDays`): ระบบจะนำวันหมดอายุเดิมมาทดต่อ (หรือนับจากวันปัจจุบันหากหมดอายุไปแล้ว)
  - หากแพ็กเกจมีโควต้าเข้าใช้งาน (`sessions`): ระบบจะบวกจำนวนครั้งเพิ่มเข้าไปใน `remainingSessions` ของสมาชิกทันที
- **Multi-Currency:** คำนวณยอดเงินที่ชำระตามอัตราแลกเปลี่ยน (`exchangeRate`), จำนวนเงินที่จ่ายจริง (`amountPaid`), และคำนวณเงินทอนเป็นกีบ (`changeLak`)

#### 4. ระบบจัดการไฟล์รูปภาพและ Cloud Storage Synchronization
- รองรับการอัปโหลดทั้งในรูปแบบ **Multipart Form-data** (ผ่าน Multer) และ **Base64 Data URL**
- ตั้งชื่อไฟล์ใหม่ด้วย UUID v4 เสมอ เพื่อป้องกันชื่อไฟล์ซ้ำกัน
- จัดเก็บลง Supabase Storage ใน Bucket `images`:
  - รูปสมาชิกจัดเก็บใน Folder: `members/{uuid}.jpg`
  - รูปสินค้าจัดเก็บใน Folder: `products/{uuid}.jpg`
- **Automatic Cleanup:** มีฟังก์ชัน `deletePhotoFromStorage` คอยตรวจสอบเมื่อมีการแก้ไขรูปภาพใหม่ หรือสั่งลบข้อมูลสมาชิก/สินค้า ระบบจะทำการลบไฟล์เดิมออกจาก Supabase Storage ทันที เพื่อไม่ให้เกิดไฟล์ขยะค้างในระบบ

---

### 📡 สรุปรายการ API Endpoints สำคัญ

| หมวดหมู่ | Method | Path | สิทธิ์การเข้าถึง | รายละเอียด |
| :--- | :---: | :--- | :---: | :--- |
| **Auth** | `POST` | `/auth/login` | Public | เข้าสู่ระบบ คืนค่า JWT Token |
| | `GET` | `/auth/me` | Logged In | ดึงข้อมูล Profile ของผู้ใช้งานปัจจุบัน |
| **Users** | `POST` | `/users` | `ADMIN` | สร้างผู้ใช้งาน/พนักงานใหม่ |
| | `GET` | `/users` | `ADMIN` | ดึงรายชื่อพนักงานทั้งหมด |
| | `GET` | `/users/:id` | Logged In | ดึงข้อมูลพนักงานตาม ID |
| | `PATCH` | `/users/:id` | `ADMIN` | อัปเดตข้อมูลพนักงาน |
| | `DELETE`| `/users/:id` | `ADMIN` | ลบพนักงานออกจากระบบ |
| **Members** | `POST` | `/members/check-in` | Logged In | สแกนบาร์โค้ดเข้าใช้งาน (Anti-Passback) |
| | `POST` | `/members` | Logged In | ลงทะเบียนสมาชิกใหม่ (แนบไฟล์รูปได้) |
| | `GET` | `/members` | Logged In | แสดงรายชื่อสมาชิกทั้งหมด |
| | `GET` | `/members/:id` | Logged In | ดึงข้อมูลสมาชิกตาม ID |
| | `PATCH` | `/members/:id` | Logged In | อัปเดตข้อมูลสมาชิก / อัปเดตรูปภาพ |
| | `DELETE`| `/members/:id` | `ADMIN` | ลบสมาชิก และลบรูปภาพใน Storage |
| **Packages**| `POST` | `/packages` | `ADMIN` | สร้างแพ็กเกจสมาชิกใหม่ |
| | `GET` | `/packages` | Logged In | แสดงรายการแพ็กเกจทั้งหมด |
| | `GET` | `/packages/:id`| Logged In | ดึงข้อมูลแพ็กเกจตาม ID |
| | `PATCH` | `/packages/:id`| `ADMIN` | แก้ไขข้อมูลแพ็กเกจ |
| | `DELETE`| `/packages/:id`| `ADMIN` | ลบแพ็กเกจ |
| **Products**| `POST` | `/products` | `ADMIN` | สร้างสินค้าใหม่ (แนบรูปภาพได้) |
| | `GET` | `/products` | Logged In | ค้นหาสินค้า (รองรับ `search`, `category`, `isActive`) |
| | `GET` | `/products/barcode/:barcode` | Logged In | ค้นหาสินค้าด้วยบาร์โค้ดสำหรับสแกนขาย |
| | `GET` | `/products/:id` | Logged In | ดึงข้อมูลสินค้าตาม ID |
| | `PATCH` | `/products/:id` | `ADMIN` | แก้ไขสินค้า / ปรับราคา / ปรับสต็อก |
| | `DELETE`| `/products/:id` | `ADMIN` | ลบสินค้า และลบรูปภาพใน Storage |
| **Payments**| `POST` | `/payments` | Logged In | รับชำระเงิน, ตัดสต็อก, อัปเดตแพ็กเกจสมาชิก |
| | `GET` | `/payments` | Logged In | ประวัติการรับชำระเงินทั้งหมด |
| | `GET` | `/payments/:id` | Logged In | ดูรายละเอียดใบเสร็จ |
| | `GET` | `/payments/revenue/total` | Logged In | สรุปยอดรายรับสะสมทั้งหมด |
| **Expenses**| `POST` | `/expenses` | Logged In | บันทึกรายจ่ายหน้าร้าน |
| | `GET` | `/expenses` | Logged In | รายการรายจ่ายทั้งหมด |
| | `GET` | `/expenses/expense/total` | Logged In | สรุปยอดรายจ่ายสะสมทั้งหมด |
| | `GET` | `/expenses/:id` | Logged In | ดูรายละเอียดรายจ่ายตาม ID |
| | `PATCH` | `/expenses/:id` | Logged In | แก้ไขรายการรายจ่าย |
| | `DELETE`| `/expenses/:id` | `ADMIN` | ลบรายการรายจ่าย |
| **Reports** | `GET` | `/reports/financial` | `ADMIN` | สรุปงบการเงิน กำไร-ขาดทุน (`startDate`, `endDate`) |
| | `GET` | `/reports/check-ins` | Logged In | รายงานสถิติสมาชิกและการสแกน Check-in |

---

## 4. การติดตั้งและใช้งาน (Setup & Installation Guide)

### 📋 สิ่งที่ต้องเตรียมก่อนติดตั้ง (Prerequisites)
- **Node.js:** เวอร์ชัน 18.x หรือ 20.x ขึ้นไป
- **npm** หรือ **yarn / pnpm**
- บัญชีฐานข้อมูล **PostgreSQL** หรือ **Supabase Project**
- **Git** สำหรับ Clone โปรเจกต์

---

### ⚙️ ขั้นตอนการตั้งค่า Environment Variables (`.env`)
สร้างไฟล์ `.env` ที่โฟลเดอร์รากของโปรเจกต์ (`api-web/.env`) โดยระบุค่าดังนี้:

```env
# พอร์ตการทำงานของเซิร์ฟเวอร์
PORT=3000

# คีย์สำหรับเข้ารหัส JSON Web Token
JWT_SECRET="your-super-secure-jwt-secret-key"

# การเชื่อมต่อฐานข้อมูล PostgreSQL ผ่าน PgBouncer (Transaction Mode)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# การเชื่อมต่อฐานข้อมูลโดยตรงสำหรับ Prisma Migration (Session Mode)
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# การตั้งค่าเชื่อมต่อ Supabase Storage
SUPABASE_URL="https://[your-project-ref].supabase.co"
SUPABASE_KEY="your-supabase-service-role-key-or-anon-key"
SUPABASE_BUCKET="images"
```

---

### 🚀 ขั้นตอนการติดตั้งและรันโปรเจกต์ (Installation & Run)

```bash
# 1. ติดตั้ง Dependencies ทั้งหมด
npm install

# 2. ทำการ Generate Prisma Client จาก Schema
npx prisma generate

# 3. ซิงค์ฐานข้อมูล (Database Migration)
npx prisma db push

# 4. รันโปรเจกต์ในโหมด Development (Hot-Reload)
npm run start:dev

# 5. Build โปรเจกต์สำหรับการใช้งานจริง (Production Build)
npm run build

# 6. รันเซิร์ฟเวอร์สำหรับ Production
npm run start:prod
```

เมื่อเซิร์ฟเวอร์เริ่มทำงานสำเร็จ จะพร้อมให้บริการที่: `http://localhost:3000`

---

## 5. สิ่งที่ควรพัฒนาต่อและข้อควรระวัง (Future Improvements & Notes)

### ⚠️ ข้อจำกัดและข้อควรระวังในโค้ดปัจจุบัน (Current Limitations)
1. **Hard Delete Data:** การลบสมาชิก (`Member`) หรือสินค้า (`Product`) ปัจจุบันเป็นการลบออกจากฐานข้อมูลโดยตรง (`prisma.delete`) ซึ่งหากมีข้อมูลเชื่อมโยงกับใบเสร็จในอดีต (`Payment`) อาจส่งผลกระทบต่อความสมบูรณ์ของรายงานย้อนหลัง
   - *คำแนะนำ:* ควรเปลี่ยนไปใช้ระบบ **Soft Delete** โดยเพิ่มฟิลด์ `isDeleted: Boolean` หรือใช้ `isActive: false` แทนการลบแถวข้อมูลจริง
2. **Payment Multi-Item Limitation:** ปัจจุบัน Model `Payment` รองรับการเชื่อมโยงสินค้าได้เพียง 1 รายการต่อ 1 การชำระเงิน (`productId Int?`) ซึ่งยังไม่รองรับการซื้อสินค้าหลายชิ้นพร้อมกันในตะกร้าเดียว
   - *คำแนะนำ:* ควรแยกตารางออกเป็น `Order` และ `OrderItem` เพื่อให้รองรับระบบ POS หน้าร้านที่สามารถซื้อสินค้าหลายรายการพร้อมกันได้
3. **Pagination & Performance:** Endpoint รายการขนาดใหญ่ เช่น `GET /members`, `GET /payments`, `GET /products` ในปัจจุบันดึงข้อมูลทั้งหมดออกมา (`findMany`) โดยไม่มีการแบ่งหน้า (Pagination)
   - *คำแนะนำ:* ควรเพิ่ม Query Parameters `page` และ `limit` (เช่น `take: 20, skip: (page-1)*20`) เพื่อป้องกันปัญหาหน่วยความจำเมื่อฐานข้อมูลมีขนาดใหญ่ขึ้น
4. **Race Condition ในการตัดสต็อก:** หากมีพนักงานหลายเครื่องทำรายการขายสินค้าชิ้นเดียวกันพร้อมกัน อาจเกิดปัญหาสต็อกติดลบ
   - *คำแนะนำ:* ควรใช้ Database Row Locking หรือตรวจสอบ `stock >= quantity` ภายในระดับ Query Atomic Update
5. **Config & Environment Hardcoding:** ในบาง Service มีค่า Fallback URL และ Bucket name ระบุไว้ในโค้ด
   - *คำแนะนำ:* ควรย้ายการอ่านค่า Config ทั้งหมดผ่าน `ConfigService` (`@nestjs/config`) เพื่อความเป็นระเบียบและปลอดภัยตามหลักการ 12-Factor App

---

### 🔮 ฟีเจอร์ที่แนะนำให้พัฒนาต่อยอดในอนาคต (Planned Features)
- [ ] **ระบบแจ้งเตือนผ่าน LINE Notify / WhatsApp / Telegram:** แจ้งเตือนเมื่อสมาชิกใกล้หมดอายุ หรือแจ้งเตือนยอดขายรายวันส่งตรงถึงเจ้าของยิม
- [ ] **ระบบสแกนใบหน้า (Face Recognition) หรือ Turnstile Gate Integration:** เชื่อมต่อ API ร่วมกับประตูปีกผีเสื้อ (Turnstile) เพื่อเปิดประตูอัตโนมัติเมื่อ Check-in ผ่าน
- [ ] **ระบบ Trainer & Class Booking:** เพิ่มระบบจองคอร์สเทรนเนอร์ส่วนตัว และจองคลาสออกกำลังกายกลุ่ม (Yoga, Boxing, Spinning)
- [ ] **Customer Portal (Mobile App / Web App):** เว็บไซต์สำหรับสมาชิกตรวจสอบจำนวนวันที่เหลือ ประวัติการเข้ายิม และต่ออายุสมาชิกออนไลน์ผ่าน Payment Gateway
