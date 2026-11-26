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
import BanksTab from './BanksTab';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import {
  Card, Button, StatChip, StatCard, DataRow, Badge, StatusDot, SectionHeading, TerminalPanel, Tabs, PageShell, PageHeader, HeaderStat
} from '@/components/ui';
import { BookOpen, ArrowLeft, Briefcase, TrendingUp, Wallet, Lock, Building2, Landmark, FileText, ArrowRight, ScrollText, Scale } from 'lucide-react';

// Helpers to resolve standard IDs to display names in v1
const getStateName = (id?: string) => {
  if (!id) return 'Unknown State';
  if (id === 'drennia-drennport') return 'Drennport State';
  if (id === 'drennia-westport') return 'Westport State';
  if (id === 'drennia-ironvale') return 'Ironvale State';
  if (id === 'drennia-greenmere') return 'Greenmere State';
  // Other nations' states ("westmark-saltgate" -> "Saltgate")
  return id.replace(/^[a-z]+-/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
  bg: '#0B0D12',
  panel: '#13161E',
  panelSoft: '#1B1F29',
  paper: '#1E1B14',
  border: '#262B36',
  borderGold: 'rgba(232,184,75,0.22)',
  gold: '#E8B84B',
  ivory: '#ECEAE4',
  muted: '#A3A4AC',
  faint: '#868994',
  mint: '#4FB286',
  steel: '#4B6382',
  burgundy: '#8F3D3D',
  red: '#D9625A',
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
  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint mb-1">
    {children}
  </div>
);

const FieldRow = ({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) => (
  <div className="flex justify-between items-baseline py-2 border-b border-zinc-800/60 last:border-0">
    <span className="text-[13px] text-ink-dim">{label}</span>
    <span className="font-mono text-[13px] font-semibold" style={{ color: valueColor || '#ECEAE4' }}>{value}</span>
  </div>
);

const SectionHeader = ({ children, stamp }: { children: React.ReactNode; stamp?: string }) => (
  <div className="flex justify-between items-center mb-4">
    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
      {children}
    </div>
    {stamp && <div className="text-[11px] text-ink-faint border border-line px-2 py-0.5 rounded-full">{stamp}</div>}
  </div>
);

const PanelBox = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div className={`bg-surface border border-line rounded-2xl shadow-card p-5 ${className || ''}`} style={style}>
    {children}
  </div>
);

type GoldButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const GoldButton = ({ children, disabled, style, className, ...props }: GoldButtonProps & { className?: string }) => (
  <button
    disabled={disabled}
    className={`btn-primary ${className || ''}`}
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
    className={`btn-secondary ${disabled ? 'border-dashed text-ink-faint' : ''} ${className || ''}`}
    style={style}
  >
    {children}
  </button>
);

// ─── Filter types & Constants ──────────────────────────────────────────────────
export type RouteFilter = 'All' | 'Local' | 'Interstate' | 'International';
const ROUTE_FILTER_OPTIONS: Array<{ label: string; value: RouteFilter }> = [
  { label: 'All Routes', value: 'All' },
  { label: 'Local Routes', value: 'Local' },
  { label: 'Interstate Routes', value: 'Interstate' },
  { label: 'International Routes', value: 'International' },
];

export type ContractSourceFilter = 'All' | 'Government' | 'State-Owned Enterprise' | 'NPC Corporation' | 'Local Business' | 'Private Client' | 'Player Company';
const CONTRACT_SOURCE_FILTER_OPTIONS: Array<{ label: string; value: ContractSourceFilter; disabled?: boolean }> = [
  { label: 'All Sources', value: 'All' },
  { label: 'Government', value: 'Government' },
  { label: 'NPC Corporations', value: 'NPC Corporation' },
  { label: 'Local Businesses', value: 'Local Business' },
  { label: 'Player Companies (Locked)', value: 'Player Company', disabled: true },
];


const WAGE_POLICY_OPTIONS: Array<{ label: string; value: WagePolicy }> = [
  { label: 'Low Wages (0.8x)', value: 'Low' },
  { label: 'Standard Wages (1.0x)', value: 'Standard' },
  { label: 'Generous Wages (1.2x)', value: 'Generous' },
  { label: 'Premium Wages (1.45x)', value: 'Premium' },
];

// ─── Sub-tab types ────────────────────────────────────────────────────────────
type SubTab = 'overview' | 'start' | 'companies' | 'analytics' | 'banks' | 'exchange' | 'registry';

const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'start', label: 'Start Business' },
  { id: 'companies', label: 'My Companies', requiresCompany: true },
  { id: 'analytics', label: 'Analytics', requiresCompany: true },
  { id: 'exchange', label: 'Drennport Exchange' },
  { id: 'banks', label: 'Banks' },
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


// ─── FILING NUMBERS ──────────────────────────────────────────────────────────
// Mirror of the server's rules (backend/src/api/constants/companyAssets.ts OPEN_INDUSTRIES
// minCapital, checked again in company.controller createCompany). Change both together.
const SECTOR_MIN_CAPITAL = { manufacturing: 500_000, finance: 50_000 } as const;
const sectorMinCapital = (sectorId: string) =>
  sectorId === 'Manufacturing' ? SECTOR_MIN_CAPITAL.manufacturing : SECTOR_MIN_CAPITAL.finance;
/** One-off filing fee per legal structure. A Capital Partners firm is always 'private-company'. */
const FILING_FEES: Record<string, number> = { 'sole-trader': 500, 'private-company': 5_000, 'public-corporation': 50_000 };
const LEGAL_STRUCTURES = [
  { id: 'sole-trader', label: 'Sole Trader', desc: 'Simplest structure. Full ownership, full liability, lowest filing cost.' },
  { id: 'private-company', label: 'Private Company', desc: 'Separate legal entity. Add partners and issue private shares.' },
  { id: 'public-corporation', label: 'Corporation', desc: 'Full liability protection. Required for public trading.' },
] as const;

