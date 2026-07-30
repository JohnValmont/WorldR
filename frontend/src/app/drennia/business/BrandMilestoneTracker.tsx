import React, { useState } from 'react';
import { Info } from 'lucide-react';

const fm = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

export function BrandMilestoneTracker({ company, finances, models }: any) {
  const [showAll, setShowAll] = useState(false);
  
  const lifetimeUnitsSold = Number(finances?.lifetime_units_sold || 0);
  const lifetimeNetProfit = Number(finances?.lifetime_net_profit || 0);
  const companyValue = Number(finances?.company_value || 0);
  
  const activeModels = (models || []).filter((m: any) => m.development_status === 'launched');
  const maxAppeal = activeModels.reduce((max: number, m: any) => Math.max(max, Number(m.appeal_score) || 0), 0);
  const maxReliability = activeModels.reduce((max: number, m: any) => Math.max(max, Number(m.reliability_score) || 0), 0);

  let currentCap = 50;
  let nextGoal = null;
  
  if (lifetimeUnitsSold < 10000) {
     nextGoal = { title: "The Proven Manufacturer (Cap: 80)", reqs: [{ label: "Lifetime Units Sold > 10,000", ok: lifetimeUnitsSold >= 10000, cur: lifetimeUnitsSold, tgt: 10000 }] };
  } else {
     currentCap = 80;
     if (lifetimeNetProfit < 500000000 || companyValue < 1000000000) {
        nextGoal = { title: "The Regional Powerhouse (Cap: 90)", reqs: [{ label: "Lifetime Net Profit > $500M", ok: lifetimeNetProfit >= 500000000, cur: lifetimeNetProfit, tgt: 500000000, isCurrency: true }, { label: "Company Value > $1B", ok: companyValue >= 1000000000, cur: companyValue, tgt: 1000000000, isCurrency: true }] };
     } else {
        currentCap = 90;
        if (lifetimeNetProfit < 2000000000 || maxReliability < 80 || maxAppeal < 80) {
           nextGoal = { title: "Industry Leader (Cap: 95)", reqs: [{ label: "Lifetime Net Profit > $2B", ok: lifetimeNetProfit >= 2000000000, cur: lifetimeNetProfit, tgt: 2000000000, isCurrency: true }, { label: "Active Model Reliability > 80", ok: maxReliability >= 80, cur: maxReliability, tgt: 80 }, { label: "Active Model Appeal > 80", ok: maxAppeal >= 80, cur: maxAppeal, tgt: 80 }] };
        } else {
           currentCap = 95;
           if (lifetimeNetProfit < 5000000000 || companyValue < 10000000000) {
              nextGoal = { title: "Global Icon (Cap: 97)", reqs: [{ label: "Lifetime Net Profit > $5B", ok: lifetimeNetProfit >= 5000000000, cur: lifetimeNetProfit, tgt: 5000000000, isCurrency: true }, { label: "Company Value > $10B", ok: companyValue >= 10000000000, cur: companyValue, tgt: 10000000000, isCurrency: true }] };
           } else {
              currentCap = 97;
              if (lifetimeNetProfit < 20000000000) {
                 nextGoal = { title: "Pinnacle of Engineering (Cap: 99)", reqs: [{ label: "Lifetime Net Profit > $20B", ok: lifetimeNetProfit >= 20000000000, cur: lifetimeNetProfit, tgt: 20000000000, isCurrency: true }] };
              } else {
                 currentCap = 99;
                 if (lifetimeNetProfit < 50000000000) {
                    nextGoal = { title: "Automotive Legend (Cap: 100)", reqs: [{ label: "Lifetime Net Profit > $50B", ok: lifetimeNetProfit >= 50000000000, cur: lifetimeNetProfit, tgt: 50000000000, isCurrency: true }] };
                 } else {
                    currentCap = 100;
                 }
              }
           }
        }
     }
  }

  const allMilestones = [
    { cap: 80, title: "The Proven Manufacturer", desc: "Lifetime Units Sold > 10,000" },
    { cap: 90, title: "The Regional Powerhouse", desc: "Lifetime Net Profit > $500M & Company Value > $1B" },
    { cap: 95, title: "Industry Leader", desc: "Lifetime Net Profit > $2B & Active Model with >80 Reliability/Appeal" },
    { cap: 97, title: "Global Icon", desc: "Lifetime Net Profit > $5B & Company Value > $10B" },
    { cap: 99, title: "Pinnacle of Engineering", desc: "Lifetime Net Profit > $20B & Global Defect Rate < 1%" },
    { cap: 100, title: "Automotive Legend", desc: "Lifetime Net Profit > $50B & Company Value > $100B" }
  ];

  return (
    <div className="mt-4 pt-4 border-t border-zinc-800/50">
      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.12em] mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
           <span>Current Cap</span>
           <button onClick={() => setShowAll(!showAll)} className="text-zinc-500 hover:text-terminal-amber transition-colors">
              <Info size={12} />
           </button>
        </div>
        <span className="text-zinc-300 font-bold">{currentCap} / 100</span>
      </div>
      
      {showAll && (
        <div className="bg-black/50 p-3 rounded-md border border-zinc-800/80 mb-3 text-[11px] text-zinc-400">
           <div className="text-terminal-amber font-bold mb-2 uppercase tracking-wider text-[10px]">All Reputation Milestones</div>
           <div className="flex flex-col gap-2">
             {allMilestones.map((m) => (
                <div key={m.cap} className={`flex justify-between ${currentCap >= m.cap ? 'opacity-40' : ''}`}>
                   <div>
                     <span className="text-zinc-200 font-bold block">{m.title}</span>
                     <span className="text-[10px] text-zinc-500">{m.desc}</span>
                   </div>
                   <div className="text-right font-mono text-terminal-amber">Cap {m.cap}</div>
                </div>
             ))}
           </div>
        </div>
      )}

      {nextGoal ? (
        <div className="bg-black/30 p-3 rounded-md border border-zinc-800/80">
           <div className="text-xs font-bold text-terminal-amber mb-2">{nextGoal.title}</div>
           <div className="flex flex-col gap-2">
             {nextGoal.reqs.map((req, i) => (
                <div key={i} className="flex flex-col gap-1">
                   <div className="flex justify-between text-[11px]">
                     <span className={req.ok ? "text-terminal-green" : "text-zinc-400"}>{req.label}</span>
                     <span className={req.ok ? "text-terminal-green" : "text-zinc-500 font-mono"}>
                        {req.ok ? "ACHIEVED" : (req.isCurrency ? fm(req.cur) : Math.round(req.cur).toLocaleString())}
                     </span>
                   </div>
                   <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                     <div className="h-full bg-terminal-amber/50" style={{ width: `${Math.min(100, (req.cur / req.tgt) * 100)}%` }} />
                   </div>
                </div>
             ))}
           </div>
        </div>
      ) : (
        <div className="text-[11px] text-terminal-green font-bold uppercase tracking-wider text-center py-2">Legendary Status Achieved</div>
      )}
    </div>
  );
}
