'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { WeatherForecast } from '@/types/weather-forecast';
import MapSearch from './MapSearch';

interface Zone {
  id?: number;
  name: string;
  boundary: number[][];
}

interface WeatherForecastMapProps {
  forecasts: WeatherForecast[];
  selectedForecast: WeatherForecast | null;
  onForecastUpdate: (forecast: WeatherForecast) => void;
  zones?: Zone[];
  zoneBurnableStatus?: Record<number, boolean | null>;
}

function MapClickHandler({
  selectedForecast,
  onForecastUpdate,
}: {
  selectedForecast: WeatherForecast | null;
  onForecastUpdate: (forecast: WeatherForecast) => void;
}) {
  const [points, setPoints] = useState<number[][]>([]);

  useEffect(() => {
    if (selectedForecast) {
      setPoints(selectedForecast.boundary || []);
    } else {
      setPoints([]);
    }
  }, [selectedForecast]);

  useMapEvents({
    click(e) {
      if (!selectedForecast) return;

      const { lat, lng } = e.latlng;
      const newPoint: number[] = [lng, lat];

      if (points.length >= 3) {
        const firstPoint = points[0];
        const distance = Math.sqrt(
          Math.pow(lat - firstPoint[1], 2) + Math.pow(lng - firstPoint[0], 2)
        );
        if (distance < 0.0005) {
          const closedPoints = [...points, points[0]];
          onForecastUpdate({
            ...selectedForecast,
            boundary: closedPoints,
          });
          setPoints([]);
          return;
        }
      }

      const newPoints = [...points, newPoint];
      setPoints(newPoints);
      onForecastUpdate({
        ...selectedForecast,
        boundary: newPoints,
      });
    },
  });

  return null;
}

// Component สำหรับ zoom ไปที่ forecast แรกเมื่อโหลด
function AutoZoomToFirstForecast({ forecasts }: { forecasts: WeatherForecast[] }) {
  const map = useMap();
  const hasZoomed = useRef(false);

  useEffect(() => {
    // Zoom ไปที่ forecast แรกเมื่อโหลดครั้งแรกเท่านั้น
    if (forecasts.length > 0 && !hasZoomed.current) {
      const firstForecast = forecasts[0];
      if (firstForecast.boundary && firstForecast.boundary.length >= 3) {
        // Convert [lng, lat] to [lat, lng] for Leaflet
        const latLngs = firstForecast.boundary.map((coord) => [coord[1], coord[0]] as [number, number]);
        
        // สร้าง bounds จาก boundary
        const bounds = L.latLngBounds(latLngs);
        
        // Zoom และ pan ไปที่ bounds
        map.fitBounds(bounds, {
          padding: [50, 50], // เพิ่ม padding รอบๆ
          maxZoom: 15, // จำกัด zoom สูงสุด
        });
        
        hasZoomed.current = true;
      }
    }
  }, [forecasts, map]);

  return null;
}

