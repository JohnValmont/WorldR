'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTION_MODEL } from './_lib/model';
import type { PoliticsSection } from './_components/PoliticsSidebar';
import { formatGameDateShort } from '@/lib/calendar';
import { AlertCircle, ChevronRight, Activity, CalendarDays, ShieldAlert, Zap, Globe } from 'lucide-react';
import { Card, Button, StatChip } from '@/components/ui';

interface Props {
  overview: any;
  character: any;
  parties: any[];
  myAp?: { current_ap: number; ap_cap: number };
  selectedJurisdictionId: string;
  onNavigate: (s: PoliticsSection) => void;
  onRefresh: () => void;
}

// ── Condition colour scale (0–10) ──────────────────────────────────────────
function condTone(v: number) {
  return v >= 6.5 ? 'text-[#36D399] shadow-[#36D399]/60' : v >= 4 ? 'text-terminal-amber shadow-terminal-amber/60' : 'text-[#B85555] shadow-[#B85555]/60';
}
function condBg(v: number) {
  return v >= 6.5 ? 'bg-[#36D399] shadow-[#36D399]' : v >= 4 ? 'bg-terminal-amber shadow-terminal-amber' : 'bg-[#B85555] shadow-[#B85555]';
}

// ── OLED Meter for Conditions ──────────────────────────────────────────────
function OledMeter({ value, label }: { value: number, label: string }) {
  const toneText = condTone(value);
  const toneBg = condBg(value);
  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <div className="flex justify-between items-baseline">
        <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-zinc-500">{label}</span>
        <span className={`font-mono text-[11px] font-bold ${toneText}`}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1 bg-white/5 rounded overflow-hidden">
        <div className={`h-full ${toneBg} transition-all duration-700`} style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}

