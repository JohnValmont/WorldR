'use client';
import React from 'react';
import Card from '@/components/ui/Card';
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

function FullWidthTrendGraph({ value, label }: { value: number, label: string }) {
  const color = condTone(value);
  
  // Deterministic pseudo-random generation so it doesn't jitter on re-render
  const seed = label.length + value;
  const pseudoRandom = (i: number) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  };
  
  const numBars = 30;
  const bars = [];
  let current = Math.max(0, value - 20); // Start a bit lower to show growth trend
  for (let i = 0; i < numBars - 1; i++) {
    bars.push(current);
    // Random walk that eventually gravitates towards the final value
    const step = (value - current) / (numBars - i) + (pseudoRandom(i) * 6 - 2);
    current = Math.max(0, Math.min(100, current + step));
  }
  bars.push(value);
  
  return (
    <div className="flex items-end gap-[2px] h-14 w-full mt-4 opacity-90 relative">
      {/* Faint grid line for 50 mark */}
      <div className="absolute top-1/2 left-0 right-0 border-t border-white/5 border-dashed" />
      
      {bars.map((val, i) => (
        <div 
          key={i} 
          className="flex-1 rounded-t-[1px] transition-all duration-500 relative z-10" 
          style={{ 
            height: `${(val / 100) * 100}%`, 
            backgroundColor: color,
            opacity: i === numBars - 1 ? 1 : 0.15 + (i / numBars) * 0.5
          }} 
        />
      ))}
    </div>
  );
}

function StatMeter({ value, label, icon: Icon }: { value: number, label: string, icon: any }) {
  const toneClass = condToneClass(value);
  const color = condTone(value);
  
  // Fake a trend value based on the final gap
  const trend = value - Math.max(0, Math.min(100, value - 1.5));
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  
  return (
    <div className="flex flex-col p-4 bg-white/[0.02] rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-colors">
      <div className="flex justify-between items-start w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black/40 rounded-md border border-white/5">
            <Icon size={16} className={toneClass} />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-slate-400">{label}</span>
            <span className={`font-mono text-2xl font-bold tracking-tight ${toneClass}`}>{value.toFixed(1)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/5">
          <TrendIcon size={12} color={color} />
          <span className="font-mono text-[10px]" style={{ color }}>{trend > 0 ? '+' : ''}{trend.toFixed(1)}</span>
        </div>
      </div>
      
      {/* Full Width Graph */}
      <FullWidthTrendGraph value={value} label={label} />
    </div>
  );
}

export default function DevelopmentScreen({ overview, jurisdictionMeta }: Props) {
  if (!overview) return null;

  const state = overview.activeState;
  const conditions = overview.conditions;

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
            Macro-economy, infrastructure, and institutional capacity for {jurisdictionMeta.name}.
          </p>
        </div>
        <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-amber-500/90 uppercase bg-amber-500/10 px-3 py-1.5 rounded-sm border border-amber-500/20">
          ARC {overview.cycle?.electionArc ?? '?'}
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
              ${(Number(state?.raw_gdp || 0)).toLocaleString('en-US')} M
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
            <StatMeter value={conditions.prosperity} label="Prosperity" icon={Activity} />
            <StatMeter value={conditions.cost_of_living} label="Cost of Living" icon={Landmark} />
            <StatMeter value={conditions.fiscal_health} label="Fiscal Health" icon={Briefcase} />
          </div>
        </Card>

        <Card kicker="Society & Welfare" icon={Users} pad="sm" className="border-t border-t-emerald-500/20">
          <div className="flex flex-col gap-3 mt-4">
            <StatMeter value={conditions.equity} label="Equity" icon={Scale} />
            <StatMeter value={conditions.human_development} label="Human Development" icon={Target} />
            <StatMeter value={conditions.order_safety} label="Order & Safety" icon={Shield} />
          </div>
        </Card>

        <Card kicker="State & Governance" icon={Landmark} pad="sm" className="border-t border-t-amber-500/20">
          <div className="flex flex-col gap-3 mt-4">
            <StatMeter value={conditions.freedom_rights} label="Freedom & Rights" icon={Eye} />
            <StatMeter value={conditions.bureaucracy} label="Bureaucratic Capacity" icon={Landmark} />
            <StatMeter value={conditions.global_standing} label="Global Standing" icon={Globe} />
          </div>
        </Card>

      </div>
    </div>
  );
}
