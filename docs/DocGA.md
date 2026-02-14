Population → Evaluate Fitness
          ↓
Selection (ไม่ใช่ Best Only)
          ↓
Crossover
          ↓
Mutation
          ↓
Constraint Repair / Validation
          ↓
Next Generation



// Constraint
✔ 1 ทีม = 1 zone ต่อวัน
✔ ต้องเป็น burnable day
✔ ต้องมีเจ้าหน้าที่รองรับ
✔ ต้องไม่ชน resource


// Fitness Function Score
------------------------------------------------------------------------------------------------------------------------------
Component	        Weight	    การคำนวณ
------------------------------------------------------------------------------------------------------------------------------
Burned area	        1.0	        ผลรวมพื้นที่ (ไร่) ที่ assign ได้
Zone distribution	0.5	        (จำนวน zone ที่ใช้ / จำนวน zone ทั้งหมด) × 100
Priority	        0.4	        ผลรวมน้ำหนักของ request ที่ถูก assign (ตอนนี้ใช้ 1 ต่อ request เพราะยังไม่มีคอลัมน์ priority)
Utilization	        0.3	        (จำนวน team-day ที่ใช้ / จำนวน team-day ที่ว่าง) × 100
------------------------------------------------------------------------------------------------------------------------------