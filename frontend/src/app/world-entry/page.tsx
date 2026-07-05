'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { DRENNIA } from '../../data/countries/varelia/drennia';

const CONTINENTS = [
  {
    id: 'varelia',
    name: 'Varelia',
    shortDesc: 'Old-power heart of the world: historic states, wealthy economies, mature institutions, and long-standing global influence.',
    color: '#C9A24A',
    accentBg: 'rgba(201,162,74,0.08)',
    activeBorder: 'rgba(201,162,74,0.70)',
    activeGlow: '0 0 22px rgba(201,162,74,0.22)',
  },
  {
    id: 'solkar',
    name: 'Solkar',
    shortDesc: 'Population and economic giant: massive cities, dense societies, manufacturing strength, technology, and rising global influence.',
    color: '#a3e635',
    accentBg: 'rgba(163,230,53,0.07)',
    activeBorder: 'rgba(163,230,53,0.65)',
    activeGlow: '0 0 22px rgba(163,230,53,0.18)',
  },
  {
    id: 'azhara',
    name: 'Azhara',
    shortDesc: 'Resource frontier: oil, minerals, trade routes, young populations, instability, conflict, and fast-growing ambition.',
    color: '#f97316',
    accentBg: 'rgba(249,115,22,0.08)',
    activeBorder: 'rgba(249,115,22,0.65)',
    activeGlow: '0 0 22px rgba(249,115,22,0.20)',
  },
  {
    id: 'norvane',
    name: 'Norvane',
    shortDesc: 'Emerging frontier: wide landscapes, developing economies, maritime nations, alliances, and rising powers.',
    color: '#22d3ee',
    accentBg: 'rgba(34,211,238,0.07)',
    activeBorder: 'rgba(34,211,238,0.60)',
    activeGlow: '0 0 22px rgba(34,211,238,0.18)',
  },
];

