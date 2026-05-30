'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../../store/character.store';
import { LogoSVG } from '../../../components/LogoSVG';
import { PARTY_COLORS } from '../../../data/political-parties/partyLogos';
import { DRENNIA } from '../../../data/countries/varelia/drennia';
import type { RegisteredPoliticalParty } from '../../../data/political-parties/partyTypes';

// ── Continent data ─────────────────────────────────────────────────────────────

const CONTINENTS = [
  {
    id: 'varelia',
    name: 'Varelia',
    shortDesc: 'Old-power heart of the world: historic states, wealthy economies, mature institutions, and long-standing global influence.',
    color: '#6366f1',
    accentBg: 'rgba(99,102,241,0.08)',
    activeBorder: 'rgba(99,102,241,0.70)',
    activeGlow: '0 0 22px rgba(99,102,241,0.22)',
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

function buildDisplayName(first: string, middle: string, last: string) {
  return [first, middle, last].filter(Boolean).join(' ') || 'Unknown';
}

// ── Drennia country card ───────────────────────────────────────────────────────

function DrenniaCard({ onChoose }: { onChoose: () => void }) {
  const STATS = [
    { label: 'Capital',       value: DRENNIA.capitalName },
    { label: 'GDP',           value: DRENNIA.gdp },
    { label: 'GDP / Capita',  value: DRENNIA.gdpPerCapita },
    { label: 'Stability',     value: DRENNIA.stability },
    { label: 'Area',          value: DRENNIA.area },
    { label: 'Population',    value: DRENNIA.population },
  ];

  // Stability bar width (parse percent)
  const stabilityPct = parseInt(DRENNIA.stability, 10);

  return (
    <div
      className="rounded-sm overflow-hidden flex flex-col"
      style={{
        background: 'rgba(12,12,24,0.92)',
        border: '1px solid rgba(99,102,241,0.30)',
        boxShadow: '0 0 40px rgba(99,102,241,0.10), 0 8px 40px rgba(0,0,0,0.55)',
        width: '100%',
        maxWidth: '320px',
      }}
    >
      {/* ── Top strip: flag + name + government badge ── */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Left: flag + country name */}
        <div className="flex items-center gap-3">
          <div
            className="shrink-0 overflow-hidden rounded-sm"
            style={{
              width: '40px',
              height: '27px',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <img
              src={DRENNIA.flagPath}
              alt="Drennia flag"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          <span className="text-white font-bold text-sm tracking-wide">
            {DRENNIA.countryName}
          </span>
        </div>

        {/* Right: government badge */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
          style={{
            background: 'rgba(34,197,94,0.10)',
            border: '1px solid rgba(34,197,94,0.28)',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: '#22c55e', boxShadow: '0 0 5px rgba(34,197,94,0.8)' }}
          />
          <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.15em]" style={{ color: '#4ade80' }}>
            {DRENNIA.governmentType}
          </span>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.18em] mb-0.5">
                {s.label}
              </div>
              <div className="text-zinc-200 text-xs font-semibold">
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Stability visual bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8.5px] font-mono text-zinc-600 uppercase tracking-widest">Stability Index</span>
            <span className="text-[8.5px] font-mono text-zinc-400">{DRENNIA.stability}</span>
          </div>
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${stabilityPct}%`,
                background: stabilityPct >= 70
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : stabilityPct >= 50
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(90deg, #ef4444, #f87171)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* ── Active Career section ── */}
      <div className="px-4 py-3">
        <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] mb-2.5">
          Active Participation
        </div>

        <div className="space-y-1.5">
          {/* Politicians — active path */}
          <div
            className="flex items-center justify-between px-3 py-2 rounded-sm"
            style={{
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.22)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🏛️</span>
              <span className="text-[11px] font-semibold text-zinc-200">Politicians</span>
            </div>
            <span
              className="font-mono text-[10px] font-bold"
              style={{ color: '#818cf8' }}
            >
              0 / 8
            </span>
          </div>

          {/* Inactive paths */}
          {[
            { icon: '📈', label: 'Businessmen' },
            { icon: '⚔️', label: 'Military Officers' },
            { icon: '⚖️', label: 'Judicial Officers' },
            { icon: '📡', label: 'Media Figures' },
          ].map((p) => (
            <div
              key={p.label}
              className="flex items-center justify-between px-3 py-1.5 rounded-sm"
              style={{ background: 'rgba(255,255,255,0.015)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-40">{p.icon}</span>
                <span className="text-[10px] text-zinc-600">{p.label}</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
                In Development
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* ── Action area ── */}
      <div className="px-4 py-4 flex flex-col gap-2">
        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] text-center">
          First playable nation
        </p>
        <button
          id="choose-drennia-btn"
          type="button"
          onClick={onChoose}
          className="group relative w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-bold uppercase tracking-[0.18em] rounded-sm overflow-hidden transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(99,102,241,0.30)',
          }}
        >
          <span
            className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out"
            style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)' }}
          />
          Choose Drennia
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChooseMotherlandPage() {
  const router = useRouter();
  const { character } = useCharacterStore();
  const [activeContinent, setActiveContinent] = useState(CONTINENTS[0].id);
  const [revealed, setRevealed] = useState(false);
  const [selectedPath, setSelectedPath] = useState('Politician');
  const [party, setParty] = useState<RegisteredPoliticalParty | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);

    // Route guards: check character
    const charRaw =
      localStorage.getItem('worldr-character') ||
      localStorage.getItem('worldr_character');
    if (!charRaw) { router.replace('/onboarding/create-character'); return () => clearTimeout(t); }
    try {
      const charState = JSON.parse(charRaw);
      if (!charState?.state?.character?.firstName) { router.replace('/onboarding/create-character'); return () => clearTimeout(t); }
    } catch { router.replace('/onboarding/create-character'); return () => clearTimeout(t); }

    // Route guards: check path (read both key variants)
    const path =
      localStorage.getItem('worldr_selected_path') ||
      localStorage.getItem('worldr-path');
    if (!path) { router.replace('/onboarding/choose-path'); return () => clearTimeout(t); }

    // Route guard: Politician must have a party
    if (path === 'politician') {
      const partyRaw = localStorage.getItem('worldr_current_party');
      if (!partyRaw) { router.replace('/onboarding/create-party'); return () => clearTimeout(t); }
    }

    // Set display path label
    const pathLabels: Record<string, string> = {
      politician: 'Politician',
      businessman: 'Businessman',
      military: 'Military Officer',
      judicial: 'Judicial Officer',
      media: 'Media & Influence',
    };
    setSelectedPath(pathLabels[path] ?? 'Politician');

    try {
      const raw = localStorage.getItem('worldr_current_party');
      if (raw) setParty(JSON.parse(raw));
    } catch {}

    return () => clearTimeout(t);
  }, [router]);

  const current = CONTINENTS.find((c) => c.id === activeContinent)!;
  const displayName = buildDisplayName(character.firstName, character.middleName, character.lastName);
  const partyColor =
    party ? (PARTY_COLORS.find((c) => c.id === party.colorId)?.hex ?? '#f59e0b') : '#f59e0b';

  const handleChooseDrennia = () => {
    localStorage.setItem(
      'worldr_selected_country',
      JSON.stringify({
        countryId: DRENNIA.countryId,
        countryName: DRENNIA.countryName,
        continentName: DRENNIA.continentName,
        capitalName: DRENNIA.capitalName,
        cultureName: DRENNIA.cultureName,
        governmentType: DRENNIA.governmentType,
        area: DRENNIA.area,
        population: DRENNIA.population,
        gdp: DRENNIA.gdp,
        gdpPerCapita: DRENNIA.gdpPerCapita,
        stability: DRENNIA.stability,
        flagPath: DRENNIA.flagPath,
      }),
    );
    // Navigate to citizenship confirmation
    router.push('/onboarding/citizenship-confirmed');
  };

  return (
    <div
      className="min-h-screen flex flex-col transition-all duration-500"
      style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(14px)' }}
    >
      {/* ── Top-right mini card ── */}
      <div className="absolute top-4 right-0 z-20 p-4 md:p-6">
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-sm"
          style={{
            background: 'rgba(10,10,20,0.88)',
            border: '1px solid rgba(245,158,11,0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
            style={{ background: `${partyColor}14`, border: `1px solid ${partyColor}30` }}
          >
            {party?.partyLogoId ? (
              <LogoSVG logoId={party.partyLogoId} color={partyColor} size={20} />
            ) : (
              <span className="text-xs font-bold font-mono" style={{ color: partyColor }}>
                {(character.firstName.charAt(0) || '?').toUpperCase()}
              </span>
            )}
          </div>
          <div className="hidden sm:block">
            <div className="text-zinc-200 text-xs font-semibold leading-none mb-0.5">
              Starting as: {displayName}
            </div>
            <div className="text-zinc-500 font-mono text-[9px] uppercase tracking-widest leading-snug">
              Age: {character.age || '—'} &nbsp;·&nbsp; Path: {selectedPath}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-widest leading-snug" style={{ color: `${partyColor}90` }}>
              Party: {party ? party.partyAbbreviation : 'Not created'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Page header ── */}
      <div className="px-4 md:px-10 pt-5 pb-4 max-w-6xl mx-auto w-full">
        <button
          onClick={() => router.push('/onboarding/create-party')}
          className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition-colors mb-4 font-mono text-[10px] uppercase tracking-widest group"
        >
          <svg className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back to Party
        </button>

        <div className="mb-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
          <span className="text-[10px] font-mono text-amber-500/60 uppercase tracking-[0.25em]">
            Step 4 of 4 — Motherland
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-1">
          Choose Your Motherland
        </h1>
        <p className="text-zinc-500 text-sm">
          Select the continent and nation where your life begins.
        </p>
      </div>

      {/* ── Continent selector tabs ── */}
      <div className="max-w-6xl mx-auto w-full px-4 md:px-10 pb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CONTINENTS.map((c) => {
            const isActive = c.id === activeContinent;
            return (
              <button
                key={c.id}
                id={`continent-tab-${c.id}`}
                type="button"
                onClick={() => setActiveContinent(c.id)}
                className="text-left rounded-sm p-4 transition-all duration-200"
                style={
                  isActive
                    ? {
                        background: c.accentBg,
                        border: `1.5px solid ${c.activeBorder}`,
                        boxShadow: c.activeGlow,
                      }
                    : {
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs font-bold uppercase tracking-[0.15em] font-mono"
                    style={{ color: isActive ? c.color : '#52525b' }}
                  >
                    {c.name}
                  </span>
                  {isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                      style={{ background: c.color, boxShadow: `0 0 6px ${c.color}` }}
                    />
                  )}
                </div>
                <p
                  className="text-[10px] leading-relaxed font-mono"
                  style={{ color: isActive ? '#a1a1aa' : '#3f3f46' }}
                >
                  {c.shortDesc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-6xl mx-auto w-full px-4 md:px-10 mb-5">
        <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>

      {/* ── Nations area ── */}
      <div
        key={`nations-${activeContinent}`}
        className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-10 pb-8"
      >
        {activeContinent === 'varelia' ? (
          /* ── Varelia: show Drennia card ── */
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span
                className="text-[9px] font-mono uppercase tracking-[0.25em] px-2 py-1 rounded-sm"
                style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  color: '#818cf8',
                }}
              >
                Varelia
              </span>
              <span className="text-zinc-600 font-mono text-[9px]">·</span>
              <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest">
                1 nation available
              </span>
            </div>

            <div className="flex flex-wrap gap-5">
              <DrenniaCard onChoose={handleChooseDrennia} />

              {/* Placeholder "more coming" slot */}
              <div
                className="rounded-sm flex flex-col items-center justify-center px-6 py-10 text-center"
                style={{
                  width: '200px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px dashed rgba(255,255,255,0.06)',
                }}
              >
                <div className="w-8 h-8 rounded-sm flex items-center justify-center mb-3"
                  style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <svg className="w-4 h-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={1.5}>
                    <path strokeLinecap="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-zinc-700 font-mono text-[9px] uppercase tracking-widest leading-relaxed">
                  More Varelian<br />nations coming
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ── Other continents: placeholder ── */
          <div
            className="rounded-sm border border-dashed flex flex-col items-center justify-center py-14 px-6 text-center"
            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}
          >
            <div
              className="w-12 h-12 rounded-sm flex items-center justify-center mb-4"
              style={{ background: current.accentBg, border: `1px solid ${current.activeBorder}` }}
            >
              <svg className="w-6 h-6 opacity-60" viewBox="0 0 24 24" fill="none" stroke={current.color} strokeWidth={1}>
                <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945" />
                <path d="M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-sm mb-1">
              {current.name} nations are in development.
            </h3>
            <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest">
              Nations will be added one by one as WORLDr expands.
            </p>
          </div>
        )}

        {/* Bottom note */}
        <div className="mt-5 flex items-center gap-2 text-zinc-700 font-mono text-[9px] uppercase tracking-widest">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8v4l2 2" />
          </svg>
          WORLDr is launching with Drennia (Varelia). More nations will be added progressively.
        </div>
      </div>
    </div>
  );
}
