'use client';

import { DailyBurnLimit } from '@/types/daily-burn-limit';

interface DailyBurnLimitListProps {
  limits: DailyBurnLimit[];
  selectedLimit: DailyBurnLimit | null;
  onSelect: (limit: DailyBurnLimit) => void;
  onDelete: (id: number) => void;
}

export default function DailyBurnLimitList({
  limits,
  selectedLimit,
  onSelect,
  onDelete,
}: DailyBurnLimitListProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {limits.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          ไม่มีข้อมูลในวันนี้
        </div>
      ) : (
        <div>
          {limits.map((limit) => (
            <div
              key={limit.id}
              onClick={() => onSelect(limit)}
              style={{
                padding: '15px 20px',
                borderBottom: '1px solid #e0e0e0',
                cursor: 'pointer',
                backgroundColor: selectedLimit?.id === limit.id ? '#e3f2fd' : '#fff',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (selectedLimit?.id !== limit.id) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedLimit?.id !== limit.id) {
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
                  }}>
                    จำกัด: {limit.max_area_rai?.toLocaleString()} ไร่
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (limit.id) {
                      onDelete(limit.id);
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