function DrenniaCard({ onChoose }: { onChoose: () => void }) {
  return (
    <div
      className="rounded-sm overflow-hidden flex flex-col"
      style={{
        background: 'rgba(17,19,26,0.92)',
        border: '1px solid rgba(201,162,74,0.30)',
        boxShadow: '0 0 40px rgba(201,162,74,0.10), 0 8px 40px rgba(0,0,0,0.55)',
        width: '100%',
        maxWidth: '340px',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, rgba(201,162,74,0.12), rgba(201,162,74,0.04))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="shrink-0 overflow-hidden rounded-sm"
            style={{ width: '40px', height: '27px', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <img src={DRENNIA.flagPath} alt="Drennia flag" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <span className="text-white font-bold text-sm tracking-wide">
            {DRENNIA.countryName}
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
          style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.28)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#22c55e', boxShadow: '0 0 5px rgba(34,197,94,0.8)' }} />
          <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.15em]" style={{ color: '#4ade80' }}>
            {DRENNIA.governmentType}
          </span>
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="text-[12px] leading-relaxed text-zinc-300 mb-4 font-sans">
          Drennia is WORLDr’s first active nation — a small constitutional monarchy where NPC parties, royal figures, companies, state institutions, and public records already exist before players rise.
        </p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
          <div>
            <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.18em] mb-0.5">Capital</div>
            <div className="text-zinc-200 text-xs font-semibold">{DRENNIA.capitalName}</div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.18em] mb-0.5">Status</div>
            <div className="text-zinc-200 text-xs font-semibold text-emerald-400">Active Pre-Alpha</div>
          </div>
        </div>

        <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.18em] mb-1.5">States</div>
        <div className="flex flex-wrap gap-2">
          {['Drennport State', 'Ironvale State', 'Greenmere State', 'Westport State'].map(s => (
            <span key={s} className="px-2 py-1 rounded-sm text-[10px] text-zinc-300" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-4 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

      <div className="px-4 py-3">
        <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] mb-2.5">
          First Playable Paths
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-3 py-2 rounded-sm" style={{ background: 'rgba(201,162,74,0.08)', border: '1px solid rgba(201,162,74,0.22)' }}>
            <div className="flex items-center gap-2">
              <span className="text-base">🏛️</span>
              <span className="text-[11px] font-semibold text-zinc-200">Politician</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-sm" style={{ background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.22)' }}>
            <div className="flex items-center gap-2">
              <span className="text-base">📈</span>
              <span className="text-[11px] font-semibold text-zinc-200">Businessman</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-4 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

      <div className="px-4 py-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onChoose}
          className="group relative w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-bold uppercase tracking-[0.18em] rounded-sm overflow-hidden transition-all duration-200"
          style={{ background: 'linear-gradient(135deg, #C9A24A, #E0B85A)', color: '#fff', boxShadow: '0 4px 20px rgba(201,162,74,0.30)' }}
        >
          <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)' }} />
          Choose Drennia
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function WorldEntryPage() {
  const router = useRouter();
  const [activeContinent, setActiveContinent] = useState(CONTINENTS[0].id);
  const [revealed, setRevealed] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
      if (true) {
        setAuthorized(true);
      }
    }
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, [router]);

  const current = CONTINENTS.find((c) => c.id === activeContinent)!;

  const handleChooseDrennia = () => {
    localStorage.setItem('worldr_selected_continent', 'Varelia');
    localStorage.setItem('worldr_selected_motherland', 'Drennia');
    router.push('/start/character');
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090A0F]">
        <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col transition-all duration-500"
      style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(14px)', backgroundColor: '#090A0F' }}
    >
      <div className="px-4 md:px-10 pt-10 pb-4 max-w-6xl mx-auto w-full">
        <div className="mb-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
          <span className="text-[10px] font-mono text-amber-500/60 uppercase tracking-[0.25em]">
            World Entry
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-1">
          Choose Your Motherland
        </h1>
        <p className="text-zinc-500 text-sm">
          Select the continent and nation where your life begins.
        </p>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 md:px-10 pb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CONTINENTS.map((c) => {
            const isActive = c.id === activeContinent;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveContinent(c.id)}
                className="text-left rounded-sm p-4 transition-all duration-200"
                style={
                  isActive
                    ? { background: c.accentBg, border: `1.5px solid ${c.activeBorder}`, boxShadow: c.activeGlow }
                    : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-[0.15em] font-mono" style={{ color: isActive ? c.color : '#52525b' }}>
                    {c.name}
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: c.color, boxShadow: `0 0 6px ${c.color}` }} />}
                </div>
                <p className="text-[10px] leading-relaxed font-mono" style={{ color: isActive ? '#a1a1aa' : '#3f3f46' }}>
                  {c.shortDesc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 md:px-10 mb-5">
        <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-10 pb-8">
        {activeContinent === 'varelia' ? (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] px-2 py-1 rounded-sm" style={{ background: 'rgba(201,162,74,0.08)', border: '1px solid rgba(201,162,74,0.25)', color: '#818cf8' }}>Varelia</span>
              <span className="text-zinc-600 font-mono text-[9px]">·</span>
              <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest">1 nation available</span>
            </div>

            <div className="flex flex-wrap gap-5">
              <DrenniaCard onChoose={handleChooseDrennia} />
              <div className="rounded-sm flex flex-col items-center justify-center px-6 py-10 text-center" style={{ width: '200px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.06)' }}>
                <div className="w-8 h-8 rounded-sm flex items-center justify-center mb-3" style={{ background: 'rgba(201,162,74,0.07)', border: '1px solid rgba(201,162,74,0.15)' }}>
                  <svg className="w-4 h-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="#C9A24A" strokeWidth={1.5}><path strokeLinecap="round" d="M12 4v16m8-8H4" /></svg>
                </div>
                <p className="text-zinc-700 font-mono text-[9px] uppercase tracking-widest leading-relaxed">More Varelian<br />nations coming</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-sm border border-dashed flex flex-col items-center justify-center py-14 px-6 text-center" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
            <div className="w-12 h-12 rounded-sm flex items-center justify-center mb-4" style={{ background: current.accentBg, border: `1px solid ${current.activeBorder}` }}>
              <svg className="w-6 h-6 opacity-60" viewBox="0 0 24 24" fill="none" stroke={current.color} strokeWidth={1}>
                <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945" />
                <path d="M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-sm mb-1">{current.name} nations are in development.</h3>
            <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest">Nations will be added one by one as WORLDr expands.</p>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2 text-zinc-700 font-mono text-[9px] uppercase tracking-widest">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 8v4l2 2" /></svg>
          WORLDr is launching with Drennia (Varelia). More nations will be added progressively.
        </div>
      </div>
    </div>
  );
}

