'use client';

import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { createRoot } from 'react-dom/client';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface MapSearchProps {
  onLocationSelect?: (lat: number, lng: number) => void;
}

export default function MapSearch({ onLocationSelect }: MapSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // ใช้ useMap() hook - ต้องอยู่ภายใน MapContainer
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  
  // ตรวจสอบว่า map instance พร้อมใช้งาน
  if (!map) {
    return null;
  }

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // ใช้ Nominatim API (OpenStreetMap) สำหรับค้นหาสถานที่
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=th`,
        {
          headers: {
            'User-Agent': 'BurningPlanApp/1.0',
          },
        }
      );

      const data: SearchResult[] = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching location:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchLocation(searchQuery);
  };

  const removeMarker = () => {
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
      setSearchQuery('');
    }
  };

  const selectLocation = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // ย้ายแผนที่ไปที่ตำแหน่งที่เลือก
    map.setView([lat, lng], 15);

    // ลบ marker เก่า (ถ้ามี)
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    // สร้าง marker ใหม่
    const marker = L.marker([lat, lng], {
      icon: new L.Icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      }),
    }).addTo(map);

    // สร้าง popup content พร้อมปุ่มลบ
    const popupContent = document.createElement('div');
    popupContent.style.padding = '8px';
    
    // สร้าง React root และ render popup content
    const root = createRoot(popupContent);
    root.render(
      <div>
        <div style={{ marginBottom: '8px', fontWeight: '500' }}>
          {result.display_name}
        </div>
        <button
          onClick={() => {
            removeMarker();
            marker.closePopup();
          }}
          style={{
            width: '100%',
            padding: '6px 12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ลบ Marker
        </button>
      </div>
    );
    
    marker.bindPopup(popupContent).openPopup();

    markerRef.current = marker;

    setSearchQuery(result.display_name);
    setShowResults(false);

    // เรียก callback ถ้ามี
    if (onLocationSelect) {
      onLocationSelect(lat, lng);
    }
  };

  // ลบ marker เมื่อ component unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
    };
  }, [map]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        width: '350px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}
    >
      <form onSubmit={handleSearch} style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value.trim()) {
              searchLocation(e.target.value);
            } else {
              setResults([]);
              setShowResults(false);
            }
          }}
          placeholder="ค้นหาสถานที่..."
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            outline: 'none',
            fontSize: '14px',
          }}
        />
        {markerRef.current && (
          <button
            type="button"
            onClick={removeMarker}
            style={{
              padding: '12px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
            title="ลบ Marker"
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          disabled={isSearching}
          style={{
            padding: '12px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            cursor: isSearching ? 'wait' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {isSearching ? '...' : '🔍'}
        </button>
      </form>

      {showResults && results.length > 0 && (
        <div
          style={{
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {results.map((result, index) => (
            <div
              key={index}
              onClick={() => selectLocation(result)}
              style={{
                padding: '12px 16px',
                borderBottom: index < results.length - 1 ? '1px solid #f0f0f0' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '4px' }}>
                {result.display_name.split(',')[0]}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {result.display_name}
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && searchQuery && !isSearching && (
        <div style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
          ไม่พบผลลัพธ์
        </div>
      )}
    </div>
  );
}

