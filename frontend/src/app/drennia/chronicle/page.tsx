'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  Tooltip, ResponsiveContainer, XAxis, YAxis,
} from 'recharts';
import {
  ScrollText, Briefcase, TrendingUp, BarChart2, User, Star,
  Mail, Landmark, ChevronRight, RefreshCw, AlertTriangle, Lock,
  Activity, Globe, Newspaper,
} from 'lucide-react';
import { getContracts } from '../../../lib/businessCore';
import WorldTimeControl from '../../../components/gameplay/WorldTimeControl';
import {
  Card, Button, StatChip, DataRow, EmptyState, Badge, StatusDot,
  SectionHeading, PageShell,
} from '../../../components/ui';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlayerStats {
  credibility: number;
  charisma: number;
  influence: number;
  reputation?: number;
  reliability?: number;
  motherland: string;
  gameDateStr?: string;
}

interface CompanySnapshot {
  id: string;
  name: string;
  sector?: string;
  industry_id?: string;
  headquarters_state_id?: string;
  legal_structure_id?: string;
  finances?: { available_cash?: number };
}

// ── Static data (will be replaced by live API data in future arcs) ────────────

const SECTOR_DEMAND = [
  { sector: 'Shipping & Logistics', demand: 'High',    pct: 82, dir: 'up'   as const },
  { sector: 'Manufacturing',        demand: 'Rising',  pct: 67, dir: 'up'   as const },
  { sector: 'Retail & Consumer',    demand: 'Medium',  pct: 48, dir: 'flat' as const },
  { sector: 'Agriculture & Food',   demand: 'Stable',  pct: 41, dir: 'flat' as const },
];

const LEDGER_HEADLINES = [
  { id: 1, text: 'Drennport Commercial Bank reports stable liquidity for Q2.' },
  { id: 2, text: 'Ironvale suppliers warn of material cost increases.' },
  { id: 3, text: 'Westport Bourse volume up — Trade activity strengthens.' },
  { id: 4, text: 'Greenmere harvest season expected ahead of schedule.' },
  { id: 5, text: 'New registry filings up 12% — Business formation accelerating.' },
];

/** Mock net-worth series — last 12 arcs. Replace with real ledger data when available. */
const MOCK_NET_WORTH_SERIES = [
  { arc: 'A1', value: 50000 },
  { arc: 'A2', value: 48200 },
  { arc: 'A3', value: 52100 },
  { arc: 'A4', value: 57300 },
  { arc: 'A5', value: 61800 },
  { arc: 'A6', value: 59200 },
  { arc: 'A7', value: 65000 },
  { arc: 'A8', value: 72400 },
  { arc: 'A9', value: 81200 },
  { arc: 'A10', value: 88700 },
  { arc: 'A11', value: 95100 },
  { arc: 'A12', value: 103800 },
];

const demandColor = {
  up:   '#30d158',
  flat: '#ff9f0a',
  down: '#ff453a',
} as const;

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0c0d13] border border-[#23232b] px-3 py-2 rounded-lg text-[10px] font-mono shadow-card">
      <p className="text-zinc-500 mb-0.5 uppercase tracking-wider">{label}</p>
      <p className="text-terminal-amber font-bold">₯{Number(payload[0].value).toLocaleString()}</p>
    </div>
  );
}

// ── Sector Demand Bar ──────────────────────────────────────────────────────────

