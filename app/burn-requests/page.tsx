'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { BurnRequest } from '@/types/burn-request';
import BurnRequestList from '@/components/BurnRequestList';
import BurnRequestForm from '@/components/BurnRequestForm';

// Dynamically import Map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/BurnRequestMap'), {
  ssr: false,
});

export default function BurnRequestsPage() {
  const [requests, setRequests] = useState<BurnRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<BurnRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zones, setZones] = useState<any[]>([]);

  useEffect(() => {
    fetchRequests();
    fetchZones();
  }, [statusFilter]);

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/zones');
      const data = await response.json();
      setZones(data.zones || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter === 'all' 
        ? '/api/burn-requests' 
        : `/api/burn-requests?status=${statusFilter}`;
      const response = await fetch(url);
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching burn requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestSelect = (request: BurnRequest) => {
    setSelectedRequest(request);
  };

  const handleRequestSave = async (request: BurnRequest) => {
    try {
      const url = request.id ? `/api/burn-requests/${request.id}` : '/api/burn-requests';
      const method = request.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save burn request');
      }

      await fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleRequestDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบนี้พื้นที่นี้?')) {
      return;
    }

    try {
      const response = await fetch(`/api/burn-requests/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete burn request');
      }

      await fetchRequests();
      if (selectedRequest?.id === id) {
        setSelectedRequest(null);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleStatusChange = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const request = requests.find(r => r.id === id);
      if (!request) return;

      const updatedRequest = { ...request, status };
      
      const response = await fetch(`/api/burn-requests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
      }

      await fetchRequests();
      if (selectedRequest?.id === id) {
        const data = await response.json();
        setSelectedRequest(data.request);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleNewRequest = () => {
    setSelectedRequest({
      boundary: [],
      status: 'pending',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', fontFamily: 'system-ui' }}>
      {/* Header Section */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fff',
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>
          พื้นที่ต้องการเผา
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#666' }}>
            กรองตามสถานะ:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="all">ทั้งหมด</option>
            <option value="pending">รออนุมัติ</option>
            <option value="approved">อนุมัติ</option>
            <option value="rejected">ปฏิเสธ</option>
          </select>
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
              onClick={handleNewRequest}
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
              + เพิ่มเขตพื้นที่ต้องการเผาใหม่
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลด...</div>
          ) : (
            <>
              <BurnRequestList
              requests={requests}
              selectedRequest={selectedRequest}
              onSelect={handleRequestSelect}
              onDelete={handleRequestDelete}
            />
              {selectedRequest && (
                <div style={{
                  borderTop: '1px solid #e0e0e0',
                  padding: '20px',
                  backgroundColor: '#fff',
                  maxHeight: '40vh',
                  overflowY: 'auto',
                }}>
                  <BurnRequestForm
                    request={selectedRequest}
                    onSave={handleRequestSave}
                    onCancel={() => setSelectedRequest(null)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Map Area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapComponent
            requests={requests}
            selectedRequest={selectedRequest}
            onRequestUpdate={(request) => setSelectedRequest(request)}
            zones={zones}
          />
        </div>
      </div>
    </div>
  );
}

