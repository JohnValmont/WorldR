'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../../store/character.store';

const CONTINENTS = [
  {
    id: 'varelia',
    name: 'Varelia',
    culture: 'Varelian',
    desc: 'A storied land of ancient tradition and modern ambition.',
    color: '#6366f1',
    accentColor: 'rgba(99,102,241,0.12)',
    borderColor: 'rgba(99,102,241,0.3)',
  },
  {
    id: 'azhara',
    name: 'Azhara',
    culture: 'Azharan',
    desc: 'A continent of philosophical depth and artistic heritage.',
    color: '#f97316',
    accentColor: 'rgba(249,115,22,0.12)',
    borderColor: 'rgba(249,115,22,0.3)',
  },
  {
    id: 'norvane',
    name: 'Norvane',
    culture: 'Norvanian',
    desc: 'A federation of engineers, scholars, and community builders.',
    color: '#22d3ee',
    accentColor: 'rgba(34,211,238,0.10)',
    borderColor: 'rgba(34,211,238,0.25)',
  },
  {
    id: 'solkar',
    name: 'Solkar',
    culture: 'Solkaran',
    desc: 'A rugged frontier of resilient survivors and resource wealth.',
    color: '#a3e635',
    accentColor: 'rgba(163,230,53,0.10)',
    borderColor: 'rgba(163,230,53,0.25)',
  },
];

function buildDisplayName(first: string, middle: string, last: string) {
  return [first, middle, last].filter(Boolean).join(' ') || 'Unknown';
}

export default function ChooseMotherlandPage() {
  const router = useRouter();
  const { character } = useCharacterStore();
  const [activeContinent, setActiveContinent] = useState(CONTINENTS[0].id);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, []);

  const current = CONTINENTS.find((c) => c.id === activeContinent)!;
  const displayName = buildDisplayName(
    character.firstName,
    character.middleName,
    character.lastName
  );

  return (
    <div
      className="min-h-screen flex flex-col transition-all duration-500"
      style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(14px)' }}
    >
      {/* Character mini-card (top right sticky) */}
      <div className="absolute top-4 right-0 z-20 p-4 md:p-6">
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-sm"
          style={{
            background: 'rgba(10,10,20,0.8)',
            border: '1px solid rgba(245,158,11,0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            className="w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold font-mono"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            {(character.firstName.charAt(0) || '?').toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className="text-zinc-200 text-xs font-semibold leading-none mb-0.5">
              Starting as: {displayName}
            </div>
            <div className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest">
              Age {character.age || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Page header */}
      <div className="px-4 md:px-10 pt-5 pb-4 max-w-5xl mx-auto w-full">
        {/* Breadcrumb */}
        <button
          onClick={() => router.push('/onboarding/create-character')}
          className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition-colors mb-4 font-mono text-[10px] uppercase tracking-widest group"
        >
          <svg className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back to Identity
        </button>

        <div className="mb-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
          <span className="text-[10px] font-mono text-amber-500/60 uppercase tracking-[0.25em]">Step 2 of 2 — Motherland</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
          Choose Your Motherland
        </h1>
        <p className="text-zinc-500 text-sm">
          Select the continent where your life begins.
        </p>
      </div>

      {/* Continent tab bar */}
      <div className="sticky top-0 z-10 px-0 border-b border-white/[0.05]"
        style={{ background: 'rgba(6,6,12,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-10">
          <div className="flex overflow-x-auto scrollbar-hide -mb-px">
            {CONTINENTS.map((c) => {
              const isActive = c.id === activeContinent;
              return (
                <button
                  key={c.id}
                  id={`continent-tab-${c.id}`}
                  onClick={() => setActiveContinent(c.id)}
                  className="relative flex items-center gap-2 px-5 py-4 text-sm font-medium shrink-0 transition-all duration-200 border-b-2"
                  style={{
                    borderBottomColor: isActive ? c.color : 'transparent',
                    color: isActive ? c.color : '#52525b',
                  }}
                >
                  {/* Active glow dot */}
                  {isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: c.color, boxShadow: `0 0 6px ${c.color}` }}
                    />
                  )}
                  <span className="uppercase tracking-wider text-[11px] font-semibold font-mono">{c.name}</span>
                  {isActive && (
                    <span
                      className="text-[9px] font-mono normal-case tracking-widest hidden sm:inline"
                      style={{ color: `${c.color}80` }}
                    >
                      · {c.culture}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Continent content area */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-10 py-8">

        {/* Continent info banner */}
        <div
          key={activeContinent}
          className="rounded-sm p-5 mb-8 flex items-center gap-4 transition-all duration-300"
          style={{
            background: current.accentColor,
            border: `1px solid ${current.borderColor}`,
          }}
        >
          {/* Large continent initial glyph */}
          <div
            className="w-12 h-12 rounded-sm flex items-center justify-center text-2xl font-bold font-serif shrink-0"
            style={{ color: current.color, border: `1px solid ${current.borderColor}`, background: 'rgba(0,0,0,0.3)' }}
          >
            {current.name.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-semibold mb-0.5" style={{ color: current.color }}>
              {current.name}
            </div>
            <div className="text-zinc-400 text-xs leading-relaxed">{current.desc}</div>
            <div className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest mt-1">
              Culture: {current.culture}
            </div>
          </div>
        </div>

        {/* Nations placeholder area */}
        <div
          className="rounded-sm border border-dashed flex flex-col items-center justify-center py-24 px-6 text-center"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}
        >
          {/* Continent icon placeholder */}
          <div
            className="w-16 h-16 rounded-sm flex items-center justify-center mb-6"
            style={{ background: current.accentColor, border: `1px solid ${current.borderColor}` }}
          >
            <svg className="w-8 h-8 opacity-60" viewBox="0 0 24 24" fill="none" stroke={current.color} strokeWidth={1}>
              <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945" />
              <path d="M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>

          <h3 className="text-white font-semibold text-lg mb-2">
            Countries of {current.name}
          </h3>
          <p className="text-zinc-500 text-sm mb-1">
            will appear here.
          </p>
          <p className="text-zinc-700 font-mono text-[10px] uppercase tracking-widest">
            Nation selection will be added in the next step.
          </p>

          {/* Decorative placeholder grid */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full max-w-xl">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-sm py-6 px-4"
                style={{
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  animation: `pulse 2s ease-in-out ${i * 0.3}s infinite`,
                }}
              >
                <div className="h-2 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-2 rounded-full w-3/4" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div className="mt-6 flex items-center gap-2 text-zinc-700 font-mono text-[9px] uppercase tracking-widest">
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
