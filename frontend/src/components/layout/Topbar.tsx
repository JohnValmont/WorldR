'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { useNationStore } from '../../store/useNationStore';
import { authApi, getRefreshToken } from '../../lib/api';
import NationFlag from '../ui/NationFlag';
import { useState } from 'react';

function fmtNum(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

const YEAR_BASE = 850;

const GROUPS = [
  {
    key: 'home',
    label: 'HOME',
    items: [
      { href: '/dashboard', label: 'OVERVIEW' },
      { href: '/reports', label: 'REPORTS' },
      { href: '/notifications', label: 'ALERTS' }
    ]
  },
  {
    key: 'actions',
    label: 'ACTIONS',
    items: [
      { href: '/politics', label: 'POLITICS' },
      { href: '/elections', label: 'ELECTIONS' },
      { href: '/party', label: 'MY PARTY' }
    ]
  },
  {
    key: 'government',
    label: 'GOVERNMENT',
    items: [
      { href: '/parliament', label: 'PARLIAMENT' },
      { href: '/budget', label: 'BUDGET' },
      { href: '/laws', label: 'LAWS' }
    ]
  },
  {
    key: 'nation',
    label: 'NATION',
    items: [
      { href: '/economy', label: 'ECONOMY' },
      { href: '/inflation', label: 'INFLATION' },
      { href: '/population', label: 'POPULATION' }
    ]
  },
  {
    key: 'world',
    label: 'WORLD',
    items: [
      { href: '/dashboard', label: 'WORLD OVERVIEW' }
    ]
  },
  {
    key: 'ledger',
    label: 'LEDGER',
    items: [
      { href: '/reports', label: 'FINANCIAL LEDGER' }
    ]
  }
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Topbar() {
  const { user, logout } = useAuthStore();
  const { nation } = useNationStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);

  const handleLogout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { /* ignore */ }
    }
    logout();
    router.push('/login');
  };

  const currentYear = nation ? YEAR_BASE + Math.floor(nation.currentTick / 12) : YEAR_BASE;
  const currentMonthName = nation ? MONTH_NAMES[nation.currentTick % 12] : 'January';

  // Find active group dynamically based on path
  const activeGroup = GROUPS.find(g =>
    g.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))
  ) || GROUPS[0];

  return (
    <div className="flex flex-col shrink-0 select-none">
      
      {/* ── ROW 1: METADATA, TICK COCKPIT, STATS & CASH ────────────────────── */}
      <header className="h-14 bg-[#0a0c09] border-b border-zinc-900/60 flex items-center px-4 gap-4 justify-between relative shadow-md">
        
        {/* Left: Nationhood flag & name */}
        <div className="flex items-center gap-3 shrink-0">
          <NationFlag size="xs" className="border border-zinc-700/50 shadow-sm" />
          <div className="flex flex-col">
            <span className="text-zinc-100 font-extrabold text-sm uppercase tracking-wider leading-none">
              {nation?.name || 'KELDORIA'}
            </span>
            <span className="text-zinc-500 text-[8px] uppercase tracking-widest font-mono mt-1">
              ♔ {user?.display_name || user?.username || 'Representative'}
            </span>
          </div>
        </div>

        {/* Center-Left: Game Date, Tick timer countdown */}
        {nation && (
          <div className="flex items-center gap-6 font-mono text-[10px]">
            {/* Game Date */}
            <div className="flex flex-col justify-center">
              <span className="text-[7px] text-zinc-650 uppercase tracking-widest font-extrabold font-sans leading-none">Game Date</span>
              <span className="text-zinc-300 font-bold mt-0.5 uppercase leading-none">
                {currentMonthName}, {currentYear} AE
              </span>
            </div>

            {/* Tick Number */}
            <div className="flex flex-col justify-center border-l border-zinc-900 pl-4">
              <span className="text-[7px] text-zinc-650 uppercase tracking-widest font-extrabold font-sans leading-none">Tick</span>
              <span className="text-amber-500 font-black mt-0.5 leading-none">
                {nation.currentTick}
              </span>
            </div>

            {/* Countdown timer */}
            <div className="flex flex-col justify-center border-l border-zinc-900 pl-4">
              <span className="text-[7px] text-zinc-650 uppercase tracking-widest font-extrabold font-sans leading-none">Next Tick</span>
              <span className="text-zinc-400 font-bold mt-0.5 flex items-center gap-1 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                5h 46m 32s
              </span>
            </div>

            {/* Quick Gauges */}
            <div className="hidden xl:flex items-center gap-4 border-l border-zinc-900 pl-4">
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-zinc-600 uppercase">GDP</span>
                <span className="text-[9px] text-zinc-300 font-bold">${fmtNum(nation.gdp)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-zinc-600 uppercase">CPI</span>
                <span className={`text-[9px] font-bold ${nation.inflationCpi > 0.05 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {(nation.inflationCpi * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-zinc-600 uppercase">APR</span>
                <span className={`text-[9px] font-bold ${nation.approval < 0.4 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {(nation.approval * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Right: Cash, resources, party tag, dark toggle, logout */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Treasury Cash Display */}
          {nation && (
            <div className="px-3.5 py-1.5 bg-[#0a140f] border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-black rounded-sm shadow-md shrink-0">
              💵 CASH: ${fmtNum(nation.treasury)}
            </div>
          )}

          {/* Party Tag */}
          <span className="text-[9px] font-mono px-2 py-1 bg-amber-950/20 border border-amber-500/20 text-amber-500 rounded-sm font-extrabold uppercase shrink-0">
            🏛️ Faction Admin
          </span>

          {/* Light/Dark Theme Switcher */}
          <button 
            onClick={() => setIsDark(!isDark)}
            className="w-8 h-8 rounded-sm bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-center cursor-pointer shrink-0"
            title="Toggle theme stance"
          >
            <span className="text-xs">{isDark ? '🌙' : '☀️'}</span>
          </button>

          {/* Exit/Logout */}
          <button
            onClick={handleLogout}
            className="text-[9px] text-zinc-650 hover:text-red-400 font-mono font-bold uppercase tracking-wider transition-colors border-l border-zinc-900 pl-3 shrink-0 cursor-pointer"
          >
            [Exit]
          </button>
        </div>

      </header>

      {/* ── ROW 2: PRIMARY TABS NAVIGATION (MAINNAV) ────────────────────────── */}
      <nav className="h-10 bg-[#060805] border-b border-zinc-900/60 flex items-center px-4 gap-6 shrink-0 shadow-inner">
        {GROUPS.map((group) => {
          const isActive = activeGroup.key === group.key;
          const firstItemHref = group.items[0].href;
          
          return (
            <Link
              key={group.key}
              href={firstItemHref}
              className={`h-full flex items-center px-3 text-[10px] font-mono tracking-[0.2em] font-extrabold transition-all border-b-2 relative -mb-px ${
                isActive
                  ? 'border-amber-500 text-amber-400 glow-text-amber'
                  : 'border-transparent text-zinc-600 hover:text-zinc-300'
              }`}
            >
              {group.label}
            </Link>
          );
        })}
      </nav>

      {/* ── ROW 3: SUB-NAVIGATION CHILD LINKS (SECTIONTABS) ────────────────── */}
      <div className="h-9 bg-[#040504]/40 border-b border-zinc-900/40 flex items-center px-6 gap-6 shrink-0 overflow-x-auto">
        {activeGroup.items.map((item) => {
          const isChildActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[9px] font-mono tracking-wider font-extrabold uppercase transition-all duration-100 ${
                isChildActive
                  ? 'text-amber-400 bg-amber-950/20 px-3 py-1 rounded-sm border border-amber-500/20'
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900/20 px-3 py-1 rounded-sm'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

    </div>
  );
}
