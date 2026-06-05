'use client';

import React, { useState, useEffect } from 'react';
import { formatGameDate, advanceWorldArcAndProcess } from '../../lib/businessCore';

export const ENABLE_ADVANCE_ARC_TEST = process.env.NODE_ENV === 'development';

const T = {
  gold: '#C9A24A',
  ivory: '#F4EBD6',
  muted: '#A79D8C',
  border: '#2A2630'
};

export default function WorldTimeControl() {
  const [dateStr, setDateStr] = useState<string>('');
  const [isAdvancing, setIsAdvancing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDateStr(formatGameDate());
    }
  }, []);

  const handleAdvance = () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    
    // Slight delay to allow UI to show "ADVANCING ARC..."
    setTimeout(() => {
      const summary = advanceWorldArcAndProcess();
      alert(summary);
      window.location.reload();
    }, 100);
  };

  if (!dateStr) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '0 8px' }}>
      <div style={{ fontSize: '11px', color: T.gold, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right' }}>
        <div>MERIDIAN STANDARD</div>
        <div style={{ color: T.ivory }}>{dateStr}</div>
      </div>
      {ENABLE_ADVANCE_ARC_TEST && (
        <button 
          onClick={handleAdvance} 
          disabled={isAdvancing}
          style={{
            background: isAdvancing ? 'rgba(255,255,255,0.03)' : `linear-gradient(135deg, ${T.gold}, #8A6E2A)`,
            color: isAdvancing ? T.muted : '#0a0709',
            border: `1px solid ${isAdvancing ? T.border : T.gold}`,
            padding: '6px 12px',
            fontSize: '10px',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: 700,
            cursor: isAdvancing ? 'not-allowed' : 'pointer',
            opacity: isAdvancing ? 0.7 : 1,
            whiteSpace: 'nowrap'
          }}
        >
          {isAdvancing ? 'ADVANCING ARC...' : 'ADVANCE ARC — TEST'}
        </button>
      )}
    </div>
  );
}