function DemandBar({ sector, demand, pct, dir }: typeof SECTOR_DEMAND[0]) {
  const color = demandColor[dir];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#23232b] last:border-0">
      <span className="text-[11px] text-zinc-400 flex-1 min-w-0 truncate">{sector}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full animate-bar-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <span className="text-[10px] font-mono font-bold w-12 text-right" style={{ color }}>
          {demand}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChroniclePage() {
  const router = useRouter();
  const [authorized, setAuthorized]       = useState(false);
  const [citizenFile, setCitizenFile]     = useState<PlayerStats | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [playerCash, setPlayerCash]       = useState(0);
  const [company, setCompany]             = useState<CompanySnapshot | null>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [activeContracts, setActiveContracts] = useState(0);
  const [netWorthSeries, setNetWorthSeries]   = useState(MOCK_NET_WORTH_SERIES);

  // Build radar data from citizen file stats
  const radarData = [
    { attr: 'Credibility', value: citizenFile?.credibility ?? 50 },
    { attr: 'Charisma',    value: citizenFile?.charisma    ?? 50 },
    { attr: 'Influence',   value: citizenFile?.influence   ?? 10 },
    { attr: 'Reputation',  value: citizenFile?.reputation  ?? 30 },
    { attr: 'Reliability', value: citizenFile?.reliability ?? 60 },
  ];

  const companyCash = Number(company?.finances?.available_cash ?? 0);
  const netWorth    = playerCash + companyCash;

  const handleRestartLife = useCallback(() => {
    if (typeof window === 'undefined') return;
    const preserve = [
      'worldr_access_token',
      'worldr_refresh_token',
      'worldr_pre_alpha_access_granted_v1',
      'worldr_account_settings',
      'worldr_world_clock_v1',
    ];
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('worldr_') && !preserve.includes(k)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    window.location.href = '/world-entry';
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }

    import('../../../lib/api').then(({ characterApi, companyApi }) => {
      characterApi.getMe()
        .then(res => {
          const char = res.data;
          setCharacterName(char.name);
          setPlayerCash(Number(char.finances?.cash_in_hand ?? 0));

          const fileStr = localStorage.getItem('worldr_citizen_file_v1');
          const parsed  = fileStr ? JSON.parse(fileStr) : { motherland: 'Drennia' };
          setCitizenFile(parsed);

          companyApi.getMy().then(compRes => {
            const companies = compRes.data;
            if (companies.length > 0) {
              const myCompany = companies.sort((a: any, b: any) =>
                new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
              )[0];
              setCompany(myCompany);
              const contracts = getContracts();
              setActiveContracts(
                contracts.filter(c => c.status === 'awarded' && c.awardedToCompanyId === myCompany.id).length
              );
              // Seed net worth into series tail with live value
              const liveValue = playerCash + Number(myCompany.finances?.available_cash ?? 0);
              setNetWorthSeries(prev => [...prev.slice(0, -1), { arc: 'Now', value: liveValue }]);
            }
          }).catch(() => {});
        })
        .catch(err => {
          if (err.response?.status === 404) router.replace('/start/character');
        })
        .finally(() => setAuthorized(true));
    });

    const recs = JSON.parse(localStorage.getItem('worldr_records_v1') ?? '[]');
    setRecentRecords(recs.slice(0, 6));
  }, [router, playerCash]);

  if (!authorized) return null;

  const sectorLabel = company?.industry_id === 'manufacturing' ? 'Manufacturing'
    : company?.industry_id === 'services' || company?.industry_id === 'shipping-logistics' ? 'Shipping & Logistics'
    : company?.industry_id ?? '—';

  const stateLabel = (() => {
    const id = company?.headquarters_state_id;
    if (!id) return '—';
    if (id === 'drennia-drennport') return 'Drennport';
    if (id === 'drennia-westport')  return 'Westport';
    if (id === 'drennia-ironvale')  return 'Ironvale';
    if (id === 'drennia-greenmere') return 'Greenmere';
    return id;
  })();

  // ── Sidebar ────────────────────────────────────────────────────────────────

  const sidebar = (
    <>
      {/* Market Snapshot */}
      <Card kicker="Market Snapshot" icon={BarChart2}>
        {SECTOR_DEMAND.map(s => <DemandBar key={s.sector} {...s} />)}
        <div className="mt-3 flex justify-end">
          <Link href="/drennia/market" className="text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-600 hover:text-terminal-amber transition-colors">
            Full Market →
          </Link>
        </div>
      </Card>

      {/* Attribute Radar */}
      <Card kicker="Attribute Profile" icon={Star}>
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={radarData} outerRadius={65}>
            <PolarGrid stroke="#23232b" />
            <PolarAngleAxis
              dataKey="attr"
              tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
            />
            <Radar
              dataKey="value"
              stroke="#ff9f0a"
              fill="#ff9f0a"
              fillOpacity={0.12}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      {/* Letters */}
      <Card kicker="Letters & Correspondence" icon={Mail}>
        <EmptyState
          icon={Mail}
          message="No letters received yet. Business correspondence and official notices will arrive here."
          className="py-6"
        />
      </Card>
    </>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#090A0F] text-zinc-100 overflow-hidden scanlines relative">

      {/* ── Top Player Bar ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 md:px-6 py-2 border-b border-[#23232b] bg-[#0c0d13] shrink-0 gap-4 flex-wrap">
        {/* Left: brand + character */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-black tracking-[0.25em] text-terminal-amber amber-glow">
            WORLDr
          </span>
          <span className="w-px h-4 bg-[#23232b]" />
          <StatusDot variant="live" />
          <span className="text-[13px] font-semibold text-zinc-100">{characterName}</span>
          <span className="text-[10px] text-zinc-600 font-mono hidden md:inline">
            Age 18 · {citizenFile?.motherland ?? 'Drennia'}
          </span>
        </div>

        {/* Center: stat chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatChip
            label="Cash ₯"
            value={playerCash}
            prefix="₯"
            valueColor="green"
            countUp
          />
          <StatChip label="Credibility" value={citizenFile?.credibility ?? 50} />
          <StatChip label="Charisma"    value={citizenFile?.charisma    ?? 50} />
          <StatChip label="Influence"   value={citizenFile?.influence   ?? 10} />
          {company && (
            <StatChip
              label="Company Cash"
              value={companyCash}
              prefix="₯"
              valueColor="amber"
              countUp
            />
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-3">
          <WorldTimeControl />
          <button className="text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-500 hover:text-terminal-amber transition-colors">
            Letters
          </button>
          <button
            onClick={handleRestartLife}
            className="text-[9px] font-mono uppercase tracking-[0.12em] text-terminal-red hover:opacity-80 transition-opacity"
          >
            Restart Life
          </button>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-6">
        <PageShell sidebar={sidebar}>

          {/* Personal Status */}
          <Card kicker="Personal Status" icon={User} title="Chronicle">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-1">
              {[
                { label: 'Full Name',      value: characterName },
                { label: 'Age',            value: '18' },
                { label: 'Motherland',     value: citizenFile?.motherland ?? 'Drennia' },
                { label: 'Citizen Since',  value: citizenFile?.gameDateStr ?? 'Mark 1 · Arc 1' },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-[8px] font-mono uppercase tracking-[0.15em] text-zinc-600 mb-1">{f.label}</p>
                  <p className="text-[12px] font-medium text-zinc-300">{f.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Net Worth Chart */}
          <Card kicker="Net Worth — Last 12 Arcs" icon={TrendingUp}>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-zinc-600">Current Net Worth</p>
                <p className="text-xl font-mono font-bold text-terminal-amber amber-glow">
                  ₯{netWorth.toLocaleString()}
                </p>
              </div>
              <Badge variant="green" dot>Active</Badge>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={netWorthSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff9f0a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ff9f0a" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="arc"
                  tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#ff9f0a"
                  strokeWidth={2}
                  fill="url(#nwGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#ff9f0a', stroke: '#090A0F', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Desks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Business Desk */}
            {!company ? (
              <Card kicker="Business Desk" icon={Briefcase} accent hover>
                <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">
                  Open your company file, register a business, manage contracts, and build market power.
                </p>
                <Button href="/drennia/business" variant="primary" icon={ChevronRight} size="sm">
                  Open Business Desk
                </Button>
              </Card>
            ) : (
              <Card kicker="Business Desk" icon={Briefcase} accent hover>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[14px] font-semibold text-zinc-100">{company.name}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {company.legal_structure_id} · {sectorLabel} · {stateLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-mono text-zinc-600">Cash</p>
                    <p className="text-[14px] font-mono font-bold text-terminal-green terminal-glow">
                      ₯{companyCash.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <StatusDot variant="live" label="Active" />
                  {activeContracts > 0 && (
                    <Badge variant="amber">{activeContracts} contracts</Badge>
                  )}
                </div>
                <Button href="/drennia/business" variant="secondary" size="sm">
                  Open Business Desk →
                </Button>
              </Card>
            )}

            {/* Politics Desk — locked */}
            <Card kicker="Politics Desk" icon={Landmark} className="opacity-60">
              <p className="text-[12px] text-zinc-600 leading-relaxed mb-4">
                Political life is not open in pre-alpha yet. Parties, elections, offices, campaigns, and public power will unlock after the business foundation is stable.
              </p>
              <Button variant="disabled" icon={Lock} size="sm">
                Locked
              </Button>
            </Card>
          </div>

          {/* Career Summary */}
          {company && (
            <Card kicker="Career: Business Founder" icon={Activity}>
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  {characterName} started{' '}
                  <strong className="text-zinc-200">{company.name}</strong>, a{' '}
                  {sectorLabel} business in {stateLabel}.
                </p>
                <Button href="/drennia/career" variant="ghost" size="sm" className="ml-4 flex-shrink-0">
                  View Career →
                </Button>
              </div>
            </Card>
          )}

          {/* Recent Records */}
          <Card kicker="Recent Records" icon={ScrollText} headerSlot={<Link href="/drennia/records" className="text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-500 hover:text-terminal-amber transition-colors">View All →</Link>}>
            {recentRecords.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                message="No records yet. Your filings, contracts, and actions will appear here."
                className="py-6"
              />
            ) : (
              <div>
                {recentRecords.map((r, i) => (
                  <DataRow
                    key={r.id ?? i}
                    label={r.summary ?? r.title ?? '—'}
                    value={r.type ?? ''}
                    valueVariant="amber"
                    border={i < recentRecords.length - 1}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Drennian Ledger */}
          <Card kicker="Drennian Ledger" icon={Newspaper}>
            {LEDGER_HEADLINES.map((h, i) => (
              <div
                key={h.id}
                className={`py-2.5 text-[11px] text-zinc-400 leading-relaxed ${
                  i < LEDGER_HEADLINES.length - 1 ? 'border-b border-[#23232b]' : ''
                }`}
              >
                <Globe size={10} className="inline-block mr-2 text-zinc-600" />
                {h.text}
              </div>
            ))}
          </Card>

        </PageShell>
      </div>
    </div>
  );
}
