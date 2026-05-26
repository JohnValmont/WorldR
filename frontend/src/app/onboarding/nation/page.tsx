'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { nationListApi, api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

const CONTINENTS = [
  {
    id: 'alderis',
    label: 'Alderis',
    subtitle: 'The Old World',
    icon: '⚜️',
    desc: 'Advanced parliamentary democracies shaped by centuries of institutional tradition, strong welfare states, and coalition politics.',
    unlocked: true,
  },
  {
    id: 'varanthos',
    label: 'Varanthos',
    subtitle: 'The Rising East',
    icon: '🌏',
    desc: 'Manufacturing giant with massive populations, chaebol-style conglomerates, and mixed governance forms.',
    unlocked: false,
  },
  {
    id: 'novara',
    label: 'Novara',
    subtitle: 'The New World',
    icon: '🌎',
    desc: 'Presidential republics defined by media-driven politics, extreme inequality, and volatile populism.',
    unlocked: false,
  },
  {
    id: 'kethara',
    label: 'Kethara',
    subtitle: 'The Frontier',
    icon: '🌍',
    desc: 'Resource-rich developing economies with the youngest populations on Aethon and high growth potential.',
    unlocked: false,
  },
];

interface PartyDisplay { abbr: string; seats: number; color: string }
interface NationCard {
  id: string;
  name: string;
  flagColors: [string, string, string];
  system: string;
  region: string;
  desc: string;
  seats: number;
  gdp: string;
  population: string;
  currency: string;
  motto: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  template: string;
  parties: PartyDisplay[];
  playable: boolean;
}