// ─── HQ OPTIONS ──────────────────────────────────────────────────────────────
// Loaded from the server (GET /companies/hq-options): the regions of the player's own nation.
type HqOption = { id: string; city: string; tagline: string; desc: string };

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
  const [showMfgGuide, setShowMfgGuide] = useState(false);
  const [mfgData, setMfgData] = useState<any>(null);
  const [financeCompany, setFinanceCompany] = useState<any>(null); // Capital Partners firm if player has one
  const [operationalCompanies, setOperationalCompanies] = useState<any[]>([]);
  const [apiNetWorth, setApiNetWorth] = useState<number | null>(null); // Server-computed net worth (all companies + inventory)

  // Start Business state
  const [step, setStep] = useState(1);
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedHQ, setSelectedHQ] = useState('');
  const [hqOptions, setHqOptions] = useState<HqOption[]>([]);
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
      companyApi.getHqOptions().then(d => setHqOptions(d.options)).catch(() => setHqOptions([]));
      characterApi.getMe()
        .then(res => {
          const char = res.data;
          setCharacterName(char.name);
          setPlayerCash(Number(char.finances?.cash_in_hand || 0));
          // Use the backend-computed net worth (includes all companies, inventory, finance firm)
          if (char.finances?.net_worth != null) {
            setApiNetWorth(Number(char.finances.net_worth));
          }

          const fileStr = localStorage.getItem('worldr_citizen_file_v1');
          if (fileStr) setCitizenFile(JSON.parse(fileStr));
          else setCitizenFile({ motherland: 'Drennia' });

          companyApi.getMy().then(compRes => {
            const companies = compRes.data;

            // Separate finance firm from operational companies
            const financeFirm = companies.find((c: any) => c.industry_id === 'finance') || null;
            setFinanceCompany(financeFirm);

            const opCompanies = companies.filter((c: any) => c.industry_id !== 'finance');
            opCompanies.sort((a: any, b: any) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());

            // IMPORTANT: loadData must NOT call setSelectedCompanyId here.
            // loadData is a stale closure (deps=[router]) that never captures the
            // current selectedCompanyId, so it would always reset the selection to
            // opCompanies[0] (Aldrich) regardless of what the user actually picked.
            // Initial selection is handled by the dedicated useEffect below.
            // Detail loading is handled by the selectedCompanyId useEffect.
            setOperationalCompanies(opCompanies);

            if (opCompanies.length === 0) {
              setCompany(null);
            }
          });
        })
        .catch(err => {
          if (err.response?.status === 404) {
             window.location.href = '/landing/onboarding.html?action=character';
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

  // Load detailed data when selectedCompanyId changes or when data refreshes
  useEffect(() => {
    if (!selectedCompanyId) {
      setCompany(null);
      return;
    }

    const comp = operationalCompanies.find(c => c.id === selectedCompanyId);
    if (!comp) {
      // If it's a finance company, operationalCompanies won't have it,
      // but we don't need 'company' state for the finance desk anyway.
      if (financeCompany && selectedCompanyId === financeCompany.id) {
        setCompany(null);
      }
      return;
    }

    // We do NOT return early if company?.id === comp.id here anymore.
    // Since loadData now only updates operationalCompanies, this effect
    // must run to fetch the latest detail data (like manufacturing/logistics)
    // for the selected company on every refresh.

    if (comp.industry_id === 'manufacturing') {
      import('../../../lib/api').then(({ manufacturingApi }) => {
        manufacturingApi.getCompanyData(comp.id).then(mfgRes => {
          setCompany({
            ...comp,
            sector: comp.industry_id,
            subsector: comp.subsector_id,
            state: comp.headquarters_state_id,
            legalStructure: comp.legal_structure_id,
            companyCash: comp.finances?.available_cash,
            debt: comp.finances?.debt,
            maintenancePolicy: comp.finances?.maintenance_policy || 'Standard',
          });
          setMfgData(mfgRes.data);
        }).catch(err => {
          console.error("Manufacturing fetch error", err);
          setCompany({
            ...comp,
            sector: comp.industry_id,
            state: comp.headquarters_state_id,
            legalStructure: comp.legal_structure_id,
            companyCash: comp.finances?.available_cash,
          });
        });
      });
    } else {
      import('../../../lib/api').then(({ logisticsApi }) => {
        logisticsApi.getCompanyLogistics(comp.id).then(logRes => {
          const { staff, vehicles, facilities, ledger } = logRes.data;
          const staffRecord: Record<string, number> = {};
          staff.forEach((s: any) => staffRecord[s.role] = s.quantity);
          const mappedFleet = vehicles.map((v: any, index: number) => {
            let tagPrefix = 'VEH';
            if (v.type.includes('Van')) tagPrefix = 'VAN';
            else if (v.type.includes('Box')) tagPrefix = 'BOX';
            else if (v.type.includes('Freight')) tagPrefix = 'FRT';
            return {
              id: v.id,
              companyId: v.company_id,
              type: v.type,
              catalogId: v.catalog_vehicle_id,
              condition: Number(v.condition),
              assignedAutoOpPool: v.assigned_operation_pool_name,
              purchasedAt: v.purchased_at,
              capacity: Number(v.capacity) || 0,
              purchaseCost: Number(v.purchase_cost) || 0,
              monthlyMaintenance: Number(v.monthly_maintenance) || 0,
              currentValue: Number(v.current_value) || 0,
              assetTag: `${tagPrefix}-${String(index + 1).padStart(3, '0')}`
            };
          });
          setCompany({
            ...comp,
            sector: comp.industry_id,
            state: comp.headquarters_state_id,
            legalStructure: comp.legal_structure_id,
            companyCash: comp.finances?.available_cash,
            maintenancePolicy: comp.finances?.maintenance_policy || 'Standard',
            staff: staffRecord
          });
          setFleet(mappedFleet);
          setLedger(ledger);
        }).catch(err => {
          console.error("Logistics fetch error", err);
          setCompany({
            ...comp,
            sector: comp.industry_id,
            state: comp.headquarters_state_id,
            legalStructure: comp.legal_structure_id,
            companyCash: comp.finances?.available_cash,
          });
        });
      });
    }
  }, [selectedCompanyId, operationalCompanies, company?.id]);

  // ─── Helpers ────────────────────────────────────────────────────────────
  const refreshAll = () => {
    loadData();
  };

  // ─── Net Worth ──────────────────────────────────────────────────────────
  // Fallback local calc (used only before API loads or as company-level breakdown)
  const calcCompanyValue = (comp: any) => {
    const fleetVal = fleet.reduce((acc, v) => acc + (v.currentValue || 0), 0);
    return Number(comp.companyCash || 0) + fleetVal - Number(comp.debt || 0);
  };
  // Prefer the server-computed value which correctly includes all companies + inventory
  const netWorth = apiNetWorth ?? (playerCash + (company ? calcCompanyValue(company) : 0));

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
                ? `${characterName} founded ${finalName} (Capital Partners firm) headquartered in ${hqOptions.find((h: HqOption) => h.id === selectedHQ)?.city || selectedHQ}, in ${formatGameDate(gDate)}.`
                : `${characterName} started ${finalName} (${selectedModel}) headquartered in ${hqOptions.find((h: HqOption) => h.id === selectedHQ)?.city || selectedHQ}, in ${formatGameDate(gDate)}.`,
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

  const companyCount = operationalCompanies.length + (financeCompany ? 1 : 0);
  const inDesk = activeTab === 'companies' && !!selectedCompanyId;
  const isManufacturer = company?.sector === 'manufacturing';
  const analyticsCompany: { id: string; countryId: string } | null = company
    ? { id: company.id, countryId: (company as any).country_id || company.countryId || 'drennia' }
    : operationalCompanies[0]
      ? { id: operationalCompanies[0].id, countryId: operationalCompanies[0].country_id || 'drennia' }
      : null;
  const guideButton = isManufacturer ? (
    <button
      type="button"
      onClick={() => setShowMfgGuide(true)}
      className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-[13px] font-medium text-ink-dim transition-colors hover:bg-white/5 hover:text-ink"
    >
      <BookOpen size={14} aria-hidden /> Manufacturing guide
    </button>
  ) : null;

  return (
    <div className="flex w-full flex-1 flex-col bg-bg text-ink">

      {/* ── Header: where you are, your real balances, the clock, then the sections ── */}
      <PageHeader
        kicker={company
          ? `${isManufacturer ? 'Car manufacturer' : 'Logistics'} · ${company.name}`
          : companyCount > 0
            ? `${companyCount} ${companyCount === 1 ? 'company' : 'companies'}`
            : 'Commercial registry'}
        title="Business"
        description={company || companyCount > 0
          ? 'Run your companies month by month, raise money from the banks and trade shares on the exchange.'
          : 'Register a company, run it month by month, and trade shares on the exchange.'}
        aside={
          <>
            <HeaderStat label="Net worth" value={formatMoney(netWorth)} tone="accent" />
            <HeaderStat label="Cash in hand" value={formatMoney(playerCash)} tone="good" />
            {company && <HeaderStat label="Company cash" value={formatMoney(company.companyCash ?? 0)} />}
            <div className="hidden sm:block"><WorldTimeControl /></div>
          </>
        }
      >
        {inDesk ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
            <nav aria-label="Breadcrumb">
              <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-[13px]">
                <li>
                  <button type="button" className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-ink-dim transition-colors hover:text-accent"
                    onClick={() => { setActiveTab('companies'); setSelectedCompanyId(null); }}>
                    <ArrowLeft size={14} aria-hidden /> My companies
                  </button>
                </li>
                <li aria-hidden className="text-ink-faint">/</li>
                <li aria-current="page" className="px-1 font-semibold text-accent">
                  {(selectedCompanyId === financeCompany?.id ? financeCompany?.name : company?.name) || 'Company'}
                </li>
              </ol>
            </nav>
            {guideButton}
          </div>
        ) : (
          <Tabs
            inset="none"
            label="Business sections"
            tabs={SUB_TABS.map(t => ({
              id: t.id,
              label: t.label,
              // Analytics reads the player's operating company (a finance firm has no car sales).
              locked: t.requiresCompany && (
                t.id === 'companies'
                  ? (operationalCompanies.length === 0 && !financeCompany)
                  : !analyticsCompany
              ),
            }))}
            activeId={activeTab}
            onChange={(id: string) => {
              setActiveTab(id as SubTab);
              if (id !== 'companies') setSelectedCompanyId(null);
            }}
            trailing={guideButton}
          />
        )}
      </PageHeader>

      {/* ── Manufacturing & Automobiles Guide Panel ── */}
      {showMfgGuide && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowMfgGuide(false); }}
        >
          <div style={{
            width: 480, maxWidth: '95vw', height: '100vh', overflowY: 'auto',
            background: 'rgba(8,10,18,0.98)', borderLeft: '1px solid rgba(34,197,94,0.2)',
            padding: '28px 28px 48px', display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ color: '#4ade80', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>Business Guide</div>
                <div style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '-0.01em' }}>Manufacturing &amp; Automobiles</div>
              </div>
              <button onClick={() => setShowMfgGuide(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            {([
              {
                icon: '🏭', title: 'The Core Loop',
                body: `Each game <strong style="color:#f1f5f9">arc = 1 month</strong>. The sequence every arc:<br/>
① Your Production Lines produce units → added to inventory.<br/>
② The arc tick runs: sales against every market you're allocated in.<br/>
③ Revenue is deposited. Manufacturing cost, factory lease, maintenance, staff wages, and marketing fees are deducted.<br/>
④ Net profit or loss flows to Company Cash.<br/><br/>
<em>Nothing happens automatically until the tick fires — plan your numbers before each arc closes.</em>`
              },
              {
                icon: '🔩', title: 'Factories & Production Lines',
                body: `Go to the <strong style="color:#f1f5f9">Factory tab</strong> to lease a factory. Every factory has:<br/>
• <strong style="color:#fbbf24">Capacity</strong> — max units/month across all lines (e.g. 100).<br/>
• <strong style="color:#fbbf24">Lease cost</strong> — fixed overhead every arc, regardless of output.<br/>
• <strong style="color:#fbbf24">Maintenance cost</strong> — recurring upkeep. Skipping it drops Condition.<br/>
• <strong style="color:#fbbf24">Condition %</strong> — falls over time. Below ~60% defect rate climbs fast.<br/><br/>
Each Production Line inside the factory is assigned <em>one vehicle model</em> and a <em>target units/month</em>. You need enough Factory Workers to meet target (Staffing tab shows required vs employed). Factories under construction produce <strong style="color:#ef4444">zero output</strong> — lease early.`
              },
              {
                icon: '📦', title: 'Procurement — Buying Components',
                body: `Go to the <strong style="color:#f1f5f9">Procurement tab</strong> (left sidebar inside your company). This is where you buy the physical components your factory needs to build vehicles each arc.<br/><br/>
<strong style="color:#4ade80">How it works:</strong><br/>
• Browse the Component Catalogue — each component shows its base cost per unit and your current stock.<br/>
• Click <em>Purchase Order</em>, enter the quantity, and confirm. The cost is deducted from Company Cash immediately.<br/>
• Components are consumed arc-by-arc as production runs. If stock hits zero, that Production Line produces nothing.<br/><br/>
<strong style="color:#fbbf24">Order sizing rule of thumb:</strong><br/>
Stock ≥ (units/month target) × 3 arcs = a safe 3-month buffer. Order in bulk — it saves the panic of running dry mid-arc.<br/><br/>
<strong style="color:#ef4444">Warning:</strong> If you start a production line with 0 workers OR 0 component stock, the system warns you and that line outputs zero units.`
              },
              {
                icon: '👔', title: 'Staffing — Who to Hire & When',
                body: `Go to the <strong style="color:#f1f5f9">Staffing tab</strong> inside your company. Six roles are available:<br/><br/>
<strong style="color:#4ade80">Factory Worker</strong> — Core production labour. Required count = Production Line target units. 0 workers = 0 output. Hire first.<br/>
<strong style="color:#4ade80">Production Supervisor</strong> — +5% production efficiency per active line covered (1 supervisor per active line).<br/>
<strong style="color:#4ade80">Quality Inspector</strong> — Each inspector reduces the base defect rate by ~0.5%. E.g. 4 inspectors → base drops from 3% to ~1%.<br/>
<strong style="color:#4ade80">Sales Manager</strong> — +4% sales effectiveness per market covered. E.g. 3 managers × 4 markets each = significant revenue lift.<br/>
<strong style="color:#4ade80">Automotive Engineer</strong> — Each engineer reduces future R&amp;D development cost by 5% (cap 20%). Hire before designing new models.<br/>
<strong style="color:#4ade80">CSO / CMO</strong> — Hired via the Board tab, not Staffing. CSO auto-optimises allocations; CMO auto-optimises marketing tiers.<br/><br/>
Wages are paid <strong style="color:#ef4444">every arc</strong> automatically. Fire before the arc closes if cash is tight — wages won't be charged for staff you fired mid-arc only if the tick hasn't run yet.<br/><br/><strong style="color:#ef4444">CRITICAL WARNING:</strong> Staff Wages and Factory Leases are <strong>FIXED COSTS</strong>. You will be billed for them at the end of the month <strong>even if your factory produces 0 cars</strong>. Do not hire staff until you are ready to produce!`
              },
              {
                icon: '🚗', title: 'Vehicle Models & Design Scores',
                body: `Design your model in the <strong style="color:#f1f5f9">R&amp;D / Design tab</strong>. Five scores drive demand:<br/><br/>
<strong style="color:#4ade80">Reliability</strong> — Critical for every segment. Low reliability = low demand regardless of price.<br/>
<strong style="color:#4ade80">Performance</strong> — Matters most for Premium &amp; Luxury segments. Less important for Economy.<br/>
<strong style="color:#4ade80">Fuel Efficiency</strong> — Key for Economy &amp; Mid segments. Penalised for Utility/Cargo vans.<br/>
<strong style="color:#4ade80">Appeal</strong> — Interior quality, styling. Driven by Interior Tier and Safety Tier choices.<br/>
<strong style="color:#4ade80">Cargo</strong> — Only relevant for Utility Van class. Penalised for Compact Cars.<br/><br/>
Scores are <strong>locked after launch</strong>. To improve a model you must design a new one or a variant. Pick your <em>Platform Type</em> (Economy / Mid / Premium / Luxury) and <em>Target Segment</em> to match the markets you plan to enter — mismatches kill demand.`
              },
              {
                icon: '📐', title: 'R&D / Engineering — Design Process',
                body: `<strong style="color:#f1f5f9">Design workflow:</strong><br/>
① Choose Vehicle Class (Compact Car / Sedan / Utility Van)<br/>
② Choose Platform → drives base cost, reliability, performance, cargo<br/>
③ Choose Power Unit → affects fuel, performance, weight<br/>
④ Choose Drivetrain, Interior Tier, Safety Tier<br/>
⑤ Set Priority sliders (Reliability / Performance / Fuel Economy / Comfort / Manufacturing Simplicity)<br/>
⑥ Allocate engineering budget across modules<br/>
⑦ Set a Quality Target (Standard / Enhanced / Premium / Elite)<br/><br/>
<strong style="color:#fbbf24">Manufacturing Complexity</strong> rises with Premium platforms and Elite quality targets. High complexity = higher production cost per unit AND higher defect rate if you lack Quality Inspectors.<br/><br/>
<strong style="color:#4ade80">Automotive Engineers</strong> in Staffing reduce your development cost by 5% each (cap 20%). Hire them before you spend heavily on R&amp;D.`
              },
              {
                icon: '💰', title: 'Pricing & Break-Even',
                body: `Sale Price is set <strong>per model</strong> in the <strong style="color:#f1f5f9">Sales Operations tab</strong> — one price applies across all markets.<br/><br/>
<strong style="color:#fbbf24">Quick break-even formula:</strong><br/>
<code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;font-size:11px">(Lease + Maintenance + Staff wages + Marketing) ÷ Units Sold + Manufacturing Cost/unit = minimum viable price</code><br/><br/>
<strong style="color:#4ade80">Pricing rules:</strong><br/>
• Price 15–25% above manufacturing cost as a starting point.<br/>
• Buyers in lower-income markets cannot afford high prices — affordability is checked per market's income bracket.<br/>
• Raising price too much kills demand faster than it raises revenue (demand function is steep).<br/>
• Track arc-by-arc margins in <strong>Performance History</strong> tab.<br/><br/>
<strong style="color:#ef4444">Marketing tiers</strong> (set per allocation, not per model):<br/>
None (free) → Local ($3,500/arc) → Regional ($12,000) → National ($35,000). Multipliers: 1× / 1.15× / 1.30× / 1.50×.`
              },
              {
                icon: '🗺️', title: 'Markets, Licences & Allocations',
                body: `<strong style="color:#f1f5f9">Before you can sell in a state you need a State Manufacturing Licence.</strong><br/>
Buy licences in the <em>Sales Operations</em> tab → Licences section. One licence per state, one-time fee.<br/><br/>
<strong style="color:#4ade80">Markets</strong> are city-regions within a state. Each has:<br/>
• An income bracket (Low / Middle / High) affecting which price points work.<br/>
• A segment preference (Economy / Mid-Range / Premium / Luxury).<br/>
• A market capacity (max total units the market can absorb across all sellers).<br/><br/>
<strong style="color:#fbbf24">Allocations</strong> (Sales Operations → Market Allocations):<br/>
Set units allocated and marketing tier per model-market pair. Your allocation is your ceiling — if demand is lower, you sell fewer. Unsold units remain in inventory at a storage cost per unit. <em>Don't over-allocate</em> far beyond your factory output.`
              },
              {
                icon: '⚔️', title: 'Competition & Market Share',
                body: `NPC rivals and other players compete in the same markets. The demand engine calculates a <strong>fit score</strong> for every competing model in a segment, then splits buyers proportionally.<br/><br/>
Fit score factors:<br/>
• Model attribute alignment with segment preferences (raised to the power of 4 — small score gaps compound hard)<br/>
• Price affordability vs buyer income<br/>
• Marketing awareness (built over time with consistent marketing spend)<br/>
• Brand loyalty (existing customers are sticky at a 0.85 retention rate)<br/><br/>
<strong style="color:#fbbf24">What wins:</strong> High reliability + good price alignment + sustained marketing over multiple arcs. One arc of national marketing does less than three arcs of regional marketing at the same total spend.<br/><br/>
<strong style="color:#ef4444">What kills you:</strong> Ignoring brand loyalty (switching to zero marketing resets your awareness), launching a model into the wrong segment (fit score ≈ 0), and not having enough inventory to meet demand (you sell out, rival keeps selling).`
              },
              {
                icon: '📊', title: 'Reading Your Numbers',
                body: `<strong style="color:#f1f5f9">Overview tab</strong> — Last Arc Profit, Company Cash, Company Value, Debt.<br/>
<strong style="color:#f1f5f9">Performance History tab</strong> — Arc-by-arc breakdown:<br/><br/>
<code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;font-size:11px">
Revenue<br/>
− Manufacturing Cost (components × units produced)<br/>
− Factory Lease<br/>
− Factory Maintenance<br/>
− Staff Wages<br/>
− Marketing Costs<br/>
− Inventory Storage<br/>
− Warranty Reserve<br/>
= Operating Profit
</code><br/><br/>
<strong style="color:#fbbf24">Market Intelligence tab</strong> — shows units sold, market share %, sale price, and revenue per market. Use this to identify where you're losing share vs rivals and where you're sold out (meaning you should increase allocation or add a production line).`
              },
              {
                icon: '🏛️', title: 'National Parliament Bills',
                body: `Bills passed in the <strong style="color:#f1f5f9">National Parliament of Drennia</strong> affect <strong>ALL</strong> manufacturing companies nationwide — including you and all NPC rivals.<br/><br/>
<strong style="color:#4ade80">Current effect mapping:</strong><br/>
• <strong>Fiscal Health bills</strong> → adjust manufacturing cost per unit (±up to 10%)<br/>
• <strong>Prosperity bills</strong> → scale consumer demand across all markets (±up to 8%)<br/>
• <strong>Order &amp; Safety bills</strong> → add reliability score points to all vehicle models (up to +5)<br/>
• <strong>Equity bills</strong> → add appeal score points (up to +3)<br/>
• <strong>Deregulation (low bureaucracy)</strong> → market access bonus<br/><br/>
These effects are applied automatically each tick. Monitor the Politics tab — if a hostile legislature is in power, your margins can erode. Control the parliament through your party to pass pro-business bills.`
              },
              {
                icon: '🏦', title: 'Finance — Loans & Cash Flow',
                body: `<strong style="color:#f1f5f9">Finance tab</strong> inside your company shows your full ledger, available cash, and debt.<br/><br/>
<strong style="color:#4ade80">Borrowing:</strong> You can take a bank loan via the <em>Banks</em> tab at the top of the Business Desk. Sovereign rate applies + any discount for manufacturing companies (State Mandate Clause). Loans appear as Debt on your company balance sheet and are repaid automatically each arc.<br/><br/>
<strong style="color:#fbbf24">Cash flow tips:</strong><br/>
• Keep at least 2–3 arcs of overhead (lease + wages + components) in reserve.<br/>
• A negative Company Cash at tick time means your company cannot pay wages — staff may leave.<br/>
• Company Value = Cash + Assets − Debt. This is what investors and acquisition bids are based on.<br/><br/>
<strong style="color:#ef4444">Warning:</strong> If your company falls below the bankruptcy floor and cannot service debt, the system may auto-trigger an asset auction.`
              },
              {
                icon: '🤝', title: 'Board & Senior Officers',
                body: `The <strong style="color:#f1f5f9">Board tab</strong> is where you hire senior officers (distinct from factory staff):<br/><br/>
<strong style="color:#4ade80">CSO — Chief Sales Officer</strong><br/>
Auto-allocates units across markets each arc to maximise revenue. Without a CSO, you must set allocations manually in Sales Operations. Highly recommended once you have 3+ markets.<br/><br/>
<strong style="color:#4ade80">CMO — Chief Marketing Officer</strong><br/>
Auto-selects the optimal marketing tier for each market-model pair. Without a CMO you set tiers manually. Prevents the common mistake of over-spending marketing on markets where you're already dominant.<br/><br/>
Board officers cost a senior wage each arc. Their decisions are logged in the Records tab so you can review what they chose and override if needed.`
              },
              {
                icon: '📈', title: 'Market Intelligence — Paid Research',
                body: `The <strong style="color:#f1f5f9">Market Intelligence tab</strong> has two modes:<br/><br/>
<strong style="color:#4ade80">Free intel:</strong> Your own sales results — units sold, revenue, market share, and which models in your portfolio are performing.<br/><br/>
<strong style="color:#fbbf24">Paid Research (Tier 1 — basic):</strong> Reveals competitor unit counts and market share in your selected market. Does not reveal their sale price or engineering specs.<br/><br/>
<strong style="color:#fbbf24">Paid Research (Tier 2 — full):</strong> Reveals all competitor data including sale price, model attributes, and manufacturing cost estimates. Requires sufficient company cash — the system checks before revealing data (no refund if you cancel).<br/><br/>
Use paid research to spot rivals who are Sold Out (opportunity to grab share by increasing your allocation) or who are pricing aggressively below break-even (they may be burning cash — wait them out).`
              },
              {
                icon: '🔄', title: 'Inventory & The Sold Out Problem',
                body: `Inventory is built each arc by your Production Lines. It sits in your warehouse until sold.<br/><br/>
<strong style="color:#4ade80">Sold Out</strong> means demand > your allocation. You left money on the table. Fix: raise allocation or add a production line.<br/>
<strong style="color:#fbbf24">Unsold stock</strong> means allocation > demand. You're paying storage costs on units nobody wants. Fix: lower allocation, improve your model, cut price, or improve marketing.<br/><br/>
<strong style="color:#ef4444">Ghost Car warning (fixed):</strong> You cannot sell more units than you physically have in inventory. If production failed (0 workers or 0 components), your allocation is irrelevant — no units exist to sell. Always check the Production tab after setting up a new line to confirm "Est. Units Produced" is non-zero.`
              },
              {
                icon: '🧾', title: 'Understanding Production Costs',
                body: `Building cars involves three distinct types of costs:<br/><br/>
<strong style="color:#4ade80">1. Components Cost (Parts):</strong> ~$94 per unit (Engine, Tyres, Steel, etc). This is paid <strong>instantly upfront</strong> when you click "Buy" in the Procurement tab. You must have parts in stock to build cars.<br/><br/>
<strong style="color:#fbbf24">2. Variable Assembly Cost:</strong> This is the labour and energy cost of physically assembling the car on the line. It is calculated as your model's <em>Manufacturing Cost per unit minus the ~$94 BOM (parts) cost</em>. It is billed <strong>automatically at month-end</strong>, multiplied by the actual number of units you produced. If you produce 0 units, this cost is $0.<br/><br/>
<strong style="color:#ef4444">3. Fixed Overheads:</strong> Factory Leases, Factory Maintenance, and Staff Wages. These are billed <strong>automatically at month-end</strong> <em>even if your factory produces absolutely nothing</em>.`
              },
              {
                icon: '📋', title: 'Quick-Start Checklist',
                body: `<strong style="color:#f1f5f9">Day 1 sequence for a new manufacturing company:</strong><br/><br/>
<strong style="color:#4ade80">①</strong> <strong>Lease a factory</strong> (Factory tab) — check capacity and lease cost vs your starting capital.<br/>
<strong style="color:#4ade80">②</strong> <strong>Design a vehicle model</strong> (R&amp;D / Design tab) — start Economy or Mid platform, Compact Car class.<br/>
<strong style="color:#4ade80">③</strong> <strong>Hire Factory Workers</strong> (Staffing tab) — enough to meet your production line target.<br/>
<strong style="color:#4ade80">④</strong> <strong>Buy components</strong> (Procurement tab) — order enough for 3 arcs of production.<br/>
<strong style="color:#4ade80">⑤</strong> <strong>Set up a Production Line</strong> (Production tab) — assign model, set target units.<br/>
<strong style="color:#4ade80">⑥</strong> <strong>Buy a State Licence</strong> (Sales Operations → Licences) for your home state.<br/>
<strong style="color:#4ade80">⑦</strong> <strong>Allocate to 2–3 markets</strong> (Sales Operations → Allocations) — set units and marketing tier.<br/>
<strong style="color:#4ade80">⑧</strong> <strong>Set your sale price</strong> — aim for 20% above manufacturing cost as a start.<br/>
<strong style="color:#4ade80">⑨</strong> <strong>Hire a Quality Inspector</strong> to cut defect rate.<br/>
<strong style="color:#4ade80">⑩</strong> <strong>Wait for the arc tick</strong> — review Performance History for results and iterate.`
              },
              {
                icon: '💡', title: 'Common Mistakes to Avoid',
                body: `<strong style="color:#ef4444">✗ Forgetting to buy components</strong> — No stock = no production, zero revenue.<br/>
<strong style="color:#ef4444">✗ Zero Factory Workers</strong> — Lines assigned but nobody builds the cars.<br/>
<strong style="color:#ef4444">✗ Factory still under construction</strong> — Outputs zero, lease still charges every arc.<br/>
<strong style="color:#ef4444">✗ Wrong segment target</strong> — Economy platform in a Luxury market = near-zero fit score.<br/>
<strong style="color:#ef4444">✗ Over-allocating</strong> — Allocating 100 units when you produce 25 wastes nothing but sets false expectations.<br/>
<strong style="color:#ef4444">✗ No State Licence</strong> — You cannot sell in a state without it; allocations are ignored.<br/>
<strong style="color:#ef4444">✗ Stopping marketing mid-run</strong> — Brand awareness decays at 15% per arc without marketing spend.<br/>
<strong style="color:#ef4444">✗ Ignoring factory condition</strong> — Below 60% condition the defect rate spikes, reducing effective output.`
              },
            ] as {icon:string;title:string;body:string}[]).map((section, i, arr) => (
              <div key={i} style={{ marginBottom: 22, paddingBottom: 22, borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{section.icon}</span>
                  <span style={{ color: '#4ade80', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{section.title}</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5, lineHeight: 1.7, margin: 0, fontFamily: 'system-ui, sans-serif' }} dangerouslySetInnerHTML={{ __html: section.body }} />
              </div>
            ))}

          </div>
        </div>
      )}


      {/* ── Tab Content ── */}
      <div className="flex-1 animate-slide-in">
        {activeTab === 'overview'  && <PageShell className="py-6"><OverviewTab company={company} playerCash={playerCash} netWorth={netWorth} onStartBusiness={() => setActiveTab('start')} onViewContracts={() => { setActiveTab('companies'); setSelectedCompanyId(null); }} onViewRegistry={() => setActiveTab('registry')}
          myCompanies={[...operationalCompanies, ...(financeCompany ? [financeCompany] : [])].map((c: any) => ({ id: c.id, name: c.name, industry_id: c.industry_id, finances: c.finances }))}
          onOpenCompany={(id) => { setActiveTab('companies'); setSelectedCompanyId(id); }}
          onPickSector={(id) => { setSelectedSector(id); setChosenCapital(sectorMinCapital(id)); setStep(2); setActiveTab('start'); }}
          onGoTab={(tab) => { setSelectedCompanyId(null); setActiveTab(tab); }} /></PageShell>}
        {activeTab === 'start'     && <PageShell className="py-6"><StartBusinessTab step={step} setStep={setStep} selectedSector={selectedSector} setSelectedSector={setSelectedSector} selectedHQ={selectedHQ} setSelectedHQ={setSelectedHQ} hqOptions={hqOptions} companyNameInput={companyNameInput} setCompanyNameInput={setCompanyNameInput} nameError={nameError} setNameError={setNameError} startError={startError} playerCash={playerCash} company={company} financeCompany={financeCompany} onRegister={handleRegisterCompany} checkName={checkName} chosenCapital={chosenCapital} setChosenCapital={setChosenCapital} selectedStructure={selectedStructure} setSelectedStructure={setSelectedStructure} selectedModel={selectedModel} setSelectedModel={setSelectedModel} isSubmitting={isSubmitting} /></PageShell>}
        
        {activeTab === 'companies' && (
            <div>
              {/* Finance firm selected → Capital Partners desk */}
              {selectedCompanyId && financeCompany && selectedCompanyId === financeCompany.id ? (
                <div className="page-frame py-5">
                <CapitalPartnersDeskTab
                  firmId={financeCompany.id}
                  firmName={financeCompany.name}
                  playerCash={playerCash}
                  onRefresh={refreshAll}
                  onGoToExchange={() => setActiveTab('exchange')}
                />
                </div>
              ) : selectedCompanyId && company ? (
                <div className="page-frame py-5">
                  {/* Detailed company view could go here, but usually it delegates to ManufacturingDeskTab */}
                  {company.sector === 'manufacturing' || company.sectorId === 'manufacturing' ? (
                    <ManufacturingDeskTab
                      company={company}
                      mfgData={mfgData}
                      playerCash={playerCash}
                      netWorth={netWorth}
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
              ) : selectedCompanyId ? (
                <PageShell className="py-6 flex items-center justify-center min-h-[50vh]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-terminal-amber/20 border-t-terminal-amber rounded-full animate-spin"></div>
                    <div className="text-zinc-500 text-[10px] uppercase tracking-[0.2em]">Accessing Company Desk...</div>
                  </div>
                </PageShell>
              ) : (
                <PageShell className="py-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {operationalCompanies.map((c: any) => (
                      <Card
                        key={c.id}
                        pad="md"
                        hover
                        className="flex items-center justify-between gap-4 cursor-pointer"
                        onClick={() => setSelectedCompanyId(c.id)}
                      >
                        <div>
                          <div className="text-sm font-bold text-zinc-100">{c.name}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            {c.industry_id === 'shipping-logistics' ? 'Logistics' : 'Manufacturing'}
                            {' • '}
                            {getStateName(c.headquarters_state_id)}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" iconRight={ArrowRight}>
                          Manage
                        </Button>
                      </Card>
                    ))}
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
                    {operationalCompanies.length === 0 && !financeCompany && (
                      <div className="text-[14px] text-ink-dim">You have no companies yet. File one from Start Business.</div>
                    )}
                  </div>
                </PageShell>
              )}
            </div>
          )}

        
        
        {activeTab === 'analytics' && (
          analyticsCompany ? (
            <AnalyticsDashboard companyId={analyticsCompany.id} countryId={analyticsCompany.countryId} />
          ) : (
            <PageShell className="py-6">
              <div className="text-[14px] text-ink-dim">Register a company to see market analytics.</div>
            </PageShell>
          )
        )}
        {activeTab === 'exchange' && <PageShell className="py-6"><DrennportExchangeTab /></PageShell>}
        {activeTab === 'banks' && <div className="page-frame py-5"><BanksTab company={company} playerCash={playerCash} onRefresh={refreshAll} /></div>}
        {activeTab === 'registry'  && <PageShell className="py-6"><RegistryTab key={registryKey} company={company} onRefresh={() => setRegistryKey(k => k + 1)} /></PageShell>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ———────────────────────────────────────────────────────────────────────────────
/** Real numbers from company_finances: cash, last month's profit, book value, cars sold. */
function CompanyFigures({ finances }: { finances: any }) {
  const profit = Number(finances.last_arc_profit || 0);
  const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
  const sold = Number(finances.lifetime_units_sold || 0);
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
      <div><dt className="text-ink-faint">Cash</dt><dd className="font-mono text-ink">{money(Number(finances.available_cash || 0))}</dd></div>
      <div><dt className="text-ink-faint">Last month</dt><dd className={`font-mono ${profit > 0 ? 'text-good' : profit < 0 ? 'text-bad' : 'text-ink'}`}>{money(profit)}</dd></div>
      <div><dt className="text-ink-faint">Value</dt><dd className="font-mono text-ink">{money(Number(finances.company_value || 0))}</dd></div>
      {sold > 0 && <div><dt className="text-ink-faint">Cars sold</dt><dd className="font-mono text-ink">{sold.toLocaleString('en-US')}</dd></div>}
    </dl>
  );
}

function OverviewTab({ company, playerCash, netWorth, onStartBusiness, onViewContracts, onViewRegistry, myCompanies = [], onOpenCompany, onPickSector, onGoTab }: {
  company: Company | null; playerCash: number; netWorth: number;
  onStartBusiness: () => void; onViewContracts: () => void; onViewRegistry: () => void;
  /** Companies the player already owns: owners get "Your business", not the registration pitch. */
  myCompanies?: { id: string; name: string; industry_id?: string; finances?: any }[];
  onOpenCompany?: (id: string) => void;
  /** Open the filing wizard with this sector already chosen. */
  onPickSector?: (sectorId: string) => void;
  onGoTab?: (tab: SubTab) => void;
}) {
  if (!company && myCompanies.length > 0) {
    const sectorName = (id?: string) => id === 'manufacturing' ? 'Car manufacturing' : id === 'logistics' ? 'Shipping & logistics' : id === 'finance' ? 'Capital partners' : 'Company';
    const hasFinanceFirm = myCompanies.some(c => c.industry_id === 'finance');
    const shortcuts: { tab: SubTab; label: string; desc: string; icon: typeof Wallet }[] = [
      { tab: 'banks', label: 'Banks', desc: 'Borrow to expand; loans repay monthly.', icon: Landmark },
      { tab: 'exchange', label: 'Exchange', desc: 'Trade shares or raise capital.', icon: TrendingUp },
      { tab: 'registry', label: 'Public registry', desc: 'Every company in the world.', icon: ScrollText },
      ...(!hasFinanceFirm ? [{ tab: 'start' as SubTab, label: 'Open a Capital Partners firm', desc: 'Your second slot: a firm that invests in shares.', icon: Building2 }] : []),
    ];
    return (
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
        <section className="flex min-w-0 flex-col gap-4" aria-labelledby="your-companies">
          <SectionHeading icon={Briefcase}><span id="your-companies">Your companies</span></SectionHeading>
          <div className={`grid grid-cols-1 gap-4 ${myCompanies.length > 1 ? 'xl:grid-cols-2' : ''}`}>
            {myCompanies.map((c, i) => (
              <Card key={c.id} pad="lg" accent={i === 0} className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="m-0 truncate font-display text-[22px] font-semibold text-ink">{c.name}</h2>
                    <div className="text-[13px] text-ink-faint">{sectorName(c.industry_id)}</div>
                  </div>
                  <Badge variant="green" dot>Active</Badge>
                </div>
                {c.finances ? <CompanyFigures finances={c.finances} /> : <p className="m-0 text-[13px] text-ink-faint">No month closed yet.</p>}
                <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-line pt-4">
                  <Button variant={i === 0 ? 'primary' : 'secondary'} size="md" iconRight={ArrowRight} onClick={() => onOpenCompany?.(c.id)}>
                    Open {c.industry_id === 'finance' ? 'portfolio' : 'company desk'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-16" aria-label="Your position">
          <Card kicker="Your funds" icon={Wallet} pad="md">
            <DataRow label="Cash in hand" value={formatMoney(playerCash)} valueVariant="green" />
            <DataRow label="Net worth" value={formatMoney(netWorth)} valueVariant="amber" border={false} />
          </Card>
          <Card kicker="Shortcuts" icon={ArrowRight} pad="md">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {shortcuts.map(sc => (
                <li key={sc.tab}>
                  <button type="button" onClick={() => onGoTab?.(sc.tab)}
                    className="group flex w-full items-center gap-3 rounded-control border border-line bg-raised/40 px-3.5 py-3 text-left transition-colors hover:border-accent/50">
                    <sc.icon size={16} className="shrink-0 text-ink-faint group-hover:text-accent" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-ink">{sc.label}</span>
                      <span className="block text-[12px] text-ink-faint">{sc.desc}</span>
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-ink-faint group-hover:text-accent" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    );
  }
  if (!company) {
    const cheapestStart = Math.min(...Object.values(SECTOR_MIN_CAPITAL)) + Math.min(...Object.values(FILING_FEES));
    const openSectors = SECTORS.filter(s => s.available);
    return (
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
        <div className="flex min-w-0 flex-col gap-8">
          {/* Hero */}
          <Card pad="lg" accent className="relative overflow-hidden">
            <div className="mb-3 flex items-center gap-2">
              <Landmark size={14} className="text-accent" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Commercial registry</span>
            </div>
            <h2 className="mb-3 font-display text-[26px] font-semibold leading-tight text-ink text-balance md:text-[34px]">
              The registry is open. Build your enterprise.
            </h2>
            <p className="mb-6 max-w-[62ch] text-[15px] leading-relaxed text-ink-dim">
              Choose a sector, a head office and a legal structure, commit your starting capital, and your company opens
              this month. There is no maximum: invest as much of your cash as you like.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" iconRight={ArrowRight} onClick={onStartBusiness}>
                Start a business
              </Button>
              <Button variant="ghost" size="lg" icon={ScrollText} onClick={onViewRegistry}>
                Browse the public registry
              </Button>
            </div>
            <dl className="mt-7 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Cheapest start</dt>
                <dd className="m-0 mt-1 font-mono text-[20px] font-semibold text-ink">{formatMoney(cheapestStart)}</dd>
                <dd className="m-0 text-[12px] text-ink-faint">capital + filing fee</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Car maker from</dt>
                <dd className="m-0 mt-1 font-mono text-[20px] font-semibold text-ink">{formatMoney(SECTOR_MIN_CAPITAL.manufacturing)}</dd>
                <dd className="m-0 text-[12px] text-ink-faint">starting capital</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Sectors open</dt>
                <dd className="m-0 mt-1 font-mono text-[20px] font-semibold text-ink">{openSectors.length} of {SECTORS.length}</dd>
                <dd className="m-0 text-[12px] text-ink-faint">more open later</dd>
              </div>
            </dl>
          </Card>

          {/* How it works */}
          <section>
            <SectionHeading icon={FileText}>How it works</SectionHeading>
            <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
              {[
                { step: '1', title: 'Register', desc: 'Pick a sector, a head office in your nation and a legal structure. File with the registry and commit your starting capital.', icon: Building2 },
                { step: '2', title: 'Operate', desc: 'A car maker leases a factory, designs cars, hires staff and sells in your nation’s car market. Every month closes with real results.', icon: Briefcase },
                { step: '3', title: 'Grow', desc: 'Build your brand and book value, borrow from the banks to expand, and work toward a listing on the exchange.', icon: TrendingUp },
              ].map(item => (
                <li key={item.step}>
                  <Card pad="md" className="flex h-full flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-mono text-[13px] font-semibold text-accent" aria-hidden>{item.step}</span>
                      <h3 className="m-0 text-[15px] font-semibold text-ink">{item.title}</h3>
                      <item.icon size={16} className="ml-auto text-ink-faint" aria-hidden />
                    </div>
                    <p className="m-0 text-[13px] leading-relaxed text-ink-dim">{item.desc}</p>
                  </Card>
                </li>
              ))}
            </ol>
          </section>

          {/* Legal structures */}
          <section>
            <SectionHeading icon={Scale}>Legal structures</SectionHeading>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {LEGAL_STRUCTURES.map(s => (
                <Card key={s.id} pad="md" className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="m-0 text-[15px] font-semibold text-ink">{s.label}</h3>
                    <span className="shrink-0 font-mono text-[13px] font-semibold text-accent">{formatMoney(FILING_FEES[s.id])}</span>
                  </div>
                  <p className="m-0 text-[13px] leading-relaxed text-ink-dim">{s.desc}</p>
                </Card>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-ink-faint">The fee is a one-off filing charge. A Capital Partners firm is always a private company.</p>
          </section>
        </div>

        {/* Right rail */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-16" aria-label="Your position">
          <Card kicker="Your funds" icon={Wallet} pad="md">
            <DataRow label="Cash in hand" value={formatMoney(playerCash)} valueVariant="green" />
            <DataRow label="Net worth" value={formatMoney(netWorth)} valueVariant="amber" />
            <DataRow label="Left after the cheapest start" value={formatMoney(playerCash - cheapestStart)} border={false} />
            {playerCash < cheapestStart && (
              <p className="mt-3 text-[13px] text-warn">You need {formatMoney(cheapestStart - playerCash)} more to register a company.</p>
            )}
          </Card>
          <Card kicker="Open sectors" icon={Building2} pad="md">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {openSectors.map(sct => {
                const min = sectorMinCapital(sct.id);
                return (
                  <li key={sct.id}>
                    <button
                      type="button"
                      onClick={() => onPickSector?.(sct.id)}
                      className="group flex w-full items-center justify-between gap-3 rounded-control border border-line bg-raised/40 px-3.5 py-3 text-left transition-colors hover:border-accent/50"
                    >
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold text-ink">{sct.id === 'Finance & Services' ? 'Capital Partners firm' : 'Car manufacturer'}</span>
                        <span className="block text-[12px] text-ink-faint">From {formatMoney(min)} capital</span>
                      </span>
                      <ArrowRight size={15} className="shrink-0 text-ink-faint transition-colors group-hover:text-accent" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[12px] text-ink-faint">
              {SECTORS.filter(x => !x.available).map(x => x.id).join(', ')} open later.
            </p>
          </Card>
        </aside>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Key stats (real numbers only: no trend arrows without a measured change) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Company cash" value={formatMoney(company.companyCash ?? 0)} valueColor="green" />
        <StatCard label="Debt" value={formatMoney(company.debt ?? 0)} valueColor={(company.debt ?? 0) > 0 ? 'red' : 'white'} />
        <StatCard label="Net worth (total)" value={formatMoney(netWorth)} valueColor="amber" />
        <StatCard label="Reputation" value={company.reputation} valueColor="white" />
      </div>

      {/* Company file + financial position + next steps */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card
          kicker="Company file"
          icon={Building2}
          title={company.name}
          headerSlot={<Badge variant="green" dot>{company.status}</Badge>}
        >
          <DataRow label="Structure" value={getLegalStructureName(company.legalStructure)} />
          <DataRow label="Sector" value={getSectorName(company.sectorId) || getSectorName(company.sector) || 'N/A'} />
          {company.subsector && <DataRow label="Subsector" value={getSubsectorName(company.subsector) || 'N/A'} />}
          <DataRow label="Head office" value={getStateName(company.headquartersStateId) || getStateName(company.state) || 'N/A'} />
          {company.operatingModel && !company.subsector && <DataRow label="Operating model" value={company.operatingModel} valueVariant="amber" />}
          <DataRow label="Reputation" value={company.reputation} valueVariant="amber" />
          <DataRow label="Reliability" value={company.reliability} border={false} />
        </Card>

        <Card kicker="Ledger" icon={Wallet} title="Financial position">
          <DataRow label="Company cash" value={formatMoney(company.companyCash ?? 0)} valueVariant="green" />
          <DataRow label="Debt" value={formatMoney(company.debt ?? 0)} valueVariant={(company.debt ?? 0) > 0 ? 'red' : 'muted'} />
          <DataRow label="Your cash in hand" value={formatMoney(playerCash)} />
          <DataRow label="Net worth (total)" value={formatMoney(netWorth)} valueVariant="amber" border={false} />
        </Card>

        <Card kicker="Next" icon={ArrowRight} title="Where to next?" className="lg:col-span-2 xl:col-span-1">
          <div className="flex flex-col gap-2">
            <Button variant="primary" fullWidth icon={Briefcase} iconRight={ArrowRight} onClick={onViewContracts}>
              Run {company.name}
            </Button>
            <Button variant="ghost" fullWidth icon={ScrollText} onClick={onViewRegistry}>
              Public registry
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// START BUSINESS TAB
// ───────────────────────———─────────────────────────────────────────────────────
function StartBusinessTab({ step, setStep, selectedSector, setSelectedSector, selectedHQ, setSelectedHQ, hqOptions, companyNameInput, setCompanyNameInput, nameError, setNameError, startError, playerCash, company, financeCompany, onRegister, checkName, chosenCapital, setChosenCapital, selectedStructure, setSelectedStructure, selectedModel, setSelectedModel, isSubmitting }: any) {
  const isLogistics = selectedSector === 'Shipping & Logistics';
  const isFinance   = selectedSector === 'Finance & Services';

  // Player already has BOTH slots filled — fully block
  if (company && financeCompany) {
    return (
      <Card pad="lg" className="mx-auto w-full max-w-[640px]">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Both company slots filled</div>
        <p className="m-0 text-[14px] leading-relaxed text-ink-dim">
          You have <strong className="text-zinc-100">{company.name}</strong> (operational) and <strong className="text-zinc-100">{financeCompany.name}</strong> (Capital Partners). No more company slots are available in the closed alpha.
        </p>
      </Card>
    );
  }

  // Player has an operational company but no finance firm yet — Finance slot is available
  const financeSlotOnly = !!company && !financeCompany;

  // Auto-select Finance & Services and reset capital when only that slot is open
  useEffect(() => {
    if (financeSlotOnly && selectedSector !== 'Finance & Services') {
      setSelectedSector('Finance & Services');
      setChosenCapital(SECTOR_MIN_CAPITAL.finance);
    }
  }, [financeSlotOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const STEP_LABELS = isFinance
    ? ['Sector', 'Head office', 'Name', 'Capital', 'Confirm']
    : ['Sector', 'Head office', 'Structure', 'Name', 'Capital', isLogistics ? 'Model' : 'Subsector', 'Confirm'];
  // Finance firms are always private companies, so they always pay that fee.
  const effectiveFee = FILING_FEES[isFinance ? 'private-company' : selectedStructure] ?? FILING_FEES['sole-trader'];
  const minCapital = sectorMinCapital(selectedSector);
  // The step numbers the wizard actually visits (a finance firm skips structure and subsector).
  const STEP_IDS = isFinance ? [1, 2, 4, 5, 7] : [1, 2, 3, 4, 5, 6, 7];
  const stepPos = Math.max(0, STEP_IDS.indexOf(step));
  const stepStamp = `Step ${stepPos + 1} of ${STEP_IDS.length}`;
  const prevStep = STEP_IDS[Math.max(0, stepPos - 1)];
  const total = chosenCapital + effectiveFee;
  const canAfford = playerCash >= total;
  const totalCost = effectiveFee + chosenCapital;

  return (
    <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
      <div className="flex min-w-0 flex-col gap-5">
          {/* Stepper: full on wide screens, a progress bar on phones */}
          <div className="md:hidden">
            <div className="mb-2 flex items-baseline justify-between text-[13px]">
              <span className="font-semibold text-ink">{STEP_LABELS[stepPos]}</span>
              <span className="text-ink-faint">{stepStamp}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Filing progress" aria-valuemin={1} aria-valuemax={STEP_IDS.length} aria-valuenow={stepPos + 1}>
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((stepPos + 1) / STEP_IDS.length) * 100}%` }} />
            </div>
          </div>
          <ol className="m-0 hidden list-none items-center gap-2 p-0 md:flex" aria-label="Filing steps">
            {STEP_LABELS.map((label, i) => {
              const done = i < stepPos;
              const active = i === stepPos;
              return (
                <li key={label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[12px] font-semibold ${
                    done ? 'border-good/50 bg-good/15 text-good' : active ? 'border-accent bg-accent text-[#17130A]' : 'border-line-strong text-ink-faint'
                  }`}>{done ? '✓' : i + 1}</span>
                  <span className={`truncate text-[12px] font-medium ${active ? 'text-ink' : done ? 'text-ink-dim' : 'text-ink-faint'}`}>{label}</span>
                  {i < STEP_LABELS.length - 1 && <span className="hidden h-px min-w-[12px] flex-1 bg-line xl:block" aria-hidden />}
                </li>
              );
            })}
          </ol>
          <Card pad="lg">

      {/* Step 1 — Sector */}
      {step === 1 && (
        <div>
          <SectionHeader stamp={stepStamp}>Select Your Sector</SectionHeader>
          {financeSlotOnly ? (
            <div className="mb-4 rounded-md border border-terminal-amber/40 bg-terminal-amber/5 px-4 py-3">
              <div className="text-[10px] text-terminal-amber uppercase tracking-[0.15em] font-bold mb-1">Second Slot — Finance Only</div>
              <p className="m-0 text-[13px] leading-relaxed text-ink-dim">
                You already operate <strong className="text-zinc-100">{company.name}</strong>. Your second slot is reserved for a <strong className="text-zinc-100">Capital Partners firm</strong>. Only Finance &amp; Services is available.
              </p>
            </div>
          ) : (
            <p className="mb-5 text-[14px] leading-relaxed text-ink-dim">
              <strong className="text-terminal-amber">Manufacturing</strong> (a car maker) and <strong className="text-terminal-amber">Finance &amp; Services</strong> (a Capital Partners firm that invests in other companies) are open. The other sectors are shown locked until they open.
            </p>
          )}
          <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[...SECTORS].sort((x, y) => Number(y.available) - Number(x.available)).map(s => {
              // When the player only has the finance slot left, lock everything except Finance & Services
              const locked = financeSlotOnly ? s.id !== 'Finance & Services' : !s.available;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    if (locked) return;
                    setSelectedSector(s.id);
                    // Reset capital to the correct minimum for this sector
                    setChosenCapital(sectorMinCapital(s.id));
                  }}
                  disabled={locked}
                  className={`rounded-md border px-4 py-3.5 text-left transition-colors ${
                    selectedSector === s.id
                      ? 'border-terminal-amber bg-terminal-amber/10'
                      : 'border-zinc-800 bg-zinc-900/40'
                  } ${!locked ? 'cursor-pointer hover:border-zinc-600' : 'cursor-not-allowed border-dashed bg-transparent'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[13px] font-semibold ${!locked ? 'text-zinc-100' : 'text-zinc-600'}`}>{s.id}</span>
                    {locked && <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-ink-faint"><Lock size={10} />{financeSlotOnly ? 'Slot taken' : ((s as any).note || 'Locked')}</span>}
                    {selectedSector === s.id && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">Selected</span>}
                  </div>
                  <div className="text-[12px] text-ink-dim mt-1">{s.desc}</div>
                </button>
              );
            })}
          </div>
          <GoldButton onClick={() => setStep(2)} disabled={!selectedSector}>Next: Head office →</GoldButton>
        </div>
      )}

      {/* Step 2 — HQ */}
      {step === 2 && (
        <div>
          <SectionHeader stamp={stepStamp}>Headquarters Location</SectionHeader>
          <p className="mb-5 text-[14px] leading-relaxed text-ink-dim">Your company opens in your own nation and sells in its car market. Pick the region for your head office.</p>
          <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {hqOptions.length === 0 && <p className="text-xs text-ink-dim">Loading your nation's regions…</p>}
            {hqOptions.map((hq: HqOption) => (
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
                    <span className="ml-2.5 text-[12px] text-ink-faint">{hq.tagline}</span>
                  </div>
                  {selectedHQ === hq.id && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">Selected</span>}
                </div>
                <div className="mt-1.5 text-[13px] leading-relaxed text-ink-dim">{hq.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2.5">
            <GhostButton onClick={() => setStep(prevStep)}>← Back</GhostButton>
            <GoldButton onClick={() => setStep(isFinance ? 4 : 3)} disabled={!selectedHQ}>Next: {isFinance ? 'Company name' : 'Structure'} →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 3 — Structure (skipped for Finance) */}
      {step === 3 && !isFinance && (
        <div>
          <SectionHeader stamp={stepStamp}>Legal Structure</SectionHeader>
          <div className="mb-6 grid grid-cols-1 gap-2.5 md:grid-cols-3">
            {LEGAL_STRUCTURES.map(s => (
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
                  <span className="text-[14px] font-semibold text-ink">{s.label}</span>
                  <span className="font-mono text-[13px] font-semibold text-accent">{formatMoney(FILING_FEES[s.id])}</span>
                </div>
                <div className="mt-1 text-[13px] text-ink-dim">{s.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2.5">
            <GhostButton onClick={() => setStep(prevStep)}>← Back</GhostButton>
            <GoldButton onClick={() => setStep(4)} disabled={!selectedStructure}>Next: Name →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 4 — Name */}
      {step === 4 && (
        <div>
          <SectionHeader stamp={stepStamp}>Company Name</SectionHeader>
          <p className="mb-5 text-[14px] leading-relaxed text-ink-dim">
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
            <GhostButton onClick={() => setStep(prevStep)}>← Back</GhostButton>
            <GoldButton onClick={() => { if (checkName()) setStep(5); }}>Check & Continue →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 5 — Starting Capital */}
      {step === 5 && (
        <div>
          <SectionHeader stamp={stepStamp}>Starting Capital</SectionHeader>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-5 mb-4">
            <FieldRow label="Company Name" value={companyNameInput} />
            <FieldRow label="Sector" value={selectedSector} />
            <FieldRow label="HQ State" value={hqOptions.find((h: HqOption) => h.id === selectedHQ)?.city || selectedHQ} />
            {!isFinance && <FieldRow label="Legal Structure" value={getLegalStructureName(selectedStructure)} />}
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-5 mb-6">
            <SectionHeader>Starting Capital</SectionHeader>
            <p className="mb-4 text-[14px] leading-relaxed text-ink-dim">
              Minimum: <strong className="text-terminal-amber">{formatMoney(minCapital)}</strong>. No maximum — invest as much as your Cash in Hand allows, minus the filing fee ({isFinance ? 'Private Company' : getLegalStructureName(selectedStructure)} fee: <strong className="text-terminal-red">{formatMoney(effectiveFee)}</strong>).
            </p>
            <div className="mb-4">
              <Label>Company Starting Capital ($)</Label>
              <input
                type="number"
                min={minCapital}
                step={10000}
                value={chosenCapital}
                onChange={e => {
                  const v = parseInt(e.target.value) || minCapital;
                  setChosenCapital(Math.max(minCapital, v));
                }}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3 text-base font-mono font-bold text-terminal-green outline-none box-border focus:border-terminal-amber/60 transition-colors"
              />
            </div>
            <FieldRow label="Chosen Capital" value={formatMoney(chosenCapital)} valueColor="#4FB286" />
            <FieldRow label={`Filing Fee (${isFinance ? 'Private Company' : getLegalStructureName(selectedStructure)})`} value={formatMoney(effectiveFee)} valueColor="#D9625A" />
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
            <GhostButton onClick={() => setStep(prevStep)}>← Back</GhostButton>
            <GoldButton
              onClick={() => setStep(isFinance ? 7 : 6)}
              disabled={!canAfford || chosenCapital < minCapital}
            >{isFinance ? 'Next: Confirm filing →' : isLogistics ? 'Next: Operating model →' : 'Next: Subsector →'}</GoldButton>
          </div>
        </div>
      )}

      {/* Step 6 — Operating Model / Subsector (skipped for Finance) */}
      {step === 6 && !isFinance && (
        <div>
          <SectionHeader stamp={stepStamp}>{isLogistics ? 'Select Operating Model' : 'Select Manufacturing Subsector'}</SectionHeader>
          <p className="mb-5 text-[14px] leading-relaxed text-ink-dim">
            {isLogistics 
              ? "Choose your company's initial logistics operating model. This shapes your career trajectory, suggested contracts, and unlocks tailored equipment."
              : "Choose your primary manufacturing subsector. This unlocks specific blueprints, materials, and facility types."}
          </p>
          <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                } ${model.available ? 'cursor-pointer hover:border-zinc-600' : 'cursor-not-allowed border-dashed bg-transparent'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-zinc-100">{model.title}</span>
                  {selectedModel === model.id && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">Selected</span>}
                  {!model.available && <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-ink-faint"><Lock size={10} />Later</span>}
                </div>
                <div className="mt-1 text-[13px] leading-normal text-ink-dim">{model.desc}</div>
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
                } ${model.available ? 'cursor-pointer hover:border-zinc-600' : 'cursor-not-allowed border-dashed bg-transparent'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-zinc-100">{model.title}</span>
                  {selectedModel === model.id && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">Selected</span>}
                  {!model.available && <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-ink-faint"><Lock size={10} />Later</span>}
                </div>
                <div className="mt-1 text-[13px] leading-normal text-ink-dim">{model.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2.5">
            <GhostButton onClick={() => setStep(prevStep)}>← Back</GhostButton>
            <GoldButton onClick={() => setStep(7)} disabled={!selectedModel}>Next: Confirm filing →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 7 — Confirm */}
      {step === 7 && (
        <div>
          <SectionHeader stamp={stepStamp}>Confirm Filing</SectionHeader>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-5 mb-5">
            <div className="text-[10px] uppercase tracking-[0.15em] text-terminal-amber mb-4">
              ◈ Drennia Commercial Registry — Filing Confirmation
            </div>
            <FieldRow label="Company Name" value={companyNameInput} />
            <FieldRow label="Legal Structure" value={isFinance ? 'Private Company' : selectedStructure === 'sole-trader' ? 'Sole Trader' : selectedStructure === 'private-company' ? 'Private Company' : 'Corporation'} />

            <FieldRow label="Sector" value={selectedSector} />
            <FieldRow label="Headquarters" value={hqOptions.find((h: HqOption) => h.id === selectedHQ)?.city || selectedHQ} />
            {!isFinance && (
              <FieldRow label={isLogistics ? "Operating Model" : "Subsector"} value={isLogistics ? selectedModel : getSubsectorName(selectedModel)} valueColor="#f5a623" />
            )}
            <FieldRow label="Filing Date" value={formatGameDate()} />
            <FieldRow label="Capital Filed" value={formatMoney(chosenCapital)} valueColor="#4FB286" />
            <FieldRow label="Filing Fee" value={formatMoney(effectiveFee)} valueColor="#D9625A" />
            <FieldRow label="Total Deducted from Cash" value={formatMoney(total)} valueColor="#f5a623" />
          </div>
          <p className="mb-5 text-[13px] leading-relaxed text-ink-dim">
            By confirming, this filing becomes a permanent public record in the Drennia Commercial Registry.
          </p>
          {startError && <div className="text-[11px] text-terminal-red mb-4 rounded-md border border-terminal-red/50 bg-terminal-red/10 p-2.5">{startError}</div>}
          <div className="flex gap-2.5">
            <GhostButton onClick={() => setStep(prevStep)} disabled={isSubmitting}>← Back</GhostButton>
            <GoldButton onClick={onRegister} disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : '◈ Confirm Filing & Register'}
            </GoldButton>
          </div>
        </div>
      )}
          </Card>
      </div>

      {/* Right rail: the filing so far */}
      <aside className="lg:sticky lg:top-16" aria-label="Filing summary">
      <Card pad="md">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          Filing summary
        </div>
        <FieldRow label="Company Name" value={companyNameInput || '—'} />
        <FieldRow label="Legal Structure" value={isFinance ? 'Private Company' : selectedStructure === 'sole-trader' ? 'Sole Trader' : selectedStructure === 'private-company' ? 'Private Company' : 'Corporation'} />

        <FieldRow label="Sector" value={selectedSector || '—'} />
        <FieldRow label="Headquarters" value={hqOptions.find((h: HqOption) => h.id === selectedHQ)?.city || selectedHQ || '—'} />
        {!isFinance && (
          <FieldRow label={isLogistics ? "Operating Model" : "Subsector"} value={selectedModel ? (isLogistics ? selectedModel : getSubsectorName(selectedModel)) : '—'} />
        )}
        <FieldRow label="Capital Filed" value={formatMoney(chosenCapital)} valueColor="#4FB286" />
        <FieldRow label="Filing fee" value={formatMoney(effectiveFee)} />
        <FieldRow label="Total cost" value={formatMoney(totalCost)} />
        <FieldRow label="Cash left after filing" value={formatMoney(playerCash - totalCost)} valueColor={playerCash - totalCost < 0 ? '#D9625A' : undefined} />
        {selectedSector && (
          <div className="mt-4 rounded-control border border-line bg-raised/50 p-3.5">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">After filing</div>
            <p className="m-0 text-[13px] leading-relaxed text-ink-dim">
              {isFinance
                ? <>Fund your firm, then buy shares on the exchange to start earning dividends each month.</>
                : isLogistics
                  ? <>Visit the Procurement desk to buy your first vehicle: {selectedModel === 'Port Shuttle Operator' || selectedModel === 'Local Courier Operator' ? 'a used delivery van' : 'a box truck'}.</>
                  : <>Open your company, lease a factory, design your first car and set a production line. Then pick the markets you sell in.</>}
            </p>
          </div>
        )}
      </Card>
      </aside>

    </div>
  );
}

// ─────────────────────────────────────────────────────────———───────────────────
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
            <button key={tab.id} onClick={() => setDeskTab(tab.id)} style={{ padding: '8px 14px', fontSize: '13px', fontWeight: isActive ? 700 : 500, color: isActive ? T.gold : T.muted, background: 'transparent', border: 'none', borderBottom: isActive ? `2px solid ${T.gold}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: 10 }}>
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
            <PanelBox style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(79,178,134,0.03)', border: `1px solid ${T.mint}40` }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: `6px solid ${T.mint}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 0 20px rgba(79,178,134,0.1)' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: T.ivory }}>100%</span>
                <span style={{ fontSize: '10px', color: T.mint, fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", textTransform: 'uppercase' }}>Owned</span>
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
                  <div style={{ fontSize: '10px', color: T.gold, fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", textTransform: 'uppercase', marginBottom: '8px' }}>Next Resolution:</div>
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
                    <PanelBox style={{ background: hasWestport ? 'rgba(79,178,134,0.02)' : T.panel, border: `1px solid ${hasWestport ? T.mint : T.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hasWestport ? T.mint : T.ivory }}>Westport Depot</span>
                        <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: hasWestport ? T.mint : T.faint, border: `1px solid ${hasWestport ? T.mint : T.border}`, padding: '1px 5px' }}>{hasWestport ? 'Active' : 'Missing'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.4 }}>
                        {hasWestport ? '✓ Port Shuttle yield increased by 35% across Westport routes.' : 'Lease Westport Depot/Warehouse to boost Port Shuttle yield by 35%.'}
                      </div>
                    </PanelBox>
                    <PanelBox style={{ background: hasDrennport ? 'rgba(79,178,134,0.02)' : T.panel, border: `1px solid ${hasDrennport ? T.mint : T.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hasDrennport ? T.mint : T.ivory }}>Drennport Depot</span>
                        <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: hasDrennport ? T.mint : T.faint, border: `1px solid ${hasDrennport ? T.mint : T.border}`, padding: '1px 5px' }}>{hasDrennport ? 'Active' : 'Missing'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.4 }}>
                        {hasDrennport ? '✓ Courier yield increased by 25% across Drennport routes.' : 'Lease Drennport Depot/Warehouse to boost Local Courier yield by 25%.'}
                      </div>
                    </PanelBox>
                    <PanelBox style={{ background: branchCount > 0 ? 'rgba(79,178,134,0.02)' : T.panel, border: `1px solid ${branchCount > 0 ? T.mint : T.border}`, gridColumn: 'span 2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: branchCount > 0 ? T.mint : T.ivory }}>Branch Network</span>
                        <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: branchCount > 0 ? T.mint : T.faint, border: `1px solid ${branchCount > 0 ? T.mint : T.border}`, padding: '1px 5px' }}>{branchCount > 0 ? `${branchCount} Active` : 'Inactive'}</span>
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
                      <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.mint, background: 'rgba(79,178,134,0.1)', border: `1px solid ${T.mint}`, padding: '1px 6px' }}>
                        ⚡ Boosted {boostPct}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px' }}>
                    {pool === 'Local Delivery Pool' ? 'High volume local courier work around Drennport. Steady demand, high competition.' : 'Container and crate movement around Westport docks. High demand.'}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', fontSize: '10px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.faint, marginBottom: '12px' }}>
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
                <span style={{ fontSize: '14px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", fontWeight: 700, color: T.muted }}>?</span>
              </div>
            </PanelBox>
            {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 && (
              <PanelBox style={{ marginBottom: '16px', background: 'rgba(217,98,90,0.05)', border: `1px solid ${T.red}` }}>
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
                }} style={{ background: T.panelSoft, color: T.ivory, border: `1px solid ${T.border}`, padding: '2px 4px', fontSize: '11px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace" }}>
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
                        {v.assignedContractId && <span style={{ color: T.mint, border: `1px solid ${T.mint}`, padding: '2px 6px', background: 'rgba(79,178,134,0.1)' }}>On Contract</span>}
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
                      <div key={c.id} style={{ background: 'rgba(79,178,134,0.02)', padding: '16px', border: `1px solid ${T.mint}40`, borderRadius: '4px' }}>
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
                        
                        <div style={{ background: 'rgba(232,184,75,0.08)', padding: '12px', border: `1px solid ${T.gold}40`, fontSize: '12px', color: T.gold }}>
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
                      <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", textTransform: 'uppercase', color: h.result === 'completed' ? T.mint : T.red }}>{h.result}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{h.title}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: T.muted }}>Issuer: {h.issuer}</div>
                    <div style={{ fontSize: '11px', color: T.muted }}>Route: {h.originState} → {h.destinationState}</div>
                    <div style={{ fontSize: '11px', color: T.muted }}>Vehicle: {h.vehicleName}</div>
                    {h.trustImpact && <div style={{ fontSize: '11px', color: h.trustImpact === 'Improved' ? T.mint : h.trustImpact === 'Decreased' ? T.red : T.faint }}>Trust: {h.trustImpact}</div>}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '14px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: h.result === 'completed' ? T.mint : T.muted }}>Pay: {formatMoney(h.payment)}</div>
                    <div style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.faint }}>Cost: {formatMoney(h.operatingCost)}</div>
                    {h.penalty > 0 && <div style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.red }}>Penalty: {formatMoney(h.penalty)}</div>}
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
                      <div style={{ fontSize: '10px', color: T.muted, fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace" }}>Distance: Variable · Risk: Low · Demand: Variable</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.faint }}>Familiarity</div>
                      <div style={{ fontSize: '16px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: fam > 0 ? T.mint : T.faint }}>{fam}%</div>
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
                  Your personal cash: <span style={{ color: T.mint, fontWeight: 700, fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace" }}>{formatMoney(playerCash)}</span>
                  &nbsp;·&nbsp; Company cash: <span style={{ color: T.ivory, fontWeight: 700, fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace" }}>{formatMoney((company as any).finances?.available_cash ?? company.companyCash ?? 0)}</span>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 150px 2fr 100px 100px', padding: '8px', borderBottom: `1px solid ${T.border}`, fontSize: '10px', color: T.faint, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace" }}>
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
                <div>Advanced financial charts are not in the closed alpha yet.</div>
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
            <div style={{ fontSize: '18px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.mint, fontWeight: 700 }}>{formatMoney(vehicleAssetValue)}</div>
            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>{fleet.length} active units</div>
          </PanelBox>
          <PanelBox>
            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Facility Lease Position</div>
            <div style={{ fontSize: '18px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.steel, fontWeight: 700 }}>{formatMoney(totalLeasedCost)}/mo</div>
            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>{(company.facilities || []).length} active leases</div>
          </PanelBox>
          <PanelBox>
            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Property Value</div>
            <div style={{ fontSize: '18px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.faint, fontWeight: 700 }}>$0</div>
            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>Locked (Land Purchasing)</div>
          </PanelBox>
          <PanelBox>
            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Total Company Asset Value</div>
            <div style={{ fontSize: '18px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.gold, fontWeight: 700 }}>{formatMoney(calcCompanyValue(company))}</div>
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
                    <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.ivory }}>{formatMoney(Math.round(v.purchaseCost * (v.condition / 100)))}</span>
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
                    <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.steel }}>{formatMoney(f.leaseCost)}/mo</span>
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
                    <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', color: T.faint, padding: '2px 6px', borderRadius: '2px' }}>{getStateName(f.stateId || f.state) || f.state}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px' }}>Active Lease</div>
                </div>
                <div style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.steel, fontWeight: 700 }}>
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
                  <div style={{ fontSize: '14px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: fac.leaseable ? T.mint : T.faint, fontWeight: 700 }}>
                    {fac.leaseable ? `${formatMoney(fac.leaseCost)}/mo` : '---'}
                  </div>
                </div>
              </div>
              {fac.leaseable ? (
                <div style={{ borderTop: '1px dashed ' + T.border, paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", color: T.faint, textTransform: 'uppercase' }}>State:</span>
                    <select 
                      value={selectedStates[fac.type] || company.headquartersStateId}
                      onChange={e => setSelectedStates({ ...selectedStates, [fac.type]: e.target.value })}
                      style={{ background: T.bg, border: '1px solid ' + T.border, color: T.ivory, fontSize: '11px', padding: '4px 8px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace" }}
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

  const [query, setQuery] = React.useState('');
  const shown = query.trim()
    ? all.filter(c => String(c.name || '').toLowerCase().includes(query.trim().toLowerCase()))
    : all;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="m-0 font-display text-[20px] font-semibold text-ink">Commercial registry</h2>
          <p className="m-0 mt-1 text-[14px] text-ink-dim">
            {loading || fetchError ? 'Every active business, on the public record.' : `${all.length} registered ${all.length === 1 ? 'company' : 'companies'}: every active business, on the public record.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="registry-search">Find a company</label>
          <input
            id="registry-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find a company"
            className="terminal-input w-56 !py-2 !text-[13px]"
          />
          <button type="button" onClick={onRefresh} className="btn-secondary !px-3.5 !py-2 !text-[13px]">↺ Refresh</button>
        </div>
      </div>
      {loading ? (
        <PanelBox><p className="m-0 text-[14px] text-ink-dim" role="status">Loading the registry…</p></PanelBox>
      ) : fetchError ? (
        <PanelBox>
          <p className="m-0 mb-2 text-[14px] text-bad">{fetchError}</p>
          <p className="m-0 text-[13px] text-ink-faint">Try Refresh. If it keeps failing, tell us on Discord.</p>
        </PanelBox>
      ) : all.length === 0 ? (
        <PanelBox><p className="m-0 text-[14px] text-ink-dim">No companies registered yet. File the first one from Start Business.</p></PanelBox>
      ) : shown.length === 0 ? (
        <PanelBox><p className="m-0 text-[14px] text-ink-dim">No company matches “{query}”.</p></PanelBox>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map(c => {
            const mine = c.id === company?.id;
            return (
              <li key={c.id} className={`flex flex-col gap-3 rounded-card border bg-surface p-4 shadow-card ${mine ? 'border-accent/60' : 'border-line'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`truncate text-[15px] font-semibold ${mine ? 'text-accent' : 'text-ink'}`}>{c.name}</div>
                    {mine && <div className="text-[12px] text-accent">Your company</div>}
                  </div>
                  <span className="shrink-0 rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-semibold capitalize text-good">{c.status}</span>
                </div>
                <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                  <div><dt className="text-ink-faint">Sector</dt><dd className="m-0 text-ink-dim">{getSectorName(c.industry_id) || '—'}</dd></div>
                  <div><dt className="text-ink-faint">Head office</dt><dd className="m-0 text-ink-dim">{getStateName(c.headquarters_state_id) || '—'}</dd></div>
                  <div><dt className="text-ink-faint">Structure</dt><dd className="m-0 text-ink-dim">{getLegalStructureName(c.legal_structure_id) || '—'}</dd></div>
                  {c.created_at_world_year !== undefined && c.created_at_world_year !== null && (
                    <div><dt className="text-ink-faint">Founded</dt><dd className="m-0 font-mono text-ink-dim">{formatWorldDate(c.created_at_world_year, c.created_at_world_month)}</dd></div>
                  )}
                </dl>
              </li>
            );
          })}
        </ul>
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
          <span style={{ fontSize: '16px', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", fontWeight: 700, color: T.gold }}>{formatMoney(netWorth)}</span>
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
        <button onClick={() => setProcTab('orders')} style={{ background: 'none', border: 'none', color: procTab === 'orders' ? T.gold : T.muted, cursor: 'pointer', fontSize: '13px', borderRadius: 10 }}>New Vehicle Orders</button>
        <button onClick={() => setProcTab('used')} style={{ background: 'none', border: 'none', color: procTab === 'used' ? T.gold : T.muted, cursor: 'pointer', fontSize: '13px', borderRadius: 10 }}>Used Market (🔒)</button>
        <button onClick={() => setProcTab('facilities')} style={{ background: 'none', border: 'none', color: procTab === 'facilities' ? T.gold : T.muted, cursor: 'pointer', fontSize: '13px', borderRadius: 10 }}>Facility Leasing</button>
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
  const router = useRouter();
  const venues = [
    {
      href: '/drennia/exchange',
      kicker: 'Drennport Exchange',
      title: 'DRX Bourse: share market',
      body: 'Trade shares of listed companies on a live order book. Take your own company public to raise capital: it needs the Corporation structure, and the IPO desk inside your company lists every requirement.',
      facts: ['Limit orders', 'Price-time priority', 'Instant settlement'],
      cta: 'Enter the Bourse',
      primary: true,
    },
    {
      href: '/drennia/investments',
      kicker: 'Private capital',
      title: 'Private capital market',
      body: 'Buy equity in private, unlisted companies through fixed-price placements, and post or accept loans between players. Open to every structure except Sole Trader.',
      facts: ['Fixed-price placements', 'Shareholder cap', 'Monthly loan repayments'],
      cta: 'Open the private market',
      primary: false,
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {venues.map(v => (
        <button
          key={v.href}
          type="button"
          onClick={() => router.push(v.href)}
          className={`group flex flex-col gap-4 rounded-card border p-6 text-left shadow-card transition-colors ${v.primary ? 'border-accent/40 bg-accent/[0.04] hover:border-accent/70' : 'border-line bg-surface hover:border-line-strong'}`}
        >
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{v.kicker}</div>
            <h2 className="m-0 font-display text-[22px] font-semibold text-ink">{v.title}</h2>
          </div>
          <p className="m-0 max-w-[62ch] text-[14px] leading-relaxed text-ink-dim">{v.body}</p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {v.facts.map(f => <li key={f} className="rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-dim">{f}</li>)}
          </ul>
          <span className="mt-auto inline-flex items-center gap-1.5 border-t border-line pt-4 text-[14px] font-semibold text-accent">
            {v.cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </button>
      ))}
    </div>
  );
}