export default function WeatherForecastMap({
  forecasts,
  selectedForecast,
  onForecastUpdate,
  zones = [],
  zoneBurnableStatus = {},
}: WeatherForecastMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.7883, 98.9853]);

  useEffect(() => {
    if (selectedForecast && selectedForecast.boundary && selectedForecast.boundary.length > 0) {
      const lats = selectedForecast.boundary.map((p) => p[1]);
      const lngs = selectedForecast.boundary.map((p) => p[0]);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      setMapCenter([centerLat, centerLng]);
    }
  }, [selectedForecast]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={mapCenter}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render zones (background, dimmed) */}
        {zones.map((zone) => {
          if (!zone.boundary || zone.boundary.length < 3) return null;

          const latLngs = zone.boundary.map((coord) => [coord[1], coord[0]] as [number, number]);
          
          // คำนวณจุดกึ่งกลางของ polygon สำหรับ label
          const lats = zone.boundary.map((p) => p[1]);
          const lngs = zone.boundary.map((p) => p[0]);
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

          return (
            <div key={`zone-${zone.id}`}>
              <Polygon
                positions={latLngs}
                pathOptions={{
                  color: '#dc3545', // สีแดง
                  fillColor: '#dc3545',
                  fillOpacity: 0.05, // จางมาก
                  weight: 3, // หนาๆ
                  dashArray: '10, 5', // เส้นประ
                  opacity: 0.4, // จางๆ
                }}
              />
              {/* Zone label (dimmed) */}
              <Marker
                position={[centerLat, centerLng]}
                icon={L.divIcon({
                  className: 'zone-label-dimmed',
                  html: `<div style="
                    background-color: rgba(255, 255, 255, 0.6);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: 500;
                    font-size: 12px;
                    color: #999;
                    text-align: center;
                    white-space: nowrap;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border: 1px solid #ddd;
                    pointer-events: none;
                    opacity: 0.7;
                  ">${zone.name}</div>`,
                  iconSize: [zone.name.length * 8 + 16, 24],
                  iconAnchor: [(zone.name.length * 8 + 16) / 2, 12],
                })}
                interactive={false}
              />
            </div>
          );
        })}

        {/* Render all forecasts */}
        {forecasts.map((forecast) => {
          if (!forecast.boundary || forecast.boundary.length < 3) return null;

          const latLngs = forecast.boundary.map((coord) => [coord[1], coord[0]] as [number, number]);
          
          // คำนวณจุดกึ่งกลางของ forecast boundary สำหรับ icon
          const lats = forecast.boundary.map((p) => p[1]);
          const lngs = forecast.boundary.map((p) => p[0]);
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

          return (
            <div key={forecast.id}>
              <Polygon
                positions={latLngs}
                pathOptions={{
                  color: forecast.is_burnable ? '#28a745' : '#dc3545',
                  fillColor: forecast.is_burnable ? '#28a745' : '#dc3545',
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              />
              {/* Icon แสดงสถานะเผาได้/ไม่ได้ */}
              <Marker
                position={[centerLat, centerLng]}
                icon={L.divIcon({
                  className: 'burnable-icon',
                  html: (() => {
                    const status = forecast.is_burnable;
                    const bgColor = status === true ? '#28a745' : '#dc3545';
                    const icon = status === true ? '✓' : '✗';
                    const statusText = status === true ? 'เผาได้' : 'เผาไม่ได้';
                    return `<div style="
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      gap: 4px;
                    ">
                      <div style="
                        background-color: ${bgColor};
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 20px;
                        color: white;
                        font-weight: bold;
                        z-index: 1001;
                      ">${icon}</div>
                      <div style="
                        background-color: rgba(255, 255, 255, 0.95);
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 10px;
                        color: ${bgColor};
                        font-weight: 600;
                        white-space: nowrap;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                        border: 1px solid ${bgColor};
                      ">${statusText}</div>
                    </div>`;
                  })(),
                  iconSize: [50, 60],
                  iconAnchor: [25, 30],
                })}
                interactive={false}
              />
            </div>
          );
        })}

        {/* Render points being drawn for selected forecast */}
        {selectedForecast &&
          selectedForecast.boundary &&
          selectedForecast.boundary.length > 0 &&
          selectedForecast.boundary.map((point, index) => (
            <Marker
              key={index}
              position={[point[1], point[0]]}
              icon={
                new L.DivIcon({
                  className: 'custom-marker',
                  html: `<div style="
                    background-color: ${index === 0 && selectedForecast.boundary.length >= 3 ? '#ff6b6b' : '#007bff'};
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  "></div>`,
                  iconSize: [12, 12],
                  iconAnchor: [6, 6],
                })
              }
            />
          ))}

        <MapClickHandler selectedForecast={selectedForecast} onForecastUpdate={onForecastUpdate} />
        <AutoZoomToFirstForecast forecasts={forecasts} />
        <MapSearch />
      </MapContainer>

      {selectedForecast && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxWidth: '300px',
            fontSize: '14px',
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>วิธีปักจุด:</div>
          <div style={{ marginBottom: '4px' }}>1. คลิกบนแผนที่เพื่อเพิ่มจุด</div>
          <div style={{ marginBottom: '4px' }}>2. ต้องปักอย่างน้อย 3 จุด</div>
          <div>3. คลิกจุดแรก (สีแดง) เพื่อปิด polygon</div>
          {selectedForecast.boundary && selectedForecast.boundary.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee', color: '#007bff', fontWeight: '500' }}>
              ปักแล้ว {selectedForecast.boundary.length} จุด
            </div>
          )}
        </div>
      )}
    </div>
  );
}

