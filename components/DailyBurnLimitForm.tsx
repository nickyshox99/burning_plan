'use client';

import { useState, useEffect } from 'react';
import { DailyBurnLimit } from '@/types/daily-burn-limit';

interface DailyBurnLimitFormProps {
  limit: DailyBurnLimit;
  onSave: (limit: DailyBurnLimit) => void;
  onCancel: () => void;
}

export default function DailyBurnLimitForm({ limit, onSave, onCancel }: DailyBurnLimitFormProps) {
  const [formData, setFormData] = useState<DailyBurnLimit>(limit);

  useEffect(() => {
    setFormData(limit);
  }, [limit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.boundary || formData.boundary.length < 3) {
      alert('กรุณาปักจุดบนแผนที่อย่างน้อย 3 จุดเพื่อสร้าง boundary');
      return;
    }
    if (!formData.max_area_rai || formData.max_area_rai <= 0) {
      alert('กรุณากรอกจำนวนไร่สูงสุดที่เผาได้');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>
        {formData.id ? 'แก้ไขข้อจำกัด' : 'เพิ่มข้อจำกัดใหม่'}
      </h3>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
          จำนวนไร่สูงสุดที่เผาได้ *
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.max_area_rai || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              max_area_rai: e.target.value ? parseFloat(e.target.value) : 0,
            })
          }
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
          }}
          required
        />
      </div>

      <div style={{ marginBottom: '15px', fontSize: '12px', color: '#666' }}>
        <div style={{ marginBottom: '5px' }}>
          <strong>คำแนะนำ:</strong>
        </div>
        <div>1. คลิกบนแผนที่เพื่อปักจุด boundary</div>
        <div>2. ต้องปักอย่างน้อย 3 จุด</div>
        <div>3. คลิกจุดแรกอีกครั้งเพื่อปิด polygon</div>
        {formData.boundary && formData.boundary.length > 0 && (
          <div style={{ marginTop: '8px', color: '#007bff', fontWeight: '500' }}>
            ปักแล้ว {formData.boundary.length} จุด
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="submit"
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          บันทึก
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

