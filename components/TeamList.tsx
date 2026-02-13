'use client';

import { Team } from '@/types/team';

interface TeamListProps {
  teams: Team[];
  selectedTeam: Team | null;
  onSelect: (team: Team) => void;
  onDelete: (id: number) => void;
}

export default function TeamList({
  teams,
  selectedTeam,
  onSelect,
  onDelete,
}: TeamListProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {teams.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          ไม่มีทีม
        </div>
      ) : (
        <div>
          {teams.map((team) => (
            <div
              key={team.id}
              onClick={() => onSelect(team)}
              style={{
                padding: '15px 20px',
                borderBottom: '1px solid #e0e0e0',
                cursor: 'pointer',
                backgroundColor: selectedTeam?.id === team.id ? '#e3f2fd' : '#fff',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (selectedTeam?.id !== team.id) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTeam?.id !== team.id) {
                  e.currentTarget.style.backgroundColor = '#fff';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (team.id) {
                      onDelete(team.id);
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

