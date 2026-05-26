'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { useNationStore } from '../../store/useNationStore';
import { authApi, getRefreshToken } from '../../lib/api';
import NationFlag from '../ui/NationFlag';

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
      { href: '/budget', label: 'BUDGET' },
      { href: '/laws', label: 'LAWS' },
      { href: '/parliament', label: 'PARLIAMENT' }
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
    key: 'system',
    label: 'SYSTEM',
    items: [
      { href: '/settings', label: 'SETTINGS' }
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
      <header className="h-14 bg-zinc-950 border-b border-zinc-900/60 flex items-center px-4 gap-4 justify-between">
        
        {/* Left: Nationhood Logo & Tagline */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-6 h-6 bg-amber-500 flex items-center justify-center rounded shadow-md shadow-amber-500/10">
            <span className="text-black font-black text-xs font-mono">W</span>
          </div>
          <div className="flex flex-col">
            <span className="text-amber-400 font-black text-xs tracking-widest leading-none">WORLDR</span>
            <span className="text-zinc-600 text-[8px] uppercase tracking-widest leading-none mt-0.5">Alpha v0.1</span>
          </div>
        </div>

        {/* Center: Game Date, Tick Clock Cockpit */}
        {nation && (
          <div className="flex items-center gap-6">
            
            {/* Game Date */}
            <div className="flex flex-col justify-center">
              <span className="text-[7px] text-zinc-600 uppercase tracking-widest font-mono font-bold">GAME DATE</span>
              <span className="text-zinc-200 text-[11px] font-mono font-bold leading-none mt-0.5 uppercase">
                {currentMonthName}, {currentYear} AE
              </span>
            </div>

            {/* Tick Number */}
            <div className="flex flex-col justify-center border-l border-zinc-800 pl-4">
              <span className="text-[7px] text-zinc-600 uppercase tracking-widest font-mono font-bold">TICK</span>
              <span className="text-amber-400 text-[11px] font-mono font-black leading-none mt-0.5">
                {nation.currentTick}
              </span>
            </div>

            {/* Next Tick Timing (Mock countdown matching Dravka style) */}
            <div className="flex flex-col justify-center border-l border-zinc-800 pl-4">
              <span className="text-[7px] text-zinc-600 uppercase tracking-widest font-mono font-bold">NEXT TICK</span>
              <span className="text-zinc-400 text-[11px] font-mono font-bold leading-none mt-0.5">
                5h 46m 32s
              </span>
            </div>

            {/* Metrics display bar */}
            <div className="hidden lg:flex items-center gap-4 border-l border-zinc-800 pl-4 font-mono">
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-zinc-600 uppercase">GDP</span>
                <span className="text-[10px] text-zinc-300">${fmtNum(nation.gdp)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-zinc-600 uppercase">CPI</span>
                <span className={`text-[10px] ${nation.inflationCpi > 0.05 ? 'text-red-400' : nation.inflationCpi > 0.03 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {(nation.inflationCpi * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-zinc-600 uppercase">APR</span>
                <span className={`text-[10px] ${nation.approval < 0.4 ? 'text-red-400' : nation.approval > 0.6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {(nation.approval * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-zinc-600 uppercase">STAB</span>
                <span className={`text-[10px] ${nation.stability < 0.4 ? 'text-red-400' : nation.stability > 0.6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {(nation.stability * 100).toFixed(0)}%
                </span>
              </div>
            </div>

          </div>
        )}

        {/* Right: Cash Box, User Profile & Exit */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Treasury Cash Display (Vibrant Emerald Glow) */}
          {nation && (
            <div className="px-3 py-1 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-black rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.05)] select-all shrink-0">
              CASH: ${fmtNum(nation.treasury)}
            </div>
          )}

          {/* User Tag */}
          <div className="text-[9px] text-zinc-500 font-mono border-l border-zinc-800 pl-3 hidden sm:block">
            ♔ {nation?.name?.toUpperCase() || 'KELDORIA'} · {user?.display_name?.toUpperCase() || user?.username?.toUpperCase()}
          </div>

          {/* Exit/Logout Button */}
          <button
            onClick={handleLogout}
            className="text-[9px] text-zinc-600 hover:text-red-400 font-mono font-bold uppercase tracking-wider transition-colors border-l border-zinc-800 pl-3 shrink-0"
          >
            [EXIT]
          </button>
        </div>

      </header>

      {/* ── ROW 2: PRIMARY TABS NAVIGATION ────────────────────────────────── */}
      <nav className="h-10 bg-zinc-950 border-b border-zinc-900 flex items-center px-4 gap-6 shrink-0">
        {GROUPS.map((group) => {
          const isActive = activeGroup.key === group.key;
          const firstItemHref = group.items[0].href;
          
          return (
            <Link
              key={group.key}
              href={firstItemHref}
              className={`h-full flex items-center px-2 text-[11px] font-mono tracking-widest font-black transition-all border-b-2 relative -mb-px ${
                isActive
                  ? 'border-amber-500 text-amber-400 text-shadow-glow'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {group.label}
            </Link>
          );
        })}
      </nav>

      {/* ── ROW 3: SUB-NAVIGATION CHILD LINKS ─────────────────────────────── */}
      <div className="h-9 bg-zinc-900/20 border-b border-zinc-900/60 flex items-center px-6 gap-6 shrink-0 overflow-x-auto">
        {activeGroup.items.map((item) => {
          const isChildActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[10px] font-mono tracking-wider font-extrabold uppercase transition-all duration-100 ${
                isChildActive
                  ? 'text-amber-400 bg-amber-950/20 px-2.5 py-1 rounded-md border border-amber-500/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40 px-2.5 py-1 rounded-md'
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
