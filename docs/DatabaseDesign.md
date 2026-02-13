
# DatabaseDesign.md  
## Database Schema Explanation

---

## 🗺️ zones

เก็บข้อมูลเขต / ตำบล / โซนการเผา

**ใช้สำหรับ:**

- ระบุพื้นที่การเผา
- เก็บ Boundary (Polygon)
- เชื่อมกับ weather / burn limits / requests

**Field สำคัญ:**

- boundary → ใช้ชนิด POLYGON (Spatial Data)
- area_rai → พื้นที่รวม

---

## 🌤️ weather_forecast

เก็บข้อมูลพยากรณ์อากาศรายวันต่อเขต

**ใช้สำหรับ:**

- ระบุว่าวันนั้นเผาได้หรือไม่ (`is_burnable`)
- ใช้เป็น constraint ใน optimizer

---

## 🌫️ daily_burn_limits

ข้อจำกัดจำนวนไร่สูงสุดที่เผาได้ต่อวัน / เขต

**ใช้สำหรับ:**

- ควบคุมผลกระทบคุณภาพอากาศ
- Constraint หลักของ optimization

---

## 🚒 teams

ข้อมูลทีมเจ้าหน้าที่ไฟป่า

**ใช้สำหรับ:**

- Assignment / Scheduling
- Resource allocation

---

## 📅 team_availability

ระบุว่าวันไหนทีมไหนพร้อมทำงาน

**ใช้สำหรับ:**

- Constraint → 1 ทีม / 1 งาน / วัน

---

## 📄 burn_requests

คำขออนุญาตเผา

**ใช้สำหรับ:**

- ระบุพื้นที่เผาที่เป็นไปได้
- Constraint → เผาได้เฉพาะ Approved

**Field สำคัญ:**

- location → POINT (Spatial Data)
- area_rai → พื้นที่เผา

---

## 🧠 optimization_plans

เก็บผลลัพธ์การ Optimize แต่ละครั้ง

**ใช้สำหรับ:**

- Tracking / Audit
- วิเคราะห์ประสิทธิภาพ

---

## 📊 plan_assignments

รายละเอียดแผนเผารายวัน

**ใช้สำหรับ:**

- ตารางงานจริง
- Dashboard / Reporting

---

## 🔗 Relationship Overview

zones  
 ↳ weather_forecast  
 ↳ daily_burn_limits  
 ↳ burn_requests  

teams  
 ↳ team_availability  

optimization_plans  
 ↳ plan_assignments  

---

## 🚀 Future Extensions

สามารถเพิ่ม:

- Smoke / PM2.5 Table
- Logistics / Distance Cost
- Multi-day Operations
- Risk Model
