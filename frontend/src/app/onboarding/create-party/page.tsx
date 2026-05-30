'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useCharacterStore } from '../../../store/character.store';
import { PARTY_LOGOS, PARTY_COLORS } from '../../../data/political-parties/partyLogos';
import { MOCK_REGISTERED_ABBREVIATIONS } from '../../../data/political-parties/registeredParties';
import { LogoSVG } from '../../../components/LogoSVG';
import type { RegisteredPoliticalParty, IdeologyPair } from '../../../data/political-parties/partyTypes';

// ── Ideology pairs ─────────────────────────────────────────────────────────────

const IDEOLOGY_PAIRS: IdeologyPair[] = [
  {
    pairId: 'pair_economic',
    pairLabel: 'Economic System',
    left: {
      id: 'capitalism',
      name: 'Capitalism',
      description: 'Private ownership, free markets, business growth, investment, lower state control.',
      favorable: 'Big business, investors, entrepreneurs, upper-middle class.',
      lessFavorable: 'Trade unions, socialist workers, low-income urban voters.',
    },
    right: {
      id: 'communism',
      name: 'Communism',
      description: 'Collective ownership, state control, wealth redistribution, worker power.',
      favorable: 'Industrial workers, trade unions, low-income voters, public-sector workers.',
      lessFavorable: 'Business owners, investors, wealthy elites, private corporations.',
    },
  },
  {
    pairId: 'pair_state',
    pairLabel: 'State Role',
    left: {
      id: 'free_market',
      name: 'Free Market Liberalism',
      description: 'Economy grows best when government regulation is limited and competition is open.',
      favorable: 'Small business, startups, investors, urban professionals.',
      lessFavorable: 'State employees, protected industries, welfare-dependent groups.',
    },
    right: {
      id: 'state_intervention',
      name: 'State Interventionism',
      description: 'Active government planning, subsidies, public investment, stronger regulation.',
      favorable: 'Farmers, state employees, domestic industries, lower-income voters.',
      lessFavorable: 'Free-market businesses, foreign investors, deregulation supporters.',
    },
  },
  {
    pairId: 'pair_social',
    pairLabel: 'Social Values',
    left: {
      id: 'conservatism',
      name: 'Conservatism',
      description: 'Defends tradition, family values, national identity, religion, social order.',
      favorable: 'Rural voters, older citizens, religious communities, traditional families.',
      lessFavorable: 'Young urban voters, progressive activists, liberal professionals.',
    },
    right: {
      id: 'progressivism',
      name: 'Progressivism',
      description: 'Social reform, equal rights, youth participation, civil freedoms, minority protection.',
      favorable: 'Young voters, urban professionals, students, activists, minority communities.',
      lessFavorable: 'Traditional rural voters, religious conservatives, older citizens.',
    },
  },
  {
    pairId: 'pair_governance',
    pairLabel: 'Governance Style',
    left: {
      id: 'authoritarian',
      name: 'Authoritarian Order',
      description: 'Strong leadership, discipline, national stability, strict law, centralised power.',
      favorable: 'Security forces, military, stability-focused citizens, older voters.',
      lessFavorable: 'Civil rights activists, students, independent media, opposition groups.',
    },
    right: {
      id: 'democratic_reform',
      name: 'Democratic Reform',
      description: 'Open elections, institutional checks, free media, civil liberties, transparency.',
      favorable: 'Students, urban professionals, civil society groups, journalists, reformists.',
      lessFavorable: 'Hardline security groups, authoritarian elites, entrenched power networks.',
    },
  },
  {
    pairId: 'pair_national',
    pairLabel: 'National Policy',
    left: {
      id: 'nationalism',
      name: 'Nationalism',
      description: 'National sovereignty, domestic industry, border control, cultural identity, national pride.',
      favorable: 'Military families, domestic industries, rural voters, patriotic citizens.',
      lessFavorable: 'Global businesses, internationalist voters, export-dependent elites.',
    },
    right: {
      id: 'globalism',
      name: 'Globalism',
      description: 'International cooperation, trade agreements, diplomacy, migration openness.',
      favorable: 'Export businesses, diplomats, multinational companies, educated urban voters.',
      lessFavorable: 'Nationalist voters, protected domestic industries, border-control supporters.',
    },
  },
  {
    pairId: 'pair_development',
    pairLabel: 'Development Priority',
    left: {
      id: 'industrialism',
      name: 'Industrialism',
      description: 'Factories, mining, infrastructure, energy expansion, jobs, rapid economic growth.',
      favorable: 'Factory workers, construction, mining communities, business owners.',
      lessFavorable: 'Environmental activists, green voters, climate-focused youth.',
    },
    right: {
      id: 'environmentalism',
      name: 'Environmentalism',
      description: 'Clean energy, climate protection, sustainable cities, pollution control.',
      favorable: 'Young voters, urban professionals, activists, coastal communities.',
      lessFavorable: 'Mining companies, heavy industry, fossil-fuel workers, rapid-growth voters.',
    },
  },
  {
    pairId: 'pair_welfare',
    pairLabel: 'Social Economy',
    left: {
      id: 'welfare_state',
      name: 'Welfare State',
      description: 'Public healthcare, social protection, unemployment support, pensions, housing aid.',
      favorable: 'Low-income voters, elderly citizens, public workers, working-class families.',
      lessFavorable: 'Tax-sensitive businesses, wealthy voters, fiscal conservatives.',
    },
    right: {
      id: 'fiscal_conservatism',
      name: 'Fiscal Conservatism',
      description: 'Controlled spending, efficient budgets, lower taxes, reduced welfare dependency.',
      favorable: 'Taxpayers, business owners, wealthy voters, financial sector.',
      lessFavorable: 'Welfare recipients, public-sector unions, low-income voters.',
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildDisplayName(first: string, middle: string, last: string) {
  return [first, middle, last].filter(Boolean).join(' ') || '—';
}

function generatePartyId(): string {
  return `party_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] font-mono text-amber-500/60 uppercase tracking-[0.22em]">
        {children}
      </span>
      {optional && (
        <span className="text-[9px] font-mono text-zinc-700 normal-case tracking-normal">optional</span>
      )}
    </div>
  );
}

function SectionPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-sm p-5"
      style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.22em] mb-4">
        {title}
      </div>
      {children}
    </div>
  );
}

function IdeologyCard({
  ideology,
  pair,
  selectedIds,
  onToggle,
}: {
  ideology: import('../../../data/political-parties/partyTypes').Ideology;
  pair: IdeologyPair;
  selectedIds: string[];
  onToggle: (id: string, pairId: string) => void;
}) {
  const isSelected = selectedIds.includes(ideology.id);
  const opposite = ideology.id === pair.left.id ? pair.right : pair.left;
  const oppositeSelected = selectedIds.includes(opposite.id);
  const maxReached = selectedIds.length >= 2 && !isSelected;
  const isDisabled = (oppositeSelected || maxReached) && !isSelected;

  return (
    <button
      type="button"
      onClick={() => !isDisabled && onToggle(ideology.id, pair.pairId)}
      disabled={isDisabled}
      className="text-left rounded-sm p-3 transition-all duration-150 flex-1 min-w-0"
      style={
        isSelected
          ? {
              background: 'rgba(245,158,11,0.06)',
              border: '1.5px solid rgba(245,158,11,0.5)',
              cursor: 'pointer',
            }
          : isDisabled
          ? {
              background: 'rgba(255,255,255,0.008)',
              border: '1px solid rgba(255,255,255,0.03)',
              opacity: 0.32,
              cursor: 'not-allowed',
            }
          : {
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
            }
      }
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-xs font-semibold leading-tight"
          style={{ color: isSelected ? '#f59e0b' : '#d4d4d8' }}
        >
          {ideology.name}
        </span>
        {isSelected && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0 ml-1" />
        )}
      </div>
      <p className="text-[9.5px] text-zinc-500 leading-relaxed mb-2">{ideology.description}</p>
      <div className="space-y-0.5">
        <p className="text-[8.5px] text-emerald-600/80 font-mono leading-snug">
          ▲ {ideology.favorable}
        </p>
        <p className="text-[8.5px] text-red-700/70 font-mono leading-snug">
          ▼ {ideology.lessFavorable}
        </p>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CreatePartyPage() {
  const router = useRouter();
  const { character } = useCharacterStore();
  const [revealed, setRevealed] = useState(false);

  // Form state
  const [partyName, setPartyName] = useState('');
  const [abbr, setAbbr] = useState('');
  const [description, setDescription] = useState('');
  const [colorId, setColorId] = useState('gold');
  const [logoId, setLogoId] = useState('');
  const [selectedIdeologyIds, setSelectedIdeologyIds] = useState<string[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  const leaderName = buildDisplayName(character.firstName, character.middleName, character.lastName);
  const selectedColor = PARTY_COLORS.find((c) => c.id === colorId)?.hex ?? '#f59e0b';
  const selectedColorName = PARTY_COLORS.find((c) => c.id === colorId)?.name ?? '—';
  const selectedLogo = PARTY_LOGOS.find((l) => l.id === logoId);

  // Abbreviation uniqueness check
  // Developer note: Temporary local uniqueness check.
  // True global party abbreviation uniqueness must be enforced by backend/database before multiplayer launch.
  const existingAbbreviations = useMemo<string[]>(() => {
    const local: string[] = [];
    try {
      const stored = localStorage.getItem('worldr_registered_parties');
      if (stored) {
        const parsed: RegisteredPoliticalParty[] = JSON.parse(stored);
        parsed.forEach((p) => local.push(p.partyAbbreviation));
      }
    } catch {}
    return [...MOCK_REGISTERED_ABBREVIATIONS, ...local];
  }, []);

  const isDuplicateAbbr = abbr.length >= 2 && existingAbbreviations.includes(abbr);
  const abbrValid = abbr.length >= 2 && abbr.length <= 6 && !isDuplicateAbbr;

  // Validation — description is NOT required
  const validationErrors: Record<string, string> = {};
  if (touched.partyName && !partyName.trim()) validationErrors.partyName = 'Party name is required.';
  if (touched.abbr) {
    if (!abbr) validationErrors.abbr = 'Abbreviation is required.';
    else if (abbr.length < 2 || abbr.length > 6) validationErrors.abbr = 'Must be 2–6 characters.';
    else if (isDuplicateAbbr) validationErrors.abbr = 'This party abbreviation is already registered. Choose another one.';
  }
  if (touched.logo && !logoId) validationErrors.logo = 'Select a party logo.';
  if (touched.ideology && selectedIdeologyIds.length < 2)
    validationErrors.ideology = 'Select exactly 2 ideological positions.';

  // Continue requires: name, valid unique abbr, color, logo, 2 ideologies.
  // Description is optional — NOT required.
  const isFormValid =
    partyName.trim().length > 0 &&
    abbrValid &&
    colorId !== '' &&
    logoId !== '' &&
    selectedIdeologyIds.length === 2;

  // ── Ideology toggle ───────────────────────────────────────────────────────

  const toggleIdeology = (ideologyId: string, _pairId: string) => {
    setTouched((t) => ({ ...t, ideology: true }));
    setSelectedIdeologyIds((prev) => {
      if (prev.includes(ideologyId)) return prev.filter((id) => id !== ideologyId);
      if (prev.length >= 2) return prev;
      return [...prev, ideologyId];
    });
  };

  // ── Save & navigate ───────────────────────────────────────────────────────

  const handleCreate = () => {
    setTouched({ partyName: true, abbr: true, logo: true, ideology: true });
    if (!isFormValid) return;

    const party: RegisteredPoliticalParty = {
      partyId: generatePartyId(),
      partyAbbreviation: abbr,
      partyName: partyName.trim(),
      partyDescription: description.trim(), // empty string if not provided
      partyLogoId: logoId,
      ideologyIds: selectedIdeologyIds,
      colorId,
      leaderName,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('worldr_current_party', JSON.stringify(party));

    const existing: RegisteredPoliticalParty[] = (() => {
      try {
        return JSON.parse(localStorage.getItem('worldr_registered_parties') ?? '[]');
      } catch {
        return [];
      }
    })();
    localStorage.setItem('worldr_registered_parties', JSON.stringify([...existing, party]));

    router.push('/onboarding/choose-motherland');
  };

  const ideologyNames = selectedIdeologyIds.map((id) => {
    for (const pair of IDEOLOGY_PAIRS) {
      if (pair.left.id === id) return pair.left.name;
      if (pair.right.id === id) return pair.right.name;
    }
    return id;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col transition-all duration-500"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(14px)',
      }}
    >
      {/* ── Page header ── */}
      <div className="px-4 md:px-8 pt-5 pb-4 max-w-7xl mx-auto w-full">
        <button
          onClick={() => router.push('/onboarding/choose-path')}
          className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition-colors mb-4 font-mono text-[10px] uppercase tracking-widest group"
        >
          <svg className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back to Path
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
          <span className="text-[10px] font-mono text-amber-500/60 uppercase tracking-[0.25em]">
            Step 3 of 4 — Political Party
          </span>
        </div>
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Create Your Political Party
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Build the movement that will carry your name into national politics.
            </p>
          </div>
          <div
            className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest px-3 py-1.5 rounded-sm"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            Leader: {leaderName}
          </div>
        </div>
      </div>

      {/* Thin divider */}
      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 mb-5">
        <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* ── Two-column body ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_370px] gap-6 items-start">

          {/* ── Left column: form + ideology (normal page flow, no internal scroll) ── */}
          <div className="space-y-4">

            {/* 1. Party Identity */}
            <SectionPanel title="1 · Party Identity">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4 mb-4">
                {/* Party name */}
                <div>
                  <Label>Party Name</Label>
                  <input
                    id="party-name"
                    className="w-full rounded-sm px-3 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-700"
                    style={{
                      background: validationErrors.partyName ? 'rgba(127,29,29,0.12)' : 'rgba(0,0,0,0.4)',
                      border: validationErrors.partyName
                        ? '1px solid rgba(239,68,68,0.45)'
                        : '1px solid rgba(255,255,255,0.08)',
                      color: '#e4e4e7',
                    }}
                    placeholder="National Reform Party"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, partyName: true }))}
                  />
                  {validationErrors.partyName && (
                    <p className="text-red-400 text-[9px] mt-1 font-mono">{validationErrors.partyName}</p>
                  )}
                </div>

                {/* Abbreviation */}
                <div>
                  <Label>Abbreviation</Label>
                  <input
                    id="party-abbr"
                    className="w-full rounded-sm px-3 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-700 font-mono tracking-[0.2em]"
                    style={{
                      background: validationErrors.abbr ? 'rgba(127,29,29,0.12)' : 'rgba(0,0,0,0.4)',
                      border: validationErrors.abbr
                        ? '1px solid rgba(239,68,68,0.45)'
                        : abbr && !isDuplicateAbbr && abbr.length >= 2
                        ? '1px solid rgba(52,211,153,0.35)'
                        : '1px solid rgba(255,255,255,0.08)',
                      color: '#f59e0b',
                    }}
                    placeholder="NRP"
                    value={abbr}
                    maxLength={6}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      setAbbr(val);
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, abbr: true }))}
                  />
                  {validationErrors.abbr ? (
                    <p className="text-red-400 text-[9px] mt-1 font-mono">{validationErrors.abbr}</p>
                  ) : abbr && !isDuplicateAbbr && abbr.length >= 2 ? (
                    <p className="text-emerald-500 text-[9px] mt-1 font-mono">✓ Available</p>
                  ) : (
                    <p className="text-zinc-700 text-[9px] mt-1 font-mono">2–6 letters / numbers</p>
                  )}
                </div>
              </div>

              {/* Description (optional) */}
              <div>
                <Label optional>Party Description</Label>
                <textarea
                  id="party-desc"
                  rows={3}
                  className="w-full rounded-sm px-3 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-700 resize-none"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#e4e4e7',
                  }}
                  placeholder="Describe what your party stands for, who it represents, and what future it promises."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </SectionPanel>

            {/* 2. Party Color */}
            <SectionPanel title="2 · Party Color">
              {/* Compact circle swatches — 12 per row on desktop */}
              <div className="flex flex-wrap gap-2 mb-2">
                {PARTY_COLORS.map((c) => (
                  <button
                    key={c.id}
                    id={`color-${c.id}`}
                    type="button"
                    title={c.name}
                    onClick={() => setColorId(c.id)}
                    className="w-6 h-6 rounded-full transition-all duration-150 hover:scale-110"
                    style={{
                      background: c.hex,
                      outline: colorId === c.id ? `2.5px solid rgba(245,158,11,0.9)` : 'none',
                      outlineOffset: '2.5px',
                      boxShadow: colorId === c.id ? `0 0 10px ${c.hex}70` : 'none',
                      transform: colorId === c.id ? 'scale(1.15)' : undefined,
                      border: '1.5px solid rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: selectedColor }} />
                <span className="text-zinc-500 text-[10px] font-mono">{selectedColorName}</span>
              </div>
            </SectionPanel>

            {/* 3. Party Logo */}
            <SectionPanel title="3 · Party Logo">
              {/* Compact 10-col grid on lg, 8-col on md, 6-col on sm */}
              <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))' }}>
                {PARTY_LOGOS.map((logo) => (
                  <button
                    key={logo.id}
                    id={`logo-${logo.id}`}
                    type="button"
                    title={logo.name}
                    onClick={() => {
                      setLogoId(logo.id);
                      setTouched((t) => ({ ...t, logo: true }));
                    }}
                    className="w-[38px] h-[38px] rounded-sm flex items-center justify-center transition-all duration-150 hover:scale-105"
                    style={
                      logoId === logo.id
                        ? {
                            background: `${selectedColor}12`,
                            border: `1.5px solid ${selectedColor}80`,
                            boxShadow: `0 0 10px ${selectedColor}25`,
                          }
                        : {
                            background: 'rgba(255,255,255,0.025)',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }
                    }
                  >
                    <LogoSVG
                      logoId={logo.id}
                      color={logoId === logo.id ? selectedColor : '#52525b'}
                      size={20}
                    />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {logoId && (
                  <>
                    <div
                      className="w-5 h-5 rounded-sm flex items-center justify-center"
                      style={{ background: `${selectedColor}15`, border: `1px solid ${selectedColor}30` }}
                    >
                      <LogoSVG logoId={logoId} color={selectedColor} size={13} />
                    </div>
                    <span className="text-zinc-500 text-[10px] font-mono">{selectedLogo?.name}</span>
                  </>
                )}
                {validationErrors.logo && (
                  <p className="text-red-400 text-[9px] font-mono">{validationErrors.logo}</p>
                )}
                {!logoId && !validationErrors.logo && (
                  <span className="text-zinc-700 text-[10px] font-mono">No logo selected</span>
                )}
              </div>
            </SectionPanel>

            {/* 4. Ideological Direction */}
            <SectionPanel title="4 · Ideological Direction">
              <div className="flex items-center justify-between mb-1">
                <p className="text-zinc-600 text-[10px] font-mono">
                  Select exactly 2 ideological positions. Opposite ideologies cannot be selected together.
                </p>
                <span
                  className={`text-[10px] font-mono font-bold shrink-0 ml-3 ${
                    selectedIdeologyIds.length === 2 ? 'text-emerald-400' : 'text-zinc-600'
                  }`}
                >
                  {selectedIdeologyIds.length} / 2
                </span>
              </div>

              {/* Explanation note */}
              <div
                className="rounded-sm px-3 py-2 mb-4 mt-2"
                style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)' }}
              >
                <p className="text-zinc-600 text-[9px] leading-relaxed">
                  <span className="text-amber-500/70 font-mono text-[8px] uppercase tracking-widest mr-1">
                    How ideology affects support:
                  </span>
                  Business owners, workers, farmers, students, rural voters, urban professionals, military officers, religious groups, and low-income citizens each react differently to your political direction. These choices will affect election support, party funding, protests, bill outcomes, and parliamentary negotiations.
                </p>
              </div>

              {/* Ideology pairs — normal page flow (NO internal scroll) */}
              <div className="space-y-3">
                {IDEOLOGY_PAIRS.map((pair) => (
                  <div key={pair.pairId}>
                    <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <span>{pair.pairLabel}</span>
                      <div className="flex-1 h-px bg-white/[0.04]" />
                      <span className="text-zinc-700 text-[8px]">↔ opposing pair</span>
                    </div>
                    <div className="flex gap-2">
                      <IdeologyCard ideology={pair.left} pair={pair} selectedIds={selectedIdeologyIds} onToggle={toggleIdeology} />
                      <div className="flex items-center justify-center w-6 shrink-0">
                        <span className="text-[9px] text-zinc-700 font-mono">VS</span>
                      </div>
                      <IdeologyCard ideology={pair.right} pair={pair} selectedIds={selectedIdeologyIds} onToggle={toggleIdeology} />
                    </div>
                  </div>
                ))}
              </div>

              {validationErrors.ideology && (
                <p className="text-red-400 text-[9px] mt-3 font-mono">{validationErrors.ideology}</p>
              )}
            </SectionPanel>

            {/* Continue button — mobile only */}
            <div className="flex lg:hidden items-center justify-end pt-2 pb-6">
              <button
                id="create-party-btn-mobile"
                type="button"
                disabled={!isFormValid}
                onClick={handleCreate}
                className="group relative inline-flex items-center gap-2.5 px-8 py-3 text-sm font-semibold uppercase tracking-[0.15em] rounded-sm overflow-hidden transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: isFormValid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245,158,11,0.08)',
                  color: isFormValid ? '#000' : '#78716c',
                  border: isFormValid ? 'none' : '1px solid rgba(245,158,11,0.12)',
                  boxShadow: isFormValid ? '0 4px 20px rgba(245,158,11,0.2)' : 'none',
                }}
              >
                Found My Party
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Right column: sticky party preview + continue button ── */}
          <div className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-6 self-start">

            {/* Preview card */}
            <div
              className="rounded-sm overflow-hidden"
              style={{
                background: 'rgba(8,8,16,0.9)',
                border: `1px solid ${selectedColor}25`,
                boxShadow: `0 0 40px ${selectedColor}0c, 0 8px 40px rgba(0,0,0,0.6)`,
              }}
            >
              {/* Card header bar */}
              <div
                className="px-5 py-3 flex items-center gap-2 border-b border-white/[0.05]"
                style={{ background: `linear-gradient(90deg, ${selectedColor}0e, transparent)` }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: selectedColor, boxShadow: `0 0 6px ${selectedColor}` }}
                />
                <span className="text-[9px] font-mono uppercase tracking-[0.3em]" style={{ color: `${selectedColor}90` }}>
                  5 · Party Preview
                </span>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* Emblem + name */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-[60px] h-[60px] rounded-sm flex items-center justify-center shrink-0"
                    style={{
                      background: `${selectedColor}0f`,
                      border: `1.5px solid ${selectedColor}28`,
                    }}
                  >
                    {logoId ? (
                      <LogoSVG logoId={logoId} color={selectedColor} size={34} />
                    ) : (
                      <svg className="w-7 h-7 opacity-15" viewBox="0 0 24 24" fill="none" stroke={selectedColor} strokeWidth={1}>
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-bold text-base leading-tight mb-0.5 truncate">
                      {partyName || <span className="text-zinc-700 font-normal text-sm">Party Name</span>}
                    </div>
                    <div className="font-mono text-sm font-bold tracking-[0.28em]" style={{ color: selectedColor }}>
                      {abbr || '—'}
                    </div>
                    <div className="text-[9px] font-mono uppercase tracking-widest mt-0.5" style={{ color: `${selectedColor}55` }}>
                      New Political Movement
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px" style={{ background: `linear-gradient(90deg, ${selectedColor}22, transparent)` }} />

                {/* Fields */}
                <div className="space-y-2.5">
                  {[
                    { label: 'Leader',     value: leaderName },
                    { label: 'Color',      value: selectedColorName, dot: selectedColor },
                    { label: 'Emblem',     value: selectedLogo?.name ?? 'Not selected' },
                    { label: 'Ideologies', value: ideologyNames.length > 0 ? ideologyNames.join(' · ') : 'None selected' },
                    { label: 'Origin',     value: 'Motherland not selected', muted: true },
                    { label: 'Status',     value: 'New Political Movement', accent: true },
                  ].map((f) => (
                    <div key={f.label} className="flex items-start justify-between gap-2">
                      <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.18em] shrink-0 pt-0.5">
                        {f.label}
                      </span>
                      <div className="flex items-center gap-1.5 justify-end text-right">
                        {f.dot && (
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: f.dot }} />
                        )}
                        <span
                          className="text-xs font-medium leading-tight"
                          style={{
                            color: f.accent ? selectedColor : f.muted ? '#3f3f46' : '#d4d4d8',
                          }}
                        >
                          {f.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* WORLDr footer bar */}
                <div className="pt-3 border-t border-white/[0.04]">
                  <div className="font-mono text-[8px] text-zinc-700 tracking-[0.25em] mb-1.5">
                    WORLDr · AETHON · {new Date().getFullYear()}
                  </div>
                  <div className="h-2.5 rounded-sm overflow-hidden flex gap-px opacity-20">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1"
                        style={{
                          background: i % 3 === 0 ? selectedColor : i % 7 === 0 ? '#818cf8' : '#27272a',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Continue button */}
            <button
              id="create-party-btn-desktop"
              type="button"
              disabled={!isFormValid}
              onClick={handleCreate}
              className="group relative w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] rounded-sm overflow-hidden transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isFormValid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245,158,11,0.07)',
                color: isFormValid ? '#000' : '#78716c',
                border: isFormValid ? 'none' : '1px solid rgba(245,158,11,0.12)',
                boxShadow: isFormValid ? '0 4px 22px rgba(245,158,11,0.22)' : 'none',
              }}
            >
              {isFormValid && (
                <span
                  className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out"
                  style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }}
                />
              )}
              Found My Party
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            {/* Validation checklist (when disabled) */}
            {!isFormValid && (
              <div
                className="rounded-sm px-4 py-3 space-y-1.5"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                {[
                  { ok: partyName.trim().length > 0,       label: 'Party name' },
                  { ok: abbrValid,                          label: 'Valid unique abbreviation' },
                  { ok: colorId !== '',                     label: 'Party color' },
                  { ok: logoId !== '',                      label: 'Party logo' },
                  { ok: selectedIdeologyIds.length === 2,   label: '2 ideologies selected' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className={item.ok ? 'text-emerald-500' : 'text-zinc-700'}>
                      {item.ok ? '✓' : '·'}
                    </span>
                    <span className={`text-[9px] font-mono ${item.ok ? 'text-zinc-500' : 'text-zinc-700'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
