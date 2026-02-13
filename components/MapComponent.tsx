'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Zone } from '@/types/zone';
import MapSearch from './MapSearch';

// Fix for default marker icon in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface MapComponentProps {
  zones: Zone[];
  selectedZone: Zone | null;
  onZoneUpdate: (zone: Zone) => void;
}

function MapClickHandler({
  selectedZone,
  onZoneUpdate,
}: {
  selectedZone: Zone | null;
  onZoneUpdate: (zone: Zone) => void;
}) {
  const [points, setPoints] = useState<number[][]>([]);

  useEffect(() => {
    if (selectedZone) {
      setPoints(selectedZone.boundary || []);
    } else {
      setPoints([]);
    }
  }, [selectedZone]);

  useMapEvents({
    click(e) {
      if (!selectedZone) return;

      const { lat, lng } = e.latlng;
      const newPoint: number[] = [lng, lat]; // [lng, lat] format

      // Check if clicking on the first point (close polygon)
      if (points.length >= 3) {
        const firstPoint = points[0];
        const distance = Math.sqrt(
          Math.pow(lat - firstPoint[1], 2) + Math.pow(lng - firstPoint[0], 2)
        );
        // If clicking near the first point (within ~50 meters), close the polygon
        if (distance < 0.0005) {
          // Close polygon
          const closedPoints = [...points, points[0]];
          onZoneUpdate({
            ...selectedZone,
            boundary: closedPoints,
          });
          setPoints([]);
          return;
        }
      }

      // Add new point
      const newPoints = [...points, newPoint];
      setPoints(newPoints);
      onZoneUpdate({
        ...selectedZone,
        boundary: newPoints,
      });
    },
  });

  return null;
}

// Component สำหรับ zoom ไปที่ zone แรกเมื่อโหลด
function AutoZoomToFirstZone({ zones }: { zones: Zone[] }) {
  const map = useMap();
  const hasZoomed = useRef(false);

  useEffect(() => {
    // Zoom ไปที่ zone แรกเมื่อโหลดครั้งแรกเท่านั้น
    if (zones.length > 0 && !hasZoomed.current) {
      const firstZone = zones[0];
      if (firstZone.boundary && firstZone.boundary.length >= 3) {
        // Convert [lng, lat] to [lat, lng] for Leaflet
        const latLngs = firstZone.boundary.map((coord) => [coord[1], coord[0]] as [number, number]);
        
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
  }, [zones, map]);

  return null;
}

export default function MapComponent({
  zones,
  selectedZone,
  onZoneUpdate,
}: MapComponentProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.7883, 98.9853]); // Chiang Mai default

  useEffect(() => {
    if (selectedZone && selectedZone.boundary && selectedZone.boundary.length > 0) {
      // Center map on selected zone
      const lats = selectedZone.boundary.map((p) => p[1]);
      const lngs = selectedZone.boundary.map((p) => p[0]);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      setMapCenter([centerLat, centerLng]);
    }
  }, [selectedZone]);

  const getPolygonColor = (zone: Zone) => {
    if (selectedZone && zone.id === selectedZone.id) {
      return '#007bff'; // Blue for selected
    }
    return '#28a745'; // Green for others
  };

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

        {/* Render all zones */}
        {zones.map((zone) => {
          if (!zone.boundary || zone.boundary.length < 3) return null;

          // Convert [lng, lat] to [lat, lng] for Leaflet
          const latLngs = zone.boundary.map((coord) => [coord[1], coord[0]] as [number, number]);

          // คำนวณจุดกึ่งกลางของ polygon
          const lats = zone.boundary.map((p) => p[1]);
          const lngs = zone.boundary.map((p) => p[0]);
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

          return (
            <div key={zone.id}>
              <Polygon
                positions={latLngs}
                pathOptions={{
                  color: getPolygonColor(zone),
                  fillColor: getPolygonColor(zone),
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              >
                <Popup>
                  <div>
                    <strong>{zone.name}</strong>
                    {zone.province && <div>{zone.province}</div>}
                    {zone.area_rai && <div>{zone.area_rai.toLocaleString()} ไร่</div>}
                  </div>
                </Popup>
              </Polygon>
              {/* Label แสดงชื่อ zone ตรงกลาง polygon */}
              <Marker
                position={[centerLat, centerLng]}
                icon={L.divIcon({
                  className: 'zone-label',
                  html: `<div style="
                    background-color: rgba(255, 255, 255, 0.95);
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 14px;
                    color: ${selectedZone && zone.id === selectedZone.id ? '#007bff' : '#28a745'};
                    text-align: center;
                    white-space: nowrap;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                    border: 2px solid ${selectedZone && zone.id === selectedZone.id ? '#007bff' : '#28a745'};
                    pointer-events: none;
                    display: inline-block;
                  ">${zone.name}</div>`,
                  iconSize: [zone.name.length * 10 + 24, 32], // ประมาณการขนาดตามความยาวข้อความ
                  iconAnchor: [(zone.name.length * 10 + 24) / 2, 16], // จัดกึ่งกลาง
                })}
                interactive={false}
              />
            </div>
          );
        })}

        {/* Render points being drawn for selected zone */}
        {selectedZone &&
          selectedZone.boundary &&
          selectedZone.boundary.length > 0 &&
          selectedZone.boundary.map((point, index) => (
            <Marker
              key={index}
              position={[point[1], point[0]]}
              icon={
                new L.DivIcon({
                  className: 'custom-marker',
                  html: `<div style="
                    background-color: ${index === 0 && selectedZone.boundary.length >= 3 ? '#ff6b6b' : '#007bff'};
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
            >
              <Popup>
                จุด {index + 1}
                {index === 0 && selectedZone.boundary.length >= 3 && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    คลิกที่นี่เพื่อปิด polygon
                  </div>
                )}
              </Popup>
            </Marker>
          ))}

        {/* Map click handler */}
        <MapClickHandler selectedZone={selectedZone} onZoneUpdate={onZoneUpdate} />
        
        {/* Auto zoom to first zone */}
        <AutoZoomToFirstZone zones={zones} />
        
        {/* Search component - must be inside MapContainer to use useMap() */}
        <MapSearch />
      </MapContainer>

      {/* Instructions overlay */}
      {selectedZone && (
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
          {selectedZone.boundary && selectedZone.boundary.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee', color: '#007bff', fontWeight: '500' }}>
              ปักแล้ว {selectedZone.boundary.length} จุด
            </div>
          )}
        </div>
      )}
    </div>
  );
}

