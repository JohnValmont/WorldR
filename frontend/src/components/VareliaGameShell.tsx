'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCharacterStore } from '../store/character.store';
import { formatNumberUS, formatMoney } from '../lib/partyHelpers';

// PALETTE
const BG = '#11140f';
const PANEL = '#1b1f1a';
const BORDER = '#2d3329';
const ACCENT = '#d4a91f';
const TEXT = '#d6d9d2';
const MUTED = '#7a8070';
const PANEL2 = '#151814';

const MAIN_TABS = ['Home', 'Actions', 'Government', 'Nation', 'World', 'Ledger'] as const;

function PartyDropdown({ ctx, onClose }: { ctx: any; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1.5 w-56 overflow-hidden z-50"
      style={{ background: PANEL, border: `1px solid ${BORDER}`, boxShadow: '0 10px 40px rgba(0,0,0,0.7)', borderRadius: '2px' }}>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="text-white font-bold text-xs leading-tight truncate mb-0.5">{ctx.partyName}</div>
        <div className="font-mono text-[9px] font-bold tracking-[0.22em]" style={{ color: ctx.partyColor }}>{ctx.partyAbbreviation}</div>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        {[{ label: 'Path', value: ctx.selectedPath }, { label: 'Leader', value: ctx.characterName }, { label: 'Country', value: ctx.countryName }].map((f) => (
          <div key={f.label} className="flex items-center justify-between">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{f.label}</span>
            <span className="text-[10px] font-semibold truncate max-w-[120px]" style={{ color: TEXT }}>{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VareliaGameShell({ activeMainTab, children, ctx, style }: { activeMainTab: string; children: React.ReactNode; ctx?: any; style?: React.CSSProperties }) {
  const router = useRouter();
  const [showPartyMenu, setShowPartyMenu] = useState(false);

  const handleLogout = () => {
    useCharacterStore.getState().resetCharacter();
    localStorage.removeItem('worldr_character');
    router.push('/');
  };

  const countryName = ctx?.countryName ?? 'Drennia';
  const continentName = ctx?.continentName ?? 'Varelia';
  const partyFunds = ctx?.partyFunds ?? 0;
  const partyAbbreviation = ctx?.partyAbbreviation ?? '—';
  const partyColor = ctx?.partyColor ?? ACCENT;

  return (
    <div className="h-screen flex flex-col overflow-hidden transition-opacity duration-500 font-sans select-none" style={{ background: BG, color: TEXT, ...style }}>
      {/* ══ TOP GAME BAR ═════════════════════════════════════════════════ */}
      <header className="shrink-0 flex items-center justify-between px-4 md:px-5 gap-3"
        style={{ height: '48px', background: PANEL, borderBottom: `1px solid ${BORDER}`, zIndex: 30 }}>
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <img src="/assets/flags/varelia/drennia.svg" alt="Drennia"
            style={{ width: '28px', height: '19px', objectFit: 'cover', borderRadius: '1px', border: `1px solid ${BORDER}`, flexShrink: 0 }} />
          <div className="flex flex-col leading-none">
            <span className="font-bold text-[12px] tracking-wide" style={{ color: TEXT }}>{countryName}</span>
            <span className="text-[8.5px] font-mono uppercase tracking-widest" style={{ color: MUTED }}>{continentName}</span>
          </div>
          <div className="h-3.5 w-px hidden md:block" style={{ background: BORDER }} />
          <div className="hidden md:flex flex-col leading-none">
            <span className="text-[10.5px] font-mono font-semibold tracking-wide" style={{ color: MUTED }}>Year 0 · Month 1 · Day 1</span>
            <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: '#3d4238' }}>00:00 · Game Start</span>
          </div>
        </div>
        {/* Right */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button id="topbar-bell" type="button" title="Notifications"
            className="w-8 h-8 flex items-center justify-center rounded-sm transition-colors"
            style={{ background: `${PANEL2}`, border: `1px solid ${BORDER}`, color: MUTED }}
            onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
            onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <div className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-sm"
            style={{ background: PANEL2, border: `1px solid ${BORDER}` }}>
            <span className="text-[8.5px] font-mono uppercase tracking-widest" style={{ color: MUTED }}>Funds</span>
            <span className="text-[11px] font-bold font-mono text-emerald-600">{formatMoney(partyFunds)}</span>
          </div>
          {ctx && ctx.partyId && (
          <div className="relative">
            <button id="party-menu-btn" type="button" onClick={() => setShowPartyMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-sm transition-opacity duration-150 hover:opacity-80"
              style={{ background: `${partyColor}14`, border: `1px solid ${partyColor}35`, color: partyColor }}>
              <span className="font-mono text-[10px] font-bold tracking-[0.18em]">{partyAbbreviation}</span>
              <svg className={`w-2.5 h-2.5 transition-transform duration-150 ${showPartyMenu ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showPartyMenu && <PartyDropdown ctx={ctx} onClose={() => setShowPartyMenu(false)} />}
          </div>
          )}
          {!ctx?.partyId && (
          <div className="relative">
            <div className="flex items-center gap-1.5 px-3 h-8 rounded-sm transition-opacity duration-150"
              style={{ background: `${partyColor}14`, border: `1px solid ${partyColor}35`, color: partyColor }}>
              <span className="font-mono text-[10px] font-bold tracking-[0.18em]">{partyAbbreviation}</span>
            </div>
          </div>
          )}
          <button id="topbar-logout" type="button" title="Logout" onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-sm text-[10px] font-mono uppercase tracking-widest transition-colors"
            style={{ background: PANEL2, border: `1px solid ${BORDER}`, color: MUTED }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#c04040')}
            onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden md:block">Logout</span>
          </button>
        </div>
      </header>

      {/* ══ MAIN NAV TABS ══════════════════════════════════════════════ */}
      <nav className="shrink-0 flex items-center px-4 md:px-5"
        style={{ height: '38px', background: PANEL, borderBottom: `1px solid ${BORDER}`, zIndex: 20 }}>
        {(MAIN_TABS as readonly string[]).map((tab) => {
          const isHome = tab === 'Home';
          const isActions = tab === 'Actions';
          const isGovernment = tab === 'Government';
          const isEnabled = isHome || isActions || isGovernment;
          const isCurrent = tab.toLowerCase() === activeMainTab.toLowerCase();
          return (
            <button key={tab} id={`main-tab-${tab.toLowerCase()}`} type="button"
              disabled={!isEnabled}
              onClick={() => {
              if (isHome) router.push('/varelia/news');
              else if (isActions) router.push('/varelia/actions');
              else if (isGovernment) router.push('/varelia/government');
            }}
              className="relative px-4 h-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-100"
              style={{
                color: isCurrent ? TEXT : isEnabled ? MUTED : '#2d3228',
                cursor: isEnabled ? 'pointer' : 'not-allowed',
                borderBottom: isCurrent ? `2px solid ${ACCENT}` : '2px solid transparent',
              }}>
              {tab}
              {!isEnabled && <span className="text-[7px] font-mono normal-case tracking-normal hidden lg:inline" style={{ color: '#2d3228' }}>soon</span>}
            </button>
          );
        })}
      </nav>

      {/* ══ CONTENT AREA ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
         {children}
      </div>
    </div>
  );
}
