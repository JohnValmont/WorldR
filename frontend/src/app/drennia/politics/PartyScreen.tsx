'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, SANS, HEADING, stampStyle, glassPanelStyle, interactiveCardStyle } from './_lib/theme';
import { CREEDS, CREED_ORDER, CREED_NAME_BY_ID, PILLARS, PILLAR_BY_AXIS, type CreedId, BLOC_NAME_BY_KEY } from './_lib/model';
import type { Axis } from '@/lib/politicsConstants';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Stamp, Meter } from './_components/DeskUI';
import { Shield, Target, Map, Building2, Coins, Activity, Flag, AlertCircle, Users, Zap, Crown } from 'lucide-react';

interface Props {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  character: any;
  parties: any[];
  myAp?: { current_ap: number; ap_cap: number };
  myPc?: { current_pc: number; pc_cap: number };
  onRefresh: () => void;
}

const CREED_PLATFORMS: Record<CreedId, Record<Axis, number>> = {
  forge_accord:  { taxation: 20, labour: 80, investment: 80, trade: 20, stability: 50 },
  the_ledger:    { taxation: 80, labour: 20, investment: 20, trade: 80, stability: 80 },
  the_homestead: { taxation: 50, labour: 50, investment: 20, trade: 20, stability: 80 },
  the_commons:   { taxation: 20, labour: 80, investment: 80, trade: 50, stability: 20 },
  the_vanguard:  { taxation: 50, labour: 50, investment: 50, trade: 80, stability: 20 },
  the_compact:   { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 },
  the_syndicate: { taxation: 20, labour: 80, investment: 50, trade: 50, stability: 20 },
  the_directory: { taxation: 50, labour: 50, investment: 80, trade: 50, stability: 50 },
};

const TENETS: Record<CreedId, { id: string; name: string; type: string }[]> = {
  forge_accord:  [{ id: 'forge_radicals', name: 'Shop Floor Radicals', type: 'intensify' }, { id: 'forge_modernizers', name: 'Factory Modernizers', type: 'broaden' }],
  the_ledger:    [{ id: 'ledger_hardliners', name: 'Hard Austerity', type: 'intensify' }, { id: 'ledger_expansionists', name: 'Trade Expansionists', type: 'broaden' }],
  the_homestead: [{ id: 'homestead_roots', name: 'Back to Roots', type: 'intensify' }, { id: 'homestead_pragmatists', name: 'Pragmatic Centre', type: 'broaden' }],
  the_commons:   [{ id: 'commons_vanguard', name: 'Reform Vanguard', type: 'intensify' }, { id: 'commons_outreach', name: 'Cross-Class Outreach', type: 'broaden' }],
  the_vanguard:  [{ id: 'vanguard_professionals', name: 'Professional Class', type: 'intensify' }, { id: 'vanguard_traders', name: 'Trade First', type: 'broaden' }],
  the_compact:   [{ id: 'compact_builders', name: 'Infrastructure First', type: 'intensify' }, { id: 'compact_populists', name: 'Household Compact', type: 'broaden' }],
  the_syndicate: [{ id: 'syndicate_radicals', name: 'Industrial Action', type: 'intensify' }, { id: 'syndicate_moderates', name: 'Union Pragmatists', type: 'broaden' }],
  the_directory: [{ id: 'directory_planners', name: 'Central Planners', type: 'intensify' }, { id: 'directory_pragmatists', name: 'Market Technocrats', type: 'broaden' }],
};

function Panel({ title, children, action, accent, flex }: { title: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; accent?: string; flex?: number | string }) {
  return (
    <div style={{
      ...glassPanelStyle,
      flex,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(145deg, rgba(18, 20, 26, 0.7) 0%, rgba(10, 12, 16, 0.9) 100%)',
      border: `1px solid rgba(255, 255, 255, 0.08)`,
      borderTop: accent ? `1px solid ${accent}` : `1px solid rgba(255, 255, 255, 0.15)`,
      boxShadow: accent ? `0 4px 24px ${accent}20, inset 0 1px 0 rgba(255,255,255,0.05)` : '0 4px 24px rgba(0,0,0,0.4)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ 
        padding: '10px 14px', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: accent || T.faint,
        background: 'rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{title}</div>
        {action}
      </div>
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', fontFamily: SANS }}>
        {children}
      </div>
    </div>
  );
}

function Btn({ label, onClick, primary, disabled }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        padding: '10px 16px', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        fontSize: 12, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase',
        background: primary ? (hover ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.1)') : (hover ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'),
        color: primary ? T.gold : T.ivory,
        border: `1px solid ${primary ? T.goldLine : 'rgba(255,255,255,0.1)'}`,
        boxShadow: primary ? `0 0 16px ${T.goldSoft}` : 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8
      }}>
      {label}
    </button>
  );
}

function nearestRung(axis: string, value: number) {
  const p = PILLAR_BY_AXIS[axis as keyof typeof PILLAR_BY_AXIS];
  if (!p) return '';
  let best = p.rungs[0];
  for (const r of p.rungs) if (Math.abs(r.value - value) < Math.abs(best.value - value)) best = r;
  return best.label;
}

// ── Faction Loyalty colours ──────────────────────────────────────────────────
function loyaltyTone(loyalty: number) {
  if (loyalty >= 60) return T.mint;
  if (loyalty >= 35) return T.gold;
  return T.red;
}

