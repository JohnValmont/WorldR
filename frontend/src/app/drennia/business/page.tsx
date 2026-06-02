'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCompanies, saveCompany, getPlayerCompany,
  getContracts, saveContract, initializeContractsIfEmpty, evaluateContractBids, createPlayerContract,
  NPC_COMPANIES,
  type Company, type Contract
} from '../../../lib/businessCore';

type ContractDraft = Omit<Contract, 'id' | 'createdAt' | 'status' | 'bids' | 'issuerType'>;

// ─── Theme ───────────────────────────────────────────────────────────────────
const T = {
  bg: '#090A0F',
  panel: '#11131A',
  panelSoft: '#17151B',
  paper: '#1E1A15',
  border: '#2A2630',
  borderGold: 'rgba(201,162,74,0.22)',
  gold: '#C9A24A',
  goldBright: '#E0B85A',
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
      background: 'transparent',
      color: color || T.muted,
      border: `1px solid ${T.border}`,
      padding: '8px 18px',
      fontSize: '10px',
      fontFamily: 'monospace',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      fontWeight: 600,
      cursor: 'pointer',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.ivory; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = color || T.muted; }}
  >
    {children}
  </button>
);

const LockedBadge = ({ label }: { label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
    <span style={{ fontSize: '10px', color: T.faint }}>🔒</span>
    <span style={{ fontSize: '10px', color: T.faint, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
  </div>
);

// ─── Sub-tab types ────────────────────────────────────────────────────────────
type SubTab = 'overview' | 'start' | 'companies' | 'contracts' | 'registry' | 'finance' | 'equity';

const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
  { id: 'overview',   label: 'Overview' },
  { id: 'start',      label: 'Start Business' },
  { id: 'companies',  label: 'My Companies' },
  { id: 'contracts',  label: 'Contracts',  requiresCompany: true },
  { id: 'registry',   label: 'Registry' },
  { id: 'finance',    label: 'Finance',   requiresCompany: true },
  { id: 'equity',     label: 'Equity',    requiresCompany: true },
];

// ─── SECTORS ─────────────────────────────────────────────────────────────────
const SECTORS = [
  { id: 'Retail & Consumer',    desc: 'Consumer goods, storefronts, and distribution to the public market.', available: true },
  { id: 'Shipping & Logistics', desc: 'Freight, transport, port handling, and supply chain operations.', available: true },
  { id: 'Agriculture & Food',   desc: 'Farming, processing, and supplying food markets across Drennia.', available: true },
  { id: 'Manufacturing',        desc: 'Production, parts, assembly, and industrial output.', available: true },
  { id: 'Finance & Services',   desc: 'Banking, lending, insurance, and advisory.', available: false },
  { id: 'Construction',         desc: 'Infrastructure, building, and civil development.', available: false },
  { id: 'Technology',           desc: 'Emerging technologies, manufacturing tools, and communications.', available: false },
  { id: 'Energy',               desc: 'Fuel, steam, coal, and energy distribution.', available: false },
];

// ─── HQ OPTIONS ──────────────────────────────────────────────────────────────
const HQ_OPTIONS = [
  {
    id: 'Drennport State',
    city: 'Drennport',
    tagline: 'Finance, Law & Administration',
    desc: 'The capital. Excellent registry access, financial services, legal frameworks, and professional demand. Higher operating costs.',
    costNote: '▲ Higher Costs',
    costColor: T.red,
  },
  {
    id: 'Westport State',
    city: 'Westport',
    tagline: 'Ports, Trade & Export',
    desc: 'A major port hub with strong shipping, trade, and logistics contracts. High competition, fast-moving market.',
    costNote: '≈ Moderate Costs',
    costColor: T.gold,
  },
  {
    id: 'Ironvale State',
    city: 'Ironvale',
    tagline: 'Manufacturing & Labour',
    desc: 'Heavily industrial. Strong supply of materials and factory capacity. Labour dynamics will factor in later.',
    costNote: '▼ Lower Costs',
    costColor: T.mint,
  },
  {
    id: 'Greenmere State',
    city: 'Greenmere',
    tagline: 'Agriculture & Community',
    desc: 'Slower market, community reputation-heavy. Strong for food, farming, and local supply chains.',
    costNote: '▼ Lowest Costs',
    costColor: T.mint,
  },
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
  const [biddingOn, setBiddingOn] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState(0);
  const [bidNote, setBidNote] = useState('');

  // Start Business state
  const [step, setStep] = useState(1);
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedHQ, setSelectedHQ] = useState('');
  const [selectedStructure] = useState('Sole Trader');
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [startError, setStartError] = useState('');

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
      setPlayerCash(cf.wealth || 0);
      const playerCompany = getPlayerCompany(cName);
      setCompany(playerCompany || null);
    }
    initializeContractsIfEmpty();
    setContracts(getContracts());
    setAuthorized(true);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Helpers ────────────────────────────────────────────────────────────
  const updateCash = (delta: number) => {
    if (!citizenFile) return;
    const newCash = playerCash + delta;
    setPlayerCash(newCash);
    const updated = { ...citizenFile, wealth: newCash };
    setCitizenFile(updated);
    localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(updated));
  };

  const addRecord = (summary: string, type = 'business') => {
    const rec = { id: `rec_${Date.now()}`, type, summary, createdAt: new Date().toISOString() };
    const recs = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
    localStorage.setItem('worldr_records_v1', JSON.stringify([rec, ...recs]));
  };

  // ─── Start Business logic ────────────────────────────────────────────────
  const checkName = () => {
    setNameError('');
    if (!companyNameInput.trim()) { setNameError('Company name cannot be blank.'); return false; }
    if (companyNameInput.trim().length < 3) { setNameError('Name must be at least 3 characters.'); return false; }
    const allCompanies = [...getCompanies(), ...NPC_COMPANIES];
    const taken = allCompanies.some(c => c.name.toLowerCase() === companyNameInput.trim().toLowerCase());
    if (taken) { setNameError('That name is already registered in the Drennia registry.'); return false; }
    return true;
  };

  const handleRegisterCompany = () => {
    setStartError('');
    if (playerCash < 525) {
      setStartError(`Insufficient funds. You need ₯525 (₯500 capital + ₯25 filing fee). You have ₯${playerCash}.`);
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
      companyCash: 500,
      monthlyRevenue: 0, monthlyCosts: 0, profit: 0,
      capacity: 1,
      reputation: 'New', reliability: 'Unproven',
      debt: 0, status: 'Active',
      activeContracts: [], publicRecords: [], riskFlags: [],
    };
    saveCompany(newCompany);
    updateCash(-525);
    addRecord(`Registered ${finalName} as a Sole Trader headquartered in ${selectedHQ}. Initial capital filed: ₯500.`);
    setCompany(newCompany);
    setActiveTab('companies');
  };

  // ─── Contract logic ───────────────────────────────────────────────────────
  const handlePlaceBid = (contractId: string) => {
    if (!company) return;
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    const existing = contract.bids.findIndex(b => b.companyId === company.id);
    const newBid = { companyId: company.id, amount: bidAmount, note: bidNote, timestamp: new Date().toISOString() };
    const updated = { ...contract, bids: existing >= 0
      ? contract.bids.map((b, i) => i === existing ? newBid : b)
      : [...contract.bids, newBid]
    };
    saveContract(updated);
    setContracts(getContracts());
    setBiddingOn(null); setBidAmount(0); setBidNote('');
  };

  const handleEvaluateAll = () => {
    contracts.filter(c => c.status === 'open').forEach(c => evaluateContractBids(c.id));
    setContracts(getContracts());
  };

  if (!authorized) return null;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>

      {/* ── Top Player Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', borderBottom: `1px solid ${T.border}`, background: T.panel, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.2em', color: T.gold }}>WORLDr</span>
          <span style={{ width: '1px', height: '16px', background: T.border }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: T.ivory }}>{characterName}</span>
          <span style={{ fontSize: '10px', color: T.faint, fontFamily: 'monospace' }}>Age 18</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <StatPill label="Credibility" value={citizenFile?.credibility || 50} />
          <StatPill label="Charisma" value={citizenFile?.charisma || 50} />
          <StatPill label="Influence" value={citizenFile?.influence || 10} />
          <StatPill label="Cash ₯" value={playerCash} color={T.mint} />
        </div>
      </div>

      {/* ── Page Title ── */}
      <div style={{ padding: '20px 24px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '4px' }}>Business Desk</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: T.ivory, margin: 0 }}>Business</h1>
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
                padding: '10px 16px',
                fontSize: '11px',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: isActive ? 700 : 500,
                color: locked ? T.faint : isActive ? T.gold : T.muted,
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${T.gold}` : '2px solid transparent',
                cursor: locked ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s',
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
        {activeTab === 'overview'   && <OverviewTab company={company} playerCash={playerCash} onStartBusiness={() => setActiveTab('start')} onViewContracts={() => setActiveTab('contracts')} onViewRegistry={() => setActiveTab('registry')} />}
        {activeTab === 'start'      && <StartBusinessTab step={step} setStep={setStep} selectedSector={selectedSector} setSelectedSector={setSelectedSector} selectedHQ={selectedHQ} setSelectedHQ={setSelectedHQ} companyNameInput={companyNameInput} setCompanyNameInput={setCompanyNameInput} nameError={nameError} setNameError={setNameError} startError={startError} playerCash={playerCash} company={company} onRegister={handleRegisterCompany} checkName={checkName} />}
        {activeTab === 'companies'  && <CompaniesTab company={company} onGoToContracts={() => setActiveTab('contracts')} onGoToRegistry={() => setActiveTab('registry')} />}
        {activeTab === 'contracts'  && company && <ContractsTab company={company} contracts={contracts} biddingOn={biddingOn} setBiddingOn={setBiddingOn} bidAmount={bidAmount} setBidAmount={setBidAmount} bidNote={bidNote} setBidNote={setBidNote} onPlaceBid={handlePlaceBid} onEvaluateAll={handleEvaluateAll} onCreateContract={(c: ContractDraft) => { createPlayerContract(c); setContracts(getContracts()); }} />}
        {activeTab === 'registry'   && <RegistryTab company={company} />}
        {activeTab === 'finance'    && company && <FinanceTab company={company} />}
        {activeTab === 'equity'     && company && <EquityTab company={company} characterName={characterName} />}
      </div>
    </div>
  );
}

// ─── StatPill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: '8px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.faint }}>{label}</span>
      <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: color || T.ivory }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ company, playerCash, onStartBusiness, onViewContracts, onViewRegistry }: {
  company: Company | null;
  playerCash: number;
  onStartBusiness: () => void;
  onViewContracts: () => void;
  onViewRegistry: () => void;
}) {
  if (!company) {
    return (
      <div style={{ maxWidth: '560px' }}>
        <SectionHeader stamp="DRENNIA COMMERCIAL REGISTRY">Business Desk</SectionHeader>
        <PanelBox style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', color: T.muted, lineHeight: 1.7, margin: '0 0 24px' }}>
            You do not own a company yet. Drennia's registry is open, but every filing becomes part of your permanent record.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <GoldButton onClick={onStartBusiness}>Start Business →</GoldButton>
            <GhostButton onClick={onViewRegistry}>View Public Registry</GhostButton>
          </div>
        </PanelBox>
        <PanelBox>
          <SectionHeader>Company Types Available</SectionHeader>
          <FieldRow label="Sole Trader" value="Active" valueColor={T.mint} />
          <FieldRow label="Private Company" value="Locked" valueColor={T.faint} />
          <FieldRow label="Corporation" value="Locked" valueColor={T.faint} />
          <FieldRow label="Public Corporation" value="Locked" valueColor={T.faint} />
          <FieldRow label="Holding Company" value="Locked" valueColor={T.faint} />
        </PanelBox>
      </div>
    );
  }

  const activeContracts = getContracts().filter(c => c.status === 'awarded' && c.awardedToCompanyId === company.id);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '900px' }}>
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
        <FieldRow label="Monthly Revenue" value={`₯${company.monthlyRevenue.toLocaleString()}`} valueColor={T.mint} />
        <FieldRow label="Monthly Costs" value={`₯${company.monthlyCosts.toLocaleString()}`} valueColor={T.red} />
        <FieldRow label="Profit" value={`₯${company.profit.toLocaleString()}`} valueColor={company.profit >= 0 ? T.mint : T.red} />
        <FieldRow label="Debt" value={`₯${company.debt.toLocaleString()}`} valueColor={company.debt > 0 ? T.burgundy : T.muted} />
        <FieldRow label="Active Contracts" value={activeContracts.length} />
      </PanelBox>
      <PanelBox style={{ gridColumn: '1 / -1' }}>
        <SectionHeader>Suggested Actions</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
          {[
            { label: 'View Contract Board', action: onViewContracts, color: T.gold },
            { label: 'View Registry', action: onViewRegistry, color: T.ivory },
            { label: 'Send Business Offer', action: () => {}, color: T.steel },
            { label: 'Review Finance', action: () => {}, color: T.steel },
          ].map(a => (
            <button key={a.label} onClick={a.action} style={{ padding: '14px 12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderGold; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
            >
              <div style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: a.color }}>{a.label}</div>
            </button>
          ))}
        </div>
      </PanelBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// START BUSINESS TAB
// ─────────────────────────────────────────────────────────────────────────────
function StartBusinessTab({ step, setStep, selectedSector, setSelectedSector, selectedHQ, setSelectedHQ, companyNameInput, setCompanyNameInput, nameError, setNameError, startError, playerCash, company, onRegister, checkName }: any) {
  if (company) {
    return (
      <PanelBox style={{ maxWidth: '540px' }}>
        <SectionHeader>Company Already Registered</SectionHeader>
        <p style={{ fontSize: '13px', color: T.muted, lineHeight: 1.7 }}>
          You have already registered <strong style={{ color: T.ivory }}>{company.name}</strong>. Each citizen may only hold one active sole trader registration at this time.
        </p>
        <p style={{ fontSize: '11px', color: T.faint, marginTop: '12px' }}>
          Conversion to Private Company or Corporation will be available as your business grows.
        </p>
      </PanelBox>
    );
  }

  const STEP_LABELS = ['Sector', 'Headquarters', 'Structure', 'Company Name', 'Starting Capital', 'Confirm Filing'];

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
            Your sector determines which contracts you can bid on and which market conditions affect you.
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
                  {!s.available && <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint, letterSpacing: '0.1em' }}>LOCKED</span>}
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
          <p style={{ fontSize: '12px', color: T.muted, marginBottom: '20px', lineHeight: 1.7 }}>Your HQ state affects your operating costs, contract access, and market exposure.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {HQ_OPTIONS.map(hq => (
              <button key={hq.id} onClick={() => setSelectedHQ(hq.id)} style={{ padding: '16px 18px', background: selectedHQ === hq.id ? 'rgba(201,162,74,0.08)' : 'rgba(255,255,255,0.02)', border: selectedHQ === hq.id ? `1px solid ${T.gold}` : `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{hq.city}</span>
                    <span style={{ fontSize: '10px', color: T.muted, marginLeft: '10px' }}>{hq.tagline}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: hq.costColor, letterSpacing: '0.05em' }}>{hq.costNote}</span>
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

      {/* Step 3 — Legal Structure */}
      {step === 3 && (
        <div>
          <SectionHeader stamp="STEP 3 OF 6">Legal Structure</SectionHeader>
          <p style={{ fontSize: '12px', color: T.muted, marginBottom: '20px', lineHeight: 1.7 }}>Legal structure determines your liability, equity options, and future conversion paths.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {[
              { label: 'Sole Trader', desc: 'Simplest structure. You are the business. Full liability, full ownership, lowest filing cost.', active: true },
              { label: 'Private Company', desc: 'Separate legal entity. Can add partners and issue shares.', active: false },
              { label: 'Corporation', desc: 'Full liability protection. Required for public trading.', active: false },
              { label: 'Public Corporation', desc: 'Can list shares on the Westport Bourse.', active: false },
              { label: 'Holding Company', desc: 'Owns subsidiaries. Group structure.', active: false },
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
            Choose a name for the public registry. This becomes your permanent business identity in Drennia.
          </p>
          <div style={{ marginBottom: '20px' }}>
            <Label>Company Name</Label>
            <input
              type="text"
              value={companyNameInput}
              onChange={e => { setCompanyNameInput(e.target.value); setNameError(''); }}
              placeholder="e.g. Vane & Sons Trading Co."
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

      {/* Step 5 — Capital */}
      {step === 5 && (
        <div>
          <SectionHeader stamp="STEP 5 OF 6">Starting Capital</SectionHeader>
          <PanelBox style={{ marginBottom: '20px' }}>
            <FieldRow label="Company Name" value={companyNameInput} />
            <FieldRow label="Sector" value={selectedSector} />
            <FieldRow label="HQ State" value={selectedHQ} />
            <FieldRow label="Legal Structure" value="Sole Trader" />
          </PanelBox>
          <PanelBox style={{ background: T.paper, marginBottom: '24px' }}>
            <SectionHeader>Filing Costs</SectionHeader>
            <FieldRow label="Starting Company Capital" value="₯500" valueColor={T.mint} />
            <FieldRow label="Registry Filing Fee" value="₯25" valueColor={T.red} />
            <div style={{ marginTop: '12px', padding: '10px 0', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Total Required</span>
              <span style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>₯525</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: T.muted }}>Your Current Cash</span>
              <span style={{ fontSize: '13px', fontFamily: 'monospace', color: playerCash >= 525 ? T.mint : T.red }}>₯{playerCash}</span>
            </div>
            {playerCash < 525 && (
              <div style={{ fontSize: '11px', color: T.red, marginTop: '12px', padding: '8px', background: 'rgba(143,61,61,0.1)', border: `1px solid ${T.burgundy}` }}>
                ⚠ Insufficient funds. You need ₯{525 - playerCash} more.
              </div>
            )}
          </PanelBox>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={() => setStep(4)}>← Back</GhostButton>
            <GoldButton onClick={() => setStep(6)} disabled={playerCash < 525}>Next: Confirm →</GoldButton>
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
            <FieldRow label="Capital Filed" value="₯500" valueColor={T.mint} />
            <FieldRow label="Filing Fee" value="₯25" valueColor={T.red} />
            <FieldRow label="Total Deducted" value="₯525" valueColor={T.gold} />
          </PanelBox>
          <p style={{ fontSize: '11px', color: T.muted, marginBottom: '20px', lineHeight: 1.7 }}>
            By confirming, this filing becomes a permanent public record in the Drennia Commercial Registry. The entry will be visible to all operators.
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
// MY COMPANIES TAB
// ─────────────────────────────────────────────────────────────────────────────
function CompaniesTab({ company, onGoToContracts, onGoToRegistry }: { company: Company | null; onGoToContracts: () => void; onGoToRegistry: () => void }) {
  if (!company) {
    return (
      <PanelBox style={{ maxWidth: '540px' }}>
        <SectionHeader>My Companies</SectionHeader>
        <p style={{ fontSize: '13px', color: T.muted }}>You have not registered a company yet. Go to <strong style={{ color: T.gold }}>Start Business</strong> to incorporate.</p>
      </PanelBox>
    );
  }

  const records = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]').filter((r: any) => r.type === 'business' || r.type === 'contract').slice(0, 5);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '900px' }}>
      <PanelBox>
        <SectionHeader stamp="OFFICIAL RECORD">Company File</SectionHeader>
        <FieldRow label="Company Name" value={company.name} />
        <FieldRow label="Owner" value={company.ownerName} />
        <FieldRow label="Legal Structure" value={company.legalStructure} />
        <FieldRow label="HQ State" value={company.state} />
        <FieldRow label="Sector" value={company.sector} />
        <FieldRow label="Status" value={company.status} valueColor={T.mint} />
        <FieldRow label="Registered" value={new Date(company.registeredAt).toLocaleDateString('en-GB')} />
      </PanelBox>

      <PanelBox>
        <SectionHeader stamp="LEDGER">Financial Position</SectionHeader>
        <FieldRow label="Company Cash" value={`₯${company.companyCash.toLocaleString()}`} valueColor={T.mint} />
        <FieldRow label="Monthly Revenue" value={`₯${company.monthlyRevenue.toLocaleString()}`} valueColor={T.mint} />
        <FieldRow label="Monthly Costs" value={`₯${company.monthlyCosts.toLocaleString()}`} valueColor={T.red} />
        <FieldRow label="Net Profit" value={`₯${company.profit.toLocaleString()}`} valueColor={company.profit >= 0 ? T.mint : T.red} />
        <FieldRow label="Outstanding Debt" value={`₯${company.debt.toLocaleString()}`} valueColor={company.debt > 0 ? T.burgundy : T.muted} />
      </PanelBox>

      <PanelBox>
        <SectionHeader stamp="OPERATIONS">Operating Position</SectionHeader>
        <FieldRow label="Capacity" value={company.capacity} />
        <FieldRow label="Active Contracts" value={company.activeContracts.length} />
        <FieldRow label="Reputation" value={company.reputation} valueColor={T.gold} />
        <FieldRow label="Reliability" value={company.reliability} />
        {company.riskFlags.length > 0
          ? company.riskFlags.map(f => <FieldRow key={f} label="Risk Flag" value={f} valueColor={T.burgundy} />)
          : <FieldRow label="Risk Flags" value="None" valueColor={T.mint} />
        }
      </PanelBox>

      <PanelBox>
        <SectionHeader stamp="PUBLIC FILINGS">Records</SectionHeader>
        {records.length === 0
          ? <p style={{ fontSize: '12px', color: T.faint }}>No records yet.</p>
          : records.map((r: any) => (
            <div key={r.id} style={{ padding: '8px 0', borderBottom: `1px solid ${T.border}`, fontSize: '11px', color: T.muted, lineHeight: 1.6 }}>
              {r.summary}
            </div>
          ))
        }
      </PanelBox>

      <PanelBox style={{ gridColumn: '1 / -1' }}>
        <SectionHeader>Next Actions</SectionHeader>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <GhostButton onClick={onGoToContracts} color={T.gold}>View Contract Board</GhostButton>
          <GhostButton onClick={onGoToContracts} color={T.mint}>Create Contract</GhostButton>
          <GhostButton onClick={onGoToRegistry} color={T.ivory}>View Public Registry</GhostButton>
          <GhostButton color={T.steel}>Send Business Offer</GhostButton>
          <GhostButton color={T.steel}>Review Finance</GhostButton>
        </div>
      </PanelBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function ContractsTab({ company, contracts, biddingOn, setBiddingOn, bidAmount, setBidAmount, bidNote, setBidNote, onPlaceBid, onEvaluateAll, onCreateContract }: any) {
  const [showCreate, setShowCreate] = useState(false);
  const [newCtr, setNewCtr] = useState({ title: '', description: '', requiredSector: company.sector, payment: 100, deadlineDays: 3, penalty: 20 });

  const openContracts = contracts.filter((c: Contract) => c.status === 'open');
  const myBids = contracts.filter((c: Contract) => c.bids.some((b: any) => b.companyId === company.id));
  const myIssued = contracts.filter((c: Contract) => c.issuerCompanyId === company.id);
  const activeContracts = contracts.filter((c: Contract) => c.status === 'awarded' && c.awardedToCompanyId === company.id);
  const completed = contracts.filter((c: Contract) => c.status === 'completed');

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.gold }}>Public Contract Board</div>
          <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px' }}>Available tenders and logistics runs. Sector: {company.sector}</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <GhostButton onClick={() => setShowCreate(!showCreate)} color={T.mint}>{showCreate ? 'Cancel' : 'Create Tender'}</GhostButton>
          <GhostButton onClick={onEvaluateAll} color={T.gold}>Simulate Reviews</GhostButton>
        </div>
      </div>

      {/* Create Tender Form */}
      {showCreate && (
        <PanelBox style={{ marginBottom: '24px', background: T.paper }}>
          <SectionHeader stamp="PLAYER TENDER">Draft New Contract</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <Label>Contract Title</Label>
              <input type="text" value={newCtr.title} onChange={e => setNewCtr({ ...newCtr, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: T.panel, border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <Label>Required Sector</Label>
              <select value={newCtr.requiredSector} onChange={e => setNewCtr({ ...newCtr, requiredSector: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: T.panel, border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }}>
                {['Retail & Consumer', 'Shipping & Logistics', 'Agriculture & Food', 'Manufacturing'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <Label>Description</Label>
            <textarea value={newCtr.description} onChange={e => setNewCtr({ ...newCtr, description: e.target.value })} rows={2} style={{ width: '100%', padding: '8px 12px', background: T.panel, border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px', boxSizing: 'border-box', resize: 'none' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Max Payment (₯)', key: 'payment', color: T.mint },
              { label: 'Penalty (₯)', key: 'penalty', color: T.red },
              { label: 'Deadline (Days)', key: 'deadlineDays', color: T.ivory },
            ].map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <input type="number" value={(newCtr as any)[f.key]} onChange={e => setNewCtr({ ...newCtr, [f.key]: Number(e.target.value) })} style={{ width: '100%', padding: '8px 12px', background: T.panel, border: `1px solid ${T.border}`, color: f.color, fontSize: '12px', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <GoldButton onClick={() => {
            if (!newCtr.title.trim()) return;
            onCreateContract({ issuerCompanyId: company.id, issuerName: company.name, title: newCtr.title, description: newCtr.description, requiredSector: newCtr.requiredSector, payment: newCtr.payment, deadlineDays: newCtr.deadlineDays, penalty: newCtr.penalty, originState: company.state, destinationState: company.state, requiredCapacity: 1, visibility: 'public' as const });
            setShowCreate(false);
            setNewCtr({ title: '', description: '', requiredSector: company.sector, payment: 100, deadlineDays: 3, penalty: 20 });
          }}>Post to Board ◈</GoldButton>
        </PanelBox>
      )}

      {/* Sections */}
      <ContractSection title="Available Contracts" stamp={`${openContracts.length} OPEN`} contracts={openContracts} company={company} biddingOn={biddingOn} setBiddingOn={setBiddingOn} bidAmount={bidAmount} setBidAmount={setBidAmount} bidNote={bidNote} setBidNote={setBidNote} onPlaceBid={onPlaceBid} />
      {myBids.length > 0 && <ContractSection title="My Bids" stamp={`${myBids.length} BIDS`} contracts={myBids} company={company} biddingOn={null} setBiddingOn={() => {}} bidAmount={0} setBidAmount={() => {}} bidNote="" setBidNote={() => {}} onPlaceBid={() => {}} readOnly />}
      {myIssued.length > 0 && <ContractSection title="My Issued Contracts" stamp="ISSUER" contracts={myIssued} company={company} biddingOn={null} setBiddingOn={() => {}} bidAmount={0} setBidAmount={() => {}} bidNote="" setBidNote={() => {}} onPlaceBid={() => {}} readOnly />}
      {activeContracts.length > 0 && <ContractSection title="Active Contracts" stamp="IN PROGRESS" contracts={activeContracts} company={company} biddingOn={null} setBiddingOn={() => {}} bidAmount={0} setBidAmount={() => {}} bidNote="" setBidNote={() => {}} onPlaceBid={() => {}} readOnly />}
      {completed.length > 0 && <ContractSection title="Completed" stamp={`${completed.length}`} contracts={completed} company={company} biddingOn={null} setBiddingOn={() => {}} bidAmount={0} setBidAmount={() => {}} bidNote="" setBidNote={() => {}} onPlaceBid={() => {}} readOnly />}
    </div>
  );
}

function ContractSection({ title, stamp, contracts, company, biddingOn, setBiddingOn, bidAmount, setBidAmount, bidNote, setBidNote, onPlaceBid, readOnly }: any) {
  if (contracts.length === 0) return null;
  return (
    <div style={{ marginBottom: '28px' }}>
      <SectionHeader stamp={stamp}>{title}</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {contracts.map((ctr: Contract) => {
          const myBid = ctr.bids.find((b: any) => b.companyId === company.id);
          const isMine = ctr.issuerCompanyId === company.id;
          return (
            <div key={ctr.id} style={{ padding: '16px', background: T.panel, border: `1px solid ${isMine ? T.borderGold : T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory }}>{ctr.title}</div>
                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.gold, marginTop: '2px' }}>Issued by {ctr.issuerName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.mint }}>₯{ctr.payment}</div>
                  <div style={{ fontSize: '10px', color: T.red }}>Penalty ₯{ctr.penalty}</div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.6, marginBottom: '10px' }}>{ctr.description}</div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.faint, marginBottom: '10px' }}>
                <span>Sector: {ctr.requiredSector}</span>
                <span>Deadline: {ctr.deadlineDays}d</span>
              </div>
              {!readOnly && !isMine && (
                myBid ? (
                  <div style={{ fontSize: '11px', color: T.mint, padding: '8px', background: 'rgba(54,211,153,0.07)', border: '1px solid rgba(54,211,153,0.2)' }}>
                    Bid submitted: ₯{myBid.amount} — Awaiting issuer review.
                  </div>
                ) : biddingOn === ctr.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" min={1} max={ctr.payment} value={bidAmount || ''} onChange={e => setBidAmount(Number(e.target.value))} placeholder="Your bid (₯)" style={{ padding: '8px 12px', background: T.paper, border: `1px solid ${T.border}`, color: T.mint, fontSize: '13px', fontFamily: 'monospace', width: '140px' }} />
                      <input type="text" value={bidNote} onChange={e => setBidNote(e.target.value)} placeholder="Optional note" style={{ flex: 1, padding: '8px 12px', background: T.paper, border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <GoldButton onClick={() => onPlaceBid(ctr.id)} disabled={bidAmount <= 0}>Submit Bid ◈</GoldButton>
                      <GhostButton onClick={() => setBiddingOn(null)}>Cancel</GhostButton>
                    </div>
                  </div>
                ) : (
                  <GhostButton onClick={() => { setBiddingOn(ctr.id); setBidAmount(Math.floor(ctr.payment * 0.9)); }} color={T.ivory}>Place Bid</GhostButton>
                )
              )}
              {isMine && <div style={{ fontSize: '10px', color: T.faint, fontFamily: 'monospace' }}>Bids received: {ctr.bids.length}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY TAB
// ─────────────────────────────────────────────────────────────────────────────
function RegistryTab({ company }: { company: Company | null }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const allCompanies = [...getCompanies(), ...NPC_COMPANIES];

  return (
    <div style={{ maxWidth: '900px' }}>
      <SectionHeader stamp="PUBLIC LEDGER">Public Company Registry</SectionHeader>
      <p style={{ fontSize: '11px', color: T.muted, marginBottom: '20px' }}>The official Drennia ledger of registered operating companies.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {['Company', 'HQ State', 'Sector', 'Structure', 'Reputation', 'Reliability', 'Status'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '9px', color: T.faint, fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allCompanies.map(co => {
              const isExpanded = expandedId === co.id;
              const isPlayer = co.ownerCharacterId === company?.ownerCharacterId;
              return (
                <React.Fragment key={co.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : co.id)}
                    style={{ borderBottom: isExpanded ? 'none' : `1px solid ${T.border}`, cursor: 'pointer', background: isExpanded ? 'rgba(201,162,74,0.04)' : 'transparent' }}
                    onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ fontWeight: 700, color: isPlayer ? T.gold : T.ivory }}>{co.name} {isPlayer && '★'}</div>
                      <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint, marginTop: '2px' }}>{co.ownerName}</div>
                    </td>
                    <td style={{ padding: '12px', color: T.muted }}>{co.state}</td>
                    <td style={{ padding: '12px', color: T.muted }}>{co.sector}</td>
                    <td style={{ padding: '12px', color: T.muted }}>{co.legalStructure}</td>
                    <td style={{ padding: '12px', color: T.gold }}>{co.reputation}</td>
                    <td style={{ padding: '12px', color: T.mint }}>{co.reliability}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '9px', fontFamily: 'monospace', padding: '2px 8px', background: 'rgba(54,211,153,0.08)', border: '1px solid rgba(54,211,153,0.2)', color: T.mint }}>{co.status}</span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td colSpan={7} style={{ padding: '16px 24px', background: T.paper }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '6px' }}>{co.name}</div>
                            <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.7, maxWidth: '500px' }}>
                              Registered on {new Date(co.registeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. 
                              Operates in {co.sector} from {co.state}. Capacity rating: {co.capacity}. 
                              Active public contracts: {co.activeContracts.length}.
                            </div>
                          </div>
                          {!isPlayer && company && (
                            <GhostButton color={T.steel} onClick={() => alert(`Business Offer feature coming next update.`)}>Send Business Offer</GhostButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE TAB
// ─────────────────────────────────────────────────────────────────────────────
function FinanceTab({ company }: { company: Company }) {
  return (
    <div style={{ maxWidth: '700px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <PanelBox>
        <SectionHeader stamp="LIVE">Financial Position</SectionHeader>
        <FieldRow label="Company Cash" value={`₯${company.companyCash.toLocaleString()}`} valueColor={T.mint} />
        <FieldRow label="Monthly Revenue" value={`₯${company.monthlyRevenue.toLocaleString()}`} valueColor={T.mint} />
        <FieldRow label="Monthly Costs" value={`₯${company.monthlyCosts.toLocaleString()}`} valueColor={T.red} />
        <FieldRow label="Net Profit" value={`₯${company.profit.toLocaleString()}`} valueColor={company.profit >= 0 ? T.mint : T.red} />
        <FieldRow label="Outstanding Debt" value={`₯${company.debt.toLocaleString()}`} valueColor={company.debt > 0 ? T.burgundy : T.muted} />
      </PanelBox>
      <PanelBox>
        <SectionHeader stamp="COMING SOON">Credit Profile</SectionHeader>
        <FieldRow label="Credit Score" value="Unrated" valueColor={T.faint} />
        <FieldRow label="Bank Relationship" value="None" valueColor={T.faint} />
        <FieldRow label="Loan Eligible" value="No" valueColor={T.faint} />
        <FieldRow label="Insurance" value="None" valueColor={T.faint} />
      </PanelBox>
      <PanelBox style={{ gridColumn: '1 / -1', background: T.paper }}>
        <SectionHeader stamp="LOCKED">Future Finance Actions</SectionHeader>
        <LockedBadge label="Open Business Bank Account" />
        <LockedBadge label="Request Microloan from Drennport Commercial Bank" />
        <LockedBadge label="Review Tax Position" />
        <LockedBadge label="Purchase Business Insurance" />
        <div style={{ marginTop: '16px', fontSize: '11px', color: T.faint, fontStyle: 'italic' }}>
          Finance module will expand as your company grows and earns contracts.
        </div>
      </PanelBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EQUITY TAB
// ─────────────────────────────────────────────────────────────────────────────
function EquityTab({ company, characterName }: { company: Company; characterName: string }) {
  return (
    <div style={{ maxWidth: '700px' }}>
      <PanelBox style={{ marginBottom: '20px', background: T.paper }}>
        <SectionHeader stamp="OWNERSHIP LEDGER">Equity Structure</SectionHeader>
        <div style={{ fontSize: '12px', color: T.muted, marginBottom: '20px' }}>
          As a Sole Trader, you are the sole owner of this business. All equity, voting rights, and dividends belong to you.
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {['Shareholder', 'Ownership', 'Voting Power', 'Dividend Right'].map(h => (
                <th key={h} style={{ padding: '8px 0', textAlign: 'left', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '9px', color: T.faint }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '14px 0', color: T.ivory, fontWeight: 700 }}>{characterName}</td>
              <td style={{ padding: '14px 0', color: T.gold, fontFamily: 'monospace', fontWeight: 700 }}>100%</td>
              <td style={{ padding: '14px 0', color: T.gold, fontFamily: 'monospace', fontWeight: 700 }}>100%</td>
              <td style={{ padding: '14px 0', color: T.gold, fontFamily: 'monospace', fontWeight: 700 }}>100%</td>
            </tr>
          </tbody>
        </table>
      </PanelBox>
      <PanelBox style={{ background: T.panel }}>
        <SectionHeader stamp="LOCKED">Future Equity Actions</SectionHeader>
        <LockedBadge label="Add Business Partner" />
        <LockedBadge label="Sell Equity Stake" />
        <LockedBadge label="Issue Shares" />
        <LockedBadge label="Convert to Private Company" />
        <LockedBadge label="Convert to Corporation" />
        <div style={{ marginTop: '16px', fontSize: '11px', color: T.faint, fontStyle: 'italic' }}>
          Equity restructuring requires conversion to Private Company or Corporation.
        </div>
      </PanelBox>
    </div>
  );
}
