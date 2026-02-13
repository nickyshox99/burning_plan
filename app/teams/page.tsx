'use client';

import { useState, useEffect } from 'react';
import { Team, TeamAvailability } from '@/types/team';
import TeamList from '@/components/TeamList';
import TeamForm from '@/components/TeamForm';
import TeamAvailabilityList from '@/components/TeamAvailabilityList';
import DatePicker from '@/components/DatePicker';

export default function TeamsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availabilities, setAvailabilities] = useState<TeamAvailability[]>([]);
  const [activeTab, setActiveTab] = useState<'teams' | 'availability'>('availability');
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyTargetDate, setCopyTargetDate] = useState<string>('');

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchAvailabilities();
  }, [selectedDate]);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      const data = await response.json();
      setTeams(data.teams || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailabilities = async () => {
    try {
      const response = await fetch(`/api/team-availability?date=${selectedDate}`);
      const data = await response.json();
      setAvailabilities(data.availabilities || []);
    } catch (error) {
      console.error('Error fetching availabilities:', error);
    }
  };

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
  };

  const handleTeamSave = async (team: Team) => {
    try {
      const url = team.id ? `/api/teams/${team.id}` : '/api/teams';
      const method = team.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(team),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save team');
      }

      await fetchTeams();
      setSelectedTeam(null);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleTeamDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบทีมนี้?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete team');
      }

      await fetchTeams();
      if (selectedTeam?.id === id) {
        setSelectedTeam(null);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleToggleAvailability = async (teamId: number, isAvailable: boolean) => {
    try {
      const response = await fetch('/api/team-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: teamId,
          work_date: selectedDate,
          is_available: isAvailable,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update availability');
      }

      await fetchAvailabilities();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleNewTeam = () => {
    setSelectedTeam({
      name: '',
      status: 'active',
    });
  };

  const handleCopyAllAvailability = async () => {
    if (!copyTargetDate) {
      alert('กรุณาเลือกวันที่ต้องการ copy');
      return;
    }

    if (copyTargetDate === selectedDate) {
      alert('ไม่สามารถ copy ไปใช้วันเดียวกันได้');
      return;
    }

    try {
      const response = await fetch('/api/team-availability/copy-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceDate: selectedDate,
          targetDate: copyTargetDate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to copy availability');
      }

      const data = await response.json();
      alert(data.message || `คัดลอก ${data.count} รายการไปวันที่ ${copyTargetDate} สำเร็จ`);
      setShowCopyDialog(false);
      setCopyTargetDate('');
      
      // Refresh availabilities if target date is the same as selected date
      if (copyTargetDate === selectedDate) {
        await fetchAvailabilities();
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', fontFamily: 'system-ui' }}>
      {/* Header Section */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fff',
      }}>
        <div style={{ marginBottom: '15px' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '8px', color: '#333' }}>
            จัดการทีม
          </h1>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#007bff',
            marginBottom: '10px',
          }}>
            {new Date(selectedDate).toLocaleDateString('th-TH', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
          <button
            onClick={() => {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() - 1);
              setSelectedDate(date.toISOString().split('T')[0]);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            ← ย้อนวัน
          </button>
          <DatePicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
          <button
            onClick={() => {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() + 1);
              setSelectedDate(date.toISOString().split('T')[0]);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            ไปวันถัดไป →
          </button>
          {activeTab === 'availability' && availabilities.length > 0 && (
            <button
              onClick={() => {
                setShowCopyDialog(true);
                setCopyTargetDate('');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              📋 คัดลอกทุกรายการไปใช้วันอื่น
            </button>
          )}
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e0e0e0' }}>
          <button
            onClick={() => setActiveTab('availability')}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'availability' ? '2px solid #007bff' : '2px solid transparent',
              color: activeTab === 'availability' ? '#007bff' : '#666',
              fontWeight: activeTab === 'availability' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            สถานะการทำงาน
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'teams' ? '2px solid #007bff' : '2px solid transparent',
              color: activeTab === 'teams' ? '#007bff' : '#666',
              fontWeight: activeTab === 'teams' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            จัดการทีม
          </button>
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
          {activeTab === 'availability' ? (
            <>
              <div style={{
                padding: '15px 20px',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#fff',
              }}>
                <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                  ทีมที่พร้อมทำงาน
                </h2>
              </div>
              {isLoading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลด...</div>
              ) : (
                <TeamAvailabilityList
                  availabilities={availabilities}
                  teams={teams}
                  selectedDate={selectedDate}
                  onToggle={handleToggleAvailability}
                  onAddTeam={() => setActiveTab('teams')}
                />
              )}
            </>
          ) : (
            <>
              <div style={{
                padding: '15px 20px',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#fff',
              }}>
                <button
                  onClick={handleNewTeam}
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
                  + เพิ่มทีมใหม่
                </button>
              </div>

              {isLoading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลด...</div>
              ) : (
                <>
                  <TeamList
                    teams={teams}
                    selectedTeam={selectedTeam}
                    onSelect={handleTeamSelect}
                    onDelete={handleTeamDelete}
                  />
                  {selectedTeam && (
                    <div style={{
                      borderTop: '1px solid #e0e0e0',
                      padding: '20px',
                      backgroundColor: '#fff',
                      maxHeight: '40vh',
                      overflowY: 'auto',
                    }}>
                      <TeamForm
                        team={selectedTeam}
                        onSave={handleTeamSave}
                        onCancel={() => setSelectedTeam(null)}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#fff', overflowY: 'auto' }}>
          {activeTab === 'availability' ? (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px' }}>
                สถานะการทำงานของทีม
              </h2>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                เลือกวันที่และทำเครื่องหมายทีมที่พร้อมทำงานในวันนั้น
              </p>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                marginBottom: '20px',
              }}>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <strong>จำนวนทีมทั้งหมด:</strong> {teams.length} ทีม
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                  <strong>ทีมที่พร้อมทำงาน:</strong>{' '}
                  {availabilities.filter(a => a.is_available).length} ทีม
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px' }}>
                จัดการทีม
              </h2>
              <p style={{ color: '#666' }}>
                เพิ่ม แก้ไข หรือลบทีมเจ้าหน้าที่ไฟป่า
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Copy Dialog */}
      {showCopyDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            minWidth: '400px',
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
              คัดลอกทุกรายการไปใช้วันอื่น
            </h3>
            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                วันที่ปัจจุบัน: <strong>{new Date(selectedDate).toLocaleDateString('th-TH')}</strong>
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                จำนวนรายการ: <strong>{availabilities.length} รายการ</strong>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                เลือกวันที่ต้องการ copy ไป
              </label>
              <input
                type="date"
                value={copyTargetDate}
                onChange={(e) => setCopyTargetDate(e.target.value)}
                min={new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCopyDialog(false);
                  setCopyTargetDate('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCopyAllAvailability}
                disabled={!copyTargetDate}
                style={{
                  padding: '10px 20px',
                  backgroundColor: copyTargetDate ? '#007bff' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: copyTargetDate ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                }}
              >
                คัดลอกทุกรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

