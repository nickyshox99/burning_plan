'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/zones', label: 'Manage Zones' },
    { href: '/weather-forecast', label: 'Weather Forecast' },
    { href: '/daily-burn-limits', label: 'Daily Burn Limits' },
    { href: '/teams', label: 'Manage Teams' },
    { href: '/burn-requests', label: 'Burn Requests' },
    { href: '/optimize', label: 'Plan(MIP)' },
    { href: '/optimize-genetic', label: 'Plan(Genetic)' },
  ];

  return (
    <nav style={{
      backgroundColor: '#fff',
      borderBottom: '1px solid #e0e0e0',
      padding: '0 20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        height: '64px',
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#333',
          marginRight: '40px',
        }}>
          Burning Plan
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  color: isActive ? '#007bff' : '#666',
                  backgroundColor: isActive ? '#e3f2fd' : 'transparent',
                  fontWeight: isActive ? '600' : '400',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

