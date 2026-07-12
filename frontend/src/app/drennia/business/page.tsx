'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCompanies, getPlayerCompany,
  getContracts, saveContract, initializeContractsIfEmpty,
  evaluatePlayerBid, assignVehicleToContract, resolveContract,
  getFleet, purchaseVehicle, calcNetWorth, calcCompanyValue, addRecord,
  VEHICLE_CATALOGUE, formatMoney, getContractHistory, acceptDirectContract, assignVehicleToAutoOp, STAFF_WAGES, getRouteFamiliarity, leaseFacility, saveVehicle,
  getLedger, getFinanceHistory, getGameDate, formatGameDate, getVehicleDisplayLabel, getRouteFamiliarityPercent, getClientTrustLabel,
  type Company, type Contract, type Vehicle, type VehicleType, type ContractHistoryEntry, type RouteFamiliarity, type AutoOpPoolType, type StaffRole, type WagePolicy, type MonthlyFinanceSnapshot, type LedgerEntry
} from '../../../lib/businessCore';
import { logisticsApi, manufacturingApi } from '../../../lib/api';
import { formatWorldDate } from '@/lib/calendar';
import WorldTimeControl from '../../../components/gameplay/WorldTimeControl';
import ManufacturingDeskTab from './ManufacturingDeskTab';
import EquityDeskTab from './EquityDeskTab';
import CapitalPartnersDeskTab from './CapitalPartnersDeskTab';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import {
  Card, Button, StatChip, StatCard, DataRow, Badge, StatusDot, SectionHeading, TerminalPanel, Tabs, PageShell
} from '@/components/ui';
import { ArrowLeft, Briefcase, TrendingUp, Wallet, Lock, Building2, Landmark, FileText, ArrowRight, ScrollText, Scale } from 'lucide-react';

// Helpers to resolve standard IDs to display names in v1
const getStateName = (id?: string) => {
  if (!id) return 'Unknown State';
  if (id === 'drennia-drennport') return 'Drennport State';
  if (id === 'drennia-westport') return 'Westport State';
  if (id === 'drennia-ironvale') return 'Ironvale State';
  if (id === 'drennia-greenmere') return 'Greenmere State';
  return id;
};

const getSectorName = (id?: string) => {
  if (!id) return '';
  if (id === 'services' || id === 'shipping-logistics') return 'Shipping & Logistics';
  if (id === 'retail') return 'Retail & Consumer';
  if (id === 'manufacturing') return 'Manufacturing';
  return id;
};

const getSubsectorName = (id?: string) => {
  if (id === 'automobile-manufacturing') return 'Automobile Manufacturing';
  return id;
};

// ─── Theme ───────────────────────────────────────────────────────────────────
const T = {
  bg: '#090A0F',
  panel: '#11131A',
  panelSoft: '#17151B',
  paper: '#1E1A15',
  border: '#2A2630',
  borderGold: 'rgba(201,162,74,0.22)',
  gold: '#C9A24A',
  ivory: '#F4EBD6',
  muted: '#A79D8C',
  faint: '#6B6358',
  mint: '#36D399',
  steel: '#4B6382',
  burgundy: '#8F3D3D',
  red: '#B85555',
};

// ─── Display Name Helpers ────────────────────────────────────────────────────
const getLegalStructureName = (id?: string): string => {
  if (id === 'sole-trader') return 'Sole Trader';
  if (id === 'private-company') return 'Private Company';
  if (id === 'public-corporation') return 'Corporation';
  return id || 'Unknown';
};

// ─── Reusable Atoms ──────────────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-500 mb-1">
    {children}
  </div>
);

const FieldRow = ({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) => (
  <div className="flex justify-between items-baseline py-2 border-b border-zinc-800/60 last:border-0">
    <span className="text-[11px] text-zinc-400">{label}</span>
    <span className="font-mono text-xs font-bold" style={{ color: valueColor || '#F4EBD6' }}>{value}</span>
  </div>
);

const SectionHeader = ({ children, stamp }: { children: React.ReactNode; stamp?: string }) => (
  <div className="flex justify-between items-center mb-4">
    <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-terminal-amber font-bold">
      {children}
    </div>
    {stamp && <div className="font-mono text-[9px] text-zinc-500 tracking-wider border border-zinc-800 px-2 py-0.5 rounded">{stamp}</div>}
  </div>
);

const PanelBox = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div className={`bg-[#0c0d13] border border-[#23232b] rounded-xl p-5 ${className || ''}`} style={style}>
    {children}
  </div>
);

type GoldButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const GoldButton = ({ children, disabled, style, className, ...props }: GoldButtonProps & { className?: string }) => (
  <button
    disabled={disabled}
    className={`font-mono text-[10px] uppercase tracking-[0.15em] font-bold px-6 py-2.5 rounded transition-all duration-150 
      ${disabled 
        ? 'bg-white/5 text-zinc-500 border border-zinc-800 cursor-not-allowed' 
        : 'bg-terminal-amber text-black border border-terminal-amber hover:bg-[#d9b85c] hover:border-[#d9b85c] cursor-pointer'} 
      ${className || ''}`}
    style={style}
    {...props}
  >
    {children}
  </button>
);

type GhostButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: string;
};

const GhostButton = ({
  children,
  color,
  disabled,
  style,
  type = 'button',
  className,
  ...buttonProps
}: GhostButtonProps & { className?: string }) => (
  <button
    {...buttonProps}
    type={type}
    disabled={disabled}
    aria-disabled={disabled}
    className={`font-mono text-[10px] uppercase tracking-[0.12em] font-semibold px-4 py-2 rounded transition-all duration-150 border
      ${disabled 
        ? 'bg-transparent text-zinc-500 border-zinc-800 cursor-not-allowed opacity-50' 
        : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-terminal-amber hover:text-zinc-100 cursor-pointer'} 
      ${className || ''}`}
    style={style}
  >
    {children}
  </button>
);

// ─── Filter types & Constants ──────────────────────────────────────────────────
export type RouteFilter = 'All' | 'Local' | 'Interstate' | 'International';
export const ROUTE_FILTER_OPTIONS: Array<{ label: string; value: RouteFilter }> = [
  { label: 'All Routes', value: 'All' },
  { label: 'Local Routes', value: 'Local' },
  { label: 'Interstate Routes', value: 'Interstate' },
  { label: 'International Routes', value: 'International' },
];

export type ContractSourceFilter = 'All' | 'Government' | 'State-Owned Enterprise' | 'NPC Corporation' | 'Local Business' | 'Private Client' | 'Player Company';
export const CONTRACT_SOURCE_FILTER_OPTIONS: Array<{ label: string; value: ContractSourceFilter; disabled?: boolean }> = [
  { label: 'All Sources', value: 'All' },
  { label: 'Government', value: 'Government' },
  { label: 'NPC Corporations', value: 'NPC Corporation' },
  { label: 'Local Businesses', value: 'Local Business' },
  { label: 'Player Companies (Locked)', value: 'Player Company', disabled: true },
];


export const WAGE_POLICY_OPTIONS: Array<{ label: string; value: WagePolicy }> = [
  { label: 'Low Wages (0.8x)', value: 'Low' },
  { label: 'Standard Wages (1.0x)', value: 'Standard' },
  { label: 'Generous Wages (1.2x)', value: 'Generous' },
  { label: 'Premium Wages (1.45x)', value: 'Premium' },
];

// ─── Sub-tab types ────────────────────────────────────────────────────────────
type SubTab = 'overview' | 'start' | 'companies' | 'analytics' | 'exchange' | 'registry';

const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'start', label: 'Start Business' },
  { id: 'companies', label: 'My Companies', requiresCompany: true },
  { id: 'analytics', label: 'Analytics', requiresCompany: true },
  { id: 'exchange', label: 'Drennport Exchange' },
  { id: 'registry', label: 'Registry' }
];

// ─── SECTORS ─────────────────────────────────────────────────────────────────
const SECTORS = [
  { id: 'Shipping & Logistics', desc: 'Freight, transport, port handling, and supply chain operations.', available: false, note: 'License Cap Reached' },
  { id: 'Manufacturing',        desc: 'Production, parts, assembly, and industrial output.',              available: true },
  { id: 'Retail & Consumer',    desc: 'Consumer goods, storefronts, and distribution.',                   available: false, note: 'Later' },
  { id: 'Agriculture & Food',   desc: 'Farming, processing, and food supply chains.',                     available: false, note: 'Later' },
  { id: 'Finance & Services',   desc: 'Capital Partners firm — hold shares, earn dividends, compound wealth.', available: true, note: 'Capital Partners' },
  { id: 'Construction',         desc: 'Infrastructure, building, and civil development.',                  available: false, note: 'Later' },
  { id: 'Technology',           desc: 'Tools, communications, and emerging tech.',                        available: false, note: 'Later' },
  { id: 'Energy',               desc: 'Fuel, steam, coal, and energy distribution.',                      available: false, note: 'Later' },
];


