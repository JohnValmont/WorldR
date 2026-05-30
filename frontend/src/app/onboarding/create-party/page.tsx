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
      description: 'Supports private ownership, free markets, business growth, investment, and lower state control over the economy.',
      favorable: 'Big business, investors, entrepreneurs, urban professionals, upper-middle class.',
      lessFavorable: 'Trade unions, socialist workers, low-income urban voters.',
    },
    right: {
      id: 'communism',
      name: 'Communism',
      description: 'Supports collective ownership, strong state control, wealth redistribution, worker power, and reduced private economic dominance.',
      favorable: 'Industrial workers, trade unions, low-income voters, radical youth, public-sector workers.',
      lessFavorable: 'Business owners, investors, wealthy elites, private corporations.',
    },
  },
  {
    pairId: 'pair_state',
    pairLabel: 'State Role',
    left: {
      id: 'free_market',
      name: 'Free Market Liberalism',
      description: 'Believes the economy grows best when government regulation is limited and private competition is encouraged.',
      favorable: 'Small business, startups, investors, urban professionals, export-sector workers.',
      lessFavorable: 'State employees, protected industries, welfare-dependent groups.',
    },
    right: {
      id: 'state_intervention',
      name: 'State Interventionism',
      description: 'Supports active government planning, subsidies, public investment, industrial policy, and stronger market regulation.',
      favorable: 'Farmers, state employees, domestic industries, infrastructure workers, lower-income voters.',
      lessFavorable: 'Free-market businesses, foreign investors, deregulation supporters.',
    },
  },
  {
    pairId: 'pair_social',
    pairLabel: 'Social Values',
    left: {
      id: 'conservatism',
      name: 'Conservatism',
      description: 'Defends tradition, family values, national identity, religion, social order, and gradual reform.',
      favorable: 'Rural voters, older citizens, religious communities, traditional families, security-focused voters.',
      lessFavorable: 'Young urban voters, progressive activists, liberal professionals.',
    },
    right: {
      id: 'progressivism',
      name: 'Progressivism',
      description: 'Supports social reform, equal rights, youth participation, civil freedoms, minority protection, and cultural change.',
      favorable: 'Young voters, urban professionals, students, activists, minority communities, educated middle class.',
      lessFavorable: 'Traditional rural voters, religious conservatives, older citizens.',
    },
  },
  {
    pairId: 'pair_governance',
    pairLabel: 'Governance Style',
    left: {
      id: 'authoritarian',
      name: 'Authoritarian Order',
      description: 'Prioritizes strong leadership, discipline, national stability, strict law enforcement, and centralized decision-making.',
      favorable: 'Security forces, military officers, stability-focused citizens, older voters, crisis-hit populations.',
      lessFavorable: 'Civil rights activists, students, independent media, opposition groups.',
    },
    right: {
      id: 'democratic_reform',
      name: 'Democratic Reform',
      description: 'Supports open elections, institutional checks, free media, civil liberties, transparency, and accountable government.',
      favorable: 'Students, urban professionals, civil society groups, journalists, reformist voters.',
      lessFavorable: 'Hardline security groups, authoritarian elites, entrenched power networks.',
    },
  },
  {
    pairId: 'pair_national',
    pairLabel: 'National Policy',
    left: {
      id: 'nationalism',
      name: 'Nationalism',
      description: 'Puts national sovereignty, domestic industry, border control, cultural identity, and national pride above international pressure.',
      favorable: 'Military families, domestic industries, rural voters, patriotic citizens, border communities.',
      lessFavorable: 'Global businesses, internationalist voters, export-dependent elites.',
    },
    right: {
      id: 'globalism',
      name: 'Globalism',
      description: 'Supports international cooperation, trade agreements, diplomacy, migration openness, and global economic integration.',
      favorable: 'Export businesses, diplomats, multinational companies, educated urban voters, international workers.',
      lessFavorable: 'Nationalist voters, protected domestic industries, border-control supporters.',
    },
  },
  {
    pairId: 'pair_development',
    pairLabel: 'Development Priority',
    left: {
      id: 'industrialism',
      name: 'Industrialism',
      description: 'Focuses on factories, mining, infrastructure, energy expansion, jobs, and rapid economic growth.',
      favorable: 'Factory workers, construction workers, mining communities, business owners, unemployed voters seeking jobs.',
      lessFavorable: 'Environmental activists, green voters, climate-focused youth.',
    },
    right: {
      id: 'environmentalism',
      name: 'Environmentalism',
      description: 'Prioritizes clean energy, climate protection, sustainable cities, pollution control, and environmental regulation.',
      favorable: 'Young voters, urban professionals, environmental activists, coastal communities, health-focused voters.',
      lessFavorable: 'Mining companies, heavy industry, fossil-fuel workers, rapid-growth voters.',
    },
  },
  {
    pairId: 'pair_welfare',
    pairLabel: 'Social Economy',
    left: {
      id: 'welfare_state',
      name: 'Welfare State',
      description: 'Supports public healthcare, social protection, unemployment support, pensions, housing aid, and welfare expansion.',
      favorable: 'Low-income voters, elderly citizens, public workers, unemployed citizens, working-class families.',
      lessFavorable: 'Tax-sensitive businesses, wealthy voters, fiscal conservatives.',
    },
    right: {
      id: 'fiscal_conservatism',
      name: 'Fiscal Conservatism',
      description: 'Supports lower debt, controlled spending, efficient budgets, lower taxes, and reduced welfare dependency.',
      favorable: 'Taxpayers, business owners, wealthy voters, financial sector, budget-conscious middle class.',
      lessFavorable: 'Welfare recipients, public-sector unions, low-income voters.',
    },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildDisplayName(first: string, middle: string, last: string) {
  return [first, middle, last].filter(Boolean).join(' ') || '—';
}

function generatePartyId(): string {
  return `party_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono text-amber-500/60 uppercase tracking-[0.22em] mb-2">
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
              background: 'rgba(245,158,11,0.07)',
              border: '1.5px solid rgba(245,158,11,0.55)',
              cursor: 'pointer',
            }
          : isDisabled
          ? {
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid rgba(255,255,255,0.03)',
              opacity: 0.38,
              cursor: 'not-allowed',
            }
          : {
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              cursor: 'pointer',
            }
      }
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-[11px] font-bold leading-tight"
          style={{ color: isSelected ? '#f59e0b' : '#d4d4d8' }}
        >
          {ideology.name}
        </span>
        {isSelected && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0 ml-1" />
        )}
      </div>
      <p className="text-[9.5px] text-zinc-500 leading-relaxed mb-1.5">{ideology.description}</p>
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

// ── Main Page ──────────────────────────────────────────────────────────────────

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

  // Validation
  const validationErrors: Record<string, string> = {};
  if (touched.partyName && !partyName.trim()) validationErrors.partyName = 'Party name is required.';
  if (touched.abbr) {
    if (!abbr) validationErrors.abbr = 'Abbreviation is required.';
    else if (abbr.length < 2 || abbr.length > 6) validationErrors.abbr = 'Must be 2–6 characters.';
    else if (isDuplicateAbbr) validationErrors.abbr = 'This party abbreviation is already registered. Choose another one.';
  }
  if (touched.description && description.trim().length < 40)
    validationErrors.description = `At least 40 characters required (${description.trim().length}/40).`;
  if (touched.logo && !logoId) validationErrors.logo = 'Select a party logo.';
  if (touched.ideology && selectedIdeologyIds.length < 2)
    validationErrors.ideology = 'Select exactly 2 ideological positions.';

  const isFormValid =
    partyName.trim().length > 0 &&
    abbrValid &&
    description.trim().length >= 40 &&
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
    setTouched({ partyName: true, abbr: true, description: true, logo: true, ideology: true });
    if (!isFormValid) return;

    const party: RegisteredPoliticalParty = {
      partyId: generatePartyId(),
      partyAbbreviation: abbr,
      partyName: partyName.trim(),
      partyDescription: description.trim(),
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
      className="flex flex-col transition-all duration-500"
      style={{
        height: '100vh',
        overflow: 'hidden',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(14px)',
      }}
    >
      {/* ── Header ── */}
      <div className="flex-none px-4 md:px-8 pt-4 pb-3 max-w-7xl mx-auto w-full">
        <button
          onClick={() => router.push('/onboarding/choose-path')}
          className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition-colors mb-3 font-mono text-[10px] uppercase tracking-widest group"
        >
          <svg className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back to Path
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
          <span className="text-[10px] font-mono text-amber-500/60 uppercase tracking-[0.25em]">
            Step 3 of 4 — Political Party
          </span>
        </div>
        <div className="flex items-baseline justify-between flex-wrap gap-1">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Create Your Political Party
            </h1>
            <p className="text-zinc-500 text-xs mt-0.5">
              Build the movement that will carry your name into national politics.
            </p>
          </div>
          <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
            Leader: {leaderName}
          </div>
        </div>
      </div>

      {/* ── Body: left form + right preview ── */}
      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 md:px-8 pb-3 grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-5">

        {/* ── Left: Form (scrollable) ── */}
        <div className="overflow-y-auto pr-1 space-y-4 pb-1">

          {/* Party Name + Abbreviation */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
            <div>
              <SectionTitle>Party Name *</SectionTitle>
              <input
                id="party-name"
                className="w-full rounded-sm px-3 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-700"
                style={{
                  background: validationErrors.partyName ? 'rgba(127,29,29,0.12)' : 'rgba(0,0,0,0.35)',
                  border: validationErrors.partyName ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.07)',
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

            <div>
              <SectionTitle>Abbreviation *</SectionTitle>
              <input
                id="party-abbr"
                className="w-full rounded-sm px-3 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-700 font-mono tracking-widest"
                style={{
                  background: validationErrors.abbr ? 'rgba(127,29,29,0.12)' : 'rgba(0,0,0,0.35)',
                  border: validationErrors.abbr
                    ? '1px solid rgba(239,68,68,0.45)'
                    : abbr && !isDuplicateAbbr && abbr.length >= 2
                    ? '1px solid rgba(52,211,153,0.35)'
                    : '1px solid rgba(255,255,255,0.07)',
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
                <p className="text-emerald-500 text-[9px] mt-1 font-mono">✓ Abbreviation available</p>
              ) : (
                <p className="text-zinc-700 text-[9px] mt-1 font-mono">2–6 uppercase letters/numbers</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <SectionTitle>Party Description *</SectionTitle>
              <span className={`text-[8px] font-mono ${description.trim().length >= 40 ? 'text-emerald-500' : 'text-zinc-600'}`}>
                {description.trim().length}/40 min
              </span>
            </div>
            <textarea
              id="party-desc"
              rows={3}
              className="w-full rounded-sm px-3 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-700 resize-none"
              style={{
                background: validationErrors.description ? 'rgba(127,29,29,0.12)' : 'rgba(0,0,0,0.35)',
                border: validationErrors.description ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.07)',
                color: '#e4e4e7',
              }}
              placeholder="Describe what your party stands for, who it represents, and what future it promises."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, description: true }))}
            />
            {validationErrors.description && (
              <p className="text-red-400 text-[9px] mt-1 font-mono">{validationErrors.description}</p>
            )}
          </div>

          {/* Color + Logo row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Color swatches */}
            <div>
              <SectionTitle>Party Color *</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {PARTY_COLORS.map((c) => (
                  <button
                    key={c.id}
                    id={`color-${c.id}`}
                    type="button"
                    title={c.name}
                    onClick={() => setColorId(c.id)}
                    className="w-7 h-7 rounded-sm transition-all duration-150"
                    style={{
                      background: c.hex,
                      outline: colorId === c.id ? `2.5px solid rgba(245,158,11,0.9)` : 'none',
                      outlineOffset: '2px',
                      boxShadow: colorId === c.id ? `0 0 12px ${c.hex}60` : 'none',
                      border: '1px solid rgba(255,255,255,0.08)',
                      transform: colorId === c.id ? 'scale(1.12)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
              <p className="text-zinc-700 text-[9px] mt-1.5 font-mono">
                Selected: {PARTY_COLORS.find((c) => c.id === colorId)?.name ?? '—'}
              </p>
            </div>

            {/* Logo grid */}
            <div>
              <SectionTitle>Party Logo *</SectionTitle>
              <div className="grid grid-cols-6 gap-1.5">
                {PARTY_LOGOS.map((logo) => (
                  <button
                    key={logo.id}
                    id={`logo-${logo.id}`}
                    type="button"
                    title={logo.name}
                    onClick={() => { setLogoId(logo.id); setTouched((t) => ({ ...t, logo: true })); }}
                    className="w-10 h-10 rounded-sm flex items-center justify-center transition-all duration-150"
                    style={
                      logoId === logo.id
                        ? {
                            background: 'rgba(245,158,11,0.08)',
                            border: '1.5px solid rgba(245,158,11,0.65)',
                            boxShadow: '0 0 12px rgba(245,158,11,0.18)',
                          }
                        : {
                            background: 'rgba(255,255,255,0.025)',
                            border: '1px solid rgba(255,255,255,0.07)',
                          }
                    }
                  >
                    <LogoSVG logoId={logo.id} color={logoId === logo.id ? selectedColor : '#52525b'} size={22} />
                  </button>
                ))}
              </div>
              {validationErrors.logo && (
                <p className="text-red-400 text-[9px] mt-1 font-mono">{validationErrors.logo}</p>
              )}
              {selectedLogo && (
                <p className="text-zinc-600 text-[9px] mt-1 font-mono">Selected: {selectedLogo.name}</p>
              )}
            </div>
          </div>

          {/* Ideology Section */}
          <div>
            <div className="flex items-baseline justify-between mb-0.5">
              <SectionTitle>Choose Your Ideological Direction *</SectionTitle>
              <span className={`text-[9px] font-mono ${selectedIdeologyIds.length === 2 ? 'text-emerald-500' : 'text-zinc-600'}`}>
                {selectedIdeologyIds.length} / 2 selected
              </span>
            </div>
            <p className="text-zinc-600 text-[10px] mb-3 font-mono">
              Select exactly 2 ideological positions. Opposite ideologies cannot be selected together.
            </p>

            {/* Ideology explanation panel */}
            <div
              className="rounded-sm p-3 mb-3"
              style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}
            >
              <div className="text-[9px] font-mono text-amber-500/70 uppercase tracking-widest mb-1">
                How Ideology Affects Support
              </div>
              <p className="text-zinc-600 text-[9px] leading-relaxed">
                Every ideology changes how society sees your party. Business owners, workers, farmers, students, rural voters, urban professionals, military officers, religious groups, investors, unions, and low-income citizens will react differently to your political direction. These choices will later affect election support, party funding, protests, bill support, and parliamentary negotiations.
              </p>
            </div>

            {/* Ideology pairs — scrollable if needed */}
            <div className="space-y-2" style={{ maxHeight: 'clamp(240px, 32vh, 380px)', overflowY: 'auto', paddingRight: '2px' }}>
              {IDEOLOGY_PAIRS.map((pair) => (
                <div key={pair.pairId}>
                  <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <span>{pair.pairLabel}</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                    <span className="text-zinc-700">↔ Opposing pair</span>
                  </div>
                  <div className="flex gap-2">
                    <IdeologyCard
                      ideology={pair.left}
                      pair={pair}
                      selectedIds={selectedIdeologyIds}
                      onToggle={toggleIdeology}
                    />
                    <div className="flex items-center justify-center px-1">
                      <span className="text-[9px] text-zinc-700 font-mono">VS</span>
                    </div>
                    <IdeologyCard
                      ideology={pair.right}
                      pair={pair}
                      selectedIds={selectedIdeologyIds}
                      onToggle={toggleIdeology}
                    />
                  </div>
                </div>
              ))}
            </div>
            {validationErrors.ideology && (
              <p className="text-red-400 text-[9px] mt-2 font-mono">{validationErrors.ideology}</p>
            )}
          </div>

          {/* Continue button (also in right panel on desktop, here for mobile) */}
          <div className="flex lg:hidden items-center justify-end pt-2 pb-4">
            <button
              id="create-party-btn"
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

        {/* ── Right: Preview card + Continue button ── */}
        <div className="hidden lg:flex flex-col gap-4">
          {/* Preview Card */}
          <div
            className="rounded-sm overflow-hidden flex-1"
            style={{
              background: 'rgba(8,8,16,0.85)',
              border: `1px solid ${selectedColor}28`,
              boxShadow: `0 0 30px ${selectedColor}0e, 0 8px 40px rgba(0,0,0,0.5)`,
            }}
          >
            {/* Card header */}
            <div
              className="px-5 py-3 border-b border-white/[0.05] flex items-center gap-2"
              style={{ background: `linear-gradient(90deg, ${selectedColor}0e, transparent)` }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: selectedColor, boxShadow: `0 0 6px ${selectedColor}` }}
              />
              <span className="text-[9px] font-mono uppercase tracking-[0.3em]" style={{ color: `${selectedColor}99` }}>
                Party Preview
              </span>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Logo + Name */}
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-sm flex items-center justify-center shrink-0"
                  style={{ background: `${selectedColor}12`, border: `1.5px solid ${selectedColor}30` }}
                >
                  {logoId ? (
                    <LogoSVG logoId={logoId} color={selectedColor} size={38} />
                  ) : (
                    <span className="text-zinc-700 text-[9px] font-mono uppercase tracking-widest text-center leading-tight">
                      No Logo
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-white font-bold text-base leading-tight mb-0.5">
                    {partyName || <span className="text-zinc-700 font-normal">Party Name</span>}
                  </div>
                  <div
                    className="font-mono text-sm font-bold tracking-[0.3em]"
                    style={{ color: selectedColor }}
                  >
                    {abbr || '—'}
                  </div>
                  <div
                    className="text-[9px] font-mono uppercase tracking-widest mt-0.5"
                    style={{ color: `${selectedColor}60` }}
                  >
                    New Political Movement
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px" style={{ background: `linear-gradient(90deg, ${selectedColor}20, transparent)` }} />

              {/* Fields */}
              <div className="space-y-2.5">
                {[
                  { label: 'Leader', value: leaderName },
                  { label: 'Color', value: PARTY_COLORS.find((c) => c.id === colorId)?.name ?? '—' },
                  { label: 'Logo', value: selectedLogo?.name ?? 'Not selected' },
                  {
                    label: 'Ideologies',
                    value: ideologyNames.length > 0 ? ideologyNames.join(', ') : 'None selected',
                  },
                  { label: 'Origin', value: 'Motherland not selected yet', muted: true },
                  { label: 'Status', value: 'New Political Movement', accent: true },
                ].map((f) => (
                  <div key={f.label} className="flex items-start justify-between gap-2">
                    <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.18em] shrink-0 pt-0.5">
                      {f.label}
                    </span>
                    <span
                      className="text-right text-xs font-medium leading-tight max-w-[58%]"
                      style={{
                        color: f.accent
                          ? selectedColor
                          : f.muted
                          ? '#3f3f46'
                          : '#d4d4d8',
                      }}
                    >
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Doc bar */}
              <div className="mt-auto pt-3 border-t border-white/[0.04]">
                <div className="font-mono text-[8px] text-zinc-700 tracking-widest">
                  WORLDr · AETHON · {new Date().getFullYear()}
                </div>
                <div className="mt-1 h-3 rounded-sm overflow-hidden flex gap-px opacity-25">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1"
                      style={{ background: i % 3 === 0 ? selectedColor : i % 7 === 0 ? '#818cf8' : '#27272a' }}
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
            className="group relative w-full inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] rounded-sm overflow-hidden transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isFormValid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245,158,11,0.08)',
              color: isFormValid ? '#000' : '#78716c',
              border: isFormValid ? 'none' : '1px solid rgba(245,158,11,0.12)',
              boxShadow: isFormValid ? '0 4px 20px rgba(245,158,11,0.2)' : 'none',
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

          {/* Validation summary */}
          {!isFormValid && (
            <div className="text-[9px] font-mono text-zinc-700 space-y-0.5 text-center">
              {!partyName.trim() && <div>· Party name required</div>}
              {!abbrValid && <div>· Valid abbreviation required</div>}
              {description.trim().length < 40 && <div>· Description ≥ 40 chars</div>}
              {!logoId && <div>· Select a logo</div>}
              {selectedIdeologyIds.length < 2 && <div>· Select 2 ideologies</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
