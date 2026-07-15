'use client';
import React from 'react';
import { T, MONO, stampStyle } from '../_lib/theme';

export type PoliticsSection =
  | 'overview' | 'party' | 'campaign' | 'elections' | 'legislature' | 'policy' | 'assembly' | 'lobby';

function Icon({ name }: { name: PoliticsSection }) {
  const c = {
    width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.7,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'overview':    return (<svg {...c}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>);
    case 'party':       return (<svg {...c}><path d="M4 22V4"/><path d="M4 5h11l-1.6 4L15 13H4"/></svg>);
    case 'campaign':    return (<svg {...c}><path d="m3 11 15-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.2-3"/></svg>);
    case 'elections':   return (<svg {...c}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m8.5 12 2 2 4.5-4.5"/></svg>);
    case 'legislature': return (<svg {...c}><path d="M3 21h18"/><path d="M5 21V10M9 21V10M15 21V10M19 21V10"/><path d="M3 10 12 4l9 6"/></svg>);
    case 'policy':      return (<svg {...c}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>);
    case 'assembly':    return (<svg {...c}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.2"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><path d="M15 20c0-2 1-3.4 3-3.4s3 1.4 3 3.4"/></svg>);
    case 'lobby':       return (<svg {...c}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>);
    default:            return null;
  }
}

const ITEMS: { id: PoliticsSection; label: string }[] = [
  { id: 'overview',    label: 'Overview' },
  { id: 'party',       label: 'Party' },
  { id: 'campaign',    label: 'Campaign' },
  { id: 'elections',   label: 'Elections' },
  { id: 'legislature', label: 'Legislature' },
  { id: 'policy',      label: 'Policy' },
  { id: 'assembly',    label: 'Assembly' },
  { id: 'lobby',       label: 'Lobby' },
];

interface Props {
  active: PoliticsSection;
  onSelect: (id: PoliticsSection) => void;
  myPartyName?: string;
  myPartyNation?: string;
}

export default function PoliticsSidebar({ active, onSelect, myPartyName, myPartyNation }: Props) {
  return (
    <aside style={{ width: 232, background: T.panel, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={stampStyle}>Political Desk</div>
        <div style={{ color: T.ivory, fontWeight: 600, fontSize: 14, marginTop: 6 }}>{myPartyName || 'Unaligned'}</div>
        <div style={{ color: T.faint, fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 2 }}>{myPartyNation || 'Ironvale'}</div>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 12px' }}>
        {ITEMS.map((it) => {
          const on = it.id === active;
          return (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 4,
                background: on ? T.goldSoft : 'transparent', color: on ? T.gold : T.muted, cursor: 'pointer',
                textAlign: 'left', border: `1px solid ${on ? T.goldLine : 'transparent'}`, transition: 'color .15s, background .15s',
              }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.color = T.ivory; }}
              onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = T.muted; }}
            >
              <Icon name={it.id} />
              <span style={{ fontSize: 13.5, fontWeight: on ? 600 : 500 }}>{it.label}</span>
            </button>
          );
        })}
      </nav>
      <div style={{ marginTop: 'auto', padding: 16, borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: T.mint, display: 'inline-block' }} />
          <span style={{ color: T.faint, fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Leader · You</span>
        </div>
      </div>
    </aside>
  );
}
