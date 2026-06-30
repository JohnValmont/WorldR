"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { manufacturingApi } from '../../../lib/api';
import {
  Card, Button, StatCard, DataRow, EmptyState as UIEmptyState, Badge, StatusDot, SectionHeading, Tabs, ProgressBar
} from '@/components/ui';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { LayoutDashboard, Factory, FlaskConical, ShoppingCart, Activity, BarChart3, Users, DollarSign, ScrollText, PieChart } from 'lucide-react';


// ─── Theme ─────────────────────────────────────────────────────────────────
const T = {
  gold: '#d4af37',
  muted: '#888888',
  faint: '#444444',
  ivory: '#fffff0',
  paper: '#0a0a0a',
  border: '#2a2a2a',
  mint: '#36d399',
  red: '#b85555',
  blue: '#6ea8fe',
  bg: '#090A0F',
};

// ─── Currency formatter is defined inside the component from mfgData.currencySymbol

// ─── Phase 3: Engineering Priority Definitions (frontend mirror) ─────────────
const ENG_PRIORITIES = [
  { id: 'reliability',   label: 'Reliability',               icon: '🛡', desc: 'More testing, lower risk, better reliability score.' },
  { id: 'performance',   label: 'Performance',               icon: '⚡', desc: 'Higher power output, better perf score. Heavier and costlier.' },
  { id: 'fuel_economy',  label: 'Fuel Economy',              icon: '⛽', desc: 'Lightweight focus, better fuel efficiency. Reduces weight.' },
  { id: 'comfort',       label: 'Comfort',                   icon: '🛋', desc: 'Interior refinement, better appeal score.' },
  { id: 'practicality',  label: 'Practicality',              icon: '📦', desc: 'Space and utility focus, better cargo score.' },
  { id: 'mfg_simplicity',label: 'Manufacturing Simplicity',  icon: '🔧', desc: 'Design for manufacture. Reduces production cost.' },
];
const NEUTRAL_PRI = 100 / 6; // ~16.67
const BUDGET_BUCKETS_FE = [
  { id: 'powertrain',           label: 'Powertrain R&D',        defaultPct: 0.18 },
  { id: 'body',                 label: 'Body Engineering',       defaultPct: 0.15 },
  { id: 'safety',               label: 'Safety Systems',         defaultPct: 0.12 },
  { id: 'interior',             label: 'Interior & NVH',         defaultPct: 0.10 },
  { id: 'testing',              label: 'Testing Programme',       defaultPct: 0.20 },
  { id: 'production_eng',       label: 'Production Engineering', defaultPct: 0.15 },
  { id: 'prototype_validation', label: 'Prototype Validation',   defaultPct: 0.10 },
];

function clamp01(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

// Phase 3 live engineering preview — mirrors engineeringEngine.ts logic
function calcLiveEngineering(design: {
  vehicleClass: string; platform: string; powerUnit: string;
  drivetrain: string; interiorTier: string; safetyTier: string;
  qualityTarget: string; priorities: Record<string, number>;
  budgetAlloc: Record<string, number>; totalBudget: number;
  engineerCount: number;
}, bootstrapData: any) {
  const { vehicleClass, platform, powerUnit, drivetrain, interiorTier, safetyTier, qualityTarget, priorities, budgetAlloc, totalBudget, engineerCount } = design;
  const platDef = bootstrapData?.platforms?.find((p: any) => p.id === platform);
  const pwrDef  = bootstrapData?.powerUnits?.find((p: any) => p.id === powerUnit);
  const drvDef  = bootstrapData?.drivetrains?.find((p: any) => p.id === drivetrain);
  const intDef  = bootstrapData?.interiorTiers?.find((p: any) => p.id === interiorTier);
  const safDef  = bootstrapData?.safetyTiers?.find((p: any) => p.id === safetyTier);
  const qualDef = bootstrapData?.qualityTargets?.find((p: any) => p.id === qualityTarget);

  // Component costs
  const rawCost = ((platDef?.baseCost ?? 12000) + (pwrDef?.baseCost ?? 2500) + (drvDef?.baseCost ?? 0) + (intDef?.baseCost ?? 0) + (safDef?.baseCost ?? 0)) * (qualDef?.costMultiplier ?? 1.0);

  // Base scores
  let rel    = 50 + (safDef?.reliabilityMod ?? 0) + (qualDef?.reliabilityMod ?? 0) + (platDef?.reliabilityMod ?? 0) + (pwrDef?.reliabilityMod ?? 0);
  let perf   = 40 + (pwrDef?.performanceMod ?? 0) + (drvDef?.performanceMod ?? 0) + (platDef?.performanceMod ?? 0) + (vehicleClass === 'Compact Car' ? 5 : 0);
  let fuel   = 60 + (pwrDef?.fuelMod ?? 0) + (drvDef?.fuelMod ?? 0) + (platDef?.fuelMod ?? 0) + (vehicleClass === 'Compact Car' ? 8 : 0) + (vehicleClass === 'Utility Van' ? -10 : 0);
  let appeal = 45 + (intDef?.appealMod ?? 0) + (safDef?.appealMod ?? 0) + (platDef?.appealMod ?? 0) + (qualDef?.appealMod ?? 0) + (vehicleClass === 'Sedan' ? 8 : 0);
  let cargo  = 30 + (platDef?.cargoMod ?? 0) + (drvDef?.cargoMod ?? 0) + (vehicleClass === 'Utility Van' ? 35 : 0) + (vehicleClass === 'Compact Car' ? -10 : 0);
  let safety = 50 + (safDef?.safetyMod ?? 0) + (platDef?.safetyMod ?? 0);

  // Vehicle weight
  const classWeights: Record<string, number> = { 'Compact Car': 1050, 'Sedan': 1250, 'Utility Van': 1800 };
  let weight = (classWeights[vehicleClass] ?? 1200) + (platDef?.weightKg ?? 0) + (pwrDef?.weightKg ?? 150) + (drvDef?.weightKg ?? 0) + (intDef?.weightKg ?? 0) + (safDef?.weightKg ?? 0);
  const perfPri = priorities['performance'] ?? NEUTRAL_PRI;
  const fuelPri = priorities['fuel_economy'] ?? NEUTRAL_PRI;
  weight = weight * (1 + (perfPri - NEUTRAL_PRI) * 0.0008) * (1 - (fuelPri - NEUTRAL_PRI) * 0.0005);
  weight = Math.round(Math.max(800, weight));

  // Priority bonuses
  const relPri   = priorities['reliability']    ?? NEUTRAL_PRI;
  const comfPri  = priorities['comfort']        ?? NEUTRAL_PRI;
  const practPri = priorities['practicality']   ?? NEUTRAL_PRI;
  const mfgPri   = priorities['mfg_simplicity'] ?? NEUTRAL_PRI;

  // Budget pcts
  const totalAlloc = Object.values(budgetAlloc).reduce((s, v) => s + Number(v), 0);
  const getBudgetPct = (key: string, def: number) => totalAlloc > 0 ? Number(budgetAlloc[key] ?? 0) / totalAlloc : def;
  const testingPct = getBudgetPct('testing', 0.20);
  const testingEffect = (testingPct - 0.20) * 60;
  const protoEffect   = (getBudgetPct('prototype_validation', 0.10) - 0.10) * 50;
  const prodEngEffect = (getBudgetPct('production_eng', 0.15) - 0.15) * 40;

  // Engineer bonuses
  const engineerDiscount = Math.min(engineerCount * 0.05, 0.20);
  const engSkill = Math.min(Math.floor(engineerCount / 2), 5) * 0.015;

  // Complexity
  const engComplexity   = clamp01(50 + (platDef?.complexityMod ?? 0) + (pwrDef?.complexityMod ?? 0) + (safDef?.complexityMod ?? 0) + (intDef?.complexityMod ?? 0), 20, 100);
  const mfgComplexity   = clamp01(40 + (qualDef?.mfgComplexityMod ?? 0) + (drvDef?.complexityMod ?? 0) * 0.6 + (intDef?.complexityMod ?? 0) * 0.4, 15, 100);
  const assemblyComplexity = clamp01(35 + (drvDef?.assemblyComplexityMod ?? 0) + (intDef?.assemblyComplexityMod ?? 0) + (safDef?.complexityMod ?? 0) * 0.5, 10, 100);

  // Mfg friendliness
  const mfgFriendliness = clamp01(60 + (mfgPri - NEUTRAL_PRI) * 0.5 + prodEngEffect - (assemblyComplexity - 35) * 0.3 - (mfgComplexity - 40) * 0.2, 10, 100);

  // Engineering risk
  const engRisk = clamp01(engComplexity * 0.3 + assemblyComplexity * 0.1 + (perfPri - NEUTRAL_PRI) * 0.3 - (relPri - NEUTRAL_PRI) * 0.35 - testingEffect * 0.5 - engineerCount * 2.5, 5, 95);

  // Prototype confidence
  const protoConfidence = clamp01(100 - engRisk * 0.7 + protoEffect * 0.8 + testingEffect * 0.4 + engSkill * 30, 30, 98);

  const confMult = 0.95 + (protoConfidence / 100) * 0.10;
  const engMult  = 1.0 + engSkill;
  const combined = confMult * engMult;

  // Final scores with priority boosts
  const finalRel    = clamp01(Math.round((rel + (relPri - NEUTRAL_PRI) * 0.4 + testingEffect * 0.6) * combined), 10, 100);
  const finalPerf   = clamp01(Math.round((perf + (perfPri - NEUTRAL_PRI) * 0.45) * combined), 10, 100);
  const finalFuel   = clamp01(Math.round((fuel + (fuelPri - NEUTRAL_PRI) * 0.4 - (perfPri - NEUTRAL_PRI) * 0.25 - Math.max(0, weight - 1200) * 0.04) * combined), 10, 100);
  const finalAppeal = clamp01(Math.round((appeal + (comfPri - NEUTRAL_PRI) * 0.35) * combined), 10, 100);
  const finalCargo  = clamp01(Math.round((cargo + (practPri - NEUTRAL_PRI) * 0.4) * combined), 5, 100);
  const finalSafety = clamp01(Math.round(safety * combined), 10, 100);

  // Production cost mult
  const prodCostMult = clamp01(1.0 + (mfgComplexity - 40) * 0.003 - (mfgPri - NEUTRAL_PRI) * 0.008 - prodEngEffect * 0.005, 0.85, 1.30);
  const mfgCostPerUnit = Math.round(rawCost * prodCostMult);

  // Dev cost
  let priorityCostMult = 1.0;
  for (const [pid, pts] of Object.entries(priorities)) {
    const delta = (Number(pts) - NEUTRAL_PRI) / 10;
    const perPriCostMap: Record<string, number> = { reliability: 0.02, performance: 0.025, fuel_economy: 0.01, comfort: 0.015, practicality: 0.01, mfg_simplicity: 0.005 };
    priorityCostMult += delta * (perPriCostMap[pid] ?? 0);
  }
  const devCost = Math.round(totalBudget * priorityCostMult * (1 - engineerDiscount));

  // Dev time
  const testingArcs = (testingPct >= 0.15 || engComplexity > 65) ? 1 : 0;
  const devTimeArcs = 1 + 1 + testingArcs;

  // Balance flags
  const flags: string[] = [];
  if (qualityTarget === 'budget' && interiorTier === 'premium') flags.push('Target Market Conflict: Budget quality + premium interior');
  if (qualityTarget === 'budget' && powerUnit === 'v6') flags.push('Reliability Risk: High-performance engine in budget vehicle');
  if (qualityTarget === 'premium' && platform === 'economy' && safetyTier === 'standard') flags.push('Underengineered for Segment: Premium quality + economy platform');
  if ((priorities['performance'] ?? 0) >= 35 && (priorities['reliability'] ?? 0) <= 10) flags.push('Engineering Imbalance: High performance + very low reliability');
  if ((priorities['fuel_economy'] ?? 0) >= 30 && powerUnit === 'v6') flags.push('Spec Conflict: Fuel economy priority + V6 engine');

  return {
    cost: mfgCostPerUnit, devCost, devTimeArcs,
    rel: finalRel, perf: finalPerf, fuel: finalFuel, appeal: finalAppeal, cargo: finalCargo, safety: finalSafety,
    engineeringComplexity: Math.round(engComplexity), manufacturingComplexity: Math.round(mfgComplexity),
    assemblyComplexity: Math.round(assemblyComplexity), vehicleWeightKg: weight,
    mfgFriendliness: Math.round(mfgFriendliness), engineeringRisk: Math.round(engRisk),
    protoConfidence: Math.round(protoConfidence), balanceFlags: flags,
  };
}

// Backward-compat alias (used in a few places for simple cost display)
function calcLiveScores(design: any, bootstrapData: any) {
  const pris: Record<string, number> = { reliability: 20, performance: 15, fuel_economy: 20, comfort: 15, practicality: 15, mfg_simplicity: 15 };
  const budget: Record<string, number> = {};
  const totalBudget = 150000;
  return calcLiveEngineering({ ...design, priorities: pris, budgetAlloc: budget, totalBudget, engineerCount: 0 }, bootstrapData);
}

// ─── Reusable Atoms ─────────────────────────────────────────────────────────

function SectionHeader({ children, stamp }: { children: React.ReactNode; stamp?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: T.gold, margin: 0, letterSpacing: '0.05em' }}>{children}</h2>
      {stamp && <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '2px' }}>{stamp}</div>}
    </div>
  );
}

function PanelBox({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, padding: '16px', borderRadius: '2px', ...style }}>{children}</div>;
}

