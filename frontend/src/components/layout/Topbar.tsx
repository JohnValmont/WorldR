'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

export default function Topbar() {
  const { user, logout } = useAuthStore();
  const { nation } = useNationStore();
  const router = useRouter();

  const handleLogout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { /* ignore */ }
    }
    logout();
    router.push('/login');
  };

  const currentYear = nation ? YEAR_BASE + Math.floor(nation.currentTick / 12) : YEAR_BASE;
  const currentMonth = nation ? (nation.currentTick % 12) + 1 : 1;

  return (
    <header className="h-11 bg-zinc-950 border-b border-zinc-800 flex items-center px-3 shrink-0 gap-3">

      {/* Nation identity */}
      <div className="flex items-center gap-2 mr-auto">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <NationFlag size="xs" />
        <div className="flex flex-col">
          <span className="text-amber-400 font-bold text-xs uppercase tracking-widest leading-none">
            {nation?.name || 'Keldoria'}
          </span>
          <span className="text-zinc-600 text-[8px] font-mono leading-none mt-0.5">
            YEAR {currentYear} AE · MO {currentMonth} · CONST. MONARCHY
          </span>
        </div>
      </div>

      {/* Live metrics strip */}
      {nation && (
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-zinc-600 uppercase">GDP</span>
            <span className="text-[10px] font-mono text-zinc-300">${fmtNum(nation.gdp)}</span>
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-zinc-600 uppercase">CPI</span>
            <span className={`text-[10px] font-mono ${nation.inflationCpi > 0.05 ? 'text-red-400' : nation.inflationCpi > 0.03 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {(nation.inflationCpi * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-zinc-600 uppercase">APR</span>
            <span className={`text-[10px] font-mono ${nation.approval < 0.4 ? 'text-red-400' : nation.approval > 0.6 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {(nation.approval * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-zinc-600 uppercase">STAB</span>
            <span className={`text-[10px] font-mono ${nation.stability < 0.4 ? 'text-red-400' : nation.stability > 0.6 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {(nation.stability * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-zinc-600 uppercase">TRSRY</span>
            <span className={`text-[10px] font-mono ${nation.treasury < 0 ? 'text-red-400' : 'text-zinc-300'}`}>
              ${fmtNum(nation.treasury)}
            </span>
          </div>
        </div>
      )}

      {/* Monarch + User */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden lg:block text-[8px] text-zinc-700 font-mono border-l border-zinc-800 pl-3">
          ♔ KING ALBRECHT III
        </div>
        <div className="text-[8px] text-zinc-700 font-mono border-l border-zinc-800 pl-3">
          {user?.display_name || user?.username}
        </div>
        <button
          onClick={handleLogout}
          className="text-[8px] text-zinc-600 hover:text-red-400 font-mono uppercase tracking-wider transition-colors"
        >
          [EXIT]
        </button>
      </div>
    </header>
  );
}
