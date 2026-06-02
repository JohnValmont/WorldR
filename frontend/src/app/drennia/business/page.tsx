'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCompanies, saveCompany, getPlayerCompany,
  getContracts, saveContract, initializeContractsIfEmpty,
  evaluatePlayerBid, assignVehicleToContract, resolveContract,
  getFleet, purchaseVehicle, performMaintenance, calcNetWorth, calcCompanyValue, addRecord,
  VEHICLE_CATALOGUE, formatMoney, getContractHistory, acceptDirectContract, assignVehicleToAutoOp, runMonthlyAutoOperations, getRouteFamiliarity, leaseFacility, saveVehicle,
  type Company, type Contract, type Vehicle, type VehicleType, type ContractHistoryEntry, type RouteFamiliarity, type AutoOpPoolType
} from '../../../lib/businessCore';

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

// ─── Reusable Atoms ──────────────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint, marginBottom: '4px' }}>
    {children}
  </div>
);

const FieldRow = ({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
    <span style={{ fontSize: '11px', color: T.muted }}>{label}</span>
    <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: valueColor || T.ivory }}>{value}</span>
  </div>
);

const SectionHeader = ({ children, stamp }: { children: React.ReactNode; stamp?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
    <div style={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.gold, fontWeight: 700 }}>
      {children}
    </div>
    {stamp && <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint, letterSpacing: '0.1em', border: `1px solid ${T.border}`, padding: '2px 8px' }}>{stamp}</div>}
  </div>
);

const PanelBox = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px', ...style }}>
    {children}
  </div>
);

const GoldButton = ({ onClick, children, disabled }: { onClick?: () => void; children: React.ReactNode; disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: disabled ? 'rgba(255,255,255,0.03)' : `linear-gradient(135deg, ${T.gold}, #8A6E2A)`,
      color: disabled ? T.faint : '#0a0709',
      border: `1px solid ${disabled ? T.border : T.gold}`,
      padding: '10px 24px',
      fontSize: '10px',
      fontFamily: 'monospace',
      textTransform: 'uppercase',
      letterSpacing: '0.15em',
      fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    {children}
  </button>
);

const GhostButton = ({ onClick, children, color }: { onClick?: () => void; children: React.ReactNode; color?: string }) => (
  <button
    onClick={onClick}
    style={{
      background: 'transparent', color: color || T.muted, border: `1px solid ${T.border}`,
      padding: '8px 18px', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase',
      letterSpacing: '0.12em', fontWeight: 600, cursor: 'pointer',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.ivory; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = color || T.muted; }}
  >
    {children}
  </button>
);

// ─── Sub-tab types ────────────────────────────────────────────────────────────
type SubTab = 'overview' | 'start' | 'companies' | 'market' | 'registry';

const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'start',      label: 'Start Business' },
    { id: 'companies',  label: 'My Companies', requiresCompany: true },
    { id: 'registry',   label: 'Registry' }
  ];

// ─── SECTORS ─────────────────────────────────────────────────────────────────
const SECTORS = [
  { id: 'Shipping & Logistics', desc: 'Freight, transport, port handling, and supply chain operations.', available: true },
  { id: 'Manufacturing',        desc: 'Production, parts, assembly, and industrial output.',              available: false, note: 'Coming Next' },
  { id: 'Retail & Consumer',    desc: 'Consumer goods, storefronts, and distribution.',                   available: false, note: 'Later' },
  { id: 'Agriculture & Food',   desc: 'Farming, processing, and food supply chains.',                     available: false, note: 'Later' },
  { id: 'Finance & Services',   desc: 'Banking, lending, insurance, and advisory.',                       available: false, note: 'Later' },
  { id: 'Construction',         desc: 'Infrastructure, building, and civil development.',                  available: false, note: 'Later' },
  { id: 'Technology',           desc: 'Tools, communications, and emerging tech.',                        available: false, note: 'Later' },
  { id: 'Energy',               desc: 'Fuel, steam, coal, and energy distribution.',                      available: false, note: 'Later' },
];

