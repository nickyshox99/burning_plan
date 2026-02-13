'use client';

import { BurnRequest } from '@/types/burn-request';

interface BurnRequestListProps {
  requests: BurnRequest[];
  selectedRequest: BurnRequest | null;
  onSelect: (request: BurnRequest) => void;
  onDelete: (id: number) => void;
}

export default function BurnRequestList({
  requests,
  selectedRequest,
  onSelect,
  onDelete,
}: BurnRequestListProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {requests.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          ไม่มีคำขอ
        </div>
      ) : (
        <div>
          {requests.map((request) => (
            <div
              key={request.id}
              onClick={() => onSelect(request)}
              style={{
                padding: '15px 20px',
                borderBottom: '1px solid #e0e0e0',
                cursor: 'pointer',
                backgroundColor: selectedRequest?.id === request.id ? '#e3f2fd' : '#fff',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (selectedRequest?.id !== request.id) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRequest?.id !== request.id) {
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
                    {request.area_name ? request.area_name : 'คำขอเผา'}
                  </div>
                  {request.boundary && request.boundary.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      {request.boundary.length} จุด
                    </div>
                  )}
                  {request.area_rai && (
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      พื้นที่: {request.area_rai.toLocaleString()} ไร่
                    </div>
                  )}
                  {request.notes && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {request.notes}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (request.id) {
                        onDelete(request.id);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#6c757d',
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

