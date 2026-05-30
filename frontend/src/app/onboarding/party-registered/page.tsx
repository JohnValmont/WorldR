'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../../store/character.store';
import { LogoSVG } from '../../../components/LogoSVG';
import { PARTY_COLORS } from '../../../data/political-parties/partyLogos';
import type { RegisteredPoliticalParty } from '../../../data/political-parties/partyTypes';

// ── Ideology name map ─────────────────────────────────────────────────────────

const IDEOLOGY_NAMES: Record<string, string> = {
  capitalism: 'Capitalism',
  communism: 'Communism',
  free_market: 'Free Market Liberalism',
  state_intervention: 'State Interventionism',
  conservatism: 'Conservatism',
  progressivism: 'Progressivism',
  authoritarian: 'Authoritarian Order',
  democratic_reform: 'Democratic Reform',
  nationalism: 'Nationalism',
  globalism: 'Globalism',
  industrialism: 'Industrialism',
  environmentalism: 'Environmentalism',
  welfare_state: 'Welfare State',
  fiscal_conservatism: 'Fiscal Conservatism',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PartyRegisteredPage() {
  const router = useRouter();
  const { character } = useCharacterStore();
  const [revealed, setRevealed] = useState(false);
  const [party, setParty] = useState<RegisteredPoliticalParty | null>(null);
  const [countryName, setCountryName] = useState('Drennia');

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 120);

    if (typeof window !== 'undefined') {
      let hasChar = false;
      try {
        const charRaw = localStorage.getItem('worldr-character') || localStorage.getItem('worldr_character');
        if (charRaw) {
          const charState = JSON.parse(charRaw);
          const c = charState?.state?.character || charState;
          if (c && c.firstName && c.firstName.trim().length > 0) hasChar = true;
        }
      } catch {}

      const path = localStorage.getItem('worldr_selected_path') || localStorage.getItem('worldr-path');

      let hasParty = false;
      try {
        const partyRaw = localStorage.getItem('worldr_current_party');
        if (partyRaw) {
          const party = JSON.parse(partyRaw);
          if (party && party.partyName) hasParty = true;
        }
      } catch {}

      let hasCountry = false;
      try {
        const countryRaw = localStorage.getItem('worldr_selected_country');
        if (countryRaw) {
          const country = JSON.parse(countryRaw);
          if (country && country.countryName) hasCountry = true;
        }
      } catch {}

      if (hasChar && path && hasParty && hasCountry) {
        router.replace('/varelia/news');
        return () => clearTimeout(t);
      }
    }

    try {
      const raw = localStorage.getItem('worldr_current_party');
      if (raw) setParty(JSON.parse(raw));
    } catch {}

    try {
      const cRaw = localStorage.getItem('worldr_selected_country');
      if (cRaw) {
        const c = JSON.parse(cRaw);
        setCountryName(c.countryName ?? 'Drennia');
      }
    } catch {}

    return () => clearTimeout(t);
  }, [router]);

  const leaderName =
    [character.firstName, character.middleName, character.lastName].filter(Boolean).join(' ') ||
    party?.leaderName ||
    '—';

  const partyColor = party
    ? (PARTY_COLORS.find((c) => c.id === party.colorId)?.hex ?? '#f59e0b')
    : '#f59e0b';

  const colorName = party
    ? (PARTY_COLORS.find((c) => c.id === party.colorId)?.name ?? '—')
    : '—';

  const ideologyNames = (party?.ideologyIds ?? []).map((id) => IDEOLOGY_NAMES[id] ?? id);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-14 transition-all duration-700"
      style={{
        background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${partyColor}06 0%, #000 65%)`,
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(18px)',
      }}
    >
      {/* ── Party emblem ── */}
      <div className="mb-7 relative flex items-center justify-center">
        <div
          className="absolute w-28 h-28 rounded-full animate-pulse"
          style={{ background: `radial-gradient(circle, ${partyColor}10 0%, transparent 70%)` }}
        />
        <div
          className="relative z-10 w-24 h-24 rounded-sm flex items-center justify-center"
          style={{
            background: `${partyColor}0a`,
            border: `1.5px solid ${partyColor}30`,
            boxShadow: `0 0 40px ${partyColor}15`,
          }}
        >
          {party?.partyLogoId ? (
            <LogoSVG logoId={party.partyLogoId} color={partyColor} size={52} />
          ) : (
            <span className="font-mono font-bold text-2xl" style={{ color: partyColor }}>
              {party?.partyAbbreviation ?? 'PRT'}
            </span>
          )}
        </div>
      </div>

      {/* ── Status pill ── */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: partyColor, boxShadow: `0 0 6px ${partyColor}` }} />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.35em]" style={{ color: `${partyColor}90` }}>
          Formally Registered
        </span>
      </div>

      {/* ── Title ── */}
      <h1 className="text-4xl md:text-5xl font-bold text-white text-center tracking-tight mb-2">
        Political Party Registered
      </h1>
      <p className="text-zinc-500 text-sm text-center mb-3">
        Your movement has been formally registered in{' '}
        <span className="font-semibold" style={{ color: `${partyColor}aa` }}>{countryName}</span>.
      </p>
      <p className="text-zinc-700 font-mono text-[10px] text-center uppercase tracking-widest mb-10">
        Your party may now begin building recognition, influence, and public support.
      </p>

      {/* ── Party card ── */}
      <div
        className="w-full max-w-[520px] rounded-sm overflow-hidden mb-8"
        style={{
          background: 'rgba(8,8,16,0.94)',
          border: `1px solid ${partyColor}22`,
          boxShadow: `0 0 60px ${partyColor}06, 0 24px 60px rgba(0,0,0,0.85)`,
        }}
      >
        {/* Card header */}
        <div
          className="px-6 py-3 flex items-center justify-between border-b border-white/[0.05]"
          style={{ background: `linear-gradient(90deg, ${partyColor}0d, transparent)` }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: partyColor }} />
            <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: `${partyColor}80` }}>
              Political Party Registration
            </span>
          </div>
          <span className="font-mono text-[8px] text-zinc-700 uppercase tracking-widest">
            WORLDr · AETHON · {new Date().getFullYear()}
          </span>
        </div>

        {/* Party identity row */}
        <div className="px-6 pt-5 pb-4 flex items-center gap-5">
          <div
            className="w-16 h-16 shrink-0 rounded-sm flex items-center justify-center"
            style={{ background: `${partyColor}0d`, border: `1px solid ${partyColor}28` }}
          >
            {party?.partyLogoId ? (
              <LogoSVG logoId={party.partyLogoId} color={partyColor} size={36} />
            ) : (
              <span className="font-mono font-bold text-lg" style={{ color: partyColor }}>
                {party?.partyAbbreviation ?? '—'}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-white font-bold text-lg leading-tight truncate">
              {party?.partyName ?? '—'}
            </div>
            <div className="font-mono text-sm font-bold tracking-[0.28em] mt-0.5" style={{ color: partyColor }}>
              {party?.partyAbbreviation ?? '—'}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px" style={{ background: `linear-gradient(90deg, ${partyColor}20, rgba(255,255,255,0.03), transparent)` }} />

        {/* Stats grid */}
        <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-4">
          {[
            { label: 'Leader',     value: leaderName },
            { label: 'Color',      value: colorName,    dot: partyColor },
            { label: 'Ideology 1', value: ideologyNames[0] ?? '—' },
            { label: 'Ideology 2', value: ideologyNames[1] ?? '—' },
            { label: 'Country',    value: countryName,  accent: true },
            { label: 'Status',     value: 'Registered Political Movement', accent: true },
          ].map((f) => (
            <div key={f.label}>
              <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] mb-0.5">{f.label}</div>
              <div className="flex items-center gap-1.5">
                {'dot' in f && f.dot && <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: f.dot }} />}
                <span className="text-xs font-semibold" style={{ color: f.accent ? partyColor : '#e4e4e7' }}>{f.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Barcode strip */}
        <div className="mx-6 mb-5 pt-4 border-t border-white/[0.04]">
          <div className="h-4 rounded-sm overflow-hidden flex gap-px opacity-[0.18]">
            {Array.from({ length: 96 }).map((_, i) => (
              <div
                key={i}
                className="flex-1"
                style={{ background: i % 3 === 0 ? partyColor : i % 5 === 0 ? '#818cf8' : '#27272a' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Enter Drennia button ── */}
      <button
        id="enter-drennia-btn"
        type="button"
        onClick={() => router.push('/varelia/news')}
        className="group relative inline-flex items-center gap-2.5 px-10 py-3.5 text-sm font-bold uppercase tracking-[0.18em] rounded-sm overflow-hidden transition-all duration-200"
        style={{
          background: `linear-gradient(135deg, ${partyColor}, ${partyColor}cc)`,
          color: '#000',
          boxShadow: `0 4px 28px ${partyColor}30`,
        }}
      >
        <span
          className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out"
          style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)' }}
        />
        Enter {countryName}
        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      <p className="text-zinc-700 font-mono text-[8.5px] uppercase tracking-widest mt-5">
        Your political movement is now part of WORLDr history
      </p>
    </div>
  );
}
