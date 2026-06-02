'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const T = { bg: '#090A0F', panel: '#11131A', border: '#2A2630', gold: '#C9A24A', ivory: '#F4EBD6', muted: '#A79D8C', faint: '#6B6358' };

export default function NetworkPage() {
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, color: T.ivory, padding: '28px 24px' }}>
      <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '4px' }}>Contacts & Relationships</div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: T.ivory, margin: '0 0 8px' }}>Network</h1>
      <p style={{ fontSize: '12px', color: T.muted, marginBottom: '28px' }}>Your contacts, letters, and relationships with other operators in Drennia.</p>
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>🤝</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: T.muted, marginBottom: '8px' }}>Network Module Coming Soon</div>
        <p style={{ fontSize: '11px', color: T.faint, lineHeight: 1.7, maxWidth: '420px', margin: '0 auto' }}>
          Build contacts with other Drennia operators, send letters, track relationships, and receive private business proposals.
          This module will unlock as the world fills with other players and NPC networks.
        </p>
      </div>
    </div>
  );
}
