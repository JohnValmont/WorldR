"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { manufacturingApi, worldApi } from '../../../lib/api';
import EquityDeskTab from './EquityDeskTab';
import BoardDeskPanel from './BoardDeskPanel';
import { BrandMilestoneTracker } from './BrandMilestoneTracker';
import { formatWorldDate, formatWorldDateShort } from '@/lib/calendar';
import {
  Card, Button, StatCard, DataRow, EmptyState as UIEmptyState, Badge, StatusDot, SectionHeading, Tabs, ProgressBar
} from '@/components/ui';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import { LayoutDashboard, Factory, FlaskConical, ShoppingCart, Activity, BarChart3, Users, DollarSign, ScrollText, PieChart, Tags, Globe, LineChart, Info, Briefcase } from 'lucide-react';


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
  const safetyBudgetEffect  = (getBudgetPct('safety', 0.12) - 0.12) * 30;
  const powertrainBudgetEff = (getBudgetPct('powertrain', 0.18) - 0.18) * 25;
  const interiorBudgetEff   = (getBudgetPct('interior', 0.10) - 0.10) * 20;

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

  // Final scores with priority boosts and budget effects
  const finalRel    = clamp01(Math.round((rel + (relPri - NEUTRAL_PRI) * 0.4 + testingEffect * 0.6 + safetyBudgetEffect * 0.3) * combined), 10, 100);
  const finalPerf   = clamp01(Math.round((perf + (perfPri - NEUTRAL_PRI) * 0.45 + powertrainBudgetEff * 0.5) * combined), 10, 100);
  const fuelPerfPenalty = (perfPri - NEUTRAL_PRI) * 0.25;
  const perfFuelPenalty = (fuelPri - NEUTRAL_PRI) * 0.15;
  const finalFuel   = clamp01(Math.round((fuel + (fuelPri - NEUTRAL_PRI) * 0.4 - fuelPerfPenalty - perfFuelPenalty - Math.max(0, weight - 1200) * 0.04) * combined), 10, 100);
  const finalAppeal = clamp01(Math.round((appeal + (comfPri - NEUTRAL_PRI) * 0.35 + interiorBudgetEff * 0.5) * combined), 10, 100);
  const finalCargo  = clamp01(Math.round((cargo + (practPri - NEUTRAL_PRI) * 0.4) * combined), 5, 100);
  const finalSafety = clamp01(Math.round((safety + safetyBudgetEffect * 0.6) * combined), 10, 100);

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

function SectionHeader({ children, stamp, action }: { children: React.ReactNode; stamp?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-zinc-800 pb-2.5 mb-5">
      <h2 className="text-base font-semibold text-zinc-100 tracking-wide m-0 flex items-center gap-3">
        {children}
        {action && <div>{action}</div>}
      </h2>
      {stamp && (
        <span className="text-[9px] font-mono text-terminal-amber uppercase tracking-[0.2em] pb-0.5 shrink-0">
          {stamp}
        </span>
      )}
    </div>
  );
}

function PanelBox({ children, style, className = '' }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div
      className={`bg-zinc-900/40 border border-zinc-800 rounded-md p-4 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function FieldRow({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-800/60 text-xs last:border-b-0">
      <span className="text-zinc-500">{label}</span>
      <span
        className={`font-medium text-right ${typeof value === 'number' ? 'font-mono' : ''} ${!valueColor ? 'text-zinc-200' : ''}`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function GoldButton({ children, onClick, disabled = false, style = {} }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-[11px] font-mono uppercase tracking-[0.12em] transition-colors
        ${disabled
          ? 'bg-transparent text-zinc-600 border border-zinc-800 cursor-not-allowed'
          : 'bg-terminal-amber/15 text-terminal-amber border border-terminal-amber/70 hover:bg-terminal-amber/25 cursor-pointer'}`}
      style={style}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, color, disabled = false, style = {}, className = '' }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-sm px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.12em] bg-transparent transition-colors
        ${disabled
          ? 'text-zinc-600 border border-zinc-800 cursor-not-allowed'
          : 'text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-100 cursor-pointer'} ${className}`}
      style={!disabled && color ? { color, borderColor: color, ...style } : style}
    >
      {children}
    </button>
  );
}

function ScoreBadge({ label, value, color }: { label: string; value: number; color?: string }) {
  const variant = value >= 70 ? 'bg-terminal-green' : value >= 45 ? 'bg-terminal-amber' : 'bg-terminal-red';
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-zinc-500">{label}</span>
        <span className={`font-mono font-semibold ${!color ? 'text-zinc-200' : ''}`} style={color ? { color } : undefined}>
          {value}/100
        </span>
      </div>
      <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full ${variant} transition-all`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function FormSelect({ label, value, onChange, options, disabled = false }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string; locked?: boolean }[], disabled?: boolean }) {
  return (
    <div className="mb-3">
      <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-[0.1em] mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full box-border rounded-sm px-3 py-2 text-[13px] bg-zinc-900 border border-zinc-800 text-zinc-200
          focus:outline-none focus:border-terminal-amber/60 transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed text-zinc-600' : 'cursor-pointer hover:border-zinc-700'}`}
      >
        {options.map(o => (
          <option key={o.id} value={o.id} disabled={o.locked}>{o.label} {o.locked ? '(Locked)' : ''}</option>
        ))}
      </select>
    </div>
  );
}

