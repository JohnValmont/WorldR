'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// ── Path data ─────────────────────────────────────────────────────────────────

const PATHS = [
  {
    id: 'politician',
    label: 'Politician',
    icon: '🏛️',
    available: true,
    description:
      'Enter public life, build influence, join or create parties, contest elections, debate laws, and fight for national power.',
  },
  {
    id: 'businessman',
    label: 'Businessman',
    icon: '📈',
    available: false,
    description:
      'Build companies, control industries, fund parties, influence markets, and shape the economy from behind the scenes.',
  },
  {
    id: 'military',
    label: 'Military Officer',
    icon: '⚔️',
    available: false,
    description:
      'Rise through the armed forces, command influence, respond to crises, and shape national security.',
  },
  {
    id: 'judicial',
    label: 'Judicial Officer',
    icon: '⚖️',
    available: false,
    description:
      'Enter the legal system, interpret laws, influence justice, and defend or challenge the balance of power.',
  },
  {
    id: 'media',
    label: 'Media & Influence',
    icon: '📡',
    available: false,
    description:
      'Control narratives, build public opinion, expose scandals, support movements, and influence society through information.',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChoosePathPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>('');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);

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

      if (!hasChar) { router.replace('/onboarding/create-character'); return () => clearTimeout(t); }
    }

    // Restore previously selected path — read both key variants
    const saved =
      localStorage.getItem('worldr_selected_path') ||
      localStorage.getItem('worldr-path');
    if (saved) setSelected(saved);
    return () => clearTimeout(t);
  }, [router]);

  const handleSelect = (id: string) => {
    setSelected(id);
    // Write standardized key; also write legacy key during transition for backward compat
    localStorage.setItem('worldr_selected_path', id);
    localStorage.setItem('worldr-path', id); // legacy — will be phased out post-multiplayer launch
  };

  const canContinue = selected !== '';

  return (
    <div
      className="min-h-screen flex flex-col transition-all duration-500"
      style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(14px)' }}
    >
      {/* Page header */}
      <div className="px-4 md:px-10 pt-5 pb-4 max-w-5xl mx-auto w-full">
        {/* Breadcrumb back */}
        <button
          onClick={() => router.push('/onboarding/create-character')}
          className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition-colors mb-4 font-mono text-[10px] uppercase tracking-widest group"
        >
          <svg className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back to Identity
        </button>

        {/* Step label */}
        <div className="mb-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
          <span className="text-[10px] font-mono text-amber-500/60 uppercase tracking-[0.25em]">
            Step 2 of 4 — Path
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-1">
          Choose Your Path
        </h1>
        <p className="text-zinc-500 text-sm">
          Select the role your life will begin with. More paths will open as WORLDr develops.
        </p>
      </div>

      {/* Path cards grid */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-10 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PATHS.map((path) => {
            const isSelected = selected === path.id;
            const isAvailable = path.available;

            return (
              <button
                key={path.id}
                id={`path-${path.id}`}
                type="button"
                disabled={!isAvailable}
                onClick={() => isAvailable && handleSelect(path.id)}
                className="text-left rounded-sm p-5 transition-all duration-200 flex flex-col gap-3 relative overflow-hidden group"
                style={
                  isSelected
                    ? {
                        background: 'rgba(245,158,11,0.08)',
                        border: '1.5px solid rgba(245,158,11,0.65)',
                        boxShadow: '0 0 24px rgba(245,158,11,0.14), inset 0 0 16px rgba(245,158,11,0.04)',
                        cursor: 'pointer',
                      }
                    : isAvailable
                    ? {
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                      }
                    : {
                        background: 'rgba(255,255,255,0.015)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'not-allowed',
                        opacity: 0.55,
                      }
                }
              >
                {/* Hover shimmer on available cards */}
                {isAvailable && !isSelected && (
                  <span
                    className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-700 ease-in-out pointer-events-none"
                    style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)' }}
                  />
                )}

                {/* Badge row */}
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{path.icon}</span>
                  <span
                    className="text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm"
                    style={
                      isAvailable
                        ? { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
                        : { background: 'rgba(113,113,122,0.10)', color: '#52525b', border: '1px solid rgba(113,113,122,0.15)' }
                    }
                  >
                    {isAvailable ? 'Available' : 'In Development'}
                  </span>
                </div>

                {/* Name */}
                <div>
                  <div
                    className="text-base font-bold mb-1.5"
                    style={{ color: isSelected ? '#f59e0b' : isAvailable ? '#e4e4e7' : '#71717a' }}
                  >
                    {path.label}
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed">{path.description}</p>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="flex items-center gap-1.5 mt-auto">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-amber-500/70 uppercase tracking-widest">Selected</span>
                  </div>
                )}

                {/* Lock icon for disabled paths */}
                {!isAvailable && (
                  <div className="flex items-center gap-1.5 mt-auto">
                    <svg className="w-3 h-3 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">Coming Soon</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Continue button */}
        <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
          <p className="text-zinc-700 font-mono text-[10px] uppercase tracking-widest">
            {canContinue
              ? `Path selected: ${PATHS.find((p) => p.id === selected)?.label}`
              : 'Select a path to continue'}
          </p>

          <button
            id="choose-path-continue"
            type="button"
            disabled={!canContinue}
            onClick={() => router.push('/onboarding/create-party')}
            className="group relative inline-flex items-center gap-2.5 px-8 py-3 text-sm font-semibold uppercase tracking-[0.15em] rounded-sm overflow-hidden transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canContinue
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'rgba(245,158,11,0.08)',
              color: canContinue ? '#000' : '#78716c',
              border: canContinue ? 'none' : '1px solid rgba(245,158,11,0.12)',
              boxShadow: canContinue ? '0 4px 20px rgba(245,158,11,0.2)' : 'none',
            }}
          >
            {canContinue && (
              <span
                className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out"
                style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }}
              />
            )}
            Continue to Party Creation
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

        {/* Bottom note */}
        <div className="mt-5 flex items-center gap-2 text-zinc-700 font-mono text-[9px] uppercase tracking-widest">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8v4l2 2" />
          </svg>
          More paths are under development and will be unlocked as WORLDr expands.
        </div>
      </div>
    </div>
  );
}
