'use client';
import React from 'react';
import Card from '@/components/ui/Card';
import { formatGameDateShort } from '@/lib/calendar';
import { JURISDICTION_MODEL } from './_lib/model';
import { Activity, Target, Shield, Landmark, Scale, Briefcase, Users, Eye, Globe, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  overview: any;
  jurisdictionMeta: any;
}

function condTone(v: number) {
  return v >= 65 ? '#10B981' : v >= 40 ? '#F59E0B' : '#EF4444'; // emerald, amber, red
}

function condToneClass(v: number) {
  return v >= 65 ? 'text-emerald-400' : v >= 40 ? 'text-amber-400' : 'text-red-400';
}

function SmoothAreaChart({ value, label, currentArc }: { value: number, label: string, currentArc?: number }) {
  const color = condTone(value);
  
  // Deterministic pseudo-random generation
  const seed = label.length + value;
  const pseudoRandom = (i: number) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  };
  
  const numPoints = 12;
  const points = [];
  let current = Math.max(0, value - 15);
  for (let i = 0; i < numPoints - 1; i++) {
    points.push(current);
    const step = (value - current) / (numPoints - i) + (pseudoRandom(i) * 10 - 4);
    current = Math.max(0, Math.min(100, current + step));
  }
  points.push(value);

  const width = 300;
  const height = 80;
  const dx = width / (numPoints - 1);
  const maxVal = Math.max(...points) + 5;
  const minVal = Math.max(0, Math.min(...points) - 5);
  const range = maxVal - minVal || 1;
  
  const getCoords = (val: number, i: number) => [i * dx, height - ((val - minVal) / range) * height];

  let d = `M ${getCoords(points[0], 0).join(' ')}`;
  for (let i = 0; i < numPoints - 1; i++) {
    const [x0, y0] = getCoords(points[i], i);
    const [x1, y1] = getCoords(points[i + 1], i + 1);
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }

  const dFill = `${d} L ${width} ${height} L 0 ${height} Z`;

  const startArc = currentArc != null ? Math.max(1, currentArc - 12) : null;
  const endArc = currentArc != null ? currentArc : null;

  return (
    <div className="w-full mt-6 flex flex-col">
      <div className="h-[80px] w-full relative">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`grad-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={dFill} fill={`url(#grad-${label.replace(/\s+/g, '')})`} />
          <path d={d} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex justify-between mt-2 font-mono text-[9px] text-slate-500 tracking-widest opacity-60">
        <span>{startArc ? formatGameDateShort(startArc) : '12 Months Ago'}</span>
        <span>{endArc ? formatGameDateShort(endArc) : 'Current Arc'}</span>
      </div>
    </div>
  );
}

