'use client';

import { WeatherForecast } from '@/types/weather-forecast';

interface WeatherForecastListProps {
  forecasts: WeatherForecast[];
  selectedForecast: WeatherForecast | null;
  onSelect: (forecast: WeatherForecast) => void;
  onDelete: (id: number) => void;
  onCopy: (id: number) => void;
}

export default function WeatherForecastList({
  forecasts,
  selectedForecast,
  onSelect,
  onDelete,
  onCopy,
}: WeatherForecastListProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {forecasts.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          ไม่มีข้อมูลในวันนี้
        </div>
      ) : (
        <div>
          {forecasts.map((forecast) => (
            <div
              key={forecast.id}
              onClick={() => onSelect(forecast)}
              style={{
                padding: '15px 20px',
                borderBottom: '1px solid #e0e0e0',
                cursor: 'pointer',
                backgroundColor: selectedForecast?.id === forecast.id ? '#e3f2fd' : '#fff',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (selectedForecast?.id !== forecast.id) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedForecast?.id !== forecast.id) {
                  e.currentTarget.style.backgroundColor = '#fff';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: '600', 
                    marginBottom: '8px', 
                    color: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: forecast.is_burnable ? '#28a745' : '#dc3545',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}>
                      {forecast.is_burnable ? '✓' : '✗'}
                    </span>
                    {forecast.is_burnable ? 'เผาได้ สภาพอากาศเปิด ฝนไม่ตก' : 'เผาไม่ได้'}
                  </div>
                  {forecast.boundary && forecast.boundary.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      {forecast.boundary.length} จุด
                    </div>
                  )}
                  {forecast.temperature && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      อุณหภูมิ: {forecast.temperature}°C
                    </div>
                  )}
                  {forecast.humidity && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      ความชื้น: {forecast.humidity}%
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (forecast.id) {
                        onDelete(forecast.id);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

