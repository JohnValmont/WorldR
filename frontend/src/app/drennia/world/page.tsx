'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DrenniaMapSvg from '../../../components/maps/DrenniaMapSvg';

const T = { bg: '#090A0F', panel: '#11131A', border: '#2A2630', gold: '#C9A24A', ivory: '#F4EBD6', muted: '#A79D8C', faint: '#6B6358' };

export default function WorldPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 12px', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '4px' }}>Sovereign Territory</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: T.ivory, margin: '0 0 4px' }}>World Map</h1>
        <p style={{ fontSize: '12px', color: T.muted }}>Drennia's sovereign states, institutions, and geographic boundaries.</p>
      </div>
      {/* Map */}
      <div style={{ flex: 1, padding: '0 24px 24px', overflow: 'hidden' }}>
        <div style={{ width: '100%', height: '100%', border: `1px solid ${T.border}`, background: 'rgba(9,10,15,0.95)', overflow: 'hidden' }}>
          <DrenniaMapSvg selectedState={null} onStateSelect={() => {}} />
        </div>
      </div>
    </div>
  );
}
