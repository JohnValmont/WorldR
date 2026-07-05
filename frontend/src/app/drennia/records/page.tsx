'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const T = {
  bg: '#090A0F', panel: '#11131A', paper: '#1E1A15',
  border: '#2A2630', borderGold: 'rgba(201,162,74,0.22)',
  gold: '#C9A24A', ivory: '#F4EBD6', muted: '#A79D8C', faint: '#6B6358',
  mint: '#36D399', steel: '#4B6382', burgundy: '#8F3D3D',
};

interface LifeRecord { id: string; type: string; summary: string; createdAt: string; }

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'business', label: 'Business' },
  { id: 'contract', label: 'Contracts' },
  { id: 'financial', label: 'Financial' },
  { id: 'offer', label: 'Offers' },
  { id: 'failure', label: 'Failures' },
];

const TYPE_COLOR: Record<string, string> = {
  business: T.gold, contract: T.mint, financial: T.steel, offer: '#60a5fa', failure: T.burgundy,
};

export default function RecordsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [records, setRecords] = useState<LifeRecord[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    
    setAuthorized(true);
    const raw = localStorage.getItem('worldr_records_v1');
    if (raw) setRecords(JSON.parse(raw));
  }, [router]);

  if (!authorized) return null;

  const filtered = filter === 'all' ? records : records.filter(r => r.type === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '24px 24px 16px', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '4px' }}>Permanent Archive</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: T.ivory, margin: '0 0 4px' }}>Records</h1>
        <p style={{ fontSize: '12px', color: T.muted }}>Your permanent biography: business filings, contracts, registry actions, and financial movements.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', padding: '0 24px 16px', flexShrink: 0 }}>
        {[
          { label: 'Total Records', value: records.length, color: T.ivory },
          { label: 'Business Filings', value: records.filter(r => r.type === 'business').length, color: T.gold },
          { label: 'Contracts Won', value: records.filter(r => r.type === 'contract').length, color: T.mint },
        ].map(s => (
          <div key={s.label} style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '12px 20px', flex: 1 }}>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.faint, marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0', padding: '0 24px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, overflowX: 'auto' }}>
        {FILTER_TABS.map(tab => {
          const count = tab.id === 'all' ? records.length : records.filter(r => r.type === tab.id).length;
          const isActive = filter === tab.id;
          return (
            <button key={tab.id} onClick={() => setFilter(tab.id)} style={{ padding: '10px 16px', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: isActive ? 700 : 500, color: isActive ? T.gold : T.muted, background: 'transparent', border: 'none', borderBottom: isActive ? `2px solid ${T.gold}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Records */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>📋</div>
            <p style={{ fontSize: '12px', color: T.faint, textAlign: 'center' }}>
              {filter === 'all' ? 'No records yet. Incorporate a business or win a contract to start building your file.' : `No ${filter} records yet.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {filtered.map(record => {
              const date = new Date(record.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              const typeColor = TYPE_COLOR[record.type] || T.muted;
              return (
                <div key={record.id} style={{ background: T.paper, border: `1px solid ${T.border}`, padding: '16px', borderLeft: `3px solid ${typeColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.12em', color: typeColor }}>{record.type}</span>
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint }}>{date}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: T.muted, lineHeight: 1.6, margin: 0 }}>{record.summary}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

