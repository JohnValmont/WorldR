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
import { getContracts, formatGameDate } from '../../../lib/businessCore';
import { addNotification } from '../../../lib/notifications';
import WorldTimeControl from '../../../components/gameplay/WorldTimeControl';
import NotificationBell from '../../../components/gameplay/NotificationBell';
import FirstDayModal, { FIRST_DAY_MODAL_KEY } from '../../../components/gameplay/FirstDayModal';
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
  homeState?: string;
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

// ── Static data (will be replaced by live API data in future months) ────────────

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

/** Mock net-worth series — last 12 months. Replace with real ledger data when available. */
const MOCK_NET_WORTH_SERIES = [
  { month: 'A1', value: 50000 },
  { month: 'A2', value: 48200 },
  { month: 'A3', value: 52100 },
  { month: 'A4', value: 57300 },
  { month: 'A5', value: 61800 },
  { month: 'A6', value: 59200 },
  { month: 'A7', value: 65000 },
  { month: 'A8', value: 72400 },
  { month: 'A9', value: 81200 },
  { month: 'A10', value: 88700 },
  { month: 'A11', value: 95100 },
  { month: 'A12', value: 103800 },
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
  const [ledgerFeed, setLedgerFeed] = useState<any[]>([]);
  // First-day modal: show once, then set flag
  const [showFirstDay, setShowFirstDay] = useState(false);
  const [characterAge, setCharacterAge] = useState<number>(18);

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
    // Show first-day orientation modal if not yet seen
    const seenModal = localStorage.getItem(FIRST_DAY_MODAL_KEY) === 'true';
    if (!seenModal) setShowFirstDay(true);

    import('../../../lib/api').then(({ characterApi, companyApi, politicsApi }) => {
      characterApi.getMe()
        .then(res => {
          const char = res.data;
          setCharacterName(char.name);
          setCharacterAge(Number(char.age ?? 18));
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
              // Seed net worth tail with live company cash (player cash set above)
              const liveCash = Number(myCompany.finances?.available_cash ?? 0);
              setNetWorthSeries(prev => {
                const liveValue = Number(char.finances?.cash_in_hand ?? 0) + liveCash;
                return [...prev.slice(0, -1), { month: 'Now', value: liveValue }];
              });
            }
          }).catch(() => {});
          
          politicsApi.getLedger(10).then(data => {
            const polEvents = data.map((ev: any) => ({
              id: ev.id,
              month: ev.month,
              text: `[Month ${ev.month}] ${ev.headline}: ${ev.body}`
            }));
            const combined = [...polEvents, ...LEDGER_HEADLINES.map(h => ({ ...h, month: null }))];
            setLedgerFeed(combined);

            // Mirror world/ledger movements into the notification feed so the
            // header bell surfaces "while you were away" events. Stable ids
            // keep this idempotent across reloads.
            data.forEach((ev: any) => {
              addNotification({
                id: `ledger_${ev.id}`,
                category: 'world',
                title: ev.headline,
                body: ev.body,
                href: '/drennia/chronicle',
              });
            });
          }).catch(() => {
            setLedgerFeed(LEDGER_HEADLINES.map(h => ({ ...h, month: null })));
          });
          
        })
        .catch(err => {
          if (err.response?.status === 404) router.replace('/start/character');
        })
        .finally(() => setAuthorized(true));
    });

    const recs = JSON.parse(localStorage.getItem('worldr_records_v1') ?? '[]');
    setRecentRecords(recs.slice(0, 6));
  }, [router]);

  if (!authorized) return null;

  const sectorLabel = company?.industry_id === 'manufacturing' ? 'Manufacturing'
    : company?.industry_id === 'services' || company?.industry_id === 'shipping-logistics' ? 'Shipping & Logistics'
    : company?.industry_id ?? '—';

  const legalStructureLabel = (() => {
    const id = company?.legal_structure_id;
    if (id === 'sole-trader') return 'Sole Trader';
    if (id === 'private-company') return 'Private Company';
    if (id === 'public-corporation') return 'Corporation';
    return id ?? '—';
  })();

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
      {/* ── First-Day Modal (fires once) ─────────────────────────────────── */}
      {showFirstDay && (
        <FirstDayModal
          characterName={characterName}
          citizenFile={citizenFile}
          onDismiss={() => setShowFirstDay(false)}
        />
      )}

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
            Age {characterAge} · {citizenFile?.homeState ?? citizenFile?.motherland ?? 'Drennia'}
          </span>
        </div>

        {/* Center: stat chips — horizontal scroll strip on mobile, wrap on sm+ */}
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-hide max-w-full sm:flex-wrap sm:overflow-visible">
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
          <NotificationBell />
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

          {/* Hero — momentum + next move (the return hook) */}
          {(() => {
            const series = netWorthSeries;
            const prev = series.length > 1 ? Number(series[series.length - 2].value) : netWorth;
            const delta = netWorth - prev;
            const pct = prev ? (delta / Math.abs(prev)) * 100 : 0;
            const up = delta >= 0;
            const accent = up ? '#30d158' : '#ff453a';
            return (
              <div className="relative overflow-hidden rounded-xl border border-[#2a2630] bg-gradient-to-br from-[#0d0e15] via-[#111320] to-[#0c0d13] p-5 md:p-6" style={{ boxShadow: '0 0 40px rgba(201,162,74,0.04) inset, 0 1px 0 rgba(201,162,74,0.08)' }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                  <div className="min-w-0">
                    <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600">Welcome back</p>
                    <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100 truncate">{characterName || 'Citizen'}</h1>
                    <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                      {formatGameDate()} · {citizenFile?.motherland ?? 'Drennia'}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-zinc-600">Net Worth</p>
                      <p className="text-2xl md:text-3xl font-mono font-bold text-terminal-amber amber-glow leading-tight">
                        ₯{netWorth.toLocaleString()}
                      </p>
                      <p className={`text-[11px] font-mono font-bold ${up ? 'text-terminal-green' : 'text-terminal-red'}`}>
                        {up ? '▲' : '▼'} {up ? '+' : '−'}₯{Math.abs(delta).toLocaleString()} ({pct.toFixed(1)}%) this month
                      </p>
                    </div>
                    <div className="hidden sm:block w-32 h-14">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={accent} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={accent} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2} fill="url(#heroGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button href="/drennia/business" variant="primary" icon={ChevronRight} size="sm">
                    {company ? 'Open your desk' : 'Start your company'}
                  </Button>
                  <Button href="/drennia/politics" variant="secondary" size="sm">Politics Desk →</Button>
                  {activeContracts > 0 && <Badge variant="amber">{activeContracts} active contracts</Badge>}
                </div>
              </div>
            );
          })()}

          {/* ── First Steps Rail (new players without a company) ─────────── */}
          {!company && (
            <div style={{
              background: 'rgba(201,162,74,0.05)',
              border: '1px solid rgba(201,162,74,0.18)',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#C9A24A', marginRight: 4, flexShrink: 0 }}>
                First Steps
              </span>
              {[
                { label: 'Register a company', href: '/drennia/business', done: !!company },
                { label: 'Join a political party', href: '/drennia/politics', done: false },
                { label: 'Check the World Feed', href: '/drennia/world', done: false },
              ].map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 11, color: item.done ? '#4D8C6A' : '#A79D8C',
                    textDecoration: 'none',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 4, padding: '5px 10px',
                  }}
                >
                  <span style={{ fontSize: 10 }}>{item.done ? '✓' : '○'}</span>
                  {item.label}
                </a>
              ))}
            </div>
          )}

          {/* Personal Status */}
          <Card kicker="Personal Status" icon={User} title="Chronicle">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-1">
              {[
                { label: 'Full Name',      value: characterName },
                { label: 'Age',            value: `${characterAge}` },
                { label: 'Motherland',     value: citizenFile?.motherland ?? 'Drennia' },
                { label: 'Citizen Since',  value: citizenFile?.gameDateStr ?? 'Day 1 · Month 1' },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-[8px] font-mono uppercase tracking-[0.15em] text-zinc-600 mb-1">{f.label}</p>
                  <p className="text-[12px] font-medium text-zinc-300">{f.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Net Worth Chart */}
          <Card kicker="Net Worth — Last 12 Months" icon={TrendingUp}>
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
                  dataKey="month"
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
                      {legalStructureLabel} · {sectorLabel} · {stateLabel}
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

            {/* Politics Desk */}
            <Card kicker="Politics Desk" icon={Landmark} accent hover>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">
                Enter the political arena. Manage your party, run campaigns, shape public policy, and form the government.
              </p>
              <Button href="/drennia/politics" variant="primary" icon={ChevronRight} size="sm">
                Open Politics Desk
              </Button>
            </Card>

            {/* World Feed */}
            <Card kicker="World Feed" icon={Globe} accent hover>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">
                See who else is operating in Drennia. View market standings, the political scene, and active operators.
              </p>
              <Button href="/drennia/world" variant="secondary" icon={ChevronRight} size="sm">
                View World Feed
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
            {ledgerFeed.map((h, i) => (
              <div
                key={h.id}
                className={`py-2.5 text-[11px] text-zinc-400 leading-relaxed ${
                  i < ledgerFeed.length - 1 ? 'border-b border-[#23232b]' : ''
                }`}
              >
                <Globe size={10} className="inline-block mr-2 text-zinc-600" />
                {h.text}
              </div>
            ))}
            {ledgerFeed.length === 0 && (
              <div className="py-2 text-[11px] text-zinc-500 italic">No ledger entries found.</div>
            )}
          </Card>

        </PageShell>
      </div>
    </div>
  );
}
