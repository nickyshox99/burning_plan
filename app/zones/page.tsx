'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ZoneForm from '@/components/ZoneForm';
import ZoneList from '@/components/ZoneList';
import { Zone } from '@/types/zone';

// Dynamically import Map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
});

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/zones');
      const data = await response.json();
      setZones(data.zones || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoneSelect = (zone: Zone) => {
    setSelectedZone(zone);
  };

  const handleZoneSave = async (zone: Zone) => {
    try {
      const url = zone.id ? `/api/zones/${zone.id}` : '/api/zones';
      const method = zone.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zone),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save zone');
      }

      await fetchZones();
      setSelectedZone(null);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleZoneDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเขตนี้?')) {
      return;
    }

    try {
      const response = await fetch(`/api/zones/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete zone');
      }

      await fetchZones();
      if (selectedZone?.id === id) {
        setSelectedZone(null);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleNewZone = () => {
    setSelectedZone({
      name: '',
      province: '',
      boundary: [],
      area_rai: undefined,
    });
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', fontFamily: 'system-ui' }}>
      {/* Sidebar */}
      <div style={{
        width: '350px',
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f9f9f9',
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#fff',
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px', color: '#333' }}>
          จัดการเขตพื้นที่
          </h1>
          <button
            onClick={handleNewZone}
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
            + เพิ่มเขตใหม่
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลด...</div>
        ) : (
          <>
            <ZoneList
              zones={zones}
              selectedZone={selectedZone}
              onSelect={handleZoneSelect}
              onDelete={handleZoneDelete}
            />
            {selectedZone && (
              <div style={{
                borderTop: '1px solid #e0e0e0',
                padding: '20px',
                backgroundColor: '#fff',
                maxHeight: '40vh',
                overflowY: 'auto',
              }}>
                <ZoneForm
                  zone={selectedZone}
                  onSave={handleZoneSave}
                  onCancel={() => setSelectedZone(null)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapComponent
          zones={zones}
          selectedZone={selectedZone}
          onZoneUpdate={(zone) => setSelectedZone(zone)}
        />
      </div>
    </div>
  );
}