const NATIONS_BY_CONTINENT: Record<string, NationCard[]> = {
  alderis: [
    {
      id: 'keldoria',
      name: 'Keldoria',
      flagColors: ['#1a2f5a', '#c0c8d8', '#e8a020'],
      system: 'Constitutional Monarchy',
      region: 'Central Alderis',
      desc: 'Manufacturing powerhouse with deep parliamentary traditions, a strong welfare state, and coalition politics the norm.',
      seats: 450,
      gdp: '₭3.82T',
      population: '82M',
      currency: 'Keldorian Mark (KDM)',
      motto: 'Einheit durch Vernunft',
      difficulty: 'Beginner',
      template: 'Keldoria',
      parties: [{ abbr: 'KE', seats: 225, color: '#c9951a' }],
      playable: true,
    },
    {
      id: 'valdoria',
      name: 'Valdoria',
      flagColors: ['#8b0000', '#c9a84c', '#1c2a4a'],
      system: 'Parliamentary Republic',
      region: 'Eastern Alderis',
      desc: 'Dynamic democratic republic with an active multi-party system and a mixed industrial economy in transition.',
      seats: 300,
      gdp: '₭1.45T',
      population: '27M',
      currency: 'Valdorian Kron (VKR)',
      motto: 'Liberi et Aequi',
      difficulty: 'Intermediate',
      template: 'Valdoria',
      parties: [{ abbr: 'VCC', seats: 150, color: '#0891b2' }],
      playable: true,
    },
    {
      id: 'valdenmoor',
      name: 'Valdenmoor',
      flagColors: ['#134e4a', '#0f766e', '#ccfbf1'],
      system: 'Federal Republic',
      region: 'Northern Alderis',
      desc: 'A federal republic with strong regional autonomy, renowned for its financial sector and maritime trade networks.',
      seats: 380,
      gdp: '₭2.1T',
      population: '45M',
      currency: 'Valdenmark (VDM)',
      motto: 'Fortitudine et Sapientia',
      difficulty: 'Advanced',
      template: 'Valdenmoor',
      parties: [],
      playable: false,
    },
    {
      id: 'rhenmark',
      name: 'Rhenmark',
      flagColors: ['#7c3aed', '#a78bfa', '#faf5ff'],
      system: 'Semi-Presidential',
      region: 'Western Alderis',
      desc: "A semi-presidential republic bridging Alderis's old monarchic traditions with modern technocratic governance.",
      seats: 320,
      gdp: '₭1.78T',
      population: '33M',
      currency: 'Rhenmark Thaler (RHT)',
      motto: 'Ex Pluribus Unum',
      difficulty: 'Expert',
      template: 'Rhenmark',
      parties: [],
      playable: false,
    },
  ],
  varanthos: [
    { id: 'sunling', name: 'Sunling Federation', flagColors: ['#dc2626', '#fbbf24', '#fff7ed'], system: 'One-Party State', region: 'Central Varanthos', desc: 'Dominant-party industrial superstate with the largest manufacturing output on Aethon.', seats: 600, gdp: '₭8.9T', population: '420M', currency: 'Sun Yuan (SYN)', motto: 'Strength Through Unity', difficulty: 'Expert', template: '', parties: [], playable: false },
    { id: 'karvesh', name: 'Karvesh Republic', flagColors: ['#1e40af', '#93c5fd', '#eff6ff'], system: 'Presidential', region: 'Northern Varanthos', desc: 'Presidential republic navigating rapid urbanisation and a growing middle class demanding reform.', seats: 400, gdp: '₭3.2T', population: '180M', currency: 'Karvesh Won (KVW)', motto: 'Progress Through Order', difficulty: 'Advanced', template: '', parties: [], playable: false },
    { id: 'archipelago', name: 'Archipelago League', flagColors: ['#065f46', '#34d399', '#ecfdf5'], system: 'Parliamentary', region: 'Southern Varanthos', desc: 'Maritime confederation of island city-states blending tradition with high-tech cosmopolitan trade.', seats: 280, gdp: '₭1.9T', population: '62M', currency: 'League Dolar (ALD)', motto: 'Unity Across Waters', difficulty: 'Advanced', template: '', parties: [], playable: false },
    { id: 'hanjou', name: 'Hanjou Dominion', flagColors: ['#7c3aed', '#c4b5fd', '#faf5ff'], system: 'Semi-Presidential', region: 'Eastern Varanthos', desc: 'Tech-driven semi-presidential state with intense educational competition and rising youth movements.', seats: 350, gdp: '₭2.6T', population: '95M', currency: 'Hanjou Mark (HJM)', motto: 'Knowledge Is Power', difficulty: 'Intermediate', template: '', parties: [], playable: false },
  ],
  novara: [
    { id: 'norland', name: 'Norland', flagColors: ['#1e3a5f', '#c8102e', '#ffffff'], system: 'Presidential Republic', region: 'Northern Novara', desc: "The world's largest economy — a federal presidential republic with fierce media-driven electoral politics.", seats: 535, gdp: '₭18.2T', population: '340M', currency: 'Norland Dollar (NLD)', motto: 'In Liberty We Trust', difficulty: 'Expert', template: '', parties: [], playable: false },
    { id: 'celantia', name: 'Celantia', flagColors: ['#166534', '#ffffff', '#dc2626'], system: 'Semi-Presidential', region: 'Southern Novara', desc: 'Vibrant semi-presidential republic with soaring inequality, a powerful civil society, and volatile coalitions.', seats: 280, gdp: '₭2.4T', population: '115M', currency: 'Celantian Real (CLR)', motto: 'Liberdade e Justiça', difficulty: 'Advanced', template: '', parties: [], playable: false },
    { id: 'orvenia', name: 'Orvenia', flagColors: ['#b45309', '#ffffff', '#1d4ed8'], system: 'Presidential', region: 'Central Novara', desc: 'Oil-rich presidential republic caught between populist reform movements and entrenched oligarchic interests.', seats: 240, gdp: '₭1.1T', population: '68M', currency: 'Orvenia Bolívar (OVB)', motto: 'Tierra y Libertad', difficulty: 'Intermediate', template: '', parties: [], playable: false },
    { id: 'arkandia', name: 'Arkandia', flagColors: ['#0f4c81', '#f59e0b', '#10b981'], system: 'Parliamentary', region: 'Isthmus Novara', desc: 'Strategic isthmus nation with a diverse trade economy and a fragile coalition democracy at the crossroads.', seats: 180, gdp: '₭0.68T', population: '22M', currency: 'Arkan Peso (AKP)', motto: 'Puente del Mundo', difficulty: 'Beginner', template: '', parties: [], playable: false },
  ],
  kethara: [
    { id: 'akshari', name: 'Akshari Republic', flagColors: ['#14532d', '#fbbf24', '#dc2626'], system: 'Presidential', region: 'Eastern Kethara', desc: 'Resource-rich agricultural republic with a booming mobile-first tech startup ecosystem and youthful democracy.', seats: 300, gdp: '₭0.92T', population: '88M', currency: 'Akshari Shilling (AKS)', motto: 'Harambee', difficulty: 'Intermediate', template: '', parties: [], playable: false },
    { id: 'khemra', name: 'Khemra', flagColors: ['#78350f', '#fde68a', '#1c1917'], system: 'Semi-Presidential', region: 'Northern Kethara', desc: 'Ancient civilisation turned modern republic, balancing oil revenue, Saharan geography, and pan-Ketharan ambition.', seats: 420, gdp: '₭1.4T', population: '110M', currency: 'Khemri Pound (KHP)', motto: 'Strength of the Nile', difficulty: 'Advanced', template: '', parties: [], playable: false },
    { id: 'solvaria', name: 'Solvaria', flagColors: ['#7c2d12', '#fb923c', '#431407'], system: 'Dominant-Party', region: 'Southern Kethara', desc: "South Kethara's mineral giant — dominant-party republic navigating the resource curse with industrial ambition.", seats: 250, gdp: '₭0.74T', population: '55M', currency: 'Solvarian Rand (SVR)', motto: 'Ubuntu', difficulty: 'Advanced', template: '', parties: [], playable: false },
    { id: 'banyara', name: 'Banyara', flagColors: ['#065f46', '#6ee7b7', '#ecfdf5'], system: 'Parliamentary', region: 'West Kethara', desc: "West Kethara's democratic success story — parliamentary republic with strong institutions and rapidly growing services sector.", seats: 200, gdp: '₭0.45T', population: '32M', currency: 'Banyaran Cedi (BAC)', motto: 'Freedom and Justice', difficulty: 'Beginner', template: '', parties: [], playable: false },
  ],
};