// ─── HQ OPTIONS ──────────────────────────────────────────────────────────────
const HQ_OPTIONS = [
  { id: 'drennia-drennport',  city: 'Drennport', tagline: 'Finance, Law & Administration', costNote: '▲ Higher Costs',  costColor: T.red,   desc: 'Capital city. Excellent registry access and professional services. Higher operating costs.' },
  { id: 'drennia-westport',   city: 'Westport',  tagline: 'Ports, Trade & Export',         costNote: '≈ Moderate Costs', costColor: T.gold,  desc: 'Major port hub with strong shipping and logistics contracts.' },
  { id: 'drennia-ironvale',   city: 'Ironvale',  tagline: 'Manufacturing & Labour',        costNote: '▼ Lower Costs',   costColor: T.mint,  desc: 'Industrial state. Good supply of materials and factory capacity.' },
  { id: 'drennia-greenmere',  city: 'Greenmere', tagline: 'Agriculture & Community',       costNote: '▼ Lowest Costs',  costColor: T.mint,  desc: 'Slow but steady market. Strong for food and local logistics.' },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function BusinessPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [citizenFile, setCitizenFile] = useState<any>(null);
  const [characterName, setCharacterName] = useState('');
  const [playerCash, setPlayerCash] = useState(0);
  const [company, setCompany] = useState<Company | null>(null);
  const [fleet, setFleet] = useState<Vehicle[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [registryKey, setRegistryKey] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mfgData, setMfgData] = useState<any>(null);
  const [financeCompany, setFinanceCompany] = useState<any>(null); // Capital Partners firm if player has one

  // Start Business state
  const [step, setStep] = useState(1);
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedHQ, setSelectedHQ] = useState('');
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [startError, setStartError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chosenCapital, setChosenCapital] = useState(500000);
  const [selectedStructure, setSelectedStructure] = useState('sole-trader');
  const [selectedModel, setSelectedModel] = useState<string>('');

  const loadData = useCallback(() => {
    if (typeof window === 'undefined') return;
    import('../../../lib/api').then(({ authApi, characterApi, companyApi, logisticsApi }) => {
      authApi.me().then(res => setIsAdmin(res.data.isAdmin)).catch(() => {});
      characterApi.getMe()
        .then(res => {
          const char = res.data;
          setCharacterName(char.name);
          setPlayerCash(Number(char.finances?.cash_in_hand || 0));

          const fileStr = localStorage.getItem('worldr_citizen_file_v1');
          if (fileStr) setCitizenFile(JSON.parse(fileStr));
          else setCitizenFile({ motherland: 'Drennia' });

          companyApi.getMy().then(compRes => {
            const companies = compRes.data;

            // Separate finance firm from operational company
            const financeFirm = companies.find((c: any) => c.industry_id === 'finance') || null;
            setFinanceCompany(financeFirm);

            const operationalCompanies = companies.filter((c: any) => c.industry_id !== 'finance');
            if (operationalCompanies.length > 0) {
              const myCompany = operationalCompanies.sort((a: any, b: any) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime())[0];
              
              if (myCompany.industry_id === 'manufacturing') {
                import('../../../lib/api').then(({ manufacturingApi }) => {
                  manufacturingApi.getCompanyData(myCompany.id).then(mfgRes => {
                    setCompany({
                      ...myCompany,
                      sector: myCompany.industry_id,
                      subsector: myCompany.subsector_id,
                      state: myCompany.headquarters_state_id,
                      legalStructure: myCompany.legal_structure_id,
                      companyCash: myCompany.finances?.available_cash,
                      debt: myCompany.finances?.debt,
                      maintenancePolicy: myCompany.finances?.maintenance_policy || 'Standard',
                    });
                    setMfgData(mfgRes.data);
                  }).catch(err => {
                    console.error("Manufacturing fetch error", err);
                    setCompany({
                      ...myCompany,
                      sector: myCompany.industry_id,
                      subsector: myCompany.subsector_id,
                      state: myCompany.headquarters_state_id,
                      legalStructure: myCompany.legal_structure_id,
                      companyCash: myCompany.finances?.available_cash,
                      debt: myCompany.finances?.debt,
                    });
                  });
                });
              } else {
                logisticsApi.getCompanyLogistics(myCompany.id).then(logRes => {
                  const { staff, vehicles, facilities, ledger } = logRes.data;
                  
                  // Map staff to a record
                  const staffRecord: Record<string, number> = {};
                  staff.forEach((s: any) => staffRecord[s.role] = s.quantity);

                  // Map fleet
                  const mappedFleet = vehicles.map((v: any, index: number) => {
                    let tagPrefix = 'VEH';
                    if (v.type.includes('Van')) tagPrefix = 'VAN';
                    else if (v.type.includes('Box')) tagPrefix = 'BOX';
                    else if (v.type.includes('Freight')) tagPrefix = 'FRT';
                    
                    return {
                      id: v.id,
                      companyId: v.company_id,
                      type: v.type, // Comes from JOIN
                      catalogId: v.catalog_vehicle_id,
                      condition: Number(v.condition),
                      assignedAutoOpPool: v.assigned_operation_pool_name, // Fix: use the joined name, not the UUID
                      purchasedAt: v.purchased_at,
                      capacity: Number(v.capacity) || 0,
                      purchaseCost: Number(v.purchase_cost) || 0,
                      monthlyMaintenance: Number(v.monthly_maintenance) || 0,
                      currentValue: Number(v.current_value) || 0,
                      assetTag: `${tagPrefix}-${String(index + 1).padStart(3, '0')}`
                    };
                  });

                  setCompany({
                    ...myCompany,
                    sector: myCompany.industry_id,
                    state: myCompany.headquarters_state_id,
                    legalStructure: myCompany.legal_structure_id,
                    companyCash: myCompany.finances?.available_cash,
                    maintenancePolicy: myCompany.finances?.maintenance_policy || 'Standard',
                    staff: staffRecord
                  });
                  setFleet(mappedFleet);
                  setLedger(ledger);
                }).catch(err => {
                  console.error("Logistics fetch error", err);
                  setCompany({
                    ...myCompany,
                    sector: myCompany.industry_id,
                    state: myCompany.headquarters_state_id,
                    legalStructure: myCompany.legal_structure_id,
                    companyCash: myCompany.finances?.available_cash,
                  });
                });
              }

            } else {
              setCompany(null);
            }
          });
        })
        .catch(err => {
          if (err.response?.status === 404) {
             router.replace('/start/character');
          }
        })
        .finally(() => {
          const { initializeContractsIfEmpty, getContracts } = require('../../../lib/businessCore');
          initializeContractsIfEmpty();
          setContracts(getContracts());
          setAuthorized(true);
        });
    });
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Helpers ────────────────────────────────────────────────────────────
  const refreshAll = () => {
    loadData();
  };

  // ─── Net Worth ──────────────────────────────────────────────────────────
  const calcCompanyValue = (comp: any) => {
    const fleetVal = fleet.reduce((acc, v) => acc + (v.currentValue || 0), 0);
    return Number(comp.companyCash || 0) + fleetVal - Number(comp.debt || 0);
  };
  const netWorth = playerCash + (company ? calcCompanyValue(company) : 0);

  // ─── Start Business ──────────────────────────────────────────────────────
  const checkName = () => {
    setNameError('');
    if (!companyNameInput.trim()) { setNameError('Company name cannot be blank.'); return false; }
    if (companyNameInput.trim().length < 3) { setNameError('Name must be at least 3 characters.'); return false; }
    // NOTE: Name uniqueness is enforced server-side. We skip the localStorage check
    // to avoid blocking valid registrations when localStorage is stale or empty.
    return true;
  };

  const handleRegisterCompany = async () => {
    setStartError('');
    const isFinance = selectedSector === 'Finance & Services';
    const isLogistics = selectedSector === 'Shipping & Logistics';

    const FILING_FEE = selectedStructure === 'sole-trader' ? 500 : selectedStructure === 'private-company' ? 5000 : 50000;
    const total = chosenCapital + FILING_FEE;
    if (playerCash < total) {
      setStartError(`Insufficient cash. You need ${formatMoney(total)} (${formatMoney(chosenCapital)} capital + ${formatMoney(FILING_FEE)} filing fee). You have ${formatMoney(playerCash)}.`);
      return;
    }

    // Finance firms don't have a vehicle model — skip that check
    if (!isFinance && !selectedModel) {
      setStartError('Please select a first operating model.');
      return;
    }

    const finalName = companyNameInput.trim();

    setIsSubmitting(true);
    import('../../../lib/api').then(({ companyApi }) => {
      let industryId: string;
      let subsectorId: string | null;
      let structureId = selectedStructure;

      if (isFinance) {
        industryId = 'finance';
        subsectorId = null;
        structureId = 'private-company'; // Capital Partners firms are always private companies
      } else if (isLogistics) {
        industryId = 'shipping-logistics';
        subsectorId = null;
      } else {
        industryId = 'manufacturing';
        subsectorId = selectedModel || null;
      }

      companyApi.create({
        name: finalName,
        country_id: 'drennia',
        headquarters_state_id: selectedHQ,
        industry_id: industryId,
        subsector_id: subsectorId,
        legal_structure_id: structureId,
        currency_id: 'dollar',
        starting_capital: chosenCapital
      }).then((res: any) => {
        // Create/update career record
        const gDate = getGameDate();
        const careerData = {
          activePath: 'Business',
          startedAtYear: gDate.worldYear,
          startedAtMonth: gDate.worldMonth,
          entries: [
            {
              id: `car_${Date.now()}`,
              type: 'business_start',
              year: gDate.worldYear,
              month: gDate.worldMonth,
              text: isFinance
                ? `${characterName} founded ${finalName} (Capital Partners firm) headquartered in ${HQ_OPTIONS.find(h => h.id === selectedHQ)?.city || selectedHQ}, in ${formatGameDate(gDate)}.`
                : `${characterName} started ${finalName} (${selectedModel}) headquartered in ${HQ_OPTIONS.find(h => h.id === selectedHQ)?.city || selectedHQ}, in ${formatGameDate(gDate)}.`,
              relatedCompanyId: res.data?.id
            }
          ]
        };
        localStorage.setItem('worldr_career_v1', JSON.stringify(careerData));

        loadData();
        setRegistryKey(k => k + 1); // force registry to refetch from DB
        setStep(5);
        setActiveTab('companies');
        setIsSubmitting(false);
      }).catch((err: any) => {
        setStartError(err.response?.data?.error || 'Failed to register company.');
        setIsSubmitting(false);
      });
    });
  };


  if (!authorized) return null;

  return (
    <div className="flex flex-col h-full w-full bg-[#090A0F] text-zinc-100 overflow-hidden">

      {/* ── Enhanced Business Header ── */}
      <header className="flex items-center justify-between px-4 md:px-6 py-2.5 border-b border-[#23232b] bg-[#0c0d13] shrink-0 flex-wrap gap-3">
        {/* Left: back + brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/drennia/chronicle')}
            className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-500 hover:text-terminal-amber transition-colors"
          >
            <ArrowLeft size={11} /> Chronicle
          </button>
          <span className="w-px h-4 bg-[#23232b]" />
          <span className="text-[10px] font-mono font-black tracking-[0.25em] text-terminal-amber amber-glow">WORLDr</span>
          <span className="w-px h-4 bg-[#23232b]" />
          <Briefcase size={12} className="text-zinc-500" />
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-zinc-500">Business Desk</span>
          {company && <StatusDot variant="live" label={company.name} />}
        </div>

        {/* Center: stat chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatChip
            label="Net Worth"
            value={formatMoney(netWorth)}
            valueColor="amber"
            trend="up"
            sparkline={[{value:40},{value:45},{value:42},{value:50},{value:55},{value:52},{value:60}]}
          />
          <StatChip
            label="Cash in Hand"
            value={formatMoney(playerCash)}
            valueColor="green"
            trend="up"
            sparkline={[{value:10},{value:15},{value:12},{value:20},{value:18},{value:25},{value:30}]}
          />
          {company && (
            <StatChip
              label="Company Cash"
              value={formatMoney(company.companyCash ?? 0)}
              valueColor="amber"
              trend={Number(company.companyCash || 0) > 0 ? "up" : "flat"}
              sparkline={[{value:5},{value:8},{value:7},{value:12},{value:10},{value:15},{value:18}]}
            />
          )}
        </div>

        {/* Right: time control */}
        <div className="flex items-center gap-3">
          <WorldTimeControl />
        </div>
      </header>

      {/* ── Page Title ── */}
      <div className="flex items-center gap-2.5 px-4 md:px-6 pt-3.5 pb-1.5 shrink-0">
        <h1 className="font-serif text-lg font-bold text-zinc-100 m-0">Business</h1>
        {company && <Badge variant="green" dot>{company.sector === 'manufacturing' ? 'Manufacturing' : 'Logistics'}</Badge>}
      </div>

      {/* ── Subtabs & Breadcrumbs ── */}
      <div className="px-4 md:px-6 border-b border-zinc-800 shrink-0">
        {/* Dynamic Breadcrumbs */}
        <div className="flex gap-2 pt-2.5 pb-1 text-[10px] font-mono uppercase tracking-[0.1em] text-zinc-600">
          <span className={`cursor-pointer transition-colors ${activeTab === 'overview' ? 'text-terminal-amber' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => { setActiveTab('overview'); setSelectedCompanyId(null); }}>Business Desk</span>
          {activeTab === 'companies' && (
            <>
              <span>→</span>
              <span className={`cursor-pointer transition-colors ${!selectedCompanyId ? 'text-terminal-amber' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => setSelectedCompanyId(null)}>My Companies</span>
            </>
          )}
          {activeTab === 'companies' && selectedCompanyId && company && (
            <>
              <span>→</span>
              <span className="text-terminal-amber">{company.name}</span>
            </>
          )}
        </div>

        {/* Subtabs */}
        {!(activeTab === 'companies' && selectedCompanyId) && (
          <div className="mt-4">
            <Tabs
              tabs={SUB_TABS.map(t => ({
                id: t.id,
                label: t.label,
                locked: t.requiresCompany && !company,
              }))}
              activeId={activeTab}
              onChange={(id: string) => {
                setActiveTab(id as SubTab);
                if (id !== 'companies') setSelectedCompanyId(null);
              }}
            />
          </div>
        )}
      </div>

      {/* ── Back / Breadcrumb Navigation (Anchors) ── */}
      <div className="px-4 md:px-6 pt-2 shrink-0">
        {activeTab === 'companies' && selectedCompanyId && company && (
          <span className="cursor-pointer text-terminal-amber hover:text-zinc-100 text-[11px] font-mono uppercase tracking-[0.1em] transition-colors" onClick={() => setSelectedCompanyId(null)}>
            ← Back to Companies
          </span>
        )}
        {activeTab === 'start' && (
          <span className="cursor-pointer text-terminal-amber hover:text-zinc-100 text-[11px] font-mono uppercase tracking-[0.1em] transition-colors" onClick={() => { setActiveTab('overview'); setStep(1); }}>
            ← Back to Business Overview
          </span>
        )}
        {activeTab === 'registry' && (
          <span className="cursor-pointer text-terminal-amber hover:text-zinc-100 text-[11px] font-mono uppercase tracking-[0.1em] transition-colors" onClick={() => setActiveTab('overview')}>
            ← Back to Overview
          </span>
        )}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto animate-slide-in">
        {activeTab === 'overview'  && <PageShell className="py-6"><OverviewTab company={company} playerCash={playerCash} netWorth={netWorth} onStartBusiness={() => setActiveTab('start')} onViewContracts={() => { setActiveTab('companies'); setSelectedCompanyId(null); }} onViewRegistry={() => setActiveTab('registry')} /></PageShell>}
        {activeTab === 'start'     && <PageShell className="py-6"><StartBusinessTab step={step} setStep={setStep} selectedSector={selectedSector} setSelectedSector={setSelectedSector} selectedHQ={selectedHQ} setSelectedHQ={setSelectedHQ} companyNameInput={companyNameInput} setCompanyNameInput={setCompanyNameInput} nameError={nameError} setNameError={setNameError} startError={startError} playerCash={playerCash} company={company} financeCompany={financeCompany} onRegister={handleRegisterCompany} checkName={checkName} chosenCapital={chosenCapital} setChosenCapital={setChosenCapital} selectedStructure={selectedStructure} setSelectedStructure={setSelectedStructure} selectedModel={selectedModel} setSelectedModel={setSelectedModel} isSubmitting={isSubmitting} /></PageShell>}
        
        {activeTab === 'companies' && (
            <div>
              {/* Finance firm selected → Capital Partners desk */}
              {selectedCompanyId && financeCompany && selectedCompanyId === financeCompany.id ? (
                <CapitalPartnersDeskTab
                  firmId={financeCompany.id}
                  firmName={financeCompany.name}
                  playerCash={playerCash}
                  onRefresh={refreshAll}
                />
              ) : selectedCompanyId && company ? (
                <div>
                  {/* Detailed company view could go here, but usually it delegates to ManufacturingDeskTab */}
                  {company.sector === 'manufacturing' || company.sectorId === 'manufacturing' ? (
                    <ManufacturingDeskTab
                      company={company}
                      mfgData={mfgData}
                      playerCash={playerCash}
                      characterName={characterName}
                      onRefresh={refreshAll}
                      isAdmin={isAdmin}
                    />
                  ) : (
                    <CompanyDeskTab 
                      company={company} 
                      fleet={fleet} 
                      ledger={ledger}
                      contracts={contracts} 
                      playerCash={playerCash}
                      onRefresh={loadData}
                      characterName={characterName}
                      isAdmin={isAdmin}
                    />
                  )}
                </div>
              ) : (
                <PageShell className="py-6">
                  <div className="mt-4 flex flex-col gap-3">
                    {company && (
                      <Card
                        pad="md"
                        hover
                        className="flex items-center justify-between gap-4 cursor-pointer"
                        onClick={() => setSelectedCompanyId(company.id)}
                      >
                        <div>
                          <div className="text-sm font-bold text-zinc-100">{company.name}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            {company.sectorId === 'shipping-logistics' || company.sector === 'shipping-logistics' ? 'Logistics' : 'Manufacturing'}
                            {' • '}
                            {getStateName(company.headquartersStateId || company.state)}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" iconRight={ArrowRight}>
                          Manage
                        </Button>
                      </Card>
                    )}
                    {financeCompany && (
                      <Card
                        pad="md"
                        hover
                        className="flex items-center justify-between gap-4 cursor-pointer"
                        onClick={() => setSelectedCompanyId(financeCompany.id)}
                      >
                        <div>
                          <div className="text-sm font-bold text-zinc-100">{financeCompany.name}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            Capital Partners Firm · Finance
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" iconRight={ArrowRight}>
                          Portfolio
                        </Button>
                      </Card>
                    )}
                    {!company && !financeCompany && (
                      <div className="text-zinc-600 text-xs">No companies registered.</div>
                    )}
                  </div>
                </PageShell>
              )}
            </div>
          )}

        
        
        {activeTab === 'analytics' && (
          company ? (
            <AnalyticsDashboard companyId={company.id} countryId={(company as any).country_id || company.countryId || 'drennia'} />
          ) : (
            <PageShell className="py-6">
              <div className="text-zinc-600 text-xs">Register a company to access market analytics.</div>
            </PageShell>
          )
        )}
        {activeTab === 'exchange' && <PageShell className="py-6"><DrennportExchangeTab /></PageShell>}
        {activeTab === 'registry'  && <PageShell className="py-6"><RegistryTab key={registryKey} company={company} onRefresh={() => setRegistryKey(k => k + 1)} /></PageShell>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ���────────────────────────────────────────────────────────────────────────────
function OverviewTab({ company, playerCash, netWorth, onStartBusiness, onViewContracts, onViewRegistry }: {
  company: Company | null; playerCash: number; netWorth: number;
  onStartBusiness: () => void; onViewContracts: () => void; onViewRegistry: () => void;
}) {
  if (!company) {
    return (
      <div className="max-w-4xl flex flex-col gap-6">
        {/* Hero */}
        <Card pad="lg" accent className="relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={12} className="text-terminal-amber" />
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-terminal-amber">
              Drennia Commercial Registry
            </span>
          </div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-zinc-100 text-balance mb-2">
            The registry is open. Build your enterprise.
          </h2>
          <p className="text-[13px] leading-relaxed text-zinc-400 max-w-xl mb-6">
            Register a company with a minimum of <span className="text-terminal-amber font-mono font-semibold">$50,000</span> starting
            capital — no maximum. Choose your sector, headquarters, and legal structure, then start winning contracts.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="primary" size="lg" iconRight={ArrowRight} onClick={onStartBusiness}>
              Start a Business
            </Button>
            <Button variant="ghost" size="lg" icon={ScrollText} onClick={onViewRegistry}>
              Browse Public Registry
            </Button>
          </div>
        </Card>

        {/* How it works */}
        <div>
          <SectionHeading icon={FileText}>How It Works</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: '01', title: 'Register', desc: 'Pick a sector, headquarters state, and legal structure. File with the registry and commit your starting capital.', icon: Building2 },
              { step: '02', title: 'Operate', desc: 'Win contracts, hire staff, buy vehicles and facilities. Manage cash flow month to month.', icon: Briefcase },
              { step: '03', title: 'Grow', desc: 'Build reputation and reliability. Scale toward the Drennport Exchange and public markets.', icon: TrendingUp },
            ].map(item => (
              <Card key={item.step} pad="md" hover className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <item.icon size={16} className="text-terminal-amber" />
                  <span className="text-[10px] font-mono text-zinc-600 tracking-[0.2em]">{item.step}</span>
                </div>
                <h3 className="text-[13px] font-semibold text-zinc-100">{item.title}</h3>
                <p className="text-[11px] leading-relaxed text-zinc-500">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Legal structures */}
        <div>
          <SectionHeading icon={Scale} stamp="ALL ACTIVE">Legal Structures</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Sole Trader', fee: '$500', desc: 'Simplest structure. Full ownership, full liability, lowest filing cost.' },
              { name: 'Private Company', fee: '$5,000', desc: 'Separate legal entity. Add partners and issue private shares.' },
              { name: 'Corporation', fee: '$50,000', desc: 'Full liability protection. Required for public trading.' },
            ].map(s => (
              <Card key={s.name} pad="md" hover className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[13px] font-semibold text-zinc-100">{s.name}</h3>
                  <span className="text-[11px] font-mono font-semibold text-terminal-amber shrink-0">{s.fee}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-500">{s.desc}</p>
                <span className="mt-1 text-[9px] font-mono uppercase tracking-[0.12em] text-terminal-green">● Available</span>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl flex flex-col gap-6">
      {/* Key stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Company Cash"
          value={formatMoney(company.companyCash ?? 0)}
          valueColor="green"
          trend={Number(company.companyCash || 0) > 0 ? 'up' : 'flat'}
        />
        <StatCard
          label="Debt"
          value={formatMoney(company.debt ?? 0)}
          valueColor={(company.debt ?? 0) > 0 ? 'red' : 'white'}
          trend={(company.debt ?? 0) > 0 ? 'down' : 'flat'}
        />
        <StatCard
          label="Net Worth (Total)"
          value={formatMoney(netWorth)}
          valueColor="amber"
          trend="up"
        />
        <StatCard
          label="Reputation"
          value={company.reputation}
          valueColor="white"
        />
      </div>

      {/* Company file + financial position */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          kicker="Company File"
          icon={Building2}
          title={company.name}
          headerSlot={<Badge variant="green" dot>{company.status}</Badge>}
        >
          <DataRow label="Structure" value={getLegalStructureName(company.legalStructure)} />
          <DataRow label="Sector" value={getSectorName(company.sectorId) || getSectorName(company.sector) || 'N/A'} />
          {company.subsector && <DataRow label="Subsector" value={getSubsectorName(company.subsector) || 'N/A'} />}
          <DataRow label="HQ State" value={getStateName(company.headquartersStateId) || getStateName(company.state) || 'N/A'} />
          {company.operatingModel && !company.subsector && <DataRow label="Operating Model" value={company.operatingModel} valueVariant="amber" />}
          <DataRow label="Reputation" value={company.reputation} valueVariant="amber" />
          <DataRow label="Reliability" value={company.reliability} border={false} />
        </Card>

        <div className="flex flex-col gap-4">
          <Card kicker="Ledger" icon={Wallet} title="Financial Position">
            <DataRow label="Company Cash" value={formatMoney(company.companyCash ?? 0)} valueVariant="green" />
            <DataRow label="Debt" value={formatMoney(company.debt ?? 0)} valueVariant={(company.debt ?? 0) > 0 ? 'red' : 'muted'} />
            <DataRow label="Net Worth (total)" value={formatMoney(netWorth)} valueVariant="amber" border={false} />
          </Card>

          <Card kicker="Quick Actions" icon={ArrowRight} title="Where to next?">
            <div className="flex flex-col gap-2">
              <Button variant="secondary" fullWidth icon={Briefcase} iconRight={ArrowRight} onClick={onViewContracts}>
                Manage Company
              </Button>
              <Button variant="ghost" fullWidth icon={ScrollText} onClick={onViewRegistry}>
                Public Registry
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// START BUSINESS TAB
// ───────────────────────���─────────────────────────────────────────────────────
function StartBusinessTab({ step, setStep, selectedSector, setSelectedSector, selectedHQ, setSelectedHQ, companyNameInput, setCompanyNameInput, nameError, setNameError, startError, playerCash, company, financeCompany, onRegister, checkName, chosenCapital, setChosenCapital, selectedStructure, setSelectedStructure, selectedModel, setSelectedModel, isSubmitting }: any) {
  const isLogistics = selectedSector === 'Shipping & Logistics';
  const isFinance   = selectedSector === 'Finance & Services';

  // Player already has BOTH slots filled — fully block
  if (company && financeCompany) {
    return (
      <div className="max-w-[540px] rounded-md border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-terminal-amber font-bold mb-4">Both Company Slots Filled</div>
        <p className="text-[13px] text-zinc-500 leading-relaxed m-0">
          You have <strong className="text-zinc-100">{company.name}</strong> (operational) and <strong className="text-zinc-100">{financeCompany.name}</strong> (Capital Partners). No additional company slots are available in pre-alpha.
        </p>
      </div>
    );
  }

  // Player has an operational company but no finance firm yet — Finance slot is available
  const financeSlotOnly = !!company && !financeCompany;

  // Auto-select Finance & Services and reset capital when only that slot is open
  useEffect(() => {
    if (financeSlotOnly && selectedSector !== 'Finance & Services') {
      setSelectedSector('Finance & Services');
      setChosenCapital(50000);
    }
  }, [financeSlotOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const STEP_LABELS = isFinance
    ? ['Sector', 'Headquarters', 'Company Name', 'Starting Capital', 'Confirm Filing']
    : ['Sector', 'Headquarters', 'Structure', 'Company Name', 'Starting Capital', isLogistics ? 'Operating Model' : 'Subsector', 'Confirm Filing'];
  const FILING_FEE = 5000; // Finance firms are always private-company: $5,000 filing fee
  const effectiveFee = isFinance ? FILING_FEE : (selectedStructure === 'sole-trader' ? 500 : selectedStructure === 'private-company' ? 5000 : 50000);
  const total = chosenCapital + effectiveFee;
  const canAfford = playerCash >= total;
  const totalCost = effectiveFee + chosenCapital;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-10 h-full items-start">
      <div className="flex flex-col overflow-y-auto">
        <div className="max-w-[620px]">
          {/* Stepper */}
      <div className="flex mb-7 border-b border-zinc-800">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const done = step > stepNum;
          const active = step === stepNum;
          return (
            <div key={label} className={`flex-1 px-1 pt-2 pb-2.5 text-center border-b-2 -mb-px transition-colors ${active ? 'border-terminal-amber' : 'border-transparent'}`}>
              <div className={`text-[8px] font-mono uppercase tracking-[0.08em] ${done ? 'text-terminal-green' : active ? 'text-terminal-amber' : 'text-zinc-600'}`}>
                {done ? '✓' : stepNum}. {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1 — Sector */}
      {step === 1 && (
        <div>
          <SectionHeader stamp="STEP 1 OF 7">Select Your Sector</SectionHeader>
          {financeSlotOnly ? (
            <div className="mb-4 rounded-md border border-terminal-amber/40 bg-terminal-amber/5 px-4 py-3">
              <div className="text-[10px] font-mono text-terminal-amber uppercase tracking-[0.15em] font-bold mb-1">Second Slot — Finance Only</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed m-0">
                You already operate <strong className="text-zinc-100">{company.name}</strong>. Your second slot is reserved for a <strong className="text-zinc-100">Capital Partners firm</strong>. Only Finance &amp; Services is available.
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
              <strong className="text-terminal-amber">Shipping &amp; Logistics</strong> and <strong className="text-terminal-amber">Manufacturing</strong> are available in the current version. Other sectors are coming soon.
            </p>
          )}
          <div className="flex flex-col gap-2 mb-6">
            {SECTORS.map(s => {
              // When the player only has the finance slot left, lock everything except Finance & Services
              const locked = financeSlotOnly ? s.id !== 'Finance & Services' : !s.available;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    if (locked) return;
                    setSelectedSector(s.id);
                    // Reset capital to the correct minimum for this sector
                    if (s.id === 'Finance & Services') setChosenCapital(50000);
                    else if (s.id === 'Manufacturing') setChosenCapital(500000);
                    else setChosenCapital(50000);
                  }}
                  disabled={locked}
                  className={`rounded-md border px-4 py-3.5 text-left transition-colors ${
                    selectedSector === s.id
                      ? 'border-terminal-amber bg-terminal-amber/10'
                      : 'border-zinc-800 bg-zinc-900/40'
                  } ${!locked ? 'cursor-pointer hover:border-zinc-600' : 'cursor-not-allowed opacity-40'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[13px] font-semibold ${!locked ? 'text-zinc-100' : 'text-zinc-600'}`}>{s.id}</span>
                    {locked && <span className="text-[9px] font-mono text-zinc-600 tracking-[0.1em]">{financeSlotOnly ? 'SLOT TAKEN' : ((s as any).note || 'LOCKED')}</span>}
                    {selectedSector === s.id && <span className="text-[9px] font-mono text-terminal-amber tracking-[0.1em]">SELECTED ✓</span>}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">{s.desc}</div>
                </button>
              );
            })}
          </div>
          <GoldButton onClick={() => setStep(2)} disabled={!selectedSector}>Next: Headquarters →</GoldButton>
        </div>
      )}

      {/* Step 2 — HQ */}
      {step === 2 && (
        <div>
          <SectionHeader stamp="STEP 2 OF 7">Headquarters Location</SectionHeader>
          <p className="text-xs text-zinc-500 mb-5 leading-relaxed">Your HQ state affects operating costs, contract access, and market exposure.</p>
          <div className="flex flex-col gap-2.5 mb-6">
            {HQ_OPTIONS.map(hq => (
              <button
                key={hq.id}
                onClick={() => setSelectedHQ(hq.id)}
                className={`rounded-md border px-4 py-4 text-left cursor-pointer transition-colors ${
                  selectedHQ === hq.id
                    ? 'border-terminal-amber bg-terminal-amber/10'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-bold text-zinc-100">{hq.city}</span>
                    <span className="text-[10px] text-zinc-500 ml-2.5">{hq.tagline}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono" style={{ color: hq.costColor }}>{hq.costNote}</span>
                    {selectedHQ === hq.id && <span className="text-[9px] font-mono text-terminal-amber">✓</span>}
                  </div>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{hq.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2.5">
            <GhostButton onClick={() => setStep(1)}>← Back</GhostButton>
            <GoldButton onClick={() => setStep(isFinance ? 4 : 3)} disabled={!selectedHQ}>Next: {isFinance ? 'Company Name' : 'Structure'} →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 3 — Structure (skipped for Finance) */}
      {step === 3 && !isFinance && (
        <div>
          <SectionHeader stamp="STEP 3 OF 7">Legal Structure</SectionHeader>
          <div className="flex flex-col gap-2 mb-6">
            {[
              { id: 'sole-trader', label: 'Sole Trader', desc: 'Simplest structure. Full ownership, full liability, lowest filing cost ($500).' },
              { id: 'private-company', label: 'Private Company', desc: 'Separate legal entity. Can add partners and issue shares ($5,000).' },
              { id: 'public-corporation', label: 'Corporation', desc: 'Full liability protection. Required for public trading ($50,000).' },
            ].map(s => (
              <button
                key={s.label}
                onClick={() => setSelectedStructure(s.id)}
                className={`w-full rounded-md border px-4 py-3.5 text-left cursor-pointer transition-colors ${
                  selectedStructure === s.id
                    ? 'border-terminal-amber bg-terminal-amber/10'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-600'
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span className="text-[13px] font-semibold text-zinc-100">{s.label}</span>
                  {selectedStructure === s.id && <span className="text-[9px] font-mono text-terminal-amber">ACTIVE ✓</span>}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">{s.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2.5">
            <GhostButton onClick={() => setStep(isFinance ? 2 : 3)}>← Back</GhostButton>
            <GoldButton onClick={() => setStep(4)} disabled={!selectedStructure}>Next: Name →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 4 — Name */}
      {step === 4 && (
        <div>
          <SectionHeader stamp="STEP 4 OF 7">Company Name</SectionHeader>
          <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
            This becomes your permanent business identity in Drennia. Names are public and cannot be reused.
          </p>
          <div className="mb-5">
            <Label>Company Name</Label>
            <input
              type="text"
              value={companyNameInput}
              onChange={e => { setCompanyNameInput(e.target.value); setNameError(''); }}
              placeholder="e.g. Vane & Sons Freight Co."
              className={`w-full rounded-md border bg-zinc-900 px-4 py-3 text-sm font-serif text-zinc-100 outline-none box-border transition-colors placeholder:text-zinc-600 ${
                nameError ? 'border-terminal-red' : 'border-zinc-800 focus:border-terminal-amber/60'
              }`}
            />
            {nameError && <div className="text-[11px] text-terminal-red mt-1.5">{nameError}</div>}
          </div>
          <div className="flex gap-2.5">
            <GhostButton onClick={() => setStep(3)}>← Back</GhostButton>
            <GoldButton onClick={() => { if (checkName()) setStep(5); }}>Check & Continue →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 5 — Starting Capital */}
      {step === 5 && (
        <div>
          <SectionHeader stamp="STEP 5 OF 7">Starting Capital</SectionHeader>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-5 mb-4">
            <FieldRow label="Company Name" value={companyNameInput} />
            <FieldRow label="Sector" value={selectedSector} />
            <FieldRow label="HQ State" value={HQ_OPTIONS.find(h => h.id === selectedHQ)?.city || selectedHQ} />
            {!isFinance && <FieldRow label="Legal Structure" value={getLegalStructureName(selectedStructure)} />}
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-5 mb-6">
            <SectionHeader>Starting Capital</SectionHeader>
            <p className="text-xs text-zinc-500 leading-relaxed mb-4">
              Minimum: <strong className="text-terminal-amber">{formatMoney(isFinance ? 50000 : selectedSector === 'Manufacturing' ? 500000 : 50000)}</strong>. No maximum — invest as much as your Cash in Hand allows, minus the filing fee ({isFinance ? 'Private Company' : getLegalStructureName(selectedStructure)} fee: <strong className="text-terminal-red">{formatMoney(effectiveFee)}</strong>).
            </p>
            <div className="mb-4">
              <Label>Company Starting Capital ($)</Label>
              <input
                type="number"
                min={isFinance ? 50000 : selectedSector === 'Manufacturing' ? 500000 : 50000}
                step={10000}
                value={chosenCapital}
                onChange={e => {
                  const minCap = isFinance ? 50000 : selectedSector === 'Manufacturing' ? 500000 : 50000;
                  const v = parseInt(e.target.value) || minCap;
                  setChosenCapital(Math.max(minCap, v));
                }}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3 text-base font-mono font-bold text-terminal-green outline-none box-border focus:border-terminal-amber/60 transition-colors"
              />
            </div>
            <FieldRow label="Chosen Capital" value={formatMoney(chosenCapital)} valueColor="#30d158" />
            <FieldRow label={`Filing Fee (${isFinance ? 'Private Company' : getLegalStructureName(selectedStructure)})`} value={formatMoney(effectiveFee)} valueColor="#ff453a" />
            <div className="flex justify-between mt-3 pt-2.5 border-t border-zinc-800">
              <span className="text-xs font-bold text-zinc-100">Total Required</span>
              <span className="text-base font-mono font-bold text-terminal-amber">{formatMoney(total)}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[11px] text-zinc-500">Your Cash in Hand</span>
              <span className={`text-[13px] font-mono ${canAfford ? 'text-terminal-green' : 'text-terminal-red'}`}>{formatMoney(playerCash)}</span>
            </div>
            {!canAfford && (
              <div className="text-[11px] text-terminal-red mt-3 rounded-md border border-terminal-red/50 bg-terminal-red/10 p-2">
                ⚠ Insufficient cash. You need {formatMoney(total - playerCash)} more.
              </div>
            )}
          </div>
          <div className="flex gap-2.5">
            <GhostButton onClick={() => setStep(isFinance ? 3 : 4)}>← Back</GhostButton>
            <GoldButton
              onClick={() => setStep(isFinance ? 7 : 6)}
              disabled={!canAfford || chosenCapital < (isFinance ? 50000 : selectedSector === 'Manufacturing' ? 500000 : 50000)}
            >{isFinance ? 'Next: Confirm Filing →' : 'Next: Operating Model →'}</GoldButton>
          </div>
        </div>
      )}

      {/* Step 6 — Operating Model / Subsector (skipped for Finance) */}
      {step === 6 && !isFinance && (
        <div>
          <SectionHeader stamp="STEP 6 OF 7">{isLogistics ? 'Select Operating Model' : 'Select Manufacturing Subsector'}</SectionHeader>
          <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
            {isLogistics 
              ? "Choose your company's initial logistics operating model. This shapes your career trajectory, suggested contracts, and unlocks tailored equipment."
              : "Choose your primary manufacturing subsector. This unlocks specific blueprints, materials, and facility types."}
          </p>
          <div className="flex flex-col gap-2.5 mb-6">
            {isLogistics ? [
              { id: 'Local Courier Operator', title: 'Local Courier Operator', desc: 'Small local delivery, office errands, shop movement. Best for Drennport or Greenmere. Good with Used Delivery Van.', available: true },
              { id: 'Port Shuttle Operator', title: 'Port Shuttle Operator', desc: 'Dock, warehouse, and container-adjacent movement. Best for Westport. Good with Used Delivery Van or Box Truck.', available: true },
              { id: 'Interstate Freight Beginner', title: 'Interstate Freight Beginner', desc: 'State-to-state freight. Best after owning Box Truck. Higher pay, more wear.', available: true },
              { id: 'Industrial Parts Carrier', title: 'Industrial Parts Carrier', desc: 'Factory parts and industrial supply. Best for Ironvale. Needs Box Truck or Freight Truck.', available: true }
            ].map(model => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id as any)}
                disabled={!model.available}
                className={`rounded-md border px-4 py-4 text-left transition-colors ${
                  selectedModel === model.id
                    ? 'border-terminal-amber bg-terminal-amber/10'
                    : 'border-zinc-800 bg-zinc-900/40'
                } ${model.available ? 'cursor-pointer hover:border-zinc-600' : 'cursor-not-allowed opacity-40'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-zinc-100">{model.title}</span>
                  {selectedModel === model.id && <span className="text-[9px] font-mono text-terminal-amber">SELECTED ✓</span>}
                  {!model.available && <span className="text-[9px] font-mono text-zinc-600">COMING SOON</span>}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1 leading-normal">{model.desc}</div>
              </button>
            )) : [
              { id: 'automobile-manufacturing', title: 'Automobile Manufacturing', desc: 'Design and mass-produce consumer vehicles, trucks, and specialist transports.', available: true },
              { id: 'electronics-manufacturing', title: 'Electronics Manufacturing', desc: 'Computers, appliances, and high-tech components.', available: false },
              { id: 'aircraft-manufacturing', title: 'Aircraft Manufacturing', desc: 'Commercial jets and aviation components.', available: false },
              { id: 'shipbuilding', title: 'Shipbuilding', desc: 'Vessels for deep sea freight and coastal transport.', available: false },
              { id: 'heavy-machinery', title: 'Heavy Machinery', desc: 'Mining, agricultural, and industrial equipment.', available: false },
              { id: 'consumer-goods', title: 'Consumer Goods', desc: 'Everyday household items and clothing.', available: false },
              { id: 'steel-and-materials', title: 'Steel and Materials', desc: 'Refined metals, synthetics, and construction supplies.', available: false },
              { id: 'energy-equipment', title: 'Energy Equipment', desc: 'Generators, turbines, and grid hardware.', available: false }
            ].map(model => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id as any)}
                disabled={!model.available}
                className={`rounded-md border px-4 py-4 text-left transition-colors ${
                  selectedModel === model.id
                    ? 'border-terminal-amber bg-terminal-amber/10'
                    : 'border-zinc-800 bg-zinc-900/40'
                } ${model.available ? 'cursor-pointer hover:border-zinc-600' : 'cursor-not-allowed opacity-40'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-zinc-100">{model.title}</span>
                  {selectedModel === model.id && <span className="text-[9px] font-mono text-terminal-amber">SELECTED ✓</span>}
                  {!model.available && <span className="text-[9px] font-mono text-zinc-600">COMING SOON</span>}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1 leading-normal">{model.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2.5">
            <GhostButton onClick={() => setStep(5)}>← Back</GhostButton>
            <GoldButton onClick={() => setStep(7)} disabled={!selectedModel}>Next: Confirm Filing →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 7 — Confirm */}
      {step === 7 && (
        <div>
          <SectionHeader stamp="STEP 7 OF 7">Confirm Filing</SectionHeader>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-5 mb-5">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-terminal-amber mb-4">
              ◈ Drennia Commercial Registry — Filing Confirmation
            </div>
            <FieldRow label="Company Name" value={companyNameInput} />
            <FieldRow label="Legal Structure" value={isFinance ? 'Private Company' : selectedStructure === 'sole-trader' ? 'Sole Trader' : selectedStructure === 'private-company' ? 'Private Company' : 'Corporation'} />

            <FieldRow label="Sector" value={selectedSector} />
            <FieldRow label="Headquarters" value={HQ_OPTIONS.find(h => h.id === selectedHQ)?.city || selectedHQ} />
            {!isFinance && (
              <FieldRow label={isLogistics ? "Operating Model" : "Subsector"} value={isLogistics ? selectedModel : getSubsectorName(selectedModel)} valueColor="#f5a623" />
            )}
            <FieldRow label="Filing Date" value={formatGameDate()} />
            <FieldRow label="Capital Filed" value={formatMoney(chosenCapital)} valueColor="#30d158" />
            <FieldRow label="Filing Fee" value={formatMoney(effectiveFee)} valueColor="#ff453a" />
            <FieldRow label="Total Deducted from Cash" value={formatMoney(total)} valueColor="#f5a623" />
          </div>
          <p className="text-[11px] text-zinc-500 mb-5 leading-relaxed">
            By confirming, this filing becomes a permanent public record in the Drennia Commercial Registry.
          </p>
          {startError && <div className="text-[11px] text-terminal-red mb-4 rounded-md border border-terminal-red/50 bg-terminal-red/10 p-2.5">{startError}</div>}
          <div className="flex gap-2.5">
            <GhostButton onClick={() => setStep(isFinance ? 5 : 6)} disabled={isSubmitting}>← Back</GhostButton>
            <GoldButton onClick={onRegister} disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : '◈ Confirm Filing & Register'}
            </GoldButton>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Right Rail - Filing Summary */}
      <div className="lg:border-l border-t lg:border-t-0 border-zinc-800 lg:pl-6 pt-6 lg:pt-0 flex flex-col gap-1">
        <div className="text-xs font-mono uppercase tracking-[0.15em] text-terminal-amber border-b border-zinc-800 pb-2 mb-3">
          Filing Summary
        </div>
        <FieldRow label="Company Name" value={companyNameInput || 'TBD'} />
        <FieldRow label="Legal Structure" value={isFinance ? 'Private Company' : selectedStructure === 'sole-trader' ? 'Sole Trader' : selectedStructure === 'private-company' ? 'Private Company' : 'Corporation'} />

        <FieldRow label="Sector" value={selectedSector || 'TBD'} />
        <FieldRow label="Headquarters" value={HQ_OPTIONS.find(h => h.id === selectedHQ)?.city || selectedHQ || 'TBD'} />
        {!isFinance && (
          <FieldRow label={isLogistics ? "Operating Model" : "Subsector"} value={selectedModel ? (isLogistics ? selectedModel : getSubsectorName(selectedModel)) : 'TBD'} valueColor="#f5a623" />
        )}
        <FieldRow label="Capital Filed" value={formatMoney(chosenCapital)} valueColor="#30d158" />
        <FieldRow label="Total Cost" value={formatMoney(totalCost)} valueColor="#ff453a" />
        <FieldRow label="Remaining Cash" value={formatMoney(playerCash - totalCost)} />
        {isFinance ? (
          <div className="mt-5 rounded-md border border-dashed border-terminal-amber/60 bg-terminal-amber/5 p-4">
            <div className="text-[10px] font-mono text-terminal-amber uppercase tracking-[0.08em] mb-2">Next Steps</div>
            <div className="text-[11px] text-zinc-200 leading-normal">After filing, fund your firm via <strong>Fund Firm</strong>, then buy shares on the <strong>DRX Bourse</strong> to start earning dividends each arc.</div>
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-dashed border-terminal-green/60 bg-terminal-green/5 p-4">
            <div className="text-[10px] font-mono text-terminal-green uppercase tracking-[0.08em] mb-2">Recommendation</div>
            <div className="text-[11px] text-zinc-200 leading-normal">After filing, your first step should be to visit the Procurement desk to acquire your first operational asset: {selectedModel === 'Port Shuttle Operator' || selectedModel === 'Local Courier Operator' ? 'Used Delivery Van' : 'Box Truck'}.</div>
          </div>
        )}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────���───────────────────
// ─────────────────────────────────────────────────────────────────────────────
// COMPANY DESK TAB (Shipping & Logistics)
// ─────────────────────────────────────────────────────────────────────────────
type CompanyDeskTab = 'overview' | 'operations' | 'staff' | 'contracts' | 'procurement' | 'facilities' | 'assets' | 'fleet' | 'routes' | 'finance' | 'contractHistory' | 'records' | 'equity';

function CompanyDeskTab({ 
  company, 
  fleet, 
  ledger, 
  contracts, 
  playerCash, 
  characterName, 
  onRefresh, 
  isAdmin 
}: {
  company: Company; fleet: Vehicle[]; ledger: any[]; contracts: Contract[]; playerCash: number; characterName: string;
  onRefresh: () => void; isAdmin: boolean;
}) {
  const [deskTab, setDeskTab] = useState<CompanyDeskTab>('overview');
  const [fleetSubTab, setFleetSubTab] = useState<'current' | 'procurement' | 'market' | 'locked'>('current');
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);
  const [contractFilter, setContractFilter] = useState<ContractSourceFilter>('All');
  const [contractSearch, setContractSearch] = useState<string>('');
  const [procurementSubTab, setProcurementSubTab] = useState<'vehicles'|'used'|'facilities'|'equipment'|'materials'|'suppliers'>('vehicles');

  const [routeFilter, setRouteFilter] = useState<RouteFilter>('All');
  const [financeSubTab, setFinanceSubTab] = useState<'overview' | 'monthly' | 'history' | 'charts' | 'ledger'>('overview');
  
  // Derive financeHistory and lastMonthlyReport from ledger
  const months = new Map<string, any>();
  if (ledger && Array.isArray(ledger)) {
    // Ledger is ordered by created_at desc, so we need to process in reverse if we want chronological order,
    // but building the map is fine either way.
    ledger.forEach((entry: any) => {
      const key = formatWorldDate(entry.game_year, entry.game_month);
      if (!months.has(key)) {
        months.set(key, { 
          id: key, 
          label: key, 
          netProfit: 0, 
          gameDateStr: key,
          autoRevenue: 0,
          manualRevenue: 0,
          operatingCosts: 0,
          payrollExpense: 0,
          totalMaintenance: 0,
          facilityLeaseExpense: 0,
          penalties: 0,
          totalOperatingRevenue: 0,
          totalOperatingExpenses: 0,
          endingCash: 0,
          capex: 0
        });
      }
      const month = months.get(key)!;
      const amt = Number(entry.amount);
      const type = entry.entry_type;

      // Ignore equity/capital movements from Operating Profit/Loss
      if (['Capital Injection', 'Capital Withdrawal', 'Shares Issued'].includes(type)) {
        // Do nothing for P&L
      } else if (type === 'Asset Purchase') {
        // Capex is not an operating expense
        month.capex += Math.abs(amt);
      } else if (amt > 0) {
        // Operating Income
        if (type === 'Revenue') month.autoRevenue += amt;
        else month.manualRevenue += amt;
        
        month.totalOperatingRevenue += amt;
        month.netProfit += amt;
      } else {
        // Operating Expenses
        const absAmt = Math.abs(amt);
        if (type === 'Vehicle Maintenance' || (type === 'Expense' && entry.description?.toLowerCase().includes('maintenance'))) {
          month.totalMaintenance += absAmt;
        } else if (type === 'Payroll') {
          month.payrollExpense += absAmt;
        } else if (type === 'Facility Lease' || (type === 'Expense' && entry.description?.toLowerCase().includes('lease'))) {
          month.facilityLeaseExpense += absAmt;
        } else if (type === 'Expense' && entry.description?.toLowerCase().includes('penalty')) {
          month.penalties += absAmt;
        }
        
        month.operatingCosts += absAmt;
        month.totalOperatingExpenses += absAmt;
        month.netProfit -= absAmt;
      }
      
      // track ending cash as the balance_after of the earliest entry processed for this month (since it's ordered desc)
      // Actually, since it's ordered desc, the FIRST entry we see for a month is the LATEST entry chronologically.
      // So we only set endingCash if it's not set yet.
      if (entry.balance_after !== undefined && entry.balance_after !== null && month.endingCash === 0) {
        month.endingCash = Number(entry.balance_after);
      }
    });
  }

  const financeHistory = Array.from(months.values());
  const computedLastReport = financeHistory.length > 0 ? financeHistory[financeHistory.length - 1] : null;

  const showNotif = (msg: string, success: boolean) => {
    setNotification({ msg, success });
    setTimeout(() => setNotification(null), 4000);
  };

  const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [
    { id: 'overview',   label: 'Overview'   },
    { id: 'operations', label: 'Operations' },
    { id: 'staff', label: 'Staff' },
    { id: 'contracts',  label: 'Contracts' },
    { id: 'procurement',label: 'Procurement' },
    { id: 'facilities', label: 'Facilities' },
    { id: 'assets',     label: 'Assets'     },
    { id: 'fleet',      label: 'Fleet'      },
    { id: 'routes',     label: 'Routes'     },
    { id: 'finance',    label: 'Finance'    },
    { id: 'contractHistory', label: 'Contract History' },
    { id: 'records',    label: 'Records'    },
    { id: 'equity',     label: 'Equity'     },
  ];

  const fleetValue = fleet.reduce((acc: any, v: any) => acc + (v.currentValue || Math.round(v.purchaseCost * (v.condition / 100))), 0);
  const companyValue = Number(company.companyCash || 0) + fleetValue - Number(company.debt || 0);
  const netWorth = playerCash + companyValue;
  const activeContracts = contracts.filter(c => (c.status === 'awarded' || c.status === 'active') && c.awardedToCompanyId === company.id);
  const completedContracts = contracts.filter(c => c.status === 'completed');
  const contractHistory = getContractHistory(company.id);
  let records = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
  if (!Array.isArray(records)) records = [];
  const routes = getRouteFamiliarity(company.id);

  const handleBuyVehicle = async (type: string) => {
    try {
      const { logisticsApi } = require('../../../lib/api');
      const proc = await logisticsApi.getProcurement();
      const catalogItem = proc.data.vehicles.find((v: any) => v.type === type);
      
      if (!catalogItem) {
        showNotif('Vehicle not found in catalog', false);
        return;
      }

      await logisticsApi.purchaseVehicle(company.id, catalogItem.id);
      showNotif(`Purchased ${type} successfully.`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Purchase failed', false);
    }
  };

  const handleMaintenance = async (vehicleId: string, level: 'basic' | 'full') => {
    try {
      const { logisticsApi } = await import('../../../lib/api');
      const result = await logisticsApi.performMaintenance(company.id, vehicleId, level);
      showNotif(result.data.message || `Maintenance (${level}) queued.`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Maintenance failed', false);
    }
  };

  const handleAssignVehicle = async (contractId: string, vehicleId: string) => {
    try {
      const result = await logisticsApi.assignVehicleToContract(company.id, contractId, vehicleId);
      showNotif(result.data.message, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Assignment failed', false);
    }
  };
  
  const handleDirectAccept = async (contractId: string, vehicleId: string) => {
    try {
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) throw new Error('Contract not found');
      const result = await logisticsApi.acceptDirectContract(company.id, contractId, contract, vehicleId);
      showNotif(result.data.message, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Acceptance failed', false);
    }
  };

  const handleResolve = async (contractId: string) => {
    try {
      const { logisticsApi } = await import('../../../lib/api');
      const result = await logisticsApi.resolveContract(company.id, contractId, 'completed');
      showNotif(result.data.message || 'Contract resolved.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Resolve failed', false);
    }
  };

  const handleAssignAutoOp = async (vehicleId: string, poolType: string | null) => {
    try {
      let poolId = null;
      if (poolType) {
        const proc = await logisticsApi.getProcurement();
        const pool = proc.data.pools.find((p: any) => p.name === poolType);
        if (!pool) throw new Error('Pool not found');
        poolId = pool.id;
      }
      await logisticsApi.assignOperation(company.id, vehicleId, poolId);
      showNotif('Operation assigned.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Assignment failed', false);
    }
  };



  const handleRunAutoOps = async () => {
    try {
      const res = await logisticsApi.processTest(company.id);
      showNotif(`Test Processed: Net Profit $${res.data.netProfit}`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Processing failed', false);
    }
  };



  // Filter logic
  let filteredContracts = contracts.filter(c => c.status === 'open');
  if (contractSearch) {
    filteredContracts = filteredContracts.filter(c => c.title.toLowerCase().includes(contractSearch.toLowerCase()) || c.issuerName.toLowerCase().includes(contractSearch.toLowerCase()));
  }
  if (contractFilter !== 'All') {
    filteredContracts = filteredContracts.filter(c => c.issuerType === contractFilter);
  }
  return (
    <div style={{ width: '100%' }}>
      {notification && (
        <div style={{ position: 'fixed', top: '70px', right: '24px', zIndex: 9999, padding: '12px 18px', background: notification.success ? 'rgba(20,40,30,0.97)' : 'rgba(40,20,20,0.97)', border: `1px solid ${notification.success ? T.mint : T.red}`, color: notification.success ? T.mint : T.red, fontSize: '12px', lineHeight: 1.6, maxWidth: '340px', boxShadow: '0 4px 24px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          {notification.success ? '✓ ' : '⚠ '}{notification.msg}
        </div>
      )}



      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: `1px solid ${T.border}`, overflowX: 'auto' }}>
        {DESK_TABS.map(tab => {
          const isActive = deskTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setDeskTab(tab.id)} style={{ padding: '8px 14px', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: isActive ? 700 : 500, color: isActive ? T.gold : T.muted, background: 'transparent', border: 'none', borderBottom: isActive ? `2px solid ${T.gold}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {deskTab === 'overview' && (
        <div className="business-content-grid">
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <PanelBox>
                <SectionHeader stamp="COMPANY FILE">Company Details</SectionHeader>
                <FieldRow label="Name" value={company.name} />
                <FieldRow label={company.legalStructure === 'Corporation' || (company.legalStructure as any) === 'public-corporation' ? "Chairperson & CEO" : "Founder & CEO"} value={characterName || 'Unknown'} />
                <FieldRow label="Sector" value={getSectorName(company.sectorId) || getSectorName(company.sector) || 'N/A'} />
                <FieldRow label="HQ" value={getStateName(company.headquartersStateId) || getStateName(company.state) || 'N/A'} />
                <FieldRow label="Status" value={company.status} valueColor={T.mint} />
                <FieldRow label="Reputation" value={company.reputation} valueColor={T.gold} />
                <FieldRow label="Reliability" value={company.reliability} />
              </PanelBox>
              <PanelBox>
                <SectionHeader stamp="LEDGER">Financials</SectionHeader>
                <FieldRow label="Company Cash" value={formatMoney(company.companyCash ?? 0)} valueColor={T.mint} />
                <FieldRow label="Debt" value={formatMoney(company.debt ?? 0)} valueColor={(company.debt ?? 0) > 0 ? T.red : T.muted} />
                <FieldRow label="Fleet Assets" value={formatMoney(fleetValue)} valueColor={T.steel} />
                <FieldRow label="Company Value" value={formatMoney(companyValue)} valueColor={T.gold} />
                <FieldRow label="Net Worth" value={formatMoney(netWorth)} valueColor={T.gold} />
              </PanelBox>
            </div>
            <PanelBox style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(54,211,153,0.03)', border: `1px solid ${T.mint}40` }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: `6px solid ${T.mint}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 0 20px rgba(54,211,153,0.1)' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: T.ivory }}>100%</span>
                <span style={{ fontSize: '10px', color: T.mint, fontFamily: 'monospace', textTransform: 'uppercase' }}>Owned</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '4px' }}>Founder Holding</div>
                <div style={{ fontSize: '11px', color: T.muted }}>1,000 / 1,000 ownership units</div>
              </div>
            </PanelBox>
          </div>
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Operations Summary</SectionHeader>
              <FieldRow label="Total Fleet" value={fleet.length} />
              <FieldRow label="Assigned Vehicles" value={fleet.filter(v => v.assignedContractId || v.assignedAutoOpPool).length} valueColor={T.mint} />
              <FieldRow label="Idle Vehicles" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length} valueColor={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 ? T.red : T.muted} />
              <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
              <FieldRow label="Active Contracts" value={activeContracts.length} />
              <FieldRow label="Auto Ops Pools Active" value={new Set(fleet.filter(v => v.assignedAutoOpPool).map(v => v.assignedAutoOpPool)).size} />
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Contract Pipeline</SectionHeader>
              <FieldRow label="Posted Contracts" value={contracts.filter(c => c.status === 'open').length} />
              <FieldRow label="Bid Submitted" value={0} />
              <FieldRow label="Awaiting Vehicle Assignment" value={contracts.filter(c => c.status === 'awarded' && !c.assignedVehicleId).length} valueColor={contracts.filter(c => c.status === 'awarded' && !c.assignedVehicleId).length > 0 ? T.red : T.muted} />
              <FieldRow label="Active Contracts" value={activeContracts.length} />
              <FieldRow label="Completed Contracts" value={contractHistory.filter(h => h.result === 'completed').length} />
              <FieldRow label="Failed Contracts" value={contractHistory.filter(h => h.result === 'failed').length} valueColor={T.red} />
              <FieldRow label="Lost Bids" value={0} />
              {activeContracts.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: '10px', color: T.gold, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '8px' }}>Next Resolution:</div>
                  <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700 }}>{activeContracts[0].title}</div>
                  <div style={{ fontSize: '11px', color: T.muted }}>Due: Month {activeContracts[0].dueMonth || 0}, {activeContracts[0].dueYear || 2026}</div>
                </div>
              )}
            </PanelBox>
            <PanelBox>
              <SectionHeader stamp="RECORDS">Recent Records</SectionHeader>
              {records.filter((r:any) => r.companyId === company.id).slice(0, 3).map((r:any, i:number) => (
                <div key={i} style={{ fontSize: '11px', color: T.muted, marginBottom: '8px', paddingBottom: '8px', borderBottom: i < 2 ? `1px solid ${T.border}` : 'none' }}>
                  {r.text || r.msg}
                </div>
              ))}
              {records.filter((r:any) => r.companyId === company.id).length === 0 && (
                <div style={{ fontSize: '11px', color: T.faint }}>No recent records.</div>
              )}
            </PanelBox>
          </div>
        </div>
      )}

      {deskTab === 'operations' && (
        <div className="business-content-grid">
          <div>
            <SectionHeader>Operations Desk</SectionHeader>
            <PanelBox style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '8px' }}>Monthly Dispatch Console</div>
                <p style={{ fontSize: '11px', color: T.muted, lineHeight: 1.5, margin: '0 0 16px' }}>
                  Run Month auto operations to dispatch your active fleet, process contract completions, collect recurring revenue, pay facility leases, and deduct fleet maintenance costs.
                </p>
              </div>

              {fleet.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', border: `1px dashed ${T.border}`, textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: T.gold, marginBottom: '8px' }}>No fleet available.</div>
                  <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>Order a vehicle from Procurement to begin logistics operations.</div>
                  <GoldButton onClick={() => setDeskTab('procurement')}>Open Procurement</GoldButton>
                </div>
              ) : !fleet.some(v => v.assignedAutoOpPool || v.assignedContractId) ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', border: `1px dashed ${T.border}`, textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: T.gold, marginBottom: '8px' }}>Fleet idle.</div>
                  <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>Assign a vehicle to an auto operation pool or contract before dispatching.</div>
                  <GhostButton color={T.ivory} onClick={() => {
                    document.getElementById('auto-ops-pools')?.scrollIntoView({ behavior: 'smooth' });
                  }}>Assign Vehicle</GhostButton>
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: '16px' }}>
                <GoldButton onClick={() => {
                  showNotif('Operation assignments saved.', true);
                  onRefresh();
                }}>
                  💾 SAVE OPERATION ASSIGNMENTS
                </GoldButton>

                {isAdmin && (
                  <GoldButton onClick={handleRunAutoOps} color="#8A6E2A">
                    DEV ADMIN — Close Current Month
                  </GoldButton>
                )}
              </div>
              
              <div style={{ fontSize: '11px', color: T.faint, marginTop: '16px', fontStyle: 'italic' }}>
                Operations are processed automatically at Month Close.
              </div>
            </PanelBox>

            {computedLastReport && (
              <PanelBox style={{ marginBottom: '24px', border: `1px solid ${T.gold}` }}>
                <SectionHeader stamp={computedLastReport.gameDateStr}>Last Month Report</SectionHeader>
                <FieldRow label="Gross Revenue" value={formatMoney(computedLastReport.autoRevenue + computedLastReport.manualRevenue)} valueColor={T.mint} />
                <FieldRow label="Operating Costs" value={'-' + formatMoney(computedLastReport.operatingCosts)} valueColor={T.muted} />
                <FieldRow label="Payroll" value={'-' + formatMoney(computedLastReport.payrollExpense)} valueColor={T.muted} />
                <FieldRow label="Maintenance" value={'-' + formatMoney(computedLastReport.totalMaintenance)} valueColor={T.muted} />
                <FieldRow label="Facility Leases" value={'-' + formatMoney(computedLastReport.facilityLeaseExpense)} valueColor={T.muted} />
                <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
                <FieldRow label={computedLastReport.netProfit >= 0 ? "Net Profit" : "Operating Loss"} value={formatMoney(computedLastReport.netProfit)} valueColor={computedLastReport.netProfit >= 0 ? T.mint : T.red} />
              </PanelBox>
            )}

            <SectionHeader stamp="FACILITIES">Facility Support & Asset Yield Boosts</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {(() => {
                const matchesState = (f: any, stateId: string) =>
                  f.state_id === stateId || f.stateId === stateId || f.state === stateId || getStateName(f.state_id || f.stateId) === stateId;
                const hasWestport = (company.facilities || []).some(f => matchesState(f, 'drennia-westport') && (f.type === 'Small Depot' || f.type === 'Warehouse'));
                const hasDrennport = (company.facilities || []).some(f => matchesState(f, 'drennia-drennport') && (f.type === 'Small Depot' || f.type === 'Warehouse'));
                const branchCount = (company.facilities || []).filter(f => f.type === 'Regional Branch Office').length;
                return (
                  <>
                    <PanelBox style={{ background: hasWestport ? 'rgba(54,211,153,0.02)' : T.panel, border: `1px solid ${hasWestport ? T.mint : T.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hasWestport ? T.mint : T.ivory }}>Westport Depot</span>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: hasWestport ? T.mint : T.faint, border: `1px solid ${hasWestport ? T.mint : T.border}`, padding: '1px 5px' }}>{hasWestport ? 'Active' : 'Missing'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.4 }}>
                        {hasWestport ? '✓ Port Shuttle yield increased by 35% across Westport routes.' : 'Lease Westport Depot/Warehouse to boost Port Shuttle yield by 35%.'}
                      </div>
                    </PanelBox>
                    <PanelBox style={{ background: hasDrennport ? 'rgba(54,211,153,0.02)' : T.panel, border: `1px solid ${hasDrennport ? T.mint : T.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hasDrennport ? T.mint : T.ivory }}>Drennport Depot</span>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: hasDrennport ? T.mint : T.faint, border: `1px solid ${hasDrennport ? T.mint : T.border}`, padding: '1px 5px' }}>{hasDrennport ? 'Active' : 'Missing'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.4 }}>
                        {hasDrennport ? '✓ Courier yield increased by 25% across Drennport routes.' : 'Lease Drennport Depot/Warehouse to boost Local Courier yield by 25%.'}
                      </div>
                    </PanelBox>
                    <PanelBox style={{ background: branchCount > 0 ? 'rgba(54,211,153,0.02)' : T.panel, border: `1px solid ${branchCount > 0 ? T.mint : T.border}`, gridColumn: 'span 2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: branchCount > 0 ? T.mint : T.ivory }}>Branch Network</span>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: branchCount > 0 ? T.mint : T.faint, border: `1px solid ${branchCount > 0 ? T.mint : T.border}`, padding: '1px 5px' }}>{branchCount > 0 ? `${branchCount} Active` : 'Inactive'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.4 }}>
                        {branchCount > 0 ? `✓ Unlocks multi-state operations and lowers interstate route dispatch cost.` : 'Lease Regional Branch Offices to establish multi-state presence.'}
                      </div>
                    </PanelBox>
                  </>
                );
              })()}
            </div>

            <div id="auto-ops-pools">
              <SectionHeader stamp="RECURRING">Auto Operations Pools</SectionHeader>
            </div>
            <p style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>Assign idle vehicles to recurring local pools. This generates steady monthly income but wears down vehicle condition.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
              {['Local Delivery Pool', 'Port Shuttle Pool'].map(pool => {
                const marketDemand = pool === 'Port Shuttle Pool' ? 'High' : 'Moderate';
                const marketComp = pool === 'Port Shuttle Pool' ? 'Moderate' : 'High';
                const matchFacState = (f: any, sid: string) =>
                  f.state_id === sid || f.stateId === sid || f.state === sid || getStateName(f.state_id || f.stateId) === sid;
                const hasWestport = (company.facilities || []).some(f => matchFacState(f, 'drennia-westport') && (f.type === 'Small Depot' || f.type === 'Warehouse'));
                const hasDrennport = (company.facilities || []).some(f => matchFacState(f, 'drennia-drennport') && (f.type === 'Small Depot' || f.type === 'Warehouse'));
                const isBoosted = (pool === 'Port Shuttle Pool' && hasWestport) || (pool === 'Local Delivery Pool' && hasDrennport);
                const boostPct = pool === 'Port Shuttle Pool' ? '+35%' : '+25%';
                return (
                <PanelBox key={pool}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory }}>{pool}</div>
                    {isBoosted && (
                      <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.mint, background: 'rgba(54,211,153,0.1)', border: `1px solid ${T.mint}`, padding: '1px 6px' }}>
                        ⚡ Boosted {boostPct}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px' }}>
                    {pool === 'Local Delivery Pool' ? 'High volume local courier work around Drennport. Steady demand, high competition.' : 'Container and crate movement around Westport docks. High demand.'}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', fontSize: '10px', fontFamily: 'monospace', color: T.faint, marginBottom: '12px' }}>
                    <span>Demand: <span style={{ color: marketDemand === 'High' ? T.mint : T.gold }}>{marketDemand}</span></span>
                    <span>Competition: <span style={{ color: marketComp === 'High' ? T.red : T.gold }}>{marketComp}</span></span>
                  </div>
                  
                  {fleet.filter(v => v.assignedAutoOpPool === pool).map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px', fontSize: '11px' }}>
                      <span>{v.type} ({v.condition}%)</span>
                      <GhostButton onClick={() => handleAssignAutoOp(v.id, null)} color={T.red}>Remove</GhostButton>
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <select id={`pool-sel-${pool.replace(/\s+/g, '')}`} style={{ padding: '6px', background: T.panel, color: T.ivory, border: `1px solid ${T.border}`, fontSize: '11px', flex: 1 }}>
                      <option value="">Select available vehicle...</option>
                      {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).map(v => (
                        <option key={v.id} value={v.id}>{v.type} ({v.condition}%)</option>
                      ))}
                    </select>
                    <GhostButton onClick={() => {
                      const sel = document.getElementById(`pool-sel-${pool.replace(/\s+/g, '')}`) as HTMLSelectElement;
                      if (sel && sel.value) handleAssignAutoOp(sel.value, pool as any);
                    }}>Assign</GhostButton>
                  </div>
                </PanelBox>
              )})}
            </div>
          </div>
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Fleet Utilization</SectionHeader>
              <FieldRow label="Total Vehicles" value={fleet.length} />
              <FieldRow label="Assigned to Auto Ops" value={fleet.filter(v => v.assignedAutoOpPool).length} valueColor={T.gold} />
              <FieldRow label="Assigned to Contracts" value={fleet.filter(v => v.assignedContractId).length} valueColor={T.mint} />
              <FieldRow label="Idle Vehicles" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length} valueColor={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 ? T.red : T.muted} />
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Month Estimate</SectionHeader>
              <FieldRow label="Est. Auto Revenue" value="Varies" valueColor={T.mint} />
              <FieldRow label="Operating Costs" value={formatMoney(company.monthlyCosts)} valueColor={T.red} />
              <FieldRow label="Fleet Maintenance" value={formatMoney(fleet.reduce((sum, v) => sum + v.monthlyMaintenance, 0))} valueColor={T.red} />
              <div style={{ marginTop: '12px', padding: '10px 0', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Projected Net</span>
                <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.muted }}>?</span>
              </div>
            </PanelBox>
            {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 && (
              <PanelBox style={{ marginBottom: '16px', background: 'rgba(184,85,85,0.05)', border: `1px solid ${T.red}` }}>
                <SectionHeader>Idle Fleet Warning</SectionHeader>
                <div style={{ fontSize: '11px', color: T.red }}>You have idle vehicles. They cost maintenance without generating revenue.</div>
              </PanelBox>
            )}
            <PanelBox>
              <SectionHeader>Contract Pipeline</SectionHeader>
              <FieldRow label="Active Contracts" value={activeContracts.length} />
            </PanelBox>
          </div>
        </div>
      )}

      {deskTab === 'staff' && (
        <div className="business-content-grid">
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Staff Summary</SectionHeader>
              <FieldRow label="Total Employees" value={Object.values(company.staff || {}).reduce((a,b)=>a+b,0)} />
              <FieldRow label="Payroll per Month" value={formatMoney((Object.keys(company.staff || {}) as StaffRole[]).reduce((sum, k) => sum + (company.staff?.[k] || 0) * STAFF_WAGES[k], 0) * (company.wagePolicy === 'Low' ? 0.8 : company.wagePolicy === 'Generous' ? 1.2 : company.wagePolicy === 'Premium' ? 1.45 : 1.0))} valueColor={T.red} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: '11px', color: T.muted }}>Wage Policy</span>
                <select value={company.wagePolicy || 'Standard'} onChange={async (e) => {
                  const newPolicy = e.target.value as WagePolicy;
                  try {
                    const { companyApi: cApi } = await import('../../../lib/api');
                    await cApi.updateFinances(company.id, { wage_policy: newPolicy });
                    showNotif(`Wage policy updated to ${newPolicy}.`, true);
                    onRefresh();
                  } catch (err: any) {
                    showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to update wage policy', false);
                  }
                }} style={{ background: T.panelSoft, color: T.ivory, border: `1px solid ${T.border}`, padding: '2px 4px', fontSize: '11px', fontFamily: 'monospace' }}>
                  {WAGE_POLICY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <FieldRow label="Morale" value={company.morale ? (company.morale >= 80 ? 'High' : company.morale <= 20 ? 'Low' : 'Stable') : 'Stable'} valueColor={company.morale && company.morale >= 80 ? T.mint : company.morale && company.morale <= 20 ? T.red : T.ivory} />
              <FieldRow label="Employer Reputation" value="New Employer" />
              <FieldRow label="Staff Quality" value="Basic" />
              <FieldRow label="Turnover Risk" value="Normal" />
            </PanelBox>
          </div>
          <div>
            <PanelBox>
              <SectionHeader>Staff Roster</SectionHeader>
              {(Object.keys(STAFF_WAGES) as StaffRole[]).map(role => {
                 const count = company.staff?.[role] || 0;
                 const cost = count * STAFF_WAGES[role] * (company.wagePolicy === 'Low' ? 0.8 : company.wagePolicy === 'Generous' ? 1.2 : company.wagePolicy === 'Premium' ? 1.45 : 1.0);
                 return (
                   <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
                     <div>
                       <div style={{ fontSize: '12px', fontWeight: 600, color: T.ivory }}>{role} <span style={{ color: T.gold, marginLeft: '4px' }}>x{count}</span></div>
                       <div style={{ fontSize: '10px', color: T.muted }}>Base: {formatMoney(STAFF_WAGES[role])}/mo</div>
                       <div style={{ fontSize: '10px', color: T.red }}>Total: {formatMoney(cost)}/mo</div>
                     </div>
                     <div style={{ display: 'flex', gap: '8px' }}>
                       <GhostButton onClick={async () => {
                         try {
                           await logisticsApi.fireStaff(company.id, role);
                           showNotif(`Fired 1 ${role}.`, true);
                           onRefresh();
                         } catch (err: any) {
                           showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to fire staff', false);
                         }
                       }} color={T.red} disabled={count === 0}>-</GhostButton>
                       <GhostButton onClick={async () => {
                         try {
                           await logisticsApi.hireStaff(company.id, role);
                           showNotif(`Hired 1 ${role}.`, true);
                           onRefresh();
                         } catch (err: any) {
                           showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to hire staff', false);
                         }
                       }} color={T.mint}>+</GhostButton>
                     </div>
                   </div>
                 );
              })}
            </PanelBox>
          </div>
        </div>
      )}

      {deskTab === 'procurement' && (
        <div className="business-content-grid">
          <div>
            <SectionHeader>Procurement Desk</SectionHeader>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <GhostButton color={procurementSubTab === 'vehicles' ? T.ivory : T.faint} onClick={() => setProcurementSubTab('vehicles')}>NPC Manufacturers</GhostButton>
              <GhostButton color={procurementSubTab === 'used' ? T.ivory : T.faint} onClick={() => setProcurementSubTab('used')}>Used Vehicle Market</GhostButton>
            </div>
            
            {procurementSubTab === 'vehicles' && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <PanelBox>
                  <SectionHeader stamp="NEW">Drennia Motors</SectionHeader>
                  <FieldRow label="Vehicle" value="Used Delivery Van" />
                  <FieldRow label="Price" value={formatMoney(35000)} valueColor={T.mint} />
                  <FieldRow label="Condition" value="100%" />
                  <FieldRow label="Capacity" value="1" />
                  <FieldRow label="Maintenance per Month" value={formatMoney(3000)} />
                  <FieldRow label="Source Type" value="NPC Manufacturer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={async () => {
                       try {
                         const proc = await logisticsApi.getProcurement();
                         const catalogItem = proc.data.vehicles.find((v: any) => v.type === 'Used Delivery Van');
                         if (!catalogItem) { showNotif('Vehicle catalog item not found', false); return; }
                         await logisticsApi.purchaseVehicle(company.id, catalogItem.id);
                         showNotif('Vehicle purchased successfully.', true);
                         onRefresh();
                       } catch (err: any) {
                         showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Purchase failed', false);
                       }
                    }}>Order Vehicle</GoldButton>
                  </div>
                </PanelBox>
                <PanelBox>
                  <SectionHeader stamp="NEW">Westport Commercial Vehicles</SectionHeader>
                  <FieldRow label="Vehicle" value="Box Truck" />
                  <FieldRow label="Price" value={formatMoney(75000)} valueColor={T.mint} />
                  <FieldRow label="Condition" value="100%" />
                  <FieldRow label="Capacity" value="2" />
                  <FieldRow label="Maintenance per Month" value={formatMoney(7000)} />
                  <FieldRow label="Source Type" value="NPC Manufacturer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={async () => {
                       try {
                         const { logisticsApi } = require('../../../lib/api');
                         const proc = await logisticsApi.getProcurement();
                         const catalogItem = proc.data.vehicles.find((v: any) => v.type === 'Box Truck');
                         if (!catalogItem) { showNotif('Vehicle catalog item not found', false); return; }
                         await logisticsApi.purchaseVehicle(company.id, catalogItem.id);
                         showNotif('Vehicle purchased successfully.', true);
                         onRefresh();
                       } catch (err: any) {
                         showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Purchase failed', false);
                       }
                    }}>Order Vehicle</GoldButton>
                  </div>
                </PanelBox>
                <PanelBox>
                  <SectionHeader stamp="NEW">Ironvale Heavy Industries</SectionHeader>
                  <FieldRow label="Vehicle" value="Used Freight Truck" />
                  <FieldRow label="Price" value={formatMoney(180000)} valueColor={T.mint} />
                  <FieldRow label="Condition" value="100%" />
                  <FieldRow label="Capacity" value="4" />
                  <FieldRow label="Maintenance per Month" value={formatMoney(12000)} />
                  <FieldRow label="Source Type" value="NPC Manufacturer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={async () => {
                       try {
                         const { logisticsApi } = require('../../../lib/api');
                         const proc = await logisticsApi.getProcurement();
                         const catalogItem = proc.data.vehicles.find((v: any) => v.type === 'Used Freight Truck');
                         if (!catalogItem) { showNotif('Vehicle catalog item not found', false); return; }
                         await logisticsApi.purchaseVehicle(company.id, catalogItem.id);
                         showNotif('Vehicle purchased successfully.', true);
                         onRefresh();
                       } catch (err: any) {
                         showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Purchase failed', false);
                       }
                    }}>Order Vehicle</GoldButton>
                  </div>
                </PanelBox>
                <PanelBox>
                  <SectionHeader stamp="NEW">Greenmere Utility Works</SectionHeader>
                  <FieldRow label="Vehicle" value="Box Truck" />
                  <FieldRow label="Price" value={formatMoney(75000)} valueColor={T.mint} />
                  <FieldRow label="Condition" value="100%" />
                  <FieldRow label="Capacity" value="2" />
                  <FieldRow label="Maintenance per Month" value={formatMoney(7000)} />
                  <FieldRow label="Source Type" value="NPC Manufacturer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={async () => {
                       try {
                         const { logisticsApi } = require('../../../lib/api');
                         const proc = await logisticsApi.getProcurement();
                         const catalogItem = proc.data.vehicles.find((v: any) => v.type === 'Box Truck');
                         if (!catalogItem) { showNotif('Vehicle catalog item not found', false); return; }
                         await logisticsApi.purchaseVehicle(company.id, catalogItem.id);
                         showNotif('Vehicle purchased successfully.', true);
                         onRefresh();
                       } catch (err: any) {
                         showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Purchase failed', false);
                       }
                    }}>Order Vehicle</GoldButton>
                  </div>
                </PanelBox>
              </div>
            )}
            
            {procurementSubTab === 'used' && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <PanelBox>
                  <SectionHeader stamp="USED">Westport Dealer Yard</SectionHeader>
                  <FieldRow label="Vehicle" value="Used Delivery Van" />
                  <FieldRow label="Price" value={formatMoney(48000)} valueColor={T.mint} />
                  <FieldRow label="Condition" value="72%" valueColor={T.gold} />
                  <FieldRow label="Capacity" value="1" />
                  <FieldRow label="Maintenance per Month" value={formatMoney(3000)} />
                  <FieldRow label="Stock" value="2" />
                  <FieldRow label="Source Type" value="NPC Dealer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={async () => {
                       try {
                         const { logisticsApi } = require('../../../lib/api');
                         const proc = await logisticsApi.getProcurement();
                         const catalogItem = proc.data.vehicles.find((v: any) => v.type === 'Used Delivery Van');
                         if (!catalogItem) { showNotif('Vehicle catalog item not found', false); return; }
                         await logisticsApi.purchaseVehicle(company.id, catalogItem.id);
                         showNotif('Vehicle purchased successfully.', true);
                         onRefresh();
                       } catch (err: any) {
                         showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Purchase failed', false);
                       }
                    }}>Buy Used Vehicle</GoldButton>
                  </div>
                </PanelBox>
                <PanelBox>
                  <SectionHeader stamp="USED">Ironvale Resale Depot</SectionHeader>
                  <FieldRow label="Vehicle" value="Box Truck" />
                  <FieldRow label="Price" value={formatMoney(112000)} valueColor={T.mint} />
                  <FieldRow label="Condition" value="68%" valueColor={T.gold} />
                  <FieldRow label="Capacity" value="2" />
                  <FieldRow label="Maintenance per Month" value={formatMoney(7000)} />
                  <FieldRow label="Stock" value="1" />
                  <FieldRow label="Source Type" value="NPC Dealer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={async () => {
                       try {
                         const { logisticsApi } = require('../../../lib/api');
                         const proc = await logisticsApi.getProcurement();
                         const catalogItem = proc.data.vehicles.find((v: any) => v.type === 'Box Truck');
                         if (!catalogItem) { showNotif('Vehicle catalog item not found', false); return; }
                         await logisticsApi.purchaseVehicle(company.id, catalogItem.id);
                         showNotif('Vehicle purchased successfully.', true);
                         onRefresh();
                       } catch (err: any) {
                         showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Purchase failed', false);
                       }
                    }}>Buy Used Vehicle</GoldButton>
                  </div>
                </PanelBox>
                <PanelBox>
                  <SectionHeader stamp="USED">Drennport Auction Yard</SectionHeader>
                  <FieldRow label="Vehicle" value="Used Freight Truck" />
                  <FieldRow label="Price" value={formatMoney(190000)} valueColor={T.mint} />
                  <FieldRow label="Condition" value="61%" valueColor={T.gold} />
                  <FieldRow label="Capacity" value="3" />
                  <FieldRow label="Maintenance per Month" value={formatMoney(12000)} />
                  <FieldRow label="Stock" value="1" />
                  <FieldRow label="Source Type" value="NPC Dealer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={async () => {
                       try {
                         const { logisticsApi } = require('../../../lib/api');
                         const proc = await logisticsApi.getProcurement();
                         const catalogItem = proc.data.vehicles.find((v: any) => v.type === 'Used Freight Truck');
                         if (!catalogItem) { showNotif('Vehicle catalog item not found', false); return; }
                         await logisticsApi.purchaseVehicle(company.id, catalogItem.id);
                         showNotif('Vehicle purchased successfully.', true);
                         onRefresh();
                       } catch (err: any) {
                         showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Purchase failed', false);
                       }
                    }}>Buy Used Vehicle</GoldButton>
                  </div>
                </PanelBox>
              </div>
            )}
          </div>
          
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Company Resources</SectionHeader>
              <FieldRow label="Available Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
              <FieldRow label="Fleet Size" value={fleet.length} />
              <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
              <div style={{ fontSize: '11px', color: T.muted }}>
                Need more capital to expand your fleet? You can inject cash via the Finance Desk.
              </div>
              <div style={{ marginTop: '12px' }}>
                <GhostButton onClick={() => setDeskTab('finance')}>Open Finance</GhostButton>
              </div>
            </PanelBox>
            
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Other Procurement</SectionHeader>
              <div style={{ display: 'grid', gap: '8px' }}>
                <GhostButton onClick={() => setDeskTab('facilities')}>Facility Leasing</GhostButton>
                <div style={{ padding: '8px', border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)', color: T.faint, fontSize: '11px', textAlign: 'center' }}>Equipment (Locked)</div>
                <div style={{ padding: '8px', border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)', color: T.faint, fontSize: '11px', textAlign: 'center' }}>Materials (Locked)</div>
                <div style={{ padding: '8px', border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)', color: T.faint, fontSize: '11px', textAlign: 'center' }}>Player Suppliers (Future)</div>
              </div>
            </PanelBox>
          </div>
        </div>
      )}

      {deskTab === 'fleet' && (
        <div className="business-content-grid">
          <div>
            <SectionHeader>Fleet Control & Logistics Desk</SectionHeader>
            
            <PanelBox style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>Current Active Fleet</div>
                  <div style={{ fontSize: '11px', color: T.muted }}>Manage vehicles owned by the company.</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px' }}>
                  Total Capacity: <strong style={{ color: T.gold }}>{fleet.reduce((sum, v) => sum + v.capacity, 0)} items</strong>
                </div>
              </div>

              {fleet.length === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: `1px dashed ${T.border}`, color: T.muted, fontSize: '12px' }}>
                  <div style={{ marginBottom: '16px' }}>No vehicles in fleet. Purchase vehicles through Procurement.</div>
                  <GoldButton onClick={() => setDeskTab('procurement')}>Open Procurement</GoldButton>
                </div>
              )}

              {fleet.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {fleet.map((v:any, idx:number) => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.panel, border: `1px solid ${T.border}`, padding: '12px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: T.ivory }}>{v.type}</div>
                          <div style={{ color: T.faint }}>Asset Tag: {v.assetTag || v.id.substring(0,8)} • Capacity: {v.capacity}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ color: v.condition > 80 ? T.mint : v.condition > 50 ? T.gold : T.red }}>Cond: {v.condition}%</span>
                          <span style={{ color: T.muted }}>Maintenance: {formatMoney(v.monthlyMaintenance)} / Month</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {v.assignedContractId && <span style={{ color: T.mint, border: `1px solid ${T.mint}`, padding: '2px 6px', background: 'rgba(54,211,153,0.1)' }}>On Contract</span>}
                        {v.assignedAutoOpPool && <span style={{ color: T.gold, border: `1px solid ${T.gold}`, padding: '2px 6px', background: 'rgba(224,185,83,0.1)' }}>{v.assignedAutoOpPool}</span>}
                        {!v.assignedContractId && !v.assignedAutoOpPool && <span style={{ color: T.faint }}>Idle</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PanelBox>

            
          </div>
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Procurement Market</SectionHeader>
              <FieldRow label="Player Listings" value="Locked" valueColor={T.faint} />
              <FieldRow label="NPC Stock" value="Available" valueColor={T.mint} />
              <div style={{ marginTop: '16px' }}>
                <GhostButton onClick={() => setDeskTab('procurement')}>Open Procurement →</GhostButton>
              </div>
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Fleet Summary</SectionHeader>
              <FieldRow label="Vehicles Owned" value={fleet.length} />
              <FieldRow label="Total Capacity" value={fleet.reduce((s, v) => s + v.capacity, 0)} />
              <FieldRow label="Available Capacity" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).reduce((s, v) => s + v.capacity, 0)} valueColor={T.mint} />
              <FieldRow label="Assigned Vehicles" value={fleet.filter(v => v.assignedContractId || v.assignedAutoOpPool).length} />
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Maintenance Burden</SectionHeader>
              <FieldRow label="Fleet Maintenance per Month" value={formatMoney(fleet.reduce((sum, v) => sum + v.monthlyMaintenance, 0))} valueColor={T.red} />
              <FieldRow label="Vehicles < 60% Cond" value={fleet.filter(v => v.condition < 60).length} valueColor={fleet.filter(v => v.condition < 60).length > 0 ? T.red : T.muted} />
            </PanelBox>
            <PanelBox>
              <SectionHeader>Fleet Orders / Procurement</SectionHeader>
              <FieldRow label="Player Listings" value="Locked" valueColor={T.faint} />
              <FieldRow label="NPC Stock" value="Available" valueColor={T.mint} />
            </PanelBox>
          </div>
        </div>
      )}

      {deskTab === 'contracts' && (
        <div className="business-content-grid">
          <div>
            {activeContracts.length > 0 && (
              <PanelBox style={{ marginBottom: '24px', border: `1px solid ${T.mint}` }}>
                <SectionHeader stamp="ACTIVE">Current In-Progress Contracts</SectionHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activeContracts.map((c:any) => {
                    const assignedVehicle = fleet.find(v => v.id === c.assignedVehicleId);
                    const monthsRemaining = c.dueYear && c.dueMonth ? ((c.dueYear - getGameDate().worldYear) * 12 + c.dueMonth - getGameDate().worldMonth) : 0;
                    return (
                      <div key={c.id} style={{ background: 'rgba(54,211,153,0.02)', padding: '16px', border: `1px solid ${T.mint}40`, borderRadius: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: T.mint, marginBottom: '4px' }}>{c.title}</div>
                            <div style={{ fontSize: '12px', color: T.ivory, marginBottom: '2px' }}>Issuer: {c.issuerName}</div>
                            <div style={{ fontSize: '11px', color: T.gold }}>Status: Active — Awaiting Month-Close Resolution</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: T.gold }}>Payment: {formatMoney(c.payment)}</div>
                            <div style={{ fontSize: '11px', color: T.muted }}>Estimated Cost: {formatMoney(c.operatingCostEstimate)}</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: T.mint }}>Estimated Profit: {formatMoney(c.payment - c.operatingCostEstimate)}</div>
                            <div style={{ fontSize: '11px', color: T.red }}>Penalty: {formatMoney(c.penalty)}</div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', color: T.muted, marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '12px', border: `1px dashed ${T.border}` }}>
                          <div>
                            <div style={{ marginBottom: '4px' }}>Assigned Vehicle: <span style={{ color: assignedVehicle ? T.ivory : T.red, fontWeight: 700 }}>{assignedVehicle ? getVehicleDisplayLabel(assignedVehicle) : 'Not Assigned'}</span></div>
                            <div style={{ marginBottom: '4px' }}>Capacity: <span style={{ color: T.ivory }}>{assignedVehicle ? assignedVehicle.capacity : '-'}</span></div>
                            <div style={{ marginBottom: '4px' }}>Condition: <span style={{ color: assignedVehicle ? (assignedVehicle.condition > 40 ? T.mint : T.red) : T.muted }}>{assignedVehicle ? assignedVehicle.condition + '%' : '-'}</span></div>
                            <div style={{ marginBottom: '4px' }}>Risk: <span style={{ color: T.ivory }}>{c.baseRisk}</span></div>
                          </div>
                          <div>
                            <div style={{ marginBottom: '4px' }}>Start Month: <span style={{ color: T.ivory }}>Month {c.startMonth || '-'}, {c.startYear || '-'}</span></div>
                            <div style={{ marginBottom: '4px' }}>Due Month: <span style={{ color: T.ivory }}>Month {c.dueMonth || '-'}, {c.dueYear || '-'}</span></div>
                            <div style={{ marginBottom: '4px' }}>Months Remaining: <span style={{ color: T.gold }}>{monthsRemaining}</span></div>
                            <div style={{ marginBottom: '4px' }}>Route: <span style={{ color: T.ivory }}>{c.originState} → {c.destinationState}</span></div>
                            <div style={{ marginBottom: '4px' }}>Route Familiarity: <span style={{ color: T.ivory }}>{getRouteFamiliarityPercent(company.id, c.originState, c.destinationState)}%</span></div>
                          </div>
                        </div>
                        
                        <div style={{ background: 'rgba(201,162,74,0.08)', padding: '12px', border: `1px solid ${T.gold}40`, fontSize: '12px', color: T.gold }}>
                          <strong>Next Action:</strong> {assignedVehicle ? "Advance the Month to resolve this contract." : "Assign an eligible vehicle before this contract can begin."}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PanelBox>
            )}

            <SectionHeader stamp="BOARD">Open Contract Board</SectionHeader>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="Search contracts..." 
                value={contractSearch}
                onChange={e => setContractSearch(e.target.value)}
                style={{ flex: 1, padding: '8px', background: T.panel, border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }}
              />
              <select 
                value={contractFilter} 
                onChange={e => setContractFilter(e.target.value as ContractSourceFilter)}
                style={{ padding: '8px', background: T.panel, border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }}
              >
                {CONTRACT_SOURCE_FILTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredContracts.map((c:any) => {
                const driverCount = company.staff ? (company.staff['Driver'] || 0) : 0;
                const founderOperating = (fleet.length === 1 && driverCount === 0 && fleet[0].capacity <= 2);
                const totalDriversAvailable = driverCount + (founderOperating ? 1 : 0);
                
                const hasDriver = totalDriversAvailable >= c.requiredDrivers;
                const hasCapacity = fleet.some(v => v.capacity >= c.requiredCapacity && !v.assignedContractId && !v.assignedAutoOpPool);
                const hasCondition = fleet.some(v => v.capacity >= c.requiredCapacity && !v.assignedContractId && !v.assignedAutoOpPool && v.condition > 40);
                const canAffordCost = company.companyCash >= c.operatingCostEstimate;
                
                const canAccept = hasDriver && hasCapacity && hasCondition && canAffordCost;
                const clientTrust = getClientTrustLabel(company.clientTrusts?.[c.issuerCompanyId] ?? 0);
                
                return (
                  <PanelBox key={c.id} style={{ borderLeft: c.bidType === 'Requires Bid' ? `3px solid ${T.gold}` : `3px solid ${T.mint}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '4px' }}>{c.title}</div>
                        <div style={{ fontSize: '11px', color: T.faint }}>
                          Issuer: <strong style={{ color: T.ivory }}>{c.issuerName}</strong> {c.issuerType ? `(${c.issuerType})` : ''} <span style={{ color: clientTrust === 'Unknown' ? T.faint : clientTrust === 'Distrusted' ? T.red : T.mint, paddingLeft: '4px' }}>[{clientTrust}]</span>
                        </div>
                        <div style={{ fontSize: '11px', color: T.muted, marginTop: '2px' }}>Cargo: {c.cargo} • Route: {c.routeType}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: T.gold }}>Payment: {formatMoney(c.payment)}</div>
                        <div style={{ fontSize: '11px', color: T.muted }}>Est Cost: {formatMoney(c.operatingCostEstimate)}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: T.mint }}>Profit: {formatMoney(c.payment - c.operatingCostEstimate)}</div>
                        <div style={{ fontSize: '11px', color: T.red }}>Penalty: {formatMoney(c.penalty)}</div>
                      </div>
                    </div>
                    
                    <p style={{ fontSize: '11px', color: T.muted, lineHeight: 1.5, margin: '0 0 16px 0' }}>
                      {c.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '8px', border: `1px solid ${T.border}` }}>
                      <div><span style={{ color: T.faint }}>Type:</span> {c.contractType}</div>
                      <div><span style={{ color: T.faint }}>Capacity:</span> {c.requiredCapacity}</div>
                      <div><span style={{ color: T.faint }}>Duration:</span> {c.durationMonths}mo</div>
                      <div><span style={{ color: T.faint }}>Risk:</span> <span style={{ color: c.baseRisk === 'High' ? T.red : c.baseRisk === 'Medium' ? T.gold : T.mint }}>{c.baseRisk}</span></div>
                    </div>
                    
                    {/* Eligibility Messages */}
                    <div style={{ fontSize: '10px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {!hasCapacity && <div style={{ color: T.red }}>✖ Requires idle vehicle with capacity {c.requiredCapacity}+</div>}
                      {!hasCondition && hasCapacity && <div style={{ color: T.red }}>✖ Requires idle vehicle with condition &gt; 40%</div>}
                      {!hasDriver && <div style={{ color: T.red }}>✖ Driver shortage. Hire a driver. {fleet.length === 1 && driverCount === 0 ? '(Founder exception requires 1 capacity vehicle)' : ''}</div>}
                      {!canAffordCost && <div style={{ color: T.red }}>✖ Insufficient cash for operating cost estimate.</div>}
                      {canAccept && <div style={{ color: T.mint }}>✓ Eligible to {c.bidType === 'Requires Bid' ? 'bid' : 'accept'}. {founderOperating && '(Using founder-operator exception)'}</div>}
                    </div>

                    {/* Action Area */}
                    {c.bidType === 'Direct Accept' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select id={`assign-${c.id}`} disabled={!canAccept} style={{ flex: 1, padding: '8px', background: T.panel, color: T.ivory, border: `1px solid ${T.border}`, fontSize: '12px' }}>
                          {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length === 0 ? (
                            <option value="">No idle vehicles available</option>
                          ) : (
                            <option value="">Select available vehicle...</option>
                          )}
                          {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).map(v => (
                            <option key={v.id} value={v.id} disabled={v.capacity < c.requiredCapacity || v.condition <= 40}>
                              {v.type} (Cap: {v.capacity}, Cond: {v.condition}%) {v.capacity < c.requiredCapacity ? '- Too Small' : v.condition <= 40 ? '- Needs Repair' : ''}
                            </option>
                          ))}
                        </select>
                        <GoldButton 
                          onClick={() => {
                            const sel = document.getElementById(`assign-${c.id}`) as HTMLSelectElement;
                            if (sel && sel.value) handleDirectAccept(c.id, sel.value);
                          }}
                          disabled={!canAccept}
                        >
                          Accept & Dispatch
                        </GoldButton>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: T.muted }}>Bid Amount: $</span>
                          <input type="number" id={`bid-${c.id}`} defaultValue={c.payment} style={{ flex: 1, padding: '8px', background: T.panel, color: T.gold, border: `1px solid ${T.border}`, fontSize: '12px' }} disabled={!canAccept} />
                        </div>
                        <GoldButton 
                          onClick={() => {
                            const bidEl = document.getElementById(`bid-${c.id}`) as HTMLInputElement;
                            if (bidEl && bidEl.value) {
                              const bidAmount = parseInt(bidEl.value);
                              const { evaluatePlayerBid } = require('@/lib/businessCore');
                              const res = evaluatePlayerBid(c.id, company.id, bidAmount);
                              showNotif(res.message, res.accepted);
                              onRefresh();
                            }
                          }}
                          disabled={!canAccept}
                        >
                          Submit Bid
                        </GoldButton>
                      </div>
                    )}
                  </PanelBox>
                );
              })}
              {filteredContracts.length === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', color: T.faint, fontSize: '12px', border: `1px dashed ${T.border}` }}>
                  No contracts found matching your filters.
                </div>
              )}
            </div>
          </div>
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Eligibility Summary</SectionHeader>
              <FieldRow label="Available Vehicles" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length} />
              <FieldRow label="Total Capacity" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).reduce((s, v) => s + v.capacity, 0)} />
              <FieldRow label="Highest Avail Capacity" value={Math.max(0, ...fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).map(v => v.capacity))} />
              <FieldRow label="Company Reliability" value={company.reliability} />
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Contract Pipeline</SectionHeader>
              <FieldRow label="Active" value={activeContracts.length} valueColor={T.gold} />
              <FieldRow label="Completed" value={contractHistory.filter(h => h.result === 'completed').length} />
              <FieldRow label="Failed" value={contractHistory.filter(h => h.result === 'failed').length} valueColor={T.red} />
            </PanelBox>
            <PanelBox>
              <SectionHeader>Suggested Contracts</SectionHeader>
              <div style={{ fontSize: '11px', color: T.faint }}>
                {filteredContracts.filter(c => fleet.some(v => v.capacity >= c.requiredCapacity)).length} contracts match your current fleet capacity.
              </div>
            </PanelBox>
          </div>
        </div>
      )}

      {deskTab === 'contractHistory' && (
        <div>
          <SectionHeader stamp="RECORDS">Contract History</SectionHeader>
          {contractHistory.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: T.faint, fontSize: '12px', border: `1px solid ${T.border}` }}>
              No contracts resolved yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contractHistory.map(h => (
                <div key={h.id} style={{ background: T.paper, border: `1px solid ${T.border}`, padding: '16px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', color: h.result === 'completed' ? T.mint : T.red }}>{h.result}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{h.title}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: T.muted }}>Issuer: {h.issuer}</div>
                    <div style={{ fontSize: '11px', color: T.muted }}>Route: {h.originState} → {h.destinationState}</div>
                    <div style={{ fontSize: '11px', color: T.muted }}>Vehicle: {h.vehicleName}</div>
                    {h.trustImpact && <div style={{ fontSize: '11px', color: h.trustImpact === 'Improved' ? T.mint : h.trustImpact === 'Decreased' ? T.red : T.faint }}>Trust: {h.trustImpact}</div>}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '14px', fontFamily: 'monospace', color: h.result === 'completed' ? T.mint : T.muted }}>Pay: {formatMoney(h.payment)}</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: T.faint }}>Cost: {formatMoney(h.operatingCost)}</div>
                    {h.penalty > 0 && <div style={{ fontSize: '11px', fontFamily: 'monospace', color: T.red }}>Penalty: {formatMoney(h.penalty)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {deskTab === 'routes' && (
        <div>
          <SectionHeader>Route Matrix</SectionHeader>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
            {ROUTE_FILTER_OPTIONS.map(opt => (
              <GhostButton key={opt.value} color={routeFilter === opt.value ? T.ivory : T.faint} onClick={() => setRouteFilter(opt.value)}>{opt.label}</GhostButton>
            ))}
          </div>
          {routeFilter === 'International' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', border: `1px dashed ${T.border}`, textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: T.muted }}>International logistics will unlock later through ports, customs, shipping fleets, and cross-country trade contracts.</div>
            </div>
          )}
          {routeFilter !== 'International' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              {Array.from(new Set([...routes.map(r => r.id), 'Drennport-Westport', 'Drennport-Ironvale', 'Drennport-Greenmere', 'Westport-Ironvale', 'Westport-Greenmere', 'Ironvale-Greenmere', 'Drennport-Drennport', 'Westport-Westport', 'Ironvale-Ironvale', 'Greenmere-Greenmere'])).filter(rId => {
                if (routeFilter === 'Local') return rId.split('-')[0] === rId.split('-')[1];
                if (routeFilter === 'Interstate') return rId.split('-')[0] !== rId.split('-')[1];
                return true;
              }).map(rId => {
                const rName = rId.replace('-', ' State → ') + ' State';
                const fam = routes.find(r => r.id === rId)?.familiarity || 0;
                return (
                  <div key={rId} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: T.paper, border: `1px solid ${T.border}` }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: T.ivory, marginBottom: '6px' }}>{rName}</div>
                      <div style={{ fontSize: '10px', color: T.muted, fontFamily: 'monospace' }}>Distance: Variable · Risk: Low · Demand: Variable</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.faint }}>Familiarity</div>
                      <div style={{ fontSize: '16px', fontFamily: 'monospace', color: fam > 0 ? T.mint : T.faint }}>{fam}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ fontSize: '11px', color: T.muted, marginTop: '16px' }}>Higher familiarity will reduce operating costs in future updates.</p>
        </div>
      )}

      {deskTab === 'finance' && (
        <div className="business-content-grid">
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px', marginBottom: '16px' }}>
            <GhostButton color={financeSubTab === 'overview' ? T.ivory : T.faint} onClick={() => setFinanceSubTab('overview')}>Overview & Policies</GhostButton>
            <GhostButton color={financeSubTab === 'monthly' ? T.ivory : T.faint} onClick={() => setFinanceSubTab('monthly')}>Month Report</GhostButton>
            <GhostButton color={financeSubTab === 'ledger' ? T.ivory : T.faint} onClick={() => setFinanceSubTab('ledger')}>General Ledger</GhostButton>
            <GhostButton color={financeSubTab === 'history' ? T.ivory : T.faint} onClick={() => setFinanceSubTab('history')}>Finance History</GhostButton>
            <GhostButton color={financeSubTab === 'charts' ? T.ivory : T.faint} onClick={() => setFinanceSubTab('charts')}>Charts & Data</GhostButton>
          </div>

          {financeSubTab === 'overview' && (
            <>
              <div>
                <SectionHeader>Finance Desk</SectionHeader>
                <PanelBox style={{ marginBottom: '24px' }}>
                  <SectionHeader stamp="LEDGER">Company Financials</SectionHeader>
                  <FieldRow label="Available Cash" value={formatMoney(company.companyCash ?? 0)} valueColor={T.mint} />
                  <FieldRow label="Last Month Gross Revenue" value={formatMoney(company.monthlyRevenue || 0)} valueColor={T.mint} />
                  <FieldRow label="Last Month Operating Costs" value={formatMoney(company.monthlyCosts || 0)} valueColor={T.red} />
                  <FieldRow label="Last Month Net Profit" value={formatMoney(company.profit || 0)} valueColor={(company.profit || 0) >= 0 ? T.mint : T.red} />
                  <FieldRow label="Outstanding Debt" value={formatMoney(company.debt ?? 0)} valueColor={(company.debt ?? 0) > 0 ? T.burgundy : T.muted} />
                </PanelBox>
                
                <SectionHeader stamp="OWNERSHIP">Owner Capital Movement</SectionHeader>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px' }}>
                  Your personal cash: <span style={{ color: T.mint, fontWeight: 700, fontFamily: 'monospace' }}>{formatMoney(playerCash)}</span>
                  &nbsp;·&nbsp; Company cash: <span style={{ color: T.ivory, fontWeight: 700, fontFamily: 'monospace' }}>{formatMoney((company as any).finances?.available_cash ?? company.companyCash ?? 0)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  {(company.legalStructureId === 'public-corporation' || company.legalStructure === 'Corporation') ? (
                    <PanelBox>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: T.muted, marginBottom: '4px' }}>Market Capital Raising</div>
                      <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px' }}>
                        Public corporations cannot use ad-hoc owner injections. You must raise capital through the DRX Exchange (Rights Issues or Secondary Offerings).
                      </div>
                      <GhostButton color={T.muted} style={{ opacity: 0.5, cursor: 'not-allowed' }}>Managed via Exchange</GhostButton>
                    </PanelBox>
                  ) : (company.legalStructureId === 'private-company' || company.legalStructure === 'Private Company') ? (
                    <PanelBox>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: T.mint, marginBottom: '4px' }}>↓ Issue Shares</div>
                      <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px', minHeight: '34px' }}>Issue new shares to yourself to inject capital. Cash is transferred to company, and your equity increases.</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="number"
                          id="issue-shares-qty"
                          placeholder="Shares"
                          min={1}
                          style={{ flex: 1, padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.mint, fontSize: '12px', borderRadius: '3px', width: '80px' }}
                        />
                        <span style={{color: T.muted, fontSize: '12px'}}>@</span>
                        <input
                          type="number"
                          id="issue-shares-price"
                          placeholder="$ Price"
                          min={1}
                          style={{ flex: 1, padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.mint, fontSize: '12px', borderRadius: '3px', width: '80px' }}
                        />
                        <GoldButton onClick={async () => {
                          const qtyEl = document.getElementById('issue-shares-qty') as HTMLInputElement;
                          const priceEl = document.getElementById('issue-shares-price') as HTMLInputElement;
                          if (!qtyEl || !qtyEl.value || !priceEl || !priceEl.value) return;
                          const qty = parseInt(qtyEl.value);
                          const price = parseInt(priceEl.value);
                          if (qty <= 0 || price <= 0) return;
                          try {
                            const { companyApi } = await import('@/lib/api');
                            const res = await companyApi.issueShares(company.id, qty, price);
                            showNotif(res.data?.message || `Issued ${qty} shares for $${(qty*price).toLocaleString('en-US')}.`, true);
                            qtyEl.value = '';
                            priceEl.value = '';
                            onRefresh();
                          } catch (err: any) {
                            showNotif(err?.response?.data?.error || err?.response?.data?.message || err?.response?.data?.error || 'Issuance failed.', false);
                          }
                        }}>Issue</GoldButton>
                      </div>
                    </PanelBox>
                  ) : (
                    <PanelBox>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: T.mint, marginBottom: '4px' }}>↓ Inject Capital</div>
                      <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px', minHeight: '34px' }}>Transfer your personal cash into the company ledger (owner loan).</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="number"
                          id="inject-amount"
                          placeholder="$ Amount"
                          min={1}
                          style={{ flex: 1, padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.mint, fontSize: '12px', borderRadius: '3px' }}
                        />
                        <GoldButton onClick={async () => {
                          const el = document.getElementById('inject-amount') as HTMLInputElement;
                          if (!el || !el.value) return;
                          const amount = parseInt(el.value);
                          if (amount <= 0) return;
                          try {
                            const { companyApi } = await import('@/lib/api');
                            const res = await companyApi.injectCapital(company.id, amount);
                            showNotif(res.data?.message || `$${amount.toLocaleString('en-US')} injected successfully.`, true);
                            el.value = '';
                            onRefresh();
                          } catch (err: any) {
                            showNotif(err?.response?.data?.error || err?.response?.data?.message || err?.response?.data?.error || 'Injection failed.', false);
                          }
                        }}>Inject</GoldButton>
                      </div>
                    </PanelBox>
                  )}
                  
                  {(company.legalStructureId === 'public-corporation' || company.legalStructure === 'Corporation') ? (
                    <PanelBox>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: T.muted, marginBottom: '4px' }}>Dividend Distribution</div>
                      <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px' }}>
                        Public corporations cannot allow direct ad-hoc owner drawings. You must set a Dividend Policy to distribute profits to all shareholders fairly.
                      </div>
                      <GhostButton color={T.muted} style={{ opacity: 0.5, cursor: 'not-allowed' }}>Use Dividend Policy</GhostButton>
                    </PanelBox>
                  ) : (
                    <PanelBox>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: T.gold, marginBottom: '4px' }}>↑ Owner Drawings</div>
                      <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px', minHeight: '34px' }}>Withdraw company cash to your personal holdings.</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="number"
                          id="withdraw-amount"
                          placeholder="$ Amount"
                          min={1}
                          style={{ flex: 1, padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.gold, fontSize: '12px', borderRadius: '3px' }}
                        />
                        <GhostButton color={T.gold} onClick={async () => {
                          const el = document.getElementById('withdraw-amount') as HTMLInputElement;
                          if (!el || !el.value) return;
                          const amount = parseInt(el.value);
                          if (amount <= 0) return;
                          try {
                            const { companyApi } = await import('@/lib/api');
                            const res = await companyApi.withdrawCapital(company.id, amount);
                            showNotif(`$${amount.toLocaleString('en-US')} withdrawn to personal holdings.`, true);
                            el.value = '';
                            onRefresh();
                          } catch (err: any) {
                            showNotif(err?.response?.data?.error || err?.response?.data?.message || err?.response?.data?.error || 'Withdrawal failed.', false);
                          }
                        }}>Withdraw</GhostButton>
                      </div>
                    </PanelBox>
                  )}
                </div>

                <SectionHeader stamp="POLICIES">Company Financial Policies</SectionHeader>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
                  <PanelBox>
                    <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Maintenance Policy</div>
                    <select value={company.maintenancePolicy || 'Standard'} onChange={async (e) => {
                      const { companyApi } = await import('../../../lib/api');
                      const newPolicy = e.target.value;
                      try {
                        await companyApi.updateFinances(company.id, { maintenance_policy: newPolicy });
                        showNotif(`Maintenance policy updated to ${newPolicy}.`, true);
                        onRefresh();
                      } catch (err: any) {
                        showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to update policy', false);
                      }
                    }} style={{ padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.ivory, fontSize: '12px', width: '100%' }}>
                      <option value="Low">Low (Cost x0.75, Wear x1.25)</option>
                      <option value="Standard">Standard (Cost x1.00, Wear x1.00)</option>
                      <option value="Generous">Generous (Cost x1.25, Wear x0.75)</option>
                    </select>
                  </PanelBox>
                  <PanelBox>
                    <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Cash Reserve Policy</div>
                    <select value={company.cashReservePolicy || 'Growth'} onChange={async (e) => {
                      const newPolicy = e.target.value;
                      try {
                        const { companyApi: cApi } = await import('../../../lib/api');
                        await cApi.updateFinances(company.id, { cash_reserve_policy: newPolicy });
                        showNotif(`Cash reserve policy updated to ${newPolicy}.`, true);
                        onRefresh();
                      } catch (err: any) {
                        showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to update policy', false);
                      }
                    }} style={{ padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.ivory, fontSize: '12px', width: '100%' }}>
                      <option value="Conservative">Conservative Reserve</option>
                      <option value="Growth">Growth Focus</option>
                      <option value="Aggressive">Aggressive Expansion</option>
                    </select>
                  </PanelBox>
                </div>
              </div>
              
              <div>
                <PanelBox style={{ marginBottom: '16px' }}>
                  <SectionHeader>Performance</SectionHeader>
                  <FieldRow label="Company Value" value={formatMoney(companyValue)} valueColor={T.gold} />
                  <FieldRow label="Total Fleet Value" value={formatMoney(fleetValue)} valueColor={T.steel} />
                  <FieldRow label="Credit Rating" value="Unrated" />
                </PanelBox>
                <PanelBox style={{ marginBottom: '24px' }}>
                  <SectionHeader>Your Personal Finances</SectionHeader>
                  <FieldRow label="Cash in Hand" value={formatMoney(playerCash)} valueColor={T.ivory} />
                  <FieldRow label="Net Worth" value={formatMoney(netWorth)} valueColor={T.gold} />
                </PanelBox>

                <SectionHeader stamp="LENDING">Debt & Financing</SectionHeader>
                <PanelBox>
                  <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed ' + T.border, background: 'rgba(255,255,255,0.02)', color: T.muted, fontSize: '12px' }}>
                    Bank loans, corporate bonds, and credit facilities are currently unavailable.
                  </div>
                </PanelBox>
              </div>
            </>
          )}

          {financeSubTab === 'monthly' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <SectionHeader stamp="REPORTS">Monthly Financial Reports</SectionHeader>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: T.faint, textAlign: 'left', borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ padding: '8px 0' }}>Period</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>Revenue</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>Costs</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>Profit</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {financeHistory.map((snapshot: any, i: number) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}30` }}>
                      <td style={{ padding: '8px 0', color: T.ivory }}>{snapshot.gameDateStr}</td>
                      <td style={{ padding: '8px 0', color: T.mint, textAlign: 'right' }}>{formatMoney(snapshot.autoRevenue + snapshot.manualRevenue)}</td>
                      <td style={{ padding: '8px 0', color: T.red, textAlign: 'right' }}>{formatMoney(snapshot.operatingCosts)}</td>
                      <td style={{ padding: '8px 0', color: snapshot.netProfit >= 0 ? T.mint : T.red, textAlign: 'right' }}>{formatMoney(snapshot.netProfit)}</td>
                      <td style={{ padding: '8px 0', color: T.ivory, textAlign: 'right' }}>{formatMoney(company.companyCash || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {financeSubTab === 'ledger' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <SectionHeader stamp="TRANSACTIONS">General Ledger</SectionHeader>
              {ledger.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: T.faint, border: `1px solid ${T.border}` }}>No ledger entries found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 150px 2fr 100px 100px', padding: '8px', borderBottom: `1px solid ${T.border}`, fontSize: '10px', color: T.faint, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                    <div>Date</div>
                    <div>Type</div>
                    <div>Description</div>
                    <div style={{ textAlign: 'right' }}>Income</div>
                    <div style={{ textAlign: 'right' }}>Expense</div>
                  </div>
                  {ledger.map(entry => {
                    const entryAmt = Number(entry.amount);
                    const isIncome = entryAmt > 0;
                    const dateStr = entry.game_year && entry.game_month
                      ? `M${entry.game_month} Y${entry.game_year}`
                      : '-';
                    return (
                      <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '100px 150px 2fr 100px 100px', padding: '12px 8px', background: T.panel, borderBottom: `1px solid ${T.border}`, fontSize: '12px', alignItems: 'center' }}>
                        <div style={{ color: T.muted }}>{dateStr}</div>
                        <div style={{ color: entry.entry_type === 'Revenue' ? T.mint : T.gold }}>{entry.entry_type || entry.type}</div>
                        <div style={{ color: T.ivory }}>{entry.description}</div>
                        <div style={{ textAlign: 'right', color: T.mint }}>{isIncome ? formatMoney(entryAmt) : '-'}</div>
                        <div style={{ textAlign: 'right', color: T.red }}>{!isIncome ? formatMoney(Math.abs(entryAmt)) : '-'}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {financeSubTab === 'history' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <SectionHeader stamp="SNAPSHOTS">Month Finance History</SectionHeader>
              {financeHistory.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: T.faint, border: `1px solid ${T.border}` }}>No financial history available yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {financeHistory.map(snapshot => (
                    <div key={snapshot.id} style={{ border: `1px solid ${T.border}`, padding: '16px', background: T.panel }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{snapshot.label}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: snapshot.netProfit >= 0 ? T.mint : T.red }}>{snapshot.netProfit >= 0 ? '+' : ''}{formatMoney(snapshot.netProfit)}</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '12px' }}>
                        <div>
                          <div style={{ color: T.muted, marginBottom: '4px' }}>Revenue</div>
                          <div style={{ color: T.mint }}>{formatMoney(snapshot.totalOperatingRevenue)}</div>
                        </div>
                        <div>
                          <div style={{ color: T.muted, marginBottom: '4px' }}>Expenses</div>
                          <div style={{ color: T.red }}>{formatMoney(snapshot.totalOperatingExpenses)}</div>
                        </div>
                        <div>
                          <div style={{ color: T.muted, marginBottom: '4px' }}>Ending Cash</div>
                          <div style={{ color: T.ivory }}>{formatMoney(snapshot.endingCash)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {financeSubTab === 'charts' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <SectionHeader stamp="VISUALS">Charts & Analysis</SectionHeader>
              <PanelBox style={{ textAlign: 'center', padding: '40px 20px', color: T.muted, fontStyle: 'italic' }}>
                <div style={{ fontSize: '24px', marginBottom: '16px' }}>📊</div>
                <div>Advanced financial charting is currently locked in the pre-alpha build.</div>
                <div style={{ fontSize: '11px', marginTop: '8px', color: T.faint }}>Visual analytics will become available in a future update.</div>
              </PanelBox>
            </div>
          )}
        </div>
      )}

      {deskTab === 'assets' && (
        <AssetsTab company={company} fleet={fleet} onRefresh={onRefresh} showNotif={showNotif} setDeskTab={setDeskTab} />
      )}

      {deskTab === 'records' && (
        <div>
          <SectionHeader>Company Ledger & Records</SectionHeader>
          {records.length === 0 ? <p style={{ fontSize: '12px', color: T.faint }}>No records found.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {records.map((r: any) => (
                <div key={r.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${r.type === 'failure' ? T.red : r.type === 'business' ? T.gold : T.mint}`, fontSize: '12px', color: T.ivory, lineHeight: 1.6 }}>
                  {r.summary}
                  <div style={{ fontSize: '10px', color: T.faint, marginTop: '6px' }}>{new Date(r.createdAt).toLocaleString('en-US')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {deskTab === 'equity' && (
        <EquityDeskTab companyId={company.id} companyName={company.name} />
      )}
    </div>
  );
}

function AssetsTab({ company, fleet, onRefresh, showNotif, setDeskTab }: any) {
  const vehicleAssetValue = fleet.reduce((sum:any, v:any) => sum + Math.round(v.purchaseCost * (v.condition / 100)), 0);
  const totalLeasedCost = (company.facilities || []).reduce((sum:any, f:any) => sum + f.leaseCost, 0);

  return (
    <div className="business-content-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <SectionHeader>Company Assets Portfolio</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <PanelBox>
            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Vehicle Asset Value</div>
            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.mint, fontWeight: 700 }}>{formatMoney(vehicleAssetValue)}</div>
            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>{fleet.length} active units</div>
          </PanelBox>
          <PanelBox>
            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Facility Lease Position</div>
            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.steel, fontWeight: 700 }}>{formatMoney(totalLeasedCost)}/mo</div>
            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>{(company.facilities || []).length} active leases</div>
          </PanelBox>
          <PanelBox>
            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Property Value</div>
            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.faint, fontWeight: 700 }}>$0</div>
            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>Locked (Land Purchasing)</div>
          </PanelBox>
          <PanelBox>
            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Total Company Asset Value</div>
            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.gold, fontWeight: 700 }}>{formatMoney(calcCompanyValue(company))}</div>
            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>Includes cash & depreciated fleet</div>
          </PanelBox>
        </div>

        <SectionHeader>Asset Details</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          <div style={{ border: '1px solid ' + T.border, background: 'rgba(0,0,0,0.2)', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700, marginBottom: '12px' }}>Vehicle Assets</div>
            {fleet.length === 0 ? <div style={{ fontSize: '11px', color: T.faint }}>No vehicles owned.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fleet.map((v:any) => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed ' + T.border, paddingBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: T.muted }}>{v.type} ({v.condition}%)</span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: T.ivory }}>{formatMoney(Math.round(v.purchaseCost * (v.condition / 100)))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ border: '1px solid ' + T.border, background: 'rgba(0,0,0,0.2)', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700, marginBottom: '12px' }}>Facility Assets (Leased)</div>
            {(company.facilities || []).length === 0 ? <div style={{ fontSize: '11px', color: T.faint }}>No facilities leased.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(company.facilities || []).map((f:any, i:number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed ' + T.border, paddingBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: T.muted }}>{f.type} <span style={{ color: T.faint }}>({getStateName(f.stateId || f.state) || f.state})</span></span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: T.steel }}>{formatMoney(f.leaseCost)}/mo</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ border: '1px solid ' + T.border, background: 'rgba(0,0,0,0.2)', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: T.faint, fontWeight: 700, marginBottom: '12px' }}>Expansion Sites</div>
            <div style={{ fontSize: '11px', color: T.faint }}>Locked (Future construction update).</div>
          </div>
        </div>
      </div>

      <div>
        <PanelBox>
          <SectionHeader stamp="MANAGEMENT">Asset Controls</SectionHeader>
          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', lineHeight: 1.6 }}>
            Facilities are managed in the Facilities tab. Vehicle purchases are managed in Fleet or Business Market. This Assets tab serves as your aggregated asset value summary.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <GhostButton onClick={() => setDeskTab('facilities')}>Open Facilities</GhostButton>
            <GhostButton onClick={() => setDeskTab('fleet')}>Open Fleet</GhostButton>
            <GhostButton onClick={() => {}} disabled>Open Market (Locked)</GhostButton>
          </div>
        </PanelBox>
      </div>
    </div>
  );
}

function FacilitiesTab({ company, onRefresh, showNotif }: any) {
  const defaultState = company.headquartersStateId || company.state || 'drennia-drennport';
  const [selectedStates, setSelectedStates] = React.useState<Record<string, string>>({
    'Office': defaultState,
    'Vehicle Yard': defaultState,
    'Small Depot': defaultState,
    'Warehouse': defaultState,
    'Regional Branch Office': defaultState,
    'Freight Yard': defaultState,
    'Port Warehouse': defaultState,
    'Port Terminal': defaultState,
  });

  const handleLease = async (type: any, leaseCost: number) => {
    try {
      const stateId = selectedStates[type] || company.headquartersStateId || company.state;
      // Correct duplicate check: compare against state_id (the real DB column name)
      const alreadyLeased = (company.facilities || []).some(
        (f: any) => f.type === type && (f.state_id === stateId || f.stateId === stateId)
      );
      if (alreadyLeased) {
        showNotif(`You already lease a ${type} in ${getStateName(stateId)}.`, false);
        return;
      }
      
      const { logisticsApi } = require('../../../lib/api');
      const proc = await logisticsApi.getProcurement();
      const catalogItem = proc.data.facilities.find((f: any) => f.type === type);
      
      if (!catalogItem) {
        showNotif('Facility not found in catalog', false);
        return;
      }

      await logisticsApi.leaseFacility(company.id, catalogItem.id, stateId);
      showNotif(`Leased ${type} successfully.`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Lease failed', false);
    }
  };

  const availableProperties = [
    { type: 'Office', leaseCost: 10000, benefit: 'Provides legitimacy and client trust later.', leaseable: true },
    { type: 'Vehicle Yard', leaseCost: 15000, benefit: '+2 vehicle support capacity in selected state.', leaseable: true },
    { type: 'Small Depot', leaseCost: 25000, benefit: 'Improves local courier and port shuttle operations.', leaseable: true },
    { type: 'Warehouse', leaseCost: 40000, benefit: 'Unlocks storage and larger retail restock contracts.', leaseable: true },
    { type: 'Regional Branch Office', leaseCost: 30000, benefit: 'Expands business presence to another state.', leaseable: true },
    { type: 'Freight Yard', leaseCost: 70000, benefit: 'Supports larger interstate freight and heavy cargo.', leaseable: true },
    { type: 'Port Warehouse', leaseCost: 90000, benefit: 'Improves port shuttle and port freight contracts.', leaseable: true },
    { type: 'Port Terminal', leaseCost: 250000, benefit: 'Coastal and international shipping later.', leaseable: false, note: 'Locked / later' },
  ];

  return (
    <div className="business-content-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <SectionHeader>Current Facilities</SectionHeader>
        {(company.facilities || []).length === 0 ? (
          <PanelBox style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '11px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>No facilities leased</div>
          </PanelBox>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {(company.facilities || []).map((f:any, i:number) => (
              <div key={i} style={{ background: T.panel, border: '1px solid ' + T.border, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {f.type}
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', color: T.faint, padding: '2px 6px', borderRadius: '2px' }}>{getStateName(f.stateId || f.state) || f.state}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px' }}>Active Lease</div>
                </div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', color: T.steel, fontWeight: 700 }}>
                  {formatMoney(f.leaseCost)}/mo
                </div>
              </div>
            ))}
          </div>
        )}

        <SectionHeader>Available Facilities</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {availableProperties.map(fac => (
            <div key={fac.type} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid ' + T.border, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{fac.type}</div>
                  <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px', maxWidth: '400px', lineHeight: 1.5 }}>Benefit: {fac.benefit}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontFamily: 'monospace', color: fac.leaseable ? T.mint : T.faint, fontWeight: 700 }}>
                    {fac.leaseable ? `${formatMoney(fac.leaseCost)}/mo` : '---'}
                  </div>
                </div>
              </div>
              {fac.leaseable ? (
                <div style={{ borderTop: '1px dashed ' + T.border, paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: T.faint, textTransform: 'uppercase' }}>State:</span>
                    <select 
                      value={selectedStates[fac.type] || company.headquartersStateId}
                      onChange={e => setSelectedStates({ ...selectedStates, [fac.type]: e.target.value })}
                      style={{ background: T.bg, border: '1px solid ' + T.border, color: T.ivory, fontSize: '11px', padding: '4px 8px', fontFamily: 'monospace' }}
                    >
                      <option value="drennia-drennport">Drennport State</option>
                      <option value="drennia-westport">Westport State</option>
                      <option value="drennia-ironvale">Ironvale State</option>
                      <option value="drennia-greenmere">Greenmere State</option>
                    </select>
                  </div>
                  <GhostButton onClick={() => handleLease(fac.type, fac.leaseCost)} color={T.mint}>Lease Facility</GhostButton>
                </div>
              ) : (
                <div style={{ borderTop: '1px dashed ' + T.border, paddingTop: '12px', fontSize: '11px', color: T.faint, fontStyle: 'italic' }}>
                  {fac.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <PanelBox>
          <SectionHeader stamp="OVERVIEW">Facility Effects</SectionHeader>
          <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.6 }}>
            Facilities form the backbone of your operations. Leasing property in different states unlocks regional contracts, increases vehicle capacity, and enables storage/transfer capabilities.
          </div>
        </PanelBox>
      </div>
    </div>
  );
}

function RegistryTab({ company, onRefresh }: { company: Company | null; onRefresh?: () => void }) {
  const [all, setAll] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    setFetchError(null);
    import('../../../lib/api').then(({ registryApi }) => {
      registryApi.getCompanies()
        .then(res => {
          setAll(Array.isArray(res.data) ? res.data : []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Registry fetch failed:', err);
          setFetchError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to load registry. Check your connection.');
          setLoading(false);
        });
    });
  }, []);

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <SectionHeader stamp="PUBLIC RECORD">Drennia Commercial Registry</SectionHeader>
        <button
          onClick={onRefresh}
          style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 12px', cursor: 'pointer' }}
        >
          ↺ Refresh
        </button>
      </div>
      {loading ? (
        <PanelBox><p style={{ fontSize: '12px', color: T.muted }}>Loading registry from server…</p></PanelBox>
      ) : fetchError ? (
        <PanelBox>
          <p style={{ fontSize: '12px', color: T.red, marginBottom: '8px' }}>⚠ {fetchError}</p>
          <p style={{ fontSize: '11px', color: T.faint }}>Try clicking Refresh above. If the problem persists, please report it.</p>
        </PanelBox>
      ) : all.length === 0 ? (
        <PanelBox><p style={{ fontSize: '12px', color: T.faint }}>No companies registered yet. Be the first to file!</p></PanelBox>
      ) : (
        <>
          <p style={{ fontSize: '10px', fontFamily: 'monospace', color: T.faint, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {all.length} registered {all.length === 1 ? 'company' : 'companies'} — all active businesses in pre-alpha world
          </p>
          {all.map(c => (
            <div key={c.id} style={{ background: T.panel, border: `1px solid ${c.id === company?.id ? T.gold : T.border}`, padding: '14px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: c.id === company?.id ? T.gold : T.ivory }}>
                    {c.name} {c.id === company?.id && <span style={{ fontSize: '9px', color: T.gold, fontFamily: 'monospace' }}>(Your Company)</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: T.muted, marginTop: '3px' }}>
                    {getLegalStructureName(c.legal_structure_id)} · {getSectorName(c.industry_id)} · {getStateName(c.headquarters_state_id)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.mint, textTransform: 'uppercase' }}>{c.status}</div>
                  {c.created_at_world_year !== undefined && c.created_at_world_year !== null && (
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint }}>{formatWorldDate(c.created_at_world_year, c.created_at_world_month)}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── FINANCE TAB ─────────────────────────────────────────────────────────────
function FinanceTab({ company, fleet, playerCash, netWorth }: { company: Company; fleet: Vehicle[]; playerCash: number; netWorth: number }) {
  const fleetValue = fleet.reduce((acc: any, v: any) => acc + (v.currentValue || Math.round(v.purchaseCost * (v.condition / 100))), 0);
  const companyValue = Number(company.companyCash || 0) + fleetValue - Number(company.debt || 0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '760px' }}>
      <PanelBox>
        <SectionHeader stamp="LEDGER">Company Financials</SectionHeader>
        <FieldRow label="Company Cash" value={formatMoney(company.companyCash ?? 0)} valueColor={T.mint} />
        <FieldRow label="Debt" value={formatMoney(company.debt ?? 0)} valueColor={(company.debt ?? 0) > 0 ? T.red : T.muted} />
        {company.lastMonthlyReport ? (
          <>
            <FieldRow label="Last Month Gross Revenue" value={formatMoney(company.lastMonthlyReport.autoRevenue + company.lastMonthlyReport.manualRevenue)} valueColor={T.mint} />
            <FieldRow label="Last Month Operating Costs" value={formatMoney(company.lastMonthlyReport.operatingCosts + company.lastMonthlyReport.payrollExpense + company.lastMonthlyReport.totalMaintenance + company.lastMonthlyReport.facilityLeaseExpense)} valueColor={T.red} />
            <FieldRow label="Last Month Net Profit" value={formatMoney(company.lastMonthlyReport.netProfit)} valueColor={company.lastMonthlyReport.netProfit >= 0 ? T.mint : T.red} />
          </>
        ) : (
          <div style={{ fontSize: '11px', color: T.faint, fontStyle: 'italic', marginTop: '12px', padding: '8px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
            No Month processed yet.
          </div>
        )}
      </PanelBox>
      <PanelBox>
        <SectionHeader stamp="NET WORTH">Personal Balance Sheet</SectionHeader>
        <FieldRow label="Cash in Hand" value={formatMoney(playerCash)} valueColor={T.mint} />
        <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
        <FieldRow label="Vehicle Assets" value={formatMoney(fleetValue)} valueColor={T.steel} />
        <FieldRow label="Company Value" value={formatMoney(companyValue)} valueColor={T.gold} />
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Net Worth</span>
          <span style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>{formatMoney(netWorth)}</span>
        </div>
      </PanelBox>
    </div>
  );
}


// ─── PROCUREMENT TAB ──────────────────────────────────────────────────────────
function ProcurementTab({ company, onRefresh, showNotif }: any) {
  const [procTab, setProcTab] = React.useState<'orders' | 'used' | 'facilities'>('orders');

  const handleOrder = async (type: string) => {
    try {
      const { logisticsApi } = require('../../../lib/api');
      const proc = await logisticsApi.getProcurement();
      const catalogItem = proc.data.vehicles.find((v: any) => v.type === type);
      
      if (!catalogItem) {
        showNotif('Vehicle not found in catalog', false);
        return;
      }

      await logisticsApi.purchaseVehicle(company.id, catalogItem.id);
      showNotif(`Purchased ${type} successfully.`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.error || err?.response?.data?.message || 'Purchase failed', false);
    }
  };

  const handleLease = async (type: string, cost: number, state: string) => {
    try {
      const { logisticsApi } = require('../../../lib/api');
      const proc = await logisticsApi.getProcurement();
      const catalogItem = proc.data.facilities.find((f: any) => f.type === type);
      
      if (!catalogItem) {
        showNotif('Facility not found in catalog', false);
        return;
      }

      await logisticsApi.leaseFacility(company.id, catalogItem.id);
      showNotif(`Leased ${type} successfully.`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Lease failed', false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', gap: '16px', borderBottom: `1px solid ${T.border}`, paddingBottom: '16px' }}>
        <button onClick={() => setProcTab('orders')} style={{ background: 'none', border: 'none', color: procTab === 'orders' ? T.gold : T.muted, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '11px' }}>New Vehicle Orders</button>
        <button onClick={() => setProcTab('used')} style={{ background: 'none', border: 'none', color: procTab === 'used' ? T.gold : T.muted, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '11px' }}>Used Market (🔒)</button>
        <button onClick={() => setProcTab('facilities')} style={{ background: 'none', border: 'none', color: procTab === 'facilities' ? T.gold : T.muted, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '11px' }}>Facility Leasing</button>
      </div>

      {procTab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {VEHICLE_CATALOGUE.map(v => (
            <PanelBox key={v.type}>
              <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Drennport Motor Works</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '12px' }}>{v.type}</div>
              <FieldRow label="Cost" value={formatMoney(v.cost)} valueColor={T.red} />
              <FieldRow label="Capacity" value={`${v.capacity} Units`} />
              <FieldRow label="Condition" value="100% (New)" valueColor={T.mint} />
              <div style={{ marginTop: '16px' }}>
                <GoldButton onClick={() => handleOrder(v.type)} disabled={company.companyCash < v.cost}>
                  Order Vehicle
                </GoldButton>
              </div>
            </PanelBox>
          ))}
        </div>
      )}

      {procTab === 'used' && (
        <PanelBox>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: T.gold, marginBottom: '8px' }}>Used Vehicle Market Locked</div>
            <div style={{ color: T.muted, fontSize: '12px' }}>Check back later for discounted, lower-condition fleet additions.</div>
          </div>
        </PanelBox>
      )}

      {procTab === 'facilities' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <PanelBox>
            <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '4px' }}>Drennport Small Depot</div>
            <p style={{ fontSize: '12px', color: T.muted, marginBottom: '16px' }}>Local storage for up to 3 vehicles.</p>
            <FieldRow label="Lease per Month" value={formatMoney(15000)} valueColor={T.red} />
            <FieldRow label="Vehicle Slots" value="3" />
            <div style={{ marginTop: '16px' }}>
              <GoldButton onClick={() => handleLease('Small Depot', 15000, 'Drennport State')} disabled={company.companyCash < 15000}>
                Sign Lease
              </GoldButton>
            </div>
          </PanelBox>
          <PanelBox>
            <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '4px' }}>Westport Medium Yard</div>
            <p style={{ fontSize: '12px', color: T.muted, marginBottom: '16px' }}>Standard logistics yard with basic maintenance facilities.</p>
            <FieldRow label="Lease per Month" value={formatMoney(45000)} valueColor={T.red} />
            <FieldRow label="Vehicle Slots" value="10" />
            <div style={{ marginTop: '16px' }}>
              <GoldButton onClick={() => handleLease('Medium Yard', 45000, 'Westport State')} disabled={company.companyCash < 45000}>
                Sign Lease
              </GoldButton>
            </div>
          </PanelBox>
        </div>
      )}
    </div>
  );
}

// ─── DRENNPORT EXCHANGE TAB ─────────────────────────────────────────────────────────
function DrennportExchangeTab() {
  const router = require('next/navigation').useRouter();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '1000px' }}>
      
      {/* Westport Bourse */}
      <div
        style={{ background: T.paper, border: `1px solid ${T.borderGold}`, padding: '24px', cursor: 'pointer' }}
        onClick={() => router.push('/drennia/exchange')}
        role="link"
        aria-label="Open the Westport Bourse share exchange"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '6px' }}>Westport Bourse</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: T.ivory, marginBottom: '8px' }}>Share Market — Open for Trading</div>
            <p style={{ fontSize: '12px', color: T.muted, lineHeight: 1.7, maxWidth: '480px', margin: 0 }}>
              Trade shares of player-owned Public Corporations on a live order book. 
              Convert your company to a Public Corporation ($250,000 minimum value) to IPO and raise capital.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.faint, marginBottom: '4px' }}>Listing Requires</div>
            <div style={{ fontSize: '11px', color: T.gold, fontFamily: 'monospace' }}>Public Corporation Structure</div>
            <div style={{ fontSize: '11px', color: T.gold, fontFamily: 'monospace' }}>$250,000 Company Value Min.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: '11px', color: T.muted, fontFamily: 'monospace' }}>
            Limit orders · price-time priority · instant settlement · player companies only
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '10px', color: T.mint, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', alignSelf: 'flex-end' }}>
            Enter the Bourse →
          </div>
        </div>
      </div>

      {/* Private Capital Market */}
      <div
        style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '24px', cursor: 'pointer' }}
        onClick={() => router.push('/drennia/investments')}
        role="link"
        aria-label="Open the Private Capital Market for placements and loans"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.steel, marginBottom: '6px' }}>Drennia Commerce Division</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: T.ivory, marginBottom: '8px' }}>Private Capital Market</div>
            <p style={{ fontSize: '12px', color: T.muted, lineHeight: 1.7, maxWidth: '520px', margin: 0 }}>
              Trade equity in private and unlisted companies via fixed-price placements, and post or accept player-to-player loans.
              No minimum value requirement — available to all company structures except Sole Trader.
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.faint, marginBottom: '4px' }}>Instruments</div>
            <div style={{ fontSize: '11px', color: T.steel, fontFamily: 'monospace' }}>Private Equity Placements</div>
            <div style={{ fontSize: '11px', color: T.steel, fontFamily: 'monospace' }}>Player-to-Player Loans</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: '11px', color: T.muted, fontFamily: 'monospace' }}>
            Fixed-price blocks · shareholder cap enforced · amortized monthly repayments · escrow model
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '10px', color: T.steel, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', alignSelf: 'flex-end' }}>
            Open Private Market →
          </div>
        </div>
      </div>

    </div>
  );
}

