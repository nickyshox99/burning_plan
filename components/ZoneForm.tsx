'use client';

import { useState, useEffect } from 'react';
import { Zone } from '@/types/zone';

interface ZoneFormProps {
  zone: Zone;
  onSave: (zone: Zone) => void;
  onCancel: () => void;
}

export default function ZoneForm({ zone, onSave, onCancel }: ZoneFormProps) {
  const [formData, setFormData] = useState<Zone>(zone);

  useEffect(() => {
    setFormData(zone);
  }, [zone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('กรุณากรอกชื่อเขต');
      return;
    }
    if (!formData.boundary || formData.boundary.length < 3) {
      alert('กรุณาปักจุดบนแผนที่อย่างน้อย 3 จุดเพื่อสร้าง polygon');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>
        {formData.id ? 'แก้ไขเขต' : 'เพิ่มเขตใหม่'}
      </h3>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
          ชื่อเขต *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
          อธิบายพื้นที่สั้นๆ
        </label>
        <input
          type="text"
          value={formData.province || ''}
          onChange={(e) => setFormData({ ...formData, province: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
          พื้นที่ (ไร่)
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.area_rai || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              area_rai: e.target.value ? parseFloat(e.target.value) : undefined,
            })
          }
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ marginBottom: '15px', fontSize: '12px', color: '#666' }}>
        <div style={{ marginBottom: '5px' }}>
          <strong>คำแนะนำ:</strong>
        </div>
        <div>1. คลิกบนแผนที่เพื่อปักจุด</div>
        <div>2. ต้องปักอย่างน้อย 3 จุด</div>
        <div>3. คลิกจุดแรกอีกครั้งเพื่อปิด polygon</div>
        {formData.boundary && formData.boundary.length > 0 && (
          <div style={{ marginTop: '8px', color: '#007bff' }}>
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

