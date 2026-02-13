'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { DailyBurnLimit } from '@/types/daily-burn-limit';
import DailyBurnLimitList from '@/components/DailyBurnLimitList';
import DailyBurnLimitForm from '@/components/DailyBurnLimitForm';
import DatePicker from '@/components/DatePicker';

// Dynamically import Map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/DailyBurnLimitMap'), {
  ssr: false,
});

export default function DailyBurnLimitsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [limits, setLimits] = useState<DailyBurnLimit[]>([]);
  const [selectedLimit, setSelectedLimit] = useState<DailyBurnLimit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyTargetDate, setCopyTargetDate] = useState<string>('');
  const [zones, setZones] = useState<any[]>([]);

  useEffect(() => {
    fetchLimits();
    fetchZones();
  }, [selectedDate]);

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/zones');
      const data = await response.json();
      setZones(data.zones || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const fetchLimits = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/daily-burn-limits?date=${selectedDate}`);
      const data = await response.json();
      setLimits(data.limits || []);
    } catch (error) {
      console.error('Error fetching daily burn limits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLimitSelect = (limit: DailyBurnLimit) => {
    setSelectedLimit(limit);
  };

  const handleLimitSave = async (limit: DailyBurnLimit) => {
    try {
      const url = limit.id ? `/api/daily-burn-limits/${limit.id}` : '/api/daily-burn-limits';
      const method = limit.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...limit,
          limit_on_date: selectedDate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save daily burn limit');
      }

      await fetchLimits();
      setSelectedLimit(null);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleLimitDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อจำกัดนี้?')) {
      return;
    }

    try {
      const response = await fetch(`/api/daily-burn-limits/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete daily burn limit');
      }

      await fetchLimits();
      if (selectedLimit?.id === id) {
        setSelectedLimit(null);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleCopyAllLimits = async () => {
    if (!copyTargetDate) {
      alert('กรุณาเลือกวันที่ต้องการ copy');
      return;
    }

    if (copyTargetDate === selectedDate) {
      alert('ไม่สามารถ copy ไปใช้วันเดียวกันได้');
      return;
    }

    try {
      const response = await fetch('/api/daily-burn-limits/copy-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceDate: selectedDate,
          targetDate: copyTargetDate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to copy limits');
      }

      const data = await response.json();
      alert(data.message || `คัดลอก ${data.count} รายการไปวันที่ ${copyTargetDate} สำเร็จ`);
      setShowCopyDialog(false);
      setCopyTargetDate('');
      
      // Refresh limits if target date is the same as selected date
      if (copyTargetDate === selectedDate) {
        await fetchLimits();
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleNewLimit = () => {
    setSelectedLimit({
      boundary: [],
      limit_on_date: selectedDate,
      max_area_rai: 100.0, // ค่าเริ่มต้น
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', fontFamily: 'system-ui' }}>
      {/* Date Picker Section */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fff',
      }}>
        <div style={{ marginBottom: '15px' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '8px', color: '#333' }}>
            จัดการข้อจำกัดการเผารายวัน
          </h1>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#007bff',
            marginBottom: '10px',
          }}>
            {new Date(selectedDate).toLocaleDateString('th-TH', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() - 1);
              setSelectedDate(date.toISOString().split('T')[0]);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            ← ย้อนวัน
          </button>
          <DatePicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
          <button
            onClick={() => {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() + 1);
              setSelectedDate(date.toISOString().split('T')[0]);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            ไปวันถัดไป →
          </button>
          {limits.length > 0 && (
            <button
              onClick={() => {
                setShowCopyDialog(true);
                setCopyTargetDate('');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              📋 คัดลอกทุกรายการไปใช้วันอื่น
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: '400px',
          borderRight: '1px solid #e0e0e0',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f9f9f9',
        }}>
          <div style={{
            padding: '15px 20px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#fff',
          }}>
            <button
              onClick={handleNewLimit}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              + เพิ่มข้อจำกัดใหม่
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลด...</div>
          ) : (
            <>
              <DailyBurnLimitList
                limits={limits}
                selectedLimit={selectedLimit}
                onSelect={handleLimitSelect}
                onDelete={handleLimitDelete}
              />
              {selectedLimit && (
                <div style={{
                  borderTop: '1px solid #e0e0e0',
                  padding: '20px',
                  backgroundColor: '#fff',
                  maxHeight: '40vh',
                  overflowY: 'auto',
                }}>
                  <DailyBurnLimitForm
                    limit={selectedLimit}
                    onSave={handleLimitSave}
                    onCancel={() => setSelectedLimit(null)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Map Area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapComponent
            limits={limits}
            selectedLimit={selectedLimit}
            onLimitUpdate={(limit) => setSelectedLimit(limit)}
            zones={zones}
          />
        </div>
      </div>

      {/* Copy Dialog */}
      {showCopyDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            minWidth: '400px',
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
              คัดลอกทุกรายการไปใช้วันอื่น
            </h3>
            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                วันที่ปัจจุบัน: <strong>{new Date(selectedDate).toLocaleDateString('th-TH')}</strong>
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                จำนวนรายการ: <strong>{limits.length} รายการ</strong>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                เลือกวันที่ต้องการ copy ไป
              </label>
              <input
                type="date"
                value={copyTargetDate}
                onChange={(e) => setCopyTargetDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCopyDialog(false);
                  setCopyTargetDate('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCopyAllLimits}
                disabled={!copyTargetDate}
                style={{
                  padding: '10px 20px',
                  backgroundColor: copyTargetDate ? '#007bff' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: copyTargetDate ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                }}
              >
                คัดลอกทุกรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

