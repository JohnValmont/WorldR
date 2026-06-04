'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCompanies, saveCompany, getPlayerCompany,
  getContracts, saveContract, initializeContractsIfEmpty,
  evaluatePlayerBid, assignVehicleToContract, resolveContract,
  getFleet, purchaseVehicle, performMaintenance, calcNetWorth, calcCompanyValue, addRecord,
  VEHICLE_CATALOGUE, formatMoney, getContractHistory, acceptDirectContract, assignVehicleToAutoOp, processMonthlyOperations, hireStaff, fireStaff, STAFF_WAGES, getRouteFamiliarity, leaseFacility, saveVehicle,
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
type SubTab = 'overview' | 'start' | 'companies' | 'exchange' | 'registry';

const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'start', label: 'Start Business' },
  { id: 'companies', label: 'My Companies', requiresCompany: true },
  { id: 'exchange', label: 'Drennport Exchange' },
  { id: 'registry', label: 'Registry' }
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
        {!(activeTab === 'companies' && selectedCompanyId) && (
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
        )}
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
        
        
        {activeTab === 'exchange' && <DrennportExchangeTab />}
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
  const totalCost = 5000 + chosenCapital;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px', height: '100%', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
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
      </div>

      {/* Right Rail - Filing Summary */}
      <div style={{ borderLeft: `1px solid ${T.border}`, paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ fontSize: '12px', fontFamily: 'monospace', textTransform: 'uppercase', color: T.gold, letterSpacing: '0.15em', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
          Filing Summary
        </div>
        <FieldRow label="Company Name" value={companyNameInput || 'TBD'} />
        <FieldRow label="Legal Structure" value="Sole Trader" />
        <FieldRow label="Sector" value={selectedSector || 'TBD'} />
        <FieldRow label="Headquarters" value={selectedHQ || 'TBD'} />
        <FieldRow label="Operating Model" value={selectedModel || 'TBD'} valueColor={T.gold} />
        <FieldRow label="Capital Filed" value={formatMoney(chosenCapital)} valueColor={T.mint} />
        <FieldRow label="Total Cost" value={formatMoney(totalCost)} valueColor={T.red} />
        <FieldRow label="Remaining Cash" value={formatMoney(playerCash - totalCost)} valueColor={T.ivory} />
        <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(54, 211, 153, 0.05)', border: `1px dashed ${T.mint}` }}>
          <div style={{ fontSize: '10px', color: T.mint, textTransform: 'uppercase', marginBottom: '8px' }}>Recommendation</div>
          <div style={{ fontSize: '11px', color: T.ivory, lineHeight: 1.5 }}>After filing, your first step should be to visit the Procurement desk to acquire your first operational asset: {selectedModel === 'Port Shuttle Operator' || selectedModel === 'Local Courier Operator' ? 'Used Delivery Van' : 'Box Truck'}.</div>
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// COMPANY DESK TAB (Shipping & Logistics)
// ─────────────────────────────────────────────────────────────────────────────
type CompanyDeskTab = 'overview' | 'operations' | 'staff' | 'contracts' | 'procurement' | 'facilities' | 'assets' | 'fleet' | 'routes' | 'finance' | 'contractHistory' | 'records' | 'equity';

function CompanyDeskTab({ company, fleet, contracts, playerCash, characterName, onRefresh }: {
  company: Company; fleet: Vehicle[]; contracts: Contract[]; playerCash: number; characterName: string;
  onRefresh: () => void;
}) {
  const [deskTab, setDeskTab] = useState<CompanyDeskTab>('overview');
  const [fleetSubTab, setFleetSubTab] = useState<'current' | 'procurement' | 'market' | 'locked'>('current');
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);
  const [contractFilter, setContractFilter] = useState<string>('All');
  const [contractSearch, setContractSearch] = useState<string>('');
  const [procurementSubTab, setProcurementSubTab] = useState<'vehicles'|'used'|'facilities'|'equipment'|'materials'|'suppliers'>('vehicles');
  const [routeFilter, setRouteFilter] = useState<'All'|'Local'|'Interstate'|'International'>('All');

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
    const result = processMonthlyOperations(company.id);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  // Filter logic
  let filteredContracts = contracts.filter(c => c.status === 'open');
  if (contractSearch) {
    filteredContracts = filteredContracts.filter(c => c.title.toLowerCase().includes(contractSearch.toLowerCase()) || c.issuerName.toLowerCase().includes(contractSearch.toLowerCase()));
  }
  if (['Government', 'State-Owned Enterprise', 'NPC Corporation', 'Local Business', 'Private Client', 'Player Company'].includes(contractFilter)) {
    filteredContracts = filteredContracts.filter(c => c.issuerType === contractFilter);
  } else if (contractFilter === 'Local') {
    filteredContracts = filteredContracts.filter(c => c.originState === c.destinationState);
  } else if (contractFilter === 'Interstate') {
    filteredContracts = filteredContracts.filter(c => c.originState !== c.destinationState);
  } else if (contractFilter === 'Industrial') {
    filteredContracts = filteredContracts.filter(c => c.contractType === 'Industrial Freight');
  } else if (contractFilter === 'Produce') {
    filteredContracts = filteredContracts.filter(c => c.contractType === 'Produce Delivery');
  } else if (contractFilter === 'Port') {
    filteredContracts = filteredContracts.filter(c => c.contractType === 'Port Transfer');
  } else if (contractFilter === 'Retail') {
    filteredContracts = filteredContracts.filter(c => c.contractType === 'Local Delivery' || c.contractType === 'Interstate Freight');
  } else if (contractFilter === 'Requires Bid') {
    filteredContracts = filteredContracts.filter(c => c.bidType === 'Requires Bid');
  } else if (contractFilter === 'Direct Accept') {
    filteredContracts = filteredContracts.filter(c => c.bidType === 'Direct Accept');
  }

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

              <GoldButton onClick={handleRunAutoOps}>
                ⚡ Dispatch & Process Operations
              </GoldButton>
            </PanelBox>

            {company.lastMonthlyReport && (
              <PanelBox style={{ marginBottom: '24px', border: `1px solid ${T.gold}` }}>
                <SectionHeader stamp={company.lastMonthlyReport.gameDateStr}>Last Monthly Report</SectionHeader>
                <FieldRow label="Gross Revenue" value={formatMoney(company.lastMonthlyReport.autoRevenue + company.lastMonthlyReport.manualRevenue)} valueColor={T.mint} />
                <FieldRow label="Operating Costs" value={'-' + formatMoney(company.lastMonthlyReport.operatingCosts)} valueColor={T.muted} />
                <FieldRow label="Payroll" value={'-' + formatMoney(company.lastMonthlyReport.payrollExpense)} valueColor={T.muted} />
                <FieldRow label="Maintenance" value={'-' + formatMoney(company.lastMonthlyReport.totalMaintenance)} valueColor={T.muted} />
                <FieldRow label="Facility Leases" value={'-' + formatMoney(company.lastMonthlyReport.facilityLeaseExpense)} valueColor={T.muted} />
                <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
                <FieldRow label={company.lastMonthlyReport.netProfit >= 0 ? "Net Profit" : "Operating Loss"} value={formatMoney(company.lastMonthlyReport.netProfit)} valueColor={company.lastMonthlyReport.netProfit >= 0 ? T.mint : T.red} />
              </PanelBox>
            )}

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

            <div id="auto-ops-pools">
              <SectionHeader stamp="RECURRING">Auto Operations Pools</SectionHeader>
            </div>
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

      {deskTab === 'staff' && (
        <div className="business-content-grid">
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Staff Summary</SectionHeader>
              <FieldRow label="Total Employees" value={Object.values(company.staff || {}).reduce((a,b)=>a+b,0)} />
              <FieldRow label="Monthly Payroll" value={formatMoney(Object.keys(company.staff || {}).reduce((sum, k) => sum + ((company.staff as any)[k] || 0) * (STAFF_WAGES as any)[k], 0) * (company.wagePolicy === 'Low' ? 0.8 : company.wagePolicy === 'Generous' ? 1.2 : company.wagePolicy === 'Premium' ? 1.45 : 1.0))} valueColor={T.red} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: '11px', color: T.muted }}>Wage Policy</span>
                <select value={company.wagePolicy || 'Standard'} onChange={(e) => {
                  const { updateWagePolicy } = require('@/lib/businessCore');
                  const res = updateWagePolicy(company.id, e.target.value as any);
                  showNotif(res.message, res.success);
                  if (res.success) onRefresh();
                }} style={{ background: T.panelSoft, color: T.ivory, border: `1px solid ${T.border}`, padding: '2px 4px', fontSize: '11px', fontFamily: 'monospace' }}>
                  <option value="Low">Low Wages (0.8x)</option>
                  <option value="Standard">Standard Wages (1.0x)</option>
                  <option value="Generous">Generous Wages (1.2x)</option>
                  <option value="Premium">Premium Wages (1.45x)</option>
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
                       <GhostButton onClick={() => {
                         const { fireStaff } = require('@/lib/businessCore');
                         const res = fireStaff(company.id, role);
                         showNotif(res.message, res.success);
                         if (res.success) onRefresh();
                       }} color={T.red} disabled={count === 0}>-</GhostButton>
                       <GhostButton onClick={() => {
                         const { hireStaff } = require('@/lib/businessCore');
                         const res = hireStaff(company.id, role);
                         showNotif(res.message, res.success);
                         if (res.success) onRefresh();
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
                  <FieldRow label="Monthly Maintenance" value={formatMoney(3000)} />
                  <FieldRow label="Source Type" value="NPC Manufacturer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={() => {
                       const { buyVehicleFromNpc } = require('@/lib/businessCore');
                       const res = buyVehicleFromNpc(company.id, 'Used Delivery Van', 35000, 100, 1, 3000, 'Drennia Motors');
                       showNotif(res.message, res.success);
                       if (res.success) onRefresh();
                    }}>Order Vehicle</GoldButton>
                  </div>
                </PanelBox>
                <PanelBox>
                  <SectionHeader stamp="NEW">Westport Commercial Vehicles</SectionHeader>
                  <FieldRow label="Vehicle" value="Box Truck" />
                  <FieldRow label="Price" value={formatMoney(75000)} valueColor={T.mint} />
                  <FieldRow label="Condition" value="100%" />
                  <FieldRow label="Capacity" value="2" />
                  <FieldRow label="Monthly Maintenance" value={formatMoney(7000)} />
                  <FieldRow label="Source Type" value="NPC Manufacturer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={() => {
                       const { buyVehicleFromNpc } = require('@/lib/businessCore');
                       const res = buyVehicleFromNpc(company.id, 'Box Truck', 75000, 100, 2, 7000, 'Westport Commercial Vehicles');
                       showNotif(res.message, res.success);
                       if (res.success) onRefresh();
                    }}>Order Vehicle</GoldButton>
                  </div>
                </PanelBox>
                <PanelBox>
                  <SectionHeader stamp="NEW">Ironvale Heavy Industries</SectionHeader>
                  <FieldRow label="Vehicle" value="Used Freight Truck" />
                  <FieldRow label="Price" value={formatMoney(180000)} valueColor={T.mint} />
                  <FieldRow label="Condition" value="100%" />
                  <FieldRow label="Capacity" value="4" />
                  <FieldRow label="Monthly Maintenance" value={formatMoney(12000)} />
                  <FieldRow label="Source Type" value="NPC Manufacturer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={() => {
                       const { buyVehicleFromNpc } = require('@/lib/businessCore');
                       const res = buyVehicleFromNpc(company.id, 'Used Freight Truck', 180000, 100, 4, 12000, 'Ironvale Heavy Industries');
                       showNotif(res.message, res.success);
                       if (res.success) onRefresh();
                    }}>Order Vehicle</GoldButton>
                  </div>
                </PanelBox>
                <PanelBox>
                  <SectionHeader stamp="NEW">Greenmere Utility Works</SectionHeader>
                  <FieldRow label="Vehicle" value="Box Truck" />
                  <FieldRow label="Price" value={formatMoney(75000)} valueColor={T.mint} />
                  <FieldRow label="Condition" value="100%" />
                  <FieldRow label="Capacity" value="2" />
                  <FieldRow label="Monthly Maintenance" value={formatMoney(7000)} />
                  <FieldRow label="Source Type" value="NPC Manufacturer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={() => {
                       const { buyVehicleFromNpc } = require('@/lib/businessCore');
                       const res = buyVehicleFromNpc(company.id, 'Box Truck', 75000, 100, 2, 7000, 'Greenmere Utility Works');
                       showNotif(res.message, res.success);
                       if (res.success) onRefresh();
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
                  <FieldRow label="Monthly Maintenance" value={formatMoney(3000)} />
                  <FieldRow label="Stock" value="2" />
                  <FieldRow label="Source Type" value="NPC Dealer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={() => {
                       const { buyVehicleFromNpc } = require('@/lib/businessCore');
                       const res = buyVehicleFromNpc(company.id, 'Used Delivery Van', 48000, 72, 1, 3000, 'Westport Dealer Yard');
                       showNotif(res.message, res.success);
                       if (res.success) onRefresh();
                    }}>Buy Used Vehicle</GoldButton>
                  </div>
                </PanelBox>
                <PanelBox>
                  <SectionHeader stamp="USED">Ironvale Resale Depot</SectionHeader>
                  <FieldRow label="Vehicle" value="Box Truck" />
                  <FieldRow label="Price" value={formatMoney(112000)} valueColor={T.mint} />
                  <FieldRow label="Condition" value="68%" valueColor={T.gold} />
                  <FieldRow label="Capacity" value="2" />
                  <FieldRow label="Monthly Maintenance" value={formatMoney(7000)} />
                  <FieldRow label="Stock" value="1" />
                  <FieldRow label="Source Type" value="NPC Dealer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={() => {
                       const { buyVehicleFromNpc } = require('@/lib/businessCore');
                       const res = buyVehicleFromNpc(company.id, 'Box Truck', 112000, 68, 2, 7000, 'Ironvale Resale Depot');
                       showNotif(res.message, res.success);
                       if (res.success) onRefresh();
                    }}>Buy Used Vehicle</GoldButton>
                  </div>
                </PanelBox>
                <PanelBox>
                  <SectionHeader stamp="USED">Drennport Auction Yard</SectionHeader>
                  <FieldRow label="Vehicle" value="Used Freight Truck" />
                  <FieldRow label="Price" value={formatMoney(190000)} valueColor={T.mint} />
                  <FieldRow label="Condition" value="61%" valueColor={T.gold} />
                  <FieldRow label="Capacity" value="3" />
                  <FieldRow label="Monthly Maintenance" value={formatMoney(12000)} />
                  <FieldRow label="Stock" value="1" />
                  <FieldRow label="Source Type" value="NPC Dealer" />
                  <div style={{ marginTop: '16px' }}>
                    <GoldButton onClick={() => {
                       const { buyVehicleFromNpc } = require('@/lib/businessCore');
                       const res = buyVehicleFromNpc(company.id, 'Used Freight Truck', 190000, 61, 3, 12000, 'Drennport Auction Yard');
                       showNotif(res.message, res.success);
                       if (res.success) onRefresh();
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
                <GhostButton onClick={() => setDeskTab('finance')}>Open Finance →</GhostButton>
              </div>
            </PanelBox>
            
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Other Procurement</SectionHeader>
              <div style={{ display: 'grid', gap: '8px' }}>
                <GhostButton onClick={() => setDeskTab('facilities')}>Facility Leasing →</GhostButton>
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
                        <div style={{ fontSize: '11px', color: T.ivory }}>From: {c.issuerName}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px' }}>
                        <div style={{ color: T.gold, fontWeight: 700 }}>{formatMoney(c.payment)}</div>
                        <div style={{ color: T.muted }}>Risk: {c.baseRisk}</div>
                        <div style={{ color: T.muted }}>Assigned: {fleet.find(v => v.id === c.assignedVehicleId)?.type || 'Vehicle'}</div>
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
                <option value="All">All Sources</option>
                <option value="Government">Government</option>
                <option value="NPC Corporation">NPC Corporations</option>
                <option value="Local Business">Local Businesses</option>
                <option value="Player Company" disabled>Player Companies (Locked)</option>
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
                const clientTrust = company.clientTrusts?.[c.issuerCompanyId] || 'Unknown';
                
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
                          <span style={{ fontSize: '11px', color: T.muted }}>Bid Amount: ₯</span>
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
            {['All', 'Local Routes', 'Interstate Routes', 'International Routes'].map(f => (
              <GhostButton key={f} color={routeFilter === f ? T.ivory : T.faint} onClick={() => setRouteFilter(f as any)}>{f}</GhostButton>
            ))}
          </div>
          {routeFilter === 'International Routes' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', border: `1px dashed ${T.border}`, textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: T.muted }}>International logistics will unlock later through ports, customs, shipping fleets, and cross-country trade contracts.</div>
            </div>
          )}
          {routeFilter !== 'International Routes' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              {Array.from(new Set([...routes.map(r => r.id), 'Drennport-Westport', 'Drennport-Ironvale', 'Drennport-Greenmere', 'Westport-Ironvale', 'Westport-Greenmere', 'Ironvale-Greenmere', 'Drennport-Drennport', 'Westport-Westport', 'Ironvale-Ironvale', 'Greenmere-Greenmere'])).filter(rId => {
                if (routeFilter === 'Local Routes') return rId.split('-')[0] === rId.split('-')[1];
                if (routeFilter === 'Interstate Routes') return rId.split('-')[0] !== rId.split('-')[1];
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
          <div>
            <SectionHeader>Finance Desk</SectionHeader>
            <PanelBox style={{ marginBottom: '24px' }}>
              <SectionHeader stamp="LEDGER">Company Financials</SectionHeader>
              <FieldRow label="Available Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
              <FieldRow label="Monthly Operating Costs" value={formatMoney(company.monthlyCosts)} valueColor={T.red} />
              <FieldRow label="Outstanding Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.burgundy : T.muted} />
            </PanelBox>
            
            <SectionHeader stamp="OWNERSHIP">Owner Capital Movement</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <PanelBox>
                <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '8px' }}>Inject Capital</div>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', minHeight: '34px' }}>Transfer personal cash into the company's ledger.</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="number" id="inject-amount" placeholder="₯ Amount" style={{ flex: 1, padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.mint, fontSize: '12px' }} />
                  <GoldButton onClick={() => {
                    const el = document.getElementById('inject-amount') as HTMLInputElement;
                    if (el && el.value) {
                      const amount = parseInt(el.value);
                      if (amount > 0) {
                        const { injectCapital } = require('@/lib/businessCore');
                        const res = injectCapital(company.id, amount);
                        showNotif(res.message, res.success);
                        if (res.success) { el.value = ''; onRefresh(); }
                      }
                    }
                  }}>Inject</GoldButton>
                </div>
              </PanelBox>
              <PanelBox>
                <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '8px' }}>Owner Drawings</div>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', minHeight: '34px' }}>Withdraw company cash to your personal holdings.</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="number" id="withdraw-amount" placeholder="₯ Amount" style={{ flex: 1, padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.gold, fontSize: '12px' }} />
                  <GhostButton color={T.gold} onClick={() => {
                    const el = document.getElementById('withdraw-amount') as HTMLInputElement;
                    if (el && el.value) {
                      const amount = parseInt(el.value);
                      if (amount > 0) {
                        const { ownerDrawings } = require('@/lib/businessCore');
                        const res = ownerDrawings(company.id, amount);
                        showNotif(res.message, res.success);
                        if (res.success) { el.value = ''; onRefresh(); }
                      }
                    }
                  }}>Withdraw</GhostButton>
                </div>
              </PanelBox>
            </div>

            <SectionHeader stamp="POLICIES">Company Financial Policies</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
              <PanelBox>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Maintenance Policy</div>
                <select value={company.maintenancePolicy || 'Standard'} onChange={(e) => { company.maintenancePolicy = e.target.value as any; saveCompany(company); onRefresh(); }} style={{ padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.ivory, fontSize: '12px', width: '100%' }}>
                  <option value="Minimal">Minimal (Cost x0.70, Wear x1.35)</option>
                  <option value="Standard">Standard (Cost x1.00, Wear x1.00)</option>
                  <option value="Preventive">Preventive (Cost x1.30, Wear x0.75)</option>
                  <option value="Premium">Premium Fleet Care (Cost x1.60, Wear x0.55)</option>
                </select>
              </PanelBox>
              <PanelBox>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Contract Strategy</div>
                <select value={company.contractStrategy || 'Balanced Freight'} onChange={(e) => { company.contractStrategy = e.target.value as any; saveCompany(company); onRefresh(); }} style={{ padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.ivory, fontSize: '12px', width: '100%' }}>
                  <option value="Safe Local">Safe Local Work (Low Risk)</option>
                  <option value="Balanced Freight">Balanced Freight (Normal)</option>
                  <option value="Aggressive Growth">Aggressive Growth (High Risk/Reward)</option>
                </select>
              </PanelBox>
              <PanelBox>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Cash Reserve Policy</div>
                <select value={company.cashReservePolicy || 'Growth'} onChange={(e) => { company.cashReservePolicy = e.target.value as any; saveCompany(company); onRefresh(); }} style={{ padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.ivory, fontSize: '12px', width: '100%' }}>
                  <option value="Conservative">Conservative Reserve</option>
                  <option value="Growth">Growth Focus</option>
                  <option value="Aggressive">Aggressive Expansion</option>
                </select>
              </PanelBox>
            </div>
            
            <SectionHeader stamp="LENDING">Debt & Financing</SectionHeader>
            <PanelBox>
              <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed ' + T.border, background: 'rgba(255,255,255,0.02)', color: T.muted, fontSize: '12px' }}>
                Bank loans, corporate bonds, and credit facilities are currently unavailable.
              </div>
            </PanelBox>
          </div>
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Performance</SectionHeader>
              <FieldRow label="Company Value" value={formatMoney(calcCompanyValue(company))} valueColor={T.gold} />
              <FieldRow label="Last Month Profit" value={formatMoney(company.profit)} valueColor={company.profit >= 0 ? T.mint : T.red} />
              <FieldRow label="Credit Rating" value="Unrated" />
            </PanelBox>
            <PanelBox>
              <SectionHeader>Your Personal Finances</SectionHeader>
              <FieldRow label="Cash in Hand" value={formatMoney(playerCash)} valueColor={T.ivory} />
              <FieldRow label="Net Worth" value={formatMoney(playerCash + calcCompanyValue(company))} valueColor={T.gold} />
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
          <SectionHeader>Logistics Route Network</SectionHeader>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <GhostButton color={routeFilter === 'All' ? T.ivory : T.faint} onClick={() => setRouteFilter('All')}>All Routes</GhostButton>
            <GhostButton color={routeFilter === 'Local' ? T.ivory : T.faint} onClick={() => setRouteFilter('Local')}>Local Routes</GhostButton>
            <GhostButton color={routeFilter === 'Interstate' ? T.ivory : T.faint} onClick={() => setRouteFilter('Interstate')}>Interstate Routes</GhostButton>
            <GhostButton color={routeFilter === 'International' ? T.ivory : T.faint} onClick={() => setRouteFilter('International')}>International Routes</GhostButton>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            
            {(routeFilter === 'All' || routeFilter === 'Local') && ['Drennport State → Drennport State', 'Westport State → Westport State', 'Ironvale State → Ironvale State', 'Greenmere State → Greenmere State'].map(rName => {
              const rId = rName.replace(/ State/g, '').replace(' → ', '-');
              const fam = routes.find(r => r.id === rId)?.familiarity || 0;
              return (
                <div key={rName} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: T.paper, border: `1px solid ${T.border}` }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: T.ivory, marginBottom: '6px' }}>{rName}</div>
                    <div style={{ fontSize: '10px', color: T.muted, fontFamily: 'monospace' }}>Type: Local · Distance: Short · Risk: Low · Demand: Stable</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.faint }}>Familiarity</div>
                    <div style={{ fontSize: '16px', fontFamily: 'monospace', color: fam > 0 ? T.mint : T.faint }}>{fam}%</div>
                  </div>
                </div>
              );
            })}

            {(routeFilter === 'All' || routeFilter === 'Interstate') && ['Westport State → Drennport State', 'Ironvale State → Drennport State', 'Greenmere State → Drennport State', 'Drennport State → Westport State', 'Westport State → Ironvale State'].map(rName => {
              const rId = rName.replace(/ State/g, '').replace(' → ', '-');
              const fam = routes.find(r => r.id === rId)?.familiarity || 0;
              return (
                <div key={rName} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: T.paper, border: `1px solid ${T.border}` }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: T.ivory, marginBottom: '6px' }}>{rName}</div>
                    <div style={{ fontSize: '10px', color: T.muted, fontFamily: 'monospace' }}>Type: Interstate · Distance: Medium · Risk: Low · Demand: Variable</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.faint }}>Familiarity</div>
                    <div style={{ fontSize: '16px', fontFamily: 'monospace', color: fam > 0 ? T.mint : T.faint }}>{fam}%</div>
                  </div>
                </div>
              );
            })}

            {(routeFilter === 'All' || routeFilter === 'International') && (
              <>
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: `1px dashed ${T.border}`, marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: T.muted, textAlign: 'center' }}>
                    International routes will unlock later through port facilities, customs clearance, shipping permits, and cross-border trade contracts.
                  </div>
                </div>
                {['Drennia → Varelia trade corridor', 'Westport Port → foreign port routes', 'International corporate freight', 'Government trade missions'].map(rName => {
                  return (
                    <div key={rName} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, opacity: 0.7 }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: T.faint, marginBottom: '6px' }}>{rName}</div>
                        <div style={{ fontSize: '10px', color: T.muted, fontFamily: 'monospace' }}>Type: International · Status: <span style={{color: T.red}}>Locked</span></div>
                        <div style={{ fontSize: '10px', color: T.faint, fontFamily: 'monospace', marginTop: '4px' }}>Requirement: Port Warehouse, Port Terminal, customs permit, shipping fleet</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
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


// ─── PROCUREMENT TAB ──────────────────────────────────────────────────────────
function ProcurementTab({ company, onRefresh, showNotif }: any) {
  const [procTab, setProcTab] = React.useState<'orders' | 'used' | 'facilities'>('orders');

  const handleOrder = (type: any) => {
    const result = purchaseVehicle(company.id, type);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  const handleLease = (type: string, cost: number, state: string) => {
    const result = leaseFacility(company.id, type as any, state, cost);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
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
            <FieldRow label="Monthly Lease" value={formatMoney(15000)} valueColor={T.red} />
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
            <FieldRow label="Monthly Lease" value={formatMoney(45000)} valueColor={T.red} />
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

// ─── DRENNPORT EXCHANGE TAB ─────────────────────────────────────────────────
function DrennportExchangeTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto' }}>
      <SectionHeader stamp="MARKET STATUS: OPEN">Drennport Exchange</SectionHeader>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <PanelBox>
          <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', marginBottom: '8px' }}>National Index</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: T.mint }}>14,204.50</div>
          <div style={{ fontSize: '12px', color: T.mint }}>+ 1.2% (Past Quarter)</div>
        </PanelBox>
        <PanelBox>
          <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', marginBottom: '8px' }}>Drennia Govt Bonds (10Y)</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: T.ivory }}>4.25%</div>
          <div style={{ fontSize: '12px', color: T.faint }}>Stable</div>
        </PanelBox>
        <PanelBox>
          <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', marginBottom: '8px' }}>Total Listed Entities</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: T.gold }}>42</div>
          <div style={{ fontSize: '12px', color: T.muted }}>8 State-Owned, 34 Private</div>
        </PanelBox>
      </div>

      <SectionHeader>Listed Corporations & State Enterprises</SectionHeader>
      <div style={{ background: T.panel, border: `1px solid ${T.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)', color: T.muted, borderBottom: `1px solid ${T.border}`, textAlign: 'left', fontFamily: 'monospace', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px' }}>Ticker</th>
              <th style={{ padding: '12px' }}>Entity</th>
              <th style={{ padding: '12px' }}>Sector</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Share Price</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: '12px', color: T.gold, fontFamily: 'monospace' }}>DCB</td>
              <td style={{ padding: '12px', color: T.ivory }}>Drennport Commercial Bank</td>
              <td style={{ padding: '12px', color: T.muted }}>Finance</td>
              <td style={{ padding: '12px', textAlign: 'right', color: T.ivory }}>{formatMoney(1450)}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}><GhostButton>Trade (🔒)</GhostButton></td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: '12px', color: T.gold, fontFamily: 'monospace' }}>WDA</td>
              <td style={{ padding: '12px', color: T.ivory }}>Westport Dock Authority</td>
              <td style={{ padding: '12px', color: T.muted }}>SOE / Port</td>
              <td style={{ padding: '12px', textAlign: 'right', color: T.ivory }}>{formatMoney(890)}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}><GhostButton>Trade (🔒)</GhostButton></td>
            </tr>
            <tr>
              <td style={{ padding: '12px', color: T.gold, fontFamily: 'monospace' }}>DRF</td>
              <td style={{ padding: '12px', color: T.ivory }}>Drennia Rail Freight</td>
              <td style={{ padding: '12px', color: T.muted }}>SOE / Logistics</td>
              <td style={{ padding: '12px', textAlign: 'right', color: T.ivory }}>{formatMoney(2100)}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}><GhostButton>Trade (🔒)</GhostButton></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.2)', border: `1px dashed ${T.border}`, padding: '24px', textAlign: 'center', marginTop: '16px' }}>
        <div style={{ color: T.muted, fontSize: '12px' }}>Public stock trading, corporate bonds, and IPO mechanics are locked in this build.</div>
      </div>
    </div>
  );
}