// ── Mini sparkline bar ───────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) {
    return (
      <svg width="60" height="16" viewBox="0 0 80 24" className="opacity-20">
        <line x1="0" y1="12" x2="80" y2="12" stroke="#6B6358" strokeWidth="1.5" strokeDasharray="2 4" />
      </svg>
    );
  }
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const w = 60, h = 16;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 3px ${color}80)` }} />
    </svg>
  );
}

// ── Recommended Action Item ───────────────────────────────────────────────
function ActionItem({ cost, label, onClick }: { cost: number; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2.5 w-full p-2.5 rounded-lg cursor-pointer text-left bg-white/5 hover:bg-terminal-amber/5 border border-white/5 hover:border-terminal-amber/30 transition-all duration-200 mb-2"
    >
      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-terminal-amber/10 text-terminal-amber shrink-0">
        <Zap size={14} />
      </div>
      <div className="flex-1">
        <div className="font-serif text-[12px] text-zinc-100 font-medium group-hover:text-[#F4EBD6] transition-colors leading-tight">{label}</div>
        <div className="font-mono text-[9px] text-terminal-amber mt-0.5">Cost: {cost} AP</div>
      </div>
      <ChevronRight size={14} className="text-zinc-500 group-hover:text-terminal-amber transition-all group-hover:translate-x-0.5" />
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function OverviewScreen({ overview, character, parties, myAp, selectedJurisdictionId, onNavigate, onRefresh }: Props) {
  const jid = selectedJurisdictionId;
  const { data: billData } = useSWR(['ov-bills', jid], () => politicsApi.getBills(jid).catch(() => null), { refreshInterval: 20000 });
  const { data: ledger = [] } = useSWR(['ov-ledger', jid], () => politicsApi.getLedger(30, jid).catch(() => []), { refreshInterval: 20000 });
  const [busy, setBusy] = useState<string | null>(null);

  const jMeta   = JURISDICTION_MODEL[jid] || JURISDICTION_MODEL.national;
  const myParty = overview?.globalParty || (Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id || p.members?.some((m: any) => m.character_id === character?.id || m.id === character?.id)) : undefined);
  const support: number | null = myParty ? (myParty.popularity ?? myParty.approval ?? myParty.projected_share ?? null) : null;

  const bills: any[] = Array.isArray(billData?.bills) ? billData.bills : [];
  const floorBill = bills.find((b: any) => {
    const s = String(b?.status || '').toLowerCase();
    return s === 'proposed'; // Only 'proposed' bills are live on the floor
  }) || null;
  const ayes = floorBill?.tally?.yea ?? floorBill?.ayes ?? floorBill?.votes_for;
  const nays = floorBill?.tally?.nay ?? floorBill?.nays ?? floorBill?.votes_against;

  const events: any[] = Array.isArray(ledger) ? ledger : [];
  const cond: any     = overview?.conditions;
  const hasConditions = cond && typeof cond === 'object';
  const monthsToElection: number | null = overview?.cycle?.monthsToElection ?? null;

  // ── Derived: morning briefing items from ledger ──
  const briefingItems: Array<{ severity: 'critical' | 'warning' | 'info'; title: string; sub?: string }> = [];

  if (monthsToElection != null && monthsToElection <= 6) {
    briefingItems.push({ severity: 'critical', title: `Election in ${monthsToElection} month${monthsToElection === 1 ? '' : 's'}`, sub: 'Accelerate campaign operations.' });
  }
  if (support != null && support < 35) {
    briefingItems.push({ severity: 'critical', title: `Party support critically low — ${support.toFixed(1)}%`, sub: 'Risk of election loss.' });
  }
  if (floorBill) {
    const passPct = ayes && (ayes + (nays || 0)) > 0 ? Math.round(ayes / (ayes + (nays || 0)) * 100) : null;
    briefingItems.push({
      severity: passPct != null && passPct >= 50 ? 'info' : 'warning',
      title: `"${floorBill.title || floorBill.name || 'Bill'}" on the floor`,
      sub: passPct != null ? `Currently ${passPct}% in favour.` : 'Requires attention.'
    });
  }
  if (cond?.order != null && cond.order < 4) {
    briefingItems.push({ severity: 'warning', title: 'Public order deteriorating', sub: `Order index: ${Number(cond.order).toFixed(1)}/10` });
  }

  // ── Recommended actions ──
  const recommendations: Array<{ cost: number; label: string; section: PoliticsSection }> = [];
  if (!myParty)          recommendations.push({ cost: 0, label: 'Found a Party and choose your Creed', section: 'party' });
  if (monthsToElection && monthsToElection <= 12) recommendations.push({ cost: 5, label: 'Deploy campaign resources', section: 'elections' });
  if (floorBill)         recommendations.push({ cost: 2, label: `Vote on "${floorBill.title || 'floor bill'}"`, section: 'legislature' });
  if (myParty)           recommendations.push({ cost: 3, label: 'Fund ground operations', section: 'party' });
  if (recommendations.length === 0) recommendations.push({ cost: 4, label: 'Sponsor a new bill', section: 'legislature' });

  // ── Approval trend (mock from support history if available) ──
  const supportHistory: number[] = myParty?.support_history || (support != null ? [support - 2, support - 1.5, support - 0.5, support] : []);
  const latestDelta = supportHistory.length > 1 ? supportHistory[supportHistory.length - 1] - supportHistory[supportHistory.length - 2] : null;
  const trendArrow = latestDelta == null ? '' : latestDelta > 0 ? '▲' : latestDelta < 0 ? '▼' : '▬';
  const trendColor = latestDelta == null ? '#A79D8C' : latestDelta > 0 ? '#36D399' : latestDelta < 0 ? '#B85555' : '#A79D8C';

  async function vote(id: string, v: 'yea' | 'nay') {
    try { setBusy(v); await politicsApi.voteBill(id, v); await onRefresh(); } catch { } finally { setBusy(null); }
  }

  return (
    <div className="flex flex-col gap-4 h-full pb-6 overflow-hidden">

      {/* ── COMPACT DESK HEADER ── */}
      <div className="flex justify-between items-center bg-black/40 border border-white/5 px-5 py-3 rounded-xl shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-400">
              {jMeta.name}
            </span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <h1 className="text-zinc-100 text-lg m-0 font-serif font-bold leading-none flex items-center gap-2">
              {myParty ? myParty.name : 'Political Desk'}
              {myParty?.abbreviation && <span className="text-zinc-500 text-sm font-mono uppercase font-medium">[{myParty.abbreviation}]</span>}
            </h1>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
               <span className="font-mono uppercase text-blue-400">{myParty?.doctrine_id ? myParty.doctrine_id.replace(/_/g, ' ') : 'NO ACTIVE DOCTRINE'}</span>
               {myParty?.slogan && <span className="italic">— "{myParty.slogan}"</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {support != null && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Approval</span>
                <span className="font-mono font-bold text-zinc-100 text-[13px]">{support.toFixed(1)}%</span>
              </div>
              <div className="w-[60px]"><Sparkline values={supportHistory} color={trendColor} /></div>
            </div>
          )}
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-terminal-amber/10 border border-terminal-amber/20 rounded">
            <Zap size={14} className="text-terminal-amber" />
            <span className="font-mono text-[11px] text-terminal-amber font-semibold">{myAp?.current_ap ?? 0} / {myAp?.ap_cap ?? 12} AP</span>
          </div>
        </div>
      </div>

      {/* ── 2-COLUMN MAIN LAYOUT ── */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1">
        
        {/* ── LEFT COLUMN: NEWS & INTELLIGENCE ── */}
        <div className="flex-[3] flex flex-col gap-4 min-h-0 overflow-hidden">
          
          {/* Urgent Briefings (if any) */}
          {briefingItems.length > 0 && (
            <div className="flex flex-wrap gap-2 shrink-0">
              {briefingItems.map((item, i) => {
                const isCrit = item.severity === 'critical';
                const isWarn = item.severity === 'warning';
                const Icon = isCrit ? ShieldAlert : isWarn ? AlertCircle : Activity;
                return (
                  <div key={i} className={`flex-1 min-w-[200px] flex items-center gap-3 px-3 py-2 rounded-lg border border-l-2 bg-black/40 ${isCrit ? 'border-red-500/30 border-l-red-500' : isWarn ? 'border-amber-500/30 border-l-amber-500' : 'border-blue-500/30 border-l-blue-500'}`}>
                    <Icon size={14} className={isCrit ? 'text-red-500' : isWarn ? 'text-amber-500' : 'text-blue-500'} />
                    <div>
                      <div className="font-serif text-[13px] font-semibold text-zinc-100 leading-none">{item.title}</div>
                      {item.sub && <div className="font-mono text-[9px] text-zinc-400 mt-0.5">{item.sub}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Live Chronicle (Main Intelligence Feed) */}
          <Card 
            title="Global Intelligence & Live Chronicle"
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 -m-1 pr-2">
              {events.length === 0 ? (
                <div className="text-zinc-500 italic text-[13px] text-center py-10">No recent activity logged.</div>
              ) : (
                events.map((e: any, i: number) => (
                  <div key={e.id || i} className={`px-3 py-3 flex gap-4 hover:bg-white/5 rounded transition-colors ${i < events.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <div className="font-mono text-[10px] text-zinc-500 tracking-[0.1em] uppercase shrink-0 w-16 pt-0.5 text-right">
                      {e.arc != null ? formatGameDateShort(e.arc) : e.kind || ''}
                    </div>
                    <div className="flex-1">
                      <div className="text-zinc-200 text-[13px] leading-snug">
                        {e.headline || e.title || e.message || e.description || e.kind || 'Event'}
                      </div>
                      {e.jurisdiction_id && (
                        <div className="text-[9px] font-mono text-zinc-600 mt-1 uppercase">{e.jurisdiction_id}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* ── RIGHT COLUMN: STATS & ACTIONS ── */}
        <div className="w-full lg:w-[360px] flex flex-col gap-4 shrink-0 overflow-y-auto pr-1 pb-1">
          
          {/* No Party Warning */}
          {!myParty && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 shadow-[0_4px_12px_rgba(37,99,235,0.05)] shrink-0">
              <div className="flex items-center gap-2 text-blue-400 font-mono text-[10px] font-bold tracking-widest uppercase mb-1">
                <AlertCircle size={14} /> Action Required
              </div>
              <h2 className="text-zinc-100 text-[15px] m-0 mb-1 font-serif font-semibold">Found a Party</h2>
              <div className="text-zinc-400 text-[11px] leading-relaxed mb-3">
                You have no active political presence. Choose your Creed and stand for Parliament.
              </div>
              <Button variant="primary" size="sm" className="w-full" onClick={() => onNavigate('party')}>Get Started</Button>
            </div>
          )}

          {/* Tactical Recommendations */}
          <Card title="Tactical Recommendations" className="shrink-0">
            <div className="p-3 pb-1">
              {recommendations.map((rec, i) => (
                <ActionItem key={i} cost={rec.cost} label={rec.label} onClick={() => onNavigate(rec.section)} />
              ))}
            </div>
          </Card>

          {/* On The Floor */}
          <Card title="On The Floor" accent className={`shrink-0 ${floorBill ? "border-t-blue-500/50" : ""}`}>
            {floorBill ? (
              <div className="flex flex-col gap-3 p-4">
                <div>
                  <div className="text-zinc-100 font-bold text-[14px] font-serif leading-snug">{floorBill.title || floorBill.name || floorBill.type || 'Bill on the floor'}</div>
                  <div className="font-mono text-[9px] text-blue-400 mt-1 uppercase tracking-[0.08em] inline-block bg-blue-500/10 px-2 py-0.5 rounded">
                    {floorBill.type || 'motion'} — {floorBill.status || 'open'}
                  </div>
                </div>
                
                {(ayes != null || nays != null) && (
                  <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                    <div className="flex justify-between mb-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[9px] text-zinc-500 uppercase">Ayes</span>
                        <span className="font-mono text-[15px] font-bold text-[#36D399]">{ayes ?? 0}</span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-mono text-[9px] text-zinc-500 uppercase">Nays</span>
                        <span className="font-mono text-[15px] font-bold text-[#B85555]">{nays ?? 0}</span>
                      </div>
                    </div>
                    {ayes != null && nays != null && (
                      <div className="h-1.5 rounded-full overflow-hidden bg-red-500/20 flex">
                        <div className="h-full bg-[#36D399] transition-all duration-700 shadow-[0_0_8px_#36D399]" style={{ width: `${(ayes / (ayes + nays || 1)) * 100}%` }} />
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2 mt-1">
                  <div className="flex-1"><Button variant="primary" size="sm" className="w-full" onClick={() => vote(floorBill.id, 'yea')} disabled={!!busy}>Aye</Button></div>
                  <div className="flex-1"><Button variant="ghost" size="sm" className="w-full" onClick={() => vote(floorBill.id, 'nay')} disabled={!!busy}>Nay</Button></div>
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 italic text-[12px] text-center py-6 px-4">
                No bills on the floor.
              </div>
            )}
          </Card>

          {/* National Overview (Conditions & Stats) */}
          <Card title="State of the Nation" className="shrink-0">
            <div className="flex flex-col gap-5 p-4">
              
              {/* Conditions */}
              {hasConditions && (
                <div>
                  <div className="text-zinc-500 font-mono text-[9px] tracking-widest uppercase mb-2">Jurisdiction Conditions</div>
                  <div className="flex flex-col gap-3">
                    {(['prosperity', 'jobs', 'order', 'cohesion', 'budget'] as const).map((key) => {
                      const v = typeof cond[key] === 'number' ? Number(cond[key]) : 5;
                      const label = key.charAt(0).toUpperCase() + key.slice(1);
                      return <OledMeter key={key} value={v} label={label} />;
                    })}
                  </div>
                </div>
              )}

              {/* Stats */}
              {overview?.activeState && (
                <div>
                  <div className="text-zinc-500 font-mono text-[9px] tracking-widest uppercase mb-2">Macro-Economics</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[8px] tracking-[0.14em] uppercase text-zinc-500">GDP</span>
                      <span className="font-mono text-[11px] font-bold text-zinc-100">
                        CR {Number(overview.activeState.stat_gdp || 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[8px] tracking-[0.14em] uppercase text-zinc-500">Unemployment</span>
                      <span className="font-mono text-[11px] font-bold text-zinc-100">
                        {Number(overview.activeState.stat_unemployment || 5).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[8px] tracking-[0.14em] uppercase text-zinc-500">Tax Rev</span>
                      <span className="font-mono text-[11px] font-bold text-zinc-100">
                        CR {Number(overview.activeState.stat_tax_revenue || 150000).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[8px] tracking-[0.14em] uppercase text-zinc-500">Per Capita</span>
                      <span className="font-mono text-[11px] font-bold text-zinc-100">
                        CR {Number(overview.activeState.stat_per_capita || 45000).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
