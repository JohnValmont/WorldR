'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../../store/character.store';

const GENDER_LABELS: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' };

interface CountryData {
  countryName: string;
  capitalName: string;
  governmentType: string;
  continentName: string;
}

export default function CitizenshipConfirmedPage() {
  const router = useRouter();
  const { character } = useCharacterStore();
  const [revealed, setRevealed] = useState(false);
  const [country, setCountry] = useState<CountryData | null>(null);
  const [selectedPath, setSelectedPath] = useState('Politician');

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
      const raw = localStorage.getItem('worldr_selected_country');
      if (raw) setCountry(JSON.parse(raw));
    } catch {}

    const path =
      localStorage.getItem('worldr_selected_path') ||
      localStorage.getItem('worldr-path');
    const pathLabels: Record<string, string> = {
      politician: 'Politician',
      businessman: 'Businessman',
      military: 'Military Officer',
      judicial: 'Judicial Officer',
      media: 'Media & Influence',
    };
    if (path) setSelectedPath(pathLabels[path] ?? 'Politician');

    return () => clearTimeout(t);
  }, [router]);

  const fullName =
    [character.firstName, character.middleName, character.lastName].filter(Boolean).join(' ') || '—';
  const countryName   = country?.countryName   ?? 'Drennia';
  const capitalName   = country?.capitalName   ?? 'Drennport';
  const govType       = country?.governmentType ?? 'Parliamentary';
  const continentName = country?.continentName ?? 'Varelia';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-14 transition-all duration-700"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(245,158,11,0.05) 0%, #000 65%)',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(18px)',
      }}
    >
      {/* ── Official Seal ── */}
      <div className="mb-7 relative flex items-center justify-center">
        <div
          className="absolute w-28 h-28 rounded-full animate-pulse"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)' }}
        />
        <svg viewBox="0 0 120 120" className="w-24 h-24 relative z-10" fill="none">
          <circle cx="60" cy="60" r="56" stroke="rgba(245,158,11,0.18)" strokeWidth="1" />
          <circle cx="60" cy="60" r="50" stroke="rgba(245,158,11,0.09)" strokeWidth="1" strokeDasharray="3 4" />
          <polygon
            points="60,8 66,44 102,44 74,64 84,100 60,80 36,100 46,64 18,44 54,44"
            fill="rgba(245,158,11,0.06)"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="60" cy="60" r="16" fill="rgba(245,158,11,0.07)" stroke="rgba(245,158,11,0.35)" strokeWidth="1" />
          <text x="60" y="65" textAnchor="middle" fontSize="13" fill="#f59e0b" fontFamily="monospace" fontWeight="bold">W</text>
        </svg>
      </div>

      {/* ── Status pill ── */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.9)' }} />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.35em] text-emerald-400/80">
          Officially Confirmed
        </span>
      </div>

      {/* ── Title ── */}
      <h1 className="text-4xl md:text-5xl font-bold text-white text-center tracking-tight mb-2">
        Citizenship Confirmed
      </h1>
      <p className="text-zinc-500 text-sm text-center mb-10">
        You are now officially recognized as a citizen of{' '}
        <span className="text-amber-500/80 font-semibold">{countryName}</span>.
      </p>

      {/* ── Summary identity card ── */}
      <div
        className="w-full max-w-[520px] rounded-sm overflow-hidden mb-8"
        style={{
          background: 'rgba(8,8,16,0.94)',
          border: '1px solid rgba(245,158,11,0.20)',
          boxShadow: '0 0 60px rgba(245,158,11,0.05), 0 24px 60px rgba(0,0,0,0.85)',
        }}
      >
        {/* Card header */}
        <div
          className="px-6 py-3 flex items-center justify-between border-b border-white/[0.05]"
          style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.07), transparent)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-mono text-[9px] text-amber-500/70 uppercase tracking-[0.32em]">
              Official Identity Document
            </span>
          </div>
          <span className="font-mono text-[8px] text-zinc-700 uppercase tracking-widest">
            WORLDr · AETHON · {new Date().getFullYear()}
          </span>
        </div>

        {/* Personal fields */}
        <div className="px-6 pt-5 pb-1">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: 'Full Name',   value: fullName },
              { label: 'Family Name', value: character.familyName || '—' },
              { label: 'Age',         value: character.age !== '' ? `${character.age} years` : '—' },
              { label: 'Gender',      value: character.gender ? GENDER_LABELS[character.gender] : '—' },
            ].map((f) => (
              <div key={f.label}>
                <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] mb-0.5">{f.label}</div>
                <div className="text-white text-xs font-semibold leading-snug">{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 my-5 h-px" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.25), rgba(255,255,255,0.04), transparent)' }} />

        {/* Country + status fields */}
        <div className="px-6 pb-5">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: 'Country',    value: countryName,   accent: true },
              { label: 'Capital',    value: capitalName,   accent: false },
              { label: 'Government', value: govType,       accent: false },
              { label: 'Continent',  value: continentName, accent: false },
              { label: 'Path',       value: selectedPath,  accent: false },
              { label: 'Status',     value: 'New Citizen', accent: true },
            ].map((f) => (
              <div key={f.label}>
                <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] mb-0.5">{f.label}</div>
                <div className="text-xs font-semibold" style={{ color: f.accent ? '#f59e0b' : '#e4e4e7' }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Barcode strip */}
        <div className="mx-6 mb-5 pt-4 border-t border-white/[0.04]">
          <div className="h-4 rounded-sm overflow-hidden flex gap-px opacity-[0.18]">
            {Array.from({ length: 96 }).map((_, i) => (
              <div
                key={i}
                className="flex-1"
                style={{ background: i % 3 === 0 ? '#f59e0b' : i % 7 === 0 ? '#818cf8' : '#27272a' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Continue button ── */}
      <button
        id="citizenship-continue"
        type="button"
        onClick={() => router.push('/onboarding/party-registered')}
        className="group relative inline-flex items-center gap-2.5 px-10 py-3.5 text-sm font-bold uppercase tracking-[0.18em] rounded-sm overflow-hidden transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: '#000',
          boxShadow: '0 4px 28px rgba(245,158,11,0.28)',
        }}
      >
        <span
          className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out"
          style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)' }}
        />
        Continue
        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      <p className="text-zinc-700 font-mono text-[8.5px] uppercase tracking-widest mt-5">
        Your identity is recognized across WORLDr
      </p>
    </div>
  );
}
