'use client';
import { useState, useEffect } from 'react';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

export default function RecordsStrip() {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const recordsStr = localStorage.getItem('worldr_life_records_v1');
      if (recordsStr) {
        setRecords(JSON.parse(recordsStr));
      }
    }
  }, []);

  const displayRecords = records.length > 0 
    ? records.slice(0, 5) 
    : [
        { title: 'Account verified', summary: 'Secure connection established', status: 'completed' },
        { title: 'Entered pre-alpha', summary: 'Access granted via ROSE1551', status: 'completed' },
        { title: 'Drennia selected', summary: 'Motherland assignment logged', status: 'completed' },
        { title: 'Origin pending', summary: 'Awaiting birth data', status: 'pending' },
        { title: 'First opportunity awaiting', summary: 'No moves recorded yet', status: 'pending' }
      ];

  return (
    <div 
      className="w-full"
      style={{
        marginTop: '18px',
        minHeight: '120px',
        padding: '18px 20px',
        borderRadius: theme.effects.radiusLarge,
        background: 'rgba(16,28,23,0.72)',
        border: `1px solid ${theme.colors.borders.borderMuted}`,
        boxShadow: theme.effects.shadowPanel
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
        <div>
          <div 
            style={{
              fontSize: '11px',
              letterSpacing: '0.14em',
              color: theme.colors.text.textMuted,
              textTransform: 'uppercase',
              fontWeight: 'bold',
              marginBottom: '4px'
            }}
          >
            LIFE RECORD
          </div>
          <div style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}>
            WORLDr remembers public moves, private obligations, failures, offices, and achievements.
          </div>
        </div>
      </div>

      <div className="relative flex flex-col md:flex-row justify-between w-full mt-8 md:mt-4 gap-6 md:gap-0">
        {/* Horizontal line for desktop connecting items */}
        <div 
          className="hidden md:block absolute top-[4px] left-0 right-0 h-px z-0" 
          style={{ background: theme.colors.borders.borderMuted }} 
        />

        {displayRecords.map((item, idx) => (
          <div key={idx} className="relative z-10 flex flex-row md:flex-col items-start gap-4 md:gap-3 flex-1">
            {/* Vertical line for mobile connecting items */}
            {idx < displayRecords.length - 1 && (
              <div 
                className="md:hidden absolute left-[4px] top-4 bottom-[-24px] w-px z-0" 
                style={{ background: theme.colors.borders.borderMuted }} 
              />
            )}
            
            <div 
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: (item.status === 'completed' || item.result) ? theme.colors.accents.gold : theme.colors.text.textMuted,
                boxShadow: (item.status === 'completed' || item.result) ? `0 0 10px ${theme.colors.accents.gold}80` : 'none',
                marginTop: '4px',
                flexShrink: 0
              }}
            />
            <div>
              <div 
                style={{ 
                  fontSize: '13px', 
                  fontWeight: '600',
                  color: (item.status === 'completed' || item.result) ? theme.colors.text.textPrimary : theme.colors.text.textMuted,
                  marginBottom: '2px'
                }}
              >
                {item.title}
              </div>
              <div style={{ fontSize: '11px', color: theme.colors.text.textFaint }}>
                {item.summary || item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
