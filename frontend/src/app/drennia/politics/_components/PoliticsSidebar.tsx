'use client';
import React from 'react';
import { T, MONO, HEADING, BODY } from '../_lib/theme';

export type PoliticsSection =
  | 'overview' | 'nation' | 'party' | 'elections' | 'legislature' | 'policy' | 'assembly' | 'lobby' | 'legacy';

function Icon({ name }: { name: PoliticsSection }) {
  const c = {
    width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.8,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'overview':    return (<svg {...c}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>);
    case 'nation':      return (<svg {...c}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>);
    case 'party':       return (<svg {...c}><path d="M4 22V4"/><path d="M4 5h11l-1.6 4L15 13H4"/></svg>);
    case 'elections':   return (<svg {...c}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m8.5 12 2 2 4.5-4.5"/></svg>);
    case 'legislature': return (<svg {...c}><path d="M3 21h18"/><path d="M5 21V10M9 21V10M15 21V10M19 21V10"/><path d="M3 10 12 4l9 6"/></svg>);
    case 'policy':      return (<svg {...c}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>);
    case 'assembly':    return (<svg {...c}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.2"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><path d="M15 20c0-2 1-3.4 3-3.4s3 1.4 3 3.4"/></svg>);
    case 'lobby':       return (<svg {...c}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>);
    case 'legacy':      return (<svg {...c}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>);
    default:            return null;
  }
}

const GROUPS: Array<{ label: string; items: Array<{ id: PoliticsSection; label: string }> }> = [
  {
    label: 'Command',
    items: [
      { id: 'overview',    label: 'Command Center' },
      { id: 'nation',      label: 'Nation' },
    ],
  },
  {
    label: 'Politics',
    items: [
      { id: 'party',       label: 'Party' },
      { id: 'elections',   label: 'Elections' },
      { id: 'legislature', label: 'Legislature' },
      { id: 'assembly',    label: 'Assembly' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { id: 'policy',      label: 'Policy' },
      { id: 'lobby',       label: 'Lobby' },
    ],
  },
  {
    label: 'Character',
    items: [
      { id: 'legacy',      label: 'Legacy' },
    ],
  },
];

interface Props {
  active: PoliticsSection;
  onSelect: (id: PoliticsSection) => void;
  myPartyName?: string;
  myPartyNation?: string;
}

export default function PoliticsSidebar({ active, onSelect, myPartyName, myPartyNation }: Props) {
  return (
    <aside className="politics-sidebar-container" style={{ background: 'rgba(5, 5, 10, 0.5)', backdropFilter: 'blur(24px)', borderRight: `1px solid rgba(255,255,255,0.06)`, display: 'flex', flexDirection: 'column', flexShrink: 0, fontFamily: BODY, zIndex: 40 }}>
      {/* Branding header */}
      <div className="sidebar-brand" style={{ padding: '32px 24px 24px' }}>
        <div style={{ fontFamily: HEADING, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Political Desk</div>
        <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 20, fontFamily: HEADING, marginTop: 8, letterSpacing: '-0.02em' }}>{myPartyName || 'Unaligned'}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: HEADING, fontSize: 13, marginTop: 4 }}>{myPartyNation || 'National'}</div>
      </div>

      {/* Navigation groups */}
      <nav className="sidebar-nav-groups" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px', flex: 1, overflowY: 'auto' }}>
        {GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 12 }}>
            <div className="sidebar-nav-group-label" style={{ fontFamily: HEADING, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', padding: '12px 12px 8px', fontWeight: 600 }}>
              {group.label}
            </div>
            {group.items.map((it) => {
              const on = it.id === active;
              return (
                <button
                  key={it.id}
                  className="sidebar-nav-item"
                  onClick={() => onSelect(it.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                    background: on ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: on ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer', textAlign: 'left',
                    border: '1px solid transparent',
                    transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!on) {
                      e.currentTarget.style.color = '#FFFFFF';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!on) {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {/* Active indicator bar */}
                  <span style={{ width: 4, height: 16, borderRadius: 2, flexShrink: 0, background: on ? '#FFFFFF' : 'transparent', transition: 'all 0.2s ease' }} />
                  <Icon name={it.id} />
                  <span style={{ fontSize: 14, fontWeight: on ? 500 : 400, letterSpacing: '-0.01em' }}>{it.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Leader badge */}
      <div className="sidebar-leader" style={{ padding: '24px', borderTop: `1px solid rgba(255,255,255,0.06)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: T.mint, display: 'inline-block', boxShadow: `0 0 12px ${T.mint}` }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: HEADING, fontSize: 13, fontWeight: 500 }}>Leader — You</span>
        </div>
      </div>
    </aside>
  );
}
