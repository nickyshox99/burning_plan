# Burning Plan Management System

ระบบวางแผนจัดการการเผาเพื่อทำแนวกันไฟ & ชิงเผาเชื้อเพลิงธรรมชาติ

## การติดตั้ง

1. ติดตั้ง dependencies:
```bash
npm install
```

2. สร้างไฟล์ `.env` จาก `.env.example` และแก้ไขค่าการเชื่อมต่อฐานข้อมูล:
```bash
cp .env.example .env
```

3. สร้างฐานข้อมูล MySQL และรัน schema:
```bash
# สร้างฐานข้อมูล
mysql -u root -p
CREATE DATABASE burning_plan;

# รัน schema
mysql -u root -p burning_plan < docs/enhanced_schema.sql

# (Optional) เพิ่มข้อมูลตัวอย่าง
mysql -u root -p burning_plan < docs/seed.sql
```

4. รัน development server:
```bash
npm run dev
```

5. เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

## ฟีเจอร์

- ✅ จัดการเขต (Zones) - เพิ่ม/แก้ไข/ลบ
- ✅ ปักจุดบนแผนที่เพื่อสร้าง Polygon boundary
- ✅ แสดงเขตทั้งหมดบนแผนที่
- ✅ เชื่อมต่อกับ MySQL database

## โครงสร้างโปรเจค

- `app/` - Next.js App Router pages และ API routes
- `components/` - React components
- `lib/` - Utility functions (database connection)
- `docs/` - เอกสารประกอบโปรเจค

