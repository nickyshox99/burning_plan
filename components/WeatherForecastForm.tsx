'use client';

import { useState, useEffect } from 'react';
import { WeatherForecast } from '@/types/weather-forecast';

interface WeatherForecastFormProps {
  forecast: WeatherForecast;
  onSave: (forecast: WeatherForecast) => void;
  onCancel: () => void;
}

export default function WeatherForecastForm({ forecast, onSave, onCancel }: WeatherForecastFormProps) {
  const [formData, setFormData] = useState<WeatherForecast>(forecast);

  useEffect(() => {
    setFormData(forecast);
  }, [forecast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.boundary || formData.boundary.length < 3) {
      alert('กรุณาปักจุดบนแผนที่อย่างน้อย 3 จุดเพื่อสร้าง boundary');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>
        {formData.id ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}
      </h3>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
          <input
            type="checkbox"
            checked={formData.is_burnable}
            onChange={(e) => setFormData({ ...formData, is_burnable: e.target.checked })}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span>เผาได้ สภาพอากาศเปิด ฝนไม่ตก</span>
        </label>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
          อุณหภูมิ (°C)
        </label>
        <input
          type="number"
          step="0.1"
          value={formData.temperature || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              temperature: e.target.value ? parseFloat(e.target.value) : undefined,
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

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
          ความชื้น (%)
        </label>
        <input
          type="number"
          step="0.1"
          value={formData.humidity || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              humidity: e.target.value ? parseFloat(e.target.value) : undefined,
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

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
          ความเร็วลม (km/h)
        </label>
        <input
          type="number"
          step="0.1"
          value={formData.wind_speed || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              wind_speed: e.target.value ? parseFloat(e.target.value) : undefined,
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

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
          ดัชนีความเสี่ยง
        </label>
        <input
          type="number"
          step="0.1"
          value={formData.risk_index || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              risk_index: e.target.value ? parseFloat(e.target.value) : undefined,
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
        <div>1. คลิกบนแผนที่เพื่อปักจุด boundary</div>
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

