'use client';

import { Zone } from '@/types/zone';

interface ZoneListProps {
  zones: Zone[];
  selectedZone: Zone | null;
  onSelect: (zone: Zone) => void;
  onDelete: (id: number) => void;
}

export default function ZoneList({
  zones,
  selectedZone,
  onSelect,
  onDelete,
}: ZoneListProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {zones.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          ไม่มีเขต
        </div>
      ) : (
        <div>
          {zones.map((zone) => (
            <div
              key={zone.id}
              onClick={() => onSelect(zone)}
              style={{
                padding: '15px 20px',
                borderBottom: '1px solid #e0e0e0',
                cursor: 'pointer',
                backgroundColor: selectedZone?.id === zone.id ? '#e3f2fd' : '#fff',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (selectedZone?.id !== zone.id) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedZone?.id !== zone.id) {
                  e.currentTarget.style.backgroundColor = '#fff';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#333' }}>
                    {zone.name}
                  </div>
                  {zone.province && (
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      {zone.province}
                    </div>
                  )}
                  {zone.area_rai && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {zone.area_rai.toLocaleString()} ไร่
                    </div>
                  )}
                  {/* {zone.boundary && zone.boundary.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                      {zone.boundary.length} จุด
                    </div>
                  )} */}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (zone.id) {
                      onDelete(zone.id);
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
          ))}
        </div>
      )}
    </div>
  );
}

