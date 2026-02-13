'use client';

import { useState } from 'react';
import { TeamAvailability } from '@/types/team';

interface TeamAvailabilityListProps {
  availabilities: TeamAvailability[];
  teams: any[];
  selectedDate: string;
  onToggle: (teamId: number, isAvailable: boolean) => void;
  onAddTeam: () => void;
}

export default function TeamAvailabilityList({
  availabilities,
  teams,
  selectedDate,
  onToggle,
  onAddTeam,
}: TeamAvailabilityListProps) {
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');

  // Create a map of team_id -> availability for quick lookup
  const availabilityMap = new Map<number, TeamAvailability>();
  availabilities.forEach((avail) => {
    availabilityMap.set(avail.team_id, avail);
  });

  // Get teams that are already added
  const addedTeamIds = new Set(availabilities.map(a => a.team_id));
  const availableTeams = teams.filter(team => !addedTeamIds.has(team.id));

  const handleAddTeam = () => {
    if (selectedTeamId && typeof selectedTeamId === 'number') {
      onToggle(selectedTeamId, true);
      setSelectedTeamId('');
      setShowAddTeam(false);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Add Team Section */}
      {availableTeams.length > 0 && (
        <div style={{
          padding: '15px 20px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa',
        }}>
          {!showAddTeam ? (
            <button
              onClick={() => setShowAddTeam(true)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              + เพิ่มทีม
            </button>
          ) : (
            <div>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value ? parseInt(e.target.value) : '')}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  marginBottom: '8px',
                }}
              >
                <option value="">-- เลือกทีม --</option>
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleAddTeam}
                  disabled={!selectedTeamId}
                  style={{
                    flex: 1,
                    padding: '6px',
                    backgroundColor: selectedTeamId ? '#28a745' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedTeamId ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                  }}
                >
                  เพิ่ม
                </button>
                <button
                  onClick={() => {
                    setShowAddTeam(false);
                    setSelectedTeamId('');
                  }}
                  style={{
                    flex: 1,
                    padding: '6px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teams List */}
      {availabilities.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          {teams.length === 0 ? (
            <div>
              <div>ไม่มีทีม กรุณาเพิ่มทีมก่อน</div>
              <button
                onClick={onAddTeam}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ไปที่แท็บจัดการทีม
              </button>
            </div>
          ) : (
            'ยังไม่มีทีมที่เลือกไว้ กรุณาเพิ่มทีม'
          )}
        </div>
      ) : (
        <div>
          {availabilities.map((availability) => {
            const team = teams.find(t => t.id === availability.team_id);
            if (!team) return null;

            return (
              <div
                key={availability.id}
                style={{
                  padding: '15px 20px',
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      marginBottom: '4px', 
                      color: '#333',
                    }}>
                      {team.name}
                    </div>
                    {team.status && (
                      <div style={{ fontSize: '12px', color: team.status === 'active' ? '#28a745' : '#666' }}>
                        {team.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                      </div>
                    )}
                  </div>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={availability.is_available}
                      onChange={(e) => onToggle(team.id, e.target.checked)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <span style={{ 
                      fontSize: '14px', 
                      color: availability.is_available ? '#28a745' : '#666',
                      fontWeight: availability.is_available ? '600' : '400',
                    }}>
                      {availability.is_available ? 'พร้อมทำงาน' : 'ไม่พร้อมทำงาน'}
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

