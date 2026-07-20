'use client';
import React, { useState } from 'react';
import { T, MONO, HEADING, BODY } from '../_lib/theme';

export type PoliticsSection =
  | 'overview' | 'nation' | 'party' | 'elections' | 'legislature' | 'policy' | 'assembly' | 'lobby' | 'legacy';

function Icon({ name }: { name: PoliticsSection }) {
  const c = {
    width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.75,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'overview':    return (<svg {...c}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>);
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
  { label: 'Command', items: [{ id: 'overview', label: 'Command Center' }, { id: 'nation', label: 'Nation' }] },
  { label: 'Politics', items: [{ id: 'party', label: 'Party' }, { id: 'elections', label: 'Elections' }, { id: 'legislature', label: 'Legislature' }, { id: 'assembly', label: 'Assembly' }] },
  { label: 'Governance', items: [{ id: 'policy', label: 'Policy' }, { id: 'lobby', label: 'Lobby' }] },
  { label: 'Character', items: [{ id: 'legacy', label: 'Legacy' }] },
];

interface Props {
  active: PoliticsSection;
  onSelect: (id: PoliticsSection) => void;
  myPartyName?: string;
  myPartyNation?: string;
}

function NavItem({ item, isActive, onSelect }: {
  item: { id: PoliticsSection; label: string };
  isActive: boolean;
  onSelect: (id: PoliticsSection) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      className="sidebar-nav-item"
      onClick={() => onSelect(item.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%',
        padding: '7px 10px', borderRadius: 8, marginBottom: 1,
        background: isActive
          ? 'linear-gradient(135deg, rgba(79,110,247,0.15), rgba(79,110,247,0.07))'
          : hover ? 'rgba(255,255,255,0.04)' : 'transparent',
        color: isActive ? '#F0F4FF' : hover ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)',
        cursor: 'pointer', textAlign: 'left',
        border: isActive ? '1px solid rgba(79,110,247,0.28)' : '1px solid transparent',
        transition: 'all 0.18s cubic-bezier(0.25, 0.8, 0.25, 1)',
        position: 'relative',
      }}
    >
      {/* Animated left indicator bar */}
      <span style={{
        width: 3,
        height: isActive ? 18 : hover ? 10 : 0,
        borderRadius: 2, flexShrink: 0,
        background: isActive ? 'linear-gradient(180deg, #7B9FFF, #4F6EF790)' : 'rgba(255,255,255,0.3)',
        boxShadow: isActive ? '0 0 8px #7B9FFF60' : 'none',
        transition: 'all 0.2s ease',
      }} />

      {/* Icon */}
      <span style={{
        color: isActive ? '#7B9FFF' : hover ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)',
        transition: 'color 0.18s ease', flexShrink: 0, display: 'flex', alignItems: 'center',
      }}>
        <Icon name={item.id} />
      </span>

      {/* Label */}
      <span style={{
        fontSize: 12, fontWeight: isActive ? 600 : 400,
        letterSpacing: '-0.01em', fontFamily: "'Inter', sans-serif", flex: 1,
      }}>
        {item.label}
      </span>

      {/* Active chevron */}
      {isActive && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="#7B9FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: 0.5, flexShrink: 0 }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      )}
    </button>
  );
}

export default function PoliticsSidebar({ active, onSelect, myPartyName, myPartyNation }: Props) {
  return (
    <aside className="politics-sidebar-container" style={{
      background: 'linear-gradient(180deg, rgba(5,5,15,0.97) 0%, rgba(7,7,20,0.95) 100%)',
      backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      fontFamily: "'Inter', sans-serif", zIndex: 40, position: 'relative',
    }}>

      {/* Top accent gradient line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(79,110,247,0.5), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Branding header */}
      <div className="sidebar-brand" style={{ padding: '14px 14px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {/* Icon crest */}
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, rgba(79,110,247,0.25), rgba(79,110,247,0.10))',
            border: '1px solid rgba(79,110,247,0.32)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(79,110,247,0.15)',
            flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="#7B9FFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18"/><path d="M5 21V10M9 21V10M15 21V10M19 21V10"/>
              <path d="M3 10 12 4l9 6"/>
            </svg>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'uppercase', letterSpacing: '0.14em',
              fontSize: 8.5, color: '#7B9FFF',
              fontWeight: 600, opacity: 0.75, marginBottom: 3,
            }}>Political Desk</div>
            <div style={{
              color: '#F0F4FF', fontWeight: 700, fontSize: 13,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '-0.01em', lineHeight: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{myPartyName || 'Unaligned'}</div>
          </div>
        </div>

        {/* Jurisdiction pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 7px', borderRadius: 99,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#10D67A', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#8890A8', fontWeight: 500 }}>
            {myPartyNation || 'National'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav-groups" style={{
        display: 'flex', flexDirection: 'column',
        padding: '0 10px', flex: 1, overflowY: 'auto', gap: 2,
      }}>
        {GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 6 }}>
            <div className="sidebar-nav-group-label" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 10px 4px',
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: '#454D65',
                fontWeight: 600, whiteSpace: 'nowrap',
              }}>{group.label}</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
            </div>
            {group.items.map((it) => (
              <NavItem key={it.id} item={it} isActive={it.id === active} onSelect={onSelect} />
            ))}
          </div>
        ))}
      </nav>

      {/* Leader badge */}
      {myPartyName && (
        <div className="sidebar-leader" style={{
          padding: '10px 14px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(79,110,247,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#10D67A', boxShadow: '0 0 8px #10D67A',
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ color: '#8890A8', fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500 }}>
              Party Leader
            </span>
            <span style={{
              marginLeft: 'auto',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#10D67A', fontWeight: 700, opacity: 0.9,
            }}>You</span>
          </div>
        </div>
      )}
    </aside>
  );
}
