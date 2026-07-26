'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTION_MODEL } from './_lib/model';
import type { PoliticsSection } from './_components/PoliticsSidebar';
import { formatGameDateShort } from '@/lib/calendar';
import { AlertCircle, ChevronRight, Activity, CalendarDays, ShieldAlert, Zap } from 'lucide-react';
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
        <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-zinc-500">{label}</span>
        <span className={`font-mono text-[13px] font-bold ${toneText}`}>{value.toFixed(1)}</span>
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
      <svg width="80" height="24" viewBox="0 0 80 24" className="opacity-20">
        <line x1="0" y1="12" x2="80" y2="12" stroke="#6B6358" strokeWidth="1.5" strokeDasharray="2 4" />
      </svg>
    );
  }
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const w = 80, h = 24;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />
    </svg>
  );
}

// ── Recommended Action Item ───────────────────────────────────────────────
function ActionItem({ cost, label, onClick }: { cost: number; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 w-full p-3 rounded-lg cursor-pointer text-left bg-white/5 hover:bg-terminal-amber/5 border border-white/5 hover:border-terminal-amber/30 transition-all duration-200 mb-2"
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-terminal-amber/10 text-terminal-amber shrink-0">
        <Zap size={16} />
      </div>
      <div className="flex-1">
        <div className="font-serif text-[13px] text-zinc-100 font-medium group-hover:text-[#F4EBD6] transition-colors">{label}</div>
        <div className="font-mono text-[10px] text-terminal-amber mt-1">Cost: {cost} AP</div>
      </div>
      <ChevronRight size={16} className="text-zinc-500 group-hover:text-terminal-amber transition-all group-hover:translate-x-0.5" />
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function OverviewScreen({ overview, character, parties, myAp, selectedJurisdictionId, onNavigate, onRefresh }: Props) {
  const jid = selectedJurisdictionId;
  const { data: billData } = useSWR(['ov-bills', jid], () => politicsApi.getBills(jid).catch(() => null), { refreshInterval: 20000 });
  const { data: ledger = [] } = useSWR(['ov-ledger', jid], () => politicsApi.getLedger(8, jid).catch(() => []), { refreshInterval: 20000 });
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
    briefingItems.push({ severity: 'critical', title: `Election in ${monthsToElection} month${monthsToElection === 1 ? '' : 's'}`, sub: 'Accelerate campaign operations — time is critical.' });
  }
  if (support != null && support < 35) {
    briefingItems.push({ severity: 'critical', title: `Party support critically low — ${support.toFixed(1)}%`, sub: 'Risk of election loss. Consider platform repositioning.' });
  }
  if (floorBill) {
    const passPct = ayes && (ayes + (nays || 0)) > 0 ? Math.round(ayes / (ayes + (nays || 0)) * 100) : null;
    briefingItems.push({
      severity: passPct != null && passPct >= 50 ? 'info' : 'warning',
      title: `"${floorBill.title || floorBill.name || 'Bill'}" on the floor`,
      sub: passPct != null ? `Currently ${passPct}% in favour — vote in Legislature.` : 'Requires your attention in Legislature.'
    });
  }
  if (cond?.order != null && cond.order < 4) {
    briefingItems.push({ severity: 'warning', title: 'Public order deteriorating', sub: `Order index: ${Number(cond.order).toFixed(1)} / 10` });
  }
  if (briefingItems.length === 0) {
    briefingItems.push({ severity: 'info', title: 'No urgent matters — stability maintained.', sub: 'A quiet month. Consider proactive policy moves.' });
  }

  // ── Recommended actions ──
  const recommendations: Array<{ cost: number; label: string; section: PoliticsSection }> = [];
  if (!myParty)          recommendations.push({ cost: 0, label: 'Found a Party and choose your Creed', section: 'party' });
  if (monthsToElection && monthsToElection <= 12) recommendations.push({ cost: 5, label: 'Review electoral polling and deploy campaign resources', section: 'elections' });
  if (floorBill)         recommendations.push({ cost: 2, label: `Vote on "${floorBill.title || 'floor bill'}" in Legislature`, section: 'legislature' });
  if (myParty)           recommendations.push({ cost: 3, label: 'Check party unity and fund ground operations', section: 'party' });
  if (recommendations.length === 0) recommendations.push({ cost: 4, label: 'Sponsor a new bill in Legislature', section: 'legislature' });

  // ── Approval trend (mock from support history if available) ──
  const supportHistory: number[] = myParty?.support_history || (support != null ? [support - 2, support - 1.5, support - 0.5, support] : []);
  const latestDelta = supportHistory.length > 1 ? supportHistory[supportHistory.length - 1] - supportHistory[supportHistory.length - 2] : null;
  const trendArrow = latestDelta == null ? '' : latestDelta > 0 ? '▲' : latestDelta < 0 ? '▼' : '▬';
  const trendColor = latestDelta == null ? '#A79D8C' : latestDelta > 0 ? '#36D399' : latestDelta < 0 ? '#B85555' : '#A79D8C';

  async function vote(id: string, v: 'yea' | 'nay') {
    try { setBusy(v); await politicsApi.voteBill(id, v); await onRefresh(); } catch { } finally { setBusy(null); }
  }

  return (
    <div className="flex flex-col gap-4 pb-6">

      {/* ── OLED HERO HEADER ── */}
      <Card pad="lg" accent className="relative overflow-hidden bg-gradient-to-br from-black/80 to-zinc-900/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_0_12px_32px_rgba(0,0,0,0.5)]">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />

        <div className="flex justify-between items-start flex-wrap gap-4 relative z-10">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-terminal-amber px-2 py-0.5 border border-terminal-amber/20 rounded bg-terminal-amber/5">
                {jMeta.name} — Command Center
              </span>
            </div>
            
            <h1 className="text-[#F4EBD6] text-xl font-bold font-serif my-2 tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              {myParty ? myParty.name : 'Political Desk'}
              {myParty?.abbreviation && <span className="text-zinc-500 text-lg font-mono uppercase ml-3 font-medium">[{myParty.abbreviation}]</span>}
            </h1>
            <div className="font-mono text-xs text-blue-400 mt-1 tracking-widest uppercase">
              {myParty?.doctrine_id ? myParty.doctrine_id.replace(/_/g, ' ') : 'NO ACTIVE DOCTRINE'}
            </div>
            
            {myParty?.slogan && (
              <div className="italic text-[13px] text-zinc-400 mt-1 mb-2">
                "{myParty.slogan}"
              </div>
            )}
            
            {/* Action Points Inline Display */}
            <div className="flex items-center flex-wrap gap-3 mt-6">
              <div className="px-3 py-1.5 bg-terminal-amber/10 border border-terminal-amber/20 rounded-md flex items-center gap-2">
                <Zap size={14} className="text-terminal-amber" />
                <span className="font-mono text-xs text-terminal-amber font-semibold">{myAp?.current_ap ?? 0} / {myAp?.ap_cap ?? 12} AP</span>
              </div>
              <span className="text-zinc-500 text-xs">Available Action Points</span>

              {myParty && myParty.leader_character_id === character?.id && (
                <div className="ml-auto">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to permanently delete this party? All party data will be lost (business/finances are NOT affected).')) {
                        try {
                          await politicsApi.dissolveParty(myParty.id);
                          await onRefresh();
                        } catch (e: any) {
                          alert(e.response?.data?.message || 'Failed to delete party');
                        }
                      }
                    }}
                  >
                    Delete Party
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* OLED Metric Blocks */}
          <div className="flex gap-4">
            {support != null && (
              <div className="bg-black/40 border border-white/5 rounded-xl py-2.5 px-3.5 min-w-[140px] flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[10px] tracking-widest uppercase">
                  <Activity size={12} /> Approval
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-mono text-lg font-bold text-[#F4EBD6]" style={{ textShadow: `0 0 16px ${trendColor}60` }}>
                    {support.toFixed(1)}<span className="text-base text-zinc-400">%</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 w-full justify-center">
                  <span className="text-xs font-bold" style={{ color: trendColor }}>{trendArrow}</span>
                  <div className="w-[60px]"><Sparkline values={supportHistory} color={trendColor} /></div>
                </div>
              </div>
            )}
            
            {monthsToElection != null && (
              <div className={`border rounded-xl py-2.5 px-3.5 min-w-[140px] flex flex-col items-center ${monthsToElection <= 6 ? 'bg-red-500/10 border-red-500/30' : 'bg-black/40 border-white/5'}`}>
                <div className={`flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase ${monthsToElection <= 6 ? 'text-red-500' : 'text-zinc-500'}`}>
                  <CalendarDays size={12} /> Election
                </div>
                <div className={`font-mono text-lg font-bold mt-2 ${monthsToElection <= 6 ? 'text-red-500' : 'text-terminal-amber'}`} style={{ textShadow: monthsToElection <= 6 ? '0 0 16px rgba(239,68,68,0.6)' : 'none' }}>
                  {monthsToElection <= 0 ? 'IMMINENT' : monthsToElection}
                </div>
                <div className={`font-mono text-[11px] mt-1 tracking-wider ${monthsToElection <= 6 ? 'text-red-500' : 'text-zinc-500'}`}>
                  {monthsToElection === 1 ? 'MONTH' : 'MONTHS'}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── NO PARTY CTA ── */}
      {!myParty && (
        <div className="bg-gradient-to-br from-blue-500/15 to-blue-700/5 border border-blue-500/30 rounded-xl p-6 md:p-8 flex items-center justify-between gap-4 flex-wrap shadow-[0_8px_32px_rgba(37,99,235,0.1)]">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-mono text-[11px] font-bold tracking-widest uppercase mb-2">
              <AlertCircle size={16} /> Action Required
            </div>
            <h2 className="text-[#F4EBD6] text-xl m-0 mb-2 font-serif font-semibold">Get Started: Found a Party</h2>
            <div className="text-zinc-400 text-xs leading-relaxed max-w-[600px]">
              You have no active political presence. Found a movement, choose your Creed, and stand for {jMeta.name}. Your Creed locks your ideological identity and unlocks a unique Signature action.
            </div>
          </div>
          <Button variant="primary" onClick={() => onNavigate('party')}>Found a Party</Button>
        </div>
      )}

      {/* ── SITUATION ROOM (Briefing + Conditions) ── */}
      <Card title="Situation Room" accent className="border-t-terminal-amber/30">
        <div className="flex gap-8 flex-wrap p-4">
          
          {/* Briefing List */}
          <div className="flex-[1_1_300px] flex flex-col gap-3">
            <div className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase mb-1">Morning Briefing</div>
            {briefingItems.map((item, i) => {
              const isCrit = item.severity === 'critical';
              const isWarn = item.severity === 'warning';
              const colorCls = isCrit ? 'border-red-500 text-red-500 bg-red-500/10' : isWarn ? 'border-amber-500 text-amber-500 bg-amber-500/10' : 'border-blue-500 text-blue-500 bg-blue-500/10';
              const Icon = isCrit ? ShieldAlert : isWarn ? AlertCircle : Activity;
              return (
                <div key={i} className={`flex items-start gap-3 p-3.5 bg-black/30 border border-white/5 border-l-2 rounded-lg shadow-sm ${isCrit ? 'border-l-red-500' : isWarn ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
                  <div className={`mt-0.5 shrink-0 ${isCrit ? 'text-red-500' : isWarn ? 'text-amber-500' : 'text-blue-500'}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="font-serif text-sm font-semibold text-zinc-100 leading-snug">{item.title}</div>
                    {item.sub && <div className="font-mono text-[11px] text-zinc-400 mt-1">{item.sub}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conditions Grid */}
          {hasConditions && (
            <div className="flex-[1_1_300px] flex flex-col gap-3">
              <div className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase mb-1">Jurisdiction Conditions</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-black/20 p-3 rounded-lg border border-white/5">
                {(['prosperity', 'jobs', 'order', 'cohesion', 'budget'] as const).map((key) => {
                  const v = typeof cond[key] === 'number' ? Number(cond[key]) : 5;
                  const label = key.charAt(0).toUpperCase() + key.slice(1);
                  return <OledMeter key={key} value={v} label={label} />;
                })}
              </div>
              <div className="text-zinc-500 text-[11px] italic mt-1">These metrics move based on the governing party's policies and impact national stability.</div>
            </div>
          )}
          
          {/* National Stats Grid */}
          {overview?.activeState && (
            <div className="flex-[1_1_300px] flex flex-col gap-3">
              <div className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase mb-1">National Statistics</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-black/20 p-3 rounded-lg border border-white/5">
                
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-zinc-500">GDP</span>
                    <span className="font-mono text-[13px] font-bold text-zinc-100">
                      CR {Number(overview.activeState.stat_gdp || 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-zinc-500">Unemployment</span>
                    <span className="font-mono text-[13px] font-bold text-zinc-100">
                      {Number(overview.activeState.stat_unemployment || 5).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-zinc-500">Tax Revenue</span>
                    <span className="font-mono text-[13px] font-bold text-zinc-100">
                      CR {Number(overview.activeState.stat_tax_revenue || 150000).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-zinc-500">Per Capita</span>
                    <span className="font-mono text-[13px] font-bold text-zinc-100">
                      CR {Number(overview.activeState.stat_per_capita || 45000).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-zinc-500">Pollution</span>
                    <span className="font-mono text-[13px] font-bold text-zinc-100">
                      {Number(overview.activeState.stat_pollution || 50).toFixed(1)}
                    </span>
                  </div>
                </div>

              </div>
              <div className="text-zinc-500 text-[11px] italic mt-1">Macro-economic indicators defining national progress.</div>
            </div>
          )}
        </div>
      </Card>

      {/* ── 3-COLUMN DASH ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Tactical Recommendations */}
        <Card title="Tactical Recommendations">
          <div className="flex flex-col gap-1 p-4">
            {recommendations.map((rec, i) => (
              <ActionItem key={i} cost={rec.cost} label={rec.label} onClick={() => onNavigate(rec.section)} />
            ))}
          </div>
        </Card>

        {/* On The Floor */}
        <Card title="On The Floor" accent className={floorBill ? "border-t-blue-500/50" : ""}>
          {floorBill ? (
            <div className="flex flex-col gap-4 h-full justify-between p-4">
              <div>
                <div className="text-zinc-100 font-bold text-base font-serif leading-snug">{floorBill.title || floorBill.name || floorBill.type || 'Bill on the floor'}</div>
                <div className="font-mono text-[11px] text-blue-400 mt-1.5 uppercase tracking-[0.08em] inline-block bg-blue-500/10 px-2 py-0.5 rounded">
                  {floorBill.type || 'motion'} — {floorBill.status || 'open'}
                </div>
              </div>
              
              {(ayes != null || nays != null) && (
                <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                  <div className="flex justify-between mb-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] text-zinc-500 uppercase">Ayes</span>
                      <span className="font-mono text-lg font-bold text-[#36D399]">{ayes ?? 0}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-[10px] text-zinc-500 uppercase">Nays</span>
                      <span className="font-mono text-lg font-bold text-[#B85555]">{nays ?? 0}</span>
                    </div>
                  </div>
                  {ayes != null && nays != null && (
                    <div className="h-1.5 rounded-full overflow-hidden bg-red-500/20 flex">
                      <div className="h-full bg-[#36D399] transition-all duration-700 shadow-[0_0_8px_#36D399]" style={{ width: `${(ayes / (ayes + nays || 1)) * 100}%` }} />
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-3 mt-auto">
                <div className="flex-1"><Button variant="primary" className="w-full" onClick={() => vote(floorBill.id, 'yea')} disabled={!!busy}>Aye</Button></div>
                <div className="flex-1"><Button variant="ghost" className="w-full" onClick={() => vote(floorBill.id, 'nay')} disabled={!!busy}>Nay</Button></div>
              </div>
            </div>
          ) : (
            <div className="text-zinc-500 italic text-[13px] text-center py-10 px-4">
              No bills on the floor. Propose one in the Legislature.
            </div>
          )}
        </Card>

        {/* Live Chronicle */}
        <Card title="Live Chronicle">
          {events.length === 0 ? (
            <div className="text-zinc-500 italic text-[13px] text-center py-10 px-4">No recent activity logged.</div>
          ) : (
            <div className="flex flex-col gap-0 -m-2.5 p-4">
              {events.slice(0, 5).map((e: any, i: number) => (
                <div key={e.id || i} className={`p-3 flex flex-col gap-1 ${i < Math.min(events.length - 1, 4) ? 'border-b border-white/5' : ''}`}>
                  <div className="font-mono text-[10px] text-zinc-500 tracking-[0.12em] uppercase">
                    {e.arc != null ? formatGameDateShort(e.arc) : e.kind || ''}
                  </div>
                  <div className="text-zinc-200 text-[13px] leading-relaxed">
                    {e.headline || e.title || e.message || e.description || e.kind || 'Event'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
