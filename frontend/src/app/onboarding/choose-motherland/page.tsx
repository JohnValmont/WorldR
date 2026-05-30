'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../../store/character.store';
import { LogoSVG } from '../../../components/LogoSVG';
import { PARTY_COLORS } from '../../../data/political-parties/partyLogos';
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChooseMotherlandPage() {
  const router = useRouter();
  const { character } = useCharacterStore();
  const [activeContinent, setActiveContinent] = useState(CONTINENTS[0].id);
  const [revealed, setRevealed] = useState(false);

  // Path & party from localStorage
  const [selectedPath, setSelectedPath] = useState('Politician');
  const [party, setParty] = useState<RegisteredPoliticalParty | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);

    const pathLabels: Record<string, string> = {
      politician: 'Politician',
      businessman: 'Businessman',
      military: 'Military Officer',
      judicial: 'Judicial Officer',
      media: 'Media & Influence',
    };
    const storedPath = localStorage.getItem('worldr-path');
    if (storedPath) setSelectedPath(pathLabels[storedPath] ?? 'Politician');

    try {
      const raw = localStorage.getItem('worldr_current_party');
      if (raw) setParty(JSON.parse(raw));
    } catch {}

    return () => clearTimeout(t);
  }, []);

  const current = CONTINENTS.find((c) => c.id === activeContinent)!;
  const displayName = buildDisplayName(character.firstName, character.middleName, character.lastName);

  const partyColor =
    party ? (PARTY_COLORS.find((c) => c.id === party.colorId)?.hex ?? '#f59e0b') : '#f59e0b';

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
          {/* Party logo or initials */}
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
      <div className="px-4 md:px-10 pt-5 pb-4 max-w-5xl mx-auto w-full">
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
          Select the continent where your life begins.
        </p>
      </div>

      {/* ── Continent selector cards ── */}
      <div className="max-w-5xl mx-auto w-full px-4 md:px-10 pb-4">
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
      <div className="max-w-5xl mx-auto w-full px-4 md:px-10 mb-4">
        <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>

      {/* ── Nations placeholder ── */}
      <div
        key={`nations-${activeContinent}`}
        className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-10 pb-6"
      >
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
            Countries of {current.name} will appear here.
          </h3>
          <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest">
            Nation selection will be added in the next step.
          </p>

          <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-sm py-4 px-3"
                style={{
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div className="h-2 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-2 rounded-full w-3/4" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-zinc-700 font-mono text-[9px] uppercase tracking-widest">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8v4l2 2" />
          </svg>
          This section is under active development. Nations will be added one by one.
        </div>
      </div>
    </div>
  );
}