function StatMeter({ value, label, icon: Icon, positiveModifier, negativeModifier }: { value: number, label: string, icon: any, positiveModifier?: string, negativeModifier?: string }) {
  const toneClass = condToneClass(value);
  const color = condTone(value);
  const trend = value - Math.max(0, Math.min(100, value - 1.5));
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  
  return (
    <div className="flex flex-col p-5 bg-[#0c0d13] rounded-xl border border-[#23232b] hover:border-zinc-700 transition-colors shadow-lg">
      <div className="flex justify-between items-start w-full">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
            <Icon size={18} className={toneClass} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500">{label}</span>
            <span className={`font-mono text-3xl font-bold tracking-tight ${toneClass}`}>{value.toFixed(1)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 bg-zinc-900/80 px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-sm">
          <TrendIcon size={14} color={color} />
          <span className="font-mono text-xs font-bold" style={{ color }}>{trend > 0 ? '+' : ''}{trend.toFixed(1)}</span>
        </div>
      </div>
      
      {/* Full Width Smooth Line Graph */}
      <SmoothAreaChart value={value} label={label} />

      {/* Modifiers Section */}
      <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-col gap-2">
        <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-0.5">Active Influences</div>
        
        <div className="flex justify-between items-center bg-emerald-500/10 px-3 py-2 rounded-md border border-emerald-500/20">
          <span className="text-emerald-400 font-mono text-xs">{positiveModifier || 'Expansionary Policy'}</span>
          <span className="text-emerald-400 font-bold font-mono text-xs">+2.4</span>
        </div>
        
        <div className="flex justify-between items-center bg-red-500/10 px-3 py-2 rounded-md border border-red-500/20">
          <span className="text-red-400 font-mono text-xs">{negativeModifier || 'High Trade Tariffs'}</span>
          <span className="text-red-400 font-bold font-mono text-xs">-1.2</span>
        </div>
      </div>
    </div>
  );
}

export default function DevelopmentScreen({ overview, selectedJurisdictionId }: { overview: any; selectedJurisdictionId?: string }) {
  if (!overview) return null;

  const state = overview.activeState;
  const conditions = overview.conditions;
  const currentArc = overview.cycle?.currentArc;
  const jModel = selectedJurisdictionId ? (JURISDICTION_MODEL[selectedJurisdictionId as keyof typeof JURISDICTION_MODEL] || JURISDICTION_MODEL.national) : JURISDICTION_MODEL.national;

  if (!conditions) {
    return <div className="text-slate-400 p-10 text-center font-mono text-sm">No development data available.</div>;
  }

  return (
    <div className="flex flex-col gap-6 pb-10 animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-end border-b border-white/10 pb-4">
        <div>
          <h1 className="font-sans text-3xl font-semibold text-white mb-1">
            Economy & Development
          </h1>
          <p className="font-sans text-sm text-slate-400">
            Macro-economy, infrastructure, and institutional capacity for {jModel.name}.
          </p>
        </div>
        <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-amber-500/90 uppercase bg-amber-500/10 px-3 py-1.5 rounded-sm border border-amber-500/20">
          ARC {currentArc ?? overview.cycle?.electionArc ?? '?'}
        </div>
      </div>

      {/* Key Indicators at Top */}
      <Card pad="sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          <div className="p-4 border-r border-white/5 flex flex-col justify-center bg-white/[0.01]">
            <div className="font-mono text-[10px] text-slate-400 mb-1 tracking-[0.2em] uppercase flex items-center gap-2">
              <Briefcase size={10} className="text-slate-500" />
              Raw GDP
            </div>
            <div className="font-mono text-2xl text-emerald-400">
              {(() => {
                const rawGdp = Number(state?.raw_gdp || 0);
                if (rawGdp >= 1000000) return `$${(rawGdp / 1000000).toLocaleString('en-US', { maximumFractionDigits: 2 })} T`;
                if (rawGdp >= 1000) return `$${(rawGdp / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} B`;
                return `$${rawGdp.toLocaleString('en-US', { maximumFractionDigits: 2 })} M`;
              })()}
            </div>
          </div>
          <div className="p-4 border-r border-white/5 flex flex-col justify-center bg-white/[0.01]">
            <div className="font-mono text-[10px] text-slate-400 mb-1 tracking-[0.2em] uppercase flex items-center gap-2">
              <Users size={10} className="text-slate-500" />
              Population
            </div>
            <div className="font-mono text-2xl text-blue-400">
              {(Number(state?.raw_population || 0)).toLocaleString('en-US')}
            </div>
          </div>
          <div className="p-4 flex flex-col justify-center bg-white/[0.01]">
            <div className="font-mono text-[10px] text-slate-400 mb-1 tracking-[0.2em] uppercase flex items-center gap-2">
              <Landmark size={10} className="text-slate-500" />
              Civil Service Stance
            </div>
            <div className="font-mono text-lg text-amber-400 capitalize">
              {state?.civil_service_stance?.replace('_', ' ') || 'Neglect'}
            </div>
          </div>
        </div>
      </Card>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        <Card kicker="Economy & Prosperity" icon={Activity} pad="sm" className="border-t border-t-blue-500/20">
          <div className="flex flex-col gap-3 mt-4">
            <StatMeter value={conditions.prosperity} label="Prosperity" icon={Activity} positiveModifier="Economic Stimulus Act" negativeModifier="Global Trade Slowdown" />
            <StatMeter value={conditions.cost_of_living} label="Cost of Living" icon={Landmark} positiveModifier="Price Caps on Essentials" negativeModifier="High Inflation" />
            <StatMeter value={conditions.fiscal_health} label="Fiscal Health" icon={Briefcase} positiveModifier="Corporate Tax Revenue" negativeModifier="Infrastructure Debt" />
          </div>
        </Card>

        <Card kicker="Society & Welfare" icon={Users} pad="sm" className="border-t border-t-emerald-500/20">
          <div className="flex flex-col gap-3 mt-4">
            <StatMeter value={conditions.equity} label="Equity" icon={Scale} positiveModifier="Wealth Distribution Act" negativeModifier="Gentrification" />
            <StatMeter value={conditions.human_development} label="Human Development" icon={Target} positiveModifier="Education Subsidy" negativeModifier="Healthcare Shortages" />
            <StatMeter value={conditions.order_safety} label="Order & Safety" icon={Shield} positiveModifier="Community Policing" negativeModifier="Organized Crime" />
          </div>
        </Card>

        <Card kicker="State & Governance" icon={Landmark} pad="sm" className="border-t border-t-amber-500/20">
          <div className="flex flex-col gap-3 mt-4">
            <StatMeter value={conditions.freedom_rights} label="Freedom & Rights" icon={Eye} positiveModifier="Free Speech Protections" negativeModifier="Mass Surveillance" />
            <StatMeter value={conditions.bureaucracy} label="Bureaucratic Capacity" icon={Landmark} positiveModifier="Digital Governance" negativeModifier="Red Tape" />
            <StatMeter value={conditions.global_standing} label="Global Standing" icon={Globe} positiveModifier="Diplomatic Summit" negativeModifier="Sanctions" />
          </div>
        </Card>

      </div>
    </div>
  );
}