function FieldRow({ label, value, valueColor = T.ivory }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dotted ${T.border}`, fontSize: '12px' }}>
      <span style={{ color: T.muted }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: 500, fontFamily: (typeof value === 'number') ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  );
}

function GoldButton({ children, onClick, disabled = false, style = {} }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? 'transparent' : 'rgba(212,175,55,0.12)', color: disabled ? T.faint : T.gold,
      border: `1px solid ${disabled ? T.border : T.gold}`, padding: '9px 18px', fontSize: '11px',
      fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em',
      cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s', ...style
    }}>{children}</button>
  );
}

function GhostButton({ children, onClick, color = T.gold, disabled = false, style = {} }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: 'transparent', color: disabled ? T.faint : color, border: `1px solid ${disabled ? T.border : color}`,
      padding: '6px 14px', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase',
      letterSpacing: '0.1em', cursor: disabled ? 'not-allowed' : 'pointer', ...style
    }}>{children}</button>
  );
}

function ScoreBadge({ label, value, color = T.ivory }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0' }}>
      <span style={{ color: T.muted }}>{label}</span>
      <span style={{ color, fontFamily: 'monospace', fontWeight: 600 }}>{value}/100</span>
    </div>
  );
}

function FormSelect({ label, value, onChange, options, disabled = false }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string; locked?: boolean }[], disabled?: boolean }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '10px', color: T.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: disabled ? '#111' : '#0e0e0e', border: `1px solid ${T.border}`, color: disabled ? T.faint : T.ivory, fontSize: '13px', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'default' }}>
        {options.map(o => (
          <option key={o.id} value={o.id} disabled={o.locked}>{o.label} {o.locked ? '(Locked)' : ''}</option>
        ))}
      </select>
    </div>
  );
}

function EmptyState({ icon = '⚙', title, subtitle, action }: { icon?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', border: `1px dashed ${T.border}`, borderRadius: '2px' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '8px' }}>{title}</div>
      {subtitle && <div style={{ fontSize: '12px', color: T.muted, marginBottom: '20px', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.6 }}>{subtitle}</div>}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
}


// ─── Tab type ───────────────────────────────────────────────────────────────


type MfgTab = 'overview' | 'factory' | 'design' | 'procurement' | 'production' | 'market' | 'staff' | 'finance' | 'records' | 'equity';

const MFG_TABS: { id: MfgTab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'factory', label: 'Factory', icon: Factory },
  { id: 'design', label: 'R&D / Design', icon: FlaskConical },
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
  { id: 'production', label: 'Production', icon: Activity },
  { id: 'market', label: 'Market & Sales', icon: BarChart3 },
  { id: 'staff', label: 'Staffing', icon: Users },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'records', label: 'Records', icon: ScrollText },
  { id: 'equity', label: 'Equity', icon: PieChart },
];

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function ManufacturingDeskTab({ company, mfgData, playerCash, characterName, onRefresh, isAdmin }: any) {
  const [deskTab, setDeskTab] = useState<MfgTab>('overview');
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);
  const [bootstrapData, setBootstrapData] = useState<any>(null);

  // Design form state
  const [modelName, setModelName] = useState('');
  const [dClass, setDClass] = useState('Compact Car');
  const [dPlatform, setDPlatform] = useState('economy');
  const [dEngine, setDEngine] = useState('small-i4');
  const [dDrivetrain, setDDrivetrain] = useState('fwd');
  const [dInterior, setDInterior] = useState('basic');
  const [dSafety, setDSafety] = useState('standard');
  const [dQuality, setDQuality] = useState('standard');
  const [dSegment, setDSegment] = useState('budget');
  const [dSalePrice, setDSalePrice] = useState(10000);
  const [dEngineeringPackage, setDEngineeringPackage] = useState<string>('');
  const [designTab, setDesignTab] = useState<'portfolio' | 'research' | 'knowledge'>('portfolio');
  const [designSaving, setDesignSaving] = useState(false);

  // Phase 3: Engineering Priorities (sum to 100)
  const defaultPriorities: Record<string, number> = { reliability: 20, performance: 15, fuel_economy: 20, comfort: 15, practicality: 15, mfg_simplicity: 15 };
  const [dPriorities, setDPriorities] = useState<Record<string, number>>(defaultPriorities);

  // Phase 3: Budget Allocation per bucket (amounts)
  const [dBudgetAlloc, setDBudgetAlloc] = useState<Record<string, number>>({});

  // Phase 3: Wizard step (1=architecture, 2=engineering direction)
  const [designWizardStep, setDesignWizardStep] = useState<1 | 2>(1);

  // Computed priority sum
  const prioritySum = Object.values(dPriorities).reduce((s, v) => s + v, 0);

  // Initialize budget alloc whenever base dev cost changes
  const initBudgetAlloc = (baseCost: number) => {
    const alloc: Record<string, number> = {};
    for (const b of BUDGET_BUCKETS_FE) { alloc[b.id] = Math.round(baseCost * b.defaultPct); }
    return alloc;
  };

  // R&D portfolio state
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [launchingModelId, setLaunchingModelId] = useState<string | null>(null);
  const [faceliftSourceModelId, setFaceliftSourceModelId] = useState<string | null>(null);
  const [showDiscontinueConfirm, setShowDiscontinueConfirm] = useState(false);
  const [discontinuingModelId, setDiscontinuingModelId] = useState<string | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareModel1, setCompareModel1] = useState<string>('');
  const [compareModel2, setCompareModel2] = useState<string>('');

  // Production line state
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [planModelId, setPlanModelId] = useState('');
  const [planTarget, setPlanTarget] = useState(0);
  const [planQuality, setPlanQuality] = useState('Standard');

  // Inventory price editing
  const [priceEdits, setPriceEdits] = useState<Record<string, number>>({});
  const [savingPrice, setSavingPrice] = useState<string | null>(null);

  // Market & Sales specific state
  const [marketData, setMarketData] = useState<any>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [allocationForm, setAllocationForm] = useState<Record<string, { units: number, tier: string }>>({});

  // Finance & Records state
  const [ledgerFilter, setLedgerFilter] = useState<string>('All');
  const [selectedArcReportId, setSelectedArcReportId] = useState<string | null>(null);

  // Factory Expansion state
  const [showExpandConfirm, setShowExpandConfirm] = useState(false);
  const [expandingFactoryId, setExpandingFactoryId] = useState<string | null>(null);

  const showNotif = (msg: string, success: boolean) => {
    setNotification({ msg, success });
    setTimeout(() => setNotification(null), 6000);
  };

  // ─── Data-driven config from API ─────────────────────────────────────────
  const currencySymbol: string = mfgData?.currencySymbol ?? '?';
  const autoConfig = mfgData?.countryAutoConfig ?? {};
  const statesForCountry: { id: string; name: string }[] = mfgData?.statesForCountry ?? [];

  // Currency formatter — uses company's currency symbol, not a hardcoded ₯
  const fm = (val: number) => `${currencySymbol}${Math.round(val).toLocaleString()}`;

  // State resolver — uses statesForCountry from the API, not a hardcoded lookup
  const resolveState = (id?: string) => {
    if (!id) return 'Unknown State';
    const found = statesForCountry.find((s) => s.id === id);
    return found?.name ?? id;
  };

  // Expansion config from country auto config (with safe Drennia fallbacks)
  const EXPANSION_COST = Number(autoConfig?.expansion_cost ?? 500000);
  const EXPANSION_DURATION = Number(autoConfig?.expansion_duration_arcs ?? 2);
  const EXP_CAPACITY = Number(autoConfig?.expanded_capacity_per_arc ?? 200);
  const EXP_MAX_LINES = Number(autoConfig?.expanded_max_lines ?? 2);
  const EXP_WORKERS = Number(autoConfig?.expanded_worker_capacity ?? 80);
  const EXP_LEASE = Number(autoConfig?.expanded_lease_cost_per_arc ?? 45000);
  const EXP_MAINT = Number(autoConfig?.expanded_maintenance_per_arc ?? 15000);

  // Development costs from country auto config
  const BASE_DEV_COST = Number(autoConfig?.base_vehicle_dev_cost ?? 150000);
  const FACELIFT_COST = Math.round(BASE_DEV_COST * Number(autoConfig?.facelift_cost_fraction ?? 0.6));

  // Marketing costs from country auto config
  const MKT_COSTS: Record<string, number> = {
    local: Number(autoConfig?.marketing_cost_local ?? 3500),
    regional: Number(autoConfig?.marketing_cost_regional ?? 12000),
    national: Number(autoConfig?.marketing_cost_national ?? 35000),
  };

  // Storage cost from country auto config
  const STORAGE_COST_PER_UNIT = Number(autoConfig?.storage_cost_per_unit_per_arc ?? 150);

  const loadBootstrap = useCallback(async () => {
    if (bootstrapData) return;
    try {
      const res = await manufacturingApi.getBootstrap();
      setBootstrapData(res.data);
    } catch { }
  }, [bootstrapData]);

  const loadMarketData = useCallback(async () => {
    if (!company?.id) return;
    setMarketLoading(true);
    try {
      const res = await manufacturingApi.getMarkets(company.id);
      setMarketData(res.data);

      // Initialize form state
      const newForm: Record<string, { units: number, tier: string }> = {};
      res.data.allocations?.forEach((a: any) => {
        newForm[`${a.vehicle_model_id}-${a.region_market_id}`] = {
          units: a.units_allocated,
          tier: a.marketing_tier
        };
      });
      setAllocationForm(prev => ({ ...newForm, ...prev }));
    } catch (err) {
      console.error(err);
    } finally {
      setMarketLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    if (deskTab === 'design' || deskTab === 'production' || deskTab === 'factory') {
      loadBootstrap();
    }
    if (deskTab === 'market') {
      loadMarketData();
    }
  }, [deskTab, loadBootstrap, loadMarketData]);

  // Phase 3: liveScore is computed after mfgData is available (see below, after engineerCount)
  // Placeholder so hooks order stays stable:
  useEffect(() => { /* liveScore sale price sync — moved below */ }, [dClass, dPlatform, dEngine, dDrivetrain, dInterior, dSafety, dQuality]);
  // Init budget alloc when base dev cost is known and modal opens
  useEffect(() => {
    if (Object.keys(dBudgetAlloc).length === 0 && BASE_DEV_COST > 0) {
      setDBudgetAlloc(initBudgetAlloc(BASE_DEV_COST));
    }
  }, [BASE_DEV_COST]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLeaseFactory = async (factoryTypeId: string) => {
    try {
      await manufacturingApi.leaseFactory(company.id, factoryTypeId);
      showNotif('Factory leased. Production lines created.', true);
      onRefresh();
      setDeskTab('factory');
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to lease factory.', false);
    }
  };

  const handleSaveDesign = async () => {
    if (faceliftSourceModelId) {
      return handleCreateFacelift();
    }

    if (!modelName.trim()) {
      showNotif('Vehicle model name is required.', false);
      return;
    }

    if (Math.abs(prioritySum - 100) > 2) {
      showNotif(`Engineering priorities must sum to 100 (currently ${prioritySum}). Adjust before proceeding.`, false);
      return;
    }

    setDesignSaving(true);
    try {
      await manufacturingApi.createModel(company.id, {
        name: modelName.trim(), vehicleClass: dClass, platform: dPlatform,
        powerUnit: dEngine, drivetrain: dDrivetrain, interiorTier: dInterior,
        safetyTier: dSafety, qualityTarget: dQuality,
        salePrice: dSalePrice, targetSegment: dSegment,
        appliedEngineeringPackage: dEngineeringPackage || undefined,
        // Phase 3
        engineeringPriorities: dPriorities,
        budgetAllocation: dBudgetAlloc,
      });
      showNotif(`Development started for "${modelName}". Est. ${liveScore.devTimeArcs} Arcs to complete.`, true);
      setModelName(''); setDClass('Compact Car'); setDPlatform('economy'); setDEngine('small-i4');
      setDDrivetrain('fwd'); setDInterior('basic'); setDSafety('standard'); setDQuality('standard');
      setDSegment('budget'); setDEngineeringPackage('');
      setDPriorities(defaultPriorities);
      setDBudgetAlloc(initBudgetAlloc(BASE_DEV_COST));
      setDesignWizardStep(1);
      setShowDesignModal(false);
      setFaceliftSourceModelId(null);
      onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Design failed.';
      showNotif(msg, false);
    } finally { setDesignSaving(false); }
  };

  const handleCreateFacelift = async () => {
    if (!faceliftSourceModelId) return;
    setDesignSaving(true);
    try {
      await manufacturingApi.createFacelift(company.id, faceliftSourceModelId, {
        name: modelName.trim(), qualityTarget: dQuality, salePrice: dSalePrice, targetSegment: dSegment, appliedEngineeringPackage: dEngineeringPackage || undefined
      });
      showNotif(`Facelift development started for "${modelName}".`, true);
      setModelName(''); setDClass('Compact Car'); setDPlatform('economy'); setDEngine('small-i4');
      setDDrivetrain('fwd'); setDInterior('basic'); setDSafety('standard'); setDQuality('standard');
      setDSegment('budget'); setDEngineeringPackage('');
      setShowDesignModal(false);
      setFaceliftSourceModelId(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Facelift failed.', false);
    } finally { setDesignSaving(false); }
  };

  const handleDiscontinueModel = async () => {
    if (!discontinuingModelId) return;
    try {
      await manufacturingApi.discontinueModel(company.id, discontinuingModelId);
      showNotif('Vehicle model discontinued.', true);
      setShowDiscontinueConfirm(false);
      setDiscontinuingModelId(null);
      setSelectedModelId(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to discontinue.', false);
    }
  };

  const handleLaunchModel = async (modelId: string) => {
    setLaunchingModelId(modelId);
    try {
      await manufacturingApi.launchModel(company.id, modelId);
      showNotif('Vehicle model launched. It is now available for production.', true);
      setSelectedModelId(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Launch failed.', false);
    } finally { setLaunchingModelId(null); }
  };

  const handleSaveProductionPlan = async (lineId: string) => {
    try {
      await manufacturingApi.saveProductionPlan(company.id, {
        lineId, modelId: planModelId || null, qualitySetting: planQuality, targetUnitsPerArc: planTarget,
      });
      showNotif('Production plan saved.', true);
      setEditingLineId(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to save plan.', false);
    }
  };

  const handlePauseProductionLine = async (lineId: string) => {
    try {
      await manufacturingApi.pauseProductionLine(company.id, lineId);
      showNotif('Production line paused.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to pause line.', false);
    }
  };

  const handleResumeProductionLine = async (lineId: string) => {
    try {
      await manufacturingApi.resumeProductionLine(company.id, lineId);
      showNotif('Production line resumed.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to resume line.', false);
    }
  };

  const handleHireFire = async (role: string, action: 'hire' | 'fire') => {
    try {
      if (action === 'hire') await manufacturingApi.hireStaff(company.id, role);
      else await manufacturingApi.fireStaff(company.id, role);
      showNotif(action === 'hire' ? 'Staff hired.' : 'Staff removed.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Action failed.', false);
    }
  };

  const handleSavePrice = async (modelId: string) => {
    const newPrice = priceEdits[modelId];
    if (!newPrice || newPrice <= 0) { showNotif('Enter a valid price.', false); return; }
    setSavingPrice(modelId);
    try {
      await manufacturingApi.updateModelPrice(company.id, modelId, newPrice);
      showNotif('Sale price updated.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to save price.', false);
    } finally { setSavingPrice(null); }
  };

  const handleSaveAllocation = async (modelId: string, marketId: string) => {
    const formKey = `${modelId}-${marketId}`;
    const data = allocationForm[formKey];
    if (!data) return;

    try {
      await manufacturingApi.setAllocation(company.id, {
        vehicleModelId: modelId,
        regionMarketId: marketId,
        unitsAllocated: data.units,
        marketingTier: data.tier
      });
      showNotif('Allocation updated.', true);
      loadMarketData();
      onRefresh(); // Refresh inventory
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to allocate.', false);
    }
  };

  const handleStartResearch = async (programmeId: string) => {
    try {
      await manufacturingApi.startEngineeringProgramme(company.id, programmeId);
      showNotif('Engineering programme started.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to start programme.', false);
    }
  };

  const [procuringComponent, setProcuringComponent] = useState<{ id: string, name: string, units: number, cost: number } | null>(null);

  const handleProcureComponent = async (componentId: string, units: number) => {
    try {
      await manufacturingApi.procureComponents(company.id, { component_id: componentId, units });
      showNotif('Components procured.', true);
      setProcuringComponent(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to procure components.', false);
    }
  };

  const handleStartExpansion = async (factoryId: string) => {
    try {
      await manufacturingApi.startFactoryExpansion(company.id, factoryId);
      showNotif(`Workshop expansion started. ${fm(EXPANSION_COST)} deducted. Construction completes in ${EXPANSION_DURATION} Arc${EXPANSION_DURATION > 1 ? 's' : ''}.`, true);
      setShowExpandConfirm(false);
      setExpandingFactoryId(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to start expansion.', false);
      setShowExpandConfirm(false);
    }
  };

  const handleProcessAdmin = async () => {
    try {
      const res = await manufacturingApi.processArcAdmin(company.id);
      showNotif(`Arc processed: Net ${fm(res.data.netProfit)}`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to process arc.', false);
    }
  };

  if (!mfgData) {
    return <div style={{ color: T.muted, fontSize: '12px', padding: '24px' }}>Loading manufacturing data...</div>;
  }

  const { factories = [], productionLines = [], models = [], inventory = [], latestReport, allReports = [], brandResults = [], staff = [], ledger = [], records = [], finances, homeMarket, staffRoles = [], research = [], modelSnapshots = [] } = mfgData;

  const totalStaff = staff.reduce((acc: number, s: any) => acc + s.quantity, 0);
  const totalWagesPerArc = staffRoles.reduce((acc: number, r: any) => {
    const employed = staff.find((s: any) => s.role === r.id)?.quantity || 0;
    return acc + employed * r.wagePerArc;
  }, 0);

  // Role Counts
  const totalWorkers = staff.find((s: any) => s.role === 'factory-worker')?.quantity || 0;
  const supervisorCount = staff.find((s: any) => s.role === 'production-supervisor')?.quantity || 0;
  const inspectorCount = staff.find((s: any) => s.role === 'quality-inspector')?.quantity || 0;
  const salesManagerCount = staff.find((s: any) => s.role === 'sales-manager')?.quantity || 0;
  const engineerCount = staff.find((s: any) => s.role === 'automotive-engineer')?.quantity || 0;

  // Phase 3: Live engineering assessment — computed here where engineerCount is available
  const liveScore = calcLiveEngineering({
    vehicleClass: dClass, platform: dPlatform, powerUnit: dEngine, drivetrain: dDrivetrain,
    interiorTier: dInterior, safetyTier: dSafety, qualityTarget: dQuality,
    priorities: dPriorities, budgetAlloc: dBudgetAlloc, totalBudget: BASE_DEV_COST,
    engineerCount,
  }, bootstrapData);

  // Compute required workers & active lines
  let plannedUnits = 0;
  let recWorkers = 0;
  productionLines.forEach((l: any) => {
    const factory = factories.find((f: any) => String(f.id) === String(l.factory_id));
    if (factory && Number(l.target_units_per_arc) > 0) {
      plannedUnits += Number(l.target_units_per_arc);
      // Use factory.worker_capacity (updated at expansion) falling back to factory.worker_requirement from type join
      const workerCap = Number(factory.worker_capacity || factory.worker_requirement || 40);
      const req = Math.ceil((Number(l.target_units_per_arc) / Number(factory.capacity_per_arc)) * workerCap);
      recWorkers = Math.max(recWorkers, req);
    }
  });
  const activeLinesCount = productionLines.filter((l: any) => l.target_units_per_arc > 0).length;

  // Market allocations
  const activeMarketCount = marketData?.allocations?.filter((a: any) => Number(a.units_allocated) > 0).length || 0;

  const activeLines = productionLines.filter((l: any) => l.status === 'active');
  const hasFactory = factories.length > 0;
  const hasModel = models.length > 0;
  const hasActivePlan = activeLines.length > 0;
  const inventoryValue = inventory.reduce((acc: number, inv: any) => acc + Number(inv.inventory_value || 0), 0);
  const leaseCostPerArc = factories.reduce((acc: number, f: any) => acc + Number(f.lease_cost_per_arc || 0), 0);
  const maintCostPerArc = factories.reduce((acc: number, f: any) => acc + Number(f.maintenance_cost_per_arc || 0), 0);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', width: '100%', minHeight: 'calc(100vh - 120px)', marginLeft: '-24px', marginRight: '-24px', paddingRight: '24px' }}>
      
      {/* LEFT SIDEBAR (MAIN TABS) */}
      <div style={{ width: '220px', flexShrink: 0, borderRight: `1px solid ${T.border}`, paddingRight: '12px', background: '#0a0a0a' }}>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'sticky', top: '16px', paddingTop: '16px' }}>
           {MFG_TABS.map(t => (
             <div 
               key={t.id}
               onClick={() => setDeskTab(t.id as MfgTab)}
               style={{
                 padding: '12px 16px',
                 fontSize: '11px',
                 fontWeight: 600,
                 textTransform: 'uppercase',
                 letterSpacing: '0.1em',
                 color: deskTab === t.id ? T.gold : T.muted,
                 background: deskTab === t.id ? 'rgba(201,162,74,0.1)' : 'transparent',
                 borderLeft: deskTab === t.id ? `3px solid ${T.gold}` : '3px solid transparent',
                 cursor: 'pointer',
                 transition: 'all 0.2s ease',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '12px',
                 borderRadius: '0 4px 4px 0'
               }}
             >
               {t.icon && <span style={{ opacity: deskTab === t.id ? 1 : 0.6 }}>{t.icon}</span>}
               <span>{t.label}</span>
             </div>
           ))}
         </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: '24px', paddingBottom: '64px', paddingTop: '16px' }}>

        {/* Notification */}
        {notification && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: notification.success ? 'rgba(54,211,153,0.08)' : 'rgba(184,85,85,0.08)', border: `1px solid ${notification.success ? T.mint : T.red}`, color: notification.success ? T.mint : T.red, fontSize: '12px', lineHeight: 1.6 }}>
            {notification.msg}
          </div>
        )}

      {/* ═══════════════════════════════════════════════════════
          OVERVIEW TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slide-in p-2">
          {/* Top Stats */}
          <StatCard
            label="Company Value"
            value={fm((finances?.available_cash || 0) + inventoryValue)}
            valueColor="white"
            trend="up"
            countUp
            sparkline={[{value:1},{value:2},{value:4},{value:8},{value:15}]}
          />
          <StatCard
            label="Available Cash"
            value={fm(finances?.available_cash || 0)}
            valueColor="green"
            trend={(finances?.last_arc_profit || 0) >= 0 ? 'up' : 'down'}
            countUp
            sparkline={[{value:20},{value:18},{value:22},{value:15},{value:25}]}
          />
          <StatCard
            label="Net Worth"
            value={fm(1500000)} // Mock for now
            valueColor="amber"
            trend="up"
            countUp
            sparkline={[{value:40},{value:42},{value:45},{value:48},{value:55}]}
          />
          <StatCard
            label="Reputation"
            value={company?.reputation || 0}
            suffix="/100"
            valueColor="blue"
            trend="flat"
            countUp
          />

          {/* Charts Row */}
          <Card className="lg:col-span-3 p-6 flex flex-col min-h-[300px]">
            <SectionHeading>Financial Trajectory</SectionHeading>
            <div className="flex-1 flex gap-4 mt-4">
              <div className="flex-1 h-[250px]">
                <h4 className="text-[10px] uppercase text-zinc-500 mb-2 font-mono">Revenue vs Expenses (Last 12 Arcs)</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...allReports].sort((a,b) => a.arc_number - b.arc_number).slice(-12).map(r => ({
                    arc: `Arc ${r.arc_number}`,
                    revenue: Number(r.gross_revenue),
                    expenses: Number(r.production_costs) + Number(r.staff_wages) + Number(r.factory_lease_costs) + Number(r.factory_maintenance_costs) + Number(r.inventory_storage_costs)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#23232b" vertical={false} />
                    <XAxis dataKey="arc" stroke="#888888" fontSize={10} tickMargin={10} />
                    <YAxis stroke="#888888" fontSize={10} tickFormatter={(val) => fm(val)} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0c0d13', borderColor: '#23232b', fontSize: '12px', fontFamily: 'monospace' }}
                      itemStyle={{ color: '#fffff0' }}
                    />
                    <Bar dataKey="revenue" fill="#30d158" radius={[2,2,0,0]} name="Revenue" />
                    <Bar dataKey="expenses" fill="#ff453a" radius={[2,2,0,0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-1 p-6 flex flex-col min-h-[300px]">
            <SectionHeading>Company Health</SectionHeading>
            <div className="flex-1 -mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius="70%" data={[
                  { subject: 'Reputation', A: company?.reputation || 50, fullMark: 100 },
                  { subject: 'Reliability', A: company?.reliability || 50, fullMark: 100 },
                  { subject: 'Liquidity', A: Math.min((finances?.available_cash || 0) / 5000, 100), fullMark: 100 },
                  { subject: 'Growth', A: 75, fullMark: 100 },
                  { subject: 'Efficiency', A: activeLinesCount > 0 ? 80 : 20, fullMark: 100 },
                ]}>
                  <PolarGrid stroke="#23232b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#888888', fontSize: 10 }} />
                  <Radar name="Company" dataKey="A" stroke="#0a84ff" fill="#0a84ff" fillOpacity={0.2} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0c0d13', borderColor: '#23232b', fontSize: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Next Steps Checklist */}
          <Card className="lg:col-span-2 p-0 overflow-hidden border-zinc-800">
            <div className="p-6 pb-2">
              <SectionHeading>Executive Guide</SectionHeading>
            </div>
            
            <div className="flex flex-col">
              <DataRow
                label={<span className={!hasFactory ? "text-zinc-100" : "text-zinc-500 line-through"}>1. Lease first factory</span>}
                value={
                  <Button
                    variant={!hasFactory ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setDeskTab('factory')}
                    disabled={hasFactory}
                  >
                    {hasFactory ? '✓ Complete' : 'Go to Facilities'}
                  </Button>
                }
              />
              <DataRow
                label={<span className={hasFactory && !hasModel ? "text-zinc-100" : (!hasFactory ? "text-zinc-600" : "text-zinc-500 line-through")}>2. Design vehicle model</span>}
                value={
                  <Button
                    variant={hasFactory && !hasModel ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setDeskTab('design')}
                    disabled={hasModel || !hasFactory}
                  >
                    {hasModel ? '✓ Complete' : 'Go to R&D'}
                  </Button>
                }
              />
              <DataRow
                label={<span className={hasFactory && hasModel && !hasActivePlan ? "text-zinc-100" : ((hasFactory && hasModel) ? "text-zinc-500 line-through" : "text-zinc-600")}>3. Assign production plan</span>}
                value={
                  <Button
                    variant={hasFactory && hasModel && !hasActivePlan ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setDeskTab('production')}
                    disabled={hasActivePlan || !hasModel}
                  >
                    {hasActivePlan ? '✓ Complete' : 'Go to Production'}
                  </Button>
                }
              />
            </div>
            <div className="p-6 bg-[#0a0a0a]/50 border-t border-[#23232b]">
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono mb-2">
                <span>Setup Progress</span>
                <span>{hasActivePlan ? '100' : hasModel ? '66' : hasFactory ? '33' : '0'}%</span>
              </div>
              <ProgressBar value={hasActivePlan ? 100 : hasModel ? 66 : hasFactory ? 33 : 0} variant={hasActivePlan ? 'green' : 'amber'} />
            </div>
          </Card>

          {/* Last Arc Summary */}
          <Card className="lg:col-span-2 p-0 overflow-hidden border-zinc-800">
            <div className="p-6 pb-2">
              <SectionHeading>Latest Arc Results</SectionHeading>
            </div>
            {latestReport ? (
              <div className="flex flex-col">
                <DataRow label="Units Produced" value={latestReport.units_produced} />
                <DataRow label="Units Sold" value={latestReport.units_sold} />
                <DataRow label="Gross Revenue" value={fm(latestReport.gross_revenue)} valueVariant="green" />
                <DataRow label="Total Costs" value={fm(Number(latestReport.production_costs || 0) + Number(latestReport.staff_wages || 0) + Number(latestReport.factory_lease_costs || 0) + Number(latestReport.factory_maintenance_costs || 0) + Number(latestReport.inventory_storage_costs || 0))} valueVariant="red" />
                <DataRow label="Net Profit" value={fm(latestReport.net_profit)} valueVariant={Number(latestReport.net_profit) < 0 ? 'red' : 'green'} />
              </div>
            ) : (
              <UIEmptyState
                icon={BarChart3}
                heading="No Data Yet"
                message="Close an Arc to generate your first financial report."
              />
            )}
            
            {isAdmin && (
              <div className="p-4 bg-terminal-red/10 border-t border-dashed border-terminal-red/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-terminal-red font-mono uppercase tracking-[0.1em] mb-1">Dev Admin</div>
                  <div className="text-[11px] text-zinc-400">Process Arc manually for this company</div>
                </div>
                <Button variant="secondary" size="sm" onClick={handleProcessAdmin} className="border-terminal-red text-terminal-red">
                  Process Arc
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          FACTORY TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'factory' && (
        <div>
          <SectionHeader stamp="FACILITIES">Factory</SectionHeader>

          {factories.length === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <EmptyState
                icon="🏭"
                title="No factories yet"
                subtitle="Lease a Small Workshop to begin automobile manufacturing. The lease cost is deducted immediately from company cash."
                action={<GoldButton onClick={() => handleLeaseFactory('small-workshop')}>Lease Small Workshop</GoldButton>}
              />
              {/* Factory info card */}
              <PanelBox>
                <div style={{ fontSize: '13px', fontWeight: 700, color: T.gold, marginBottom: '12px' }}>Small Workshop</div>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', lineHeight: 1.6 }}>Entry-level automobile assembly facility. Suitable for compact cars, sedans and utility vans.</div>
                <FieldRow label="Capacity" value={`${bootstrapData?.factoryTypes?.find((ft: any) => ft.id === 'small-workshop')?.base_capacity_per_arc ?? 100} units / Arc`} />
                <FieldRow label="Production Lines" value="1" />
                <FieldRow label="Lease Cost" value={`${fm(bootstrapData?.factoryTypes?.find((ft: any) => ft.id === 'small-workshop')?.base_lease_cost_per_arc ?? 25000)} / Arc`} valueColor={T.red} />
                <FieldRow label="Maintenance" value={`${fm(bootstrapData?.factoryTypes?.find((ft: any) => ft.id === 'small-workshop')?.base_maintenance_per_arc ?? 8000)} / Arc`} valueColor={T.red} />
                <FieldRow label="Recommended Workers" value="30" />
                <FieldRow label="Status" value="Available" valueColor={T.mint} />
                <div style={{ marginTop: '16px' }}>
                  <GoldButton onClick={() => handleLeaseFactory('small-workshop')} disabled={Number(finances?.available_cash || 0) < (bootstrapData?.factoryTypes?.find((ft: any) => ft.id === 'small-workshop')?.base_lease_cost_per_arc ?? 25000)}>
                    Lease Small Workshop
                  </GoldButton>
                  {Number(finances?.available_cash || 0) < (bootstrapData?.factoryTypes?.find((ft: any) => ft.id === 'small-workshop')?.base_lease_cost_per_arc ?? 25000) && (
                    <div style={{ fontSize: '11px', color: T.red, marginTop: '6px' }}>Insufficient cash. Need {fm(bootstrapData?.factoryTypes?.find((ft: any) => ft.id === 'small-workshop')?.base_lease_cost_per_arc ?? 25000)}.</div>
                  )}
                </div>
              </PanelBox>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {factories.map((factory: any) => (
                <PanelBox key={factory.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: T.ivory, marginBottom: '4px' }}>{factory.name}</div>
                      <div style={{ fontSize: '11px', color: T.muted }}>
                        Type: <span style={{ color: T.gold }}>{factory.type_name || 'Small Workshop'}</span>
                        {' · '}Location: <span style={{ color: T.ivory }}>{resolveState(factory.state_id)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: factory.status === 'active' ? T.mint : T.red, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                      ● {factory.status}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                    <FieldRow label="Capacity / Arc" value={`${factory.capacity_per_arc} units`} />
                    <FieldRow label="Lease Cost / Arc" value={fm(factory.lease_cost_per_arc)} valueColor={T.red} />
                    <FieldRow label="Production Lines" value={factory.max_production_lines || 1} />
                    <FieldRow label="Maintenance / Arc" value={fm(factory.maintenance_cost_per_arc)} valueColor={T.red} />
                    <FieldRow label="Machine Level" value={factory.machine_level} valueColor={T.gold} />
                    <FieldRow label="Condition" value={`${factory.condition}%`} valueColor={Number(factory.condition) < 60 ? T.red : T.mint} />
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <GhostButton onClick={() => setDeskTab('production')}>Open Production →</GhostButton>
                  </div>

                  {/* ── FACILITY GROWTH ── */}
                  {factory.factory_type_id === 'small-workshop' && (() => {
                    const expStatus = factory.expansion_status;

                    // STATE: EXPANDED
                    if (expStatus === 'expanded') {
                      return (
                        <div style={{ marginTop: '20px', borderTop: `1px solid ${T.border}`, paddingTop: '16px' }}>
                          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.gold, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Facility Growth</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ background: 'rgba(54,211,153,0.12)', border: `1px solid ${T.mint}`, color: T.mint, fontSize: '11px', fontWeight: 700, padding: '4px 10px', letterSpacing: '0.05em' }}>✓ EXPANSION COMPLETE</div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                            <FieldRow label="Facility" value="Expanded Workshop" valueColor={T.gold} />
                            <FieldRow label="Capacity" value={`${EXP_CAPACITY} units / Arc`} valueColor={T.mint} />
                            <FieldRow label="Production Lines" value={String(EXP_MAX_LINES)} valueColor={T.mint} />
                            <FieldRow label="Worker Capacity" value={String(EXP_WORKERS)} />
                            <FieldRow label="Lease / Arc" value={fm(EXP_LEASE)} valueColor={T.red} />
                            <FieldRow label="Maintenance / Arc" value={fm(EXP_MAINT)} valueColor={T.red} />
                          </div>
                        </div>
                      );
                    }

                    // STATE: CONSTRUCTION UNDERWAY
                    if (expStatus === 'construction_underway') {
                      const startedArc = factory.expansion_started_arc;
                      const startedOrbit = factory.expansion_started_orbit;
                      const compArc = factory.expansion_completion_arc;
                      const compOrbit = factory.expansion_completion_orbit;
                      return (
                        <div style={{ marginTop: '20px', borderTop: `1px solid ${T.border}`, paddingTop: '16px' }}>
                          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Workshop Expansion Underway</div>
                          <div style={{ background: 'rgba(245,158,11,0.06)', border: `1px solid rgba(245,158,11,0.3)`, padding: '12px', marginBottom: '12px' }}>
                            <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, marginBottom: '8px' }}>🔧 Construction in Progress</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                              <FieldRow label="Started" value={`Orbit ${startedOrbit} Arc ${startedArc}`} />
                              <FieldRow label="Completes" value={`Orbit ${compOrbit} Arc ${compArc}`} />
                              <FieldRow label="Investment Paid" value={fm(factory.expansion_cost || 500000)} valueColor={T.red} />
                              <FieldRow label="Current Capacity" value="100 units / Arc" />
                              <FieldRow label="Production Line 1" value="Operational" valueColor={T.mint} />
                              <FieldRow label="Production Line 2" value="Unavailable until complete" valueColor={T.faint} />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // STATE: AVAILABLE
                    const canAfford = Number(finances?.available_cash || 0) >= EXPANSION_COST;
                    if (showExpandConfirm && expandingFactoryId === factory.id) {
                      return (
                        <div style={{ marginTop: '20px', borderTop: `1px solid ${T.border}`, paddingTop: '16px' }}>
                          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.gold, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Workshop Expansion — {EXP_MAX_LINES} Production Lines</div>
                          <div style={{ background: 'rgba(212,175,55,0.06)', border: `1px solid ${T.border}`, padding: '14px', marginBottom: '14px', fontSize: '12px', color: T.ivory, lineHeight: 1.8 }}>
                            <div style={{ fontWeight: 700, color: T.gold, marginBottom: '8px' }}>This investment will:</div>
                            <div>• Add {EXP_MAX_LINES - 1} additional production line{EXP_MAX_LINES - 1 > 1 ? 's' : ''}</div>
                            <div>• Increase total capacity from {factory.capacity_per_arc ?? 100} to <strong style={{ color: T.mint }}>{EXP_CAPACITY} units / Arc</strong></div>
                            <div>• Increase Factory Worker capacity to <strong style={{ color: T.mint }}>{EXP_WORKERS}</strong></div>
                            <div>• Increase recurring lease to <strong style={{ color: T.red }}>{fm(EXP_LEASE)} / Arc</strong> and maintenance to <strong style={{ color: T.red }}>{fm(EXP_MAINT)} / Arc</strong></div>
                            <div style={{ marginTop: '8px', color: T.muted }}>Construction will take {EXPANSION_DURATION} Arc{EXPANSION_DURATION > 1 ? 's' : ''}. Production Line 1 remains operational during construction.</div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <GoldButton onClick={() => handleStartExpansion(factory.id)} style={{ fontSize: '12px' }}>
                              Confirm {fm(EXPANSION_COST)} Expansion
                            </GoldButton>
                            <GhostButton onClick={() => { setShowExpandConfirm(false); setExpandingFactoryId(null); }}>
                              Cancel
                            </GhostButton>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{ marginTop: '20px', borderTop: `1px solid ${T.border}`, paddingTop: '16px' }}>
                        <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.gold, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Facility Growth</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, padding: '12px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: T.ivory, marginBottom: '8px' }}>Current Facility</div>
                            <div style={{ fontSize: '10px', color: T.muted, marginBottom: '6px' }}>Small Workshop</div>
                            <FieldRow label="Capacity" value={`${factory.capacity_per_arc ?? 100} units / Arc`} />
                            <FieldRow label="Production Lines" value="1" />
                            <FieldRow label="Max Workers" value={String(factory.worker_capacity ?? 40)} />
                            <FieldRow label="Lease / Arc" value={fm(factory.lease_cost_per_arc)} valueColor={T.red} />
                            <FieldRow label="Maintenance / Arc" value={fm(factory.maintenance_cost_per_arc)} valueColor={T.red} />
                          </div>
                          <div style={{ background: 'rgba(212,175,55,0.04)', border: `1px solid rgba(212,175,55,0.3)`, padding: '12px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: T.gold, marginBottom: '8px' }}>Expanded Workshop</div>
                            <div style={{ fontSize: '10px', color: T.muted, marginBottom: '6px' }}>After expansion completes</div>
                            <FieldRow label="Capacity" value={`${EXP_CAPACITY} units / Arc`} valueColor={T.mint} />
                            <FieldRow label="Production Lines" value={String(EXP_MAX_LINES)} valueColor={T.mint} />
                            <FieldRow label="Max Workers" value={String(EXP_WORKERS)} valueColor={T.mint} />
                            <FieldRow label="Lease / Arc" value={fm(EXP_LEASE)} valueColor={T.red} />
                            <FieldRow label="Maintenance / Arc" value={fm(EXP_MAINT)} valueColor={T.red} />
                            <FieldRow label="Construction Time" value={`${EXPANSION_DURATION} Arc${EXPANSION_DURATION > 1 ? 's' : ''}`} />
                            <FieldRow label="Upfront Investment" value={fm(EXPANSION_COST)} valueColor={T.gold} />
                          </div>
                        </div>
                        {canAfford ? (
                          <GoldButton onClick={() => { setShowExpandConfirm(true); setExpandingFactoryId(factory.id); }} style={{ fontSize: '12px' }}>
                            Expand Workshop
                          </GoldButton>
                        ) : (
                          <div>
                            <GoldButton disabled style={{ fontSize: '12px', opacity: 0.5 }}>Expand Workshop</GoldButton>
                            <div style={{ fontSize: '11px', color: T.red, marginTop: '6px' }}>Insufficient company funds. Requires {fm(EXPANSION_COST)}.</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </PanelBox>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          R&D / DESIGN TAB — PORTFOLIO PAGE
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'design' && (() => {
        const selectedModel = selectedModelId ? models.find((m: any) => m.id === selectedModelId) : null;

        // Status badge helper
        const devBadge = (status: string, devStage?: string) => {
          const cfg: Record<string, { label: string; color: string; bg: string }> = {
            in_development: { label: 'Development In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
            ready_to_launch: { label: 'Ready to Launch', color: '#6ea8fe', bg: 'rgba(110,168,254,0.08)' },
            launched: { label: 'Launched', color: T.mint, bg: 'rgba(54,211,153,0.08)' },
            cancelled: { label: 'Cancelled', color: T.red, bg: 'rgba(184,85,85,0.08)' },
          };
          const c = cfg[status] || cfg['in_development'];
          const stageLabels: Record<string, string> = {
            engineering: '⚙ Engineering Phase',
            prototype: '🔨 Prototype Build',
            testing: '🧪 Testing Programme',
            ready_to_launch: '✓ Ready',
          };
          const stageSuffix = status === 'in_development' && devStage && devStage !== 'ready_to_launch'
            ? ` — ${stageLabels[devStage] ?? devStage}` : '';
          return (
            <span style={{
              fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em',
              color: c.color, background: c.bg, border: `1px solid ${c.color}40`, padding: '2px 8px', borderRadius: '2px'
            }}>
              {c.label}{stageSuffix}
            </span>
          );
        };

        // Detail scores — use stored values directly from DB
        const detailScores = selectedModel ? {
          rel:    selectedModel.reliability_score,
          perf:   selectedModel.performance_score,
          fuel:   selectedModel.fuel_efficiency_score,
          appeal: selectedModel.appeal_score,
          cargo:  selectedModel.cargo_score,
          safety: selectedModel.safety_score,
          cost:   selectedModel.manufacturing_cost_per_unit,
        } : null;

        // Parse engineering assessment from selected model
        const engReport = (() => {
          if (!selectedModel?.engineering_assessment) return null;
          try {
            return typeof selectedModel.engineering_assessment === 'string'
              ? JSON.parse(selectedModel.engineering_assessment)
              : selectedModel.engineering_assessment;
          } catch { return null; }
        })();
        
        const validationResult = (() => {
          if (!selectedModel?.prototype_validation_result) return null;
          try {
            return typeof selectedModel.prototype_validation_result === 'string'
              ? JSON.parse(selectedModel.prototype_validation_result)
              : selectedModel.prototype_validation_result;
          } catch { return null; }
        })();

        const engPriorities = (() => {
          if (!selectedModel?.engineering_priorities) return null;
          try {
            return typeof selectedModel.engineering_priorities === 'string'
              ? JSON.parse(selectedModel.engineering_priorities)
              : selectedModel.engineering_priorities;
          } catch { return null; }
        })();

        const balanceRating = selectedModel?.engineering_balance_rating || null;

        return (
          <div style={{ display: 'flex', gap: '32px' }}>
            {/* ── INTERNAL SUB-NAV (LEFT CORNER) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px', borderRight: `1px solid ${T.border}`, paddingRight: '24px', marginLeft: '-24px', paddingTop: '12px' }}>
              {(['portfolio', 'research', 'knowledge'] as const).map((tab) => (
                <div key={tab}
                  style={{ 
                    padding: '10px 16px', 
                    fontSize: '13px', 
                    fontWeight: 600, 
                    color: designTab === tab ? T.gold : T.muted, 
                    background: designTab === tab ? 'rgba(201,162,74,0.1)' : 'transparent',
                    borderLeft: designTab === tab ? `3px solid ${T.gold}` : '3px solid transparent', 
                    borderRadius: '0 4px 4px 0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setDesignTab(tab)}
                >
                  {tab === 'portfolio' ? 'Vehicle Portfolio' : tab === 'research' ? 'Engineering Programmes' : 'Knowledge'}
                </div>
              ))}
            </div>

            {/* ── CONTENT AREA ── */}
            <div style={{ flex: 1, minWidth: 0 }}>

            {designTab === 'portfolio' && (
              <div>
                {/* ── VEHICLE DETAIL PANEL ── */}
                {selectedModel && (
                  <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
                    onClick={() => setSelectedModelId(null)}>
                    <div style={{ width: '520px', height: '100vh', overflowY: 'auto', background: '#0d0d0d', border: `1px solid ${T.border}`, borderRight: 'none', padding: '32px 28px' }}
                      onClick={e => e.stopPropagation()}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                          <div style={{ fontSize: '20px', fontWeight: 700, color: T.gold, marginBottom: '6px' }}>{selectedModel.name}</div>
                          <div style={{ fontSize: '12px', color: T.muted }}>{selectedModel.vehicle_class} · {selectedModel.target_segment}</div>
                        </div>
                        <button onClick={() => setSelectedModelId(null)} style={{ background: 'none', border: 'none', color: T.muted, fontSize: '20px', cursor: 'pointer', padding: '0 0 0 12px', lineHeight: 1 }}>✕</button>
                      </div>

                      {/* Status */}
                      <div style={{ marginBottom: '20px' }}>
                        {devBadge(selectedModel.development_status || 'launched', selectedModel.dev_stage)}
                      </div>

                      {/* Development status info box */}
                      {selectedModel.development_status === 'in_development' && (
                        <div style={{ background: 'rgba(245,158,11,0.06)', border: `1px solid rgba(245,158,11,0.25)`, padding: '14px', marginBottom: '20px', borderRadius: '2px' }}>
                          <div style={{ fontSize: '11px', color: '#f59e0b', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '6px' }}>Development In Progress</div>
                          <div style={{ fontSize: '12px', color: T.muted, lineHeight: 1.7 }}>
                            {selectedModel.dev_stage === 'engineering' && '⚙ Engineering Phase — core design and systems engineering work.'}
                            {selectedModel.dev_stage === 'prototype' && '🔨 Prototype Phase — building and evaluating physical prototypes.'}
                            {selectedModel.dev_stage === 'testing' && '🧪 Testing Programme — road testing and durability validation.'}
                            {!selectedModel.dev_stage && 'Development is underway.'}
                            {' '}Est. ready: Orbit {selectedModel.development_completes_at_orbit || 1} / Arc {selectedModel.development_completes_at_arc || 1}.
                          </div>
                          {selectedModel.planned_dev_time_arcs && (
                            <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                              {['engineering', 'prototype', 'testing'].map((stage, i) => (
                                <div key={stage} style={{
                                  flex: 1, padding: '6px', textAlign: 'center', fontSize: '9px', fontFamily: 'monospace',
                                  textTransform: 'uppercase', letterSpacing: '0.06em',
                                  background: selectedModel.dev_stage === stage ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.02)',
                                  border: `1px solid ${selectedModel.dev_stage === stage ? '#f59e0b' : T.border}`,
                                  color: selectedModel.dev_stage === stage ? '#f59e0b' : T.faint,
                                }}>
                                  {['⚙ Eng.', '🔨 Proto.', '🧪 Test'][i]}
                                </div>
                              ))}
                              <div style={{
                                flex: 1, padding: '6px', textAlign: 'center', fontSize: '9px', fontFamily: 'monospace',
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                                background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, color: T.faint
                              }}>✓ Launch</div>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedModel.development_status === 'ready_to_launch' && (
                        <div style={{ background: 'rgba(110,168,254,0.06)', border: `1px solid rgba(110,168,254,0.25)`, padding: '14px', marginBottom: '20px', borderRadius: '2px' }}>
                          <div style={{ fontSize: '11px', color: T.blue, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '6px' }}>Ready to Launch</div>
                          <div style={{ fontSize: '12px', color: T.muted, lineHeight: 1.7 }}>
                            Development is complete. Review the final specifications, then click <strong style={{ color: T.ivory }}>Launch Model</strong> to make it available for production assignment.
                          </div>
                          <div style={{ marginTop: '14px' }}>
                            <GoldButton
                              onClick={() => handleLaunchModel(selectedModel.id)}
                              disabled={launchingModelId === selectedModel.id}
                            >
                              {launchingModelId === selectedModel.id ? 'Launching...' : 'Launch Model'}
                            </GoldButton>
                          </div>
                        </div>
                      )}

                      {selectedModel.development_status === 'launched' && (
                        <div style={{ background: 'rgba(54,211,153,0.06)', border: `1px solid rgba(54,211,153,0.2)`, padding: '10px 14px', marginBottom: '20px', borderRadius: '2px', fontSize: '12px', color: T.mint }}>
                          ✓ Launched — available for production assignment.
                        </div>
                      )}

                      {/* Design Specs */}
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Design Specifications</div>
                        <PanelBox>
                          <FieldRow label="Vehicle Class" value={selectedModel.vehicle_class} />
                          <FieldRow label="Platform" value={selectedModel.platform_type} />
                          <FieldRow label="Power Unit" value={selectedModel.power_unit_type} />
                          <FieldRow label="Drivetrain" value={selectedModel.drivetrain_type} />
                          <FieldRow label="Interior" value={selectedModel.interior_tier} />
                          <FieldRow label="Safety Standard" value={selectedModel.safety_tier} />
                          <FieldRow label="Production Quality" value={selectedModel.production_quality} />
                          <FieldRow label="Target Segment" value={selectedModel.target_segment} />
                        </PanelBox>
                      </div>

                      {/* Financial */}
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Financial</div>
                        <PanelBox>
                          <FieldRow label="Mfg Cost / Unit" value={fm(selectedModel.manufacturing_cost_per_unit)} valueColor={T.red} />
                          <FieldRow label="Sale Price" value={fm(selectedModel.sale_price)} valueColor={T.gold} />
                          <FieldRow label="Est. Margin / Unit" value={fm(Number(selectedModel.sale_price) - Number(selectedModel.manufacturing_cost_per_unit))} valueColor={Number(selectedModel.sale_price) > Number(selectedModel.manufacturing_cost_per_unit) ? T.mint : T.red} />
                          <FieldRow label="Dev. Started (Arc)" value={`Orbit ${selectedModel.created_at_world_orbit} / Arc ${selectedModel.created_at_world_arc}`} />
                        </PanelBox>
                      </div>

                      {/* Phase 3B — Warranty Risk & Production Impact */}
                      {(() => {
                        const rel = Number(selectedModel.reliability_score ?? 60);
                        const costPerUnit = Number(selectedModel.manufacturing_cost_per_unit ?? 0);
                        const warrantyReservePct = Math.max(0, (75 - rel) / 100 * 0.02);
                        const warrantyPerUnit = Math.round(costPerUnit * warrantyReservePct);
                        const warrantyRisk = rel >= 75 ? 'Low' : rel >= 55 ? 'Moderate' : 'High';
                        const warrantyColor = rel >= 75 ? T.mint : rel >= 55 ? '#f59e0b' : T.red;
                        const mfgFriend = Number(selectedModel.manufacturing_friendliness ?? 50);
                        const asmComplex = Number(selectedModel.assembly_complexity ?? 35);
                        const defectBonus = Math.max(0, (mfgFriend - 50) * 0.0003);
                        const labourMult = 1.0 + (asmComplex - 35) * 0.002;
                        return (
                          <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Production Impact</div>
                            <PanelBox style={{ border: `1px solid ${warrantyColor}33` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px dotted ${T.border}`, fontSize: '12px' }}>
                                <span style={{ color: T.muted }}>Warranty Risk</span>
                                <span style={{ color: warrantyColor, fontFamily: 'monospace', fontWeight: 700 }}>{warrantyRisk}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px dotted ${T.border}`, fontSize: '12px' }}>
                                <span style={{ color: T.muted }}>Est. Warranty Reserve / Unit</span>
                                <span style={{ color: warrantyPerUnit > 0 ? T.red : T.mint, fontFamily: 'monospace' }}>
                                  {warrantyPerUnit > 0 ? `${fm(warrantyPerUnit)} / unit` : 'None'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px dotted ${T.border}`, fontSize: '12px' }}>
                                <span style={{ color: T.muted }}>Defect Rate Bonus</span>
                                <span style={{ color: defectBonus > 0 ? T.mint : T.faint, fontFamily: 'monospace' }}>
                                  {defectBonus > 0 ? `-${(defectBonus * 100).toFixed(2)}%` : 'None'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: '12px' }}>
                                <span style={{ color: T.muted }}>Assembly Labour Cost</span>
                                <span style={{ color: labourMult > 1.05 ? T.red : labourMult < 0.98 ? T.mint : T.ivory, fontFamily: 'monospace' }}>
                                  {labourMult > 1.0 ? `+${((labourMult - 1) * 100).toFixed(1)}%` : labourMult < 1.0 ? `-${((1 - labourMult) * 100).toFixed(1)}%` : 'Baseline'}
                                </span>
                              </div>
                            </PanelBox>
                            {warrantyRisk === 'High' && (
                              <div style={{ marginTop: '6px', padding: '8px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '2px', fontSize: '11px', color: T.red, lineHeight: 1.5 }}>
                                ⚠ High warranty risk. Reliability below 55 incurs a running reserve deducted each Arc. Increase reliability to reduce ongoing costs.
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Performance Scores */}
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Performance Scores</div>
                        <PanelBox style={{ border: `1px solid ${T.gold}33` }}>
                          <ScoreBadge label="Reliability Score" value={selectedModel.reliability_score} color={selectedModel.reliability_score > 70 ? T.mint : selectedModel.reliability_score > 50 ? T.gold : T.red} />
                          <ScoreBadge label="Performance Score" value={selectedModel.performance_score} color={selectedModel.performance_score > 70 ? T.mint : T.gold} />
                          <ScoreBadge label="Fuel Efficiency Score" value={selectedModel.fuel_efficiency_score} color={selectedModel.fuel_efficiency_score > 70 ? T.mint : T.gold} />
                          <ScoreBadge label="Appeal Score" value={selectedModel.appeal_score} color={selectedModel.appeal_score > 70 ? T.mint : T.gold} />
                          <ScoreBadge label="Cargo Utility Score" value={selectedModel.cargo_score} color={selectedModel.cargo_score > 50 ? T.mint : T.faint} />
                        </PanelBox>
                      </div>

                      {/* Phase 3: Engineering Assessment Panel */}
                      {(selectedModel.engineering_complexity || selectedModel.vehicle_weight_kg) && (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Engineering Assessment</div>
                          <PanelBox style={{ border: `1px solid rgba(110,168,254,0.2)` }}>
                            {[['Engineering Complexity', selectedModel.engineering_complexity, true], ['Manufacturing Complexity', selectedModel.manufacturing_complexity, true], ['Assembly Complexity', selectedModel.assembly_complexity, true]].map(([label, val, isRisk]: any) => (
                              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px dotted ${T.border}`, fontSize: '12px' }}>
                                <span style={{ color: T.muted }}>{label}</span>
                                <span style={{ color: val > 70 ? T.red : val > 50 ? '#f59e0b' : T.mint, fontFamily: 'monospace' }}>{Math.round(val ?? 50)}/100</span>
                              </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px dotted ${T.border}`, fontSize: '12px' }}>
                              <span style={{ color: T.muted }}>Vehicle Weight</span>
                              <span style={{ color: T.ivory, fontFamily: 'monospace' }}>{(selectedModel.vehicle_weight_kg || 1200).toLocaleString()} kg</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px dotted ${T.border}`, fontSize: '12px' }}>
                              <span style={{ color: T.muted }}>Manufacturing Friendliness</span>
                              <span style={{ color: (selectedModel.manufacturing_friendliness ?? 50) >= 60 ? T.mint : T.gold, fontFamily: 'monospace' }}>{Math.round(selectedModel.manufacturing_friendliness ?? 50)}/100</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px dotted ${T.border}`, fontSize: '12px' }}>
                              <span style={{ color: T.muted }}>Engineering Risk</span>
                              <span style={{ color: (selectedModel.engineering_risk ?? 20) > 60 ? T.red : (selectedModel.engineering_risk ?? 20) > 35 ? '#f59e0b' : T.mint, fontFamily: 'monospace' }}>{Math.round(selectedModel.engineering_risk ?? 20)}/100</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: '12px' }}>
                              <span style={{ color: T.muted }}>Prototype Confidence</span>
                              <span style={{ color: (selectedModel.prototype_confidence ?? 60) >= 70 ? T.mint : T.gold, fontFamily: 'monospace' }}>{Math.round(selectedModel.prototype_confidence ?? 60)}/100</span>
                            </div>
                          </PanelBox>
                        </div>
                      )}

                      {/* Phase 3B — Prototype Validation Issues */}
                      {(() => {
                        const issues: string[] = validationResult?.issues ?? [];
                        const extraCost = validationResult?.extraCostPct ?? 0;
                        const extraArcs = validationResult?.extraArcs ?? 0;
                        const resultClass = validationResult?.resultClass ?? 'Failed';
                        if (issues.length === 0) return null;
                        return (
                          <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Prototype Validation</div>
                            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '2px', padding: '12px 14px' }}>
                              <div style={{ fontSize: '11px', color: T.red, fontFamily: 'monospace', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                ✗ Validation {resultClass} — {extraArcs > 0 ? `+${extraArcs} Arc` : ''}{extraCost > 0 ? ` +${(extraCost * 100).toFixed(0)}% Extra Cost` : ''}
                              </div>
                              {issues.map((issue: string, i: number) => (
                                <div key={i} style={{ fontSize: '11px', color: T.faint, paddingLeft: '8px', borderLeft: '2px solid rgba(239,68,68,0.4)', marginBottom: '4px', lineHeight: 1.6 }}>• {issue}</div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Balance Rating */}
                      {balanceRating && (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Balance Rating</div>
                          <div style={{ padding: '8px 12px', background: 'rgba(54,211,153,0.06)', border: `1px solid rgba(54,211,153,0.25)`, borderRadius: '2px', fontSize: '12px', color: T.mint, fontWeight: 700, lineHeight: 1.5 }}>
                            {balanceRating}
                          </div>
                        </div>
                      )}

                      {/* Engineering Report */}
                      {engReport && engReport.primaryStrength && (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Engineering Report</div>
                          <PanelBox style={{ border: `1px solid ${T.blue}33` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                              <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'monospace', color: T.mint }}>{engReport.primaryStrength}</div>
                              <div style={{ fontSize: '12px', color: T.ivory, lineHeight: 1.5 }}>{engReport.engineeringVerdict}</div>
                            </div>
                            <div style={{ marginBottom: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '2px' }}>
                              <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Assessment</div>
                              <div style={{ fontSize: '11px', color: T.faint, paddingLeft: '8px', borderLeft: `2px solid ${T.border}`, marginBottom: '2px' }}>• Primary Weakness: {engReport.primaryWeakness}</div>
                              <div style={{ fontSize: '11px', color: T.faint, paddingLeft: '8px', borderLeft: `2px solid ${T.border}`, marginBottom: '2px' }}>• Production Suitability: {engReport.productionSuitability}</div>
                              <div style={{ fontSize: '11px', color: T.faint, paddingLeft: '8px', borderLeft: `2px solid ${T.border}`, marginBottom: '2px' }}>• Recommended Market: {engReport.recommendedMarket}</div>
                            </div>
                          </PanelBox>
                        </div>
                      )}

                      {/* Engineering Priorities Used */}
                      {engPriorities && (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Engineering Direction</div>
                          <PanelBox>
                            {ENG_PRIORITIES.map(p => (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0', borderBottom: `1px dotted ${T.border}` }}>
                                <span style={{ fontSize: '12px', width: '18px' }}>{p.icon}</span>
                                <span style={{ fontSize: '11px', color: T.muted, flex: 1 }}>{p.label}</span>
                                <div style={{ width: '80px', height: '4px', background: T.border, borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ width: `${engPriorities[p.id] ?? 0}%`, height: '100%', background: T.gold, borderRadius: '2px' }} />
                                </div>
                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: T.gold, width: '28px', textAlign: 'right' }}>{engPriorities[p.id] ?? 0}</span>
                              </div>
                            ))}
                          </PanelBox>
                        </div>
                      )}

                      {/* Factory Compatibility */}
                      <PanelBox>
                        <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Factory Compatibility</div>
                        <div style={{ fontSize: '12px', color: T.ivory, lineHeight: 1.8 }}>
                          Compatible with: <span style={{ color: T.gold }}>Small Workshop</span><br />
                          {selectedModel.development_status !== 'launched'
                            ? <span style={{ color: '#f59e0b' }}>⚠ Must be launched before assigning to a production line.</span>
                            : <span style={{ color: T.mint }}>✓ Ready for production assignment.</span>
                          }
                        </div>
                      </PanelBox>

                      {/* Lifecycle & Actions */}
                      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Lifecycle Management</div>

                        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                          {selectedModel.development_status === 'launched' && (
                            <GoldButton
                              onClick={() => {
                                setFaceliftSourceModelId(selectedModel.id);
                                setModelName(selectedModel.name + ' FL');
                                setDClass(selectedModel.vehicle_class);
                                setDPlatform(selectedModel.platform_type);
                                setDEngine(selectedModel.power_unit_type);
                                setDDrivetrain(selectedModel.drivetrain_type);
                                setDInterior(selectedModel.interior_tier);
                                setDSafety(selectedModel.safety_tier);
                                setDQuality(selectedModel.production_quality);
                                setDSegment(selectedModel.target_segment);
                                setDEngineeringPackage('');
                                setDSalePrice(selectedModel.sale_price);
                                setSelectedModelId(null);
                                setShowDesignModal(true);
                              }}
                            >
                              Develop Facelift
                            </GoldButton>
                          )}
                          {['launched', 'ready_to_launch', 'in_development'].includes(selectedModel.development_status || 'launched') && (
                            <GhostButton color={T.red} onClick={() => { setDiscontinuingModelId(selectedModel.id); setShowDiscontinueConfirm(true); }}>
                              Discontinue Model
                            </GhostButton>
                          )}
                        </div>

                        {/* Discontinue Confirm Box */}
                        {showDiscontinueConfirm && discontinuingModelId === selectedModel.id && (
                          <div style={{ background: 'rgba(184,85,85,0.08)', border: `1px solid ${T.red}55`, padding: '16px', marginBottom: '24px', borderRadius: '2px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: T.red, marginBottom: '8px' }}>Confirm Discontinuation</div>
                            <div style={{ fontSize: '12px', color: T.ivory, lineHeight: 1.6, marginBottom: '16px' }}>
                              Discontinuing a model is permanent. It will no longer be available for production, and its performance history will be finalized. Any remaining inventory will still be sold.
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <GhostButton color={T.red} onClick={handleDiscontinueModel}>Confirm Discontinue</GhostButton>
                              <GhostButton onClick={() => { setShowDiscontinueConfirm(false); setDiscontinuingModelId(null); }}>Cancel</GhostButton>
                            </div>
                          </div>
                        )}

                        {/* Performance History */}
                        <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Performance History</div>
                        <PanelBox>
                          {(() => {
                            const snaps = modelSnapshots.filter((s: any) => s.vehicle_model_id === selectedModel.id).sort((a: any, b: any) => b.world_arc - a.world_arc);
                            if (snaps.length === 0) return <div style={{ fontSize: '11px', color: T.faint }}>No performance history available yet. Snapshots are generated after an Arc closes.</div>;
                            return (
                              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ color: T.muted, borderBottom: `1px solid ${T.border}` }}>
                                      <th style={{ paddingBottom: '8px', fontWeight: 'normal' }}>Arc</th>
                                      <th style={{ paddingBottom: '8px', fontWeight: 'normal' }}>Built</th>
                                      <th style={{ paddingBottom: '8px', fontWeight: 'normal' }}>Sold</th>
                                      <th style={{ paddingBottom: '8px', fontWeight: 'normal' }}>Revenue</th>
                                      <th style={{ paddingBottom: '8px', fontWeight: 'normal' }}>Contribution</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {snaps.map((s: any) => (
                                      <tr key={s.id} style={{ borderBottom: `1px dashed ${T.border}33` }}>
                                        <td style={{ padding: '8px 0', color: T.ivory }}>{s.world_arc}</td>
                                        <td style={{ padding: '8px 0', color: T.muted }}>{s.units_produced}</td>
                                        <td style={{ padding: '8px 0', color: T.mint }}>{s.units_sold}</td>
                                        <td style={{ padding: '8px 0', color: T.gold }}>{fm(s.revenue_generated)}</td>
                                        <td style={{ padding: '8px 0', color: Number(s.direct_contribution) < 0 ? T.red : T.mint }}>{fm(s.direct_contribution)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                        </PanelBox>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── DESIGN FORM MODAL (Phase 3 Wizard) ── */}
                {showDesignModal && (
                  <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)' }}
                    onClick={() => { setShowDesignModal(false); setDesignWizardStep(1); }}>
                    <div style={{ width: '1020px', maxWidth: '98vw', maxHeight: '94vh', overflowY: 'auto', background: '#0d0d0d', border: `1px solid ${T.gold}55`, padding: '32px', position: 'relative' }}
                      onClick={e => e.stopPropagation()}>

                      {/* Modal Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: T.gold, letterSpacing: '0.05em' }}>
                            {faceliftSourceModelId ? 'Develop Facelift' : designWizardStep === 1 ? 'Step 1 — Vehicle Architecture' : 'Step 2 — Engineering Direction'}
                          </div>
                          <div style={{ fontSize: '11px', color: T.muted, marginTop: '3px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            R&D Desk — {faceliftSourceModelId ? 'Facelift' : 'New Model'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          {!faceliftSourceModelId && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {[1, 2].map(step => (
                                <div key={step} style={{ width: '28px', height: '4px', background: designWizardStep >= step ? T.gold : T.border, borderRadius: '2px', cursor: 'pointer', transition: 'background 0.2s' }}
                                  onClick={() => setDesignWizardStep(step as 1|2)} />
                              ))}
                            </div>
                          )}
                          <button onClick={() => { setShowDesignModal(false); setDesignWizardStep(1); }} style={{ background: 'none', border: 'none', color: T.muted, fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                        </div>
                      </div>

                      {/* ── STEP 1: Vehicle Architecture ── */}
                      {designWizardStep === 1 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
                          <div>
                            <div style={{ marginBottom: '14px' }}>
                              <label style={{ display: 'block', fontSize: '10px', color: T.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model Name</label>
                              <input value={modelName} onChange={e => setModelName(e.target.value)} placeholder="e.g. Drennia Compact Mk1" maxLength={60} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 10px', background: '#0e0e0e', border: `1px solid ${T.border}`, color: T.ivory, fontSize: '13px' }} />
                            </div>
                            <FormSelect label="Vehicle Class" value={dClass} onChange={setDClass} disabled={!!faceliftSourceModelId} options={bootstrapData?.vehicleClasses || []} />
                            <FormSelect label="Platform" value={dPlatform} onChange={setDPlatform} disabled={!!faceliftSourceModelId} options={bootstrapData?.platforms || []} />
                            <FormSelect label="Power Unit" value={dEngine} onChange={setDEngine} disabled={!!faceliftSourceModelId} options={bootstrapData?.powerUnits || []} />
                            <FormSelect label="Drivetrain" value={dDrivetrain} onChange={setDDrivetrain} disabled={!!faceliftSourceModelId} options={bootstrapData?.drivetrains || []} />
                            <FormSelect label="Interior" value={dInterior} onChange={setDInterior} disabled={!!faceliftSourceModelId} options={bootstrapData?.interiorTiers || []} />
                            <FormSelect label="Safety Standard" value={dSafety} onChange={setDSafety} disabled={!!faceliftSourceModelId} options={bootstrapData?.safetyTiers || []} />
                            <FormSelect label="Production Quality" value={dQuality} onChange={setDQuality} options={bootstrapData?.qualityTargets || []} />
                            <FormSelect label="Target Segment" value={dSegment} onChange={setDSegment} options={[{ id: 'budget', label: 'Budget' }, { id: 'family', label: 'Family' }, { id: 'commercial', label: 'Commercial' }, { id: 'premium', label: 'Premium' }]} />
                            <div style={{ marginBottom: '16px' }}>
                              <label style={{ display: 'block', fontSize: '10px', color: T.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sale Price ({currencySymbol})</label>
                              <input type="number" value={dSalePrice} onChange={e => setDSalePrice(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', background: '#0e0e0e', border: `1px solid ${T.border}`, color: T.gold, fontSize: '13px', fontFamily: 'monospace' }} />
                              <div style={{ fontSize: '10px', color: T.faint, marginTop: '3px' }}>Suggested: {fm(Math.round(liveScore.cost * 1.5))}</div>
                            </div>
                          </div>

                          {/* Live Preview — Step 1 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <PanelBox style={{ border: `1px solid ${T.gold}33` }}>
                              <SectionHeader stamp="LIVE ESTIMATE">Design Preview</SectionHeader>
                              <FieldRow label="Est. Mfg Cost / Unit" value={fm(liveScore.cost)} valueColor={T.red} />
                              <FieldRow label="Vehicle Weight" value={`${liveScore.vehicleWeightKg.toLocaleString()} kg`} />
                              <div style={{ marginTop: '10px' }}>
                                <ScoreBadge label="Reliability" value={liveScore.rel} color={liveScore.rel > 70 ? T.mint : liveScore.rel > 50 ? T.gold : T.red} />
                                <ScoreBadge label="Performance" value={liveScore.perf} color={liveScore.perf > 70 ? T.mint : T.gold} />
                                <ScoreBadge label="Fuel Efficiency" value={liveScore.fuel} color={liveScore.fuel > 70 ? T.mint : T.gold} />
                                <ScoreBadge label="Appeal" value={liveScore.appeal} color={liveScore.appeal > 70 ? T.mint : T.gold} />
                                <ScoreBadge label="Cargo" value={liveScore.cargo} color={liveScore.cargo > 50 ? T.mint : T.faint} />
                              </div>
                              <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(212,175,55,0.05)', border: `1px solid ${T.border}` }}>
                                <div style={{ fontSize: '10px', color: T.muted }}>Margin at Current Price</div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: dSalePrice > liveScore.cost ? T.mint : T.red, fontFamily: 'monospace' }}>{fm(dSalePrice - liveScore.cost)} / unit</div>
                              </div>
                            </PanelBox>
                          </div>
                        </div>
                      )}

                      {/* ── STEP 2: Engineering Direction ── */}
                      {designWizardStep === 2 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
                          {/* Left: Priorities + Budget */}
                          <div>
                            {/* Engineering Priorities */}
                            <PanelBox style={{ marginBottom: '20px', border: `1px solid rgba(212,175,55,0.25)` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: T.gold }}>Engineering Priorities</div>
                                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: Math.abs(prioritySum - 100) <= 2 ? T.mint : T.red }}>{prioritySum}/100 pts</div>
                              </div>
                              <div style={{ fontSize: '10px', color: T.faint, marginBottom: '12px', lineHeight: 1.6 }}>Distribute 100 engineering points across the six priorities. These determine what your engineers focus on.</div>
                              {ENG_PRIORITIES.map(p => {
                                const val = dPriorities[p.id] ?? 0;
                                const adjustPri = (delta: number) => {
                                  const newVal = Math.max(0, Math.min(100, val + delta));
                                  const diff = newVal - val;
                                  setDPriorities(prev => ({ ...prev, [p.id]: newVal }));
                                };
                                return (
                                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: `1px dotted ${T.border}` }}>
                                    <span style={{ fontSize: '14px', width: '20px' }}>{p.icon}</span>
                                    <span style={{ fontSize: '11px', color: T.muted, width: '140px', flexShrink: 0 }} title={p.desc}>{p.label}</span>
                                    <div style={{ flex: 1, height: '4px', background: T.border, borderRadius: '2px', overflow: 'hidden' }}>
                                      <div style={{ width: `${val}%`, height: '100%', background: val >= 30 ? T.gold : T.blue, transition: 'width 0.2s', borderRadius: '2px' }} />
                                    </div>
                                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: T.ivory, width: '28px', textAlign: 'center' }}>{val}</span>
                                    <button onClick={() => adjustPri(-5)} style={{ background: 'none', border: `1px solid ${T.border}`, color: T.muted, width: '22px', height: '22px', cursor: 'pointer', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                    <button onClick={() => adjustPri(5)} style={{ background: 'none', border: `1px solid ${T.border}`, color: T.muted, width: '22px', height: '22px', cursor: 'pointer', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                  </div>
                                );
                              })}
                              {Math.abs(prioritySum - 100) > 2 && (
                                <div style={{ marginTop: '10px', fontSize: '11px', color: T.red }}>⚠ Priorities must sum to 100. Currently: {prioritySum}.</div>
                              )}
                            </PanelBox>

                            {/* Budget Allocation */}
                            <PanelBox style={{ border: `1px solid rgba(110,168,254,0.2)` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: T.blue }}>Engineering Budget</div>
                                <div style={{ fontSize: '10px', color: T.muted }}>Total: {fm(BASE_DEV_COST)}</div>
                              </div>
                              <div style={{ fontSize: '10px', color: T.faint, marginBottom: '12px', lineHeight: 1.6 }}>Allocate the development budget across these areas. Higher testing spend reduces risk.</div>
                              {BUDGET_BUCKETS_FE.map(b => {
                                const val = dBudgetAlloc[b.id] ?? Math.round(BASE_DEV_COST * b.defaultPct);
                                const pct = Math.round((val / BASE_DEV_COST) * 100);
                                return (
                                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: `1px dotted ${T.border}` }}>
                                    <span style={{ fontSize: '11px', color: T.muted, flex: 1, minWidth: 0 }}>{b.label}</span>
                                    <div style={{ width: '60px', height: '3px', background: T.border, borderRadius: '2px', overflow: 'hidden' }}>
                                      <div style={{ width: `${pct}%`, height: '100%', background: T.blue, borderRadius: '2px' }} />
                                    </div>
                                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: T.ivory, width: '52px', textAlign: 'right' }}>{fm(val)}</span>
                                    <button onClick={() => setDBudgetAlloc(prev => ({ ...prev, [b.id]: Math.max(0, (prev[b.id] ?? Math.round(BASE_DEV_COST * b.defaultPct)) - Math.round(BASE_DEV_COST * 0.02)) }))} style={{ background: 'none', border: `1px solid ${T.border}`, color: T.muted, width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                    <button onClick={() => setDBudgetAlloc(prev => ({ ...prev, [b.id]: (prev[b.id] ?? Math.round(BASE_DEV_COST * b.defaultPct)) + Math.round(BASE_DEV_COST * 0.02) }))} style={{ background: 'none', border: `1px solid ${T.border}`, color: T.muted, width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                  </div>
                                );
                              })}
                            </PanelBox>
                          </div>

                          {/* Right: Live Engineering Assessment */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <PanelBox style={{ border: `1px solid ${T.gold}33` }}>
                              <SectionHeader stamp="LIVE ASSESSMENT">Engineering Outlook</SectionHeader>

                              {/* Complexity trio */}
                              <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Complexity</div>
                                {[
                                  ['Engineering', liveScore.engineeringComplexity],
                                  ['Manufacturing', liveScore.manufacturingComplexity],
                                  ['Assembly', liveScore.assemblyComplexity],
                                ].map(([label, val]: any) => (
                                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
                                    <span style={{ fontSize: '11px', color: T.muted, width: '100px' }}>{label}</span>
                                    <div style={{ flex: 1, height: '5px', background: T.border, borderRadius: '2px', overflow: 'hidden' }}>
                                      <div style={{ width: `${val}%`, height: '100%', background: val > 70 ? T.red : val > 50 ? '#f59e0b' : T.mint, borderRadius: '2px', transition: 'width 0.3s' }} />
                                    </div>
                                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: T.muted, width: '30px', textAlign: 'right' }}>{val}</span>
                                  </div>
                                ))}
                              </div>

                              <FieldRow label="Vehicle Weight" value={`${liveScore.vehicleWeightKg.toLocaleString()} kg`} />

                              {/* Risk / Confidence / Friendliness */}
                              <div style={{ marginTop: '10px' }}>
                                <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Engineering Quality</div>
                                {[
                                  ['Mfg. Friendliness', liveScore.mfgFriendliness, false],
                                  ['Engineering Risk', liveScore.engineeringRisk, true],
                                  ['Prototype Confidence', liveScore.protoConfidence, false],
                                ].map(([label, val, isRisk]: any) => (
                                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
                                    <span style={{ fontSize: '11px', color: T.muted, width: '145px' }}>{label}</span>
                                    <div style={{ flex: 1, height: '5px', background: T.border, borderRadius: '2px', overflow: 'hidden' }}>
                                      <div style={{ width: `${val}%`, height: '100%',
                                        background: isRisk ? (val > 60 ? T.red : val > 35 ? '#f59e0b' : T.mint) : (val >= 70 ? T.mint : val >= 45 ? '#f59e0b' : T.red),
                                        borderRadius: '2px', transition: 'width 0.3s' }} />
                                    </div>
                                    <span style={{ fontFamily: 'monospace', fontSize: '11px', width: '30px', textAlign: 'right',
                                      color: isRisk ? (val > 60 ? T.red : val > 35 ? '#f59e0b' : T.mint) : (val >= 70 ? T.mint : val >= 45 ? '#f59e0b' : T.red)
                                    }}>{val}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Dev time & cost */}
                              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px dashed ${T.border}` }}>
                                <FieldRow label="Development Cost" value={fm(liveScore.devCost)} valueColor={T.red} />
                                <FieldRow label="Est. Dev. Time" value={`${liveScore.devTimeArcs} Arc${liveScore.devTimeArcs > 1 ? 's' : ''}`} valueColor={T.blue} />
                              </div>

                              {/* Final scores */}
                              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px dashed ${T.border}` }}>
                                <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Estimated Final Scores</div>
                                <ScoreBadge label="Reliability" value={liveScore.rel} color={liveScore.rel > 70 ? T.mint : liveScore.rel > 50 ? T.gold : T.red} />
                                <ScoreBadge label="Performance" value={liveScore.perf} color={liveScore.perf > 70 ? T.mint : T.gold} />
                                <ScoreBadge label="Fuel Efficiency" value={liveScore.fuel} color={liveScore.fuel > 70 ? T.mint : T.gold} />
                                <ScoreBadge label="Appeal" value={liveScore.appeal} color={liveScore.appeal > 70 ? T.mint : T.gold} />
                              </div>
                            </PanelBox>

                            {/* Balance Flags */}
                            {liveScore.balanceFlags.length > 0 && (
                              <PanelBox style={{ border: `1px solid rgba(245,158,11,0.3)` }}>
                                <div style={{ fontSize: '11px', color: '#f59e0b', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '8px' }}>⚠ Engineering Flags</div>
                                {liveScore.balanceFlags.map((flag, i) => (
                                  <div key={i} style={{ fontSize: '11px', color: T.ivory, lineHeight: 1.5, marginBottom: '6px', paddingLeft: '8px', borderLeft: `2px solid #f59e0b55` }}>{flag}</div>
                                ))}
                              </PanelBox>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Submit / Navigation */}
                      <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {!faceliftSourceModelId && designWizardStep === 1 && (
                          <GoldButton onClick={() => setDesignWizardStep(2)} disabled={!modelName.trim() || modelName.trim().length < 2} style={{ padding: '11px 28px', fontSize: '12px' }}>
                            Continue to Engineering Direction →
                          </GoldButton>
                        )}
                        {(!faceliftSourceModelId && designWizardStep === 2 || faceliftSourceModelId) && (
                          <GoldButton
                            onClick={handleSaveDesign}
                            disabled={!modelName.trim() || modelName.trim().length < 2 || designSaving || (!faceliftSourceModelId && Math.abs(prioritySum - 100) > 2)}
                            style={{ padding: '11px 28px', fontSize: '12px' }}
                          >
                            {designSaving ? 'Starting Development...' : 'Start Vehicle Development'}
                          </GoldButton>
                        )}
                        {!faceliftSourceModelId && designWizardStep === 2 && (
                          <GhostButton onClick={() => setDesignWizardStep(1)}>← Back</GhostButton>
                        )}
                        <GhostButton onClick={() => { setShowDesignModal(false); setDesignWizardStep(1); }}>Cancel</GhostButton>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── COMPARE MODAL ── */}
                {showCompareModal && (
                  <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)' }}
                    onClick={() => setShowCompareModal(false)}>
                    <div style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', background: '#0d0d0d', border: `1px solid ${T.gold}55`, padding: '32px', position: 'relative' }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: T.gold, letterSpacing: '0.05em' }}>Compare Models</div>
                          <div style={{ fontSize: '11px', color: T.muted, marginTop: '3px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>R&D Desk — Evaluation</div>
                        </div>
                        <button onClick={() => setShowCompareModal(false)} style={{ background: 'none', border: 'none', color: T.muted, fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        <div>
                          <select value={compareModel1} onChange={e => setCompareModel1(e.target.value)} style={{ width: '100%', padding: '9px 10px', background: '#0e0e0e', border: `1px solid ${T.border}`, color: T.ivory, fontSize: '13px', marginBottom: '16px' }}>
                            <option value="">— Select Model A —</option>
                            {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                          {(() => {
                            const m = models.find((x: any) => x.id === compareModel1);
                            if (!m) return <div style={{ color: T.muted, fontSize: '12px' }}>No model selected.</div>;
                            return (
                              <PanelBox>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: T.gold, marginBottom: '12px' }}>{m.name}</div>
                                <FieldRow label="Class" value={m.vehicle_class} />
                                <FieldRow label="Platform" value={m.platform_type} />
                                <FieldRow label="Sale Price" value={fm(m.sale_price)} valueColor={T.mint} />
                                <FieldRow label="Cost/Unit" value={fm(m.manufacturing_cost_per_unit)} valueColor={T.red} />
                                <div style={{ marginTop: '12px', borderTop: `1px dashed ${T.border}33`, paddingTop: '12px' }}>
                                  <ScoreBadge label="Reliability" value={m.reliability_score} />
                                  <ScoreBadge label="Performance" value={m.performance_score} />
                                  <ScoreBadge label="Fuel Efficiency" value={m.fuel_efficiency_score} />
                                  <ScoreBadge label="Appeal" value={m.appeal_score} />
                                  <ScoreBadge label="Cargo Utility" value={m.cargo_score} />
                                </div>
                              </PanelBox>
                            );
                          })()}
                        </div>
                        <div>
                          <select value={compareModel2} onChange={e => setCompareModel2(e.target.value)} style={{ width: '100%', padding: '9px 10px', background: '#0e0e0e', border: `1px solid ${T.border}`, color: T.ivory, fontSize: '13px', marginBottom: '16px' }}>
                            <option value="">— Select Model B —</option>
                            {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                          {(() => {
                            const m = models.find((x: any) => x.id === compareModel2);
                            if (!m) return <div style={{ color: T.muted, fontSize: '12px' }}>No model selected.</div>;
                            const m1 = models.find((x: any) => x.id === compareModel1);
                            return (
                              <PanelBox>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: T.gold, marginBottom: '12px' }}>{m.name}</div>
                                <FieldRow label="Class" value={m.vehicle_class} />
                                <FieldRow label="Platform" value={m.platform_type} />
                                <FieldRow label="Sale Price" value={fm(m.sale_price)} valueColor={T.mint} />
                                <FieldRow label="Cost/Unit" value={fm(m.manufacturing_cost_per_unit)} valueColor={T.red} />
                                <div style={{ marginTop: '12px', borderTop: `1px dashed ${T.border}33`, paddingTop: '12px' }}>
                                  <ScoreBadge label="Reliability" value={m.reliability_score} color={m1 ? (m.reliability_score > m1.reliability_score ? T.mint : m.reliability_score < m1.reliability_score ? T.red : T.ivory) : T.ivory} />
                                  <ScoreBadge label="Performance" value={m.performance_score} color={m1 ? (m.performance_score > m1.performance_score ? T.mint : m.performance_score < m1.performance_score ? T.red : T.ivory) : T.ivory} />
                                  <ScoreBadge label="Fuel Efficiency" value={m.fuel_efficiency_score} color={m1 ? (m.fuel_efficiency_score > m1.fuel_efficiency_score ? T.mint : m.fuel_efficiency_score < m1.fuel_efficiency_score ? T.red : T.ivory) : T.ivory} />
                                  <ScoreBadge label="Appeal" value={m.appeal_score} color={m1 ? (m.appeal_score > m1.appeal_score ? T.mint : m.appeal_score < m1.appeal_score ? T.red : T.ivory) : T.ivory} />
                                  <ScoreBadge label="Cargo Utility" value={m.cargo_score} color={m1 ? (m.cargo_score > m1.cargo_score ? T.mint : m.cargo_score < m1.cargo_score ? T.red : T.ivory) : T.ivory} />
                                </div>
                              </PanelBox>
                            );
                          })()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <GhostButton onClick={() => setShowCompareModal(false)}>Close</GhostButton>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PORTFOLIO PAGE HEADER ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <GhostButton onClick={() => setShowCompareModal(true)}>Compare Models</GhostButton>
                    <GoldButton onClick={() => setShowDesignModal(true)} style={{ padding: '9px 20px' }}>+ Design a Vehicle</GoldButton>
                  </div>
                </div>

                {/* ── VEHICLE MODEL CARDS ── */}
                {models.length === 0 ? (
                  <EmptyState
                    icon="🔬"
                    title="No vehicle models yet"
                    subtitle="Start your first R&D project. Design a vehicle to begin development, then launch it when it's ready for production."
                    action={<GoldButton onClick={() => setShowDesignModal(true)}>Design a Vehicle</GoldButton>}
                  />
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {models.map((m: any) => {
                      const devStatus = m.development_status || 'launched';
                      const statusColors: Record<string, string> = {
                        in_development: '#f59e0b', ready_to_launch: T.blue, launched: T.mint, cancelled: T.red, discontinued: T.faint
                      };
                      const statusColor = statusColors[devStatus] || T.mint;
                      return (
                        <div key={m.id}
                          onClick={() => setSelectedModelId(m.id)}
                          style={{
                            background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`,
                            padding: '16px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                            borderRadius: '2px',
                            opacity: devStatus === 'discontinued' ? 0.6 : 1,
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = T.gold + '88'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(212,175,55,0.04)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = T.border; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: T.gold, lineHeight: 1.3 }}>
                              {m.name}
                              {m.development_type === 'facelift' && <span style={{ fontSize: '10px', color: T.muted, marginLeft: '6px', border: `1px solid ${T.border}`, padding: '1px 4px', borderRadius: '2px' }}>FACELIFT</span>}
                            </div>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, marginTop: '4px', flexShrink: 0 }} />
                          </div>
                          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px' }}>
                            {m.vehicle_class} · {m.target_segment}
                          </div>
                          <div style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.07em', color: statusColor, marginBottom: '10px' }}>
                            {devStatus === 'in_development' ? 'Development In Progress'
                              : devStatus === 'ready_to_launch' ? 'Ready to Launch'
                                : devStatus === 'launched' ? 'Launched'
                                  : devStatus === 'discontinued' ? 'Discontinued'
                                    : 'Cancelled'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, fontFamily: 'monospace' }}>{fm(m.sale_price)}</div>
                            <div style={{ fontSize: '10px', color: T.faint }}>View Details →</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {designTab === 'research' && (
              <div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {Object.entries((bootstrapData?.engineeringProgrammes || {}) as Record<string, any>).map(([id, prog]) => {
                    const activeProg = research.find((r: any) => r.programme_id === id);
                    const isCompleted = activeProg?.status === 'completed';
                    const inProgress = activeProg?.status === 'in_progress' || activeProg?.status === 'validation';
                    const prereqCompleted = !prog.prereq || research.some((r: any) => r.programme_id === prog.prereq && r.status === 'completed');
                    const isLocked = !prereqCompleted;

                    return (
                      <div key={id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, padding: '16px', borderRadius: '2px', opacity: isLocked ? 0.6 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: T.gold }}>{prog.name}</div>
                            {prog.prereq && <div style={{ fontSize: '10px', color: T.red, marginTop: '4px' }}>Requires: {(bootstrapData?.engineeringProgrammes || {})[prog.prereq].name}</div>}
                          </div>
                          {isCompleted && <div style={{ color: T.mint, fontSize: '12px', fontWeight: 600 }}>✓ Completed</div>}
                          {inProgress && <div style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>In Progress ({activeProg.status})</div>}
                        </div>

                        <div style={{ fontSize: '12px', color: T.muted, marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <FieldRow label="Budget" value={fm(prog.budget || 0)} valueColor={T.red} />
                          <FieldRow label="Base Duration" value={`${prog.baseDuration || 0} Arcs`} />
                          <FieldRow label="Min Engineers" value={prog.minEng} />
                          <FieldRow label="Rec. Engineers" value={prog.recEng} />
                        </div>

                        {!isCompleted && !inProgress && (
                          <GoldButton
                            onClick={() => handleStartResearch(id)}
                            disabled={isLocked || engineerCount < prog.minEng || finances?.cash < prog.budget}
                            style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                          >
                            {isLocked ? 'Locked' : engineerCount < prog.minEng ? 'Not enough engineers' : (finances?.cash || 0) < prog.budget ? 'Not enough cash' : 'Start Programme'}
                          </GoldButton>
                        )}
                        {inProgress && (
                          <div style={{ fontSize: '11px', color: T.faint, textAlign: 'center', marginTop: '8px' }}>
                            Started Arc {activeProg.started_at_world_arc}. Review in {activeProg.estimated_completion_arc} Arc(s).
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
             )}

            {/* === KNOWLEDGE SUB-TAB === */}
            {designTab === 'knowledge' && (() => {
              const companyKnowledge = (mfgData?.companyKnowledge ?? {}) as Record<string, { xp: number; level: number }>;
              const engReputation = (mfgData?.engReputation ?? null) as Record<string, any> | null;
              const LEVEL_LABELS = ['Novice', 'Apprentice', 'Proficient', 'Experienced', 'Expert', 'Master'];
              const LEVEL_XP = [0, 100, 300, 700, 1500, 3000];
              const totalXp = Object.values(companyKnowledge).reduce((s, v) => s + (v?.xp ?? 0), 0);
              const hasAny = totalXp > 0;
              return (
                <div>

                  {!hasAny ? (
                    <div style={{ textAlign: 'center', padding: '48px 24px', border: `1px dashed ${T.border}`, borderRadius: '2px' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>📚</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '8px' }}>No Engineering Knowledge Yet</div>
                      <div style={{ fontSize: '12px', color: T.muted, maxWidth: '380px', margin: '0 auto', lineHeight: 1.6 }}>Complete vehicle development projects to earn knowledge XP across six engineering domains. Higher levels unlock cost reductions and score bonuses for future projects.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Domain Knowledge</div>
                        {ENG_PRIORITIES.map(p => {
                          const k = companyKnowledge[p.id] ?? { xp: 0, level: 0 };
                          const level = k.level ?? 0;
                          const xp = k.xp ?? 0;
                          const curLvlXp = LEVEL_XP[level] ?? 0;
                          const nextLvlXp = LEVEL_XP[Math.min(level + 1, LEVEL_XP.length - 1)] ?? LEVEL_XP[LEVEL_XP.length - 1];
                          const pct = nextLvlXp > curLvlXp ? Math.round(((xp - curLvlXp) / (nextLvlXp - curLvlXp)) * 100) : 100;
                          return (
                            <div key={p.id} style={{ marginBottom: '16px', padding: '14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, borderRadius: '2px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '14px' }}>{p.icon}</span>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: T.ivory }}>{p.label}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: T.gold, fontWeight: 700 }}>Lv.{level} — {LEVEL_LABELS[Math.min(level, LEVEL_LABELS.length - 1)]}</div>
                                  <div style={{ fontSize: '10px', color: T.faint }}>{xp} XP total</div>
                                </div>
                              </div>
                              <div style={{ height: '5px', background: T.border, borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: level >= 4 ? T.gold : level >= 2 ? T.mint : T.blue, borderRadius: '3px', transition: 'width 0.3s' }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span style={{ fontSize: '9px', color: T.faint }}>{xp - curLvlXp} / {nextLvlXp - curLvlXp} to next level</span>
                                {level >= LEVEL_LABELS.length - 1 && <span style={{ fontSize: '9px', color: T.gold }}>MAX</span>}
                              </div>
                              {level >= 1 && (
                                <div style={{ fontSize: '10px', color: T.faint, marginTop: '6px', borderTop: `1px dashed ${T.border}`, paddingTop: '6px' }}>
                                  {p.id === 'reliability' && `↓ ${level * 3}% engineering risk on reliability-focused projects`}
                                  {p.id === 'performance' && `↑ ${level * 2} performance score bonus on perf-focused projects`}
                                  {p.id === 'fuel_economy' && `↑ ${level * 2} fuel efficiency bonus on eco-focused projects`}
                                  {p.id === 'comfort' && `↑ ${level * 2} appeal bonus on comfort-focused projects`}
                                  {p.id === 'practicality' && `↑ ${level * 2} cargo score bonus on utility projects`}
                                  {p.id === 'mfg_simplicity' && `↓ ${level * 2}% manufacturing cost on mfg-focus projects`}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Engineering Reputation</div>
                        {engReputation ? (
                          <PanelBox style={{ border: `1px solid ${T.gold}33`, marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', color: T.faint, marginBottom: '14px', lineHeight: 1.7 }}>Rolling average across {engReputation.projects_completed ?? 0} completed project{(engReputation.projects_completed ?? 0) !== 1 ? 's' : ''}.</div>
                            {[
                              { id: 'reliability_rep', label: 'Reliability Rep.', icon: '🛡' },
                              { id: 'performance_rep', label: 'Performance Rep.', icon: '⚡' },
                              { id: 'fuel_efficiency_rep', label: 'Fuel Economy Rep.', icon: '⛽' },
                              { id: 'comfort_rep', label: 'Comfort Rep.', icon: '🛋' },
                              { id: 'practicality_rep', label: 'Practicality Rep.', icon: '📦' },
                              { id: 'mfg_efficiency_rep', label: 'Mfg. Simplicity Rep.', icon: '🔧' },
                            ].map(field => {
                              const val = Math.round(Number(engReputation[field.id] ?? 0));
                              return (
                                <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0', borderBottom: `1px dotted ${T.border}` }}>
                                  <span style={{ fontSize: '12px', width: '18px' }}>{field.icon}</span>
                                  <span style={{ fontSize: '11px', color: T.muted, flex: 1 }}>{field.label}</span>
                                  <div style={{ width: '80px', height: '4px', background: T.border, borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(val, 100)}%`, height: '100%', background: T.gold, borderRadius: '2px' }} />
                                  </div>
                                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: T.gold, width: '24px', textAlign: 'right' }}>{val}</span>
                                </div>
                              );
                            })}
                          </PanelBox>
                        ) : (
                          <PanelBox style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', color: T.faint, lineHeight: 1.6 }}>Engineering reputation is built by completing vehicle projects. Your first completed model will establish your company's engineering identity.</div>
                          </PanelBox>
                        )}
                        <PanelBox style={{ border: `1px solid rgba(110,168,254,0.2)` }}>
                          <div style={{ fontSize: '11px', color: T.blue, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '12px' }}>Knowledge Summary</div>
                          <FieldRow label="Total XP Earned" value={totalXp} valueColor={T.gold} />
                          <FieldRow label="Projects Completed" value={engReputation?.projects_completed ?? 0} />
                          <div style={{ marginTop: '14px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '2px' }}>
                            <div style={{ fontSize: '10px', color: T.faint, lineHeight: 1.7 }}><strong style={{ color: T.muted }}>How knowledge works:</strong> Each completed vehicle project awards XP across domains based on engineering priorities. Higher levels unlock passive bonuses on future projects.</div>
                          </div>
                        </PanelBox>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════
          PROCUREMENT TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'procurement' && (() => {
        const componentCatalogue = mfgData?.componentCatalogue || [];
        const componentInventory = mfgData?.componentInventory || [];
        return (
          <div>
            <SectionHeader stamp="SUPPLY CHAIN">Component Procurement</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
              {componentCatalogue.map((comp: any) => {
                const inv = componentInventory.find((i: any) => i.component_id === comp.id);
                const stock = inv ? inv.units_in_stock : 0;
                return (
                  <div key={comp.id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, padding: '16px', borderRadius: '2px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.gold, marginBottom: '8px' }}>{comp.name}</div>
                    <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', minHeight: '32px' }}>{comp.description}</div>
                    <FieldRow label="In Stock" value={stock} valueColor={stock > 0 ? T.mint : T.faint} />
                    <FieldRow label="Base Cost" value={fm(comp.base_cost)} />
                    <div style={{ marginTop: '16px' }}>
                      <GoldButton
                        onClick={() => setProcuringComponent({ id: comp.id, name: comp.name, units: 1000, cost: comp.base_cost })}
                        style={{ width: '100%' }}
                      >
                        Purchase Order
                      </GoldButton>
                    </div>
                  </div>
                );
              })}
            </div>

            {procuringComponent && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: T.bg, border: `1px solid ${T.border}`, padding: '24px', width: '400px', borderRadius: '2px' }}>
                  <h3 style={{ margin: '0 0 16px', color: T.gold }}>Procure {procuringComponent.name}</h3>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '10px', color: T.muted, marginBottom: '4px' }}>Order Quantity</label>
                    <input type="number" min="100" step="100" value={procuringComponent.units}
                      onChange={e => setProcuringComponent({ ...procuringComponent, units: parseInt(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px', background: '#0e0e0e', border: `1px solid ${T.border}`, color: T.ivory }} />
                  </div>

                  <div style={{ marginBottom: '24px', fontSize: '12px' }}>
                    <FieldRow label="Total Cost" value={fm(procuringComponent.units * procuringComponent.cost)} valueColor={T.red} />
                    <FieldRow label="Current Balance" value={fm(finances?.cash || 0)} valueColor={T.mint} />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <GhostButton onClick={() => setProcuringComponent(null)}>Cancel</GhostButton>
                    <GoldButton
                      disabled={(finances?.cash || 0) < (procuringComponent.units * procuringComponent.cost) || procuringComponent.units <= 0}
                      onClick={() => handleProcureComponent(procuringComponent.id, procuringComponent.units)}
                    >
                      Submit Order
                    </GoldButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════
          PRODUCTION TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'production' && (
        <div>
          <SectionHeader stamp="PRODUCTION DESK">Production Lines</SectionHeader>

          {/* State 1: No factory */}
          {!hasFactory && (
            <EmptyState
              icon="⚙"
              title="No factory yet"
              subtitle="You need a factory before production can begin."
              action={<GoldButton onClick={() => setDeskTab('factory')}>Go to Factory</GoldButton>}
            />
          )}

          {/* State 2: Factory, but no launched model */}
          {hasFactory && !models.some((m: any) => (m.development_status || 'launched') === 'launched') && (
            <EmptyState
              icon="📐"
              title="Launch model first"
              subtitle="Launch a vehicle model before assigning it to a production line."
              action={<GoldButton onClick={() => setDeskTab('design')}>Go to R&D / Design</GoldButton>}
            />
          )}

          {/* State 3: Factory & Launched Model available */}
          {hasFactory && models.some((m: any) => (m.development_status || 'launched') === 'launched') && factories.map((factory: any) => {
            const lines = productionLines.filter((l: any) => l.factory_id === factory.id);
            return (
              <PanelBox key={factory.id} style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '4px' }}>{factory.name}</div>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>
                  Capacity: {factory.capacity_per_arc} units/Arc · Workers Required: {factory.worker_requirement || 30} · Current Workers: {totalWorkers}
                  {totalWorkers < (factory.worker_requirement || 30) && (
                    <span style={{ color: T.red, marginLeft: '8px' }}>⚠ Understaffed — production will be reduced</span>
                  )}
                </div>

                {lines.map((line: any) => {
                  const assignedModel = models.find((m: any) => m.id === line.assigned_vehicle_model_id);
                  const isEditing = editingLineId === line.id;
                  const editModel = models.find((m: any) => m.id === planModelId);

                  // Quality display labels mapping
                  const qualityLabels: Record<string, string> = {
                    'Budget': 'Economy Output',
                    'Standard': 'Standard Output',
                    'Premium': 'Quality Focus',
                  };

                  // Quality multipliers
                  const costMult = planQuality === 'Premium' ? 1.15 : planQuality === 'Budget' ? 0.9 : 1.0;
                  const defectRate = planQuality === 'Premium' ? 0.01 : planQuality === 'Budget' ? 0.05 : 0.03;

                  // Production bonuses from research
                  const hasAssemblyTime = research.some((r: any) => r.programme_id === 'assembly-time' && r.status === 'completed');
                  const hasSpc = research.some((r: any) => r.programme_id === 'spc' && r.status === 'completed');

                  // Live estimate calculations
                  const staffingRatio = Math.min(1, totalWorkers / (factory.worker_requirement || 30));
                  const engineerBonus = 0; // Future
                  const efficiency = staffingRatio * (1 + engineerBonus) * ((factory.condition || 100) / 100);

                  const estUnitsRaw = Math.floor(planTarget * efficiency);

                  const cInv = mfgData?.componentInventory || [];
                  const getInv = (cid: string) => cInv.find((i: any) => i.component_id === cid)?.units_in_stock || 0;

                  let maxByComponents = Math.floor(getInv('comp_engine'));
                  maxByComponents = Math.min(maxByComponents, Math.floor(getInv('comp_transmission')));
                  maxByComponents = Math.min(maxByComponents, Math.floor(getInv('comp_tyres') / 4));
                  maxByComponents = Math.min(maxByComponents, Math.floor(getInv('comp_steel')));
                  maxByComponents = Math.min(maxByComponents, Math.floor(getInv('comp_glass')));
                  maxByComponents = Math.min(maxByComponents, Math.floor(getInv('comp_electronics')));

                  const estUnitsProd = Math.min(factory.capacity_per_arc, Math.min(estUnitsRaw, maxByComponents));
                  const isComponentBottleneck = estUnitsRaw > 0 && maxByComponents < estUnitsRaw;

                  const estDefects = Math.floor(estUnitsProd * defectRate);
                  const estInventoryAdded = estUnitsProd - estDefects;

                  const BOM_COST = 9400;
                  const totalModelCost = editModel ? Math.round(editModel.manufacturing_cost_per_unit * costMult) : 0;
                  const assemblyCost = Math.max(0, totalModelCost - BOM_COST);

                  const estTotalCost = assemblyCost * estUnitsProd;

                  return (
                    <div key={line.id} style={{ border: `1px solid ${T.border}`, padding: '16px', marginBottom: '12px', background: 'rgba(0,0,0,0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: T.gold }}>Production Line {line.line_number}</div>
                        <div style={{ fontSize: '10px', color: line.status === 'active' ? T.mint : line.status === 'paused' ? T.red : T.faint, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                          ● {!assignedModel ? 'IDLE' : line.status}
                        </div>
                      </div>

                      {isEditing ? (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '10px', color: T.muted, marginBottom: '4px' }}>Assigned Model</label>
                              <select value={planModelId} onChange={e => { setPlanModelId(e.target.value); }} style={{ width: '100%', padding: '7px', background: '#0e0e0e', border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }}>
                                <option value="">— Halt Production —</option>
                                {models.filter((m: any) => (m.development_status || 'launched') === 'launched').map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '10px', color: T.muted, marginBottom: '4px' }}>Target (Units/Arc) <span style={{ color: T.faint }}>— max 100 per line</span></label>
                              <input type="number" min={0} max={100} value={planTarget} onChange={e => setPlanTarget(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box', padding: '7px', background: '#0e0e0e', border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '10px', color: T.muted, marginBottom: '4px' }}>Quality Setting</label>
                              <select value={planQuality} onChange={e => setPlanQuality(e.target.value)} style={{ width: '100%', padding: '7px', background: '#0e0e0e', border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }}>
                                <option value="Budget">Economy Output</option>
                                <option value="Standard">Standard Output</option>
                                <option value="Premium">Quality Focus</option>
                              </select>
                            </div>
                          </div>

                          {/* Estimates */}
                          {editModel && planTarget > 0 && (
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, padding: '12px', marginBottom: '12px' }}>
                              <div style={{ fontSize: '10px', color: T.gold, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Estimate at Arc Close</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', fontSize: '11px' }}>
                                <div><span style={{ color: T.muted }}>Factory Condition</span><br /><strong style={{ color: Number(factory.condition) < 50 ? T.red : T.mint }}>{factory.condition}%</strong></div>
                                <div><span style={{ color: T.muted }}>Efficiency</span><br /><strong style={{ color: efficiency < 1 ? T.red : T.mint }}>{Math.round(efficiency * 100)}%</strong> {hasAssemblyTime && <span style={{ color: T.gold, fontSize: '9px', marginLeft: '4px' }}>+Assembly Std</span>}</div>
                                <div>
                                  <span style={{ color: T.muted }}>Est. Units Produced</span><br />
                                  <strong style={{ color: isComponentBottleneck ? T.red : T.ivory }}>{estUnitsProd}</strong>
                                  {isComponentBottleneck && <div style={{ fontSize: '9px', color: T.red, marginTop: '2px' }}>⚠ Short on components</div>}
                                </div>
                                <div><span style={{ color: T.muted }}>Defect Rate</span><br /><strong style={{ color: defectRate > 0.03 ? T.red : T.mint }}>{defectRate * 100}% (-{estDefects} units)</strong> {hasSpc && <span style={{ color: T.gold, fontSize: '9px', marginLeft: '4px' }}>-SPC Std</span>}</div>

                                <div style={{ gridColumn: '1 / span 2', marginTop: '8px' }}>
                                  <span style={{ color: T.muted }}>Net Inventory Added</span><br />
                                  <strong style={{ color: T.mint, fontSize: '13px', fontFamily: 'monospace' }}>+{estInventoryAdded} units</strong>
                                </div>
                                <div style={{ gridColumn: '3 / span 2', marginTop: '8px' }}>
                                  <span style={{ color: T.muted }}>Est. Total Prod Cost</span><br />
                                  <strong style={{ color: T.red, fontSize: '13px', fontFamily: 'monospace' }}>{fm(estTotalCost)}</strong>
                                  <span style={{ color: T.faint, marginLeft: '6px' }}>(excl. parts)</span>
                                </div>
                              </div>
                              <div style={{ fontSize: '10px', color: T.faint, marginTop: '12px', fontStyle: 'italic' }}>
                                Note: Revenue estimates will appear after Market &amp; Sales is built.
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <GoldButton onClick={() => handleSaveProductionPlan(line.id)}>Save Production Plan</GoldButton>
                            <GhostButton onClick={() => setEditingLineId(null)}>Cancel</GhostButton>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '12px', color: T.ivory }}>
                            {assignedModel ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div>Producing: <strong style={{ color: T.gold }}>{assignedModel.name}</strong></div>
                                <div style={{ fontSize: '11px', color: T.muted }}>
                                  Target: {line.target_units_per_arc} units/Arc · {qualityLabels[line.quality_setting] || line.quality_setting}
                                </div>
                                {line.status === 'active' && (
                                  <div style={{ fontSize: '11px', color: T.mint }}>
                                    Current Efficiency: {Math.round(Math.min(1, totalWorkers / (factory.worker_requirement || 30)) * ((factory.condition || 100) / 100) * 100)}%
                                    {hasAssemblyTime && <span style={{ color: T.gold, marginLeft: '8px' }}>+Assembly Std</span>}
                                    {hasSpc && <span style={{ color: T.gold, marginLeft: '8px' }}>-SPC Std</span>}
                                  </div>
                                )}
                                {(() => {
                                  if (line.status !== 'active') return null;
                                  const lineTarget = line.target_units_per_arc || 0;
                                  const lineEff = Math.min(1, totalWorkers / (factory.worker_requirement || 30)) * ((factory.condition || 100) / 100);
                                  const lineRaw = Math.floor(lineTarget * lineEff);
                                  const isNeck = lineRaw > 0 && maxByComponents < lineRaw;
                                  if (isNeck) {
                                    return <div style={{ fontSize: '11px', color: T.red }}>⚠ Short on components (Max: {maxByComponents} units)</div>;
                                  }
                                  return null;
                                })()}
                              </div>
                            ) : (
                              <span style={{ color: T.faint }}>No model assigned. Line is idle.</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <GhostButton onClick={() => {
                              setEditingLineId(line.id);
                              setPlanModelId(line.assigned_vehicle_model_id || '');
                              setPlanTarget(line.target_units_per_arc || 0);
                              setPlanQuality(line.quality_setting || 'Standard');
                            }}>Edit Plan</GhostButton>

                            {assignedModel && line.status === 'active' && (
                              <GhostButton color={T.red} onClick={() => handlePauseProductionLine(line.id)}>Pause Production</GhostButton>
                            )}
                            {assignedModel && line.status === 'paused' && (
                              <GhostButton color={T.mint} onClick={() => handleResumeProductionLine(line.id)}>Resume Production</GhostButton>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </PanelBox>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MARKET & SALES TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'market' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SectionHeader stamp="SALES DESK">Market &amp; Sales Operations</SectionHeader>

          {/* Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            <PanelBox>
              <div style={{ fontSize: '12px', color: T.muted, marginBottom: '4px' }}>Available Inventory</div>
              <div style={{ fontSize: '24px', color: T.ivory, fontFamily: 'monospace' }}>
                {inventory.reduce((a: number, b: any) => a + Number(b.units_in_stock), 0)} units
              </div>
              <div style={{ fontSize: '11px', color: T.faint, marginTop: '4px' }}>
                Value: {fm(inventoryValue)}
              </div>
            </PanelBox>
            <PanelBox>
              <div style={{ fontSize: '12px', color: T.muted, marginBottom: '4px' }}>Vehicles Sold Last Arc</div>
              <div style={{ fontSize: '24px', color: T.mint, fontFamily: 'monospace' }}>
                {latestReport?.units_sold || 0}
              </div>
              <div style={{ fontSize: '11px', color: T.faint, marginTop: '4px' }}>
                Revenue: {fm(latestReport?.sales_revenue || 0)}
              </div>
            </PanelBox>
            <PanelBox>
              <div style={{ fontSize: '12px', color: T.muted, marginBottom: '4px' }}>Marketing Budget / Arc</div>
              <div style={{ fontSize: '24px', color: T.red, fontFamily: 'monospace' }}>
                {fm(latestReport?.marketing_costs || 0)}
              </div>
              <div style={{ fontSize: '11px', color: T.faint, marginTop: '4px' }}>
                Active Markets: {activeMarketCount}
              </div>
            </PanelBox>
            <PanelBox style={{ border: salesManagerCount > 0 ? `1px solid ${T.mint}55` : `1px solid ${T.border}` }}>
              <div style={{ fontSize: '12px', color: T.muted, marginBottom: '4px' }}>Sales Effectiveness</div>
              <div style={{ fontSize: '24px', color: salesManagerCount > 0 ? T.mint : T.faint, fontFamily: 'monospace' }}>
                +{Math.min(16, Math.min(salesManagerCount, activeMarketCount) * 4)}%
              </div>
              <div style={{ fontSize: '11px', color: T.faint, marginTop: '4px' }}>
                from Sales Managers
              </div>
            </PanelBox>
            <PanelBox>
              <div style={{ fontSize: '12px', color: T.muted, marginBottom: '4px' }}>Brand Reputation</div>
              <div style={{ fontSize: '24px', color: T.gold, fontFamily: 'monospace' }}>
                {company.reputation} <span style={{ fontSize: '14px', color: T.muted }}>/ 100</span>
              </div>
            </PanelBox>
          </div>

          {/* Markets & Allocations */}
          {marketLoading ? (
            <div style={{ color: T.muted, fontSize: '12px', padding: '24px' }}>Loading market data...</div>
          ) : (
            <>
              {/* Models / Pricing */}
              {models.length === 0 ? (
                <EmptyState icon="📋" title="No models available" subtitle="Design and launch a vehicle model first to sell vehicles." action={<GhostButton onClick={() => setDeskTab('design')}>Go to R&D / Design</GhostButton>} />
              ) : (
                <PanelBox>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Inventory &amp; Pricing</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {models.filter((m: any) => m.development_status === 'launched').map((m: any) => {
                      const invRow = inventory.find((inv: any) => inv.vehicle_model_id === m.id);
                      return (
                        <div key={m.id} style={{ border: `1px solid ${T.border}`, padding: '14px', background: 'rgba(0,0,0,0.2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: T.gold }}>{m.name}</span>
                              <span style={{ fontSize: '11px', color: T.muted, marginLeft: '8px' }}>{m.vehicle_class} · {m.target_segment}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '11px', color: T.muted }}>Base Cost: {fm(m.manufacturing_cost_per_unit)}</span>
                              <span style={{ fontSize: '11px', color: T.muted, marginLeft: '12px' }}>Sale Price:</span>
                              <input
                                type="number"
                                defaultValue={m.sale_price}
                                value={priceEdits[m.id] !== undefined ? priceEdits[m.id] : m.sale_price}
                                onChange={e => setPriceEdits(prev => ({ ...prev, [m.id]: Number(e.target.value) }))}
                                style={{ width: '100px', padding: '4px 8px', background: '#0e0e0e', border: `1px solid ${T.border}`, color: T.gold, fontSize: '12px', fontFamily: 'monospace' }}
                              />
                              <GhostButton color={T.mint} disabled={savingPrice === m.id} onClick={() => handleSavePrice(m.id)}>
                                {savingPrice === m.id ? 'Saving...' : 'Save Price'}
                              </GhostButton>
                            </div>
                          </div>

                          {/* Allocation UI */}
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px dashed ${T.border}` }}>
                            <div style={{ fontSize: '12px', color: T.muted, marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Inventory Central Stock: <strong style={{ color: T.ivory }}>{invRow?.units_in_stock || 0}</strong></span>
                              <span>Storage Cost: <span style={{ color: T.red }}>{fm(invRow?.storage_cost_per_arc || 0)} / Arc</span></span>
                            </div>

                            {marketData?.markets?.map((market: any) => {
                              const formKey = `${m.id}-${market.id}`;
                              const alloc = allocationForm[formKey] || { units: 0, tier: 'none' };
                              const brand = marketData.brandData?.find((b: any) => b.region_market_id === market.id);

                              return (
                                <div key={market.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px dotted #1a1a1a` }}>
                                  <div style={{ width: '300px' }}>
                                    <div style={{ fontSize: '12px', color: T.ivory, marginBottom: '8px' }}>{market.name}</div>
                                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
                                      <div style={{ fontSize: '10px', color: T.gold, fontWeight: 700, marginBottom: '6px' }}>LOCAL BRAND POSITION — {market.name}</div>
                                      {brand ? (() => {
                                        const awText = brand.awareness >= 50 ? 'Established' : (brand.awareness >= 15 ? 'Recognised' : 'New');
                                        const trText = brand.reputation >= 60 ? 'Trusted' : (brand.reputation >= 20 ? 'Developing' : 'Unproven');

                                        const arcRes = marketData.recentBrandResults?.find((r: any) => r.region_market_id === market.id);

                                        const formatDelta = (d: number) => {
                                          if (!d || d === 0) return 'No Change';
                                          return d > 0 ? `+${d.toFixed(1)}` : `${d.toFixed(1)}`;
                                        };

                                        const awDeltaStr = arcRes ? formatDelta(Number(arcRes.awareness_delta)) : 'No Change';
                                        const trDeltaStr = arcRes ? formatDelta(Number(arcRes.trust_delta)) : 'No Change';

                                        let mainDriver = 'Brand metrics maintained previous levels.';
                                        if (arcRes) {
                                          if (Number(arcRes.trust_delta) < 0 && arcRes.primary_trust_reason === 'Defective Products') {
                                            mainDriver = 'Production defects reduced buyer trust this Arc.';
                                          } else if (Number(arcRes.trust_delta) > 0) {
                                            mainDriver = 'Reliable deliveries supported gradual local trust growth.';
                                          } else if (Number(arcRes.awareness_delta) > 0) {
                                            mainDriver = 'Marketing and completed deliveries increased local awareness.';
                                          }
                                        }

                                        return (
                                          <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ color: T.muted }}>Local Brand Awareness:</span>
                                              <span style={{ color: T.ivory }}>{awText}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ color: T.muted }}>Local Brand Trust:</span>
                                              <span style={{ color: T.ivory }}>{trText}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ color: T.muted }}>Last Arc Awareness Change:</span>
                                              <span style={{ color: awDeltaStr.startsWith('+') ? T.mint : (awDeltaStr.startsWith('-') ? T.red : T.faint) }}>{awDeltaStr}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ color: T.muted }}>Last Arc Trust Change:</span>
                                              <span style={{ color: trDeltaStr.startsWith('+') ? T.mint : (trDeltaStr.startsWith('-') ? T.red : T.faint) }}>{trDeltaStr}</span>
                                            </div>
                                            <div style={{ marginTop: '4px', fontStyle: 'italic', color: T.faint, fontSize: '10px' }}>
                                              Main Brand Driver:<br />{mainDriver}
                                            </div>
                                          </div>
                                        );
                                      })() : (
                                        <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: T.muted }}>Local Brand Awareness:</span>
                                            <span style={{ color: T.ivory }}>New to This Market</span>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: T.muted }}>Local Brand Trust:</span>
                                            <span style={{ color: T.ivory }}>Unproven</span>
                                          </div>
                                          <div style={{ marginTop: '4px', fontStyle: 'italic', color: T.faint, fontSize: '10px' }}>
                                            Main Brand Driver:<br />New to This Market. Local awareness and trust will develop after operating here.
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '11px', color: T.muted }}>Units:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={alloc.units}
                                        onChange={e => setAllocationForm(prev => ({ ...prev, [formKey]: { ...alloc, units: Number(e.target.value) } }))}
                                        style={{ width: '80px', padding: '4px 8px', background: '#0e0e0e', border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px', fontFamily: 'monospace' }}
                                      />
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '11px', color: T.muted }}>Marketing:</span>
                                      <select
                                        value={alloc.tier}
                                        onChange={e => setAllocationForm(prev => ({ ...prev, [formKey]: { ...alloc, tier: e.target.value } }))}
                                        style={{ width: '100px', padding: '4px', background: '#0e0e0e', border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }}
                                      >
                                        <option value="none">None</option>
                                        <option value="local">Local</option>
                                        <option value="regional">Regional</option>
                                        <option value="national">National</option>
                                      </select>
                                    </div>

                                    <GhostButton onClick={() => handleSaveAllocation(m.id, market.id)}>Update Allocation</GhostButton>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </PanelBox>
              )}

              {/* Market Intelligence */}
              <PanelBox>
                <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Market Intelligence</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {marketData?.markets?.map((market: any) => (
                    <div key={market.id} style={{ border: `1px solid ${T.border}`, padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: T.gold, marginBottom: '8px' }}>{market.name}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                        <div style={{ color: T.muted }}>Population: <span style={{ color: T.ivory }}>{Number(market.population).toLocaleString()}</span></div>
                        <div style={{ color: T.muted }}>Avg Income: <span style={{ color: T.ivory }}>{fm(market.average_income)}</span></div>
                        <div style={{ color: T.muted }}>Market Tier: <span style={{ color: T.ivory }}>{market.market_tier}</span></div>
                        <div style={{ color: T.muted }}>Competition: <span style={{ color: T.red }}>{market.competition_level}</span></div>
                      </div>
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px dotted ${T.border}`, display: 'flex', gap: '12px', fontSize: '11px' }}>
                        <span style={{ color: T.muted }}>Compact: {Math.round(market.preference_compact * 100)}%</span>
                        <span style={{ color: T.muted }}>Sedan: {Math.round(market.preference_sedan * 100)}%</span>
                        <span style={{ color: T.muted }}>Van: {Math.round(market.preference_utility_van * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </PanelBox>

              {/* Population Purchase Outlook */}
              {marketData?.forecast && marketData.forecast.length > 0 && (
                <PanelBox>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Population Purchase Outlook</div>
                  <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: T.muted, borderBottom: `1px solid ${T.border}` }}>
                        <th style={{ padding: '8px 4px' }}>Model</th>
                        <th style={{ padding: '8px 4px' }}>Market</th>
                        <th style={{ padding: '8px 4px' }}>Allocated</th>
                        <th style={{ padding: '8px 4px' }}>Households</th>
                        <th style={{ padding: '8px 4px' }}>Buyers (Capacity)</th>
                        <th style={{ padding: '8px 4px' }}>Expected Interest</th>
                        <th style={{ padding: '8px 4px', color: T.gold }}>Est. Sold</th>
                        <th style={{ padding: '8px 4px' }}>Affordability</th>
                        <th style={{ padding: '8px 4px' }}>Fit</th>
                        <th style={{ padding: '8px 4px' }}>Local Brand Awareness</th>
                        <th style={{ padding: '8px 4px' }}>Local Brand Trust</th>
                        <th style={{ padding: '8px 4px' }}>Distribution</th>
                        <th style={{ padding: '8px 4px' }}>Marketing</th>
                        <th style={{ padding: '8px 4px' }}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketData.forecast.map((fc: any, idx: number) => {
                        const mName = models.find((m: any) => m.id === fc.alloc.vehicle_model_id)?.name || 'Unknown Model';
                        const mktName = marketData.markets?.find((m: any) => m.id === fc.alloc.region_market_id)?.name || 'Unknown Market';

                        const getStr = (val: number, thresholds: number[], labels: string[]) => {
                          if (val < thresholds[0]) return labels[0];
                          if (val < thresholds[1]) return labels[1];
                          return labels[2];
                        };

                        const affStr = getStr(fc.affordability, [0.4, 0.8], ['Weak', 'Moderate', 'Strong']);
                        const fitStr = getStr(fc.fitMultiplier, [0.6, 0.9], ['Weak', 'Moderate', 'Strong']);
                        const brand = marketData.brandData?.find((b: any) => b.region_market_id === fc.alloc.region_market_id);
                        const localAw = brand ? brand.awareness : 0;
                        const localTr = brand ? brand.reputation : 0;
                        const awrStr = localAw >= 50 ? 'Established' : (localAw >= 15 ? 'Recognised' : 'New');
                        const trsStr = localTr >= 60 ? 'Trusted' : (localTr >= 20 ? 'Developing' : 'Unproven');
                        const distStr = getStr(fc.distMult, [0.5, 0.8], ['Limited', 'Standard', 'Strong']);

                        return (
                          <tr key={idx} style={{ borderBottom: `1px solid #1a1a1a` }}>
                            <td style={{ padding: '8px 4px', color: T.ivory }}>{mName}</td>
                            <td style={{ padding: '8px 4px', color: T.ivory }}>{mktName}</td>
                            <td style={{ padding: '8px 4px', color: T.muted }}>{fc.alloc.units_allocated}</td>
                            <td style={{ padding: '8px 4px', color: T.muted }}>{fc.totalHouseholds.toLocaleString()}</td>
                            <td style={{ padding: '8px 4px', color: T.muted }}>{fc.marketPurchaseCapacity.toLocaleString()}</td>
                            <td style={{ padding: '8px 4px', color: T.ivory }}>{Math.round(fc.rawBuyerInterest)}</td>
                            <td style={{ padding: '8px 4px', color: T.mint, fontWeight: 700 }}>{fc.unitsSold}</td>
                            <td style={{ padding: '8px 4px', color: affStr === 'Weak' ? T.red : T.muted }}>{affStr}</td>
                            <td style={{ padding: '8px 4px', color: fitStr === 'Weak' ? T.red : T.muted }}>{fitStr}</td>
                            <td style={{ padding: '8px 4px', color: awrStr === 'New' ? T.red : T.muted }}>{awrStr}</td>
                            <td style={{ padding: '8px 4px', color: trsStr === 'Unproven' ? T.red : T.muted }}>{trsStr}</td>
                            <td style={{ padding: '8px 4px', color: distStr === 'Limited' ? T.red : T.muted }}>{distStr}</td>
                            <td style={{ padding: '8px 4px', color: T.muted, textTransform: 'capitalize' }}>{fc.mktTier}</td>
                            <td style={{ padding: '8px 4px', color: T.gold }}>{fc.mainReasonCode}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ fontSize: '10px', color: T.faint, marginTop: '8px', fontStyle: 'italic' }}>*Brand metrics are local to this market.</div>
                </PanelBox>
              )}

              {/* Recent Sales Results */}
              {marketData?.recentSales && marketData.recentSales.length > 0 && (
                <PanelBox>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Recent Sales Results</div>
                  <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: T.muted, borderBottom: `1px solid ${T.border}` }}>
                        <th style={{ padding: '8px 4px' }}>Model</th>
                        <th style={{ padding: '8px 4px' }}>Market</th>
                        <th style={{ padding: '8px 4px' }}>Sold</th>
                        <th style={{ padding: '8px 4px' }}>Demand</th>
                        <th style={{ padding: '8px 4px' }}>Capture</th>
                        <th style={{ padding: '8px 4px' }}>Affordability</th>
                        <th style={{ padding: '8px 4px' }}>Fit</th>
                        <th style={{ padding: '8px 4px' }}>Awareness</th>
                        <th style={{ padding: '8px 4px' }}>Result Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketData.recentSales.slice(0, 15).map((rs: any) => {
                        const mName = models.find((m: any) => m.id === rs.vehicle_model_id)?.name || 'Unknown Model';
                        const mktName = marketData.markets?.find((m: any) => m.id === rs.region_market_id)?.name || 'Unknown Market';
                        return (
                          <tr key={rs.id} style={{ borderBottom: `1px solid #1a1a1a` }}>
                            <td style={{ padding: '8px 4px', color: T.gold }}>{mName}</td>
                            <td style={{ padding: '8px 4px', color: T.ivory }}>{mktName}</td>
                            <td style={{ padding: '8px 4px', color: T.mint, fontWeight: 700 }}>{rs.units_sold}</td>
                            <td style={{ padding: '8px 4px', color: T.faint }}>{Math.round(rs.raw_buyer_interest || 0)}</td>
                            <td style={{ padding: '8px 4px', color: T.ivory }}>{Math.round((rs.market_share_estimate || 0) * 100)}%</td>
                            <td style={{ padding: '8px 4px', color: rs.affordability_multiplier < 0.6 ? T.red : T.muted }}>{rs.affordability_multiplier || '-'}</td>
                            <td style={{ padding: '8px 4px', color: rs.vehicle_market_fit_multiplier < 0.6 ? T.red : T.muted }}>{rs.vehicle_market_fit_multiplier || '-'}</td>
                            <td style={{ padding: '8px 4px', color: rs.awareness_multiplier < 0.3 ? T.red : T.muted }}>{rs.awareness_multiplier || '-'}</td>
                            <td style={{ padding: '8px 4px', color: T.faint }}>{rs.main_reason_code || 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </PanelBox>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          STAFFING TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SectionHeader stamp="STAFFING DESK">Company Workforce</SectionHeader>

          {plannedUnits === 0 && (
            <div style={{ background: 'rgba(184,85,85,0.1)', border: `1px solid ${T.red}`, padding: '12px', borderRadius: '2px', color: T.ivory, fontSize: '12px' }}>
              <span style={{ fontWeight: 700, color: T.red, marginRight: '8px' }}>⚠ No active production plan.</span>
              Create a production plan to see workforce requirements. Workers will not produce vehicles without an active target.
            </div>
          )}

          {/* Top Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <PanelBox style={{ padding: '12px' }}>
              <div style={{ color: T.muted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Staff</div>
              <div style={{ color: T.ivory, fontSize: '18px', fontWeight: 700 }}>{totalStaff}</div>
              <div style={{ color: T.red, fontSize: '11px', fontFamily: 'monospace', marginTop: '4px' }}>{fm(totalWagesPerArc)} / Arc</div>
            </PanelBox>
            <PanelBox style={{ padding: '12px', border: `1px solid ${totalWorkers < recWorkers ? T.red : T.border}` }}>
              <div style={{ color: T.muted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Factory Workers</div>
              <div style={{ color: totalWorkers >= recWorkers ? T.mint : T.red, fontSize: '18px', fontWeight: 700 }}>
                {totalWorkers} <span style={{ color: T.faint, fontSize: '14px' }}>/ {recWorkers}</span>
              </div>
              <div style={{ color: T.muted, fontSize: '11px', marginTop: '4px' }}>
                {totalWorkers >= recWorkers ? 'Adequately Staffed' : 'Understaffed'}
              </div>
            </PanelBox>
            <PanelBox style={{ padding: '12px' }}>
              <div style={{ color: T.muted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Prod Efficiency</div>
              <div style={{ color: T.ivory, fontSize: '18px', fontWeight: 700 }}>
                {Math.round(Math.min(1.0, recWorkers === 0 ? 1 : totalWorkers / recWorkers) * 100)}%
              </div>
              <div style={{ color: T.mint, fontSize: '11px', marginTop: '4px' }}>
                +{Math.min(supervisorCount, activeLinesCount) > 0 ? 5 : 0}% Supervisor Bonus
              </div>
            </PanelBox>
            <PanelBox style={{ padding: '12px' }}>
              <div style={{ color: T.muted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Sales Effectiveness</div>
              <div style={{ color: T.ivory, fontSize: '18px', fontWeight: 700 }}>
                +{Math.min(16, Math.min(salesManagerCount, activeMarketCount) * 4)}%
              </div>
              <div style={{ color: T.muted, fontSize: '11px', marginTop: '4px' }}>
                {Math.min(salesManagerCount, activeMarketCount)} Managers in {activeMarketCount} Active Markets
              </div>
            </PanelBox>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {staffRoles.map((roleDef: any) => {
              const employed = staff.find((s: any) => s.role === roleDef.id)?.quantity || 0;

              // Compute effect text
              let effectText = '';
              let effectColor = T.muted;
              if (roleDef.id === 'factory-worker') {
                const pct = recWorkers > 0 ? Math.round((employed / recWorkers) * 100) : 100;
                effectText = `${employed} / ${recWorkers} required (${pct}% coverage)`;
                effectColor = employed >= recWorkers ? T.mint : T.red;
                if (recWorkers === 0) effectText = 'At capacity (no active lines)';
              } else if (roleDef.id === 'production-supervisor') {
                const bonus = Math.min(employed, activeLinesCount) > 0 ? 5 : 0;
                effectText = activeLinesCount === 0 ? 'No benefit — no active lines' : `+${bonus}% production efficiency`;
                effectColor = bonus > 0 ? T.mint : T.muted;
              } else if (roleDef.id === 'quality-inspector') {
                // assume base defect rate is roughly 3% for display
                const baseDefect = 3.0;
                const reduction = Math.min(employed * 0.5, baseDefect - 0.5);
                const effective = Math.max(0.5, baseDefect - reduction);
                effectText = `-${reduction.toFixed(1)}% defect rate (effective ~${effective.toFixed(1)}%)`;
                effectColor = reduction > 0 ? T.mint : T.muted;
              } else if (roleDef.id === 'sales-manager') {
                const useful = Math.min(employed, activeMarketCount);
                const bonus = useful * 4;
                effectText = `+${bonus}% sales effectiveness (${useful} markets covered)`;
                effectColor = bonus > 0 ? T.mint : T.muted;
              } else if (roleDef.id === 'automotive-engineer') {
                const discount = Math.min(employed * 5, 20);
                effectText = `-${discount}% future development cost`;
                effectColor = discount > 0 ? T.mint : T.muted;
              }

              return (
                <PanelBox key={roleDef.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{roleDef.label}</div>
                      <div style={{ fontSize: '11px', color: T.red, fontFamily: 'monospace' }}>{fm(roleDef.wagePerArc)} / Arc</div>
                    </div>
                    <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px', maxWidth: '600px', lineHeight: 1.5 }}>
                      {roleDef.desc || 'No description available.'}
                    </div>
                    <div style={{ fontSize: '11px', color: effectColor, fontWeight: 600 }}>
                      Current Effect: {effectText}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right', paddingRight: '16px', borderRight: `1px dotted ${T.border}` }}>
                      <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employed</div>
                      <div style={{ fontSize: '20px', color: T.gold, fontWeight: 700 }}>{employed}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '110px' }}>
                      <GhostButton color={T.mint} onClick={() => handleHireFire(roleDef.id, 'hire')} style={{ width: '100%', padding: '6px' }}>+ Hire 1</GhostButton>
                      <GhostButton color={T.red} disabled={employed === 0} onClick={() => handleHireFire(roleDef.id, 'fire')} style={{ width: '100%', padding: '6px' }}>- Dismiss 1</GhostButton>
                    </div>
                  </div>
                </PanelBox>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          FINANCE TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'finance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SectionHeader stamp="FINANCE DESK">Company Financials</SectionHeader>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Finance Summary */}
            <PanelBox>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Current Position</div>
              <FieldRow label="Available Cash" value={fm(finances?.available_cash || 0)} valueColor={T.mint} />
              <FieldRow label="Company Value" value={finances?.company_value ? fm(finances.company_value) : 'Not Available'} />
              <FieldRow label="Factory Asset Value" value={factories.length > 0 ? fm(factories.reduce((sum: number, f: any) => sum + (Number(f.capacity_per_arc) * 1000), 0)) : 'Not Available'} />
              <FieldRow label="Inventory Value" value={fm(inventoryValue)} />
              <FieldRow label="Last Arc Revenue" value={finances?.last_arc_profit !== undefined ? (latestReport ? fm(latestReport.gross_revenue) : fm(0)) : 'Not Available'} valueColor={T.mint} />
              <FieldRow label="Last Arc Operating Profit" value={finances?.last_arc_profit !== undefined ? (latestReport ? fm(Number(latestReport.gross_revenue) - Number(latestReport.production_costs) - Number(latestReport.factory_lease_costs) - Number(latestReport.factory_maintenance_costs) - Number(latestReport.staff_wages) - Number(latestReport.inventory_storage_costs) - Number(latestReport.marketing_costs) - Number(latestReport.warranty_reserve_cost || 0)) : fm(0)) : 'Not Available'} />
              <FieldRow label="Last Arc Net Profit" value={finances?.last_arc_profit !== undefined ? fm(finances.last_arc_profit) : 'Not Available'} valueColor={(finances?.last_arc_profit || 0) < 0 ? T.red : T.mint} />
              <FieldRow label="Outstanding Debt" value={finances?.debt && Number(finances.debt) > 0 ? fm(finances.debt) : 'No debt recorded'} valueColor={(finances?.debt || 0) > 0 ? T.red : T.faint} />
            </PanelBox>

            {/* Next Arc Commitments */}
            <PanelBox>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Next Arc Commitments</div>
              <div style={{ fontSize: '12px', color: T.muted, marginBottom: '12px' }}>Estimated recurring costs for the upcoming Arc.</div>
              <FieldRow label="Factory Lease Cost" value={fm(leaseCostPerArc)} valueColor={T.red} />
              <FieldRow label="Factory Maintenance" value={fm(maintCostPerArc)} valueColor={T.red} />
              <FieldRow label="Workforce Wages" value={fm(totalWagesPerArc)} valueColor={T.red} />

              {/* Calculate active marketing spend */}
              <FieldRow label="Active Marketing Spend" value={fm(
                marketData?.allocations?.reduce((acc: number, alloc: any) => {
                  return acc + (MKT_COSTS[alloc.marketing_tier] || 0);
                }, 0) || 0
              )} valueColor={T.red} />

              {/* Estimate inventory storage cost */}
              <FieldRow label="Inventory Storage Cost Estimate" value={fm(
                inventory.reduce((acc: number, inv: any) => acc + (Number(inv.units_in_stock) * STORAGE_COST_PER_UNIT), 0)
              )} valueColor={T.red} />

              {/* Estimate production cost */}
              <FieldRow label="Production Cost Estimate" value={fm(
                productionLines.reduce((acc: number, line: any) => acc + (Number(line.target_units_per_arc) * Number(line.model_cost_per_unit || 0)), 0)
              )} valueColor={T.red} />

              <FieldRow label="Vehicle Development Cost" value={fm(0)} valueColor={T.faint} />
              <FieldRow label="Research Cost" value={fm(0)} valueColor={T.faint} />

              <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: `1px solid ${T.border}` }}>
                <FieldRow label="Estimated Total Next Arc Cost" value={fm(
                  leaseCostPerArc + maintCostPerArc + totalWagesPerArc +
                  (marketData?.allocations?.reduce((acc: number, alloc: any) => {
                    return acc + (MKT_COSTS[alloc.marketing_tier] || 0);
                  }, 0) || 0) +
                  inventory.reduce((acc: number, inv: any) => acc + (Number(inv.units_in_stock) * STORAGE_COST_PER_UNIT), 0) +
                  productionLines.reduce((acc: number, line: any) => acc + (Number(line.target_units_per_arc) * Number(line.model_cost_per_unit || 0)), 0)
                )} valueColor={T.red} />
              </div>
              <div style={{ marginTop: '8px', fontSize: '10px', color: T.faint, fontStyle: 'italic' }}>
                * Final costs and revenue are calculated at Arc Close.
              </div>
            </PanelBox>
          </div>

          {/* Last Arc Profit and Loss */}
          <PanelBox>
            <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Last Arc Profit and Loss</div>
            {latestReport ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: T.gold, borderBottom: `1px solid ${T.border}`, paddingBottom: '4px', marginBottom: '8px' }}>Revenue</div>
                  <FieldRow label="Vehicle Sales Revenue" value={fm(latestReport.gross_revenue)} valueColor={T.mint} />
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: T.gold, borderBottom: `1px solid ${T.border}`, paddingBottom: '4px', marginBottom: '8px' }}>Cost of Goods Sold</div>
                  <FieldRow label="Vehicle Production Cost" value={fm(latestReport.production_costs)} valueColor={T.red} />
                  <FieldRow label="Defective Unit Losses" value={fm(0)} valueColor={Number(latestReport.defective_units) > 0 ? T.red : T.muted} />
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: T.gold, borderBottom: `1px solid ${T.border}`, paddingBottom: '4px', marginBottom: '8px' }}>Operating Expenses</div>
                  <FieldRow label="Factory Lease" value={fm(latestReport.factory_lease_costs)} valueColor={T.red} />
                  <FieldRow label="Factory Maintenance" value={fm(latestReport.factory_maintenance_costs)} valueColor={T.red} />
                  <FieldRow label="Manufacturing Wages" value={fm(latestReport.staff_wages)} valueColor={T.red} />
                  <FieldRow label="Marketing Expense" value={fm(latestReport.marketing_costs)} valueColor={T.red} />
                  <FieldRow label="Inventory Storage Cost" value={fm(latestReport.inventory_storage_costs)} valueColor={T.red} />
                  <FieldRow label="Warranty Reserve" value={fm(latestReport.warranty_reserve_cost || 0)} valueColor={T.red} />
                  <FieldRow label="Vehicle Development Expense" value={fm(0)} valueColor={T.muted} />
                  <FieldRow label="Research Expense" value={fm(0)} valueColor={T.muted} />
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: T.gold, borderBottom: `1px solid ${T.border}`, paddingBottom: '4px', marginBottom: '8px' }}>Result</div>
                  <FieldRow label="Operating Profit" value={fm(Number(latestReport.gross_revenue) - Number(latestReport.production_costs) - Number(latestReport.factory_lease_costs) - Number(latestReport.factory_maintenance_costs) - Number(latestReport.staff_wages) - Number(latestReport.inventory_storage_costs) - Number(latestReport.marketing_costs) - Number(latestReport.warranty_reserve_cost || 0))} valueColor={Number(latestReport.gross_revenue) - Number(latestReport.production_costs) - Number(latestReport.factory_lease_costs) - Number(latestReport.factory_maintenance_costs) - Number(latestReport.staff_wages) - Number(latestReport.inventory_storage_costs) - Number(latestReport.marketing_costs) - Number(latestReport.warranty_reserve_cost || 0) >= 0 ? T.mint : T.red} />
                  <FieldRow label="Net Profit / Loss" value={fm(latestReport.net_profit)} valueColor={Number(latestReport.net_profit) >= 0 ? T.mint : T.red} />
                  <FieldRow label="Ending Cash" value={fm(latestReport.ending_cash)} valueColor={T.mint} />
                </div>
              </div>
            ) : (
              <EmptyState
                icon="📊"
                title="No financial activity has been recorded yet."
                subtitle="Your first report will appear after production and sales resolve at Arc Close."
              />
            )}
          </PanelBox>

          {/* Ledger */}
          <PanelBox>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory }}>Manufacturing Ledger</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['All', 'Revenue', 'Production', 'Workforce', 'Factory', 'Marketing', 'Storage', 'Development'].map(filter => (
                  <button key={filter} onClick={() => setLedgerFilter(filter)} style={{
                    background: ledgerFilter === filter ? 'rgba(212,175,55,0.2)' : 'transparent',
                    color: ledgerFilter === filter ? T.gold : T.muted,
                    border: `1px solid ${ledgerFilter === filter ? T.gold : T.border}`,
                    padding: '4px 8px', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer'
                  }}>
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {!ledger || ledger.length === 0 ? (
              <div style={{ fontSize: '12px', color: T.faint }}>No financial records yet.</div>
            ) : (
              <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.muted }}>
                    <th style={{ padding: '8px' }}>Date / Arc</th>
                    <th style={{ padding: '8px' }}>Entry Type</th>
                    <th style={{ padding: '8px' }}>Description</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.filter((entry: any) => {
                    if (ledgerFilter === 'All') return true;
                    if (ledgerFilter === 'Revenue') return entry.entry_type.includes('revenue');
                    if (ledgerFilter === 'Production') return entry.entry_type.includes('production');
                    if (ledgerFilter === 'Workforce') return entry.entry_type.includes('wage');
                    if (ledgerFilter === 'Factory') return entry.entry_type.includes('factory');
                    if (ledgerFilter === 'Marketing') return entry.entry_type.includes('marketing');
                    if (ledgerFilter === 'Storage') return entry.entry_type.includes('storage');
                    if (ledgerFilter === 'Development') return entry.entry_type.includes('development');
                    return true;
                  }).map((entry: any) => (
                    <tr key={entry.id} style={{ borderBottom: `1px solid #1a1a1a` }}>
                      <td style={{ padding: '8px', color: T.muted, whiteSpace: 'nowrap' }}>O{entry.game_orbit} A{entry.game_arc}</td>
                      <td style={{ padding: '8px', color: T.faint, whiteSpace: 'nowrap' }}>{entry.entry_type.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '8px', color: T.ivory }}>{entry.description}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: Number(entry.amount) >= 0 ? T.mint : T.red, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {Number(entry.amount) > 0 ? '+' : ''}{Number(entry.amount).toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: T.muted, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{Number(entry.balance_after).toLocaleString('en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </PanelBox>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          RECORDS TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'records' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SectionHeader stamp="COMPANY RECORDS">Activity History</SectionHeader>
          <PanelBox>
            {(!records || records.length === 0) && (!allReports || allReports.length === 0) ? (
              <EmptyState
                icon="📖"
                title="No manufacturing records exist yet."
                subtitle="Lease a factory, design a vehicle, or create a production plan to begin your company history."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  ...(records || []).map((r: any) => ({ ...r, _is_arc_report: false })),
                  ...(allReports || []).map((r: any) => ({
                    ...r,
                    _is_arc_report: true,
                    record_type: 'Arc Report',
                    created_at_world_orbit: r.world_orbit,
                    created_at_world_arc: r.world_arc,
                  }))
                ]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((record: any) => {
                    const isArcReport = record._is_arc_report;
                    const orbit = record.created_at_world_orbit;
                    const arc = record.created_at_world_arc;

                    return (
                      <div key={record.id + (isArcReport ? '_report' : '_rec')} style={{
                        display: 'flex', gap: '16px', padding: '12px 0', borderBottom: `1px solid ${T.border}`,
                        cursor: isArcReport ? 'pointer' : 'default',
                        background: isArcReport ? 'rgba(255,255,255,0.02)' : 'transparent',
                      }} onClick={() => {
                        if (isArcReport) {
                          setSelectedArcReportId(record.id);
                        }
                      }}>
                        <div style={{ width: '80px', color: T.muted, fontFamily: 'monospace', fontSize: '11px', paddingTop: '2px' }}>
                          O{orbit} A{arc}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10px', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{record.record_type}</span>
                            <span style={{ fontSize: '13px', color: T.ivory, fontWeight: 600 }}>{record.summary.split(':')[0]}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: T.muted, lineHeight: 1.5 }}>
                            {record.summary.includes(':') ? record.summary.substring(record.summary.indexOf(':') + 1).trim() : record.summary}
                          </div>
                          {isArcReport && (
                            <div style={{ fontSize: '10px', color: T.blue, marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Click to view full Arc report ➔
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </PanelBox>

          {/* Arc Report Detail View Modal */}
          {selectedArcReportId && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedArcReportId(null)}>
              <div style={{ background: T.bg, border: `1px solid ${T.border}`, padding: '24px', width: '100%', maxWidth: '800px', borderRadius: '4px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                {(() => {
                  const r = allReports.find((r: any) => r.id === selectedArcReportId);
                  if (!r) return <div style={{ color: T.red }}>Report not found.</div>;

                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: `1px solid ${T.border}`, paddingBottom: '16px' }}>
                        <div>
                          <h2 style={{ margin: 0, color: T.gold, fontSize: '20px' }}>Arc Report</h2>
                          <div style={{ color: T.muted, fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>Orbit {r.world_orbit} / Arc {r.world_arc}</div>
                        </div>
                        <GhostButton onClick={() => setSelectedArcReportId(null)}>Close</GhostButton>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '12px' }}>Production</div>
                          <FieldRow label="Planned Units" value={r.planned_units} />
                          <FieldRow label="Actual Units Produced" value={r.units_produced} />
                          <FieldRow label="Defective Units" value={r.defective_units} valueColor={Number(r.defective_units) > 0 ? T.red : T.ivory} />
                          <FieldRow label="Production Efficiency" value={`${Math.round(Number(r.production_efficiency) * 100)}%`} valueColor={Number(r.production_efficiency) >= 1 ? T.mint : T.ivory} />
                          <FieldRow label="Factory Condition" value={`${r.factory_condition || 100}%`} />
                          <FieldRow label="Factory Workers Required" value={r.factory_workers_required} />
                          <FieldRow label="Factory Workers Available" value={r.factory_workers_available} />
                          <FieldRow label="Supervisor Bonus" value={`${r.supervisor_bonus}%`} valueColor={Number(r.supervisor_bonus) > 0 ? T.mint : T.ivory} />
                          <FieldRow label="Inspector Defect Reduction" value={`${r.inspector_defect_reduction}%`} valueColor={Number(r.inspector_defect_reduction) > 0 ? T.mint : T.ivory} />
                        </div>

                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '12px' }}>Sales</div>
                          <FieldRow label="Units Allocated" value={Number(r.units_sold) + Number(r.units_unsold)} />
                          <FieldRow label="Units Sold" value={r.units_sold} valueColor={T.mint} />
                          <FieldRow label="Unsold Units" value={r.units_unsold} valueColor={Number(r.units_unsold) > 0 ? T.red : T.ivory} />
                          <FieldRow label="Markets Used" value={marketData?.allocations?.length || 1} />
                          <FieldRow label="Sale Revenue" value={fm(r.sales_revenue || r.gross_revenue)} valueColor={T.mint} />
                          <FieldRow label="Sales Manager Bonus" value={`${r.sales_manager_bonus || 0}%`} valueColor={Number(r.sales_manager_bonus) > 0 ? T.mint : T.ivory} />
                          <FieldRow label="Marketing Spend" value={fm(r.marketing_costs)} valueColor={T.red} />
                          <FieldRow label="Storage Cost" value={fm(r.inventory_storage_costs)} valueColor={T.red} />
                        </div>

                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '12px' }}>Finance</div>
                          <FieldRow label="Production Cost" value={fm(r.production_costs)} valueColor={T.red} />
                          <FieldRow label="Lease" value={fm(r.factory_lease_costs)} valueColor={T.red} />
                          <FieldRow label="Maintenance" value={fm(r.factory_maintenance_costs)} valueColor={T.red} />
                          <FieldRow label="Wages" value={fm(r.staff_wages)} valueColor={T.red} />
                          <FieldRow label="Marketing" value={fm(r.marketing_costs)} valueColor={T.red} />
                          <FieldRow label="Storage" value={fm(r.inventory_storage_costs)} valueColor={T.red} />
                          <FieldRow label="Warranty" value={fm(r.warranty_reserve_cost || 0)} valueColor={T.red} />
                          <FieldRow label="Total Expenses" value={fm(Number(r.production_costs) + Number(r.factory_lease_costs) + Number(r.factory_maintenance_costs) + Number(r.staff_wages) + Number(r.marketing_costs) + Number(r.inventory_storage_costs) + Number(r.warranty_reserve_cost || 0))} valueColor={T.red} />
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${T.border}` }}>
                            <FieldRow label="Net Profit / Loss" value={fm(r.net_profit)} valueColor={Number(r.net_profit) >= 0 ? T.mint : T.red} />
                            <FieldRow label="Ending Cash" value={fm(r.ending_cash)} valueColor={T.mint} />
                          </div>
                        </div>
                      </div>

                      {/* Local Brand Results */}
                      <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '12px' }}>Local Brand Results</div>
                        {(() => {
                          const arcBrandResults = brandResults.filter((br: any) => br.world_arc === r.world_arc);
                          if (!arcBrandResults || arcBrandResults.length === 0) return <div style={{ fontSize: '12px', color: T.muted }}>No brand impact recorded this Arc.</div>;
                          return (
                            <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ color: T.muted, borderBottom: `1px solid ${T.border}` }}>
                                  <th style={{ padding: '8px 4px' }}>Market</th>
                                  <th style={{ padding: '8px 4px' }}>Awareness Before → After</th>
                                  <th style={{ padding: '8px 4px' }}>Trust Before → After</th>
                                  <th style={{ padding: '8px 4px' }}>Effective Marketing</th>
                                  <th style={{ padding: '8px 4px' }}>Units Sold</th>
                                  <th style={{ padding: '8px 4px' }}>Weighted Reliability</th>
                                  <th style={{ padding: '8px 4px' }}>Weighted Defect Rate</th>
                                  <th style={{ padding: '8px 4px' }}>Main Awareness Driver</th>
                                  <th style={{ padding: '8px 4px' }}>Main Trust Driver</th>
                                </tr>
                              </thead>
                              <tbody>
                                {arcBrandResults.map((br: any, idx: number) => {
                                  const mktName = marketData?.markets?.find((m: any) => m.id === br.region_market_id)?.name || 'Unknown Market';
                                  return (
                                    <tr key={idx} style={{ borderBottom: `1px solid #1a1a1a` }}>
                                      <td style={{ padding: '8px 4px', color: T.ivory }}>{mktName}</td>
                                      <td style={{ padding: '8px 4px', color: T.ivory }}>{br.awareness_before} → {br.awareness_after}</td>
                                      <td style={{ padding: '8px 4px', color: T.ivory }}>{br.trust_before} → {br.trust_after}</td>
                                      <td style={{ padding: '8px 4px', color: T.muted, textTransform: 'capitalize' }}>{br.effective_marketing_tier} ({fm(br.market_marketing_spend)})</td>
                                      <td style={{ padding: '8px 4px', color: T.muted }}>{br.total_units_sold}</td>
                                      <td style={{ padding: '8px 4px', color: T.muted }}>{Math.round(br.weighted_reliability)}</td>
                                      <td style={{ padding: '8px 4px', color: T.muted }}>{(Number(br.weighted_defect_rate) * 100).toFixed(1)}%</td>
                                      <td style={{ padding: '8px 4px', color: T.gold }}>{br.primary_awareness_reason}</td>
                                      <td style={{ padding: '8px 4px', color: T.gold }}>{br.primary_trust_reason}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          EQUITY TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'equity' && (
        <div>
          <SectionHeader stamp="EQUITY DESK">Ownership &amp; Equity</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <PanelBox>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Current Ownership</div>
              <FieldRow label="Owner" value={characterName || 'You'} />
              <FieldRow label="Ownership" value="100%" valueColor={T.gold} />
              <FieldRow label="Legal Structure" value={company.legalStructure || company.legal_structure_id || 'Sole Trader'} />
              <FieldRow label="Company Value" value={fm(finances?.company_value || 0)} />
            </PanelBox>
            <PanelBox>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Share Issuance</div>
              <div style={{ fontSize: '12px', color: T.faint, lineHeight: 1.8 }}>
                <div>Share issuance — <span style={{ color: T.red }}>Locked</span></div>
                <div>IPO — <span style={{ color: T.red }}>Locked</span></div>
                <div>Investor system — Coming later</div>
              </div>
              <div style={{ marginTop: '16px', fontSize: '11px', color: T.faint, fontStyle: 'italic' }}>
                Equity and investor features will be added in a future phase. For now, this company is fully owned by you.
              </div>
            </PanelBox>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
