'use client';

import Link from 'next/link';

export default function Dashboard() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px',
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '700',
          color: '#333',
          marginBottom: '10px',
        }}>
          Dashboard
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#666',
          marginBottom: '40px',
        }}>
          ระบบวางแผนจัดการการเผาเพื่อทำแนวกันไฟ
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginTop: '40px',
        }}>
          {/* Placeholder cards for future features */}
          <div style={{
            backgroundColor: '#fff',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '10px',
              color: '#333',
            }}>
              สถิติการเผา
            </h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              ข้อมูลสถิติการเผารวม
            </p>
          </div>

          <div style={{
            backgroundColor: '#fff',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '10px',
              color: '#333',
            }}>
              แผนการเผา
            </h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              แผนการเผาที่ได้รับการอนุมัติ
            </p>
          </div>

          <div style={{
            backgroundColor: '#fff',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '10px',
              color: '#333',
            }}>
              พยากรณ์อากาศ
            </h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              ข้อมูลพยากรณ์อากาศล่าสุด
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