// ── Faction Panel ─────────────────────────────────────────────────────────────
function FactionPanel({ partyId, onSpendPc }: { partyId: string; onSpendPc?: (action: string, factionId?: string) => Promise<void> }) {
  const [data, setData] = useState<{ cohesion: number; factions: any[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await politicsApi.getPartyFactions(partyId)); } catch {}
  }, [partyId]);

  useEffect(() => { load(); }, [load]);

  async function discipline(factionId: string) {
    if (!onSpendPc) return;
    setBusy(factionId);
    try {
      const res = await onSpendPc('discipline_faction', factionId);
      setMsg((res as any)?.message ?? 'Done.');
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed');
    } finally { setBusy(null); }
  }

  async function rally() {
    if (!onSpendPc) return;
    setBusy('rally');
    try {
      const res = await onSpendPc('rally_base');
      setMsg((res as any)?.message ?? 'Done.');
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed');
    } finally { setBusy(null); }
  }

  const cohesion = data?.cohesion ?? null;
  const cohesionTone = cohesion == null ? T.faint : cohesion >= 60 ? T.mint : cohesion >= 35 ? T.gold : T.red;

  return (
    <Panel title="Internal Factions"
      action={
        <button onClick={rally} disabled={!!busy} style={{
          padding: '6px 14px', borderRadius: 4, cursor: busy ? 'not-allowed' : 'pointer',
          background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`,
          color: T.faint, fontSize: 10, fontFamily: MONO, letterSpacing: '0.1em',
          textTransform: 'uppercase', opacity: busy ? 0.5 : 1,
        }}>
          {busy === 'rally' ? '…' : '2 PC · Rally Base'}
        </button>
      }>
      {/* Cohesion header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: T.muted, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Party Cohesion</span>
            <span style={{ color: cohesionTone, fontSize: 13, fontFamily: MONO, fontWeight: 700 }}>{cohesion ?? '—'}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(0,0,0,0.4)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${cohesion ?? 0}%`, height: '100%', background: cohesionTone, transition: 'width 0.8s ease', boxShadow: `0 0 8px ${cohesionTone}` }} />
          </div>
          <div style={{ color: T.faint, fontSize: 10, marginTop: 4, fontFamily: MONO }}>
            {cohesion == null ? 'Loading…' : cohesion >= 60 ? 'Stable — all factions aligned' : cohesion >= 35 ? 'Strained — some factions restless' : 'Crisis — leadership threatened'}
          </div>
        </div>
      </div>

      {/* Faction rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(data?.factions ?? []).map((f: any) => {
          const loyalty = Number(f.loyalty);
          const tone = loyaltyTone(loyalty);
          const share = Math.round(Number(f.membership_share) * 100);
          return (
            <div key={f.id} style={{
              background: f.is_restless ? `rgba(224, 82, 70, 0.05)` : 'rgba(255,255,255,0.015)',
              border: `1px solid ${f.is_restless ? 'rgba(224,82,70,0.25)' : T.border}`,
              borderRadius: 6, padding: '10px 14px',
              transition: 'border 0.3s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {f.is_restless && <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.red, boxShadow: `0 0 6px ${T.red}` }} />}
                  <span style={{ color: f.is_restless ? T.red : T.ivory, fontWeight: 600, fontSize: 13 }}>{f.name}</span>
                  <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO }}>{share}% of party</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: tone, fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>{loyalty}%</span>
                  {f.is_restless && onSpendPc && (
                    <button onClick={() => discipline(f.id)} disabled={!!busy}
                      style={{
                        padding: '3px 10px', borderRadius: 3, cursor: busy ? 'not-allowed' : 'pointer',
                        background: 'rgba(224,82,70,0.1)', border: `1px solid rgba(224,82,70,0.3)`,
                        color: T.red, fontSize: 9, fontFamily: MONO, letterSpacing: '0.08em',
                        textTransform: 'uppercase', opacity: busy ? 0.5 : 1,
                      }}>
                      {busy === f.id ? '…' : '3 PC · Discipline'}
                    </button>
                  )}
                </div>
              </div>
              {/* Loyalty bar */}
              <div style={{ height: 4, background: 'rgba(0,0,0,0.4)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${loyalty}%`, height: '100%', background: tone, transition: 'width 0.6s ease' }} />
              </div>
              {/* Demand */}
              {f.demand_payload && (
                <div style={{ marginTop: 6, color: T.faint, fontSize: 10, fontFamily: MONO }}>
                  {f.demand_type === 'policy_axis' && f.demand_payload.axis && `Demands: ${String(f.demand_payload.axis).charAt(0).toUpperCase() + String(f.demand_payload.axis).slice(1)} ${f.demand_payload.direction === 'raise' ? '▲' : '▼'}`}
                  {f.demand_type === 'ministry_seat' && f.demand_payload.ministry && `Demands: ${String(f.demand_payload.ministry)} ministry seat`}
                  {f.demand_type === 'leadership_change' && 'Demands: Leadership change'}
                  {f.demand_type === 'autonomy' && 'Demands: Internal voting autonomy'}
                </div>
              )}
            </div>
          );
        })}
        {data?.factions?.length === 0 && <div style={{ color: T.faint, fontSize: 13 }}>No factions yet — found a party to generate them.</div>}
        {!data && <div style={{ color: T.faint, fontSize: 13, fontStyle: 'italic' }}>Loading factions…</div>}
      </div>
      {msg && <div style={{ marginTop: 10, color: T.gold, fontSize: 12, fontFamily: MONO }}>{msg}</div>}
    </Panel>
  );
}

// ── Scandal Panel ──────────────────────────────────────────────────────────────
const SCANDAL_PHASE_LABELS: Record<string, string> = {
  rumour: 'Rumour', investigation: 'Under Investigation', allegation: 'Allegation',
  explosion: 'Media Storm', inquiry: 'Parliamentary Inquiry', resolved: 'Resolved',
};
const SCANDAL_TYPE_LABELS: Record<string, string> = {
  financial: 'Financial', personal: 'Personal Conduct', governmental: 'Governmental', electoral: 'Electoral',
};
const SCANDAL_PHASE_COLOR: Record<string, string> = {
  rumour: '#a78bfa',       // purple — secret, only you can see it
  investigation: '#fbbf24', // amber
  allegation: '#f97316',   // orange
  explosion: '#ef4444',    // red
  inquiry: '#dc2626',      // deep red
  resolved: '#6b7280',     // grey
};

