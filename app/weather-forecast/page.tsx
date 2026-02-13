'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { WeatherForecast } from '@/types/weather-forecast';
import WeatherForecastList from '@/components/WeatherForecastList';
import WeatherForecastForm from '@/components/WeatherForecastForm';
import DatePicker from '@/components/DatePicker';

// Dynamically import Map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/WeatherForecastMap'), {
  ssr: false,
});

export default function WeatherForecastPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [forecasts, setForecasts] = useState<WeatherForecast[]>([]);
  const [selectedForecast, setSelectedForecast] = useState<WeatherForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zones, setZones] = useState<any[]>([]);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyTargetDate, setCopyTargetDate] = useState<string>('');
  const [zoneBurnableStatus, setZoneBurnableStatus] = useState<Record<number, boolean | null>>({});

  useEffect(() => {
    fetchForecasts();
    fetchZones();
  }, [selectedDate]);

  useEffect(() => {
    // Fetch burnable status for all zones
    if (zones.length === 0) return;
    
    const date = selectedDate;
    console.log('Fetching burnable status for', zones.length, 'zones on date:', date);
    
    zones.forEach((zone) => {
      if (zone.id) {
        fetchZoneBurnableStatus(zone.id, date);
      }
    });
  }, [zones, selectedDate]);

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/zones');
      const data = await response.json();
      setZones(data.zones || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const fetchZoneBurnableStatus = async (zoneId: number, date: string) => {
    try {
      const response = await fetch(`/api/zones/${zoneId}/burnable?date=${date}`);
      if (!response.ok) {
        console.error(`Failed to fetch burnable status for zone ${zoneId}:`, response.statusText);
        // Set to null if no forecast found
        setZoneBurnableStatus((prev) => ({
          ...prev,
          [zoneId]: null,
        }));
        return;
      }
      const data = await response.json();
      console.log(`Zone ${zoneId} burnable status:`, data);
      setZoneBurnableStatus((prev) => ({
        ...prev,
        [zoneId]: data.is_burnable ?? null,
      }));
    } catch (error) {
      console.error('Error fetching zone burnable status:', error);
      // Set to null on error
      setZoneBurnableStatus((prev) => ({
        ...prev,
        [zoneId]: null,
      }));
    }
  };

  const fetchForecasts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/weather-forecast?date=${selectedDate}`);
      const data = await response.json();
      setForecasts(data.forecasts || []);
    } catch (error) {
      console.error('Error fetching forecasts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForecastSelect = (forecast: WeatherForecast) => {
    setSelectedForecast(forecast);
  };

  const handleForecastSave = async (forecast: WeatherForecast) => {
    try {
      const url = forecast.id ? `/api/weather-forecast/${forecast.id}` : '/api/weather-forecast';
      const method = forecast.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...forecast,
          forecast_date: selectedDate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save forecast');
      }

      await fetchForecasts();
      setSelectedForecast(null);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleForecastDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?')) {
      return;
    }

    try {
      const response = await fetch(`/api/weather-forecast/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete forecast');
      }

      await fetchForecasts();
      if (selectedForecast?.id === id) {
        setSelectedForecast(null);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleCopyAllForecasts = async () => {
    if (!copyTargetDate) {
      alert('กรุณาเลือกวันที่ต้องการ copy');
      return;
    }

    if (copyTargetDate === selectedDate) {
      alert('ไม่สามารถ copy ไปใช้วันเดียวกันได้');
      return;
    }

    try {
      const response = await fetch('/api/weather-forecast/copy-all', {
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
        throw new Error(error.message || 'Failed to copy forecasts');
      }

      const data = await response.json();
      alert(data.message || `คัดลอก ${data.count} รายการไปวันที่ ${copyTargetDate} สำเร็จ`);
      setShowCopyDialog(false);
      setCopyTargetDate('');
      
      // Refresh forecasts if target date is the same as selected date
      if (copyTargetDate === selectedDate) {
        await fetchForecasts();
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleNewForecast = () => {
    setSelectedForecast({
      boundary: [],
      forecast_date: selectedDate,
      is_burnable: true, // ค่าเริ่มต้น: เผาได้
      temperature: 28.0, // อุณหภูมิเริ่มต้น
      humidity: 65.0, // ความชื้นเริ่มต้น
      wind_speed: 10.0, // ความเร็วลมเริ่มต้น
      risk_index: 2.5, // ดัชนีความเสี่ยงเริ่มต้น
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
            จัดการพยากรณ์อากาศ
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
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
            title="ย้อนไปวันก่อนหน้า"
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
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
            title="ไปวันถัดไป"
          >
            ไปวันถัดไป →
          </button>
          {forecasts.length > 0 && (
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
              onClick={handleNewForecast}
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
              + เพิ่มเขตพยากรณ์อากาศใหม่
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลด...</div>
          ) : (
            <>
              <WeatherForecastList
                forecasts={forecasts}
                selectedForecast={selectedForecast}
                onSelect={handleForecastSelect}
                onDelete={handleForecastDelete}
                onCopy={() => {}}
              />
              {selectedForecast && (
                <div style={{
                  borderTop: '1px solid #e0e0e0',
                  padding: '20px',
                  backgroundColor: '#fff',
                  maxHeight: '40vh',
                  overflowY: 'auto',
                }}>
                  <WeatherForecastForm
                    forecast={selectedForecast}
                    onSave={handleForecastSave}
                    onCancel={() => setSelectedForecast(null)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Map Area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapComponent
            forecasts={forecasts}
            selectedForecast={selectedForecast}
            onForecastUpdate={(forecast) => setSelectedForecast(forecast)}
            zones={zones}
            zoneBurnableStatus={zoneBurnableStatus}
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
                จำนวนรายการ: <strong>{forecasts.length} รายการ</strong>
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
                onClick={handleCopyAllForecasts}
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

