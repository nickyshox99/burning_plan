'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DatePicker from '@/components/DatePicker';
import OptimizeResultMap from '@/components/OptimizeResultMap';

// Dynamically import map component to avoid SSR issues
const OptimizeResultMapDynamic = dynamic(() => import('@/components/OptimizeResultMap'), {
  ssr: false,
});

interface Zone {
  id: number;
  name: string;
  boundary: [number, number][];
}

interface OptimizationResult {
  plan: {
    date: string;
    assignments: {
      request_id: number;
      area_name?: string;
      owner_name?: string;
      area_rai: number;
      zone_id: number;
      zone_name: string;
      team_id: number;
      team_name: string;
      limit_id: number;
      weather_forecast_id: number;
    }[];
  }[];
  total_area: number;
  total_requests: number;
  summary: {
    date: string;
    total_area: number;
    request_count: number;
    team_count: number;
  }[];
}

export default function OptimizePage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
  const [mapDate, setMapDate] = useState<string>('');
  const [zones, setZones] = useState<Zone[]>([]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleOptimize = async () => {
    if (!startDate || !endDate) {
      setError('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด');
      return;
    }

    setIsOptimizing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If response is not JSON, get text instead
        const text = await response.text();
        console.error('Failed to parse JSON response:', text);
        throw new Error(`Server error: ${text || response.statusText || 'Unknown error'}`);
      }

      if (!response.ok) {
        console.error('Optimize API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        throw new Error(data?.error || data?.message || `เกิดข้อผิดพลาดในการ optimize (Status: ${response.status})`);
      }

      // Check if there's a message indicating no plan was generated
      if (data.message && data.plan && data.plan.length === 0) {
        setError(data.message);
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการ optimize');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Fetch zones for map background
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await fetch('/api/zones');
        if (response.ok) {
          const data = await response.json();
          setZones(data.zones || []);
        }
      } catch (err) {
        console.error('Error fetching zones:', err);
      }
    };
    fetchZones();
  }, []);

  // Set map date to first date when result changes
  useEffect(() => {
    if (result && result.plan.length > 0 && !mapDate) {
      setMapDate(result.plan[0].date);
    }
  }, [result, mapDate]);

  const formatThaiDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist era
    
    return `วัน${dayName}ที่ ${day} ${month} ${year}`;
  };

  // Color palette for different dates (same as map)
  const getDateColor = (date: string): string => {
    if (!result) return '#007bff';
    const colors = [
      '#007bff', // Blue
      '#28a745', // Green
      '#ffc107', // Yellow
      '#dc3545', // Red
      '#6f42c1', // Purple
      '#fd7e14', // Orange
      '#20c997', // Teal
      '#e83e8c', // Pink
    ];
    const dateIndex = result.plan.findIndex((p) => p.date === date);
    return colors[dateIndex % colors.length] || '#007bff';
  };

  // Get previous date with data
  const getPreviousDate = (): string | null => {
    if (!result || !mapDate) return null;
    const dates = result.plan.map(p => p.date).sort();
    const currentIndex = dates.indexOf(mapDate);
    if (currentIndex > 0) {
      return dates[currentIndex - 1];
    }
    return null;
  };

  // Get next date with data
  const getNextDate = (): string | null => {
    if (!result || !mapDate) return null;
    const dates = result.plan.map(p => p.date).sort();
    const currentIndex = dates.indexOf(mapDate);
    if (currentIndex >= 0 && currentIndex < dates.length - 1) {
      return dates[currentIndex + 1];
    }
    return null;
  };

  const handlePreviousDate = () => {
    const prevDate = getPreviousDate();
    if (prevDate) {
      setMapDate(prevDate);
    }
  };

  const handleNextDate = () => {
    const nextDate = getNextDate();
    if (nextDate) {
      setMapDate(nextDate);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>
        🎯 Optimize แผนการเผา (MIP Algorithm)
      </h1>

      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              วันที่เริ่มต้น *
            </label>
            <DatePicker
              selectedDate={startDate}
              onDateChange={setStartDate}
            />
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              วันที่สิ้นสุด *
            </label>
            <DatePicker
              selectedDate={endDate}
              onDateChange={setEndDate}
            />
          </div>

          <button
            onClick={handleOptimize}
            disabled={isOptimizing || !startDate || !endDate}
            style={{
              padding: '10px 24px',
              backgroundColor: isOptimizing || !startDate || !endDate ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isOptimizing || !startDate || !endDate ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              minWidth: '150px',
            }}
          >
            {isOptimizing ? 'กำลัง Optimize...' : '🚀 Optimize'}
          </button>

          {result && (
            <button
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              style={{
                padding: '10px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                minWidth: '150px',
              }}
            >
              🗑️ เคลียร์แผน
            </button>
          )}
        </div>

        {error && (
          <div style={{
            marginTop: '15px',
            padding: '12px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c33',
          }}>
            {error}
          </div>
        )}
      </div>

      {result && (
        <div style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          {/* Map View Controls */}
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #dee2e6',
          }}>
            <div style={{ marginBottom: '15px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>
                🗺️ แผนที่ผลลัพธ์
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setViewMode('all')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: viewMode === 'all' ? '#007bff' : '#fff',
                    color: viewMode === 'all' ? 'white' : '#007bff',
                    border: '1px solid #007bff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  📅 แสดงทุกวัน
                </button>
                <button
                  onClick={() => setViewMode('single')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: viewMode === 'single' ? '#007bff' : '#fff',
                    color: viewMode === 'single' ? 'white' : '#007bff',
                    border: '1px solid #007bff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  📆 เลือกวันที่
                </button>
                {viewMode === 'single' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={handlePreviousDate}
                      disabled={!getPreviousDate()}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: getPreviousDate() ? '#6c757d' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: getPreviousDate() ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      ← ย้อนวัน
                    </button>
                    <DatePicker
                      selectedDate={mapDate}
                      onDateChange={setMapDate}
                    />
                    <button
                      onClick={handleNextDate}
                      disabled={!getNextDate()}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: getNextDate() ? '#6c757d' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: getNextDate() ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      ไปวันถัดไป →
                    </button>
                  </div>
                )}
              </div>
            </div>
            {result.plan.length > 0 && (
              <OptimizeResultMapDynamic
                plan={result.plan}
                zones={zones}
                viewMode={viewMode}
                selectedDate={viewMode === 'single' ? mapDate : undefined}
              />
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#333' }}>
              📊 สรุปผลการ Optimize
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #dee2e6',
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>พื้นที่รวมทั้งหมด</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745' }}>
                  {result.total_area.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ไร่
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #dee2e6',
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>จำนวนคำขอ</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#007bff' }}>
                  {result.total_requests} รายการ
                </div>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #dee2e6',
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>จำนวนวัน</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#6c757d' }}>
                  {result.plan.length} วัน
                </div>
              </div>
            </div>
          </div>

          {result.plan.map((dayPlan, idx) => {
            const dateColor = getDateColor(dayPlan.date);
            return (
            <div
              key={dayPlan.date}
              style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: dateColor,
                borderRadius: '6px',
                border: `2px solid ${dateColor}`,
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                paddingBottom: '10px',
                borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
              }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', marginBottom: '5px' }}>
                    {formatThaiDate(dayPlan.date)}
                  </h3>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    พื้นที่รวม: <strong>{dayPlan.assignments.reduce((sum, a) => sum + a.area_rai, 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> ไร่ | 
                    คำขอ: <strong>{dayPlan.assignments.length}</strong> รายการ | 
                    ทีม: <strong>{new Set(dayPlan.assignments.map(a => a.team_id)).size}</strong> ทีม
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                {dayPlan.assignments.map((assignment, aIdx) => (
                  <div
                    key={`${assignment.request_id}-${aIdx}`}
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '4px',
                      border: `1px solid ${dateColor}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', marginBottom: '5px', color: '#333' }}>
                        {assignment.area_name || `คำขอ #${assignment.request_id}`}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        เขต: {assignment.zone_name} | 
                        ทีม: {assignment.team_name} | 
                        พื้นที่: <strong>{assignment.area_rai.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> ไร่
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