// ─── HQ OPTIONS ──────────────────────────────────────────────────────────────
const HQ_OPTIONS = [
  { id: 'Drennport State',  city: 'Drennport', tagline: 'Finance, Law & Administration', costNote: '▲ Higher Costs',  costColor: T.red,   desc: 'Capital city. Excellent registry access and professional services. Higher operating costs.' },
  { id: 'Westport State',   city: 'Westport',  tagline: 'Ports, Trade & Export',         costNote: '≈ Moderate Costs', costColor: T.gold,  desc: 'Major port hub with strong shipping and logistics contracts.' },
  { id: 'Ironvale State',   city: 'Ironvale',  tagline: 'Manufacturing & Labour',        costNote: '▼ Lower Costs',   costColor: T.mint,  desc: 'Industrial state. Good supply of materials and factory capacity.' },
  { id: 'Greenmere State',  city: 'Greenmere', tagline: 'Agriculture & Community',       costNote: '▼ Lowest Costs',  costColor: T.mint,  desc: 'Slow but steady market. Strong for food and local logistics.' },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

function MarketTab({ playerCash, onRefresh }: { playerCash: number, onRefresh: () => void }) {
  const [subTab, setSubTab] = React.useState<'vehicles'|'property'|'equipment'|'materials'|'contracts'|'shares'>('vehicles');
  const companies = getCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>(companies[0]?.id || '');
  const [notification, setNotification] = React.useState<{ msg: string; success: boolean } | null>(null);

  const company = companies.find(c => c.id === selectedCompanyId);

  const showNotif = (msg: string, success: boolean) => {
    setNotification({ msg, success });
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePurchaseVehicle = (spec: any) => {
    if (!company) {
      showNotif('You need an active company before buying business vehicles.', false);
      return;
    }
    const result = purchaseVehicle(company.id, spec.type);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  const handleLease = (type: string, cost: number, state: string) => {
    if (!company) {
      showNotif('You need an active company before leasing business facilities.', false);
      return;
    }
    const result = leaseFacility(company.id, type as any, state, cost);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  const lockedTab = (name: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionHeader>{name}</SectionHeader>
      <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px dashed ' + T.border, padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Locked / Coming Later</div>
        <div style={{ fontSize: '11px', color: T.faint, marginTop: '8px' }}>This market section is not yet available in pre-alpha.</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-6 px-8 py-3 border-b" style={{ borderColor: T.border, background: 'rgba(0,0,0,0.2)', overflowX: 'auto' }}>
        {[
          { id: 'vehicles', label: 'Vehicles' },
          { id: 'property', label: 'Property' },
          { id: 'equipment', label: 'Equipment 🔒' },
          { id: 'materials', label: 'Materials 🔒' },
          { id: 'contracts', label: 'Contract Exchange 🔒' },
          { id: 'shares', label: 'Company Shares 🔒' },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as any)} style={{ color: subTab === t.id ? T.gold : T.muted, borderBottom: subTab === t.id ? '2px solid ' + T.gold : '2px solid transparent', whiteSpace: 'nowrap' }} className="text-[11px] font-mono uppercase tracking-widest pb-1">
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Buy for:</span>
          <select 
            value={selectedCompanyId} 
            onChange={e => setSelectedCompanyId(e.target.value)}
            className="text-[11px] font-mono px-2 py-1 rounded-sm"
            style={{ background: T.panel, color: T.gold, border: '1px solid ' + T.border }}
          >
            <option value="">-- Select Company --</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {notification && (
        <div className="mx-8 mt-6 px-4 py-3 rounded-sm" style={{ background: notification.success ? 'rgba(54, 211, 153, 0.1)' : 'rgba(184, 85, 85, 0.1)', border: '1px solid ' + (notification.success ? T.mint : T.red) }}>
          <div className="text-sm font-bold" style={{ color: notification.success ? T.mint : T.red }}>
            {notification.success ? 'Success' : 'Notice'}
          </div>
          <div className="text-xs mt-1" style={{ color: T.ivory }}>{notification.msg}</div>
        </div>
      )}

      <div className="business-content-grid p-8 gap-8 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {subTab === 'vehicles' && (
            <>
              <SectionHeader>🚚 New Vehicle Listings</SectionHeader>
              <div className="grid grid-cols-2 gap-4">
                {VEHICLE_CATALOGUE.map(spec => {
                  const canAfford = company && company.companyCash >= spec.cost;
                  return (
                    <div key={spec.type} className="p-4 border rounded-sm flex flex-col" style={{ background: T.panel, borderColor: T.border }}>
                      <div className="text-sm font-bold text-ivory mb-1">{spec.type}</div>
                      <div className="text-[11px] text-zinc-400 mb-4">{spec.desc}</div>
                      <div className="flex items-center justify-between mt-auto">
                        <div>
                          <div className="text-sm font-mono font-bold" style={{ color: canAfford ? T.mint : T.red }}>{formatMoney(spec.cost)}</div>
                          <div className="text-[10px] font-mono" style={{ color: T.faint }}>Maint: {formatMoney(spec.maintenance)}/mo</div>
                        </div>
                        <GoldButton onClick={() => handlePurchaseVehicle(spec)}>Order New</GoldButton>
                      </div>
                    </div>
                  );
                })}
              </div>

              <SectionHeader>🏷️ Used Vehicle Listings</SectionHeader>
              <div className="p-4 border rounded-sm text-center" style={{ borderColor: T.border, background: 'rgba(0,0,0,0.2)' }}>
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">No used listings currently available on the market.</div>
              </div>

              <SectionHeader>🏭 Player Manufacturing</SectionHeader>
              <div className="p-4 border border-dashed rounded-sm text-center" style={{ borderColor: T.border }}>
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Player manufacturing companies will be able to list vehicles here later.</div>
              </div>
            </>
          )}

          {subTab === 'property' && (
            <>
              <SectionHeader>🏢 Available Properties & Facilities</SectionHeader>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { type: 'Office', state: 'Drennport State', cost: 10000, benefit: 'Provides legitimacy and client trust later.' },
                  { type: 'Vehicle Yard', state: 'Drennport State', cost: 15000, benefit: '+2 vehicle support capacity in selected state.' },
                  { type: 'Small Depot', state: 'Drennport State', cost: 25000, benefit: 'Improves local courier and port shuttle operations.' },
                  { type: 'Warehouse', state: 'Westport State', cost: 40000, benefit: 'Unlocks storage and larger retail restock contracts.' },
                  { type: 'Regional Branch Office', state: 'Ironvale State', cost: 30000, benefit: 'Expands business presence to another state.' }
                ].map((fac, i) => {
                  const canAfford = company && company.companyCash >= fac.cost;
                  return (
                    <div key={i} className="flex flex-row items-center justify-between p-4 border rounded-sm" style={{ background: T.panel, borderColor: T.border }}>
                      <div>
                        <div className="text-sm font-bold text-ivory flex items-center gap-2">
                          {fac.type}
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.05)', color: T.faint }}>{fac.state}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1">{fac.benefit}</div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <div className="text-sm font-mono font-bold" style={{ color: canAfford ? T.mint : T.red }}>{formatMoney(fac.cost)}/mo</div>
                        </div>
                        <GoldButton onClick={() => handleLease(fac.type, fac.cost, fac.state)}>Lease Facility</GoldButton>
                      </div>
                    </div>
                  );
                })}
              </div>

              <SectionHeader>🔒 Locked Markets</SectionHeader>
              <div className="flex gap-4">
                <div className="flex-1 p-3 border border-dashed text-center" style={{ borderColor: T.border }}><span className="text-[10px] font-mono text-zinc-500">Port Facilities</span></div>
                <div className="flex-1 p-3 border border-dashed text-center" style={{ borderColor: T.border }}><span className="text-[10px] font-mono text-zinc-500">Land Purchase</span></div>
                <div className="flex-1 p-3 border border-dashed text-center" style={{ borderColor: T.border }}><span className="text-[10px] font-mono text-zinc-500">Construction</span></div>
              </div>
            </>
          )}

          {subTab === 'equipment' && lockedTab('Equipment Market')}
          {subTab === 'materials' && lockedTab('Materials Market')}
          {subTab === 'contracts' && lockedTab('Contract Exchange')}
          {subTab === 'shares' && lockedTab('Company Shares')}
        </div>

        <div className="flex flex-col gap-6">
          <SectionHeader>📋 Selected Buyer Context</SectionHeader>
          <div className="p-5 border rounded-sm" style={{ background: T.panel, borderColor: T.border }}>
            {company ? (
              <div className="flex flex-col gap-3">
                <FieldRow label="Company" value={company.name} valueColor={T.ivory} />
                <FieldRow label="Cash Available" value={formatMoney(company.companyCash)} valueColor={T.mint} />
                <FieldRow label="Current Status" value={company.status} valueColor={T.steel} />
              </div>
            ) : (
              <div className="text-[11px] font-mono text-zinc-500 italic">No active company selected. Buying disabled.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BusinessPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [citizenFile, setCitizenFile] = useState<any>(null);
  const [characterName, setCharacterName] = useState('');
  const [playerCash, setPlayerCash] = useState(0);
  const [company, setCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Contracts state
  const [contracts, setContracts] = useState<Contract[]>([]);
  // Fleet state
  const [fleet, setFleet] = useState<Vehicle[]>([]);

  // Start Business state
  const [step, setStep] = useState(1);
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedHQ, setSelectedHQ] = useState('');
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [startError, setStartError] = useState('');
  const [chosenCapital, setChosenCapital] = useState(50000);
  const [selectedModel, setSelectedModel] = useState<'Local Courier Operator' | 'Port Shuttle Operator' | 'Interstate Freight Beginner' | 'Industrial Parts Carrier' | ''>('');

  const loadData = useCallback(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    const fileStr = localStorage.getItem('worldr_citizen_file_v1');
    if (fileStr) {
      const cf = JSON.parse(fileStr);
      setCitizenFile(cf);
      const cName = typeof cf.name === 'object' ? `${cf.name.first} ${cf.name.last}` : cf.name;
      setCharacterName(cName);
      setPlayerCash(cf.wealth ?? cf.personalMoney ?? 0);
      const playerCompany = getPlayerCompany(cName);
      setCompany(playerCompany || null);
      if (playerCompany) setFleet(getFleet(playerCompany.id));
    }
    initializeContractsIfEmpty();
    setContracts(getContracts());
    setAuthorized(true);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Helpers ────────────────────────────────────────────────────────────
  const refreshAll = () => {
    const fileStr = localStorage.getItem('worldr_citizen_file_v1');
    if (fileStr) {
      const cf = JSON.parse(fileStr);
      setCitizenFile(cf);
      setPlayerCash(cf.wealth ?? cf.personalMoney ?? 0);
      const cName = typeof cf.name === 'object' ? `${cf.name.first} ${cf.name.last}` : cf.name;
      const playerCompany = getPlayerCompany(cName);
      setCompany(playerCompany || null);
      if (playerCompany) setFleet(getFleet(playerCompany.id));
    }
    setContracts(getContracts());
  };

  const updateCash = (newCash: number) => {
    if (!citizenFile) return;
    const updated = { ...citizenFile, wealth: newCash, personalMoney: newCash };
    setCitizenFile(updated);
    setPlayerCash(newCash);
    localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(updated));
  };

  // ─── Net Worth ──────────────────────────────────────────────────────────
  const netWorth = calcNetWorth(playerCash, company);

  // ─── Start Business ──────────────────────────────────────────────────────
  const checkName = () => {
    setNameError('');
    if (!companyNameInput.trim()) { setNameError('Company name cannot be blank.'); return false; }
    if (companyNameInput.trim().length < 3) { setNameError('Name must be at least 3 characters.'); return false; }
    const allCompanies = getCompanies();
    const taken = allCompanies.some(c => c.name.toLowerCase() === companyNameInput.trim().toLowerCase());
    if (taken) { setNameError('That name is already registered in the Drennia registry.'); return false; }
    return true;
  };

  const handleRegisterCompany = () => {
    setStartError('');
    const FILING_FEE = 5000;
    const total = chosenCapital + FILING_FEE;
    if (playerCash < total) {
      setStartError(`Insufficient cash. You need ${formatMoney(total)} (${formatMoney(chosenCapital)} capital + ${formatMoney(FILING_FEE)} filing fee). You have ${formatMoney(playerCash)}.`);
      return;
    }
    if (!selectedModel) {
      setStartError('Please select a first operating model.');
      return;
    }
    const finalName = companyNameInput.trim();
    const newCompany: Company = {
      id: `comp_${Date.now()}`,
      ownerCharacterId: characterName,
      ownerName: characterName,
      name: finalName,
      legalStructure: 'Sole Trader',
      state: selectedHQ,
      sector: selectedSector,
      registeredAt: new Date().toISOString(),
      companyCash: chosenCapital,
      monthlyRevenue: 0, monthlyCosts: 0, profit: 0,
      capacity: 0,
      reputation: 'New', reliability: 'Unproven',
      debt: 0, status: 'Active',
      activeContracts: [], publicRecords: [], riskFlags: [],
      facilities: [],
      operatingModel: selectedModel,
    };
    saveCompany(newCompany);
    updateCash(playerCash - total);
    addRecord(`Registered ${finalName} as a Sole Trader (${selectedModel}) headquartered in ${selectedHQ}. Initial capital filed: ${formatMoney(chosenCapital)}.`);
    
    // Create/update career record
    const careerData = {
      activePath: 'Business',
      startedAtYear: 0,
      startedAtMonth: 0,
      entries: [
        {
          id: `car_${Date.now()}`,
          type: 'business_start',
          year: 0,
          month: 0,
          text: `${characterName} started ${finalName}, a ${selectedSector} business (${selectedModel}) headquartered in ${selectedHQ}, in Year 0.`,
          relatedCompanyId: newCompany.id
        }
      ]
    };
    localStorage.setItem('worldr_career_v1', JSON.stringify(careerData));

    setCompany(newCompany);
    setFleet([]);
    setActiveTab('companies');
  };

  if (!authorized) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>
      {/* ── Global Back to Chronicle ── */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <span style={{ cursor: 'pointer', color: T.muted, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }} onClick={() => router.push('/drennia/chronicle')}>
          ← Back to Chronicle
        </span>
      </div>

      {/* ── Business Header: Net Worth + Cash Only ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', borderBottom: `1px solid ${T.border}`, background: T.panel, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.2em', color: T.gold }}>WORLDr</span>
          <span style={{ width: '1px', height: '14px', background: T.border }} />
          <span style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint }}>Business Desk</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '8px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.12em', color: T.faint }}>Net Worth</span>
            <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>{formatMoney(netWorth)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '8px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.12em', color: T.faint }}>Cash in Hand</span>
            <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.mint }}>{formatMoney(playerCash)}</span>
          </div>
        </div>
      </div>

      {/* ── Page Title ── */}
      <div style={{ padding: '16px 24px 8px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: T.ivory, margin: 0 }}>Business</h1>
      </div>

      {/* ── Subtabs & Breadcrumbs ── */}
      <div style={{ padding: '0 24px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        {/* Dynamic Breadcrumbs */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 0 4px', fontSize: '10px', fontFamily: 'monospace', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <span style={{ cursor: 'pointer', color: activeTab === 'overview' ? T.gold : T.muted }} onClick={() => { setActiveTab('overview'); setSelectedCompanyId(null); }}>Business Desk</span>
          {activeTab === 'companies' && (
            <>
              <span>→</span>
              <span style={{ cursor: 'pointer', color: !selectedCompanyId ? T.gold : T.muted }} onClick={() => setSelectedCompanyId(null)}>My Companies</span>
            </>
          )}
          {activeTab === 'companies' && selectedCompanyId && company && (
            <>
              <span>→</span>
              <span style={{ color: T.gold }}>{company.name}</span>
            </>
          )}
        </div>

        {/* Subtabs */}
        <div style={{ display: 'flex', gap: '0', overflowX: 'auto', marginTop: '8px' }}>
          {SUB_TABS.map(tab => {
            const locked = tab.requiresCompany && !company;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!locked) {
                    setActiveTab(tab.id);
                    if (tab.id !== 'companies') setSelectedCompanyId(null);
                  }
                }}
                style={{
                  padding: '10px 16px', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em',
                  fontWeight: isActive ? 700 : 500, color: locked ? T.faint : isActive ? T.gold : T.muted,
                  background: 'transparent', border: 'none', borderBottom: isActive ? `2px solid ${T.gold}` : '2px solid transparent',
                  cursor: locked ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s',
                }}
                title={locked ? 'Register a company to unlock' : undefined}
              >
                {tab.label}{locked ? ' 🔒' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Back / Breadcrumb Navigation (Anchors) ── */}
      <div style={{ padding: '8px 24px 0', flexShrink: 0 }}>
        {activeTab === 'companies' && selectedCompanyId && company && (
          <span style={{ cursor: 'pointer', color: T.gold, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }} onClick={() => setSelectedCompanyId(null)}>
            ← Back to My Companies
          </span>
        )}
        {activeTab === 'start' && (
          <span style={{ cursor: 'pointer', color: T.gold, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }} onClick={() => { setActiveTab('overview'); setStep(1); }}>
            ← Back to Business Overview
          </span>
        )}
        {activeTab === 'registry' && (
          <span style={{ cursor: 'pointer', color: T.gold, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }} onClick={() => setActiveTab('overview')}>
            ← Back to Registry
          </span>
        )}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="business-page-inner">
        {activeTab === 'overview'  && <OverviewTab company={company} playerCash={playerCash} netWorth={netWorth} onStartBusiness={() => setActiveTab('start')} onViewContracts={() => { setActiveTab('companies'); setSelectedCompanyId(null); }} onViewRegistry={() => setActiveTab('registry')} />}
        {activeTab === 'start'     && <StartBusinessTab step={step} setStep={setStep} selectedSector={selectedSector} setSelectedSector={setSelectedSector} selectedHQ={selectedHQ} setSelectedHQ={setSelectedHQ} companyNameInput={companyNameInput} setCompanyNameInput={setCompanyNameInput} nameError={nameError} setNameError={setNameError} startError={startError} playerCash={playerCash} company={company} onRegister={handleRegisterCompany} checkName={checkName} chosenCapital={chosenCapital} setChosenCapital={setChosenCapital} selectedModel={selectedModel} setSelectedModel={setSelectedModel} />}
        
        {activeTab === 'companies' && company && !selectedCompanyId && (
          <div style={{ maxWidth: '860px' }}>
            <SectionHeader stamp="PORTFOLIO">My Companies</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div style={{ background: T.paper, border: `1px solid ${T.border}`, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${T.gold}` }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: T.ivory, marginBottom: '6px' }}>{company.name}</div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px', fontSize: '11px', color: T.muted }}>
                    <span>Structure: <strong style={{ color: T.gold }}>{company.legalStructure}</strong></span>
                    <span>Sector: <strong style={{ color: T.gold }}>{company.sector}</strong></span>
                    <span>HQ State: <strong style={{ color: T.gold }}>{company.state}</strong></span>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '11px', fontFamily: 'monospace', color: T.faint }}>
                    <span>Company Cash: <span style={{ color: T.mint }}>{formatMoney(company.companyCash)}</span></span>
                    <span>Company Value: <span style={{ color: T.gold }}>{formatMoney(calcCompanyValue(company))}</span></span>
                    <span>Reputation: <span style={{ color: T.gold }}>{company.reputation}</span></span>
                    <span>Reliability: <span style={{ color: T.ivory }}>{company.reliability}</span></span>
                    <span>Vehicles: <span style={{ color: T.mint }}>{fleet.length}</span></span>
                    <span>Active Contracts: <span style={{ color: T.gold }}>{company.activeContracts?.length || 0}</span></span>
                  </div>
                </div>
                <div>
                  <GoldButton onClick={() => setSelectedCompanyId(company.id)}>Manage Company →</GoldButton>
                </div>
              </div>

              {/* Additional Companies Card (Part 4) */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: `1px solid ${T.border}`, padding: '20px', borderLeft: `3px dashed ${T.faint}`, opacity: 0.7 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: T.muted, marginBottom: '6px' }}>Additional Companies</div>
                <div style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', color: T.gold, letterSpacing: '0.1em', marginBottom: '10px' }}>Coming Soon</div>
                <p style={{ fontSize: '11px', color: T.faint, lineHeight: 1.6, margin: 0 }}>
                  “Multiple company ownership, subsidiaries, holding companies, and cross-sector business groups will unlock later. Pre-alpha currently supports one active company.”
                </p>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'companies' && company && selectedCompanyId === company.id && (
          <CompanyDeskTab company={company} fleet={fleet} contracts={contracts} playerCash={playerCash} characterName={characterName} onRefresh={refreshAll} />
        )}
        
        
        {activeTab === 'market' && <MarketTab playerCash={playerCash} onRefresh={refreshAll} />}
{activeTab === 'registry'  && <RegistryTab company={company} />}
      </div>
    </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ company, playerCash, netWorth, onStartBusiness, onViewContracts, onViewRegistry }: {
  company: Company | null; playerCash: number; netWorth: number;
  onStartBusiness: () => void; onViewContracts: () => void; onViewRegistry: () => void;
}) {
  if (!company) {
    return (
      <div style={{ maxWidth: '560px' }}>
        <SectionHeader stamp="DRENNIA COMMERCIAL REGISTRY">Business Desk</SectionHeader>
        <PanelBox style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', color: T.muted, lineHeight: 1.7, margin: '0 0 8px' }}>
            Drennia's registry is open. Only <strong style={{ color: T.gold }}>Shipping & Logistics</strong> is available in v1.
          </p>
          <p style={{ fontSize: '12px', color: T.faint, lineHeight: 1.6, margin: '0 0 20px' }}>
            Start a company with a minimum of ₯50,000 capital. No maximum — invest as much as you have.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <GoldButton onClick={onStartBusiness}>Start Business →</GoldButton>
            <GhostButton onClick={onViewRegistry}>Public Registry</GhostButton>
          </div>
        </PanelBox>
        <PanelBox>
          <SectionHeader>Company Types Available</SectionHeader>
          <FieldRow label="Sole Trader" value="Active" valueColor={T.mint} />
          <FieldRow label="Private Company" value="Locked" valueColor={T.faint} />
          <FieldRow label="Corporation" value="Locked" valueColor={T.faint} />
        </PanelBox>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '860px' }}>
      <PanelBox>
        <SectionHeader stamp="COMPANY FILE">Empire Summary</SectionHeader>
        <FieldRow label="Company" value={company.name} />
        <FieldRow label="Structure" value={company.legalStructure} />
        <FieldRow label="Sector" value={company.sector} />
        <FieldRow label="HQ State" value={company.state} />
        <FieldRow label="Status" value={company.status} valueColor={T.mint} />
        <FieldRow label="Reputation" value={company.reputation} valueColor={T.gold} />
        <FieldRow label="Reliability" value={company.reliability} />
        {company.operatingModel && <FieldRow label="Operating Model" value={company.operatingModel} valueColor={T.gold} />}
      </PanelBox>
      <PanelBox>
        <SectionHeader stamp="LEDGER">Financial Position</SectionHeader>
        <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
        <FieldRow label="Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.burgundy : T.muted} />
        <FieldRow label="Net Worth (total)" value={formatMoney(netWorth)} valueColor={T.gold} />
      </PanelBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// START BUSINESS TAB
// ─────────────────────────────────────────────────────────────────────────────
// START BUSINESS TAB
// ─────────────────────────────────────────────────────────────────────────────
function StartBusinessTab({ step, setStep, selectedSector, setSelectedSector, selectedHQ, setSelectedHQ, companyNameInput, setCompanyNameInput, nameError, setNameError, startError, playerCash, company, onRegister, checkName, chosenCapital, setChosenCapital, selectedModel, setSelectedModel }: any) {
  if (company) {
    return (
      <PanelBox style={{ maxWidth: '540px' }}>
        <SectionHeader>Company Already Registered</SectionHeader>
        <p style={{ fontSize: '13px', color: T.muted, lineHeight: 1.7 }}>
          You have already registered <strong style={{ color: T.ivory }}>{company.name}</strong>. Pre-alpha currently supports one active company. Multiple companies, subsidiaries, and holding structures are coming soon.
        </p>
      </PanelBox>
    );
  }

  const STEP_LABELS = ['Sector', 'Headquarters', 'Structure', 'Company Name', 'Starting Capital', 'Operating Model', 'Confirm Filing'];
  const FILING_FEE = 5000;
  const total = chosenCapital + FILING_FEE;
  const canAfford = playerCash >= total;

  return (
    <div style={{ maxWidth: '620px' }}>
      {/* Stepper */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '28px', borderBottom: `1px solid ${T.border}` }}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const done = step > stepNum;
          const active = step === stepNum;
          return (
            <div key={label} style={{ flex: 1, padding: '8px 4px 10px', textAlign: 'center', borderBottom: active ? `2px solid ${T.gold}` : '2px solid transparent' }}>
              <div style={{ fontSize: '8px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: done ? T.mint : active ? T.gold : T.faint }}>
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
          <p style={{ fontSize: '12px', color: T.muted, marginBottom: '20px', lineHeight: 1.7 }}>
            Only <strong style={{ color: T.gold }}>Shipping & Logistics</strong> is available in the current version. Other sectors are coming soon.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {SECTORS.map(s => (
              <button
                key={s.id}
                onClick={() => s.available && setSelectedSector(s.id)}
                disabled={!s.available}
                style={{
                  padding: '14px 18px',
                  background: selectedSector === s.id ? 'rgba(201,162,74,0.08)' : 'rgba(255,255,255,0.02)',
                  border: selectedSector === s.id ? `1px solid ${T.gold}` : `1px solid ${T.border}`,
                  cursor: s.available ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  opacity: s.available ? 1 : 0.4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: s.available ? T.ivory : T.faint }}>{s.id}</span>
                  {!s.available && <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint, letterSpacing: '0.1em' }}>{(s as any).note || 'LOCKED'}</span>}
                  {selectedSector === s.id && <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.gold, letterSpacing: '0.1em' }}>SELECTED ✓</span>}
                </div>
                <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px' }}>{s.desc}</div>
              </button>
            ))}
          </div>
          <GoldButton onClick={() => setStep(2)} disabled={!selectedSector}>Next: Headquarters →</GoldButton>
        </div>
      )}

      {/* Step 2 — HQ */}
      {step === 2 && (
        <div>
          <SectionHeader stamp="STEP 2 OF 7">Headquarters Location</SectionHeader>
          <p style={{ fontSize: '12px', color: T.muted, marginBottom: '20px', lineHeight: 1.7 }}>Your HQ state affects operating costs, contract access, and market exposure.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {HQ_OPTIONS.map(hq => (
              <button key={hq.id} onClick={() => setSelectedHQ(hq.id)} style={{ padding: '16px 18px', background: selectedHQ === hq.id ? 'rgba(201,162,74,0.08)' : 'rgba(255,255,255,0.02)', border: selectedHQ === hq.id ? `1px solid ${T.gold}` : `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{hq.city}</span>
                    <span style={{ fontSize: '10px', color: T.muted, marginLeft: '10px' }}>{hq.tagline}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: hq.costColor }}>{hq.costNote}</span>
                    {selectedHQ === hq.id && <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.gold }}>✓</span>}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: T.muted, marginTop: '6px', lineHeight: 1.6 }}>{hq.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={() => setStep(1)}>← Back</GhostButton>
            <GoldButton onClick={() => setStep(3)} disabled={!selectedHQ}>Next: Structure →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 3 — Structure */}
      {step === 3 && (
        <div>
          <SectionHeader stamp="STEP 3 OF 7">Legal Structure</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {[
              { label: 'Sole Trader', desc: 'Simplest structure. Full ownership, full liability, lowest filing cost.', active: true },
              { label: 'Private Company', desc: 'Separate legal entity. Can add partners and issue shares.', active: false },
              { label: 'Corporation', desc: 'Full liability protection. Required for public trading.', active: false },
            ].map(s => (
              <div key={s.label} style={{ padding: '14px 18px', background: s.active ? 'rgba(201,162,74,0.08)' : 'rgba(255,255,255,0.01)', border: s.active ? `1px solid ${T.gold}` : `1px solid ${T.border}`, opacity: s.active ? 1 : 0.4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: s.active ? T.ivory : T.faint }}>{s.label}</span>
                  {s.active ? <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.gold }}>ACTIVE ✓</span> : <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint }}>LOCKED</span>}
                </div>
                <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px' }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={() => setStep(2)}>← Back</GhostButton>
            <GoldButton onClick={() => setStep(4)}>Next: Name →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 4 — Name */}
      {step === 4 && (
        <div>
          <SectionHeader stamp="STEP 4 OF 7">Company Name</SectionHeader>
          <p style={{ fontSize: '12px', color: T.muted, marginBottom: '20px', lineHeight: 1.7 }}>
            This becomes your permanent business identity in Drennia. Names are public and cannot be reused.
          </p>
          <div style={{ marginBottom: '20px' }}>
            <Label>Company Name</Label>
            <input
              type="text"
              value={companyNameInput}
              onChange={e => { setCompanyNameInput(e.target.value); setNameError(''); }}
              placeholder="e.g. Vane & Sons Freight Co."
              style={{ width: '100%', padding: '12px 16px', background: T.paper, border: `1px solid ${nameError ? T.burgundy : T.border}`, color: T.ivory, fontSize: '14px', fontFamily: 'serif', outline: 'none', boxSizing: 'border-box' }}
            />
            {nameError && <div style={{ fontSize: '11px', color: T.red, marginTop: '6px' }}>{nameError}</div>}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={() => setStep(3)}>← Back</GhostButton>
            <GoldButton onClick={() => { if (checkName()) setStep(5); }}>Check & Continue →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 5 — Starting Capital */}
      {step === 5 && (
        <div>
          <SectionHeader stamp="STEP 5 OF 7">Starting Capital</SectionHeader>
          <PanelBox style={{ marginBottom: '16px' }}>
            <FieldRow label="Company Name" value={companyNameInput} />
            <FieldRow label="Sector" value={selectedSector} />
            <FieldRow label="HQ State" value={selectedHQ} />
            <FieldRow label="Legal Structure" value="Sole Trader" />
          </PanelBox>
          <PanelBox style={{ background: T.paper, marginBottom: '24px' }}>
            <SectionHeader>Starting Capital</SectionHeader>
            <p style={{ fontSize: '12px', color: T.muted, lineHeight: 1.7, marginBottom: '16px' }}>
              Minimum: <strong style={{ color: T.gold }}>₯50,000</strong>. No maximum — invest as much as your Cash in Hand allows, minus the ₯5,000 filing fee.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <Label>Company Starting Capital (₯)</Label>
              <input
                type="number"
                min={50000}
                step={10000}
                value={chosenCapital}
                onChange={e => {
                  const v = parseInt(e.target.value) || 50000;
                  setChosenCapital(Math.max(50000, v));
                }}
                style={{ width: '100%', padding: '12px 16px', background: T.panel, border: `1px solid ${T.border}`, color: T.mint, fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <FieldRow label="Chosen Capital" value={formatMoney(chosenCapital)} valueColor={T.mint} />
            <FieldRow label="Filing Fee" value={formatMoney(5000)} valueColor={T.red} />
            <div style={{ marginTop: '12px', padding: '10px 0', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Total Required</span>
              <span style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>{formatMoney(total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: T.muted }}>Your Cash in Hand</span>
              <span style={{ fontSize: '13px', fontFamily: 'monospace', color: canAfford ? T.mint : T.red }}>{formatMoney(playerCash)}</span>
            </div>
            {!canAfford && (
              <div style={{ fontSize: '11px', color: T.red, marginTop: '12px', padding: '8px', background: 'rgba(143,61,61,0.1)', border: `1px solid ${T.burgundy}` }}>
                ⚠ Insufficient cash. You need {formatMoney(total - playerCash)} more.
              </div>
            )}
          </PanelBox>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={() => setStep(4)}>← Back</GhostButton>
            <GoldButton onClick={() => setStep(6)} disabled={!canAfford || chosenCapital < 50000}>Next: Operating Model →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 6 — Operating Model */}
      {step === 6 && (
        <div>
          <SectionHeader stamp="STEP 6 OF 7">Select Operating Model</SectionHeader>
          <p style={{ fontSize: '12px', color: T.muted, marginBottom: '20px', lineHeight: 1.7 }}>
            Choose your company's initial logistics operating model. This shapes your career trajectory, suggested contracts, and unlocks tailored equipment.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {[
              {
                id: 'Local Courier Operator',
                title: 'Local Courier Operator',
                desc: 'Small local delivery, office errands, shop movement. Best for Drennport or Greenmere. Good with Used Delivery Van.'
              },
              {
                id: 'Port Shuttle Operator',
                title: 'Port Shuttle Operator',
                desc: 'Dock, warehouse, and container-adjacent movement. Best for Westport. Good with Used Delivery Van or Box Truck.'
              },
              {
                id: 'Interstate Freight Beginner',
                title: 'Interstate Freight Beginner',
                desc: 'State-to-state freight. Best after owning Box Truck. Higher pay, more wear.'
              },
              {
                id: 'Industrial Parts Carrier',
                title: 'Industrial Parts Carrier',
                desc: 'Factory parts and industrial supply. Best for Ironvale. Needs Box Truck or Freight Truck.'
              }
            ].map(model => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id as any)}
                style={{
                  padding: '16px 18px',
                  background: selectedModel === model.id ? 'rgba(201,162,74,0.08)' : 'rgba(255,255,255,0.02)',
                  border: selectedModel === model.id ? `1px solid ${T.gold}` : `1px solid ${T.border}`,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: T.ivory }}>{model.title}</span>
                  {selectedModel === model.id && <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.gold }}>SELECTED ✓</span>}
                </div>
                <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px', lineHeight: 1.5 }}>{model.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={() => setStep(5)}>← Back</GhostButton>
            <GoldButton onClick={() => setStep(7)} disabled={!selectedModel}>Next: Confirm Filing →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 7 — Confirm */}
      {step === 7 && (
        <div>
          <SectionHeader stamp="STEP 7 OF 7">Confirm Filing</SectionHeader>
          <PanelBox style={{ background: T.paper, marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.gold, marginBottom: '16px' }}>
              ◈ Drennia Commercial Registry — Filing Confirmation
            </div>
            <FieldRow label="Company Name" value={companyNameInput} />
            <FieldRow label="Legal Structure" value="Sole Trader" />
            <FieldRow label="Sector" value={selectedSector} />
            <FieldRow label="Headquarters" value={selectedHQ} />
            <FieldRow label="Operating Model" value={selectedModel} valueColor={T.gold} />
            <FieldRow label="Filing Date" value={new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} />
            <FieldRow label="Capital Filed" value={formatMoney(chosenCapital)} valueColor={T.mint} />
            <FieldRow label="Filing Fee" value={formatMoney(5000)} valueColor={T.red} />
            <FieldRow label="Total Deducted from Cash" value={formatMoney(total)} valueColor={T.gold} />
          </PanelBox>
          <p style={{ fontSize: '11px', color: T.muted, marginBottom: '20px', lineHeight: 1.7 }}>
            By confirming, this filing becomes a permanent public record in the Drennia Commercial Registry.
          </p>
          {startError && <div style={{ fontSize: '11px', color: T.red, marginBottom: '16px', padding: '10px', background: 'rgba(143,61,61,0.1)', border: `1px solid ${T.burgundy}` }}>{startError}</div>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={() => setStep(6)}>← Back</GhostButton>
            <GoldButton onClick={onRegister}>◈ Confirm Filing & Register</GoldButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// COMPANY DESK TAB (Shipping & Logistics)
// ─────────────────────────────────────────────────────────────────────────────
type CompanyDeskTab = 'overview' | 'fleet' | 'contracts' | 'operations' | 'contractHistory' | 'routes' | 'assets' | 'finance' | 'records' | 'equity';

function CompanyDeskTab({ company, fleet, contracts, playerCash, characterName, onRefresh }: {
  company: Company; fleet: Vehicle[]; contracts: Contract[]; playerCash: number; characterName: string;
  onRefresh: () => void;
}) {
  const [deskTab, setDeskTab] = useState<CompanyDeskTab>('overview');
  const [fleetSubTab, setFleetSubTab] = useState<'current' | 'procurement' | 'market' | 'locked'>('current');
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);
  const [contractFilter, setContractFilter] = useState<string>('All');
  const [contractSearch, setContractSearch] = useState<string>('');

  const showNotif = (msg: string, success: boolean) => {
    setNotification({ msg, success });
    setTimeout(() => setNotification(null), 4000);
  };

  const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [
    { id: 'overview',   label: 'Overview'   },
    { id: 'operations', label: 'Operations' },
    { id: 'fleet',      label: 'Fleet'      },
    { id: 'contracts',  label: 'Contracts'  },
    { id: 'contractHistory', label: 'Contract History' },
    { id: 'routes',     label: 'Routes'     },
    { id: 'assets',     label: 'Assets'     },
    { id: 'finance',    label: 'Finance'    },
    { id: 'records',    label: 'Records'    },
    { id: 'equity',     label: 'Equity'     },
  ];

  const companyValue = calcCompanyValue(company);
  const netWorth = calcNetWorth(playerCash, company);
  const activeContracts = contracts.filter(c => (c.status === 'awarded' || c.status === 'active') && c.awardedToCompanyId === company.id);
  const completedContracts = contracts.filter(c => c.status === 'completed');
  const contractHistory = getContractHistory(company.id);
  const records = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
  const routes = getRouteFamiliarity(company.id);

  const handleBuyVehicle = (type: VehicleType) => {
    const result = purchaseVehicle(company.id, type);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  const handleMaintenance = (vehicleId: string, level: 'basic' | 'full') => {
    const result = performMaintenance(vehicleId, level);
    showNotif(result.message, result.success);
    if (result.success) {
      // Record added inside core now or we add here if missing
      onRefresh();
    }
  };

  const handleAssignVehicle = (contractId: string, vehicleId: string) => {
    const result = assignVehicleToContract(contractId, vehicleId);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };
  
  const handleDirectAccept = (contractId: string, vehicleId: string) => {
    const result = acceptDirectContract(contractId, company.id, vehicleId);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  }

  const handleResolve = (contractId: string) => {
    const result = resolveContract(contractId);
    showNotif(result.message, result.success);
    if (result.success || !result.success) onRefresh();
  };

  const handleAssignAutoOp = (vehicleId: string, poolType: AutoOpPoolType | null) => {
    const result = assignVehicleToAutoOp(vehicleId, poolType);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  const handleRunAutoOps = () => {
    const result = runMonthlyAutoOperations(company.id);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  // Filter logic
  let filteredContracts = contracts.filter(c => c.status === 'open');
  if (contractFilter === 'NPC Public') filteredContracts = filteredContracts.filter(c => c.issuerType === 'npc');
  if (contractFilter === 'Local') filteredContracts = filteredContracts.filter(c => c.originState === c.destinationState);
  if (contractFilter === 'Interstate') filteredContracts = filteredContracts.filter(c => c.originState !== c.destinationState);
  if (contractFilter === 'Requires Bid') filteredContracts = filteredContracts.filter(c => c.bidType === 'bid');
  if (contractFilter === 'Direct Accept') filteredContracts = filteredContracts.filter(c => c.bidType === 'direct');
  if (['Player Contracts', 'Government', 'International'].includes(contractFilter)) filteredContracts = []; // Locked for v1

  return (
    <div style={{ width: '100%' }}>
      {notification && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: notification.success ? 'rgba(54,211,153,0.08)' : 'rgba(184,85,85,0.08)', border: `1px solid ${notification.success ? T.mint : T.red}`, color: notification.success ? T.mint : T.red, fontSize: '12px', lineHeight: 1.6 }}>
          {notification.msg}
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
                <FieldRow label={company.legalStructure === 'Corporation' ? "Chairperson & CEO" : "Founder & CEO"} value={company.ownerName} />
                <FieldRow label="Sector" value={company.sector} />
                <FieldRow label="HQ" value={company.state} />
                <FieldRow label="Status" value={company.status} valueColor={T.mint} />
                <FieldRow label="Reputation" value={company.reputation} valueColor={T.gold} />
                <FieldRow label="Reliability" value={company.reliability} />
              </PanelBox>
              <PanelBox>
                <SectionHeader stamp="LEDGER">Financials</SectionHeader>
                <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
                <FieldRow label="Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
                <FieldRow label="Fleet Assets" value={formatMoney(companyValue - company.companyCash + company.debt)} valueColor={T.steel} />
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
              <FieldRow label="Active Contracts" value={activeContracts.length} />
              <FieldRow label="Completed" value={contractHistory.filter(h => h.result === 'completed').length} />
              <FieldRow label="Failed" value={contractHistory.filter(h => h.result === 'failed').length} valueColor={T.red} />
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
                  Run monthly auto operations to dispatch your active fleet, process contract completions, collect recurring revenue, pay facility leases, and deduct fleet maintenance costs.
                </p>
              </div>
              <GoldButton onClick={handleRunAutoOps} disabled={fleet.length === 0}>
                ⚡ Dispatch & Process Operations
              </GoldButton>
            </PanelBox>

            <SectionHeader stamp="FACILITIES">Facility Support & Asset Yield Boosts</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {(() => {
                const hasWestport = (company.facilities || []).some(f => f.state === 'Westport State' && (f.type === 'Small Depot' || f.type === 'Warehouse'));
                const hasDrennport = (company.facilities || []).some(f => f.state === 'Drennport State' && (f.type === 'Small Depot' || f.type === 'Warehouse'));
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

            <SectionHeader stamp="RECURRING">Auto Operations Pools</SectionHeader>
            <p style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>Assign idle vehicles to recurring local pools. This generates steady monthly income but wears down vehicle condition.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
              {['Local Delivery Pool', 'Port Shuttle Pool'].map(pool => {
                const marketDemand = pool === 'Port Shuttle Pool' ? 'High' : 'Moderate';
                const marketComp = pool === 'Port Shuttle Pool' ? 'Moderate' : 'High';
                const hasWestport = (company.facilities || []).some(f => f.state === 'Westport State' && (f.type === 'Small Depot' || f.type === 'Warehouse'));
                const hasDrennport = (company.facilities || []).some(f => f.state === 'Drennport State' && (f.type === 'Small Depot' || f.type === 'Warehouse'));
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
              <SectionHeader>Monthly Estimate</SectionHeader>
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
                  No vehicles in fleet. Purchase vehicles below to start operating contracts.
                </div>
              )}

              {fleet.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {fleet.map((v:any, idx:number) => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.panel, border: `1px solid ${T.border}`, padding: '12px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: T.ivory }}>{v.type}</div>
                          <div style={{ color: T.faint }}>ID: {v.id.substring(0, 8)} • Capacity: {v.capacity}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ color: v.condition > 80 ? T.mint : v.condition > 50 ? T.gold : T.red }}>Cond: {v.condition}%</span>
                          <span style={{ color: T.muted }}>Maint: {formatMoney(v.maintenance)}/mo</span>
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

            <SectionHeader stamp="PROCURE">Vehicle Procurement Market</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {VEHICLE_CATALOGUE.map((v, i) => (
                <PanelBox key={i}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: T.ivory, marginBottom: '4px' }}>{v.type}</div>
                  <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px', minHeight: '34px' }}>{v.desc}</div>
                  
                  <FieldRow label="Capacity" value={v.capacity} />
                  <FieldRow label="Maint /mo" value={formatMoney(v.maintenance)} valueColor={T.red} />
                  
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: T.gold }}>{formatMoney(v.cost)}</div>
                    <GoldButton 
                      onClick={() => handleBuyVehicle(v.type as any)}
                      disabled={company.companyCash < v.cost}
                    >
                      Buy Asset
                    </GoldButton>
                  </div>
                </PanelBox>
              ))}
            </div>

            <div style={{ marginTop: '40px', borderTop: `1px solid ${T.border}`, paddingTop: '24px' }}>
              <SectionHeader stamp="USED MARKET">Player Used Market</SectionHeader>
              <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: `1px dashed ${T.border}`, color: T.muted, fontSize: '12px' }}>
                Used vehicle listings from other players will appear here in Beta.
              </div>
            </div>
          </div>
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Fleet Summary</SectionHeader>
              <FieldRow label="Vehicles Owned" value={fleet.length} />
              <FieldRow label="Total Capacity" value={fleet.reduce((s, v) => s + v.capacity, 0)} />
              <FieldRow label="Available Capacity" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).reduce((s, v) => s + v.capacity, 0)} valueColor={T.mint} />
              <FieldRow label="Assigned Vehicles" value={fleet.filter(v => v.assignedContractId || v.assignedAutoOpPool).length} />
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Maintenance Burden</SectionHeader>
              <FieldRow label="Monthly Fleet Maintenance" value={formatMoney(fleet.reduce((sum, v) => sum + v.monthlyMaintenance, 0))} valueColor={T.red} />
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeContracts.map((c:any) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(54,211,153,0.05)', padding: '12px', border: `1px solid ${T.mint}40` }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: T.mint, marginBottom: '4px' }}>{c.title}</div>
                        <div style={{ fontSize: '11px', color: T.ivory }}>From: {c.issuer}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px' }}>
                        <div style={{ color: T.gold, fontWeight: 700 }}>{formatMoney(c.reward)}</div>
                        <div style={{ color: T.muted }}>Assigned: {c.assignedVehicleType || 'Vehicle'}</div>
                      </div>
                    </div>
                  ))}
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
                onChange={e => setContractFilter(e.target.value)}
                style={{ padding: '8px', background: T.panel, border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }}
              >
                <option value="all">All Types</option>
                <option value="delivery">Delivery</option>
                <option value="logistics">Logistics</option>
                <option value="freight">Freight</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredContracts.map((c:any) => {
                const canAccept = fleet.some(v => v.capacity >= c.requiredCapacity && !v.assignedContractId && !v.assignedAutoOpPool);
                return (
                  <PanelBox key={c.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '4px' }}>{c.title}</div>
                        <div style={{ fontSize: '11px', color: T.faint }}>Issuer: <strong style={{ color: T.muted }}>{c.issuer}</strong></div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: T.gold }}>{formatMoney(c.reward)}</div>
                        <div style={{ fontSize: '10px', color: T.red }}>Pen: {formatMoney(c.penalty)}</div>
                      </div>
                    </div>
                    
                    <p style={{ fontSize: '11px', color: T.muted, lineHeight: 1.5, margin: '0 0 16px 0' }}>
                      {c.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '8px', border: `1px solid ${T.border}` }}>
                      <div><span style={{ color: T.faint }}>Type:</span> {c.type}</div>
                      <div><span style={{ color: T.faint }}>Req Cap:</span> {c.requiredCapacity}</div>
                      <div><span style={{ color: T.faint }}>Duration:</span> {c.durationMonths}mo</div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select id={`assign-${c.id}`} style={{ flex: 1, padding: '8px', background: T.panel, color: T.ivory, border: `1px solid ${T.border}`, fontSize: '12px' }}>
                        <option value="">Select available vehicle...</option>
                        {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).map(v => (
                          <option key={v.id} value={v.id} disabled={v.capacity < c.requiredCapacity}>
                            {v.type} (Cap: {v.capacity}) {v.capacity < c.requiredCapacity ? '- Too Small' : ''}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            {['Drennport State → Westport State', 'Drennport State → Ironvale State', 'Drennport State → Greenmere State', 'Westport State → Ironvale State', 'Westport State → Greenmere State', 'Ironvale State → Greenmere State'].map(rName => {
              const rId = rName.replace(/ State/g, '').replace(' → ', '-');
              const fam = routes.find(r => r.id === rId)?.familiarity || 0;
              return (
                <div key={rName} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: T.paper, border: `1px solid ${T.border}` }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: T.ivory, marginBottom: '6px' }}>{rName}</div>
                    <div style={{ fontSize: '10px', color: T.muted, fontFamily: 'monospace' }}>Distance: Medium · Risk: Low · Demand: Variable</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.faint }}>Familiarity</div>
                    <div style={{ fontSize: '16px', fontFamily: 'monospace', color: fam > 0 ? T.mint : T.faint }}>{fam}%</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '11px', color: T.muted, marginTop: '16px' }}>Higher familiarity will reduce operating costs in future updates.</p>
        </div>
      )}

      {deskTab === 'finance' && (
        <div>
          <SectionHeader>Finance Ledger</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <PanelBox>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Company Position</div>
              <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
              <FieldRow label="Current Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
              <FieldRow label="Total Fleet Value" value={formatMoney(fleet.reduce((acc, v) => acc + Math.round(v.purchaseCost * (v.condition / 100)), 0))} valueColor={T.steel} />
              <FieldRow label="Lease Roster Value" value={formatMoney((company.facilities || []).length * 10000)} valueColor={T.muted} />
              <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
              <FieldRow label="Company Net Value" value={formatMoney(calcCompanyValue(company))} valueColor={T.gold} />
            </PanelBox>
            <PanelBox>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Monthly Estimate</div>
              <FieldRow label="Monthly Revenue" value={formatMoney(company.monthlyRevenue)} valueColor={T.mint} />
              <FieldRow label="Operating Costs" value={formatMoney(Math.max(0, company.monthlyCosts - fleet.reduce((acc, v) => acc + v.monthlyMaintenance, 0) - (company.facilities || []).reduce((acc, f) => acc + f.leaseCost, 0)))} valueColor={T.red} />
              <FieldRow label="Fleet Maintenance" value={formatMoney(fleet.reduce((acc, v) => acc + v.monthlyMaintenance, 0))} valueColor={T.red} />
              <FieldRow label="Facility Lease Expense" value={formatMoney((company.facilities || []).reduce((acc, f) => acc + f.leaseCost, 0))} valueColor={T.red} />
              <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
              <FieldRow label="Projected Profit" value={formatMoney(company.profit)} valueColor={company.profit >= 0 ? T.mint : T.red} />
            </PanelBox>
          </div>
          
          <div style={{ marginTop: '24px' }}>
            <SectionHeader>Recent Financial Activity</SectionHeader>
            {records.filter((r: any) => r.type === 'auto_op' || r.type === 'contract' || r.type === 'business').slice(0, 5).map((r: any) => (
              <div key={r.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${T.gold}`, fontSize: '12px', color: T.ivory, lineHeight: 1.6, marginBottom: '8px' }}>
                {r.summary}
                <div style={{ fontSize: '10px', color: T.faint, marginTop: '6px' }}>{new Date(r.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: T.muted, marginTop: '16px' }}>Finance sector features including loans, credit lines, and taxation will unlock in a future update.</p>
        </div>
      )}

      {deskTab === 'assets' && (
        <AssetsTab company={company} fleet={fleet} onRefresh={onRefresh} showNotif={showNotif} />
      )}

      {deskTab === 'records' && (
        <div>
          <SectionHeader>Company Ledger & Records</SectionHeader>
          {records.length === 0 ? <p style={{ fontSize: '12px', color: T.faint }}>No records found.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {records.map((r: any) => (
                <div key={r.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${r.type === 'failure' ? T.red : r.type === 'business' ? T.gold : T.mint}`, fontSize: '12px', color: T.ivory, lineHeight: 1.6 }}>
                  {r.summary}
                  <div style={{ fontSize: '10px', color: T.faint, marginTop: '6px' }}>{new Date(r.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {deskTab === 'equity' && (
        <div>
          <SectionHeader stamp="OWNERSHIP">Equity & Shares</SectionHeader>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <PanelBox style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Ownership Summary</div>
              <ul style={{ fontSize: '11px', color: T.muted, lineHeight: 1.8, paddingLeft: '16px', margin: 0 }}>
                <li>Founder owns 100%</li>
                <li>No outside investors</li>
                <li>No shares issued yet</li>
                <li>Personal ownership applies</li>
              </ul>
            </PanelBox>
          </div>

          <PanelBox style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '16px' }}>Ownership Table</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: '8px', paddingBottom: '8px', borderBottom: `1px solid ${T.border}`, fontSize: '10px', fontFamily: 'monospace', color: T.faint, textTransform: 'uppercase' }}>
              <div>Holder</div>
              <div>Role</div>
              <div style={{ textAlign: 'right' }}>Ownership</div>
              <div style={{ textAlign: 'right' }}>Voting Power</div>
              <div style={{ textAlign: 'right' }}>Dividend Right</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: '8px', paddingTop: '12px', fontSize: '12px', color: T.ivory, alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{company.ownerName}</div>
              <div style={{ color: T.muted }}>Founder & CEO</div>
              <div style={{ textAlign: 'right', color: T.mint, fontFamily: 'monospace' }}>100%</div>
              <div style={{ textAlign: 'right', color: T.mint, fontFamily: 'monospace' }}>100%</div>
              <div style={{ textAlign: 'right', color: T.mint, fontFamily: 'monospace' }}>100%</div>
            </div>
          </PanelBox>

          <SectionHeader stamp="LOCKED">Future Actions</SectionHeader>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['Add Partner', 'Sell Stake', 'Issue Shares', 'Convert to Private Company', 'Convert to Corporation'].map(act => (
              <div key={act} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, fontSize: '11px', color: T.faint }}>
                🔒 {act}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AssetsTab({ company, fleet, setDeskTab, onOpenMarket }: any) {
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
            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.faint, fontWeight: 700 }}>₯0</div>
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
                    <span style={{ fontSize: '11px', color: T.muted }}>{f.type} <span style={{ color: T.faint }}>({f.state})</span></span>
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
            <GhostButton onClick={onOpenMarket}>Open Market</GhostButton>
          </div>
        </PanelBox>
      </div>
    </div>
  );
}

function FacilitiesTab({ company, onRefresh, showNotif }: any) {
  const [selectedStates, setSelectedStates] = React.useState<Record<string, string>>({
    'Office': company.state,
    'Vehicle Yard': company.state,
    'Small Depot': company.state,
    'Warehouse': company.state,
    'Regional Branch Office': company.state,
  });

  const handleLease = (type: any, leaseCost: number) => {
    const state = selectedStates[type] || company.state;
    const alreadyLeased = (company.facilities || []).some((f:any) => f.type === type && f.state === state);
    if (alreadyLeased) {
      showNotif(`You already lease a ${type} in ${state}.`, false);
      return;
    }
    const res = leaseFacility(company.id, type, state, leaseCost);
    showNotif(res.message, res.success);
    if (res.success) onRefresh();
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
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', color: T.faint, padding: '2px 6px', borderRadius: '2px' }}>{f.state}</span>
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
                      value={selectedStates[fac.type] || company.state}
                      onChange={e => setSelectedStates({ ...selectedStates, [fac.type]: e.target.value })}
                      style={{ background: T.bg, border: '1px solid ' + T.border, color: T.ivory, fontSize: '11px', padding: '4px 8px', fontFamily: 'monospace' }}
                    >
                      <option value="Drennport State">Drennport State</option>
                      <option value="Westport State">Westport State</option>
                      <option value="Ironvale State">Ironvale State</option>
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

function RegistryTab({ company }: { company: Company | null }) {
  const all = getCompanies();
  return (
    <div style={{ maxWidth: '720px' }}>
      <SectionHeader stamp="PUBLIC RECORD">Drennia Commercial Registry</SectionHeader>
      {all.length === 0 ? (
        <PanelBox><p style={{ fontSize: '12px', color: T.faint }}>No companies registered yet.</p></PanelBox>
      ) : (
        all.map(c => (
          <div key={c.id} style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '14px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: T.ivory }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: T.muted }}>{c.legalStructure} · {c.sector} · {c.state}</div>
              </div>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint }}>{c.id === company?.id ? '(You)' : 'NPC/Player'}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── FINANCE TAB ─────────────────────────────────────────────────────────────
function FinanceTab({ company, fleet, playerCash, netWorth }: { company: Company; fleet: Vehicle[]; playerCash: number; netWorth: number }) {
  const companyValue = calcCompanyValue(company);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '760px' }}>
      <PanelBox>
        <SectionHeader stamp="LEDGER">Company Financials</SectionHeader>
        <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
        <FieldRow label="Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
        <FieldRow label="Monthly Revenue" value={formatMoney(company.monthlyRevenue)} valueColor={T.mint} />
        <FieldRow label="Monthly Costs" value={formatMoney(company.monthlyCosts)} valueColor={T.red} />
        <FieldRow label="Net Profit" value={formatMoney(company.profit)} valueColor={company.profit >= 0 ? T.mint : T.red} />
      </PanelBox>
      <PanelBox>
        <SectionHeader stamp="NET WORTH">Personal Balance Sheet</SectionHeader>
        <FieldRow label="Cash in Hand" value={formatMoney(playerCash)} valueColor={T.mint} />
        <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
        <FieldRow label="Vehicle Assets" value={formatMoney(companyValue - company.companyCash)} valueColor={T.steel} />
        <FieldRow label="Company Value" value={formatMoney(companyValue)} valueColor={T.gold} />
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Net Worth</span>
          <span style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>{formatMoney(netWorth)}</span>
        </div>
      </PanelBox>
    </div>
  );
}

// ─── EQUITY TAB ──────────────────────────────────────────────────────────────
function EquityTab({ company, characterName, fleet }: { company: Company; characterName: string; fleet: Vehicle[] }) {
  const companyValue = calcCompanyValue(company);
  return (
    <div style={{ maxWidth: '560px' }}>
      <PanelBox>
        <SectionHeader stamp="EQUITY STRUCTURE">Ownership Table</SectionHeader>
        <FieldRow label={characterName} value="100%" valueColor={T.gold} />
        <FieldRow label="Structure" value="Sole Trader — No share issuance" valueColor={T.muted} />
        <FieldRow label="Company Value" value={formatMoney(companyValue)} valueColor={T.mint} />
        <FieldRow label="Your Equity" value={`${formatMoney(companyValue)} (100%)`} valueColor={T.gold} />
      </PanelBox>
      <PanelBox style={{ marginTop: '16px' }}>
        <SectionHeader>Future Equity Options</SectionHeader>
        <p style={{ fontSize: '12px', color: T.faint, lineHeight: 1.7 }}>Upgrade to Private Company or Corporation to unlock share issuance, partner buy-in, and Westport Bourse listing. Available in a future version.</p>
      </PanelBox>
    </div>
  );
}
