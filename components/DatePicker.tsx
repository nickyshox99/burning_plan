'use client';

interface DatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

export default function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
      <label style={{ fontSize: '14px', fontWeight: '500', color: '#666' }}>
        เลือกวันที่:
      </label>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        style={{
          padding: '8px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}

