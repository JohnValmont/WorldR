'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCompanies, saveCompany, getPlayerCompany,
  getContracts, saveContract, initializeContractsIfEmpty,
  evaluatePlayerBid, assignVehicleToContract, resolveContract,
  getFleet, purchaseVehicle, performMaintenance, calcNetWorth, calcCompanyValue, addRecord,
  VEHICLE_CATALOGUE,
  type Company, type Contract, type Vehicle, type VehicleType,
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
type SubTab = 'overview' | 'start' | 'companies' | 'contracts' | 'registry' | 'finance' | 'equity';

const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
  { id: 'overview',   label: 'Overview' },
  { id: 'start',      label: 'Start Business' },
  { id: 'companies',  label: 'My Companies', requiresCompany: true },
  { id: 'contracts',  label: 'Contracts',    requiresCompany: true },
  { id: 'registry',   label: 'Registry' },
  { id: 'finance',    label: 'Finance',      requiresCompany: true },
  { id: 'equity',     label: 'Equity',       requiresCompany: true },
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
      setStartError(`Insufficient cash. You need ₯${total.toLocaleString()} (₯${chosenCapital.toLocaleString()} capital + ₯${FILING_FEE.toLocaleString()} filing fee). You have ₯${playerCash.toLocaleString()}.`);
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
    };
    saveCompany(newCompany);
    updateCash(playerCash - total);
    addRecord(`Registered ${finalName} as a Sole Trader headquartered in ${selectedHQ}. Initial capital filed: ₯${chosenCapital.toLocaleString()}.`);
    
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
          text: `${characterName} started ${finalName}, a ${selectedSector} business headquartered in ${selectedHQ}, in Year 0.`,
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
            <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>₯{netWorth.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '8px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.12em', color: T.faint }}>Cash in Hand</span>
            <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.mint }}>₯{playerCash.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ── Page Title ── */}
      <div style={{ padding: '16px 24px 8px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: T.ivory, margin: 0 }}>Business</h1>
      </div>

      {/* ── Subtabs ── */}
      <div style={{ display: 'flex', gap: '0', padding: '0 24px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, overflowX: 'auto' }}>
        {SUB_TABS.map(tab => {
          const locked = tab.requiresCompany && !company;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => !locked && setActiveTab(tab.id)}
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

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {activeTab === 'overview'  && <OverviewTab company={company} playerCash={playerCash} netWorth={netWorth} onStartBusiness={() => setActiveTab('start')} onViewContracts={() => setActiveTab('contracts')} onViewRegistry={() => setActiveTab('registry')} />}
        {activeTab === 'start'     && <StartBusinessTab step={step} setStep={setStep} selectedSector={selectedSector} setSelectedSector={setSelectedSector} selectedHQ={selectedHQ} setSelectedHQ={setSelectedHQ} companyNameInput={companyNameInput} setCompanyNameInput={setCompanyNameInput} nameError={nameError} setNameError={setNameError} startError={startError} playerCash={playerCash} company={company} onRegister={handleRegisterCompany} checkName={checkName} chosenCapital={chosenCapital} setChosenCapital={setChosenCapital} />}
        {activeTab === 'companies' && company && <CompanyDeskTab company={company} fleet={fleet} contracts={contracts} playerCash={playerCash} characterName={characterName} onTabChange={setActiveTab} onRefresh={refreshAll} />}
        {activeTab === 'contracts' && company && <ContractsTab company={company} contracts={contracts} fleet={fleet} onRefresh={refreshAll} />}
        {activeTab === 'registry'  && <RegistryTab company={company} />}
        {activeTab === 'finance'   && company && <FinanceTab company={company} fleet={fleet} playerCash={playerCash} netWorth={netWorth} />}
        {activeTab === 'equity'    && company && <EquityTab company={company} characterName={characterName} fleet={fleet} />}
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
      </PanelBox>
      <PanelBox>
        <SectionHeader stamp="LEDGER">Financial Position</SectionHeader>
        <FieldRow label="Company Cash" value={`₯${company.companyCash.toLocaleString()}`} valueColor={T.mint} />
        <FieldRow label="Debt" value={`₯${company.debt.toLocaleString()}`} valueColor={company.debt > 0 ? T.burgundy : T.muted} />
        <FieldRow label="Net Worth (total)" value={`₯${netWorth.toLocaleString()}`} valueColor={T.gold} />
      </PanelBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// START BUSINESS TAB
// ─────────────────────────────────────────────────────────────────────────────
function StartBusinessTab({ step, setStep, selectedSector, setSelectedSector, selectedHQ, setSelectedHQ, companyNameInput, setCompanyNameInput, nameError, setNameError, startError, playerCash, company, onRegister, checkName, chosenCapital, setChosenCapital }: any) {
  if (company) {
    return (
      <PanelBox style={{ maxWidth: '540px' }}>
        <SectionHeader>Company Already Registered</SectionHeader>
        <p style={{ fontSize: '13px', color: T.muted, lineHeight: 1.7 }}>
          You have already registered <strong style={{ color: T.ivory }}>{company.name}</strong>. Each citizen may hold one active sole trader registration.
        </p>
      </PanelBox>
    );
  }

  const STEP_LABELS = ['Sector', 'Headquarters', 'Structure', 'Company Name', 'Starting Capital', 'Confirm Filing'];
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
              <div style={{ fontSize: '8px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: done ? T.mint : active ? T.gold : T.faint }}>
                {done ? '✓' : stepNum}. {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1 — Sector */}
      {step === 1 && (
        <div>
          <SectionHeader stamp="STEP 1 OF 6">Select Your Sector</SectionHeader>
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
          <SectionHeader stamp="STEP 2 OF 6">Headquarters Location</SectionHeader>
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

      {/* Step 3 — Structure (locked at Sole Trader) */}
      {step === 3 && (
        <div>
          <SectionHeader stamp="STEP 3 OF 6">Legal Structure</SectionHeader>
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
          <SectionHeader stamp="STEP 4 OF 6">Company Name</SectionHeader>
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

      {/* Step 5 — Capital (no max, min ₯50,000) */}
      {step === 5 && (
        <div>
          <SectionHeader stamp="STEP 5 OF 6">Starting Capital</SectionHeader>
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
            <FieldRow label="Chosen Capital" value={`₯${chosenCapital.toLocaleString()}`} valueColor={T.mint} />
            <FieldRow label="Filing Fee" value="₯5,000" valueColor={T.red} />
            <div style={{ marginTop: '12px', padding: '10px 0', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Total Required</span>
              <span style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>₯{total.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: T.muted }}>Your Cash in Hand</span>
              <span style={{ fontSize: '13px', fontFamily: 'monospace', color: canAfford ? T.mint : T.red }}>₯{playerCash.toLocaleString()}</span>
            </div>
            {!canAfford && (
              <div style={{ fontSize: '11px', color: T.red, marginTop: '12px', padding: '8px', background: 'rgba(143,61,61,0.1)', border: `1px solid ${T.burgundy}` }}>
                ⚠ Insufficient cash. You need ₯{(total - playerCash).toLocaleString()} more.
              </div>
            )}
          </PanelBox>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={() => setStep(4)}>← Back</GhostButton>
            <GoldButton onClick={() => setStep(6)} disabled={!canAfford || chosenCapital < 50000}>Next: Confirm →</GoldButton>
          </div>
        </div>
      )}

      {/* Step 6 — Confirm */}
      {step === 6 && (
        <div>
          <SectionHeader stamp="STEP 6 OF 6">Confirm Filing</SectionHeader>
          <PanelBox style={{ background: T.paper, marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.gold, marginBottom: '16px' }}>
              ◈ Drennia Commercial Registry — Filing Confirmation
            </div>
            <FieldRow label="Company Name" value={companyNameInput} />
            <FieldRow label="Legal Structure" value="Sole Trader" />
            <FieldRow label="Sector" value={selectedSector} />
            <FieldRow label="Headquarters" value={selectedHQ} />
            <FieldRow label="Filing Date" value={new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} />
            <FieldRow label="Capital Filed" value={`₯${chosenCapital.toLocaleString()}`} valueColor={T.mint} />
            <FieldRow label="Filing Fee" value="₯5,000" valueColor={T.red} />
            <FieldRow label="Total Deducted from Cash" value={`₯${total.toLocaleString()}`} valueColor={T.gold} />
          </PanelBox>
          <p style={{ fontSize: '11px', color: T.muted, marginBottom: '20px', lineHeight: 1.7 }}>
            By confirming, this filing becomes a permanent public record in the Drennia Commercial Registry.
          </p>
          {startError && <div style={{ fontSize: '11px', color: T.red, marginBottom: '16px', padding: '10px', background: 'rgba(143,61,61,0.1)', border: `1px solid ${T.burgundy}` }}>{startError}</div>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={() => setStep(5)}>← Back</GhostButton>
            <GoldButton onClick={onRegister}>◈ Confirm Filing & Register</GoldButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY DESK TAB (Shipping & Logistics)
// ─────────────────────────────────────────────────────────────────────────────
type CompanyDeskTab = 'overview' | 'fleet' | 'contracts' | 'routes' | 'finance' | 'records' | 'equity';

function CompanyDeskTab({ company, fleet, contracts, playerCash, characterName, onTabChange, onRefresh }: {
  company: Company; fleet: Vehicle[]; contracts: Contract[]; playerCash: number; characterName: string;
  onTabChange: (tab: any) => void; onRefresh: () => void;
}) {
  const [deskTab, setDeskTab] = useState<CompanyDeskTab>('overview');
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);

  const showNotif = (msg: string, success: boolean) => {
    setNotification({ msg, success });
    setTimeout(() => setNotification(null), 4000);
  };

  const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [
    { id: 'overview',   label: 'Overview'   },
    { id: 'fleet',      label: 'Fleet'      },
    { id: 'contracts',  label: 'Contracts'  },
    { id: 'routes',     label: 'Routes'     },
    { id: 'finance',    label: 'Finance'    },
    { id: 'records',    label: 'Records'    },
    { id: 'equity',     label: 'Equity'     },
  ];

  const companyValue = calcCompanyValue(company);
  const netWorth = calcNetWorth(playerCash, company);
  const activeContracts = contracts.filter(c => (c.status === 'awarded' || c.status === 'active') && c.awardedToCompanyId === company.id);
  const completedContracts = contracts.filter(c => c.status === 'completed');
  const records = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');

  const handleBuyVehicle = (type: VehicleType) => {
    const result = purchaseVehicle(company.id, type);
    showNotif(result.message, result.success);
    if (result.success) {
      const spec = VEHICLE_CATALOGUE.find(v => v.type === type)!;
      addRecord(`Purchased a ${type} for ${company.name}. Fleet capacity increased.`);
      onRefresh();
    }
  };

  const handleMaintenance = (vehicleId: string, level: 'basic' | 'full') => {
    const result = performMaintenance(vehicleId, level);
    showNotif(result.message, result.success);
    if (result.success) {
      addRecord(`Performed ${level === 'basic' ? 'basic maintenance' : 'full service'} on vehicle for ${company.name}.`);
      onRefresh();
    }
  };

  const handleAssignVehicle = (contractId: string, vehicleId: string) => {
    const result = assignVehicleToContract(contractId, vehicleId);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  const handleResolve = (contractId: string) => {
    const result = resolveContract(contractId);
    showNotif(result.message, result.success);
    if (result.success || !result.success) onRefresh();
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Notification */}
      {notification && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: notification.success ? 'rgba(54,211,153,0.08)' : 'rgba(184,85,85,0.08)', border: `1px solid ${notification.success ? T.mint : T.red}`, color: notification.success ? T.mint : T.red, fontSize: '12px', lineHeight: 1.6 }}>
          {notification.msg}
        </div>
      )}

      {/* Inner tabs */}
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

      {/* OVERVIEW */}
      {deskTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <PanelBox>
            <SectionHeader stamp="COMPANY FILE">Company Details</SectionHeader>
            <FieldRow label="Name" value={company.name} />
            <FieldRow label="Owner" value={company.ownerName} />
            <FieldRow label="Sector" value={company.sector} />
            <FieldRow label="HQ" value={company.state} />
            <FieldRow label="Status" value={company.status} valueColor={T.mint} />
            <FieldRow label="Reputation" value={company.reputation} valueColor={T.gold} />
            <FieldRow label="Reliability" value={company.reliability} />
          </PanelBox>
          <PanelBox>
            <SectionHeader stamp="LEDGER">Financials</SectionHeader>
            <FieldRow label="Company Cash" value={`₯${company.companyCash.toLocaleString()}`} valueColor={T.mint} />
            <FieldRow label="Debt" value={`₯${company.debt.toLocaleString()}`} valueColor={company.debt > 0 ? T.red : T.muted} />
            <FieldRow label="Fleet Assets" value={`₯${(companyValue - company.companyCash).toLocaleString()}`} valueColor={T.steel} />
            <FieldRow label="Company Value" value={`₯${companyValue.toLocaleString()}`} valueColor={T.gold} />
            <FieldRow label="Net Worth" value={`₯${netWorth.toLocaleString()}`} valueColor={T.gold} />
          </PanelBox>
          <PanelBox>
            <SectionHeader>Fleet Status</SectionHeader>
            {fleet.length === 0 ? (
              <p style={{ fontSize: '12px', color: T.faint }}>No vehicles. Go to Fleet tab to buy your first vehicle.</p>
            ) : (
              fleet.map(v => (
                <FieldRow key={v.id} label={v.type} value={`Capacity ${v.capacity} · ${v.condition}%${v.assignedContractId ? ' · ACTIVE' : ' · Available'}`} valueColor={v.assignedContractId ? T.gold : T.mint} />
              ))
            )}
          </PanelBox>
          <PanelBox>
            <SectionHeader>Contract Pipeline</SectionHeader>
            <FieldRow label="Active Contracts" value={activeContracts.length} />
            <FieldRow label="Completed" value={completedContracts.length} />
            <FieldRow label="Reliability" value={company.reliability} />
          </PanelBox>
        </div>
      )}

      {/* FLEET */}
      {deskTab === 'fleet' && (
        <div>
          <SectionHeader>Fleet</SectionHeader>
          {/* Current fleet */}
          {fleet.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint, marginBottom: '12px' }}>Current Fleet</div>
              {fleet.map(v => {
                const spec = VEHICLE_CATALOGUE.find(s => s.type === v.type)!;
                const assetValue = Math.round(v.purchaseCost * (v.condition / 100));
                return (
                  <div key={v.id} style={{ background: T.paper, border: `1px solid ${T.border}`, padding: '16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{v.type}</div>
                        <div style={{ fontSize: '11px', color: T.muted }}>Capacity {v.capacity} · Asset value ₯{assetValue.toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint }}>Condition</div>
                        <div style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 700, color: v.condition > 60 ? T.mint : v.condition > 30 ? T.gold : T.red }}>{v.condition}%</div>
                      </div>
                    </div>
                    {/* Condition bar */}
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', marginBottom: '12px' }}>
                      <div style={{ height: '100%', width: `${v.condition}%`, background: v.condition > 60 ? T.mint : v.condition > 30 ? T.gold : T.red, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: v.assignedContractId ? T.gold : T.mint }}>
                        {v.assignedContractId ? '⚡ Assigned to contract' : '✓ Available'}
                      </div>
                      {!v.assignedContractId && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <GhostButton onClick={() => handleMaintenance(v.id, 'basic')} color={T.muted}>
                            Basic Maintenance ₯5,000 (+10%)
                          </GhostButton>
                          <GhostButton onClick={() => handleMaintenance(v.id, 'full')} color={T.gold}>
                            Full Service ₯15,000 (+30%)
                          </GhostButton>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Buy vehicles */}
          <div>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint, marginBottom: '12px' }}>Purchase Vehicles</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {VEHICLE_CATALOGUE.map(spec => {
                const canAfford = company.companyCash >= spec.cost;
                return (
                  <div key={spec.type} style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '4px' }}>{spec.type}</div>
                      <div style={{ fontSize: '11px', color: T.muted, marginBottom: '4px' }}>{spec.desc}</div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '10px', fontFamily: 'monospace', color: T.faint }}>
                        <span>Capacity {spec.capacity}</span>
                        <span>Maintenance ₯{spec.maintenance.toLocaleString()}/month</span>
                        <span>Condition 100% on purchase</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '24px' }}>
                      <div style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 700, color: canAfford ? T.mint : T.red, marginBottom: '8px' }}>₯{spec.cost.toLocaleString()}</div>
                      <GoldButton onClick={() => handleBuyVehicle(spec.type)} disabled={!canAfford}>
                        {canAfford ? 'Purchase' : 'Insufficient Funds'}
                      </GoldButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONTRACTS */}
      {deskTab === 'contracts' && (
        <ContractsTabInner company={company} contracts={contracts} fleet={fleet} onRefresh={onRefresh} showNotif={showNotif} handleAssign={handleAssignVehicle} handleResolve={handleResolve} />
      )}

      {/* ROUTES — placeholder */}
      {deskTab === 'routes' && (
        <PanelBox>
          <SectionHeader>Routes</SectionHeader>
          <p style={{ fontSize: '12px', color: T.faint, lineHeight: 1.7 }}>
            Route planning and optimization will unlock once you have active contracts and fleet movements. Define regular run schedules, assign vehicles to recurring deliveries, and track route performance.
          </p>
        </PanelBox>
      )}

      {/* FINANCE */}
      {deskTab === 'finance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <PanelBox>
            <SectionHeader stamp="LEDGER">Company Position</SectionHeader>
            <FieldRow label="Company Cash" value={`₯${company.companyCash.toLocaleString()}`} valueColor={T.mint} />
            <FieldRow label="Monthly Revenue" value={`₯${company.monthlyRevenue.toLocaleString()}`} valueColor={T.mint} />
            <FieldRow label="Monthly Costs" value={`₯${company.monthlyCosts.toLocaleString()}`} valueColor={T.red} />
            <FieldRow label="Net Profit" value={`₯${company.profit.toLocaleString()}`} valueColor={company.profit >= 0 ? T.mint : T.red} />
            <FieldRow label="Outstanding Debt" value={`₯${company.debt.toLocaleString()}`} valueColor={company.debt > 0 ? T.burgundy : T.muted} />
          </PanelBox>
          <PanelBox>
            <SectionHeader stamp="ASSETS">Asset Value</SectionHeader>
            {fleet.length === 0 ? (
              <p style={{ fontSize: '12px', color: T.faint }}>No vehicles in fleet.</p>
            ) : (
              fleet.map(v => {
                const assetValue = Math.round(v.purchaseCost * (v.condition / 100));
                return <FieldRow key={v.id} label={v.type} value={`₯${assetValue.toLocaleString()} (${v.condition}%)`} valueColor={T.steel} />;
              })
            )}
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: T.muted }}>Total Vehicle Assets</span>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>₯{(companyValue - company.companyCash).toLocaleString()}</span>
            </div>
          </PanelBox>
          <PanelBox style={{ gridColumn: '1 / -1' }}>
            <SectionHeader>Future Finance</SectionHeader>
            <p style={{ fontSize: '12px', color: T.faint, lineHeight: 1.7 }}>Loans, credit lines, insurance, and tax records will unlock as your company grows. Currently locked — Sole Trader v1.</p>
          </PanelBox>
        </div>
      )}

      {/* RECORDS */}
      {deskTab === 'records' && (
        <div>
          <SectionHeader>Company Records</SectionHeader>
          {records.length === 0 ? (
            <PanelBox><p style={{ fontSize: '12px', color: T.faint }}>No records yet.</p></PanelBox>
          ) : (
            records.slice(0, 20).map((r: any) => (
              <div key={r.id} style={{ padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: r.type === 'contract' ? T.mint : r.type === 'failure' ? T.red : T.faint, marginBottom: '3px' }}>
                  {r.type} · {new Date(r.createdAt).toLocaleDateString('en-GB')}
                </div>
                <p style={{ fontSize: '12px', color: T.muted, lineHeight: 1.6, margin: 0 }}>{r.summary}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* EQUITY */}
      {deskTab === 'equity' && (
        <div>
          <PanelBox>
            <SectionHeader stamp="EQUITY STRUCTURE">Ownership</SectionHeader>
            <FieldRow label={characterName} value="100% — Sole Owner" valueColor={T.gold} />
            <FieldRow label="Company Value" value={`₯${companyValue.toLocaleString()}`} valueColor={T.mint} />
            <FieldRow label="Your Equity Value" value={`₯${companyValue.toLocaleString()}`} valueColor={T.gold} />
          </PanelBox>
          <PanelBox style={{ marginTop: '16px' }}>
            <SectionHeader>Future Equity Options</SectionHeader>
            <p style={{ fontSize: '12px', color: T.faint, lineHeight: 1.7 }}>Share issuance, partner buy-in, and public listing require upgrading to Private Company or Corporation structure. Available in later versions.</p>
          </PanelBox>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTS TAB (global business tab)
// ─────────────────────────────────────────────────────────────────────────────
function ContractsTab({ company, contracts, fleet, onRefresh }: { company: Company; contracts: Contract[]; fleet: Vehicle[]; onRefresh: () => void }) {
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);
  const showNotif = (msg: string, success: boolean) => { setNotification({ msg, success }); setTimeout(() => setNotification(null), 4000); };
  const handleAssign = (contractId: string, vehicleId: string) => { const r = assignVehicleToContract(contractId, vehicleId); showNotif(r.message, r.success); if (r.success) onRefresh(); };
  const handleResolve = (contractId: string) => { const r = resolveContract(contractId); showNotif(r.message, r.success); onRefresh(); };
  return (
    <div style={{ maxWidth: '860px' }}>
      {notification && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: notification.success ? 'rgba(54,211,153,0.08)' : 'rgba(184,85,85,0.08)', border: `1px solid ${notification.success ? T.mint : T.red}`, color: notification.success ? T.mint : T.red, fontSize: '12px' }}>
          {notification.msg}
        </div>
      )}
      <ContractsTabInner company={company} contracts={contracts} fleet={fleet} onRefresh={onRefresh} showNotif={showNotif} handleAssign={handleAssign} handleResolve={handleResolve} />
    </div>
  );
}

// ─── Shared Contracts Inner Component ────────────────────────────────────────
function ContractsTabInner({ company, contracts, fleet, onRefresh, showNotif, handleAssign, handleResolve }: {
  company: Company; contracts: Contract[]; fleet: Vehicle[];
  onRefresh: () => void;
  showNotif: (msg: string, success: boolean) => void;
  handleAssign: (contractId: string, vehicleId: string) => void;
  handleResolve: (contractId: string) => void;
}) {
  const [biddingOn, setBiddingOn] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState(0);
  const [assigningFor, setAssigningFor] = useState<string | null>(null);
  const availableFleet = fleet.filter(v => !v.assignedContractId);

  const openContracts = contracts.filter(c => c.status === 'open');
  const myActive = contracts.filter(c => (c.status === 'awarded' || c.status === 'active') && c.awardedToCompanyId === company.id);
  const myCompleted = contracts.filter(c => (c.status === 'completed' || c.status === 'failed') && contract_belongsToMe(c, company.id));

  function contract_belongsToMe(c: Contract, compId: string) {
    return c.awardedToCompanyId === compId || c.bids.some(b => b.companyId === compId);
  }

  const handleBid = () => {
    if (!biddingOn) return;
    const result = evaluatePlayerBid(biddingOn, company.id, bidAmount);
    showNotif(result.message, result.accepted);
    setBiddingOn(null);
    setBidAmount(0);
    onRefresh();
  };

  const hasFleet = fleet.length > 0;

  return (
    <div>
      {/* OPEN CONTRACTS */}
      <div style={{ marginBottom: '32px' }}>
        <SectionHeader stamp={`${openContracts.length} OPEN`}>Public Contract Board</SectionHeader>
        {!hasFleet && (
          <div style={{ padding: '12px 16px', background: 'rgba(201,162,74,0.05)', border: `1px solid ${T.borderGold}`, marginBottom: '16px', fontSize: '12px', color: T.gold }}>
            ⚠ You need at least one vehicle to bid on contracts. Go to My Companies → Fleet.
          </div>
        )}
        {openContracts.length === 0 ? (
          <PanelBox><p style={{ fontSize: '12px', color: T.faint }}>No open contracts currently.</p></PanelBox>
        ) : (
          openContracts.map(c => {
            const suitableVehicle = availableFleet.find(v => v.capacity >= c.requiredCapacity);
            const canBid = hasFleet && !!suitableVehicle;
            const myBid = c.bids.find(b => b.companyId === company.id);
            return (
              <div key={c.id} style={{ background: T.paper, border: `1px solid ${T.border}`, padding: '16px', marginBottom: '12px', borderLeft: `3px solid ${T.gold}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '3px' }}>{c.title}</div>
                    <div style={{ fontSize: '11px', color: T.muted }}>{c.issuerName} · {c.cargo} · {c.originState} → {c.destinationState}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                    <div style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 700, color: T.mint }}>₯{c.payment.toLocaleString()}</div>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint }}>Penalty: ₯{c.penalty.toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', fontSize: '10px', fontFamily: 'monospace', color: T.faint }}>
                  <span>Capacity {c.requiredCapacity} required</span>
                  <span>Deadline {c.deadlineDays}d</span>
                  {!canBid && <span style={{ color: T.red }}>⚠ Need capacity-{c.requiredCapacity} vehicle</span>}
                  {suitableVehicle && <span style={{ color: T.mint }}>✓ {suitableVehicle.type} eligible</span>}
                </div>
                <p style={{ fontSize: '11px', color: T.muted, lineHeight: 1.6, margin: '0 0 12px' }}>{c.description}</p>
                {myBid ? (
                  <div style={{ fontSize: '11px', color: T.gold }}>Your bid: ₯{myBid.amount.toLocaleString()} — awaiting decision</div>
                ) : biddingOn === c.id ? (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <Label>Your Bid (₯)</Label>
                      <input type="number" min={1} value={bidAmount} onChange={e => setBidAmount(parseInt(e.target.value) || 0)}
                        style={{ padding: '8px 12px', background: T.panel, border: `1px solid ${T.border}`, color: T.mint, fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, outline: 'none', width: '160px' }} />
                    </div>
                    <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                      <GoldButton onClick={handleBid} disabled={bidAmount <= 0}>Submit Bid</GoldButton>
                      <GhostButton onClick={() => { setBiddingOn(null); setBidAmount(0); }}>Cancel</GhostButton>
                    </div>
                  </div>
                ) : (
                  <GoldButton onClick={() => { if (canBid) { setBiddingOn(c.id); setBidAmount(c.payment); } }} disabled={!canBid}>
                    {canBid ? 'Place Bid →' : 'Insufficient Fleet Capacity'}
                  </GoldButton>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ACTIVE CONTRACTS */}
      {myActive.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <SectionHeader stamp="ACTIVE">Your Active Contracts</SectionHeader>
          {myActive.map(c => {
            const assignedVehicle = fleet.find(v => v.id === c.assignedVehicleId);
            const bid = c.bids.find(b => b.companyId === company.id);
            return (
              <div key={c.id} style={{ background: T.paper, border: `1px solid ${T.mint}30`, padding: '16px', marginBottom: '12px', borderLeft: `3px solid ${T.mint}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '3px' }}>{c.title}</div>
                    <div style={{ fontSize: '11px', color: T.muted }}>{c.originState} → {c.destinationState} · Capacity {c.requiredCapacity}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.mint }}>₯{(bid?.amount ?? c.payment).toLocaleString()}</div>
                    <div style={{ fontSize: '9px', color: T.faint }}>Your bid</div>
                  </div>
                </div>

                {/* Assign vehicle */}
                {!assignedVehicle ? (
                  <div>
                    <div style={{ fontSize: '11px', color: T.gold, marginBottom: '8px' }}>⚠ No vehicle assigned — assign before resolving.</div>
                    {assigningFor === c.id ? (
                      <div>
                        <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Select available vehicle (min capacity {c.requiredCapacity}):</div>
                        {availableFleet.filter(v => v.capacity >= c.requiredCapacity).map(v => (
                          <button key={v.id} onClick={() => { handleAssign(c.id, v.id); setAssigningFor(null); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, color: T.ivory, cursor: 'pointer', marginBottom: '6px', fontSize: '12px' }}>
                            {v.type} — Capacity {v.capacity} · Condition {v.condition}%
                          </button>
                        ))}
                        {availableFleet.filter(v => v.capacity >= c.requiredCapacity).length === 0 && (
                          <div style={{ fontSize: '11px', color: T.red }}>No suitable available vehicles.</div>
                        )}
                        <GhostButton onClick={() => setAssigningFor(null)}>Cancel</GhostButton>
                      </div>
                    ) : (
                      <GhostButton onClick={() => setAssigningFor(c.id)} color={T.mint}>Assign Vehicle →</GhostButton>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '11px', color: T.mint, marginBottom: '8px' }}>✓ Vehicle: {assignedVehicle.type} · Condition {assignedVehicle.condition}%</div>
                    <GoldButton onClick={() => handleResolve(c.id)}>Resolve Contract →</GoldButton>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* HISTORY */}
      {myCompleted.length > 0 && (
        <div>
          <SectionHeader stamp={`${myCompleted.length}`}>Contract History</SectionHeader>
          {myCompleted.map(c => (
            <div key={c.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', color: c.status === 'completed' ? T.mint : T.red, marginRight: '8px' }}>{c.status}</span>
                <span style={{ fontSize: '12px', color: T.muted }}>{c.title}</span>
              </div>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: c.status === 'completed' ? T.mint : T.red }}>₯{c.payment.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── REGISTRY TAB ─────────────────────────────────────────────────────────────
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
        <FieldRow label="Company Cash" value={`₯${company.companyCash.toLocaleString()}`} valueColor={T.mint} />
        <FieldRow label="Debt" value={`₯${company.debt.toLocaleString()}`} valueColor={company.debt > 0 ? T.red : T.muted} />
        <FieldRow label="Monthly Revenue" value={`₯${company.monthlyRevenue.toLocaleString()}`} valueColor={T.mint} />
        <FieldRow label="Monthly Costs" value={`₯${company.monthlyCosts.toLocaleString()}`} valueColor={T.red} />
        <FieldRow label="Net Profit" value={`₯${company.profit.toLocaleString()}`} valueColor={company.profit >= 0 ? T.mint : T.red} />
      </PanelBox>
      <PanelBox>
        <SectionHeader stamp="NET WORTH">Personal Balance Sheet</SectionHeader>
        <FieldRow label="Cash in Hand" value={`₯${playerCash.toLocaleString()}`} valueColor={T.mint} />
        <FieldRow label="Company Cash" value={`₯${company.companyCash.toLocaleString()}`} valueColor={T.mint} />
        <FieldRow label="Vehicle Assets" value={`₯${(companyValue - company.companyCash).toLocaleString()}`} valueColor={T.steel} />
        <FieldRow label="Company Value" value={`₯${companyValue.toLocaleString()}`} valueColor={T.gold} />
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Net Worth</span>
          <span style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>₯{netWorth.toLocaleString()}</span>
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
        <FieldRow label="Company Value" value={`₯${companyValue.toLocaleString()}`} valueColor={T.mint} />
        <FieldRow label="Your Equity" value={`₯${companyValue.toLocaleString()} (100%)`} valueColor={T.gold} />
      </PanelBox>
      <PanelBox style={{ marginTop: '16px' }}>
        <SectionHeader>Future Equity Options</SectionHeader>
        <p style={{ fontSize: '12px', color: T.faint, lineHeight: 1.7 }}>Upgrade to Private Company or Corporation to unlock share issuance, partner buy-in, and Westport Bourse listing. Available in a future version.</p>
      </PanelBox>
    </div>
  );
}