const DIFFICULTY_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  Beginner:     { text: '#4ade80', bg: 'rgba(21,128,61,0.15)',  border: 'rgba(21,128,61,0.35)' },
  Intermediate: { text: '#d4a945', bg: 'rgba(180,130,40,0.15)', border: 'rgba(180,130,40,0.35)' },
  Advanced:     { text: '#fb923c', bg: 'rgba(194,65,12,0.15)',  border: 'rgba(194,65,12,0.35)' },
  Expert:       { text: '#f87171', bg: 'rgba(153,27,27,0.15)',  border: 'rgba(153,27,27,0.35)' },
};

export default function NationPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [activeContinent, setActiveContinent] = useState('alderis');
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleJoinNation = async (nation: NationCard) => {
    if (!nation.playable) return;
    setJoining(nation.id);
    setError('');
    try {
      const res = await nationListApi.list();
      const list = res.data.nations || res.data || [];
      const existing = list.find((n: any) => n.name.toLowerCase() === nation.name.toLowerCase());

      let finalNationId = '';
      if (existing) {
        await api.patch('/auth/nation', { nation_id: existing.id });
        finalNationId = existing.id;
      } else {
        const spawnRes = await api.post('/nations/spawn', {
          templateName: nation.template,
          nationName: nation.name,
          region: nation.region,
          continent: CONTINENTS.find(c => c.id === activeContinent)?.label || activeContinent,
        });
        finalNationId = spawnRes.data.nation.id;
      }

      if (user) setUser({ ...user, nation_id: finalNationId });
      router.push('/onboarding/join-party');
    } catch (err: any) {
      setError(err?.response?.data?.error || `Failed to enter ${nation.name}.`);
      setJoining(null);
    }
  };

  const continent = CONTINENTS.find(c => c.id === activeContinent)!;
  const nations = NATIONS_BY_CONTINENT[activeContinent] || [];

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 step-badge">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#d4a945' }} />
          <span className="text-[10px] font-mono uppercase tracking-[0.25em]">Step 2 of 3 · Nation Registry</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: '#f0d585' }}>
          Choose Your Nation
        </h1>
        <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(212,169,69,0.5)' }}>
          Select a nation on Aethon to govern. Each nation has its own parliament, economy, and political landscape.
        </p>
      </div>

      {error && (
        <div className="error-box px-4 py-3 rounded-xl mb-6 text-xs font-mono flex items-center gap-2">
          <span>✕</span> {error}
        </div>
      )}

      {/* Continent tabs */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {CONTINENTS.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveContinent(c.id)}
            className={`relative p-3.5 rounded-2xl text-left transition-all duration-200 ${
              activeContinent === c.id ? 'continent-tab-active' : 'continent-tab-inactive'
            }`}
          >
            <div className="text-xl mb-1.5">{c.icon}</div>
            <div className="text-xs font-bold tracking-wide" style={{ color: activeContinent === c.id ? '#d4a945' : 'rgba(212,169,69,0.55)' }}>
              {c.label}
            </div>
            <div className="text-[9px] mt-0.5 font-medium" style={{ color: 'rgba(212,169,69,0.3)' }}>{c.subtitle}</div>
            {!c.unlocked && (
              <div className="absolute top-2 right-2 text-[10px]" style={{ color: 'rgba(212,169,69,0.3)' }}>🔒</div>
            )}
          </button>
        ))}
      </div>

      {/* Continent description */}
      <div className="flex items-start gap-4 px-5 py-4 rounded-2xl mb-8 onboarding-card">
        <span className="text-2xl shrink-0 mt-0.5">{continent.icon}</span>
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-bold" style={{ color: '#f0d585' }}>{continent.label}</span>
            <span className="text-[10px] font-medium" style={{ color: 'rgba(212,169,69,0.4)' }}>· {continent.subtitle}</span>
            {!continent.unlocked && (
              <span className="text-[9px] px-2 py-0.5 rounded-full locked-badge font-mono">Coming in Phase 2</span>
            )}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(212,169,69,0.45)' }}>{continent.desc}</p>
        </div>
      </div>

      {/* Nations grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {nations.map(nation => {
          const isLocked = !nation.playable;
          const isJoining = joining === nation.id;
          const diff = DIFFICULTY_STYLE[nation.difficulty];

          return (
            <div
              key={nation.id}
              className={`relative rounded-2xl p-6 flex flex-col gap-4 ${
                isLocked ? 'nation-card-locked' : 'nation-card-playable'
              }`}
            >
              {isLocked && (
                <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full locked-badge">
                  <span className="text-[9px]">🔒</span>
                  <span className="text-[9px] font-mono uppercase">Soon</span>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col gap-0.5 shrink-0 mt-1">
                  {nation.flagColors.map((col, i) => (
                    <div key={i} className="w-8 h-2.5 rounded-sm" style={{ background: col }} />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-sm font-bold tracking-wide" style={{ color: '#f0d585' }}>{nation.name}</h2>
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full border font-medium"
                      style={{ color: diff.text, background: diff.bg, borderColor: diff.border }}
                    >
                      {nation.difficulty}
                    </span>
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: 'rgba(212,169,69,0.45)' }}>{nation.system}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: 'rgba(212,169,69,0.3)' }}>📍 {nation.region}</div>
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: 'rgba(212,169,69,0.45)' }}>{nation.desc}</p>

              <div className="text-[10px] italic" style={{ color: 'rgba(212,169,69,0.3)' }}>"{nation.motto}"</div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'GDP', value: nation.gdp },
                  { label: 'Population', value: nation.population },
                  { label: 'Parliament', value: `${nation.seats}` },
                ].map(s => (
                  <div key={s.label} className="rounded-xl px-2.5 py-2.5 text-center stat-box">
                    <div className="text-[8px] uppercase tracking-wider font-medium mb-1" style={{ color: 'rgba(212,169,69,0.35)' }}>{s.label}</div>
                    <div className="text-xs font-bold font-mono" style={{ color: '#d4a945' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Parliament bar */}
              {nation.parties.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-wider mb-1.5 font-medium" style={{ color: 'rgba(212,169,69,0.35)' }}>
                    Parliament · Current Composition
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden flex" style={{ background: 'rgba(212,169,69,0.08)' }}>
                    {nation.parties.map(p => (
                      <div
                        key={p.abbr}
                        className="h-full"
                        style={{ width: `${(p.seats / nation.seats) * 100}%`, background: p.color }}
                        title={`${p.abbr}: ${p.seats} seats`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-3 mt-1.5">
                    {nation.parties.map(p => (
                      <div key={p.abbr} className="flex items-center gap-1 text-[9px] font-mono" style={{ color: 'rgba(212,169,69,0.35)' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                        AI Caretaker · {p.abbr}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="mt-auto pt-3" style={{ borderTop: '1px solid rgba(212,169,69,0.1)' }}>
                {isLocked ? (
                  <div className="text-center text-[11px] font-medium py-1" style={{ color: 'rgba(212,169,69,0.3)' }}>
                    Coming in Phase 2 · Not yet playable
                  </div>
                ) : (
                  <button
                    type="button"
                    id={`enter-${nation.id}-btn`}
                    disabled={joining !== null}
                    onClick={() => handleJoinNation(nation)}
                    className="w-full py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 golden-btn"
                  >
                    {isJoining ? '⏳ Establishing Governance...' : `Enter ${nation.name} →`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
