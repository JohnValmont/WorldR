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

  let currentCap = 60;
  let nextGoal = null;
  
  if (lifetimeUnitsSold < 10000) {
     nextGoal = { title: "The Proven Manufacturer (Cap: 70)", reqs: [{ label: "Lifetime Units Sold > 10,000", ok: lifetimeUnitsSold >= 10000, cur: lifetimeUnitsSold, tgt: 10000 }] };
  } else {
     currentCap = 70;
     if (lifetimeNetProfit < 500000000 || companyValue < 1000000000) {
        nextGoal = { title: "The Regional Powerhouse (Cap: 80)", reqs: [{ label: "Lifetime Net Profit > $500M", ok: lifetimeNetProfit >= 500000000, cur: lifetimeNetProfit, tgt: 500000000, isCurrency: true }, { label: "Company Value > $1B", ok: companyValue >= 1000000000, cur: companyValue, tgt: 1000000000, isCurrency: true }] };
     } else {
        currentCap = 80;
        if (lifetimeNetProfit < 2000000000 || maxReliability < 80 || maxAppeal < 80) {
           nextGoal = { title: "Industry Leader (Cap: 90)", reqs: [{ label: "Lifetime Net Profit > $2B", ok: lifetimeNetProfit >= 2000000000, cur: lifetimeNetProfit, tgt: 2000000000, isCurrency: true }, { label: "Active Model Reliability > 80", ok: maxReliability >= 80, cur: maxReliability, tgt: 80 }, { label: "Active Model Appeal > 80", ok: maxAppeal >= 80, cur: maxAppeal, tgt: 80 }] };
        } else {
           currentCap = 90;
           if (lifetimeNetProfit < 3000000000 || lifetimeUnitsSold < 50000) {
              nextGoal = { title: "Market Dominator (Cap: 91)", reqs: [{ label: "Lifetime Net Profit > $3B", ok: lifetimeNetProfit >= 3000000000, cur: lifetimeNetProfit, tgt: 3000000000, isCurrency: true }, { label: "Lifetime Units Sold > 50,000", ok: lifetimeUnitsSold >= 50000, cur: lifetimeUnitsSold, tgt: 50000 }] };
           } else {
              currentCap = 91;
              if (lifetimeNetProfit < 5000000000 || companyValue < 5000000000) {
                 nextGoal = { title: "Global Challenger (Cap: 92)", reqs: [{ label: "Lifetime Net Profit > $5B", ok: lifetimeNetProfit >= 5000000000, cur: lifetimeNetProfit, tgt: 5000000000, isCurrency: true }, { label: "Company Value > $5B", ok: companyValue >= 5000000000, cur: companyValue, tgt: 5000000000, isCurrency: true }] };
              } else {
                 currentCap = 92;
                 if (lifetimeNetProfit < 7000000000 || maxReliability < 85 || maxAppeal < 85) {
                    nextGoal = { title: "Global Innovator (Cap: 93)", reqs: [{ label: "Lifetime Net Profit > $7B", ok: lifetimeNetProfit >= 7000000000, cur: lifetimeNetProfit, tgt: 7000000000, isCurrency: true }, { label: "Active Model Reliability > 85", ok: maxReliability >= 85, cur: maxReliability, tgt: 85 }, { label: "Active Model Appeal > 85", ok: maxAppeal >= 85, cur: maxAppeal, tgt: 85 }] };
                 } else {
                    currentCap = 93;
                    if (lifetimeNetProfit < 10000000000) {
                       nextGoal = { title: "Quality Exemplar (Cap: 94)", reqs: [{ label: "Lifetime Net Profit > $10B", ok: lifetimeNetProfit >= 10000000000, cur: lifetimeNetProfit, tgt: 10000000000, isCurrency: true }] };
                    } else {
                       currentCap = 94;
                       if (lifetimeNetProfit < 15000000000 || companyValue < 20000000000) {
                          nextGoal = { title: "Global Icon (Cap: 95)", reqs: [{ label: "Lifetime Net Profit > $15B", ok: lifetimeNetProfit >= 15000000000, cur: lifetimeNetProfit, tgt: 15000000000, isCurrency: true }, { label: "Company Value > $20B", ok: companyValue >= 20000000000, cur: companyValue, tgt: 20000000000, isCurrency: true }] };
                       } else {
                          currentCap = 95;
                          if (lifetimeNetProfit < 20000000000 || lifetimeUnitsSold < 500000) {
                             nextGoal = { title: "Mass Manufacturer (Cap: 96)", reqs: [{ label: "Lifetime Net Profit > $20B", ok: lifetimeNetProfit >= 20000000000, cur: lifetimeNetProfit, tgt: 20000000000, isCurrency: true }, { label: "Lifetime Units Sold > 500,000", ok: lifetimeUnitsSold >= 500000, cur: lifetimeUnitsSold, tgt: 500000 }] };
                          } else {
                             currentCap = 96;
                             if (lifetimeNetProfit < 25000000000 || maxReliability < 90 || maxAppeal < 90) {
                                nextGoal = { title: "Pinnacle of Engineering (Cap: 97)", reqs: [{ label: "Lifetime Net Profit > $25B", ok: lifetimeNetProfit >= 25000000000, cur: lifetimeNetProfit, tgt: 25000000000, isCurrency: true }, { label: "Active Model Reliability > 90", ok: maxReliability >= 90, cur: maxReliability, tgt: 90 }, { label: "Active Model Appeal > 90", ok: maxAppeal >= 90, cur: maxAppeal, tgt: 90 }] };
                             } else {
                                currentCap = 97;
                                if (lifetimeNetProfit < 30000000000) {
                                   nextGoal = { title: "Perfectionist (Cap: 98)", reqs: [{ label: "Lifetime Net Profit > $30B", ok: lifetimeNetProfit >= 30000000000, cur: lifetimeNetProfit, tgt: 30000000000, isCurrency: true }] };
                                } else {
                                   currentCap = 98;
                                   if (lifetimeNetProfit < 40000000000 || companyValue < 50000000000) {
                                      nextGoal = { title: "Global Titan (Cap: 99)", reqs: [{ label: "Lifetime Net Profit > $40B", ok: lifetimeNetProfit >= 40000000000, cur: lifetimeNetProfit, tgt: 40000000000, isCurrency: true }, { label: "Company Value > $50B", ok: companyValue >= 50000000000, cur: companyValue, tgt: 50000000000, isCurrency: true }] };
                                   } else {
                                      currentCap = 99;
                                      if (lifetimeNetProfit < 50000000000 || companyValue < 100000000000 || lifetimeUnitsSold < 5000000) {
                                         nextGoal = { title: "Automotive Legend (Cap: 100)", reqs: [{ label: "Lifetime Net Profit > $50B", ok: lifetimeNetProfit >= 50000000000, cur: lifetimeNetProfit, tgt: 50000000000, isCurrency: true }, { label: "Company Value > $100B", ok: companyValue >= 100000000000, cur: companyValue, tgt: 100000000000, isCurrency: true }, { label: "Lifetime Units Sold > 5,000,000", ok: lifetimeUnitsSold >= 5000000, cur: lifetimeUnitsSold, tgt: 5000000 }] };
                                      } else {
                                         currentCap = 100;
                                      }
                                   }
                                }
                             }
                          }
                       }
                    }
                 }
              }
           }
        }
     }
  }

  const allMilestones = [
    { cap: 70, title: "The Proven Manufacturer", desc: "Lifetime Units Sold > 10,000" },
    { cap: 80, title: "The Regional Powerhouse", desc: "Lifetime Net Profit > $500M & Company Value > $1B" },
    { cap: 90, title: "Industry Leader", desc: "Lifetime Net Profit > $2B & Active Model with >80 Reliability/Appeal" },
    { cap: 91, title: "Market Dominator", desc: "Lifetime Net Profit > $3B & Lifetime Units Sold > 50,000" },
    { cap: 92, title: "Global Challenger", desc: "Lifetime Net Profit > $5B & Company Value > $5B" },
    { cap: 93, title: "Global Innovator", desc: "Lifetime Net Profit > $7B & Active Model with >85 Reliability/Appeal" },
    { cap: 94, title: "Quality Exemplar", desc: "Lifetime Net Profit > $10B" },
    { cap: 95, title: "Global Icon", desc: "Lifetime Net Profit > $15B & Company Value > $20B" },
    { cap: 96, title: "Mass Manufacturer", desc: "Lifetime Net Profit > $20B & Lifetime Units Sold > 500,000" },
    { cap: 97, title: "Pinnacle of Engineering", desc: "Lifetime Net Profit > $25B & Active Model with >90 Reliability/Appeal" },
    { cap: 98, title: "Perfectionist", desc: "Lifetime Net Profit > $30B" },
    { cap: 99, title: "Global Titan", desc: "Lifetime Net Profit > $40B & Company Value > $50B" },
    { cap: 100, title: "Automotive Legend", desc: "Lifetime Net Profit > $50B & Company Value > $100B & 5M Units Sold" }
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
