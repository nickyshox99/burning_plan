'use client';

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Component for text label on map
function TextLabel({ position, text, color }: { position: [number, number]; text: string; color: string }) {
  // Escape HTML to prevent XSS
  const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  return (
    <Marker
      position={position}
      icon={L.divIcon({
        className: 'text-label',
        html: `<div style="
          background-color: rgba(255, 255, 255, 0.95);
          border: 2px solid ${color};
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 600;
          color: ${color};
          white-space: nowrap;
          min-width: fit-content;
          max-width: 300px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          pointer-events: none;
          text-align: center;
          line-height: 1.4;
          word-wrap: break-word;
          overflow-wrap: break-word;
        ">${escapedText}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })}
    />
  );
}

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface Zone {
  id: number;
  name: string;
  boundary: [number, number][];
}

interface Assignment {
  request_id: number;
  area_name?: string;
  owner_name?: string;
  area_rai: number;
  zone_id: number;
  zone_name: string;
  team_id: number;
  team_name: string;
  limit_id: number;
  weather_forecast_id: number;
}

interface DayPlan {
  date: string;
  assignments: Assignment[];
}

interface OptimizeResultMapProps {
  plan: DayPlan[];
  zones?: Zone[];
  viewMode: 'all' | 'single';
  selectedDate?: string;
}

interface BurnRequestBoundary {
  request_id: number;
  boundary: [number, number][];
}

// Auto-zoom to fit all boundaries
function AutoZoomToBoundaries({ boundaries }: { boundaries: [number, number][][] }) {
  const map = useMap();

  useEffect(() => {
    if (boundaries.length === 0) return;

    const allPoints: L.LatLng[] = [];
    boundaries.forEach((boundary) => {
      boundary.forEach((coord) => {
        allPoints.push(L.latLng(coord[1], coord[0]));
      });
    });

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [boundaries, map]);

  return null;
}

export default function OptimizeResultMap({
  plan,
  zones,
  viewMode,
  selectedDate,
}: OptimizeResultMapProps) {
  const [mapCenter] = useState<[number, number]>([19.4, 98.45]);
  const [requestBoundaries, setRequestBoundaries] = useState<BurnRequestBoundary[]>([]);
  const [allRequestBoundaries, setAllRequestBoundaries] = useState<BurnRequestBoundary[]>([]);
  const [loading, setLoading] = useState(true);

  // Get assignments to display based on view mode
  const assignmentsToShow: (Assignment & { date: string })[] = useMemo(() => {
    const result: (Assignment & { date: string })[] = [];
    if (viewMode === 'all') {
      plan.forEach((dayPlan) => {
        dayPlan.assignments.forEach((assignment) => {
          result.push({ ...assignment, date: dayPlan.date });
        });
      });
    } else if (selectedDate) {
      const dayPlan = plan.find((p) => p.date === selectedDate);
      if (dayPlan) {
        dayPlan.assignments.forEach((assignment) => {
          result.push({ ...assignment, date: dayPlan.date });
        });
      }
    }
    return result;
  }, [plan, viewMode, selectedDate]);

  // Fetch boundaries for all request IDs in one call
  useEffect(() => {
    const fetchBoundaries = async () => {
      setLoading(true);
      try {
        // Fetch all burn requests at once
        const response = await fetch('/api/burn-requests');
        if (!response.ok) {
          throw new Error(`Failed to fetch burn requests: ${response.status}`);
        }

        const data = await response.json();
        const allRequests = data.requests || data || [];
        
        // Extract all boundaries
        const allBoundaries = allRequests
          .map((req: any) => ({
            request_id: req.id,
            boundary: req.boundary,
          }))
          .filter((rb: BurnRequestBoundary) => rb.boundary && rb.boundary.length >= 3);
        
        setAllRequestBoundaries(allBoundaries);
        
        // If we have assignments, filter only the assigned requests
        if (assignmentsToShow.length > 0) {
          const assignedRequestIds = [...new Set(assignmentsToShow.map((a) => a.request_id))];
          const assignedBoundaries = allBoundaries.filter((rb: BurnRequestBoundary) => 
            assignedRequestIds.includes(rb.request_id)
          );
          setRequestBoundaries(assignedBoundaries);
        } else {
          setRequestBoundaries([]);
        }
        
        const assignedCount = assignmentsToShow.length > 0 
          ? allBoundaries.filter((rb: BurnRequestBoundary) => 
              [...new Set(assignmentsToShow.map((a) => a.request_id))].includes(rb.request_id)
            ).length 
          : 0;
        console.log(`[OptimizeResultMap] Fetched ${allBoundaries.length} total boundaries, ${assignedCount} assigned`);
      } catch (err) {
        console.error('Error fetching boundaries:', err);
        setRequestBoundaries([]);
        setAllRequestBoundaries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBoundaries();
  }, [assignmentsToShow]);

  // Color palette for different dates
  const getDateColor = (date: string): string => {
    const colors = [
      '#007bff', // Blue
      '#28a745', // Green
      '#ffc107', // Yellow
      '#dc3545', // Red
      '#6f42c1', // Purple
      '#fd7e14', // Orange
      '#20c997', // Teal
      '#e83e8c', // Pink
    ];
    const dateIndex = plan.findIndex((p) => p.date === date);
    return colors[dateIndex % colors.length] || '#007bff';
  };

  const formatThaiDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear() + 543;
    
    return `วัน${dayName}ที่ ${day} ${month} ${year}`;
  };

  const allBoundaries = requestBoundaries.map((rb) => rb.boundary);

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          กำลังโหลดแผนที่...
        </div>
      )}
      <MapContainer
        center={mapCenter}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoZoomToBoundaries boundaries={allBoundaries} />

        {/* Render zones (background, dimmed) */}
        {(zones || []).map((zone) => {
          if (!zone.boundary || zone.boundary.length < 3) return null;

          const latLngs = zone.boundary.map((coord) => [coord[1], coord[0]] as [number, number]);
          
          const lats = zone.boundary.map((p) => p[1]);
          const lngs = zone.boundary.map((p) => p[0]);
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

          return (
            <div key={`zone-${zone.id}`}>
              <Polygon
                positions={latLngs}
                pathOptions={{
                  color: '#dc3545',
                  fillColor: '#dc3545',
                  fillOpacity: 0.05,
                  weight: 3,
                  dashArray: '10, 5',
                  opacity: 0.4,
                }}
              />
            </div>
          );
        })}

        {/* Render burn request boundaries - assigned ones */}
        {assignmentsToShow.map((assignment) => {
          const boundary = requestBoundaries.find((rb) => rb.request_id === assignment.request_id);
          if (!boundary || boundary.boundary.length < 3) return null;

          const latLngs = boundary.boundary.map((coord) => [coord[1], coord[0]] as [number, number]);
          const color = getDateColor(assignment.date);

          const lats = boundary.boundary.map((p) => p[1]);
          const lngs = boundary.boundary.map((p) => p[0]);
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

          return (
            <div key={`request-${assignment.request_id}-${assignment.date}`}>
              <Polygon
                positions={latLngs}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.4,
                  weight: 3,
                  opacity: 1.0,
                }}
              />
              <TextLabel
                position={[centerLat, centerLng]}
                text={viewMode === 'all' ? (() => {
                  const date = new Date(assignment.date);
                  const day = String(date.getDate()).padStart(2, '0');
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const year = date.getFullYear();
                  const areaRai = Math.round(assignment.area_rai || 0);
                  return `${day}/${month}/${year} (${areaRai} ไร่)`;
                })() : (() => {
                  const areaRai = Math.round(assignment.area_rai || 0);
                  const name = assignment.area_name || `คำขอ #${assignment.request_id}`;
                  return `${name} (${areaRai} ไร่)`;
                })()}
                color={color}
              />
            </div>
          );
        })}

        {/* Render unassigned burn request boundaries */}
        {allRequestBoundaries.map((rb) => {
          const isAssigned = assignmentsToShow.some((a) => a.request_id === rb.request_id);
          if (isAssigned || !rb.boundary || rb.boundary.length < 3) return null;

          const latLngs = rb.boundary.map((coord) => [coord[1], coord[0]] as [number, number]);
          const grayColor = '#495057'; // Darker gray color

          const lats = rb.boundary.map((p) => p[1]);
          const lngs = rb.boundary.map((p) => p[0]);
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

          return (
            <div key={`unassigned-request-${rb.request_id}`}>
              <Polygon
                positions={latLngs}
                pathOptions={{
                  color: grayColor,
                  fillColor: grayColor,
                  fillOpacity: 0.3,
                  weight: 2,
                  opacity: 0.8,
                  dashArray: '5, 5', // Dashed line
                }}
              />
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}