function ScandalPanel({ onRefresh }: { onRefresh: () => void }) {
  const [data, setData] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r = await politicsApi.getMyScandals(); setData(r.scandals ?? []); } catch { setData([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ACTIONS: { id: string; label: string; cost: string; phases: string[] }[] = [
    { id: 'suppress',             label: 'Suppress',         cost: '4 PC',  phases: ['rumour'] },
    { id: 'spin',                 label: 'Spin',             cost: '3 AP',  phases: ['investigation'] },
    { id: 'investigate_internal', label: 'Internal Inquiry', cost: '4 AP',  phases: ['allegation'] },
    { id: 'stonewall',            label: 'Stonewall',        cost: '2 AP',  phases: ['explosion', 'inquiry'] },
    { id: 'full_disclosure',      label: 'Full Disclosure',  cost: '0 AP',  phases: ['explosion', 'inquiry'] },
  ];

  async function act(scandalId: string, intervention: string) {
    setBusy(scandalId + intervention);
    try {
      const res = await politicsApi.actOnScandal(scandalId, intervention);
      setMsg((res as any)?.message ?? 'Intervention applied.');
      await load();
      onRefresh();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Action failed.');
    } finally { setBusy(null); }
  }

  const count = data?.length ?? 0;

  return (
    <div style={{
      background: count > 0
        ? 'linear-gradient(135deg, rgba(30,10,10,0.92) 0%, rgba(60,15,15,0.85) 100%)'
        : 'rgba(15,20,30,0.6)',
      border: `1px solid ${count > 0 ? 'rgba(239,68,68,0.35)' : T.border}`,
      borderTop: count > 0 ? '1px solid rgba(239,68,68,0.6)' : `1px solid ${T.border}`,
      borderRadius: 8,
      padding: '12px 16px',
      boxShadow: count > 0 ? '0 4px 24px rgba(239,68,68,0.12)' : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {count > 0 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', animation: 'pulse 1.5s infinite' }} />}
          <div style={{ width: 3, height: 11, background: count > 0 ? '#ef4444' : T.border, borderRadius: 1 }} />
          <span style={{ fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.22em', fontSize: 10, color: count > 0 ? '#fca5a5' : T.faint }}>Active Scandals</span>
        </div>
        {count > 0 && (
          <span style={{ padding: '3px 10px', borderRadius: 3, fontSize: 9, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}>
            {count} Active
          </span>
        )}
      </div>

      {data === null && <div style={{ color: T.faint, fontSize: 12, fontStyle: 'italic' }}>Loading…</div>}

      {data !== null && data.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
          <span style={{ color: '#4ade80', fontSize: 12, fontFamily: MONO }}>✓</span>
          <span style={{ color: T.faint, fontSize: 13, fontStyle: 'italic' }}>No active scandals. Your record is clean.</span>
        </div>
      )}

      {data !== null && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.map((s: any) => {
            const phaseColor = SCANDAL_PHASE_COLOR[s.phase] ?? T.faint;
            const availableActions = ACTIONS.filter(a => a.phases.includes(s.phase));
            return (
              <div key={s.id} style={{
                background: 'rgba(0,0,0,0.3)', border: `1px solid ${phaseColor}30`,
                borderLeft: `3px solid ${phaseColor}`, borderRadius: 6, padding: '12px 16px',
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.08em', background: `${phaseColor}20`, border: `1px solid ${phaseColor}50`, color: phaseColor }}>
                      {SCANDAL_PHASE_LABELS[s.phase] ?? s.phase}
                    </span>
                    <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase' }}>{SCANDAL_TYPE_LABELS[s.scandal_type] ?? s.scandal_type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} style={{ width: 8, height: 8, borderRadius: 1, background: i < s.severity ? phaseColor : 'rgba(255,255,255,0.06)' }} />
                    ))}
                  </div>
                </div>
                {/* Phase narrative */}
                <div style={{ color: T.muted, fontSize: 12, marginBottom: availableActions.length > 0 ? 10 : 0, lineHeight: 1.5 }}>
                  {s.phase === 'rumour' && 'Intelligence has surfaced inside your party. Act now before it reaches the press.'}
                  {s.phase === 'investigation' && 'Journalists are asking questions. The story is building momentum.'}
                  {s.phase === 'allegation' && 'A formal allegation has been made. Your popularity is taking damage.'}
                  {s.phase === 'explosion' && 'The story has exploded across every media outlet. Damage control required.'}
                  {s.phase === 'inquiry' && 'A parliamentary inquiry is underway. Proceedings are public record.'}
                </div>
                {/* Action buttons */}
                {availableActions.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {availableActions.map(a => (
                      <button key={a.id}
                        disabled={!!busy}
                        onClick={() => act(s.id, a.id)}
                        style={{
                          padding: '5px 12px', borderRadius: 4, cursor: busy ? 'not-allowed' : 'pointer',
                          background: a.id === 'full_disclosure' ? 'rgba(74,222,128,0.08)' : `${phaseColor}10`,
                          border: `1px solid ${a.id === 'full_disclosure' ? 'rgba(74,222,128,0.3)' : phaseColor + '40'}`,
                          color: a.id === 'full_disclosure' ? '#4ade80' : phaseColor,
                          fontSize: 10, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase',
                          opacity: busy ? 0.5 : 1, transition: 'opacity 0.2s',
                        }}>
                        {busy === s.id + a.id ? '…' : `${a.label} · ${a.cost}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {msg && <div style={{ marginTop: 12, color: T.gold, fontSize: 12, fontFamily: MONO }}>{msg}</div>}
    </div>
  );
}

// ── Campaign Command Panel ────────────────────────────────────────────────────────
const STRATEGY_META: Record<string, { label: string; tagline: string; effort: string; budget: string; reach: string; accentColor: string }> = {
  ground_war:  { label: 'Ground War',      tagline: 'Door-to-door dominance',        effort: '×1.40', budget: '×0.80', reach: '+0.5/arc', accentColor: '#22d3ee' },
  air_war:     { label: 'Air War',          tagline: 'Broadcast and media blitz',     effort: '×0.70', budget: '×1.60', reach: '+1.0/arc', accentColor: '#a78bfa' },
  targeted:    { label: 'Targeted',         tagline: 'Precision swing-segment ops',   effort: '×1.20', budget: '×1.00', reach: '+0.2/arc', accentColor: '#f59e0b' },
  balanced:    { label: 'Balanced',         tagline: 'Even spread across all fronts', effort: '×1.00', budget: '×1.00', reach: '+0.5/arc', accentColor: T.gold },
  insurgent:   { label: 'Insurgent',        tagline: 'High energy, low budget',       effort: '×1.10', budget: '×0.50', reach: '+0.8/arc', accentColor: '#fb923c' },
};

function CampaignPanel({ partyId, onRefresh }: { partyId: string; onRefresh: () => void }) {
  const [data, setData] = useState<{ campaign: any; cycle: any } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  const load = useCallback(async () => {
    try { setData(await politicsApi.getMyCampaign()); } catch { setData(null); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeStrategy(strategy: string) {
    setBusy(true);
    try {
      const res = await politicsApi.setCampaignStrategy(strategy);
      setMsg((res as any)?.message ?? 'Strategy updated.');
      await load(); onRefresh();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to set strategy.');
    } finally { setBusy(false); }
  }

  async function allocateBudget() {
    const amount = Number(budgetInput);
    if (!amount || amount <= 0) { setMsg('Enter a valid amount.'); return; }
    setBusy(true);
    try {
      const res = await politicsApi.allocateCampaignBudget(amount);
      setMsg((res as any)?.message ?? 'Budget allocated.');
      setBudgetInput('');
      await load(); onRefresh();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Allocation failed.');
    } finally { setBusy(false); }
  }

  const campaign = data?.campaign;
  const cycle = data?.cycle;
  const ggs = campaign ? Math.round(Number(campaign.ground_game_score)) : 0;
  const momentum = campaign ? Number(campaign.momentum) : 0;
  const strategy = campaign?.strategy_type ?? 'balanced';
  const meta = STRATEGY_META[strategy] ?? STRATEGY_META.balanced;

  // Parse arc log
  const arcLog: any[] = (() => {
    if (!campaign?.arc_actions) return [];
    try {
      const all = typeof campaign.arc_actions === 'string'
        ? JSON.parse(campaign.arc_actions) : campaign.arc_actions;
      // Show only arc-summary entries (have ggs_gain field) and event entries, last 6
      return all.filter((e: any) => e.ggs_gain !== undefined || e.event).slice(-6).reverse();
    } catch { return []; }
  })();

  if (!campaign && data !== null) {
    return (
      <div style={{ ...glassPanelStyle, background: 'rgba(10,14,26,0.7)', border: `1px solid ${T.border}` }}>
        <div style={{ ...stampStyle, marginBottom: 8 }}>Campaign HQ</div>
        <div style={{ color: T.faint, fontSize: 13, fontStyle: 'italic' }}>No active campaign. Declare candidacy to open your Campaign HQ.</div>
      </div>
    );
  }
  if (!campaign) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(10,15,28,0.95) 0%, rgba(15,22,40,0.9) 100%)',
      border: `1px solid ${meta.accentColor}30`,
      borderTop: `2px solid ${meta.accentColor}`,
      borderRadius: 8,
      padding: '12px 16px',
      boxShadow: `0 4px 32px ${meta.accentColor}10`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 3, height: 11, background: meta.accentColor, borderRadius: 1, boxShadow: `0 0 6px ${meta.accentColor}` }} />
            <span style={{ fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.22em', fontSize: 10, color: meta.accentColor }}>Campaign HQ</span>
            {cycle && <span style={{ fontFamily: MONO, fontSize: 9, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>· Cycle {cycle.cycle_number} · {cycle.phase}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, borderRadius: 3, padding: '3px 8px' }}>
            Allocated ${(campaign.budget_allocated ?? 0).toLocaleString()}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, borderRadius: 3, padding: '3px 8px' }}>
            Spent ${(campaign.budget_spent ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Ground Game Score + Momentum */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* GGS */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '12px 14px', border: `1px solid ${meta.accentColor}20` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Ground Game</span>
            <span style={{ color: meta.accentColor, fontSize: 14, fontFamily: MONO, fontWeight: 700 }}>{ggs}<span style={{ fontSize: 9, color: T.faint }}>/100</span></span>
          </div>
          <div style={{ height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${ggs}%`, height: '100%', background: `linear-gradient(90deg, ${meta.accentColor}80, ${meta.accentColor})`, boxShadow: `0 0 8px ${meta.accentColor}50`, transition: 'width 1s ease' }} />
          </div>
          <div style={{ color: T.faint, fontSize: 9, marginTop: 5, fontFamily: MONO }}>
            {ggs >= 80 ? 'Maximum saturation' : ggs >= 50 ? 'Strong coverage' : ggs >= 25 ? 'Building presence' : 'Early ground ops'}
          </div>
        </div>
        {/* Momentum */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '12px 14px', border: `1px solid ${momentum >= 0 ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Momentum</span>
            <span style={{ color: momentum >= 0 ? '#4ade80' : '#ef4444', fontSize: 14, fontFamily: MONO, fontWeight: 700 }}>
              {momentum >= 0 ? '+' : ''}{momentum.toFixed(1)}
            </span>
          </div>
          <div style={{ height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.1)' }} />
            <div style={{
              position: 'absolute',
              left: momentum >= 0 ? '50%' : `${50 + (momentum / 20) * 50}%`,
              width: `${Math.abs(momentum / 20) * 50}%`,
              height: '100%',
              background: momentum >= 0 ? '#4ade80' : '#ef4444',
              transition: 'all 0.8s ease',
            }} />
          </div>
          <div style={{ color: T.faint, fontSize: 9, marginTop: 5, fontFamily: MONO }}>
            {momentum > 8 ? 'Surging — actions compounding' : momentum > 0 ? 'Positive — keep up the pace' : momentum < -5 ? 'Losing ground — take action' : 'Flat — no recent activity'}
          </div>
        </div>
      </div>

      {/* Strategy Selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>Campaign Strategy · 2 AP to change</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(STRATEGY_META).map(([key, sm]) => {
            const isActive = key === strategy;
            return (
              <button key={key}
                disabled={busy || isActive}
                onClick={() => changeStrategy(key)}
                title={`${sm.tagline} | Effort ${sm.effort} · Budget ${sm.budget} · Reach ${sm.reach}`}
                style={{
                  padding: '7px 13px', borderRadius: 5, cursor: (busy || isActive) ? 'not-allowed' : 'pointer',
                  background: isActive ? `${sm.accentColor}18` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? sm.accentColor : T.border}`,
                  color: isActive ? sm.accentColor : T.faint,
                  fontSize: 10, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase',
                  boxShadow: isActive ? `0 0 12px ${sm.accentColor}20` : 'none',
                  transition: 'all 0.2s ease',
                  opacity: busy && !isActive ? 0.5 : 1,
                }}>
                {sm.label}
              </button>
            );
          })}
        </div>
        {/* Active strategy stats */}
        <div style={{ display: 'flex', gap: 16, marginTop: 10, padding: '8px 12px', background: `${meta.accentColor}08`, borderRadius: 5, border: `1px solid ${meta.accentColor}20` }}>
          <div><span style={{ color: T.faint, fontSize: 9, fontFamily: MONO }}>EFFORT MULT </span><span style={{ color: meta.accentColor, fontSize: 11, fontFamily: MONO, fontWeight: 700 }}>{meta.effort}</span></div>
          <div><span style={{ color: T.faint, fontSize: 9, fontFamily: MONO }}>BUDGET MULT </span><span style={{ color: meta.accentColor, fontSize: 11, fontFamily: MONO, fontWeight: 700 }}>{meta.budget}</span></div>
          <div><span style={{ color: T.faint, fontSize: 9, fontFamily: MONO }}>REACH </span><span style={{ color: meta.accentColor, fontSize: 11, fontFamily: MONO, fontWeight: 700 }}>{meta.reach}</span></div>
          <div style={{ marginLeft: 'auto' }}><span style={{ color: T.faint, fontSize: 9, fontFamily: MONO, fontStyle: 'italic' }}>{meta.tagline}</span></div>
        </div>
      </div>

      {/* Budget allocation */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Allocate Budget</span>
        <input
          type="number"
          value={budgetInput}
          onChange={e => setBudgetInput(e.target.value)}
          placeholder="Amount from treasury"
          style={{
            flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.4)',
            border: `1px solid ${T.border}`, borderRadius: 5,
            color: T.ivory, fontSize: 13, fontFamily: MONO, outline: 'none',
          }}
        />
        <button
          disabled={busy || !budgetInput}
          onClick={allocateBudget}
          style={{
            padding: '8px 16px', borderRadius: 5,
            background: `${meta.accentColor}15`, border: `1px solid ${meta.accentColor}50`,
            color: meta.accentColor, fontSize: 10, fontFamily: MONO, letterSpacing: '0.08em',
            textTransform: 'uppercase', cursor: (busy || !budgetInput) ? 'not-allowed' : 'pointer',
            opacity: (busy || !budgetInput) ? 0.5 : 1,
          }}>
          {busy ? '…' : 'Commit'}
        </button>
      </div>

      {/* Arc Log */}
      {arcLog.length > 0 && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Arc Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {arcLog.map((entry: any, i: number) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'baseline', gap: 10,
                padding: '5px 10px', borderRadius: 4,
                background: entry.event ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${entry.event ? 'rgba(251,191,36,0.15)' : T.border}`,
              }}>
                <span style={{ color: T.faint, fontSize: 9, fontFamily: MONO, minWidth: 36 }}>Arc {entry.arc}</span>
                {entry.event ? (
                  <span style={{ color: '#fbbf24', fontSize: 11, flex: 1 }}>{entry.message}</span>
                ) : (
                  <span style={{ color: T.muted, fontSize: 11, flex: 1 }}>
                    {entry.strategy} · effort {entry.total_effort} · GGS +{entry.ggs_gain} · momentum {entry.momentum >= 0 ? '+' : ''}{entry.momentum}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {msg && <div style={{ marginTop: 12, color: T.gold, fontSize: 12, fontFamily: MONO }}>{msg}</div>}
    </div>
  );
}

// ── Interest Group Panel ────────────────────────────────────────────────────────

const ENDORSEMENT_META: Record<string, { label: string; color: string; shareBonus: string }> = {
  none:        { label: 'No Relationship', color: 'rgba(255,255,255,0.18)', shareBonus: '' },
  sympathetic: { label: 'Sympathetic',     color: '#60a5fa',               shareBonus: '+3% segment' },
  endorsed:    { label: 'Endorsed',         color: '#34d399',               shareBonus: '+7% segment' },
  allied:      { label: 'Allied',           color: '#fbbf24',               shareBonus: '+14% segment' },
};

const IDEOLOGY_ICON: Record<string, string> = {
  labour:  '⚙',
  capital: '₿',
  civic:   '⚖',
  trade:   '⚓',
  neutral: '◈',
};

function InterestGroupPanel({ partyId, onRefresh }: { partyId: string; onRefresh: () => void }) {
  const [data, setData] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await politicsApi.getMyInterestGroups();
      setData(res.groups ?? []);
    } catch { setData([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function outreach(groupId: string) {
    setBusy(groupId + 'out');
    try {
      const res = await politicsApi.doOutreach(groupId);
      setMsg((res as any)?.message ?? 'Outreach complete.');
      await load(); onRefresh();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Outreach failed.');
    } finally { setBusy(null); }
  }

  async function rally(groupId: string) {
    setBusy(groupId + 'rally');
    try {
      const res = await politicsApi.doRallySupport(groupId);
      setMsg((res as any)?.message ?? 'Rally complete.');
      await load(); onRefresh();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Rally failed.');
    } finally { setBusy(null); }
  }

  if (!data) return null;

  const alliedCount = data.filter((g: any) => g.endorsement_status === 'allied').length;
  const endorsedCount = data.filter((g: any) => g.endorsement_status === 'endorsed').length;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(8,12,24,0.97) 0%, rgba(12,18,36,0.94) 100%)',
      border: `1px solid rgba(251,191,36,0.18)`,
      borderTop: `2px solid rgba(251,191,36,0.6)`,
      borderRadius: 8,
      padding: '12px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 11, background: '#fbbf24', borderRadius: 1, boxShadow: '0 0 6px #fbbf2450' }} />
          <span style={{ fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.22em', fontSize: 10, color: '#fbbf24' }}>Interest Groups</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {alliedCount > 0 && (
            <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
              {alliedCount} Allied
            </span>
          )}
          {endorsedCount > 0 && (
            <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399' }}>
              {endorsedCount} Endorsed
            </span>
          )}
        </div>
      </div>

      {data.length === 0 && (
        <div style={{ color: T.faint, fontSize: 13, fontStyle: 'italic' }}>No interest groups found. Groups seed on party founding.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((g: any) => {
          const em = ENDORSEMENT_META[g.endorsement_status] ?? ENDORSEMENT_META.none;
          const score = Math.round(Number(g.relationship_score));
          const isExpanded = expanded === g.group_id;
          const icon = IDEOLOGY_ICON[g.ideology_lean] ?? '◈';

          // Parse commitments
          const commitments: any[] = (() => {
            try {
              const raw = typeof g.active_commitments === 'string' ? JSON.parse(g.active_commitments) : (g.active_commitments ?? []);
              return raw.filter((c: any) => !c.honored_arc && !c.broken_arc);
            } catch { return []; }
          })();

          return (
            <div key={g.group_id} style={{
              background: isExpanded ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.25)',
              border: `1px solid ${em.color}25`,
              borderLeft: `3px solid ${em.color}`,
              borderRadius: 6,
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}>
              {/* Row header — always visible */}
              <div
                onClick={() => setExpanded(isExpanded ? null : g.group_id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer' }}>
                {/* Icon + name */}
                <div style={{ width: 32, height: 32, borderRadius: 6, background: `${em.color}12`, border: `1px solid ${em.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: em.color, flexShrink: 0 }}>
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ivory, fontSize: 12, fontFamily: SANS, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {g.group_name}
                  </div>
                  <div style={{ color: T.faint, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {g.segment_key.replace(/_/g, ' ')} · {g.ideology_lean}
                  </div>
                </div>
                {/* Score bar + tier */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 80, height: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${score}%`, height: '100%', background: `linear-gradient(90deg, ${em.color}60, ${em.color})`, transition: 'width 0.8s ease' }} />
                    </div>
                    <span style={{ color: em.color, fontSize: 11, fontFamily: MONO, fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{score}</span>
                  </div>
                  <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 8, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.06em', background: `${em.color}12`, border: `1px solid ${em.color}30`, color: em.color }}>
                    {em.label}
                  </span>
                </div>
                {/* Expand chevron */}
                <div style={{ color: T.faint, fontSize: 9, marginLeft: 4, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${em.color}15` }}>
                  {/* Share bonus */}
                  {em.shareBonus && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0 10px' }}>
                      <span style={{ color: T.faint, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase' }}>Endorsement bonus:</span>
                      <span style={{ color: em.color, fontSize: 10, fontFamily: MONO, fontWeight: 700 }}>{em.shareBonus}</span>
                      <span style={{ color: T.faint, fontSize: 9, fontFamily: MONO }}>· influence ×{Number(g.influence_weight).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Active commitments */}
                  {commitments.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ color: T.faint, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Active Commitments</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {commitments.map((c: any, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: 3 }}>
                            <span style={{ color: '#fbbf24', fontSize: 9, fontFamily: MONO }}>◆</span>
                            <span style={{ color: T.muted, fontSize: 10 }}>
                              {c.direction === 'raise' ? 'Raise' : 'Lower'} <strong style={{ color: T.ivory }}>{c.axis}</strong> to {c.target_value}+
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      disabled={!!busy}
                      onClick={() => outreach(g.group_id)}
                      style={{
                        padding: '6px 14px', borderRadius: 4,
                        background: `${em.color}10`, border: `1px solid ${em.color}40`,
                        color: em.color, fontSize: 9, fontFamily: MONO, letterSpacing: '0.08em',
                        textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer',
                        opacity: busy ? 0.5 : 1, transition: 'opacity 0.2s',
                      }}>
                      {busy === g.group_id + 'out' ? '…' : 'Outreach · 3 AP'}
                    </button>
                    <button
                      disabled={!!busy}
                      onClick={() => rally(g.group_id)}
                      style={{
                        padding: '6px 14px', borderRadius: 4,
                        background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)',
                        color: '#a78bfa', fontSize: 9, fontFamily: MONO, letterSpacing: '0.08em',
                        textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer',
                        opacity: busy ? 0.5 : 1, transition: 'opacity 0.2s',
                      }}>
                      {busy === g.group_id + 'rally' ? '…' : 'Rally · 2 PC'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {msg && <div style={{ marginTop: 12, color: T.gold, fontSize: 12, fontFamily: MONO }}>{msg}</div>}
    </div>
  );
}

// ── Media Landscape Panel ────────────────────────────────────────────────────

const STANCE_META: Record<string, { label: string; color: string; popEffect: string }> = {
  allied:     { label: 'Allied',      color: '#34d399', popEffect: 'Strongly positive coverage' },
  favourable: { label: 'Favourable',  color: '#86efac', popEffect: 'Mild positive coverage'    },
  neutral:    { label: 'Neutral',     color: 'rgba(255,255,255,0.35)', popEffect: 'Straight reporting' },
  sceptical:  { label: 'Sceptical',   color: '#fbbf24', popEffect: 'Questioning framing'       },
  hostile:    { label: 'Hostile',     color: '#f87171', popEffect: 'Adversarial coverage'      },
};

const OUTLET_TYPE_ICON: Record<string, string> = {
  newspaper: '📰',
  tv:        '📺',
  online:    '📱',
  tabloid:   '📣',
  radio:     '📡',
};

const BIAS_COLOR: Record<string, string> = {
  labour:   '#60a5fa',
  capital:  '#fbbf24',
  civic:    '#a78bfa',
  trade:    '#34d399',
  populist: '#f87171',
  neutral:  'rgba(255,255,255,0.3)',
};

function MediaPanel({ partyId, onRefresh }: { partyId: string; onRefresh: () => void }) {
  const [outlets, setOutlets] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await politicsApi.getMyMedia();
      setOutlets(res.outlets ?? []);
    } catch { setOutlets([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function exclusive(outletId: string) {
    setBusy(outletId + 'excl');
    try {
      const res = await politicsApi.doExclusive(outletId);
      setMsg((res as any)?.message ?? 'Exclusive granted.');
      await load(); onRefresh();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Action failed.');
    } finally { setBusy(null); }
  }

  async function pressConf() {
    setBusy('press');
    try {
      const res = await politicsApi.doPressConference();
      setMsg((res as any)?.message ?? 'Press conference held.');
      await load(); onRefresh();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Action failed.');
    } finally { setBusy(null); }
  }

  if (!outlets) return null;

  const alliedCount   = outlets.filter(o => o.coverage_stance === 'allied').length;
  const hostileCount  = outlets.filter(o => o.coverage_stance === 'hostile').length;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(8,12,24,0.97) 0%, rgba(12,18,36,0.94) 100%)',
      border: '1px solid rgba(134,239,172,0.15)',
      borderTop: '2px solid rgba(134,239,172,0.55)',
      borderRadius: 8,
      padding: '12px 16px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 11, background: '#86efac', borderRadius: 1, boxShadow: '0 0 6px #86efac40' }} />
          <span style={{ fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.22em', fontSize: 10, color: '#86efac' }}>Media Landscape</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {alliedCount > 0 && <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399' }}>{alliedCount} Allied</span>}
          {hostileCount > 0 && <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171' }}>{hostileCount} Hostile</span>}
          <button
            disabled={!!busy}
            onClick={pressConf}
            style={{ padding: '4px 10px', borderRadius: 4, background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.3)', color: '#86efac', fontSize: 9, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>
            {busy === 'press' ? '…' : 'Press Conf · 2 AP'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {outlets.map((o: any) => {
          const sm = STANCE_META[o.coverage_stance] ?? STANCE_META.neutral;
          const score = Math.round(Number(o.relationship_score));
          const isExp = expanded === o.outlet_id;
          const typeIcon = OUTLET_TYPE_ICON[o.outlet_type] ?? '📰';
          const biasColor = BIAS_COLOR[o.bias] ?? 'rgba(255,255,255,0.3)';

          return (
            <div key={o.outlet_id} style={{
              background: isExp ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.22)',
              border: `1px solid ${sm.color}20`,
              borderLeft: `3px solid ${sm.color}`,
              borderRadius: 6,
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}>
              <div onClick={() => setExpanded(isExp ? null : o.outlet_id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', cursor: 'pointer' }}>
                {/* Icon */}
                <div style={{ fontSize: 14, width: 28, textAlign: 'center', flexShrink: 0 }}>{typeIcon}</div>
                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ivory, fontSize: 12, fontFamily: SANS, fontWeight: 600 }}>{o.outlet_name}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <span style={{ color: biasColor, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase' }}>{o.bias}</span>
                    <span style={{ color: T.faint, fontSize: 9, fontFamily: MONO }}>cred {o.credibility}</span>
                    <span style={{ color: T.faint, fontSize: 9, fontFamily: MONO }}>reach {Math.round(Number(o.reach) * 100)}%</span>
                  </div>
                </div>
                {/* Score + stance */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 72, height: 3, background: 'rgba(0,0,0,0.5)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${score}%`, height: '100%', background: `linear-gradient(90deg, ${sm.color}50, ${sm.color})`, transition: 'width 0.8s ease' }} />
                    </div>
                    <span style={{ color: sm.color, fontSize: 10, fontFamily: MONO, fontWeight: 700 }}>{score}</span>
                  </div>
                  <span style={{ padding: '1px 5px', borderRadius: 2, fontSize: 8, fontFamily: MONO, textTransform: 'uppercase', background: `${sm.color}12`, border: `1px solid ${sm.color}30`, color: sm.color }}>{sm.label}</span>
                </div>
                <div style={{ color: T.faint, fontSize: 8, marginLeft: 3, transition: 'transform 0.2s', transform: isExp ? 'rotate(180deg)' : 'none' }}>▾</div>
              </div>

              {isExp && (
                <div style={{ padding: '0 13px 12px', borderTop: `1px solid ${sm.color}12` }}>
                  <div style={{ color: T.faint, fontSize: 10, fontFamily: MONO, margin: '8px 0 10px' }}>{sm.popEffect}</div>
                  <button
                    disabled={!!busy}
                    onClick={() => exclusive(o.outlet_id)}
                    style={{ padding: '5px 12px', borderRadius: 4, background: `${sm.color}0e`, border: `1px solid ${sm.color}35`, color: sm.color, fontSize: 9, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>
                    {busy === o.outlet_id + 'excl' ? '…' : 'Exclusive Interview · 3 AP'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {msg && <div style={{ marginTop: 12, color: '#86efac', fontSize: 11, fontFamily: MONO }}>{msg}</div>}
    </div>
  );
}

// ── News Feed Panel ────────────────────────────────────────────────────────────

const STORY_TYPE_LABEL: Record<string, string> = {
  scandal_eruption:    'SCANDAL',
  scandal_escalation:  'ESCALATION',
  scandal_resolved:    'CLEARED',
  campaign_event:      'CAMPAIGN',
  endorsement_gained:  'ENDORSEMENT',
  endorsement_lost:    'LOST',
  coalition_formed:    'COALITION',
  coalition_crisis:    'CRISIS',
  coalition_collapsed: 'COLLAPSE',
  legislation_passed:  'LEGISLATION',
  election_called:     'ELECTION',
  election_result:     'RESULT',
  policy_announcement: 'POLICY',
  interest_group_deal: 'IG DEAL',
};

const STORY_TYPE_COLOR: Record<string, string> = {
  scandal_eruption:    '#f87171',
  scandal_escalation:  '#fb923c',
  coalition_collapsed: '#f87171',
  coalition_crisis:    '#fbbf24',
  election_result:     '#a78bfa',
  election_called:     '#60a5fa',
  endorsement_gained:  '#34d399',
  endorsement_lost:    '#f87171',
  coalition_formed:    '#34d399',
  legislation_passed:  '#86efac',
  scandal_resolved:    '#34d399',
};

function NewsFeedPanel() {
  const [stories, setStories] = useState<any[] | null>(null);

  useEffect(() => {
    politicsApi.getNewsFeed().then(res => setStories(res.stories ?? [])).catch(() => setStories([]));
  }, []);

  if (!stories || stories.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(8,12,24,0.97) 0%, rgba(12,18,36,0.94) 100%)',
      border: '1px solid rgba(167,139,250,0.15)',
      borderTop: '2px solid rgba(167,139,250,0.5)',
      borderRadius: 8,
      padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 3, height: 11, background: '#a78bfa', borderRadius: 1, boxShadow: '0 0 6px #a78bfa40' }} />
        <span style={{ fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.22em', fontSize: 10, color: '#a78bfa' }}>News Feed</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stories.slice(0, 8).map((s: any) => {
          const typeColor = STORY_TYPE_COLOR[s.story_type] ?? 'rgba(255,255,255,0.25)';
          const typeLabel = STORY_TYPE_LABEL[s.story_type] ?? s.story_type.toUpperCase();
          const tone = Number(s.avg_tone);
          const popDelta = Number(s.popularity_delta);

          return (
            <div key={s.id} style={{
              padding: '11px 14px',
              background: 'rgba(0,0,0,0.28)',
              border: `1px solid ${typeColor}18`,
              borderLeft: `3px solid ${typeColor}`,
              borderRadius: 5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 8, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.06em', background: `${typeColor}15`, border: `1px solid ${typeColor}30`, color: typeColor }}>{typeLabel}</span>
                {s.party_abbr && <span style={{ color: T.faint, fontSize: 9, fontFamily: MONO }}>{s.party_abbr}</span>}
                <span style={{ color: T.faint, fontSize: 9, fontFamily: MONO, marginLeft: 'auto' }}>Arc {s.arc}</span>
                {popDelta !== 0 && (
                  <span style={{ fontSize: 9, fontFamily: MONO, fontWeight: 700, color: popDelta > 0 ? '#34d399' : '#f87171' }}>
                    {popDelta > 0 ? '+' : ''}{popDelta} pop
                  </span>
                )}
              </div>
              <div style={{ color: T.ivory, fontSize: 12, fontFamily: SANS, fontWeight: 600, marginBottom: 3 }}>{s.headline}</div>
              <div style={{ color: T.muted, fontSize: 11, lineHeight: 1.5 }}>{s.body}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PartyScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, character, parties, myAp, myPc, onRefresh }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const myParty = Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id) : undefined;

  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [creed, setCreed] = useState<CreedId | null>(null);
  const [tenet, setTenet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function spendPc(action: string, factionId?: string): Promise<any> {
    const res = await politicsApi.spendPc(action, factionId);
    await onRefresh();
    return res;
  }

  async function found() {
    if (!name.trim() || !creed) return;
    try {
      setBusy(true); setErr(null);
      await politicsApi.foundParty({ name: name.trim(), abbreviation: abbreviation.trim().toUpperCase(), doctrine_id: creed, tenet_id: tenet }, selectedJurisdictionId);
      await onRefresh();
    } catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Failed to found party'); }
    finally { setBusy(false); }
  }

  async function recruit() {
    try { setBusy(true); await politicsApi.recruitNpc(selectedJurisdictionId); await onRefresh(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Recruit failed'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: myParty ? 0 : 80 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />

      {isLocked ? (
        <Panel title="Locked"><div style={{ color: T.faint, fontStyle: 'italic' }}>{jurisdiction?.name || 'This state'} is not yet open for political activity.</div></Panel>
      ) : myParty ? (
        <>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(10,15,30,0.95) 100%)',
            border: `1px solid rgba(255,255,255,0.05)`,
            borderRadius: 10,
            padding: '14px 18px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 32px rgba(0,0,0,0.5)',
            position: 'relative', overflow: 'hidden', fontFamily: SANS
          }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none',
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, position: 'relative', zIndex: 1 }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ ...stampStyle, marginBottom: 8, color: T.gold, borderColor: 'rgba(255,215,0,0.3)', textShadow: `0 0 10px ${T.goldSoft}` }}>Your Party</div>
                <h1 style={{ color: T.ivory, fontSize: 20, fontWeight: 700, fontFamily: HEADING, margin: '0 0 4px', letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: `radial-gradient(circle at 30% 30%, ${T.gold}, #B8860B)`, boxShadow: `0 0 12px ${T.goldGlow}` }} />
                  {myParty.name}
                  {myParty.abbreviation && <span style={{ color: T.faint, fontSize: 22, fontFamily: MONO, textTransform: 'uppercase', fontWeight: 600 }}>[{myParty.abbreviation}]</span>}
                </h1>
                <div style={{ color: T.gold, fontFamily: MONO, fontSize: 13, marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.15em', textShadow: `0 0 10px ${T.goldSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>{CREED_NAME_BY_ID[(myParty.doctrine_id || myParty.doctrineId) as CreedId] || 'Independent'}</span>
                  {(myParty.tenet_id || myParty.tenetId) && TENETS[(myParty.doctrine_id || myParty.doctrineId) as CreedId]?.find(t => t.id === (myParty.tenet_id || myParty.tenetId)) && (
                    <>
                      <span style={{ color: T.border, fontSize: 16, fontWeight: 300 }}>/</span>
                      <span style={{ color: T.ivory, fontWeight: 600, letterSpacing: '0.1em' }}>
                        {TENETS[(myParty.doctrine_id || myParty.doctrineId) as CreedId]?.find(t => t.id === (myParty.tenet_id || myParty.tenetId))?.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Panel title={<><Flag size={14} /> Platform & Planks</>} accent={T.gold}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {PILLARS.map((p) => {
                const v = Number(myParty.platform?.[p.axis] ?? 50);
                const isKeystone = CREEDS[(myParty.doctrine_id || myParty.doctrineId) as CreedId]?.keystone === p.axis;
                return (
                  <div key={p.axis}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ color: isKeystone ? T.gold : T.text, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: isKeystone ? 600 : 400 }}>
                        {isKeystone && <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.gold, boxShadow: `0 0 8px ${T.goldSoft}` }} />}
                        {p.name}
                      </span>
                      <span style={{ color: isKeystone ? T.gold : T.faint, fontFamily: MONO, fontSize: 12, fontWeight: isKeystone ? 600 : 400 }}>{nearestRung(p.axis, v)}</span>
                    </div>
                    <div style={{ height: 6, background: T.panel2, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${v}%`, height: '100%', background: isKeystone ? T.gold : T.border }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ color: T.faint, fontSize: 10 }}>{p.low}</span>
                      <span style={{ color: T.faint, fontSize: 10 }}>{p.high}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Political Capital Resource Bar */}
          <div style={{
            ...glassPanelStyle,
            background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,15,60,0.8) 100%)',
            border: `1px solid rgba(139, 92, 246, 0.25)`,
            borderTop: `1px solid rgba(139, 92, 246, 0.5)`,
            boxShadow: '0 4px 24px rgba(139, 92, 246, 0.1)',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            {/* AP */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.faint }}>Action Points</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: myAp?.ap_cap ?? 12 }).map((_, i) => (
                  <div key={i} style={{ width: 8, height: 16, borderRadius: 2,
                    background: i < (myAp?.current_ap ?? 0) ? T.gold : 'rgba(255,255,255,0.06)',
                    boxShadow: i < (myAp?.current_ap ?? 0) ? `0 0 4px ${T.goldSoft}` : 'none',
                    transition: 'background 0.3s ease'
                  }} />
                ))}
              </div>
              <span style={{ color: T.gold, fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>{myAp?.current_ap ?? 0}</span>
            </div>

            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />

            {/* PC */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.faint }}>Political Capital</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: myPc?.pc_cap ?? 10 }).map((_, i) => (
                  <div key={i} style={{ width: 8, height: 16, borderRadius: 2,
                    background: i < (myPc?.current_pc ?? 0) ? '#a78bfa' : 'rgba(255,255,255,0.06)',
                    boxShadow: i < (myPc?.current_pc ?? 0) ? '0 0 4px rgba(167,139,250,0.5)' : 'none',
                    transition: 'background 0.3s ease'
                  }} />
                ))}
              </div>
              <span style={{ color: '#a78bfa', fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>{myPc?.current_pc ?? 0}</span>
              <span style={{ color: T.faint, fontFamily: MONO, fontSize: 10 }}>/ {myPc?.pc_cap ?? 10}</span>
            </div>

            <div style={{ marginLeft: 'auto', color: T.faint, fontSize: 10, fontFamily: MONO, maxWidth: 260, lineHeight: 1.5 }}>
              PC carries between arcs · Spend on high-stakes interventions in the Faction panel
            </div>
          </div>

          {/* Faction Panel */}
          <FactionPanel partyId={myParty.id} onSpendPc={spendPc} />

          {/* Scandal Management Panel */}
          <ScandalPanel onRefresh={onRefresh} />

          {/* Campaign Command HQ */}
          <CampaignPanel partyId={myParty.id} onRefresh={onRefresh} />

          {/* Interest Groups */}
          <InterestGroupPanel partyId={myParty.id} onRefresh={onRefresh} />

          {/* Media Landscape */}
          <MediaPanel partyId={myParty.id} onRefresh={onRefresh} />

          {/* News Feed */}
          <NewsFeedPanel />

          <Panel title="Roster" action={<Btn label={busy ? '…' : 'Recruit Candidate'} onClick={recruit} disabled={busy} />}>
            <div style={{ color: T.muted, fontSize: 14 }}>
              Bench: <span style={{ color: T.ivory, fontWeight: 600 }}>{myParty.member_count ?? myParty.members?.length ?? myParty.roster?.length ?? 0}</span> candidate(s).
              Recruiting pulls in an NPC loosely aligned to your platform.
            </div>
          </Panel>
          {err && <div style={{ color: T.red, fontSize: 13 }}>{err}</div>}
        </>
      ) : (
        <>
          <div style={{ fontFamily: SANS }}>
            <div style={{ ...stampStyle, textShadow: `0 0 10px ${T.goldSoft}` }}>Found a Party</div>
            <h1 style={{ color: T.ivory, fontSize: 20, fontWeight: 700, margin: '8px 0 0', letterSpacing: '-0.02em' }}>Stand for {jurisdiction?.name}</h1>
            <p style={{ color: T.muted, fontSize: 15, marginTop: 8, lineHeight: 1.6, maxWidth: 600 }}>Choose a Creed to set your identity. You are the permanent Leader — only NPC recruits can join your bench.</p>
          </div>

          <Panel title="Party Identity">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontFamily: SANS }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: creed ? `linear-gradient(135deg, ${T.gold}, #B8860B)` : 'rgba(255,255,255,0.03)', border: `1px solid ${creed ? T.goldLine : T.border}`, boxShadow: creed ? `0 4px 20px ${T.goldSoft}, inset 0 1px 0 rgba(255,255,255,0.3)` : 'inset 0 1px 0 rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: '800', color: creed ? '#111' : T.faint, transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' }}>
                {abbreviation.slice(0, 3) || '?'}
              </div>
              <div style={{ display: 'flex', gap: 16, flex: 1 }}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter party name—" maxLength={40}
                  style={{ flex: 1, padding: '14px 18px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${T.border}`, borderRadius: 6, color: T.ivory, fontSize: 15, outline: 'none', transition: 'border 0.2s', fontFamily: SANS }}
                  onFocus={(e) => e.target.style.borderColor = T.goldLine} onBlur={(e) => e.target.style.borderColor = T.border} />
                <input value={abbreviation} onChange={(e) => setAbbreviation(e.target.value.toUpperCase())} placeholder="ABBR" maxLength={6}
                  style={{ width: 140, padding: '14px 18px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${T.border}`, borderRadius: 6, color: T.ivory, fontSize: 15, outline: 'none', fontFamily: MONO, textTransform: 'uppercase', transition: 'border 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = T.goldLine} onBlur={(e) => e.target.style.borderColor = T.border} />
              </div>
            </div>
          </Panel>

          <div style={{ fontFamily: SANS, marginTop: 16 }}>
            <Stamp>Choose Your Creed</Stamp>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12 }}>
              {CREED_ORDER.map((id) => {
                const c = CREEDS[id]; const on = creed === id;
                const platform = CREED_PLATFORMS[id];
                
                return (
                  <button key={id} onClick={() => { setCreed(id); setTenet(null); }}
                    style={{ 
                      textAlign: 'left', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                      background: on ? T.blueDim : 'rgba(255,255,255,0.02)', 
                      border: `1px solid ${on ? T.blueLine : 'transparent'}`, 
                      borderLeft: `3px solid ${on ? T.blueBright : 'transparent'}`,
                      borderRadius: 6,
                      boxShadow: on ? `0 4px 20px ${T.blueGlow}` : 'none',
                      transition: 'all 0.15s ease',
                      fontFamily: SANS
                    }}
                    onMouseEnter={(e) => {
                      if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    }}
                  >
                    <div style={{ flex: '0 0 160px' }}>
                      <div style={{ color: on ? T.ivory : T.text, fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>{c.name}</div>
                      <div style={{ color: on ? T.blueBright : T.faint, fontFamily: MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4, fontWeight: 600 }}>{c.tagline}</div>
                    </div>
                    
                    <div style={{ color: T.faint, fontSize: 13, lineHeight: 1.4, flex: 1 }}>{c.blurb}</div>

                    {c.keystone && PILLAR_BY_AXIS[c.keystone] && (
                      <div style={{ flex: '0 0 100px' }}>
                        <div style={{ color: T.muted, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Keystone</div>
                        <div style={{ color: on ? T.blueBright : T.text, fontSize: 12, fontWeight: 600 }}>{PILLAR_BY_AXIS[c.keystone]?.name}</div>
                      </div>
                    )}
                    
                    <div style={{ flex: '0 0 200px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {PILLARS.map(p => {
                          const val = platform[p.axis];
                          if (val === 50) return null; // Only show defining stances
                          return (
                            <div key={p.axis} style={{ 
                              padding: '2px 6px', background: on ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.03)', 
                              border: `1px solid ${on ? T.blueLine : T.borderSoft}`, 
                              borderRadius: 4, fontSize: 9.5, fontFamily: MONO, 
                              color: on ? T.blueBright : T.muted,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              {nearestRung(p.axis, val)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {creed && (
            <Panel title="Choose a Tenet">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {TENETS[creed].map((tn) => {
                  const on = tenet === tn.id;
                  return (
                    <button key={tn.id} onClick={() => setTenet(on ? null : tn.id)}
                      style={{ textAlign: 'left', padding: 14, borderRadius: 4, cursor: 'pointer', background: on ? T.goldSoft : T.panel2, border: `1px solid ${on ? T.goldLine : T.border}`, transition: 'all 0.15s ease' }}>
                      <div style={{ color: on ? T.gold : T.ivory, fontWeight: 600, fontSize: 14 }}>{tn.name}</div>
                      <div style={{ color: T.faint, fontFamily: MONO, fontSize: 10.5, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tn.type}</div>
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* Sticky Summary Bar */}
          <div style={{ position: 'fixed', bottom: 0, left: 240 /* roughly sidebar width */, right: 0, background: 'rgba(8, 9, 12, 0.85)', borderTop: `1px solid ${T.border}`, boxShadow: `0 -10px 40px rgba(0,0,0,0.5)`, backdropFilter: 'blur(20px)', padding: '24px 96px 24px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50, fontFamily: SANS }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <div>
                <div style={stampStyle}>Founding Cost</div>
                <div style={{ color: T.red, fontFamily: MONO, fontSize: 18, fontWeight: 700, textShadow: `0 0 12px rgba(224, 82, 70, 0.4)`, marginTop: 4 }}>-$25,000</div>
              </div>
              <div style={{ width: 1, height: 40, background: T.border }} />
              <div>
                <div style={stampStyle}>Party Details</div>
                <div style={{ color: T.ivory, fontSize: 16, display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <span style={{ fontWeight: 600 }}>{name || 'Unnamed Party'}</span>
                  {abbreviation && <span style={{ color: T.faint, fontFamily: MONO, fontWeight: 600 }}>[{abbreviation}]</span>}
                  {creed && <span style={{ color: T.gold, fontSize: 14, fontWeight: 500, textShadow: `0 0 8px ${T.goldSoft}` }}>— {CREEDS[creed].name}</span>}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {err && <div style={{ color: T.red, fontSize: 14, fontWeight: 500 }}>{err}</div>}
              <Btn label={busy ? 'Founding\u2026' : 'Found Party'} primary onClick={found} disabled={busy || !name.trim() || !abbreviation.trim() || !creed} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