function EmptyState({ icon, title, subtitle, action }: { icon?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 border border-dashed border-zinc-800 rounded-md bg-zinc-900/20">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800/70 mb-4">
        <Factory size={18} className="text-zinc-500" />
      </div>
      <div className="text-sm font-semibold text-zinc-100 mb-1.5">{title}</div>
      {subtitle && <div className="text-xs leading-relaxed text-zinc-500 max-w-sm mb-1">{subtitle}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}


// ─── Tab type ───────────────────────────────────────────────────────────────


type MfgTab = 'overview' | 'factory' | 'design' | 'board' | 'procurement' | 'production' | 'sales' | 'market' | 'history' | 'staff' | 'finance' | 'records' | 'equity';

const MFG_TABS: { id: MfgTab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'factory', label: 'Factory', icon: Factory },
  { id: 'design', label: 'R&D / Design', icon: FlaskConical },
  { id: 'board', label: 'Board', icon: Briefcase },
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
  { id: 'production', label: 'Production', icon: Activity },
  { id: 'sales', label: 'Sales Operations', icon: Tags },
  { id: 'market', label: 'Market Intelligence', icon: Globe },
  { id: 'history', label: 'Performance History', icon: LineChart },
  { id: 'staff', label: 'Staffing', icon: Users },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'records', label: 'Records', icon: ScrollText },
  { id: 'equity', label: 'Equity', icon: PieChart },
];

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function ManufacturingDeskTab({ company, mfgData, playerCash, netWorth, characterName, onRefresh, isAdmin }: any) {
  const [deskTab, setDeskTab] = useState<MfgTab>('overview');
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);
  const [bootstrapData, setBootstrapData] = useState<any>(null);
  const [staffQuantities, setStaffQuantities] = useState<Record<string, string>>({});

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

  // Phase 3: Budget Allocation per bucket (amounts).
  // Initialised eagerly with the static default fractions so the live-score
  // preview is never blank on first render (the useEffect below will re-sync
  // once BASE_DEV_COST is known from the API).
  const [dBudgetAlloc, setDBudgetAlloc] = useState<Record<string, number>>(() => {
    const alloc: Record<string, number> = {};
    for (const b of BUDGET_BUCKETS_FE) { alloc[b.id] = Math.round(150000 * b.defaultPct); }
    return alloc;
  });

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
  const [fullEngReport, setFullEngReport] = useState<any>(null);
  const [engReportLoading, setEngReportLoading] = useState(false);

  // Fetch the full engineering report when a model is selected
  useEffect(() => {
    if (!selectedModelId || !company?.id) { setFullEngReport(null); return; }
    let cancelled = false;
    setEngReportLoading(true);
    manufacturingApi.getEngineeringReport(company.id, selectedModelId)
      .then((res: any) => { if (!cancelled) setFullEngReport(res.data); })
      .catch(() => { if (!cancelled) setFullEngReport(null); })
      .finally(() => { if (!cancelled) setEngReportLoading(false); });
    return () => { cancelled = true; };
  }, [selectedModelId, company?.id]);
  const [launchingModelId, setLaunchingModelId] = useState<string | null>(null);
  const [faceliftSourceModelId, setFaceliftSourceModelId] = useState<string | null>(null);
  const [showDiscontinueConfirm, setShowDiscontinueConfirm] = useState(false);
  const [discontinuingModelId, setDiscontinuingModelId] = useState<string | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showSalesGuide, setShowSalesGuide] = useState(false);
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
  const [marketError, setMarketError] = useState<string | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [allocationForm, setAllocationForm] = useState<Record<string, { units: number, tier: string }>>({});
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [selectedLeaderboardRegion, setSelectedLeaderboardRegion] = useState<string>('');

  // Finance & Records state
  // Finance & Records state
  const [ledgerFilter, setLedgerFilter] = useState<string>('All');
  const [selectedArcReportId, setSelectedArcReportId] = useState<string | null>(null);
  const [financeChartFilter, setFinanceChartFilter] = useState<'expenses' | 'historical' | 'staff'>('historical');
  const [financeTimeline, setFinanceTimeline] = useState<number>(12);

  // Factory Expansion state
  const [showExpandConfirm, setShowExpandConfirm] = useState(false);
  const [expandingFactoryId, setExpandingFactoryId] = useState<string | null>(null);

  // Licensing & Land state
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [licenseStateId, setLicenseStateId] = useState('');
  
  const [showLandModal, setShowLandModal] = useState(false);
  const [landStateId, setLandStateId] = useState('');
  const [landAcres, setLandAcres] = useState('10');
  const [landName, setLandName] = useState('');

  const [showConstructFactoryModal, setShowConstructFactoryModal] = useState(false);
  const [constructFactoryPlotId, setConstructFactoryPlotId] = useState('');
  const [constructFactoryTypeId, setConstructFactoryTypeId] = useState('small-workshop');
  const [constructFactoryName, setConstructFactoryName] = useState('');



  const showNotif = (msg: string, success: boolean) => {
    setNotification({ msg, success });
    setTimeout(() => setNotification(null), 6000);
  };

  // ─── Data-driven config from API ─────────────────────────────────────────
  const currencySymbol: string = mfgData?.currencySymbol ?? '?';
  const autoConfig = mfgData?.countryAutoConfig ?? {};
  const statesForCountry: { id: string; name: string; economic_multiplier?: string | number }[] = mfgData?.statesForCountry ?? [];
  const licenses: any[] = mfgData?.licenses ?? [];
  const landPlots: any[] = mfgData?.landPlots ?? [];

  // Currency formatter — uses company's currency symbol, not a hardcoded $
  const fm = (val: any) => {
    if (val === undefined || val === null) return `${currencySymbol}0`;
    const num = Number(val);
    if (isNaN(num)) return `${currencySymbol}0`;
    return `${currencySymbol}${Math.round(num).toLocaleString('en-US')}`;
  };

  // State resolver — uses statesForCountry from the API, not a hardcoded lookup
  const resolveState = (id?: string) => {
    if (!id) return 'Unknown State';
    const found = statesForCountry.find((s) => s.id === id);
    return found?.name ?? id;
  };

  // Expansion config from country auto config (with safe Drennia fallbacks)
  const EXPANSION_COST = Number(autoConfig?.expansion_cost ?? 500000);
  const EXPANSION_DURATION = Number(autoConfig?.expansion_duration_months ?? 2);
  const EXP_CAPACITY = Number(autoConfig?.expanded_capacity_per_month ?? 200);
  const EXP_MAX_LINES = Number(autoConfig?.expanded_max_lines ?? 2);
  const EXP_WORKERS = Number(autoConfig?.expanded_worker_capacity ?? 80);
  const EXP_LEASE = Number(autoConfig?.expanded_lease_cost_per_month ?? 45000);
  const EXP_MAINT = Number(autoConfig?.expanded_maintenance_per_month ?? 15000);

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
  const STORAGE_COST_PER_UNIT = Number(autoConfig?.storage_cost_per_unit_per_month ?? 150);

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
    setMarketError(null);
    try {
      const res = await manufacturingApi.getMarkets(company.id);
      setMarketData(res.data);

      // Initialize form state — use monthly_target (standing order intent) as the UI value
      const newForm: Record<string, { units: number, tier: string }> = {};
      res.data.allocations?.forEach((a: any) => {
        newForm[`${a.vehicle_model_id}-${a.region_market_id}`] = {
          units: Number(a.monthly_target ?? a.units_allocated),  // Layer 2: show intent, not tick value
          tier: a.marketing_tier
        };
      });
      setAllocationForm(prev => ({ ...prev, ...newForm }));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error fetching market data';
      console.error('[loadMarketData]', msg, err);
      setMarketError(msg);
    } finally {
      setMarketLoading(false);
    }
  }, [company?.id]);

    const loadLeaderboard = useCallback(async () => {
    try {
      const res = await worldApi.getMarketLeaderboard();
      setLeaderboardData(res);
      if (res.segments && res.segments.length > 0 && !selectedLeaderboardRegion) {
        setSelectedLeaderboardRegion(res.segments[0].segmentId);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedLeaderboardRegion]);

  useEffect(() => {
    if (deskTab === 'design' || deskTab === 'production' || deskTab === 'factory' || deskTab === 'sales') {
      loadBootstrap();
    }
    if (deskTab === 'market' || deskTab === 'sales') {
      loadMarketData();
    }
    if (deskTab === 'sales') {
      loadLeaderboard();
    }
  }, [deskTab, loadBootstrap, loadMarketData, loadLeaderboard]);

  const previewEngineerCount = mfgData?.staff?.find((s: any) => s.role === 'automotive-engineer')?.quantity || 0;
  const liveScore = calcLiveEngineering({
    vehicleClass: dClass, platform: dPlatform, powerUnit: dEngine, drivetrain: dDrivetrain,
    interiorTier: dInterior, safetyTier: dSafety, qualityTarget: dQuality,
    priorities: dPriorities, budgetAlloc: dBudgetAlloc, totalBudget: BASE_DEV_COST,
    engineerCount: previewEngineerCount,
  }, bootstrapData);

  // Auto-sync suggested sale price whenever the computed mfg cost changes.
  // Using liveScore.cost as the dep is more precise than listing all raw selects
  // and avoids stale closures if priority/budget changes also affect cost.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setDSalePrice(Math.round(liveScore.cost * 1.5));
  }, [liveScore.cost]);
  
  // Init budget alloc when base dev cost is known and modal opens
  useEffect(() => {
    if (Object.keys(dBudgetAlloc).length === 0 && BASE_DEV_COST > 0) {
      setDBudgetAlloc(initBudgetAlloc(BASE_DEV_COST));
    }
  }, [BASE_DEV_COST]);

  // ── Handlers ────────────────────────────────────────────────—————─────────────

  const handlePurchaseLicense = async () => {
    try {
      await manufacturingApi.purchaseLicense(company.id, { targetStateId: licenseStateId });
      showNotif('State manufacturing license purchased.', true);
      setShowLicenseModal(false);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to purchase license.', false);
    }
  };

  const handlePurchaseLand = async () => {
    try {
      await manufacturingApi.purchaseLand(company.id, { stateId: landStateId, acres: Number(landAcres), name: landName });
      showNotif('Land plot purchased.', true);
      setShowLandModal(false);
      setLandName('');
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to purchase land.', false);
    }
  };

  const handleConstructFactory = async () => {
    try {
      await manufacturingApi.constructFactory(company.id, { landPlotId: constructFactoryPlotId, factoryTypeId: constructFactoryTypeId, name: constructFactoryName });
      showNotif('Factory construction started. It will take 5 months.', true);
      setShowConstructFactoryModal(false);
      setConstructFactoryName('');
      onRefresh();
      setDeskTab('factory');
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to construct factory.', false);
    }
  };

  const handleConstructProductionLine = async (factoryId: string) => {
    try {
      await manufacturingApi.constructProductionLine(company.id, factoryId);
      showNotif('Production line construction started. It will take 2 months.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to construct production line.', false);
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
      showNotif(`Development started for "${modelName}". Est. ${liveScore.devTimeArcs} Months to complete.`, true);
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
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Design failed.';
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
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Facelift failed.', false);
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
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to discontinue.', false);
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
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Launch failed.', false);
    } finally { setLaunchingModelId(null); }
  };

  const handleSaveProductionPlan = async (lineId: string) => {
    // Pre-save warnings — only relevant when actually activating a plan
    if (planModelId && planTarget > 0) {
      const workers = mfgData?.staff?.find((s: any) => s.role === 'factory-worker')?.quantity || 0;
      if (workers === 0) {
        showNotif('Warning: You have 0 Factory Workers. Production will fail until you hire workers via the Staffing tab.', false);
      } else {
        const cInv = mfgData?.componentInventory || [];
        const getInv = (cid: string) => cInv.find((i: any) => i.component_id === cid)?.units_in_stock || 0;
        const missing = ['comp_engine', 'comp_transmission', 'comp_tyres', 'comp_steel', 'comp_glass', 'comp_electronics'].some(cid => getInv(cid) <= 0);
        if (missing) {
          showNotif('Warning: You lack essential components in inventory. Production will fail until you procure them via Procurement.', false);
        }
      }
    }

    // Clarify to the player that setting target = 0 puts the line idle (not an error)
    if (!planModelId || planTarget === 0) {
      // Allow the save to continue — the backend will set status to 'idle'
      // The success notification below will confirm the line was set to idle.
    }

    try {
      await manufacturingApi.saveProductionPlan(company.id, {
        lineId, modelId: planModelId || null, qualitySetting: planQuality, targetUnitsPerArc: planTarget,
      });
      const planMsg = planModelId && planTarget > 0
        ? `Production plan saved — ${planTarget} units/month of "${mfgData?.models?.find((m: any) => m.id === planModelId)?.name ?? 'model'}" queued.`
        : 'Production line set to idle.';
      showNotif(planMsg, true);
      setEditingLineId(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to save plan.', false);
    }
  };

  const handlePauseProductionLine = async (lineId: string) => {
    try {
      await manufacturingApi.pauseProductionLine(company.id, lineId);
      showNotif('Production line paused.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to pause line.', false);
    }
  };

  const handleResumeProductionLine = async (lineId: string) => {
    try {
      await manufacturingApi.resumeProductionLine(company.id, lineId);
      showNotif('Production line resumed.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to resume line.', false);
    }
  };

  const handleScrapProductionLine = async (lineId: string, lineStatus: string, targetUnits: number) => {
    if (lineStatus === 'active' && targetUnits > 0) {
      showNotif('Cannot scrap an active production line. Pause production first.', false);
      return;
    }
    if (confirm('Are you sure you want to scrap this production line? You will recover 30% of its cost, but this action cannot be undone.')) {
      try {
        await manufacturingApi.scrapProductionLine(company.id, lineId);
        showNotif('Production line scrapped.', true);
        onRefresh();
      } catch (err: any) {
        showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to scrap line.', false);
      }
    }
  };

  const handleHireFire = async (role: string, action: 'hire' | 'fire') => {
    try {
      const qtyStr = staffQuantities[role] || "1";
      const quantity = Math.max(1, parseInt(qtyStr) || 1);
      
      if (action === 'hire') await manufacturingApi.hireStaff(company.id, role, quantity);
      else await manufacturingApi.fireStaff(company.id, role, quantity);
      showNotif(action === 'hire' ? `Hired ${quantity} staff.` : `Removed ${quantity} staff.`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Action failed.', false);
    }
  };

  const handleSavePrice = async (modelId: string) => {
    const newPrice = priceEdits[modelId];
    if (newPrice === undefined || newPrice === null || Number(newPrice) <= 0) { showNotif('Enter a valid price.', false); return; }
    setSavingPrice(modelId);
    try {
      await manufacturingApi.updateModelPrice(company.id, modelId, newPrice);
      showNotif('Sale price updated.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to save price.', false);
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
      // Refresh market data and inventory after the allocation change is confirmed
      await Promise.all([loadMarketData(), onRefresh()]);
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to allocate.', false);
    }
  };

  const handleStartResearch = async (programmeId: string) => {
    try {
      await manufacturingApi.startEngineeringProgramme(company.id, programmeId);
      showNotif('Engineering programme started.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to start programme.', false);
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
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to procure components.', false);
    }
  };

  const handleStartExpansion = async (factoryId: string) => {
    try {
      await manufacturingApi.startFactoryExpansion(company.id, factoryId);
      showNotif(`Workshop expansion started. ${fm(EXPANSION_COST)} deducted. Construction completes in ${EXPANSION_DURATION} Month${EXPANSION_DURATION > 1 ? 's' : ''}.`, true);
      setShowExpandConfirm(false);
      setExpandingFactoryId(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to start expansion.', false);
      setShowExpandConfirm(false);
    }
  };

  const handleRecoverCondition = async (factoryId: string) => {
    try {
      await manufacturingApi.recoverFactoryCondition(company.id, factoryId);
      showNotif(`Factory condition recovered by 5%. ${fm(20000)} deducted.`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to recover condition.', false);
    }
  };

  const handleToggleAutoRecovery = async (factoryId: string) => {
    try {
      const res = await manufacturingApi.toggleFactoryAutoRecovery(company.id, factoryId);
      const isAuto = res.data?.auto_condition_recovery ?? false;
      showNotif(`Auto-recovery ${isAuto ? 'enabled' : 'disabled'} for factory.`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to toggle auto-recovery.', false);
    }
  };

  const handleProcessAdmin = async () => {
    try {
      const res = await manufacturingApi.processArcAdmin(company.id);
      const msg = res.data?.data?.message || res.data?.message || `Processed ${res.data?.data?.processedCompanies ?? ''} companies`;
      showNotif(`Month processed: ${msg}`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to process month.', false);
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

  // Phase 3: Live engineering assessment — computed above now

  // Compute required workers & active lines
  let plannedUnits = 0;
  let recWorkers = 0;
  productionLines.forEach((l: any) => {
    const factory = factories.find((f: any) => String(f.id) === String(l.factory_id));
    if (factory && Number(l.target_units_per_month) > 0) {
      plannedUnits += Number(l.target_units_per_month);
      // Use factory.worker_capacity (updated at expansion) falling back to factory.worker_requirement from type join
      const workerCap = Number(factory.worker_capacity || factory.worker_requirement || 40);
      const req = Math.ceil((Number(l.target_units_per_month) / Number(factory.capacity_per_month)) * workerCap);
      recWorkers = Math.max(recWorkers, req);
    }
  });
  const activeLinesCount = productionLines.filter((l: any) => l.target_units_per_month > 0).length;

  // Market allocations
  const activeMarketCount = marketData?.allocations?.filter((a: any) => Number(a.units_allocated) > 0).length || 0;

  const activeLines = productionLines.filter((l: any) => l.status === 'active');
  const hasFactory = factories.length > 0;
  const hasModel = models.length > 0;
  const hasActivePlan = activeLines.length > 0;
  const inventoryValue = inventory.reduce((acc: number, inv: any) => acc + Number(inv.inventory_value || 0), 0);
  const leaseCostPerArc = factories.reduce((acc: number, f: any) => acc + Number(f.lease_cost_per_month || 0), 0);
  const maintCostPerArc = factories.reduce((acc: number, f: any) => acc + Number(f.maintenance_cost_per_month || 0), 0);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-120px)]">

      {/* LEFT SIDEBAR (MAIN TABS) */}
      <nav aria-label="Manufacturing desk sections" className="lg:w-[210px] shrink-0 lg:border-r border-zinc-800 lg:pr-3">
        <div className="flex lg:flex-col gap-1 lg:sticky lg:top-4 lg:pt-4 pb-2 lg:pb-0 overflow-x-auto lg:overflow-visible">
          {MFG_TABS.map(t => {
            const active = deskTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setDeskTab(t.id as MfgTab)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-mono font-semibold uppercase tracking-[0.1em] whitespace-nowrap rounded-r-md border-l-2 transition-colors cursor-pointer text-left
                  ${active
                    ? 'text-terminal-amber bg-terminal-amber/10 border-terminal-amber'
                    : 'text-zinc-500 bg-transparent border-transparent hover:text-zinc-300 hover:bg-zinc-800/40'}`}
              >
                {Icon && <Icon size={14} className={active ? 'opacity-100' : 'opacity-60'} />}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 lg:pl-6 pb-16 pt-4">

        {/* Notification */}
        {notification && (
          <div
            role="status"
            className={`fixed top-6 right-6 z-[9999] w-full max-w-md shadow-2xl mb-4 flex items-start gap-2.5 rounded-md border px-4 py-3 text-xs leading-relaxed
              ${notification.success
                ? 'border-terminal-green/50 bg-terminal-green/10 text-terminal-green backdrop-blur-md'
                : 'border-terminal-red/50 bg-terminal-red/10 text-terminal-red backdrop-blur-md'}`}
          >
            <StatusDot variant={notification.success ? 'live' : 'danger'} className="mt-1 shrink-0" />
            <span>{notification.msg}</span>
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
            value={finances ? fm(Number(finances.company_value || 0)) : 'Not Available'}
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
            value={netWorth != null ? fm(netWorth) : (finances ? fm(Number(finances.company_value || 0)) : 'Not Available')}
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
                <h4 className="text-[10px] uppercase text-zinc-500 mb-2 font-mono">Revenue vs Expenses (Last 12 Months)</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...allReports].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(-12).map(r => ({
                    month: `Y${r.world_year} M${r.world_month}`,
                    revenue: Number(r.gross_revenue),
                    expenses: Number(r.gross_revenue) - Number(r.net_profit)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#23232b" vertical={false} />
                    <XAxis dataKey="month" stroke="#888888" fontSize={10} tickMargin={10} />
                    <YAxis stroke="#888888" fontSize={10} tickFormatter={(val) => fm(val)} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0c0d13', borderColor: '#23232b', fontSize: '12px', fontFamily: 'monospace' }}
                      itemStyle={{ color: '#fffff0' }}
                      formatter={(val: any) => fm(Number(val) || 0)}
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
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
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

          {/* Last Month Summary */}
          <Card className="lg:col-span-2 p-0 overflow-hidden border-zinc-800">
            <div className="p-6 pb-2">
              <SectionHeading>Latest Month Results</SectionHeading>
            </div>
            {latestReport ? (
              <div className="flex flex-col">
                <DataRow label="Units Produced" value={latestReport.units_produced} />
                <DataRow label="Units Sold" value={latestReport.units_sold} />
                <DataRow label="Gross Revenue" value={fm(latestReport.gross_revenue)} valueVariant="green" />
                <DataRow label="Total Costs" value={fm(Number(latestReport.gross_revenue || 0) - Number(latestReport.net_profit || 0))} valueVariant="red" />
                <DataRow label="Net Profit" value={fm(latestReport.net_profit)} valueVariant={Number(latestReport.net_profit) < 0 ? 'red' : 'green'} />
                {(() => {
                  const sorted = [...allReports].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
                  if (!prev) return null;
                  const d = Number(latestReport.net_profit) - Number(prev.net_profit);
                  const up = d >= 0;
                  return <DataRow label="Momentum vs Last Month" value={`${up ? '▲ +' : '▼ −'}${fm(Math.abs(d))}`} valueVariant={up ? 'green' : 'red'} border={false} />;
                })()}
              </div>
            ) : (
              <UIEmptyState
                icon={BarChart3}
                heading="No Data Yet"
                message="Close a month to generate your first financial report."
              />
            )}
            
            {isAdmin && (
              <div className="p-4 bg-terminal-red/10 border-t border-dashed border-terminal-red/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-terminal-red font-mono uppercase tracking-[0.1em] mb-1">Dev Admin</div>
                  <div className="text-[11px] text-zinc-400">Process Month manually for this company</div>
                </div>
                <Button variant="secondary" size="sm" onClick={handleProcessAdmin} className="border-terminal-red text-terminal-red">
                  Process Month
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
          <div className="flex justify-between items-center mb-6">
            <SectionHeader stamp="FACILITIES">Factory</SectionHeader>
            <GhostButton onClick={() => setShowGuideModal(true)} iconRight={Info}>
              Factory Guide
            </GhostButton>
          </div>

          {/* ── LICENSES ── */}
          <div className="mb-8">
            <h3 className="text-[13px] font-bold text-zinc-100 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">Manufacturing Licenses</h3>
            {licenses.length === 0 ? (
              <EmptyState title="No Licenses" subtitle="You need a manufacturing license in a state before you can purchase land there." action={<GoldButton onClick={() => setShowLicenseModal(true)}>Purchase License</GoldButton>} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {licenses.map(lic => (
                  <PanelBox key={lic.id} className="border-terminal-blue/30 bg-terminal-blue/5">
                    <div className="font-bold text-terminal-blue mb-1">{resolveState(lic.state_id)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-terminal-blue/70 font-mono">Active License</div>
                  </PanelBox>
                ))}
                <div onClick={() => setShowLicenseModal(true)}>
                  <PanelBox className="flex items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors border-dashed h-full">
                    <span className="text-sm font-medium text-zinc-400">+ Purchase License</span>
                  </PanelBox>
                </div>
              </div>
            )}
          </div>

          {/* ── LAND PLOTS ── */}
          <div className="mb-8">
            <h3 className="text-[13px] font-bold text-zinc-100 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">Land Plots</h3>
            {landPlots.length === 0 ? (
              <EmptyState title="No Land Plots" subtitle="Purchase land in a licensed state to construct factories." action={<GoldButton onClick={() => setShowLandModal(true)}>Purchase Land</GoldButton>} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {landPlots.map(plot => (
                  <PanelBox key={plot.id}>
                    <div className="font-bold text-zinc-100 mb-1">{plot.name}</div>
                    <div className="text-[11px] text-zinc-400 mb-3">{resolveState(plot.state_id)} · {plot.total_acres} Acres</div>
                    <div className="flex gap-2">
                      <GoldButton onClick={() => { setConstructFactoryPlotId(plot.id); setShowConstructFactoryModal(true); }}>Build Factory Here</GoldButton>
                      <GhostButton color="#b85555" onClick={async () => {
                        if (confirm(`Are you sure you want to sell ${plot.name}? This will recover 80% of the land cost.`)) {
                          try {
                            await manufacturingApi.sellLand(company.id, plot.id);
                            onRefresh();
                          } catch (err: any) {
                            alert(err.response?.data?.message || err.message);
                          }
                        }
                      }}>Sell Plot</GhostButton>
                    </div>
                  </PanelBox>
                ))}
                <div onClick={() => setShowLandModal(true)}>
                  <PanelBox className="flex items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors border-dashed h-full">
                    <span className="text-sm font-medium text-zinc-400">+ Purchase Land</span>
                  </PanelBox>
                </div>
              </div>
            )}
          </div>

          {/* ── FACTORIES ── */}
          <h3 className="text-[13px] font-bold text-zinc-100 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">Factories</h3>
          {factories.length === 0 ? (
            <div className="text-sm text-zinc-500 mb-8">No factories constructed. Build a factory on one of your land plots.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {factories.map((factory: any) => (
                <PanelBox key={factory.id}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-terminal-amber/10 border border-terminal-amber/30 shrink-0">
                        <Factory size={16} className="text-terminal-amber" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-zinc-100 m-0 mb-0.5">{factory.name}</h3>
                        <div className="text-[11px] text-zinc-500">
                          <span className="text-terminal-amber">{factory.type_name || 'Small Workshop'}</span>
                          {' · '}<span className="text-zinc-300">{resolveState(factory.state_id)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={factory.status === 'active' ? 'green' : 'red'} dot>
                      {factory.status}
                    </Badge>
                  </div>

                  {factory.building_status === 'under_construction' ? (
                    <div className="rounded-md border border-terminal-amber/40 bg-terminal-amber/5 p-3.5 mb-3 mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusDot variant="warning" />
                        <span className="text-[11px] font-bold text-terminal-amber">Construction in Progress</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                        <FieldRow label="Started" value={formatWorldDateShort(factory.created_at_world_year, factory.created_at_world_month)} />
                        <FieldRow label="Completes" value={formatWorldDateShort(factory.building_completion_year, factory.building_completion_month)} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                        <FieldRow label="Capacity / Month" value={`${factory.capacity_per_month} units`} />
                        <FieldRow label="Lease Cost / Month" value={fm(factory.lease_cost_per_month)} valueColor="#ff453a" />
                        <FieldRow label="Production Lines" value={factory.max_production_lines || 1} />
                        <FieldRow label="Maintenance / Month" value={fm(factory.maintenance_cost_per_month)} valueColor="#ff453a" />
                        <FieldRow label="Machine Level" value={factory.machine_level} valueColor="#d4af37" />
                        <FieldRow label="Condition" value={`${factory.condition}%`} valueColor={Number(factory.condition) < 60 ? '#ff453a' : '#30d158'} />
                      </div>

                      <div className="mt-4 flex gap-2">
                        <GhostButton onClick={() => setDeskTab('production')}>Open Production →</GhostButton>
                        <GhostButton color="#b85555" onClick={async () => {
                          if (confirm(`Are you sure you want to scrap ${factory.name}? You will recover 30% of the construction cost, but this cannot be undone. All production lines must be scrapped first.`)) {
                            try {
                              await manufacturingApi.scrapFactory(company.id, factory.id);
                              onRefresh();
                            } catch (err: any) {
                              alert(err.response?.data?.message || err.message);
                            }
                          }
                        }}>Scrap Factory</GhostButton>
                      </div>
                  {/* ── FACILITY GROWTH ── */}
                  {factory.factory_type_id === 'small-workshop' && (() => {
                    const expStatus = factory.expansion_status;

                    // STATE: EXPANDED
                    if (expStatus === 'expanded') {
                      return (
                        <div className="mt-5 border-t border-zinc-800 pt-4">
                          <div className="text-[10px] font-mono text-terminal-amber tracking-[0.15em] uppercase mb-3">Facility Growth</div>
                          <div className="mb-3">
                            <Badge variant="green">Expansion Complete</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                            <FieldRow label="Facility" value="Expanded Workshop" valueColor="#d4af37" />
                            <FieldRow label="Capacity" value={`${EXP_CAPACITY} units / Month`} valueColor="#30d158" />
                            <FieldRow label="Production Lines" value={String(EXP_MAX_LINES)} valueColor="#30d158" />
                            <FieldRow label="Worker Capacity" value={String(EXP_WORKERS)} />
                            <FieldRow label="Lease / Month" value={fm(EXP_LEASE)} valueColor="#ff453a" />
                            <FieldRow label="Maintenance / Month" value={fm(EXP_MAINT)} valueColor="#ff453a" />
                          </div>
                        </div>
                      );
                    }

                    // STATE: CONSTRUCTION UNDERWAY
                    if (expStatus === 'construction_underway') {
                      const startedArc = factory.expansion_started_month;
                      const startedYear = factory.expansion_started_year;
                      const compMonth = factory.expansion_completion_month;
                      const compYear = factory.expansion_completion_year;
                      return (
                        <div className="mt-5 border-t border-zinc-800 pt-4">
                          <div className="text-[10px] font-mono text-terminal-amber tracking-[0.15em] uppercase mb-3">Workshop Expansion Underway</div>
                          <div className="rounded-md border border-terminal-amber/40 bg-terminal-amber/5 p-3.5 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <StatusDot variant="warning" />
                              <span className="text-[11px] font-bold text-terminal-amber">Construction in Progress</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                              <FieldRow label="Started" value={formatWorldDate(startedYear, startedArc)} />
                              <FieldRow label="Completes" value={formatWorldDate(compYear, compMonth)} />
                              <FieldRow label="Investment Paid" value={fm(factory.expansion_cost || 500000)} valueColor="#ff453a" />
                              <FieldRow label="Current Capacity" value="100 units / Month" />
                              <FieldRow label="Production Line 1" value="Operational" valueColor="#30d158" />
                              <FieldRow label="Production Line 2" value="Unavailable until complete" valueColor="#71717a" />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // STATE: AVAILABLE
                    const canAfford = Number(finances?.available_cash || 0) >= EXPANSION_COST;
                    if (showExpandConfirm && expandingFactoryId === factory.id) {
                      return (
                        <div className="mt-5 border-t border-zinc-800 pt-4">
                          <div className="text-[10px] font-mono text-terminal-amber tracking-[0.15em] uppercase mb-3">Workshop Expansion — {EXP_MAX_LINES} Production Lines</div>
                          <div className="rounded-md border border-terminal-amber/30 bg-terminal-amber/5 p-4 mb-4 text-xs leading-relaxed text-zinc-200">
                            <div className="font-bold text-terminal-amber mb-2">This investment will:</div>
                            <ul className="flex flex-col gap-1 list-disc pl-4 marker:text-zinc-600">
                              <li>Add {EXP_MAX_LINES - 1} additional production line{EXP_MAX_LINES - 1 > 1 ? 's' : ''}</li>
                              <li>Increase total capacity from {factory.capacity_per_month ?? 100} to <strong className="text-terminal-green">{EXP_CAPACITY} units / Month</strong></li>
                              <li>Increase Factory Worker capacity to <strong className="text-terminal-green">{EXP_WORKERS}</strong></li>
                              <li>Increase recurring lease to <strong className="text-terminal-red">{fm(EXP_LEASE)} / Month</strong> and maintenance to <strong className="text-terminal-red">{fm(EXP_MAINT)} / Month</strong></li>
                            </ul>
                            <p className="mt-2 mb-0 text-zinc-500">Construction will take {EXPANSION_DURATION} Month{EXPANSION_DURATION > 1 ? 's' : ''}. Production Line 1 remains operational during construction.</p>
                          </div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <GoldButton onClick={() => handleStartExpansion(factory.id)}>
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
                      <div className="mt-5 border-t border-zinc-800 pt-4">
                        <div className="text-[10px] font-mono text-terminal-amber tracking-[0.15em] uppercase mb-3">Facility Growth</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3.5">
                            <div className="text-[11px] font-bold text-zinc-100 mb-0.5">Current Facility</div>
                            <div className="text-[10px] text-zinc-500 mb-1.5">Small Workshop</div>
                            <FieldRow label="Capacity" value={`${factory.capacity_per_month ?? 100} units / Month`} />
                            <FieldRow label="Production Lines" value="1" />
                            <FieldRow label="Max Workers" value={String(factory.worker_capacity ?? 40)} />
                            <FieldRow label="Lease / Month" value={fm(factory.lease_cost_per_month)} valueColor="#ff453a" />
                            <FieldRow label="Maintenance / Month" value={fm(factory.maintenance_cost_per_month)} valueColor="#ff453a" />
                          </div>
                          <div className="rounded-md border border-terminal-amber/40 bg-terminal-amber/5 p-3.5">
                            <div className="text-[11px] font-bold text-terminal-amber mb-0.5">Expanded Workshop</div>
                            <div className="text-[10px] text-zinc-500 mb-1.5">After expansion completes</div>
                            <FieldRow label="Capacity" value={`${EXP_CAPACITY} units / Month`} valueColor="#30d158" />
                            <FieldRow label="Production Lines" value={String(EXP_MAX_LINES)} valueColor="#30d158" />
                            <FieldRow label="Max Workers" value={String(EXP_WORKERS)} valueColor="#30d158" />
                            <FieldRow label="Lease / Month" value={fm(EXP_LEASE)} valueColor="#ff453a" />
                            <FieldRow label="Maintenance / Month" value={fm(EXP_MAINT)} valueColor="#ff453a" />
                            <FieldRow label="Construction Time" value={`${EXPANSION_DURATION} Month${EXPANSION_DURATION > 1 ? 's' : ''}`} />
                            <FieldRow label="Upfront Investment" value={fm(EXPANSION_COST)} valueColor="#d4af37" />
                          </div>
                        </div>
                        {canAfford ? (
                          <GoldButton onClick={() => { setShowExpandConfirm(true); setExpandingFactoryId(factory.id); }}>
                            Expand Workshop
                          </GoldButton>
                        ) : (
                          <div>
                            <GoldButton disabled>Expand Workshop</GoldButton>
                            <div className="text-[11px] text-terminal-red mt-1.5">Insufficient company funds. Requires {fm(EXPANSION_COST)}.</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── FACTORY CONDITION RECOVERY ── */}
                  <div className="mt-5 border-t border-zinc-800 pt-4">
                    <div className="text-[10px] font-mono text-terminal-amber tracking-[0.15em] uppercase mb-3">Condition Management</div>
                    <div className="text-xs text-zinc-400 mb-3">
                      Factory condition decays over time. Maintain it manually, or enable Auto-Recovery to automatically deduct funds when condition drops below 100%.
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <GhostButton 
                        onClick={() => handleRecoverCondition(factory.id)}
                        disabled={Number(factory.condition) >= 100 || Number(finances?.available_cash) < 20000}
                      >
                        Restore Condition (+5%) — {fm(20000)}
                      </GhostButton>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                        <input 
                          type="checkbox" 
                          checked={factory.auto_condition_recovery} 
                          onChange={() => handleToggleAutoRecovery(factory.id)} 
                        />
                        Auto-Recover (Spends {fm(20000)}/mo if &lt; 100%)
                      </label>
                    </div>
                    {Number(finances?.available_cash) < 20000 && (
                      <div className="text-[11px] text-terminal-red mt-2">Insufficient funds for manual recovery.</div>
                    )}
                  </div>
                  </>
                  )}
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
          const cfg: Record<string, { label: string; cls: string }> = {
            in_development: { label: 'Development In Progress', cls: 'text-terminal-amber bg-terminal-amber/10 border-terminal-amber/40' },
            ready_to_launch: { label: 'Ready to Launch', cls: 'text-terminal-blue bg-terminal-blue/10 border-terminal-blue/40' },
            launched: { label: 'Launched', cls: 'text-terminal-green bg-terminal-green/10 border-terminal-green/40' },
            cancelled: { label: 'Cancelled', cls: 'text-terminal-red bg-terminal-red/10 border-terminal-red/40' },
          };
          const c = cfg[status] || cfg['in_development'];
          const stageLabels: Record<string, string> = {
            engineering: 'Engineering Phase',
            prototype: 'Prototype Build',
            testing: 'Testing Programme',
            ready_to_launch: 'Ready',
          };
          const stageSuffix = status === 'in_development' && devStage && devStage !== 'ready_to_launch'
            ? ` — ${stageLabels[devStage] ?? devStage}` : '';
          return (
            <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.08em] ${c.cls}`}>
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
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* ── INTERNAL SUB-NAV (LEFT CORNER) ── */}
            <div className="flex md:flex-col gap-1.5 md:min-w-[200px] md:border-r border-zinc-800 md:pr-5 md:pt-3 overflow-x-auto">
              {(['portfolio', 'research', 'knowledge'] as const).map((tab) => {
                const active = designTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setDesignTab(tab)}
                    aria-current={active ? 'page' : undefined}
                    className={`px-4 py-2.5 text-[12px] font-semibold text-left whitespace-nowrap rounded-r-md border-l-2 transition-colors cursor-pointer
                      ${active
                        ? 'text-terminal-amber bg-terminal-amber/10 border-terminal-amber'
                        : 'text-zinc-500 bg-transparent border-transparent hover:text-zinc-300 hover:bg-zinc-800/40'}`}
                  >
                    {tab === 'portfolio' ? 'Vehicle Portfolio' : tab === 'research' ? 'Engineering Programmes' : 'Knowledge'}
                  </button>
                );
              })}
            </div>

            {/* ── CONTENT AREA ── */}
            <div className="flex-1 min-w-0">

            {designTab === 'portfolio' && (
              <div>
                {/* ── VEHICLE DETAIL PANEL ── */}
                {selectedModel && (
                  <div
                    className="fixed inset-0 z-[200] flex items-start justify-end bg-black/60 backdrop-blur-sm"
                    onClick={() => setSelectedModelId(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${selectedModel.name} details`}
                  >
                    <div
                      className="w-full max-w-[520px] h-screen overflow-y-auto bg-zinc-950 border-l border-zinc-800 p-7 animate-slide-in"
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-5">
                        <div>
                          <h2 className="text-xl font-bold text-zinc-100 m-0 mb-1">{selectedModel.name}</h2>
                          <div className="text-xs text-zinc-500">{selectedModel.vehicle_class} · {selectedModel.target_segment}</div>
                        </div>
                        <button
                          onClick={() => setSelectedModelId(null)}
                          aria-label="Close details"
                          className="text-zinc-500 hover:text-zinc-200 text-xl leading-none bg-transparent border-none cursor-pointer p-1 transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Status */}
                      <div style={{ marginBottom: '20px' }}>
                        {devBadge(selectedModel.development_status || 'launched', selectedModel.dev_stage)}
                      </div>

                      {/* Development status info box */}
                      {selectedModel.development_status === 'in_development' && (
                        <div className="rounded-md border border-terminal-amber/30 bg-terminal-amber/5 p-4 mb-5">
                          <div className="flex items-center gap-2 mb-1.5">
                            <StatusDot variant="warning" />
                            <span className="text-[11px] font-mono text-terminal-amber uppercase tracking-[0.1em]">Development In Progress</span>
                          </div>
                          <p className="text-xs leading-relaxed text-zinc-500 m-0">
                            {selectedModel.dev_stage === 'engineering' && 'Engineering Phase — core design and systems engineering work.'}
                            {selectedModel.dev_stage === 'prototype' && 'Prototype Phase — building and evaluating physical prototypes.'}
                            {selectedModel.dev_stage === 'testing' && 'Testing Programme — road testing and durability validation.'}
                            {!selectedModel.dev_stage && 'Development is underway.'}
                            {' '}Est. ready: {formatWorldDate(selectedModel.development_completes_at_year ?? 1, selectedModel.development_completes_at_month ?? 1)}.
                          </p>
                          {selectedModel.planned_dev_time_months && (
                            <div className="mt-3 flex gap-1.5">
                              {[
                                { stage: 'engineering', label: 'Eng.' },
                                { stage: 'prototype', label: 'Proto.' },
                                { stage: 'testing', label: 'Test' },
                              ].map(({ stage, label }) => {
                                const active = selectedModel.dev_stage === stage;
                                return (
                                  <div
                                    key={stage}
                                    className={`flex-1 py-1.5 text-center text-[9px] font-mono uppercase tracking-[0.08em] rounded-sm border
                                      ${active
                                        ? 'bg-terminal-amber/15 border-terminal-amber text-terminal-amber'
                                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-600'}`}
                                  >
                                    {label}
                                  </div>
                                );
                              })}
                              <div className="flex-1 py-1.5 text-center text-[9px] font-mono uppercase tracking-[0.08em] rounded-sm border bg-zinc-900/40 border-zinc-800 text-zinc-600">
                                Launch
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedModel.development_status === 'ready_to_launch' && (
                        <div className="rounded-md border border-terminal-blue/30 bg-terminal-blue/5 p-4 mb-5">
                          <div className="text-[11px] font-mono text-terminal-blue uppercase tracking-[0.1em] mb-1.5">Ready to Launch</div>
                          <p className="text-xs leading-relaxed text-zinc-500 m-0">
                            Development is complete. Review the final specifications, then click <strong className="text-zinc-200">Launch Model</strong> to make it available for production assignment.
                          </p>
                          <div className="mt-3.5">
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
                        <div className="flex items-center gap-2 rounded-md border border-terminal-green/30 bg-terminal-green/5 px-4 py-2.5 mb-5 text-xs text-terminal-green">
                          <StatusDot variant="live" />
                          Launched — available for production assignment.
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
                          <FieldRow label="Dev. Started (Month)" value={formatWorldDate(selectedModel.created_at_world_year, selectedModel.created_at_world_month)} />
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
                                ⚠ High warranty risk. Reliability below 55 incurs a running reserve deducted each Month. Increase reliability to reduce ongoing costs.
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
                              <span style={{ color: T.ivory, fontFamily: 'monospace' }}>{(selectedModel.vehicle_weight_kg || 1200).toLocaleString('en-US')} kg</span>
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
                                ✗ Validation {resultClass} — {extraArcs > 0 ? `+${extraArcs} Month` : ''}{extraCost > 0 ? ` +${(extraCost * 100).toFixed(0)}% Extra Cost` : ''}
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

                      {/* Full Engineering Report (fetched from the engineering-report endpoint) */}
                      {(() => {
                        const rpt = fullEngReport?.engineering_report;
                        if (engReportLoading) {
                          return (
                            <div style={{ marginBottom: '20px' }}>
                              <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Engineering Bureau Report</div>
                              <PanelBox><div style={{ fontSize: '11px', color: T.faint }}>Retrieving report from the engineering bureau…</div></PanelBox>
                            </div>
                          );
                        }
                        if (!rpt || (!rpt.overallGrade && !rpt.overallAssessment && !(rpt.recommendations?.length))) return null;
                        const gradeColor = ['A', 'B'].includes(String(rpt.overallGrade || '').charAt(0)) ? T.mint
                          : String(rpt.overallGrade || '').charAt(0) === 'C' ? T.gold : T.red;
                        return (
                          <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Engineering Bureau Report</div>
                            <PanelBox style={{ border: `1px solid ${gradeColor}33` }}>
                              {rpt.overallGrade && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                  <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'monospace', color: gradeColor }}>{rpt.overallGrade}</div>
                                  <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overall Grade</div>
                                </div>
                              )}
                              {rpt.overallAssessment && (
                                <div style={{ fontSize: '12px', color: T.ivory, lineHeight: 1.6, marginBottom: rpt.recommendations?.length ? '10px' : 0 }}>
                                  {rpt.overallAssessment}
                                </div>
                              )}
                              {Array.isArray(rpt.recommendations) && rpt.recommendations.length > 0 && (
                                <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '2px' }}>
                                  <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Recommendations</div>
                                  {rpt.recommendations.map((rec: string, i: number) => (
                                    <div key={i} style={{ fontSize: '11px', color: T.faint, paddingLeft: '8px', borderLeft: `2px solid ${T.border}`, marginBottom: '2px', lineHeight: 1.6 }}>• {rec}</div>
                                  ))}
                                </div>
                              )}
                            </PanelBox>
                          </div>
                        );
                      })()}

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

                      </div>
                    </div>
                  </div>
                )}

                {/* ── SALES OPERATIONS GUIDE MODAL ── */}
                {showSalesGuide && (
                  <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)' }}
                    onClick={() => setShowSalesGuide(false)}>
                    <div style={{ width: '800px', maxWidth: '98vw', maxHeight: '90vh', overflowY: 'auto', background: '#0d0d0d', border: `1px solid ${T.border}`, padding: '32px', position: 'relative' }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                          <div style={{ fontSize: '20px', fontWeight: 700, color: T.ivory }}>📖 Sales & Operations Guide</div>
                          <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Understanding Market Allocations</div>
                        </div>
                        <button onClick={() => setShowSalesGuide(false)} style={{ background: 'none', border: 'none', color: T.muted, fontSize: '22px', cursor: 'pointer' }}>×</button>
                      </div>

                      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
                        
                        <div>
                          <h3 style={{ color: T.gold, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${T.border}`, paddingBottom: '4px' }}>1. The Monthly Sequence</h3>
                          <p>The simulation processes ticks in a strict order: <strong>Production</strong> happens first, followed by <strong>Sales</strong>. This means any inventory you manufacture this month is immediately available to be sold in the same month.</p>
                        </div>

                        <div>
                          <h3 style={{ color: T.gold, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${T.border}`, paddingBottom: '4px' }}>2. Standing Orders</h3>
                          <p>The units you allocate to a market act as a <strong>Standing Order</strong> (a monthly target). They will remain active month-over-month until you manually change them. You do not need to re-allocate units every month.</p>
                        </div>

                        <div>
                          <h3 style={{ color: T.gold, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${T.border}`, paddingBottom: '4px' }}>3. Supply Intelligence & Capping</h3>
                          <p>All dispatched vehicles draw from your <strong>Central Stock</strong>. The Supply Intelligence panel calculates if your expected monthly production can cover your targets.</p>
                          <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-400">
                            <li>If your targets exceed available supply, the simulation will automatically <strong>scale down allocations proportionally</strong> across all your active markets.</li>
                            <li>No market will be left empty unless your total stock is exactly zero.</li>
                            <li>Once the month ends, your allocations are reset back to their target levels.</li>
                          </ul>
                        </div>

                        <div>
                          <h3 style={{ color: T.gold, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${T.border}`, paddingBottom: '4px' }}>4. Marketing</h3>
                          <p>Higher marketing tiers increase brand awareness and local market demand, but they consume more monthly budget. Marketing costs are deducted <strong>per active market</strong> at the end of each month.</p>
                        </div>

                      </div>

                      <div className="mt-8 flex justify-end">
                        <GhostButton onClick={() => setShowSalesGuide(false)}>Close Guide</GhostButton>
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
                              <input type="number" value={dSalePrice || ''} onChange={e => setDSalePrice(e.target.value ? Number(e.target.value) : 0)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', background: '#0e0e0e', border: `1px solid ${T.border}`, color: T.gold, fontSize: '13px', fontFamily: 'monospace' }} />
                              <div style={{ fontSize: '10px', color: T.faint, marginTop: '3px' }}>Suggested: {fm(Math.round(liveScore.cost * 1.5))}</div>
                            </div>
                          </div>

                          {/* Live Preview — Step 1 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <PanelBox style={{ border: `1px solid ${T.gold}33` }}>
                              <SectionHeader stamp="LIVE ESTIMATE">Design Preview</SectionHeader>
                              <FieldRow label="Est. Mfg Cost / Unit" value={fm(liveScore.cost)} valueColor={T.red} />
                              <FieldRow label="Vehicle Weight" value={`${liveScore.vehicleWeightKg.toLocaleString('en-US')} kg`} />
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
                                    <button onClick={() => setDBudgetAlloc(prev => {
                                      const alloc = { ...prev };
                                      const currentVal = alloc[b.id] ?? Math.round(BASE_DEV_COST * b.defaultPct);
                                      alloc[b.id] = Math.max(0, currentVal - Math.round(BASE_DEV_COST * 0.02));
                                      return alloc;
                                    })} style={{ background: 'none', border: `1px solid ${T.border}`, color: T.muted, width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                    <button onClick={() => setDBudgetAlloc(prev => {
                                      const alloc = { ...prev };
                                      const currentVal = alloc[b.id] ?? Math.round(BASE_DEV_COST * b.defaultPct);
                                      const totalOther = BUDGET_BUCKETS_FE.reduce((sum, bucket) => sum + (bucket.id === b.id ? 0 : alloc[bucket.id] ?? Math.round(BASE_DEV_COST * bucket.defaultPct)), 0);
                                      const increment = Math.round(BASE_DEV_COST * 0.02);
                                      // Only increment if it won't exceed the total budget
                                      if (totalOther + currentVal + increment <= BASE_DEV_COST) {
                                        alloc[b.id] = currentVal + increment;
                                      }
                                      return alloc;
                                    })} style={{ background: 'none', border: `1px solid ${T.border}`, color: T.muted, width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
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

                              <FieldRow label="Vehicle Weight" value={`${liveScore.vehicleWeightKg.toLocaleString('en-US')} kg`} />

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
                                <FieldRow label="Est. Dev. Time" value={`${liveScore.devTimeArcs} Month${liveScore.devTimeArcs > 1 ? 's' : ''}`} valueColor={T.blue} />
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
                <div style={{ fontSize: '11px', color: T.faint, marginBottom: '20px', lineHeight: 1.7 }}>
                  Engineering Programmes are permanent company-wide standards approved after a research period. Once approved they apply automatically each month tick — no further action required.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries((bootstrapData?.engineeringProgrammes || {}) as Record<string, any>).map(([id, prog]) => {
                    const activeProg = research.find((r: any) => r.programme_id === id);
                    const isCompleted = activeProg?.status === 'approved';
                    const inProgress = activeProg?.status === 'engineering' || activeProg?.status === 'validation';
                    const prereqCompleted = !prog.prereq || research.some((r: any) => r.programme_id === prog.prereq && r.status === 'approved');
                    const isLocked = !prereqCompleted;
                    const canAfford = Number(finances?.available_cash || 0) >= (prog.budget || 0);
                    const hasEngineers = engineerCount >= (prog.minEng || 1);

                    const borderColor = isCompleted ? 'rgba(48,209,88,0.35)' : inProgress ? 'rgba(245,158,11,0.35)' : isLocked ? T.border : T.border;
                    const bgColor = isCompleted ? 'rgba(48,209,88,0.04)' : inProgress ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.02)';

                    return (
                      <div key={id} style={{ background: bgColor, border: `1px solid ${borderColor}`, padding: '18px', borderRadius: '2px', opacity: isLocked ? 0.65 : 1 }}>

                        {/* Header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: isCompleted ? T.mint : T.gold }}>{prog.name}</div>
                              {prog.category && (
                                <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.blue, background: 'rgba(110,168,254,0.1)', border: '1px solid rgba(110,168,254,0.2)', padding: '2px 6px', borderRadius: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                  {prog.category}
                                </div>
                              )}
                            </div>
                            {prog.prereq && (
                              <div style={{ fontSize: '10px', color: prereqCompleted ? T.mint : T.red, marginTop: '4px' }}>
                                {prereqCompleted ? '✓' : '🔒'} Requires: {(bootstrapData?.engineeringProgrammes || {})[prog.prereq]?.name}
                              </div>
                            )}
                          </div>
                          <div style={{ marginLeft: '12px', textAlign: 'right', flexShrink: 0 }}>
                            {isCompleted && <div style={{ color: T.mint, fontSize: '12px', fontWeight: 700 }}>✓ Approved</div>}
                            {inProgress && <div style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 700 }}>In Progress ({activeProg.status})</div>}
                          </div>
                        </div>

                        {/* Description */}
                        {prog.description && (
                          <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.7, marginBottom: '14px' }}>
                            {prog.description}
                          </div>
                        )}

                        {/* Effects */}
                        {prog.effects && prog.effects.length > 0 && (
                          <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, borderRadius: '2px' }}>
                            <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Effects on Approval</div>
                            {prog.effects.map((eff: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '4px 0', borderBottom: i < prog.effects.length - 1 ? `1px dotted ${T.border}` : 'none' }}>
                                <span style={{ fontSize: '11px', color: T.faint, flex: 1 }}>{eff.label}</span>
                                <span style={{ fontSize: '11px', color: T.mint, fontFamily: 'monospace', textAlign: 'right', maxWidth: '55%' }}>{eff.value}</span>
                              </div>
                            ))}
                            {prog.appliesTo && (
                              <div style={{ fontSize: '10px', color: T.faint, marginTop: '8px', paddingTop: '6px', borderTop: `1px solid ${T.border}`, fontStyle: 'italic' }}>
                                ↳ {prog.appliesTo}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Specs grid */}
                        <div style={{ fontSize: '12px', color: T.muted, marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <FieldRow label="Budget" value={fm(prog.budget || 0)} valueColor={T.red} />
                          <FieldRow label="Base Duration" value={`${prog.baseDuration || 0} Months`} />
                          <FieldRow label="Min Engineers" value={prog.minEng} />
                          <FieldRow label="Rec. Engineers" value={prog.recEng} />
                        </div>

                        {/* In-progress timeline */}
                        {inProgress && (
                          <div style={{ fontSize: '11px', color: T.faint, textAlign: 'center', padding: '8px', background: 'rgba(245,158,11,0.06)', borderRadius: '2px', marginBottom: '10px' }}>
                            Started M{activeProg.started_month} Y{activeProg.started_arc_year}
                            <span style={{ margin: '0 8px', color: T.border }}>→</span>
                            <span style={{ color: activeProg.status === 'validation' ? T.mint : T.faint }}>Validation M{activeProg.validation_month} Y{activeProg.validation_arc_year}</span>
                            <span style={{ margin: '0 8px', color: T.border }}>→</span>
                            <span style={{ color: T.gold }}>Approved M{activeProg.completion_month} Y{activeProg.completion_arc_year}</span>
                          </div>
                        )}

                        {/* Action button */}
                        {!isCompleted && !inProgress && (
                          <GoldButton
                            onClick={() => handleStartResearch(id)}
                            disabled={isLocked || !hasEngineers || !canAfford}
                            style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                          >
                            {isLocked
                              ? '🔒 Locked — Complete prerequisite first'
                              : !hasEngineers
                              ? `Need ${prog.minEng} Automotive Engineer${prog.minEng > 1 ? 's' : ''} (you have ${engineerCount})`
                              : !canAfford
                              ? `Insufficient funds (need ${fm(prog.budget)})`
                              : 'Start Programme'}
                          </GoldButton>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {componentCatalogue.map((comp: any) => {
                const inv = componentInventory.find((i: any) => i.component_id === comp.id);
                const stock = inv ? inv.units_in_stock : 0;
                return (
                  <div key={comp.id} className="flex flex-col rounded-md border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="text-[13px] font-bold text-zinc-100 m-0">{comp.name}</h3>
                      <Badge variant={stock > 0 ? 'green' : 'zinc'}>{stock > 0 ? `${stock} in stock` : 'No stock'}</Badge>
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-500 mb-4 min-h-8">{comp.description}</p>
                    <div className="mt-auto">
                      <FieldRow label="Base Cost" value={fm(comp.base_cost)} />
                      <div className="mt-3">
                        <GoldButton
                          onClick={() => setProcuringComponent({ id: comp.id, name: comp.name, units: 1000, cost: comp.base_cost })}
                          style={{ width: '100%' }}
                        >
                          Purchase Order
                        </GoldButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {procuringComponent && (
              <div
                className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4"
                role="dialog"
                aria-modal="true"
                aria-label={`Procure ${procuringComponent.name}`}
              >
                <div className="w-full max-w-sm rounded-md border border-zinc-800 bg-zinc-950 p-6 animate-slide-in">
                  <h3 className="m-0 mb-4 text-base font-semibold text-zinc-100">Procure {procuringComponent.name}</h3>

                  <div className="mb-4">
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-[0.1em] mb-1.5">Order Quantity</label>
                    <input
                      type="number" min="100" step="100" value={procuringComponent.units || ''}
                      onChange={e => setProcuringComponent({ ...procuringComponent, units: e.target.value ? parseInt(e.target.value) : 0 })}
                      className="w-full rounded-sm border border-zinc-800 bg-zinc-900 px-3 py-2 text-[13px] text-zinc-200 focus:outline-none focus:border-terminal-amber/60 transition-colors"
                    />
                  </div>

                  <div className="mb-6">
                    <FieldRow label="Total Cost" value={fm(procuringComponent.units * procuringComponent.cost)} valueColor="#ff453a" />
                    <FieldRow label="Current Balance" value={fm(Number(finances?.available_cash || 0))} valueColor="#30d158" />
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <GhostButton onClick={() => setProcuringComponent(null)}>Cancel</GhostButton>
                    <GoldButton
                      disabled={Number(finances?.available_cash || 0) < (procuringComponent.units * procuringComponent.cost) || procuringComponent.units <= 0}
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

      {/* ═════════════════════════════════════════════���═════════
          PRODUCTION TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'production' && (
        <div>
          <SectionHeader stamp="PRODUCTION DESK">Production Lines</SectionHeader>

          {/* Global Operations Banner */}
          {hasFactory && (
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between p-3 rounded-md border border-zinc-800 bg-zinc-900/30">
               <div className="flex items-center gap-3">
                 <div className="text-lg">🏭</div>
                 <div>
                   <div className="text-sm font-bold text-zinc-200">Global Monthly Fixed Overheads</div>
                   <div className="text-[11px] text-zinc-500">Fixed costs billed at month-end regardless of production (Staff Wages + Factory Leases)</div>
                 </div>
               </div>
               <div className="text-right mt-3 md:mt-0">
                 <div className="text-lg font-mono font-bold text-terminal-red">{fm(totalWagesPerArc + leaseCostPerArc + maintCostPerArc)}</div>
                 <div className="text-[10px] text-zinc-500 font-mono tracking-wider">BILLED MONTHLY</div>
               </div>
            </div>
          )}

          {/* Global Warnings */}
          {(() => {
            if (!hasFactory || !models.some((m: any) => (m.development_status || 'launched') === 'launched')) return null;
            
            const activeLines = productionLines.filter((l: any) => l.status === 'active' && l.target_units_per_month > 0);
            if (activeLines.length === 0) return null;

            const cInv = mfgData?.componentInventory || [];
            const getInv = (cid: string) => cInv.find((i: any) => i.component_id === cid)?.units_in_stock || 0;
            
            let maxByComponents = Math.floor(getInv('comp_engine'));
            maxByComponents = Math.min(maxByComponents, Math.floor(getInv('comp_transmission')));
            maxByComponents = Math.min(maxByComponents, Math.floor(getInv('comp_tyres') / 4));
            maxByComponents = Math.min(maxByComponents, Math.floor(getInv('comp_steel')));
            maxByComponents = Math.min(maxByComponents, Math.floor(getInv('comp_glass')));
            maxByComponents = Math.min(maxByComponents, Math.floor(getInv('comp_electronics')));

            let totalRawRequired = 0;
            let totalWorkersReq = 0;
            for (const l of activeLines) {
               const fac = factories.find((f: any) => f.id === l.factory_id);
               if (!fac) continue;
               const eff = Math.min(1, totalWorkers / (fac.worker_requirement || 30)) * ((fac.condition || 100) / 100);
               const lineRaw = Math.floor(l.target_units_per_month * eff);
               totalRawRequired += lineRaw;
               totalWorkersReq += fac.worker_requirement || 30;
            }

            const warnings = [];
            if (totalRawRequired > 0 && maxByComponents < totalRawRequired) {
               warnings.push(`Production is severely bottlenecked! You only have components for ${maxByComponents} units, but lines are targeting ${totalRawRequired}. Please procure components below.`);
            }
            if (totalWorkers < totalWorkersReq) {
               warnings.push(`Production is bottlenecked by labor! You have ${totalWorkers} workers, but your active factories require ${totalWorkersReq}.`);
            }

            if (warnings.length === 0) return null;

            return (
               <div className="mb-6 space-y-2">
                 {warnings.map((w, i) => (
                   <div key={i} className="rounded-md border border-terminal-red bg-terminal-red/10 p-4 flex items-start gap-3">
                     <div className="text-terminal-red mt-0.5">⚠️</div>
                     <div>
                       <div className="text-sm font-bold text-terminal-red mb-1">CRITICAL WARNING</div>
                       <div className="text-xs text-terminal-red/90 leading-relaxed">{w}</div>
                     </div>
                   </div>
                 ))}
               </div>
            )
          })()}

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
              <PanelBox key={factory.id} className="mb-5">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 className="text-sm font-bold text-zinc-100 m-0">{factory.name}</h3>
                  {totalWorkers === 0 && (
                    <Badge variant="red" dot>No Company Workers</Badge>
                  )}
                </div>
                <div className="text-[11px] text-zinc-500 mb-4">
                  Capacity: {factory.capacity_per_month} units/Month · Max Required Workers: {factory.worker_capacity || 30} per month
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
                  const hasAssemblyTime = research.some((r: any) => r.programme_id === 'assembly-time' && r.status === 'approved');
                  const hasSpc = research.some((r: any) => r.programme_id === 'spc' && r.status === 'approved');

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

                  const estUnitsProd = Math.min(factory.capacity_per_month, Math.min(estUnitsRaw, maxByComponents));
                  const isComponentBottleneck = estUnitsRaw > 0 && maxByComponents < estUnitsRaw;

                  const estDefects = Math.floor(estUnitsProd * defectRate);
                  const estInventoryAdded = estUnitsProd - estDefects;

                  const BOM_COST = 94;
                  const totalModelCost = editModel ? Math.round(editModel.manufacturing_cost_per_unit * costMult) : 0;
                  const assemblyCost = Math.max(0, totalModelCost - BOM_COST);

                  const estTotalCost = assemblyCost * estUnitsProd;

                  return (
                    <div key={line.id} className="rounded-md border border-zinc-800 bg-black/20 p-4 mb-3">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="text-xs font-bold text-terminal-amber">Production Line {line.line_number}</div>
                        <Badge
                          variant={line.construction_status === 'under_construction' ? 'amber' : !assignedModel ? 'zinc' : line.status === 'active' ? 'green' : line.status === 'paused' ? 'red' : 'zinc'}
                          dot
                        >
                          {line.construction_status === 'under_construction' ? 'Under Construction' : !assignedModel ? 'Idle' : line.status}
                        </Badge>
                      </div>

                      {line.status === 'under_construction' ? (
                        <div className="text-[11px] text-zinc-500">
                          Construction in progress. Completes: {formatWorldDateShort(line.building_completion_year, line.building_completion_month)}
                        </div>
                      ) : isEditing ? (
                        <div>
                          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-3 mb-3">
                            <div>
                              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-[0.1em] mb-1.5">Assigned Model</label>
                              <select
                                value={planModelId}
                                onChange={e => { setPlanModelId(e.target.value); }}
                                className="w-full rounded-sm border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-terminal-amber/60 transition-colors cursor-pointer"
                              >
                                <option value="">— Halt Production —</option>
                                {models.filter((m: any) => (m.development_status || 'launched') === 'launched').map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                            </div>
                            <div>
                              {(() => {
                                const otherLines = lines.filter((l: any) => l.id !== line.id);
                                const otherTotal = otherLines.reduce((sum: number, l: any) => sum + (Number(l.target_units_per_month) || 0), 0);
                                const maxAllowed = Math.max(0, Number(factory.capacity_per_month || 100) - otherTotal);
                                return (
                                  <>
                                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-[0.1em] mb-1.5">Target / Month <span className="text-zinc-600 normal-case">(max {maxAllowed})</span></label>
                                    <input
                                      type="number" min={0} max={maxAllowed} value={planTarget === 0 ? '' : planTarget}
                                      onChange={e => setPlanTarget(e.target.value ? Number(e.target.value) : 0)}
                                      className="w-full box-border rounded-sm border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-terminal-amber/60 transition-colors"
                                    />
                                  </>
                                );
                              })()}
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-[0.1em] mb-1.5">Quality Setting</label>
                              <select
                                value={planQuality}
                                onChange={e => setPlanQuality(e.target.value)}
                                className="w-full rounded-sm border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-terminal-amber/60 transition-colors cursor-pointer"
                              >
                                <option value="Budget">Economy Output</option>
                                <option value="Standard">Standard Output</option>
                                <option value="Premium">Quality Focus</option>
                              </select>
                            </div>
                          </div>

                          {/* Estimates */}
                          {editModel && planTarget > 0 && (
                            <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3.5 mb-3">
                              <div className="text-[10px] font-mono text-terminal-amber uppercase tracking-[0.1em] mb-2.5">Live Estimate at Month Close</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                                <div>
                                  <div className="text-zinc-500 mb-0.5">Factory Condition</div>
                                  <strong className={Number(factory.condition) < 50 ? 'text-terminal-red' : 'text-terminal-green'}>{factory.condition}%</strong>
                                </div>
                                <div>
                                  <div className="text-zinc-500 mb-0.5">Efficiency</div>
                                  <strong className={efficiency < 1 ? 'text-terminal-red' : 'text-terminal-green'}>{Math.round(efficiency * 100)}%</strong>
                                  {hasAssemblyTime && <span className="text-terminal-amber text-[9px] ml-1">+Assembly Std</span>}
                                </div>
                                <div>
                                  <div className="text-zinc-500 mb-0.5">Est. Units Produced</div>
                                  <strong className={isComponentBottleneck ? 'text-terminal-red' : 'text-zinc-200'}>{estUnitsProd}</strong>
                                  {isComponentBottleneck && <div className="text-[9px] text-terminal-red mt-0.5">Short on components</div>}
                                </div>
                                <div>
                                  <div className="text-zinc-500 mb-0.5">Defect Rate</div>
                                  <strong className={defectRate > 0.03 ? 'text-terminal-red' : 'text-terminal-green'}>{defectRate * 100}% (-{estDefects} units)</strong>
                                  {hasSpc && <span className="text-terminal-amber text-[9px] ml-1">-SPC Std</span>}
                                </div>
                                <div className="col-span-2 mt-2">
                                  <div className="text-zinc-500 mb-0.5">Net Inventory Added</div>
                                  <strong className="text-terminal-green text-[13px] font-mono">+{estInventoryAdded} units</strong>
                                </div>
                                <div className="col-span-2 mt-2">
                                  <div className="text-zinc-500 mb-0.5" title="Direct assembly costs. Fixed overheads (lease, wages) are billed separately.">Est. Var. Assembly Cost</div>
                                  <strong className="text-terminal-red text-[13px] font-mono">{fm(estTotalCost)}</strong>
                                  <span className="text-zinc-600 ml-1.5">(excl. parts)</span>
                                </div>
                                <div className="col-span-4 mt-2 border-t border-zinc-800 pt-3">
                                  <div className="text-zinc-500 mb-2 text-xs">Components Required (for {estUnitsRaw} units target):</div>
                                  <div className="flex flex-wrap gap-2 text-[10px]">
                                    <Badge variant={getInv('comp_engine') < estUnitsRaw ? 'red' : 'green'}>{estUnitsRaw} Engine</Badge>
                                    <Badge variant={getInv('comp_transmission') < estUnitsRaw ? 'red' : 'green'}>{estUnitsRaw} Transmission</Badge>
                                    <Badge variant={getInv('comp_tyres') < (estUnitsRaw * 4) ? 'red' : 'green'}>{estUnitsRaw * 4} Tyres</Badge>
                                    <Badge variant={getInv('comp_steel') < estUnitsRaw ? 'red' : 'green'}>{estUnitsRaw} Steel</Badge>
                                    <Badge variant={getInv('comp_glass') < estUnitsRaw ? 'red' : 'green'}>{estUnitsRaw} Glass</Badge>
                                    <Badge variant={getInv('comp_electronics') < estUnitsRaw ? 'red' : 'green'}>{estUnitsRaw} Electronics</Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="text-[10px] text-zinc-600 mt-3 italic">
                                Note: Revenue estimates will appear after Market &amp; Sales is built.
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2.5 flex-wrap">
                            <GoldButton onClick={() => handleSaveProductionPlan(line.id)}>Save Production Plan</GoldButton>
                            <GhostButton onClick={() => setEditingLineId(null)}>Cancel</GhostButton>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="text-xs text-zinc-200">
                            {assignedModel ? (
                              <div className="flex flex-col gap-1">
                                <div>Producing: <strong className="text-terminal-amber">{assignedModel.name}</strong></div>
                                <div className="text-[11px] text-zinc-500">
                                  Target: {line.target_units_per_month} units/Month · {qualityLabels[line.quality_setting] || line.quality_setting}
                                </div>
                                {line.status === 'active' && (
                                  <div className="text-[11px] text-terminal-green">
                                    Current Efficiency: {Math.round(Math.min(1, totalWorkers / (factory.worker_requirement || 30)) * ((factory.condition || 100) / 100) * 100)}%
                                    {hasAssemblyTime && <span className="text-terminal-amber ml-2">+Assembly Std</span>}
                                    {hasSpc && <span className="text-terminal-amber ml-2">-SPC Std</span>}
                                  </div>
                                )}
                                {(() => {
                                  if (line.status !== 'active') return null;
                                  const lineTarget = line.target_units_per_month || 0;
                                  const lineEff = Math.min(1, totalWorkers / (factory.worker_requirement || 30)) * ((factory.condition || 100) / 100);
                                  const lineRaw = Math.floor(lineTarget * lineEff);
                                  const isNeck = lineRaw > 0 && maxByComponents < lineRaw;
                                  if (isNeck) {
                                    return <div className="text-[11px] text-terminal-red">Short on components (Max: {maxByComponents} units)</div>;
                                  }
                                  return null;
                                })()}
                              </div>
                            ) : (
                              <span className="text-zinc-600">No model assigned. Line is idle.</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <GhostButton onClick={() => {
                              setEditingLineId(line.id);
                              setPlanModelId(line.assigned_vehicle_model_id || '');
                              setPlanTarget(line.target_units_per_month || 0);
                              setPlanQuality(line.quality_setting || 'Standard');
                            }}>Edit Plan</GhostButton>

                            {assignedModel && line.status === 'active' && (
                              <GhostButton color="#ff453a" onClick={() => handlePauseProductionLine(line.id)}>Pause Production</GhostButton>
                            )}
                            {assignedModel && line.status === 'paused' && (
                              <GhostButton color="#30d158" onClick={() => handleResumeProductionLine(line.id)}>Resume Production</GhostButton>
                            )}
                            <GhostButton color="#b85555" onClick={() => handleScrapProductionLine(line.id, line.status, line.target_units_per_month || 0)}>Scrap Line</GhostButton>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Production Line */}
                {lines.length < factory.max_production_lines && (
                  <div className="mt-4 border-t border-zinc-800 pt-3 flex justify-between items-center">
                     <span className="text-xs text-zinc-500">Line capacity: {lines.length} / {factory.max_production_lines}</span>
                     <GoldButton 
                        onClick={() => handleConstructProductionLine(factory.id)} 
                        disabled={factory.building_status === 'under_construction' || Number(finances?.available_cash) < (1500000 * (Number(statesForCountry.find(s => s.id === factory.state_id)?.economic_multiplier) || 1.0))}
                     >
                       Construct Production Line ({fm(1500000 * (Number(statesForCountry.find(s => s.id === factory.state_id)?.economic_multiplier) || 1.0))})
                     </GoldButton>
                  </div>
                )}
              </PanelBox>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MARKET & SALES TAB
      ═══════════════════════════════════════════════════════ */}
      
      {/* ────────────────────────────────────────────────────────────────────────
          SALES OPERATIONS TAB
      ──────────────────────────────────────────────────────────────────────── */}
      {deskTab === 'sales' && (
        <div className="flex flex-col gap-5">
          <SectionHeader 
            stamp="SALES DESK"
            action={<button onClick={() => setShowSalesGuide(true)} className="px-2 py-1 bg-terminal-blue/10 text-terminal-blue border border-terminal-blue/30 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-terminal-blue/20 transition-colors">📖 Guide</button>}
          >
            Sales Operations
          </SectionHeader>

          {/* Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <PanelBox>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.12em] mb-1.5">Current Inventory</div>
              <div className="text-2xl font-mono text-zinc-100">
                {inventory.reduce((a: number, b: any) => a + Number(b.units_in_stock), 0)}
                <span className="text-sm text-zinc-500 ml-1">units</span>
              </div>
              <div className="text-[11px] text-zinc-600 mt-1">Value: {fm(inventoryValue)}</div>
            </PanelBox>
            <PanelBox>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.12em] mb-1.5">Sold Last Month</div>
              <div className="text-2xl font-mono text-terminal-green">{latestReport?.units_sold || 0}</div>
              <div className="text-[11px] text-zinc-600 mt-1">Revenue: {fm(latestReport?.sales_revenue || 0)}</div>
            </PanelBox>
            <PanelBox>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.12em] mb-1.5">Marketing / Month</div>
              <div className="text-2xl font-mono text-terminal-red">
                {fm(marketData?.allocations?.reduce((acc: number, alloc: any) => acc + (MKT_COSTS[alloc.marketing_tier] || 0), 0) || 0)}
              </div>
              <div className="text-[11px] text-zinc-600 mt-1">Active Markets: {activeMarketCount}</div>
            </PanelBox>
            <PanelBox className={salesManagerCount > 0 ? 'border-terminal-green/40' : ''}>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.12em] mb-1.5">Sales Effectiveness</div>
              <div className={`text-2xl font-mono ${salesManagerCount > 0 ? 'text-terminal-green' : 'text-zinc-600'}`}>
                +{Math.min(16, Math.min(salesManagerCount, activeMarketCount) * 4)}%
              </div>
              <div className="text-[11px] text-zinc-600 mt-1">from Sales Managers</div>
            </PanelBox>
            <PanelBox>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.12em] mb-1.5">Brand Reputation</div>
              <div className="text-2xl font-mono text-terminal-amber">
                {company.reputation} <span className="text-sm text-zinc-500">/ 100</span>
              </div>
              <BrandMilestoneTracker company={company} finances={finances} models={models} />
            </PanelBox>
          </div>

          
          {marketLoading ? (
            <div className="text-zinc-500 text-xs p-6 font-mono animate-pulse">Loading sales data...</div>
          ) : marketError ? (
            <div className="rounded-md border border-terminal-red/40 bg-terminal-red/10 p-5 text-xs text-terminal-red">
              <div className="font-bold text-sm mb-1">⚠ Market Data Load Failed</div>
              <div className="font-mono opacity-80 mb-3">{marketError}</div>
              <GhostButton onClick={loadMarketData}>Retry</GhostButton>
            </div>
          ) : (
            <>
              {models.filter((m: any) => m.development_status === 'launched').length === 0 ? (
                <EmptyState title="No models available" subtitle="Design and launch a vehicle model first to sell vehicles." action={<GhostButton onClick={() => setDeskTab('design')}>Go to R&D / Design</GhostButton>} />
              ) : (
                <>


                  <PanelBox>
                    <h3 className="text-[13px] font-bold text-zinc-100 m-0 mb-3">Inventory, Pricing &amp; Market Allocations</h3>
                    <div className="flex flex-col gap-3">
                    {models.filter((m: any) => m.development_status === 'launched').map((m: any) => {
                      const invRow = inventory.find((inv: any) => inv.vehicle_model_id === m.id);
                      return (
                        <div key={m.id} className="rounded-md border border-zinc-800 bg-black/20 p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                            <div>
                              <span className="text-[13px] font-bold text-terminal-amber">{m.name}</span>
                              <span className="text-[11px] text-zinc-500 ml-2">{m.vehicle_class} · {m.target_segment}</span>
                            </div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="text-[11px] text-zinc-500">Base Cost: {fm(m.manufacturing_cost_per_unit)}</span>
                              <span className="text-[11px] text-zinc-500 ml-2">Sale Price:</span>
                              <input
                                type="number"
                                defaultValue={m.sale_price}
                                value={priceEdits[m.id] !== undefined ? (priceEdits[m.id] === 0 ? '' : priceEdits[m.id]) : m.sale_price}
                                onChange={e => setPriceEdits(prev => ({ ...prev, [m.id]: e.target.value ? Number(e.target.value) : 0 }))}
                                className="w-[100px] rounded-sm border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs font-mono text-terminal-amber focus:outline-none focus:border-terminal-amber/60 transition-colors"
                              />
                              <GhostButton color="#30d158" disabled={savingPrice === m.id} onClick={() => handleSavePrice(m.id)}>
                                {savingPrice === m.id ? 'Saving...' : 'Save Price'}
                              </GhostButton>
                            </div>
                          </div>

                          {/* Allocation UI */}
                          <div className="mt-4 pt-4 border-t border-dashed border-zinc-800">
                            <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 mb-3">
                              <span>Inventory Central Stock: <strong className="text-zinc-200">{invRow?.units_in_stock || 0}</strong></span>
                              <span>Storage Cost: <span className="text-terminal-red">{fm(invRow?.storage_cost_per_month || 0)} / Month</span></span>
                            </div>

                            {/* ── LAYER 3: Supply vs Allocation Intelligence Panel ── */}
                            {(() => {
                              // Monthly production for this model across all active production lines
                              const monthlyProd = productionLines
                                .filter((l: any) => (l.assigned_vehicle_model_id === m.id || l.model_id_ref === m.id) && l.status === 'active')
                                .reduce((s: number, l: any) => {
                                  const f = factories.find((fac: any) => fac.id === l.factory_id);
                                  const planTarget = Number(l.target_units_per_month || 0);
                                  const planQuality = l.quality_setting || 'Standard';
                                  const defectRate = planQuality === 'Premium' ? 0.01 : planQuality === 'Budget' ? 0.05 : 0.03;
                                  const staffingRatio = f ? Math.min(1, totalWorkers / (f.worker_requirement || 30)) : 1;
                                  const efficiency = staffingRatio * ((f?.condition || 100) / 100);
                                  const estUnitsRaw = Math.floor(planTarget * efficiency);
                                  
                                  const cInv = mfgData?.componentInventory || [];
                                  const getInv = (cid: string) => cInv.find((i: any) => i.component_id === cid)?.units_in_stock || 0;
                                  let maxC = Math.floor(getInv('comp_engine'));
                                  maxC = Math.min(maxC, Math.floor(getInv('comp_transmission')));
                                  maxC = Math.min(maxC, Math.floor(getInv('comp_tyres') / 4));
                                  maxC = Math.min(maxC, Math.floor(getInv('comp_steel')));
                                  maxC = Math.min(maxC, Math.floor(getInv('comp_glass')));
                                  maxC = Math.min(maxC, Math.floor(getInv('comp_electronics')));

                                  const estUnitsProd = f ? Math.min(f.capacity_per_month, Math.min(estUnitsRaw, maxC)) : estUnitsRaw;
                                  const estDefects = Math.floor(estUnitsProd * defectRate);
                                  return s + (estUnitsProd - estDefects);
                                }, 0);

                              // Total monthly target allocated across all markets for this model
                              const totalAllocTarget = (marketData?.allocations || [])
                                .filter((a: any) => a.vehicle_model_id === m.id)
                                .reduce((s: number, a: any) => s + Number(a.monthly_target ?? a.units_allocated ?? 0), 0);

                              const currentStock = Number(invRow?.units_in_stock || 0);
                              const supplyNextMonth = currentStock + monthlyProd;
                              const surplus = supplyNextMonth - totalAllocTarget;
                              const monthsCover = totalAllocTarget > 0
                                ? (supplyNextMonth / totalAllocTarget).toFixed(1)
                                : '∞';
                              const isOverAllocated = surplus < 0;
                              const isUnderallocated = totalAllocTarget === 0 && currentStock > 0;

                              if (monthlyProd === 0 && totalAllocTarget === 0 && currentStock === 0) return null;

                              return (
                                <>
                                {currentStock === 0 && monthlyProd === 0 && (
                                  <div className="mb-4 rounded border border-terminal-red/30 bg-terminal-red/10 p-3 text-xs text-terminal-red">
                                    <strong>⚠️ 0 Inventory Stock</strong>
                                    <p className="mt-1 opacity-80">
                                      You cannot sell any cars if you have 0 in stock. If you planned to produce cars but stock is 0, your production likely failed (check HR for workers and Procurement for components). Revenue is only generated when units are actually sold.
                                    </p>
                                  </div>
                                )}
                                <div className={`mb-3 rounded border p-3 text-xs ${
                                  isOverAllocated
                                    ? 'border-terminal-amber/40 bg-terminal-amber/5'
                                    : isUnderallocated
                                    ? 'border-zinc-700/60 bg-zinc-900/40'
                                    : 'border-zinc-700/40 bg-zinc-900/30'
                                }`}>
                                  <div className="text-[10px] font-mono text-terminal-amber tracking-[0.1em] uppercase mb-2">
                                    Supply Intelligence
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5">
                                    <div>
                                      <div className="text-zinc-500 text-[10px]">Producing / Month</div>
                                      <div className="font-mono text-zinc-200 font-semibold">{monthlyProd} units</div>
                                    </div>
                                    <div>
                                      <div className="text-zinc-500 text-[10px]">Current Stock</div>
                                      <div className="font-mono text-zinc-200 font-semibold">{currentStock} units</div>
                                    </div>
                                    <div>
                                      <div className="text-zinc-500 text-[10px]">Total Targeted / Month</div>
                                      <div className={`font-mono font-semibold ${isOverAllocated ? 'text-terminal-amber' : 'text-zinc-200'}`}>
                                        {totalAllocTarget} units
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-zinc-500 text-[10px]">Stock Cover</div>
                                      <div className={`font-mono font-semibold ${
                                        Number(monthsCover) < 1 ? 'text-terminal-red' :
                                        Number(monthsCover) < 2 ? 'text-terminal-amber' : 'text-terminal-green'
                                      }`}>
                                        {monthsCover}× months
                                      </div>
                                    </div>
                                  </div>
                                  {isOverAllocated && (
                                    <div className="mt-2 pt-2 border-t border-terminal-amber/20 text-terminal-amber text-[11px]">
                                      ⚠ Allocation ({totalAllocTarget}) exceeds available supply ({supplyNextMonth} = {currentStock} stock + {monthlyProd} production).
                                      Markets will receive {Math.abs(surplus)} fewer units than targeted, distributed proportionally.
                                    </div>
                                  )}
                                  {isUnderallocated && (
                                    <div className="mt-2 pt-2 border-t border-zinc-700/30 text-zinc-500 text-[11px]">
                                      ℹ {currentStock} units in stock with no market allocation. Set allocations below to start selling.
                                    </div>
                                  )}
                                  {!isOverAllocated && !isUnderallocated && surplus > 0 && (
                                    <div className="mt-2 pt-2 border-t border-zinc-700/30 text-zinc-500 text-[11px]">
                                      ✓ Supply sufficient. {surplus} surplus units will carry over to next month's stock.
                                    </div>
                                  )}
                                </div>
                                </>
                              );
                            })()}
                            {/* ──────────────────────────────────────────────────────── */}

                            {(!marketData?.markets || marketData.markets.length === 0) ? (
                              <div className="mb-4 rounded border border-terminal-red/30 bg-terminal-red/10 p-4 text-xs text-terminal-red text-center">
                                <strong>⚠️ No Markets Found</strong>
                                <p className="mt-1 opacity-80">
                                  There are no active markets for your company's region ({company?.country_id || 'Unknown'}). Please contact support if this error persists.
                                </p>
                              </div>
                            ) : (
                              marketData?.markets?.map((market: any) => {
                              const formKey = `${m.id}-${market.id}`;
                              const alloc = allocationForm[formKey] || { units: 0, tier: 'none' };
                              const brand = marketData.brandData?.find((b: any) => b.region_market_id === market.id);

                              return (
                                <div key={market.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-3 border-b border-zinc-800/60 last:border-b-0">
                                  <div className="w-full lg:w-[300px] shrink-0">
                                    <div className="text-xs text-zinc-100 font-semibold mb-2">{market.name}</div>
                                    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2.5">
                                      <div className="text-[10px] font-mono text-terminal-amber font-bold uppercase tracking-[0.08em] mb-1.5">Local Brand Position</div>
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
                                            mainDriver = 'Production defects reduced buyer trust this Month.';
                                          } else if (Number(arcRes.trust_delta) > 0) {
                                            mainDriver = 'Reliable deliveries supported gradual local trust growth.';
                                          } else if (Number(arcRes.awareness_delta) > 0) {
                                            mainDriver = 'Marketing and completed deliveries increased local awareness.';
                                          }
                                        }

                                        return (
                                          <div className="flex flex-col gap-1 text-[11px]">
                                            <div className="flex justify-between gap-2">
                                              <span className="text-zinc-500">Local Brand Awareness:</span>
                                              <span className="text-zinc-200">{awText}</span>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                              <span className="text-zinc-500">Local Brand Trust:</span>
                                              <span className="text-zinc-200">{trText}</span>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                              <span className="text-zinc-500">Last Month Awareness Change:</span>
                                              <span className={awDeltaStr.startsWith('+') ? 'text-terminal-green' : awDeltaStr.startsWith('-') ? 'text-terminal-red' : 'text-zinc-600'}>{awDeltaStr}</span>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                              <span className="text-zinc-500">Last Month Trust Change:</span>
                                              <span className={trDeltaStr.startsWith('+') ? 'text-terminal-green' : trDeltaStr.startsWith('-') ? 'text-terminal-red' : 'text-zinc-600'}>{trDeltaStr}</span>
                                            </div>
                                            <div className="mt-1 italic text-zinc-600 text-[10px]">
                                              Main Brand Driver:<br />{mainDriver}
                                            </div>
                                          </div>
                                        );
                                      })() : (
                                        <div className="flex flex-col gap-1 text-[11px]">
                                          <div className="flex justify-between gap-2">
                                            <span className="text-zinc-500">Local Brand Awareness:</span>
                                            <span className="text-zinc-200">New to This Market</span>
                                          </div>
                                          <div className="flex justify-between gap-2">
                                            <span className="text-zinc-500">Local Brand Trust:</span>
                                            <span className="text-zinc-200">Unproven</span>
                                          </div>
                                          <div className="mt-1 italic text-zinc-600 text-[10px]">
                                            Main Brand Driver:<br />New to This Market. Local awareness and trust will develop after operating here.
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-zinc-500">Target Units:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={alloc.units === 0 ? '' : alloc.units}
                                        onChange={e => setAllocationForm(prev => ({ ...prev, [formKey]: { ...alloc, units: e.target.value ? Number(e.target.value) : 0 } }))}
                                        className="w-20 rounded-sm border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-terminal-amber/60 transition-colors"
                                      />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-zinc-500">Marketing:</span>
                                      <select
                                        value={alloc.tier}
                                        onChange={e => setAllocationForm(prev => ({ ...prev, [formKey]: { ...alloc, tier: e.target.value } }))}
                                        className="w-[110px] rounded-sm border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-terminal-amber/60 transition-colors cursor-pointer"
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
                            })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </PanelBox>
                </>
              )}

              
              {/* Recent Sales Results */}
              {marketData?.recentSales && marketData.recentSales.length > 0 && (
                <PanelBox>
                  <h3 className="text-[13px] font-bold text-zinc-100 m-0 mb-3">Recent Sales Results</h3>
                  <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="text-zinc-500 border-b border-zinc-800 text-[10px] font-mono uppercase tracking-[0.06em]">
                        <th className="px-1.5 py-2 font-medium">Model</th>
                        <th className="px-1.5 py-2 font-medium">Market</th>
                        <th className="px-1.5 py-2 font-medium">Sold</th>
                        <th className="px-1.5 py-2 font-medium">Demand</th>
                        <th className="px-1.5 py-2 font-medium" title="Demand Capture (Percentage of your own demand met. This is NOT total market share.)">Capture*</th>
                        <th className="px-1.5 py-2 font-medium">Afford.</th>
                        <th className="px-1.5 py-2 font-medium">Fit</th>
                        <th className="px-1.5 py-2 font-medium">Awareness</th>
                        <th className="px-1.5 py-2 font-medium">Result Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketData.recentSales.slice(0, 15).map((rs: any) => {
                        const mName = models.find((m: any) => m.id === rs.vehicle_model_id)?.name || 'Unknown Model';
                        const mktName = marketData.markets?.find((m: any) => m.id === rs.region_market_id)?.name || 'Unknown Market';
                        return (
                          <tr key={rs.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                            <td className="px-1.5 py-2 text-terminal-amber">{mName}</td>
                            <td className="px-1.5 py-2 text-zinc-200">{mktName}</td>
                            <td className="px-1.5 py-2 text-terminal-green font-mono font-bold">{rs.units_sold}</td>
                            <td className="px-1.5 py-2 text-zinc-600 font-mono">{Math.round(rs.raw_buyer_interest || 0)}</td>
                            <td className="px-1.5 py-2 text-zinc-200 font-mono">{Math.round((rs.market_share_estimate || 0) * 100)}%</td>
                            <td className={`px-1.5 py-2 font-mono ${rs.affordability_multiplier < 0.6 ? 'text-terminal-red' : 'text-zinc-500'}`}>{rs.affordability_multiplier || '-'}</td>
                            <td className={`px-1.5 py-2 font-mono ${rs.vehicle_market_fit_multiplier < 0.6 ? 'text-terminal-red' : 'text-zinc-500'}`}>{rs.vehicle_market_fit_multiplier || '-'}</td>
                            <td className={`px-1.5 py-2 font-mono ${rs.awareness_multiplier < 0.3 ? 'text-terminal-red' : 'text-zinc-500'}`}>{rs.awareness_multiplier || '-'}</td>
                            <td className="px-1.5 py-2 text-zinc-600">{rs.main_reason_code || 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </PanelBox>
              )}
              
              {/* Leaderboard / Regional Market Share */}
              {leaderboardData && leaderboardData.segments && leaderboardData.segments.length > 0 && (
                <PanelBox>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[13px] font-bold text-zinc-100 m-0">Regional Market Share</h3>
                    <select
                      value={selectedLeaderboardRegion}
                      onChange={e => setSelectedLeaderboardRegion(e.target.value)}
                      className="rounded-sm border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-terminal-amber/60 transition-colors cursor-pointer"
                    >
                      {leaderboardData.segments.map((seg: any) => (
                        <option key={seg.segmentId} value={seg.segmentId}>{seg.marketName}</option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const selectedSegment = leaderboardData.segments.find((s: any) => s.segmentId === selectedLeaderboardRegion) || leaderboardData.segments[0];
                    const pieData = selectedSegment?.companies || [];
                    
                    if (pieData.length === 0) {
                      return <div className="text-zinc-500 text-xs italic text-center p-4">No sales data for this region last month.</div>;
                    }
                    
                    return (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={pieData}
                              dataKey="marketShare"
                              nameKey="companyName"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                            >
                              {pieData.map((entry: any, index: number) => {
                                const hash = [...(entry.companyName || '')].reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                const hue = (hash * 137.5) % 360;
                                return <Cell key={`cell-${index}`} fill={`hsl(${hue}, 70%, 50%)`} />;
                              })}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value: any, name: any, props: any) => {
                                return [`${(Number(value)).toFixed(1)}%`, `Market Share`];
                              }}
                              contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #2a2a2a' }}
                            />
                            <Legend 
                              layout="vertical" 
                              verticalAlign="top" 
                              align="right"
                              wrapperStyle={{ fontSize: '11px', color: '#fffff0', padding: '10px' }}
                              formatter={(value, entry: any) => {
                                return (
                                  <span style={{ color: '#fffff0', marginLeft: '4px' }}>
                                    {value} ({(entry.payload.marketShare).toFixed(1)}%)
                                  </span>
                                );
                              }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </PanelBox>
              )}
            
            </>
          )}
        </div>
      )}


      {/* ────────────────────────────────────────────────────────────────────────
          MARKET INTELLIGENCE TAB
      ──────────────────────────────────────────────────────────────────────── */}
      {deskTab === 'market' && (
        <div className="flex flex-col gap-5">
          <SectionHeader stamp="MARKET INTEL">Market Intelligence</SectionHeader>

          {marketLoading ? (
            <div className="text-zinc-500 text-xs p-6 font-mono animate-pulse">Loading market data...</div>
          ) : marketError ? (
            <div className="rounded-md border border-terminal-red/40 bg-terminal-red/10 p-5 text-xs text-terminal-red">
              <div className="font-bold text-sm mb-1">⚠ Market Data Load Failed</div>
              <div className="font-mono opacity-80 mb-3">{marketError}</div>
              <GhostButton onClick={loadMarketData}>Retry</GhostButton>
            </div>
          ) : (
            <>
              {/* Market Intelligence */}
              <PanelBox>
                <h3 className="text-[13px] font-bold text-zinc-100 m-0 mb-3">Market Intelligence</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(!marketData?.markets || marketData.markets.length === 0) ? (
                    <div className="col-span-1 md:col-span-2 p-6 rounded-md border border-terminal-red/30 bg-terminal-red/5 text-center flex flex-col items-center justify-center gap-3 text-zinc-300">
                      <div className="w-12 h-12 rounded-full bg-terminal-red/10 flex items-center justify-center text-terminal-red text-2xl">⚠️</div>
                      <h4 className="font-bold text-sm text-zinc-100 m-0">No Regional Markets Found</h4>
                      <p className="text-xs max-w-md opacity-80 m-0">
                        We could not find any active markets for your company's region ({company?.country_id || 'Unknown'}). If this persists, please try refreshing the page or checking your company registry.
                      </p>
                    </div>
                  ) : (
                    marketData?.markets?.map((market: any) => (
                      <div key={market.id} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3.5 hover:border-zinc-700 transition-colors">

                      <div className="text-xs font-semibold text-terminal-amber mb-2">{market.name}</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="text-zinc-500">Population: <span className="text-zinc-200">{Number(market.population).toLocaleString('en-US')}</span></div>
                        <div className="text-zinc-500">Avg Income: <span className="text-zinc-200">{fm(market.average_income)}</span></div>
                        <div className="text-zinc-500">Market Tier: <span className="text-zinc-200">{market.market_tier}</span></div>
                        <div className="text-zinc-500">Competition: <span className="text-terminal-red">{market.competition_level}</span></div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-zinc-800/60 flex gap-3 text-[11px] text-zinc-500">
                        <span>Compact: {Math.round(market.preference_compact * 100)}%</span>
                        <span>Sedan: {Math.round(market.preference_sedan * 100)}%</span>
                        <span>Van: {Math.round(market.preference_utility_van * 100)}%</span>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </PanelBox>

              
              {/* Population Purchase Outlook */}
              {marketData?.forecast && marketData.forecast.length > 0 && (
                <PanelBox>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-bold text-zinc-100 m-0">Global Sales Summary</h3>
                  </div>
                  
                  <div className="flex gap-6 mb-4 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-md">
                    {(() => {
                      const totalAlloc = marketData.forecast.reduce((sum: number, fc: any) => sum + (Number(fc.alloc.units_allocated) || 0), 0);
                      const totalInt = marketData.forecast.reduce((sum: number, fc: any) => sum + Math.round(fc.rawBuyerInterest || 0), 0);
                      const totalSold = marketData.forecast.reduce((sum: number, fc: any) => sum + (Number(fc.unitsSold) || 0), 0);
                      return (
                        <>
                          <div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Total Allocated</div>
                            <div className="text-sm font-mono text-zinc-200">{totalAlloc.toLocaleString('en-US')}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Total Interest</div>
                            <div className="text-sm font-mono text-zinc-200">{totalInt.toLocaleString('en-US')}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Est. Total Sold</div>
                            <div className="text-sm font-mono text-terminal-green font-bold">{totalSold.toLocaleString('en-US')}</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* New Model Breakdown Table */}
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="text-zinc-500 border-b border-zinc-800 text-[10px] font-mono uppercase tracking-[0.06em]">
                          <th className="px-1.5 py-2 font-medium">Model</th>
                          <th className="px-1.5 py-2 font-medium text-right">Total Allocated</th>
                          <th className="px-1.5 py-2 font-medium text-right">Total Interest</th>
                          <th className="px-1.5 py-2 font-medium text-right text-terminal-amber">Est. Total Sold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Group by model
                          const summaryByModel: Record<string, { alloc: number; interest: number; sold: number; name: string; status: string }> = {};
                          marketData.forecast.forEach((fc: any) => {
                            const mid = fc.alloc.vehicle_model_id;
                            if (!summaryByModel[mid]) {
                              // Ensure models exists (should be in scope from ManufacturingDeskTab)
                              const modelObj = models?.find((m: any) => m.id === mid);
                              const mName = modelObj?.name || 'Unknown Model';
                              const mStatus = modelObj?.status || 'active';
                              summaryByModel[mid] = { alloc: 0, interest: 0, sold: 0, name: mName, status: mStatus };
                            }
                            summaryByModel[mid].alloc += Number(fc.alloc.units_allocated) || 0;
                            summaryByModel[mid].interest += Math.round(fc.rawBuyerInterest || 0);
                            summaryByModel[mid].sold += Number(fc.unitsSold) || 0;
                          });
                          
                          return Object.values(summaryByModel)
                            .filter(sm => !(sm.status === 'discontinued' && sm.alloc === 0))
                            .map((sm, idx) => (
                            <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                              <td className="px-1.5 py-2 text-zinc-200">{sm.name}</td>
                              <td className="px-1.5 py-2 text-zinc-500 font-mono text-right">{sm.alloc.toLocaleString('en-US')}</td>
                              <td className="px-1.5 py-2 text-zinc-200 font-mono text-right">{sm.interest.toLocaleString('en-US')}</td>
                              <td className="px-1.5 py-2 text-terminal-green font-mono font-bold text-right">{sm.sold.toLocaleString('en-US')}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between mb-3 mt-8">
                    <h3 className="text-[13px] font-bold text-zinc-100 m-0">Population Purchase Outlook</h3>
                  </div>

                  <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="text-zinc-500 border-b border-zinc-800 text-[10px] font-mono uppercase tracking-[0.06em]">
                        <th className="px-1.5 py-2 font-medium">Model</th>
                        <th className="px-1.5 py-2 font-medium">Market</th>
                        <th className="px-1.5 py-2 font-medium">Allocated</th>
                        <th className="px-1.5 py-2 font-medium">Households</th>
                        <th className="px-1.5 py-2 font-medium">Buyers (Cap.)</th>
                        <th className="px-1.5 py-2 font-medium">Interest</th>
                        <th className="px-1.5 py-2 font-medium text-terminal-amber cursor-help" title="Demand is absolute and based on your car's stats, price, and brand awareness. Zero competition does not mean buyers will settle for a bad or unknown car.">Est. Sold ⓘ</th>
                        <th className="px-1.5 py-2 font-medium">Afford.</th>
                        <th className="px-1.5 py-2 font-medium">Fit</th>
                        <th className="px-1.5 py-2 font-medium">Awareness</th>
                        <th className="px-1.5 py-2 font-medium">Trust</th>
                        <th className="px-1.5 py-2 font-medium">Distrib.</th>
                        <th className="px-1.5 py-2 font-medium">Marketing</th>
                        <th className="px-1.5 py-2 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketData.forecast
                        .filter((fc: any) => {
                           const modelObj = models.find((m: any) => m.id === fc.alloc.vehicle_model_id);
                           const isDiscontinued = modelObj?.status === 'discontinued';
                           const hasZeroAlloc = (Number(fc.alloc.units_allocated) || 0) === 0;
                           return !(isDiscontinued && hasZeroAlloc);
                        })
                        .map((fc: any, idx: number) => {
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
                          <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                            <td className="px-1.5 py-2 text-zinc-200">{mName}</td>
                            <td className="px-1.5 py-2 text-zinc-200">{mktName}</td>
                            <td className="px-1.5 py-2 text-zinc-500 font-mono">{fc.alloc.units_allocated}</td>
                            <td className="px-1.5 py-2 text-zinc-500 font-mono">{fc.totalHouseholds.toLocaleString('en-US')}</td>
                            <td className="px-1.5 py-2 text-zinc-500 font-mono">{fc.marketPurchaseCapacity.toLocaleString('en-US')}</td>
                            <td className="px-1.5 py-2 text-zinc-200 font-mono">{Math.round(fc.rawBuyerInterest)}</td>
                            <td className="px-1.5 py-2 text-terminal-green font-mono font-bold">{fc.unitsSold}</td>
                            <td className={`px-1.5 py-2 ${affStr === 'Weak' ? 'text-terminal-red' : 'text-zinc-500'}`}>{affStr}</td>
                            <td className={`px-1.5 py-2 ${fitStr === 'Weak' ? 'text-terminal-red' : 'text-zinc-500'}`}>{fitStr}</td>
                            <td className={`px-1.5 py-2 ${awrStr === 'New' ? 'text-terminal-red' : 'text-zinc-500'}`}>{awrStr}</td>
                            <td className={`px-1.5 py-2 ${trsStr === 'Unproven' ? 'text-terminal-red' : 'text-zinc-500'}`}>{trsStr}</td>
                            <td className={`px-1.5 py-2 ${distStr === 'Limited' ? 'text-terminal-red' : 'text-zinc-500'}`}>{distStr}</td>
                            <td className="px-1.5 py-2 text-zinc-500 capitalize">{fc.mktTier}</td>
                            <td className="px-1.5 py-2 text-terminal-amber">{fc.mainReasonCode}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-2 italic">*Brand metrics are local to this market.</div>
                </PanelBox>
              )}

              
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          PERFORMANCE HISTORY TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'history' && (
        <div className="flex flex-col gap-5">
          <SectionHeader stamp="ANALYTICS DESK">Performance History</SectionHeader>
          <PanelBox>
            {(!modelSnapshots || modelSnapshots.length === 0) ? (
              <EmptyState
                icon="📈"
                title="No performance history available yet."
                subtitle="Snapshots are generated after a month closes."
              />
            ) : (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: T.muted, borderBottom: `1px solid ${T.border}` }}>
                      <th style={{ paddingBottom: '8px', fontWeight: 'normal' }}>Model</th>
                      <th style={{ paddingBottom: '8px', fontWeight: 'normal' }}>Month</th>
                      <th style={{ paddingBottom: '8px', fontWeight: 'normal' }}>Built</th>
                      <th style={{ paddingBottom: '8px', fontWeight: 'normal' }}>Sold</th>
                      <th style={{ paddingBottom: '8px', fontWeight: 'normal' }}>Revenue</th>
                      <th style={{ paddingBottom: '8px', fontWeight: 'normal' }}>Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelSnapshots.sort((a: any, b: any) => b.world_year - a.world_year || b.world_month - a.world_month).map((s: any) => {
                      const model = models.find((m: any) => m.id === s.model_id);
                      return (
                        <tr key={`${s.model_id}-${s.world_year}-${s.world_month}`} style={{ borderBottom: `1px dashed ${T.border}33` }}>
                          <td style={{ padding: '8px 0', color: T.ivory, fontWeight: 'bold' }}>{model?.name || 'Unknown Model'}</td>
                          <td style={{ padding: '8px 0', color: T.ivory }}>Year {s.world_year}, M{s.world_month}</td>
                          <td style={{ padding: '8px 0', color: T.muted }}>{s.units_produced}</td>
                          <td style={{ padding: '8px 0', color: T.mint }}>{s.units_sold}</td>
                          <td style={{ padding: '8px 0', color: T.gold }}>{fm(s.sales_revenue)}</td>
                          <td style={{ padding: '8px 0', color: Number(s.direct_contribution) < 0 ? T.red : T.mint }}>{fm(s.direct_contribution)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PanelBox>
        </div>
      )}

{deskTab === 'staff' && (
        <div className="flex flex-col gap-5">
          <SectionHeader stamp="STAFFING DESK">Company Workforce</SectionHeader>

          {plannedUnits === 0 && (
            <div className="rounded-md border border-terminal-red/50 bg-terminal-red/10 px-4 py-3 text-xs text-zinc-200">
              <span className="font-bold text-terminal-red mr-2">No active production plan.</span>
              Create a production plan to see workforce requirements. Workers will not produce vehicles without an active target.
            </div>
          )}

          {/* Top Summary Grid */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <PanelBox className="p-3">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.12em] mb-1">Total Staff</div>
              <div className="text-lg font-bold font-mono text-zinc-100">{totalStaff}</div>
              <div className="text-[11px] font-mono text-terminal-red mt-1">{fm(totalWagesPerArc)} / Month</div>
            </PanelBox>
            <PanelBox className={`p-3 ${totalWorkers < recWorkers ? 'border-terminal-red/50' : ''}`}>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.12em] mb-1">Factory Workers</div>
              <div className={`text-lg font-bold font-mono ${totalWorkers >= recWorkers ? 'text-terminal-green' : 'text-terminal-red'}`}>
                {totalWorkers} <span className="text-zinc-600 text-sm">/ {recWorkers}</span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {totalWorkers >= recWorkers ? 'Adequately Staffed' : 'Understaffed'}
              </div>
            </PanelBox>
            <PanelBox className="p-3">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.12em] mb-1">Prod Efficiency</div>
              <div className="text-lg font-bold font-mono text-zinc-100">
                {Math.round(Math.min(1.0, recWorkers === 0 ? 1 : totalWorkers / recWorkers) * 100)}%
              </div>
              <div className="text-[11px] text-terminal-green mt-1">
                +{Math.min(supervisorCount, activeLinesCount) > 0 ? 5 : 0}% Supervisor Bonus
              </div>
            </PanelBox>
            <PanelBox className="p-3">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.12em] mb-1">Sales Effectiveness</div>
              <div className="text-lg font-bold font-mono text-zinc-100">
                +{Math.min(16, Math.min(salesManagerCount, activeMarketCount) * 4)}%
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {Math.min(salesManagerCount, activeMarketCount)} Managers in {activeMarketCount} Active Markets
              </div>
            </PanelBox>
          </div>

          <div className="flex flex-col gap-3">
            {staffRoles.map((roleDef: any) => {
              const employed = staff.find((s: any) => s.role === roleDef.id)?.quantity || 0;

              // Compute effect text
              let effectText = '';
              let effectClass = 'text-zinc-500';
              if (roleDef.id === 'factory-worker') {
                const pct = recWorkers > 0 ? Math.round((employed / recWorkers) * 100) : 100;
                effectText = `${employed} / ${recWorkers} required (${pct}% coverage)`;
                effectClass = employed >= recWorkers ? 'text-terminal-green' : 'text-terminal-red';
                if (recWorkers === 0) effectText = 'At capacity (no active lines)';
              } else if (roleDef.id === 'production-supervisor') {
                const bonus = Math.min(employed, activeLinesCount) > 0 ? 5 : 0;
                effectText = activeLinesCount === 0 ? 'No benefit — no active lines' : `+${bonus}% production efficiency`;
                effectClass = bonus > 0 ? 'text-terminal-green' : 'text-zinc-500';
              } else if (roleDef.id === 'quality-inspector') {
                // assume base defect rate is roughly 3% for display
                const baseDefect = 3.0;
                const reduction = Math.min(employed * 0.5, baseDefect - 0.5);
                const effective = Math.max(0.5, baseDefect - reduction);
                effectText = `-${reduction.toFixed(1)}% defect rate (effective ~${effective.toFixed(1)}%)`;
                effectClass = reduction > 0 ? 'text-terminal-green' : 'text-zinc-500';
              } else if (roleDef.id === 'sales-manager') {
                const useful = Math.min(employed, activeMarketCount);
                const bonus = useful * 4;
                effectText = `+${bonus}% sales effectiveness (${useful} markets covered)`;
                effectClass = bonus > 0 ? 'text-terminal-green' : 'text-zinc-500';
              } else if (roleDef.id === 'automotive-engineer') {
                const discount = Math.min(employed * 5, 20);
                effectText = `-${discount}% future development cost`;
                effectClass = discount > 0 ? 'text-terminal-green' : 'text-zinc-500';
              }

              return (
                <PanelBox key={roleDef.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="text-sm font-bold text-zinc-100">{roleDef.label}</div>
                      <div className="text-[11px] font-mono text-terminal-red">{fm(roleDef.wagePerArc)} / Month</div>
                    </div>
                    <div className="text-[11px] text-zinc-500 mb-2 max-w-[600px] leading-relaxed">
                      {roleDef.desc || 'No description available.'}
                    </div>
                    <div className={`text-[11px] font-semibold ${effectClass}`}>
                      Current Effect: {effectText}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right pr-4 border-r border-zinc-800">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.08em]">Employed</div>
                      <div className="text-xl font-bold font-mono text-terminal-amber">{employed}</div>
                    </div>
                    <div className="flex flex-col gap-1.5 w-[110px]">
                      <input
                        type="number"
                        min="1"
                        value={staffQuantities[roleDef.id] || "1"}
                        onChange={(e) => setStaffQuantities({ ...staffQuantities, [roleDef.id]: e.target.value })}
                        className="bg-zinc-900 border border-zinc-700 rounded text-center text-xs py-1 text-zinc-300 w-full"
                        placeholder="Qty"
                      />
                      <GhostButton color="#30d158" onClick={() => handleHireFire(roleDef.id, 'hire')} className="w-full justify-center">+ Hire</GhostButton>
                      <GhostButton color="#ff453a" disabled={employed === 0} onClick={() => handleHireFire(roleDef.id, 'fire')} className="w-full justify-center">- Dismiss</GhostButton>
                    </div>
                  </div>
                </PanelBox>
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════════════════════——═════════════════════════════
          FINANCE TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'finance' && (
        <div className="flex flex-col gap-5">
          <SectionHeader stamp="ACCOUNTING DESK">Company Finances</SectionHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Finance Summary */}
            <PanelBox>
              <h3 className="text-[13px] font-bold text-zinc-100 m-0 mb-3">Current Position</h3>
              <FieldRow label="Available Cash" value={fm(finances?.available_cash || 0)} valueColor={T.mint} />
              <FieldRow label="Company Value (Book)" value={finances ? fm(Number(finances.company_value || 0)) : 'Not Available'} />
              <FieldRow label="Inventory Value" value={fm(inventoryValue)} />
              <FieldRow label="Last Month Revenue" value={finances?.last_arc_profit !== undefined ? (latestReport ? fm(latestReport.gross_revenue) : fm(0)) : 'Not Available'} valueColor={T.mint} />
              <FieldRow label="Last Month Operating Profit" value={finances?.last_arc_profit !== undefined ? (latestReport ? fm(latestReport.net_profit) : fm(0)) : 'Not Available'} />
              <FieldRow label="Last Month Net Profit" value={finances?.last_arc_profit !== undefined ? fm(finances.last_arc_profit) : 'Not Available'} valueColor={(finances?.last_arc_profit || 0) < 0 ? T.red : T.mint} />
              <FieldRow label="Outstanding Debt" value={finances?.debt && Number(finances.debt) > 0 ? fm(finances.debt) : 'No debt recorded'} valueColor={(finances?.debt || 0) > 0 ? T.red : T.faint} />
            </PanelBox>

            {/* Next Month Commitments */}
            <PanelBox>
              <h3 className="text-[13px] font-bold text-zinc-100 m-0 mb-3">Next Month Commitments</h3>
              <p className="text-[12px] text-zinc-500 mb-3">Estimated recurring costs for the upcoming month.</p>
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
                productionLines.reduce((acc: number, line: any) => acc + (Number(line.target_units_per_month) * Number(line.model_cost_per_unit || 0)), 0)
              )} valueColor={T.red} />

              <FieldRow label="Vehicle Development Cost" value={fm(0)} valueColor={T.faint} />
              <FieldRow label="Research Cost" value={fm(0)} valueColor={T.faint} />

              <div className="mt-3 pt-2 border-t border-zinc-800">
                <FieldRow label="Estimated Total Next Month Cost" value={fm(
                  leaseCostPerArc + maintCostPerArc + totalWagesPerArc +
                  (marketData?.allocations?.reduce((acc: number, alloc: any) => {
                    return acc + (MKT_COSTS[alloc.marketing_tier] || 0);
                  }, 0) || 0) +
                  inventory.reduce((acc: number, inv: any) => acc + (Number(inv.units_in_stock) * STORAGE_COST_PER_UNIT), 0) +
                  productionLines.reduce((acc: number, line: any) => acc + (Number(line.target_units_per_month) * Number(line.model_cost_per_unit || 0)), 0)
                )} valueColor="#ff453a" />
              </div>
              <div className="mt-2 text-[10px] text-zinc-600 italic">
                * Final costs and revenue are calculated at Month Close.
              </div>
            </PanelBox>
          </div>

          {/* Last Month Profit and Loss */}
          <PanelBox>
            <h3 className="text-[13px] font-bold text-zinc-100 m-0 mb-4">Last Month Profit and Loss</h3>
            {latestReport ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-xs font-semibold text-terminal-amber border-b border-zinc-800 pb-1 mb-2">Revenue</div>
                  <FieldRow label="Vehicle Sales Revenue" value={fm(latestReport.gross_revenue)} valueColor={T.mint} />
                </div>

                <div>
                  <div className="text-xs font-semibold text-terminal-amber border-b border-zinc-800 pb-1 mb-2">Cost of Goods Sold</div>
                  <FieldRow label="Vehicle Production Cost" value={fm(latestReport.production_costs)} valueColor="#ff453a" />
                  <FieldRow label="Defective Unit Losses" value={fm(0)} valueColor={Number(latestReport.defective_units) > 0 ? '#ff453a' : 'rgb(113, 113, 122)'} />
                </div>

                <div>
                  <div className="text-xs font-semibold text-terminal-amber border-b border-zinc-800 pb-1 mb-2">Operating Expenses</div>
                  <FieldRow label="Factory Lease" value={fm(latestReport.factory_lease_costs)} valueColor="#ff453a" />
                  <FieldRow label="Factory Maintenance" value={fm(latestReport.factory_maintenance_costs)} valueColor="#ff453a" />
                  <FieldRow label="Manufacturing Wages" value={fm(latestReport.staff_wages)} valueColor="#ff453a" />
                  <FieldRow label="Marketing Expense" value={fm(latestReport.marketing_costs)} valueColor="#ff453a" />
                  <FieldRow label="Inventory Storage Cost" value={fm(latestReport.inventory_storage_costs)} valueColor="#ff453a" />
                  <FieldRow label="Warranty Reserve" value={fm(latestReport.warranty_reserve_cost || 0)} valueColor="#ff453a" />
                  <FieldRow label="Vehicle Development Expense" value={fm(0)} valueColor="rgb(113, 113, 122)" />
                  <FieldRow label="Research Expense" value={fm(0)} valueColor="rgb(113, 113, 122)" />
                </div>

                <div>
                  <div className="text-xs font-semibold text-terminal-amber border-b border-zinc-800 pb-1 mb-2">Result</div>
                  <FieldRow label="Operating Profit" value={fm(Number(latestReport.gross_revenue) - Number(latestReport.production_costs) - Number(latestReport.factory_lease_costs) - Number(latestReport.factory_maintenance_costs) - Number(latestReport.staff_wages) - Number(latestReport.inventory_storage_costs) - Number(latestReport.marketing_costs) - Number(latestReport.warranty_reserve_cost || 0))} valueColor={Number(latestReport.gross_revenue) - Number(latestReport.production_costs) - Number(latestReport.factory_lease_costs) - Number(latestReport.factory_maintenance_costs) - Number(latestReport.staff_wages) - Number(latestReport.inventory_storage_costs) - Number(latestReport.marketing_costs) - Number(latestReport.warranty_reserve_cost || 0) >= 0 ? '#30d158' : '#ff453a'} />
                  <FieldRow label="Net Profit / Loss" value={fm(latestReport.net_profit)} valueColor={Number(latestReport.net_profit) >= 0 ? '#30d158' : '#ff453a'} />
                  <FieldRow label="Ending Cash" value={fm(latestReport.ending_cash)} valueColor="#30d158" />
                </div>
              </div>
            ) : (
              <EmptyState
                icon="📊"
                title="No financial activity has been recorded yet."
                subtitle="Your first report will appear after production and sales resolve at Month Close."
              />
            )}
          </PanelBox>

          {/* Financial Analytics */}
          <PanelBox>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-[13px] font-bold text-zinc-100 m-0">Financial Analytics</h3>
                {financeChartFilter === 'historical' && (
                  <select
                    value={financeTimeline}
                    onChange={(e) => setFinanceTimeline(Number(e.target.value))}
                    className="bg-zinc-950 text-zinc-300 text-[10px] uppercase font-mono tracking-wider border border-zinc-800/60 rounded-sm px-2 py-1 outline-none"
                  >
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months</option>
                    <option value={24}>24 Months</option>
                    <option value={60}>5 Years</option>
                    <option value={9999}>All Time</option>
                  </select>
                )}
              </div>
              <div className="flex gap-2 bg-zinc-950 p-1 rounded-sm border border-zinc-800/60">
                <button
                  onClick={() => setFinanceChartFilter('expenses')}
                  className={`px-3 py-1 text-[10px] uppercase font-mono tracking-wider rounded-sm transition-colors ${financeChartFilter === 'expenses' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Expenses
                </button>
                <button
                  onClick={() => setFinanceChartFilter('historical')}
                  className={`px-3 py-1 text-[10px] uppercase font-mono tracking-wider rounded-sm transition-colors ${financeChartFilter === 'historical' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  History
                </button>
                <button
                  onClick={() => setFinanceChartFilter('staff')}
                  className={`px-3 py-1 text-[10px] uppercase font-mono tracking-wider rounded-sm transition-colors ${financeChartFilter === 'staff' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Staff vs Ops
                </button>
              </div>
            </div>

            <div className="h-[260px] w-full mt-4">
              {financeChartFilter === 'expenses' && latestReport && (
                <div className="flex flex-col h-full w-full">
                  <div className="flex gap-6 items-center justify-center mb-2 shrink-0">
                    <div className="text-center bg-zinc-900/50 px-3 py-1.5 rounded border border-zinc-800/50">
                      <div className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider mb-0.5">Revenue</div>
                      <div className="text-xs font-mono text-[#36d399] font-bold">{fm(Number(latestReport.gross_revenue || 0))}</div>
                    </div>
                    <div className="text-center bg-zinc-900/50 px-3 py-1.5 rounded border border-zinc-800/50">
                      <div className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider mb-0.5">Total Expenses</div>
                      <div className="text-xs font-mono text-[#b85555] font-bold">
                        {fm(Number(latestReport.production_costs || 0) + Number(latestReport.factory_lease_costs || 0) + Number(latestReport.factory_maintenance_costs || 0) + Number(latestReport.staff_wages || 0) + Number(latestReport.marketing_costs || 0) + Number(latestReport.inventory_storage_costs || 0))}
                      </div>
                    </div>
                    <div className="text-center bg-zinc-900/50 px-3 py-1.5 rounded border border-zinc-800/50">
                      <div className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider mb-0.5">Net Profit</div>
                      <div className={`text-xs font-mono font-bold ${Number(latestReport.net_profit) >= 0 ? 'text-[#d4af37]' : 'text-red-500'}`}>{fm(Number(latestReport.net_profit || 0))}</div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: 'Production', value: Number(latestReport.production_costs || 0) },
                          { name: 'Factory Lease', value: Number(latestReport.factory_lease_costs || 0) },
                          { name: 'Factory Maint.', value: Number(latestReport.factory_maintenance_costs || 0) },
                          { name: 'Wages', value: Number(latestReport.staff_wages || 0) },
                          { name: 'Marketing', value: Number(latestReport.marketing_costs || 0) },
                          { name: 'Storage', value: Number(latestReport.inventory_storage_costs || 0) }
                      ].filter(d => d.value > 0)}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                    >
                      {[
                        { name: 'Production', value: Number(latestReport.production_costs || 0) },
                        { name: 'Factory Lease', value: Number(latestReport.factory_lease_costs || 0) },
                        { name: 'Factory Maint.', value: Number(latestReport.factory_maintenance_costs || 0) },
                        { name: 'Wages', value: Number(latestReport.staff_wages || 0) },
                        { name: 'Marketing', value: Number(latestReport.marketing_costs || 0) },
                        { name: 'Storage', value: Number(latestReport.inventory_storage_costs || 0) }
                      ].filter(d => d.value > 0).map((entry, index) => {
                        const colors = ['#b85555', '#d4af37', '#6ea8fe', '#36d399', '#ab7dd6', '#e67e22'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any) => fm(Number(value))}
                      contentStyle={{ backgroundColor: '#11131A', borderColor: '#2A2630', fontSize: '12px', fontFamily: 'monospace' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              )}
              {financeChartFilter === 'expenses' && !latestReport && (
                <div className="flex items-center justify-center h-full text-xs text-zinc-500 italic">No report available for chart.</div>
              )}

              {financeChartFilter === 'historical' && allReports?.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...allReports].slice(0, financeTimeline).reverse().map(r => ({
                      ...r,
                      label: `Y${r.world_year} M${r.world_month}`,
                      total_expenses: Number(r.production_costs || 0) + Number(r.factory_lease_costs || 0) + Number(r.factory_maintenance_costs || 0) + Number(r.staff_wages || 0) + Number(r.marketing_costs || 0) + Number(r.inventory_storage_costs || 0)
                  }))} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2630" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => fm(val).replace(currencySymbol, '')} tick={{ fontSize: 10, fill: '#888', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      formatter={(value: any) => fm(Number(value))}
                      labelFormatter={(l, p) => p?.[0]?.payload ? `Year ${p[0].payload.world_year} Month ${p[0].payload.world_month}` : l}
                      contentStyle={{ backgroundColor: '#11131A', borderColor: '#2A2630', fontSize: '12px', fontFamily: 'monospace' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }} />
                    <Bar dataKey="gross_revenue" name="Revenue" fill={T.mint} radius={[2, 2, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="total_expenses" name="Total Expenses" fill={T.red} radius={[2, 2, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="net_profit" name="Net Profit" fill={T.gold} radius={[2, 2, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {financeChartFilter === 'historical' && (!allReports || allReports.length === 0) && (
                <div className="flex items-center justify-center h-full text-xs text-zinc-500 italic">No historical data available.</div>
              )}

              {financeChartFilter === 'staff' && latestReport && (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Staff Wages', value: Number(latestReport.staff_wages || 0) },
                        { name: 'Other Operations', value: Number(latestReport.production_costs || 0) + Number(latestReport.factory_lease_costs || 0) + Number(latestReport.factory_maintenance_costs || 0) + Number(latestReport.marketing_costs || 0) + Number(latestReport.inventory_storage_costs || 0) }
                      ].filter(d => d.value > 0)}
                      cx="50%" cy="50%" innerRadius={0} outerRadius={80} dataKey="value"
                    >
                      {[
                        { name: 'Staff Wages', value: Number(latestReport.staff_wages || 0) },
                        { name: 'Other Operations', value: Number(latestReport.production_costs || 0) + Number(latestReport.factory_lease_costs || 0) + Number(latestReport.factory_maintenance_costs || 0) + Number(latestReport.marketing_costs || 0) + Number(latestReport.inventory_storage_costs || 0) }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? T.blue : T.red} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any) => fm(Number(value))}
                      contentStyle={{ backgroundColor: '#11131A', borderColor: '#2A2630', fontSize: '12px', fontFamily: 'monospace' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
              {financeChartFilter === 'staff' && !latestReport && (
                <div className="flex items-center justify-center h-full text-xs text-zinc-500 italic">No report available for chart.</div>
              )}
            </div>
          </PanelBox>

          {/* Ledger */}
          <PanelBox>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h3 className="text-[13px] font-bold text-zinc-100 m-0">Manufacturing Ledger</h3>
              <div className="flex gap-2 flex-wrap">
                {['All', 'Revenue', 'Production', 'Workforce', 'Factory', 'Marketing', 'Storage', 'Development'].map(filter => (
                  <button key={filter} onClick={() => setLedgerFilter(filter)} className={`rounded-sm px-2 py-1 text-[10px] font-mono uppercase tracking-[0.08em] transition-colors ${
                    ledgerFilter === filter 
                      ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/60' 
                      : 'bg-transparent text-zinc-500 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                  }`}>
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
                    <th style={{ padding: '8px' }}>Date / Month</th>
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
                      <td style={{ padding: '8px', color: T.muted, whiteSpace: 'nowrap' }}>{formatWorldDateShort(entry.game_year, entry.game_month)}</td>
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
        <div className="flex flex-col gap-5">
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
                    record_type: 'Month Report',
                    created_at_world_year: r.world_year,
                    created_at_world_month: r.world_month,
                  }))
                ]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((record: any) => {
                    const isArcReport = record._is_arc_report;
                    const year = record.created_at_world_year;
                    const month = record.created_at_world_month;

                    return (
                      <div key={record.id + (isArcReport ? '_report' : '_rec')} className={`flex gap-4 py-3 px-3 -mx-3 border-b border-zinc-800/50 last:border-b-0 transition-colors ${isArcReport ? 'hover:bg-zinc-800/30 cursor-pointer bg-zinc-800/10' : ''}`} onClick={() => {
                        if (isArcReport) {
                          setSelectedArcReportId(record.id);
                        }
                      }}>
                        <div className="w-20 text-zinc-500 font-mono text-xs pt-0.5 shrink-0">
                          {formatWorldDateShort(year, month)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-terminal-amber font-mono uppercase tracking-[0.1em]">{record.record_type}</span>
                            <span className="text-xs text-zinc-100 font-semibold">{record.summary.split(':')[0]}</span>
                          </div>
                          <div className="text-xs text-zinc-500 leading-relaxed">
                            {record.summary.includes(':') ? record.summary.substring(record.summary.indexOf(':') + 1).trim() : record.summary}
                          </div>
                          {isArcReport && (
                            <div className="text-[10px] text-terminal-blue mt-2 font-mono uppercase tracking-[0.05em]">
                              Click to view full Month report ➔
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </PanelBox>

          {/* Month Report Detail View Modal */}
          {selectedArcReportId && (
            <div className="fixed inset-0 bg-black/85 z-[999] flex items-center justify-center p-5" onClick={() => setSelectedArcReportId(null)}>
              <div className="bg-zinc-950 border border-zinc-800 rounded-md w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                {(() => {
                  const r = allReports.find((r: any) => r.id === selectedArcReportId);
                  if (!r) return <div className="text-terminal-red">Report not found.</div>;

                  return (
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 border-b border-zinc-800 pb-4">
                        <div>
                          <h2 className="m-0 text-terminal-amber text-xl font-bold">Month Report</h2>
                          <div className="text-zinc-500 text-xs font-mono mt-1">{formatWorldDate(r.world_year, r.world_month)}</div>
                        </div>
                        <GhostButton onClick={() => setSelectedArcReportId(null)}>Close</GhostButton>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-100 mb-3">Production</h3>
                          <FieldRow label="Planned Units" value={r.planned_units} />
                          <FieldRow label="Actual Units Produced" value={r.units_produced} />
                          <FieldRow label="Defective Units" value={r.defective_units} valueColor={Number(r.defective_units) > 0 ? '#ff453a' : 'rgb(229, 229, 229)'} />
                          <FieldRow label="Production Efficiency" value={r.production_efficiency !== undefined && r.production_efficiency !== null ? `${Math.round(Number(r.production_efficiency) * 100)}%` : 'N/A'} valueColor={r.production_efficiency !== undefined && Number(r.production_efficiency) >= 1 ? '#30d158' : 'rgb(229, 229, 229)'} />
                          <FieldRow label="Factory Condition" value={`${r.factory_condition || 100}%`} />
                          <FieldRow label="Factory Workers Required" value={r.factory_workers_required} />
                          <FieldRow label="Factory Workers Available" value={r.factory_workers_available} />
                          <FieldRow label="Supervisor Bonus" value={`${r.supervisor_bonus}%`} valueColor={Number(r.supervisor_bonus) > 0 ? '#30d158' : 'rgb(229, 229, 229)'} />
                          <FieldRow label="Inspector Defect Reduction" value={`${r.inspector_defect_reduction}%`} valueColor={Number(r.inspector_defect_reduction) > 0 ? '#30d158' : 'rgb(229, 229, 229)'} />
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-zinc-100 mb-3">Sales</h3>
                          <FieldRow label="Total Available for Sale" value={Number(r.units_sold) + Number(r.units_unsold)} />
                          <FieldRow label="Units Sold" value={r.units_sold} valueColor="#30d158" />
                          <FieldRow label="Unsold Units" value={r.units_unsold} valueColor={Number(r.units_unsold) > 0 ? '#ff453a' : 'rgb(229, 229, 229)'} />
                          <FieldRow label="Markets Used" value={marketData?.allocations?.length || 1} />
                          <FieldRow label="Sale Revenue" value={fm(r.sales_revenue || r.gross_revenue)} valueColor="#30d158" />
                          <FieldRow label="Sales Manager Bonus" value={`${r.sales_manager_bonus || 0}%`} valueColor={Number(r.sales_manager_bonus) > 0 ? '#30d158' : 'rgb(229, 229, 229)'} />
                          <FieldRow label="Marketing Spend" value={fm(r.marketing_costs)} valueColor="#ff453a" />
                          <FieldRow label="Storage Cost" value={fm(r.inventory_storage_costs)} valueColor="#ff453a" />
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-zinc-100 mb-3">Finance</h3>
                          <FieldRow label="Production Cost" value={fm(r.production_costs)} valueColor="#ff453a" />
                          <FieldRow label="Lease" value={fm(r.factory_lease_costs)} valueColor="#ff453a" />
                          <FieldRow label="Maintenance" value={fm(r.factory_maintenance_costs)} valueColor="#ff453a" />
                          <FieldRow label="Wages" value={fm(r.staff_wages)} valueColor="#ff453a" />
                          <FieldRow label="Marketing" value={fm(r.marketing_costs)} valueColor="#ff453a" />
                          <FieldRow label="Storage" value={fm(r.inventory_storage_costs)} valueColor="#ff453a" />
                          <FieldRow label="Warranty" value={fm(r.warranty_reserve_cost || 0)} valueColor="#ff453a" />
                          <FieldRow label="Total Expenses" value={fm(Number(r.production_costs) + Number(r.factory_lease_costs) + Number(r.factory_maintenance_costs) + Number(r.staff_wages) + Number(r.marketing_costs) + Number(r.inventory_storage_costs) + Number(r.warranty_reserve_cost || 0))} valueColor="#ff453a" />
                          <div className="mt-3 pt-3 border-t border-zinc-800">
                            <FieldRow label="Net Profit / Loss" value={fm(r.net_profit)} valueColor={Number(r.net_profit) >= 0 ? '#30d158' : '#ff453a'} />
                            <FieldRow label="Ending Cash" value={fm(r.ending_cash)} valueColor="#30d158" />
                          </div>
                        </div>
                      </div>

                      {/* Local Brand Results */}
                      <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '12px' }}>Local Brand Results</div>
                        {(() => {
                          const arcBrandResults = brandResults.filter((br: any) => br.world_month === r.world_month);
                          if (!arcBrandResults || arcBrandResults.length === 0) return <div style={{ fontSize: '12px', color: T.muted }}>No brand impact recorded this Month.</div>;
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
        <EquityDeskTab companyId={company.id} companyName={company.name} />
      )}

      {/* ═══════════════════════════════════════════════════════
          BOARD TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'board' && (
        <BoardDeskPanel companyId={company.id} companyName={company.name} staff={staff} onRefresh={onRefresh} />
      )}

      {/* ═══════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════ */}
      {showLicenseModal && (
        <div className="fixed inset-0 bg-black/85 z-[999] flex items-center justify-center p-5" onClick={() => setShowLicenseModal(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-md w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">Purchase Manufacturing License</h2>
            <p className="text-sm text-zinc-400 mb-6">Select a state to purchase a manufacturing license. The cost varies based on the state's economic multiplier.</p>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Target State</label>
              <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-100" value={licenseStateId} onChange={e => setLicenseStateId(e.target.value)}>
                <option value="">-- Select State --</option>
                {statesForCountry.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {licenseStateId && (
                <div className="mt-3 text-sm text-zinc-400">
                  License Cost: <span className="font-bold text-zinc-100">{fm(50000 * (Number(statesForCountry.find(s => s.id === licenseStateId)?.economic_multiplier) || 1.0))}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setShowLicenseModal(false)}>Cancel</GhostButton>
              <GoldButton onClick={handlePurchaseLicense} disabled={!licenseStateId}>Purchase License</GoldButton>
            </div>
          </div>
        </div>
      )}

      {showGuideModal && (
        <div className="fixed inset-0 bg-black/85 z-[999] flex items-center justify-center p-5" onClick={() => setShowGuideModal(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-md w-full max-w-2xl p-6 overflow-y-auto max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-zinc-100 mb-4 border-b border-zinc-800 pb-2">Factory & Manufacturing Guide</h2>
            <div className="text-sm text-zinc-300 space-y-4 mb-6 leading-relaxed">
              <p><strong className="text-zinc-100">1. State Licenses:</strong> Before you can build factories, you must purchase a manufacturing license for a specific state. The cost of a license scales with the state's economic multiplier.</p>
              <p><strong className="text-zinc-100">2. Land Plots:</strong> After obtaining a license, you purchase land plots in that state. Land is bought by the acre, and different factory types require different amounts of acres. You can sell land later to recover 80% of its cost.</p>
              <p><strong className="text-zinc-100">3. Factories:</strong> Factories are built on your land plots. They take time to construct (measured in months/ticks). Once completed, they provide a base capacity (units per month) and worker capacity.</p>
              <p><strong className="text-zinc-100">4. Production Lines:</strong> Inside completed factories, you construct production lines. Each line costs cash and time to build. The number of lines a factory can hold is determined by its type (e.g. Small Workshop vs Large Complex) and its expansion status.</p>
              <p><strong className="text-zinc-100">5. Factory Expansions:</strong> Factories can be expanded to increase their max production lines and worker capacity, allowing for greater output without buying more land.</p>
              <p><strong className="text-zinc-100">6. Production Plans:</strong> Once a line is idle, you can assign it a launched vehicle model and set a monthly target. The total units across all lines cannot exceed the factory's capacity. Workers are automatically calculated based on your targets.</p>
              <p><strong className="text-zinc-100">7. Maintenance & Condition:</strong> Factories degrade over time. If their condition drops too low, production efficiency suffers. You can manually recover condition or enable auto-recovery to maintain them at a monthly cost.</p>
            </div>
            <div className="flex justify-end">
              <GoldButton onClick={() => setShowGuideModal(false)}>Got It</GoldButton>
            </div>
          </div>
        </div>
      )}

      {showLandModal && (
        <div className="fixed inset-0 bg-black/85 z-[999] flex items-center justify-center p-5" onClick={() => setShowLandModal(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-md w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">Purchase Land Plot</h2>
            <p className="text-sm text-zinc-400 mb-6">Purchase a plot of land for future factory construction.</p>
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Licensed State</label>
                <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-100" value={landStateId} onChange={e => setLandStateId(e.target.value)}>
                  <option value="">-- Select Licensed State --</option>
                  {licenses.map(lic => <option key={lic.id} value={lic.state_id}>{resolveState(lic.state_id)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Plot Name</label>
                <input type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-100" placeholder="e.g. Northside Industrial Park" value={landName} onChange={e => setLandName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Size (Acres)</label>
                <input type="number" min="10" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-100" value={landAcres} onChange={e => setLandAcres(e.target.value)} />
              </div>
              {landStateId && (
                <div className="mt-2 text-sm text-zinc-400">
                  Total Cost: <span className="font-bold text-zinc-100">{fm(1000000 * (Number(statesForCountry.find((s: any) => s.id === landStateId)?.economic_multiplier) || 1.0) * Number(landAcres || 10))}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setShowLandModal(false)}>Cancel</GhostButton>
              <GoldButton onClick={handlePurchaseLand} disabled={!landStateId || !landName || Number(landAcres) < 1}>Purchase Land</GoldButton>
            </div>
          </div>
        </div>
      )}

      {showConstructFactoryModal && (
        <div className="fixed inset-0 bg-black/85 z-[999] flex items-center justify-center p-5" onClick={() => setShowConstructFactoryModal(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-md w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">Construct Factory</h2>
            <p className="text-sm text-zinc-400 mb-6">Begin construction of a new manufacturing facility on your selected land plot.</p>
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Factory Name</label>
                <input type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-100" placeholder="e.g. Plant 1" value={constructFactoryName} onChange={e => setConstructFactoryName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Factory Type</label>
                <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-100" value={constructFactoryTypeId} onChange={e => setConstructFactoryTypeId(e.target.value)}>
                  {bootstrapData?.factoryTypes?.map((ft: any) => (
                    <option key={ft.id} value={ft.id}>{ft.name}</option>
                  ))}
                </select>
              </div>
              {constructFactoryPlotId && (
                <div className="mt-2 text-sm text-zinc-400">
                  Total Cost: <span className="font-bold text-zinc-100">
                    {fm((constructFactoryTypeId === 'large-complex' ? 25000000 : constructFactoryTypeId === 'medium-plant' ? 8000000 : 2500000) * (Number(statesForCountry.find((s: any) => s.id === landPlots.find((p: any) => p.id === constructFactoryPlotId)?.state_id)?.economic_multiplier) || 1.0))}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <GhostButton onClick={() => setShowConstructFactoryModal(false)}>Cancel</GhostButton>
              <GoldButton onClick={handleConstructFactory} disabled={!constructFactoryName}>Start Construction</GoldButton>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}
