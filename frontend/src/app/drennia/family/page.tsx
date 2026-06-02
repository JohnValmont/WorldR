'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const T = {
  bg: '#090A0F',
  panel: '#11131A',
  paper: '#1E1A15',
  border: '#2A2630',
  gold: '#C9A24A',
  ivory: '#F4EBD6',
  muted: '#A79D8C',
  faint: '#6B6358',
};

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.gold, fontWeight: 700, marginBottom: '16px' }}>
    {children}
  </div>
);

const FieldRow = ({ label, value }: { label: string; value: string | number }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
    <span style={{ fontSize: '11px', color: T.muted }}>{label}</span>
    <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: T.ivory }}>{value}</span>
  </div>
);

export default function FamilyPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [citizenFile, setCitizenFile] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }

    const fileStr = localStorage.getItem('worldr_citizen_file_v1');
    if (fileStr) {
      setCitizenFile(JSON.parse(fileStr));
    } else {
      // Allow passing through if they somehow don't have a file, just to avoid blocking.
    }
    
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>
      
      {/* Title */}
      <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: T.ivory, margin: '0 0 8px' }}>Family</h1>
        <p style={{ fontSize: '13px', color: T.muted, lineHeight: 1.6, maxWidth: '600px' }}>
          Your household, obligations, relatives, lifestyle, and personal responsibilities will shape your public and business life.
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '860px' }}>
        
        {/* Household File */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '24px' }}>
          <SectionHeader>Household File</SectionHeader>
          <FieldRow label="Home State" value={citizenFile?.motherland || 'Drennia'} />
          <FieldRow label="Household Background" value={citizenFile?.earlyLeaning || 'Unrecorded'} />
          <FieldRow label="Early Burden" value={citizenFile?.obligations?.[0] || 'None'} />
        </div>

        {/* Family Status */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '24px' }}>
          <SectionHeader>Family Status</SectionHeader>
          <FieldRow label="Spouse" value="None" />
          <FieldRow label="Children" value="None" />
          <FieldRow label="Household Assets" value="None" />
          <FieldRow label="Active Expenses" value="None" />
        </div>

        {/* Future Systems Locked */}
        <div style={{ gridColumn: '1 / -1', background: T.paper, border: `1px solid ${T.border}`, padding: '24px' }}>
          <SectionHeader>Future Family Systems</SectionHeader>
          <p style={{ fontSize: '12px', color: T.faint, marginBottom: '20px' }}>
            The following mechanics will unlock in future updates as the life simulation deepens.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {['Marriage', 'Children', 'Household Expenses', 'Housing', 'Family Businesses', 'Inheritance', 'Family Scandals', 'Family Support Network'].map(sys => (
              <div key={sys} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, fontSize: '11px', color: T.muted }}>
                🔒 {sys}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
