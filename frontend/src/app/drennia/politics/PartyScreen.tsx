'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, SANS, HEADING, stampStyle, glassPanelStyle, interactiveCardStyle } from './_lib/theme';
import { CREEDS, CREED_ORDER, CREED_NAME_BY_ID, PILLARS, PILLAR_BY_AXIS, type CreedId, BLOC_NAME_BY_KEY } from './_lib/model';
import type { Axis } from '@/lib/politicsConstants';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Stamp, Meter } from './_components/DeskUI';
import PartyCreation, { type PartyState } from './_components/PartyCreation';
import { Shield, Target, Map, Building2, Coins, Activity, Flag, AlertCircle, Users, Zap, Crown, Flame } from 'lucide-react';
import { CRISES, CO_FOUNDERS, IDEOLOGY_AXES, POLICY_PILLARS } from './_lib/gameData';

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
  onNavigate?: (tab: any) => void;
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
      flex,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(15, 17, 26, 0.4)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: `1px solid rgba(255, 255, 255, 0.04)`,
      borderTop: accent ? `1px solid ${accent}50` : `1px solid rgba(255, 255, 255, 0.08)`,
      boxShadow: accent ? `0 8px 32px ${accent}15, inset 0 1px 0 rgba(255,255,255,0.05)` : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)',
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative'
    }}>
      {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.5 }} />}
      <div style={{ 
        padding: '14px 20px', 
        borderBottom: '1px solid rgba(255,255,255,0.03)', 
        fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', 
        color: accent || T.muted,
        background: 'rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{title}</div>
        {action}
      </div>
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', fontFamily: SANS }}>
        {children}
      </div>
    </div>
  );
}

function Btn({ label, onClick, primary, disabled }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="party-btn"
      style={{
        padding: '8px 16px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        fontSize: 11, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.12em', textTransform: 'uppercase',
        background: primary ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.05)',
        color: primary ? '#fde68a' : T.ivory,
        border: `1px solid ${primary ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255,255,255,0.1)'}`,
        boxShadow: primary ? `0 0 20px rgba(251, 191, 36, 0.1)` : 'none',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.background = primary ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255,255,255,0.1)';
          e.currentTarget.style.boxShadow = primary ? `0 4px 24px rgba(251, 191, 36, 0.2)` : '0 4px 12px rgba(0,0,0,0.2)';
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.background = primary ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.05)';
          e.currentTarget.style.boxShadow = primary ? `0 0 20px rgba(251, 191, 36, 0.1)` : 'none';
        }
      }}
    >
      {label}
    </button>
  );
}

function nearestRung(axis: string, value: number) {
  const p = PILLAR_BY_AXIS[axis as keyof typeof PILLAR_BY_AXIS];
  if (!p || !p.rungs?.length) return '';
  const safeVal = isNaN(value) ? 50 : value;
  let best = p.rungs[0];
  for (const r of p.rungs) if (Math.abs(r.value - safeVal) < Math.abs(best.value - safeVal)) best = r;
  return best.label;
}

/** Safely coerce a party object's doctrine_id from either camelCase or snake_case */
function getDoctrineId(party: any): CreedId | undefined {
  return (party?.doctrine_id || party?.doctrineId) as CreedId | undefined;
}

/** Safe-parse a platform field that Postgres may return as a JSON string or object */
function parsePlatform(raw: any): Record<string, number> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw as Record<string, number>;
}

function parseJsonArray(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
}

function parseJsonObject(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : {};
    } catch { return {}; }
  }
  return {};
}

// ── Faction Loyalty colours ──────────────────────────────────────────────────
function loyaltyTone(loyalty: number) {
  if (loyalty >= 60) return T.mint;
  if (loyalty >= 35) return T.gold;
  return T.red;
}

// ── Faction Panel ────────────────────────────────────────────────────────────
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
          <div style={{ height: 6, background: 'rgba(0,0,0,0.4)', borderRadius: 99 }}>
            <div style={{ width: `${cohesion ?? 0}%`, height: '100%', borderRadius: 99, background: cohesionTone, transition: 'width 0.8s ease', boxShadow: `0 0 8px ${cohesionTone}` }} />
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
              background: f.is_restless ? `rgba(224, 82, 70, 0.05)` : 'rgba(15, 17, 26, 0.5)',
              border: `1px solid ${f.is_restless ? 'rgba(224,82,70,0.25)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 12, padding: '14px 18px',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: f.is_restless ? '0 4px 12px rgba(224, 82, 70, 0.1)' : '0 4px 12px rgba(0,0,0,0.2)',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.border = `1px solid ${f.is_restless ? 'rgba(224,82,70,0.4)' : 'rgba(255,255,255,0.15)'}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.border = `1px solid ${f.is_restless ? 'rgba(224,82,70,0.25)' : 'rgba(255,255,255,0.06)'}`;
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {f.is_restless && <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.red, boxShadow: `0 0 6px ${T.red}` }} />}
                  <span style={{ color: f.is_restless ? T.red : T.ivory, fontWeight: 600, fontSize: 13 }}>{f.name}</span>
                  <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO }}>{share}% of party</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: tone, fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>{loyalty}%</span>
                  {f.is_restless && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={async () => {
                        try {
                          setBusy(f.id + 'pacify');
                          setMsg(null);
                          await politicsApi.doGeneralAction('statement');
                          setMsg(`Negotiated with ${f.name} faction. Morale improved.`);
                          await load();
                        } catch (e: any) {
                          setMsg(e?.response?.data?.error || e?.response?.data?.message || 'Failed to pacify');
                        } finally { setBusy(null); }
                      }} disabled={!!busy}
                        style={{
                          padding: '3px 8px', borderRadius: 3, cursor: busy ? 'not-allowed' : 'pointer',
                          background: 'rgba(251,191,36,0.1)', border: `1px solid rgba(251,191,36,0.3)`,
                          color: T.gold, fontSize: 9, fontFamily: MONO, letterSpacing: '0.08em',
                          textTransform: 'uppercase', opacity: busy ? 0.5 : 1,
                        }}>
                        {busy === f.id + 'pacify' ? '…' : '1 AP · Pacify'}
                      </button>
                      {onSpendPc && (
                        <button onClick={() => discipline(f.id)} disabled={!!busy}
                          style={{
                            padding: '3px 8px', borderRadius: 3, cursor: busy ? 'not-allowed' : 'pointer',
                            background: 'rgba(224,82,70,0.1)', border: `1px solid rgba(224,82,70,0.3)`,
                            color: T.red, fontSize: 9, fontFamily: MONO, letterSpacing: '0.08em',
                            textTransform: 'uppercase', opacity: busy ? 0.5 : 1,
                          }}>
                          {busy === f.id ? '…' : '3 PC · Discipline'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Loyalty bar */}
              <div style={{ height: 4, background: 'rgba(0,0,0,0.4)', borderRadius: 99 }}>
                <div style={{ width: `${loyalty}%`, height: '100%', borderRadius: 99, background: tone, transition: 'width 0.6s ease' }} />
              </div>
              {/* Demand */}
              {f.demand_payload && (() => {
                let payload = f.demand_payload;
                if (typeof payload === 'string') {
                  try { payload = JSON.parse(payload); } catch { return null; }
                }
                if (!payload || typeof payload !== 'object') return null;
                return (
                  <div style={{ marginTop: 6, color: T.faint, fontSize: 10, fontFamily: MONO }}>
                    {f.demand_type === 'policy_axis' && payload.axis && `Demands: ${String(payload.axis).charAt(0).toUpperCase() + String(payload.axis).slice(1)} ${payload.direction === 'raise' ? '▲' : '▼'}`}
                    {f.demand_type === 'ministry_seat' && payload.ministry && `Demands: ${String(payload.ministry)} ministry seat`}
                    {f.demand_type === 'leadership_change' && 'Demands: Leadership change'}
                    {f.demand_type === 'autonomy' && 'Demands: Internal voting autonomy'}
                  </div>
                );
              })()}
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
    try { const r = await politicsApi.getMyScandals(); setData(Array.isArray(r?.scandals) ? r.scandals : []); } catch { setData([]); }
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

  const scandalsList = Array.isArray(data) ? data : [];
  const count = scandalsList.length;

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

      {data !== null && scandalsList.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
          <span style={{ color: '#4ade80', fontSize: 12, fontFamily: MONO }}>✓</span>
          <span style={{ color: T.faint, fontSize: 13, fontStyle: 'italic' }}>No active scandals. Your record is clean.</span>
        </div>
      )}

      {data !== null && scandalsList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {scandalsList.map((s: any) => {
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

function CampaignPanel({ partyId, isLeader, onRefresh }: { partyId: string; isLeader: boolean; onRefresh: () => void }) {
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
      if (!Array.isArray(all)) return [];
      return all.filter((e: any) => e && (e.ggs_gain !== undefined || e.event)).slice(-6).reverse();
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
            Allocated ${Number(campaign.budget_allocated ?? 0).toLocaleString('en-US')}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, borderRadius: 3, padding: '3px 8px' }}>
            Spent ${Number(campaign.budget_spent ?? 0).toLocaleString('en-US')}
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
          <div style={{ height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 99 }}>
            <div style={{ width: `${ggs}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${meta.accentColor}80, ${meta.accentColor})`, boxShadow: `0 0 8px ${meta.accentColor}50`, transition: 'width 1s ease' }} />
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
          <div style={{ height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 99, position: 'relative' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.1)' }} />
            <div style={{
              position: 'absolute',
              left: momentum >= 0 ? '50%' : `${50 + (momentum / 20) * 50}%`,
              width: `${Math.abs(momentum / 20) * 50}%`,
              height: '100%',
              background: momentum >= 0 ? '#4ade80' : '#ef4444',
              borderRadius: 99,
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
                disabled={busy || isActive || !isLeader}
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

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, opacity: isLeader ? 1 : 0.5 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Allocate Budget</span>
        <input
          type="number"
          value={budgetInput}
          onChange={e => setBudgetInput(e.target.value)}
          placeholder={isLeader ? "Amount from treasury" : "Leader only"}
          disabled={!isLeader}
          style={{
            flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.4)',
            border: `1px solid ${T.border}`, borderRadius: 5,
            color: T.ivory, fontSize: 13, fontFamily: MONO, outline: 'none',
          }}
        />
        <button
          disabled={busy || !budgetInput || !isLeader}
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

function InterestGroupPanel({ partyId, isLeader, onRefresh }: { partyId: string; isLeader: boolean; onRefresh: () => void }) {
  const [data, setData] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [commitmentData, setCommitmentData] = useState<Record<string, { axis: string; direction: 'raise'|'lower'; target_value: number }>>({});

  const load = useCallback(async () => {
    try {
      const res = await politicsApi.getMyInterestGroups();
      setData(Array.isArray(res?.groups) ? res.groups : []);
    } catch { setData([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function outreach(groupId: string) {
    setBusy(groupId + 'out');
    try {
      const commitment = commitmentData[groupId];
      const res = await politicsApi.doOutreach(groupId, commitment);
      setMsg((res as any)?.message ?? 'Outreach complete.');
      setCommitmentData(prev => ({ ...prev, [groupId]: undefined as any }));
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

  if (!data || !Array.isArray(data)) return null;

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
          const allCommitments: any[] = (() => {
            try {
              return typeof g.active_commitments === 'string' ? JSON.parse(g.active_commitments) : (g.active_commitments ?? []);
            } catch { return []; }
          })();
          const activeCommitments = allCommitments.filter((c: any) => !c.honored_arc && !c.broken_arc);
          const pastCommitments = allCommitments.filter((c: any) => c.honored_arc || c.broken_arc).sort((a, b) => (b.honored_arc || b.broken_arc) - (a.honored_arc || a.broken_arc));

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
                  {activeCommitments.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ color: T.faint, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Active Commitments</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {activeCommitments.map((c: any, i: number) => (
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

                  {/* Past commitments */}
                  {pastCommitments.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ color: T.faint, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Past Commitments</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {pastCommitments.slice(0, 3).map((c: any, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px', background: c.honored_arc ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)', border: c.honored_arc ? '1px solid rgba(52,211,153,0.12)' : '1px solid rgba(248,113,113,0.12)', borderRadius: 3 }}>
                            <span style={{ color: c.honored_arc ? '#34d399' : '#f87171', fontSize: 9, fontFamily: MONO }}>{c.honored_arc ? '✓' : '✕'}</span>
                            <span style={{ color: T.muted, fontSize: 10 }}>
                              {c.direction === 'raise' ? 'Raise' : 'Lower'} <strong style={{ color: T.ivory }}>{c.axis}</strong> to {c.target_value} ({c.honored_arc ? `Honored Arc ${c.honored_arc}` : `Broken Arc ${c.broken_arc}`})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optional Commitment Selection */}
                  {isLeader && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, marginTop: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: T.faint, fontFamily: MONO, marginRight: 4 }}>Commitment (Opt):</span>
                      <select 
                        value={commitmentData[g.group_id]?.axis || ''}
                        onChange={e => setCommitmentData(prev => ({ ...prev, [g.group_id]: { ...prev[g.group_id] || { direction: 'raise', target_value: 50 }, axis: e.target.value } as any }))}
                        style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${T.border}`, color: T.ivory, fontSize: 10, fontFamily: MONO, borderRadius: 3, padding: '2px 4px' }}
                      >
                        <option value="">None</option>
                        {PILLARS.map(p => <option key={p.axis} value={p.axis}>{p.name}</option>)}
                      </select>
                      {commitmentData[g.group_id]?.axis && (
                        <>
                          <select
                            value={commitmentData[g.group_id]?.direction || 'raise'}
                            onChange={e => setCommitmentData(prev => ({ ...prev, [g.group_id]: { ...prev[g.group_id], direction: e.target.value as 'raise'|'lower' } as any }))}
                            style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${T.border}`, color: T.ivory, fontSize: 10, fontFamily: MONO, borderRadius: 3, padding: '2px 4px' }}
                          >
                            <option value="raise">Raise to</option>
                            <option value="lower">Lower to</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={commitmentData[g.group_id]?.target_value ?? 50}
                            onChange={e => setCommitmentData(prev => ({ ...prev, [g.group_id]: { ...prev[g.group_id], target_value: Number(e.target.value) } as any }))}
                            style={{ width: 45, background: 'rgba(0,0,0,0.5)', border: `1px solid ${T.border}`, color: T.ivory, fontSize: 10, fontFamily: MONO, borderRadius: 3, padding: '2px 4px' }}
                          />
                        </>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      disabled={!!busy || !isLeader}
                      onClick={() => outreach(g.group_id)}
                      style={{
                        padding: '6px 14px', borderRadius: 4,
                        background: `${em.color}10`, border: `1px solid ${em.color}40`,
                        color: em.color, fontSize: 9, fontFamily: MONO, letterSpacing: '0.08em',
                        textTransform: 'uppercase', cursor: (busy || !isLeader) ? 'not-allowed' : 'pointer',
                        opacity: (busy || !isLeader) ? 0.5 : 1, transition: 'opacity 0.2s',
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

function MediaPanel({ partyId, isLeader, onRefresh }: { partyId: string; isLeader: boolean; onRefresh: () => void }) {
  const [outlets, setOutlets] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await politicsApi.getMyMedia();
      setOutlets(Array.isArray(res?.outlets) ? res.outlets : []);
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

  if (!outlets || !Array.isArray(outlets)) return null;

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
                    disabled={!!busy || !isLeader}
                    onClick={() => exclusive(o.outlet_id)}
                    style={{ padding: '5px 12px', borderRadius: 4, background: `${sm.color}0e`, border: `1px solid ${sm.color}35`, color: sm.color, fontSize: 9, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: (busy || !isLeader) ? 'not-allowed' : 'pointer', opacity: (busy || !isLeader) ? 0.5 : 1 }}>
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
    politicsApi.getNewsFeed().then(res => setStories(Array.isArray(res?.stories) ? res.stories : [])).catch(() => setStories([]));
  }, []);

  if (!stories || !Array.isArray(stories) || stories.length === 0) return null;

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
          const typeColor = STORY_TYPE_COLOR[s.story_type || ''] ?? 'rgba(255,255,255,0.25)';
          const typeLabel = STORY_TYPE_LABEL[s.story_type || ''] ?? (s.story_type ? s.story_type.toUpperCase() : 'NEWS');
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

// ── All Parties Panel ─────────────────────────────────────────────────────────
// Shows every party visible in the current jurisdiction, with Join action for
// non-members. Polled from the parent's 30-second SWR so it stays live.
function AllPartiesPanel({
  parties,
  myPartyId,
  characterId,
  onJoin,
  joinBusy,
  joinErr,
}: {
  parties: any[];
  myPartyId: string | undefined;
  characterId: string | undefined;
  onJoin: (id: string) => void;
  joinBusy: string | null;
  joinErr: string | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Sort: NPC parties last, then by popularity desc
  const sorted = [...parties].sort((a, b) => {
    if (a.is_npc !== b.is_npc) return a.is_npc ? 1 : -1;
    return Number(b.popularity ?? 0) - Number(a.popularity ?? 0);
  });

  if (sorted.length === 0) {
    return (
      <div style={{ color: T.faint, fontSize: 13, padding: '12px 0', fontStyle: 'italic' }}>
        No parties exist in this jurisdiction yet. Be the first to found one.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map((p: any) => {
        const isMyParty = p.id === myPartyId;
        const color = p.identity?.color || p.colorHex || '#6C7A89';
        const pop = Number(p.popularity ?? 0);
        const members = Number(p.member_count ?? p.members?.length ?? 0);
        const treasury = p.treasury != null ? Number(p.treasury) : null;
        const seats = Number(p.seat_count ?? 0);
        const doctrine = CREED_NAME_BY_ID[(p.doctrine_id || p.doctrineId) as CreedId] || 'Independent';
        const isExp = expanded === p.id;
        const platform = parsePlatform(p.platform);

        return (
          <div key={p.id} style={{
            background: isMyParty ? `${color}10` : 'rgba(10,12,20,0.6)',
            border: `1px solid ${isMyParty ? color + '40' : 'rgba(255,255,255,0.06)'}`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 12,
            overflow: 'hidden',
            transition: 'all 0.2s ease',
          }}>
            {/* Header row — always visible */}
            <div
              onClick={() => setExpanded(isExp ? null : p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
              onMouseEnter={e => { if (!isExp) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {/* Colour dot */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: color, boxShadow: `0 0 12px ${color}60`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#000',
              }}>
                {p.abbreviation?.slice(0, 2) || p.name?.slice(0, 2)}
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: T.ivory, fontSize: 14, fontWeight: 700, fontFamily: SANS }}>{p.name}</span>
                  {p.abbreviation && (
                    <span style={{ color: T.muted, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase' }}>[{p.abbreviation}]</span>
                  )}
                  {isMyParty && (
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: `${color}25`, color, fontSize: 9, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', border: `1px solid ${color}50` }}>
                      Your Party
                    </span>
                  )}
                  {p.is_npc && (
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', color: T.faint, fontSize: 9, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', border: `1px solid rgba(255,255,255,0.08)` }}>
                      NPC
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 5, flexWrap: 'wrap' }}>
                  <span style={{ color: color, fontSize: 10, fontFamily: MONO, fontWeight: 600 }}>{doctrine}</span>
                  {p.slogan && <span style={{ color: T.faint, fontSize: 10, fontStyle: 'italic', fontFamily: SANS }}>&ldquo;{p.slogan}&rdquo;</span>}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: T.faint, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Members</div>
                  <div style={{ color: T.ivory, fontSize: 14, fontFamily: MONO, fontWeight: 700 }}>{members}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: T.faint, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Popularity</div>
                  <div style={{ color: pop >= 60 ? T.mint : pop >= 30 ? T.gold : T.muted, fontSize: 14, fontFamily: MONO, fontWeight: 700 }}>{pop}</div>
                </div>
                {seats > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: T.faint, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Seats</div>
                    <div style={{ color: T.blueBright, fontSize: 14, fontFamily: MONO, fontWeight: 700 }}>{seats}</div>
                  </div>
                )}
                {treasury != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: T.faint, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Treasury</div>
                    <div style={{ color: T.mint, fontSize: 13, fontFamily: MONO, fontWeight: 700 }}>${treasury.toLocaleString()}</div>
                  </div>
                )}
                {/* Join button — only for non-member players on player-owned parties when the character has no party */}
                {!myPartyId && !isMyParty && !p.is_npc && (
                  <button
                    disabled={joinBusy === p.id}
                    onClick={e => { e.stopPropagation(); onJoin(p.id); }}
                    style={{
                      padding: '7px 16px', borderRadius: 7, cursor: joinBusy === p.id ? 'not-allowed' : 'pointer',
                      background: `${color}18`, border: `1px solid ${color}50`,
                      color, fontSize: 10, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase',
                      fontWeight: 700, opacity: joinBusy === p.id ? 0.5 : 1,
                      transition: 'all 0.15s ease', flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${color}30`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${color}18`; }}
                  >
                    {joinBusy === p.id ? '…' : 'Join'}
                  </button>
                )}
                {/* Expand chevron */}
                <div style={{ color: T.faint, fontSize: 10, transition: 'transform 0.2s', transform: isExp ? 'rotate(180deg)' : 'none', marginLeft: 2 }}>▾</div>
              </div>
            </div>

            {/* Expanded detail — platform bars */}
            {isExp && (
              <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${color}15` }}>
                {/* Ideology axes or platform bars */}
                {Object.keys(platform).length > 0 ? (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ color: T.faint, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Platform</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {PILLARS.map(pillar => {
                        const val = isNaN(Number(platform[pillar.axis])) ? 50 : Number(platform[pillar.axis] ?? 50);
                        return (
                          <div key={pillar.axis}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ color: T.muted, fontSize: 11 }}>{pillar.name}</span>
                              <span style={{ color: color, fontSize: 10, fontFamily: MONO }}>{nearestRung(pillar.axis, val)}</span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(0,0,0,0.4)', borderRadius: 99 }}>
                              <div style={{ width: `${val}%`, height: '100%', borderRadius: 99, background: color, opacity: 0.7 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: T.faint, fontSize: 12, marginTop: 12, fontStyle: 'italic' }}>No platform data available.</div>
                )}

                {/* Members roster */}
                {p.members && p.members.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: T.faint, fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Roster</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {p.members.map((m: any) => (
                        <div key={m.id} style={{
                          padding: '4px 10px', borderRadius: 6,
                          background: m.role === 'leader' ? `${color}18` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${m.role === 'leader' ? color + '40' : 'rgba(255,255,255,0.07)'}`,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          {m.role === 'leader' && <Crown size={10} style={{ color }} />}
                          <span style={{ color: m.role === 'leader' ? color : T.muted, fontSize: 11, fontFamily: SANS, fontWeight: m.role === 'leader' ? 700 : 400 }}>
                            {m.name}
                          </span>
                          {m.is_npc === false && (
                            <span style={{ padding: '1px 5px', background: 'rgba(99,179,237,0.15)', border: '1px solid rgba(99,179,237,0.3)', color: '#63b3ed', fontSize: 8, fontFamily: MONO, textTransform: 'uppercase', borderRadius: 3 }}>
                              Player
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {joinErr && <div style={{ color: T.red, fontSize: 12, fontFamily: MONO, marginTop: 4 }}>{joinErr}</div>}
    </div>
  );
}

export default function PartyScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, overview, character, parties, myAp, myPc, onRefresh, onNavigate }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const globalPartyId = overview?.globalParty?.id;
  const myParty = (Array.isArray(parties) && globalPartyId 
    ? parties.find((p: any) => p.id === globalPartyId) 
    : undefined) || overview?.globalParty;
  const isLeader = myParty && character && myParty.leader_character_id === character.id;

  const [isEditingPlatform, setIsEditingPlatform] = useState(false);
  const [platformEdits, setPlatformEdits] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [cmdTab, setCmdTab] = useState<'organising'|'comms'|'strategy'|'power'|'signature'>('organising');

  // Join party state (for the AllPartiesPanel — only active when character has no party)
  const [joinBusy, setJoinBusy] = useState<string | null>(null);
  const [joinErr, setJoinErr] = useState<string | null>(null);

  async function handleJoinParty(partyId: string) {
    setJoinBusy(partyId); setJoinErr(null);
    try {
      await politicsApi.joinParty(partyId);
      await onRefresh();
    } catch (e: any) {
      setJoinErr(e?.response?.data?.message || e?.response?.data?.error || 'Failed to join party');
    } finally { setJoinBusy(null); }
  }

  async function spendPc(action: string, factionId?: string): Promise<any> {
    const res = await politicsApi.spendPc(action, factionId);
    await onRefresh();
    return res;
  }

  async function donate() {
    if (donationAmount <= 0) return;
    setBusy(true); setErr(null);
    try {
      await politicsApi.donateToParty(myParty.id, donationAmount);
      setDonationAmount(0);
      await onRefresh();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to donate');
    } finally { setBusy(false); }
  }

  const [fundraiseResult, setFundraiseResult] = useState<any>(null);

  async function fundraise() {
    setBusy(true); setErr(null); setFundraiseResult(null);
    try {
      const res = await politicsApi.doGeneralAction('fundraise');
      // Show rich result card from new backend payload
      if ((res as any)?.fundraise) {
        setFundraiseResult((res as any).fundraise);
      } else {
        setErr((res as any)?.message ?? 'Fundraiser complete.');
      }
      await onRefresh();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Fundraiser failed');
    } finally { setBusy(false); }
  }

  async function transferLeadership(targetId: string) {
    if (!window.confirm("Are you sure you want to transfer leadership? This cannot be undone.")) return;
    setBusy(true); setErr(null);
    try {
      const res = await politicsApi.transferLeadership(myParty.id, targetId);
      setErr((res as any)?.message ?? 'Leadership transferred.');
      await onRefresh();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to transfer leadership');
    } finally { setBusy(false); }
  }

  async function dissolveParty() {
    if (!window.confirm("Are you sure you want to dissolve the party? This permanently deletes the party and cannot be undone.")) return;
    setBusy(true); setErr(null);
    try {
      const res = await politicsApi.dissolveParty(myParty.id);
      setErr((res as any)?.message ?? 'Party dissolved.');
      await onRefresh();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to dissolve party');
    } finally { setBusy(false); }
  }

  async function savePlatformEdits() {
    setBusy(true); setErr(null);
    try {
      await politicsApi.updatePlatform(myParty.id, platformEdits);
      setIsEditingPlatform(false);
      setPlatformEdits(null);
      await onRefresh();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to update platform');
    } finally { setBusy(false); }
  }

  async function found(partyState: PartyState) {
    if (!partyState.name.trim() || !partyState.abbreviation.trim()) return;
    setBusy(true); setErr(null);
    try {
      // Option A mapping: We use the economy axis to pick a creed so the API succeeds
      const e = partyState.ideologyAxes.economy || 0;
      let doctrine_id: CreedId = 'the_compact';
      let tenet_id = 'compact_populists';
      
      if (e < -30) {
        doctrine_id = 'the_commons';
        tenet_id = 'commons_vanguard';
      } else if (e > 30) {
        doctrine_id = 'the_ledger';
        tenet_id = 'ledger_expansionists';
      }

      await politicsApi.foundParty({ 
        name: partyState.name.trim(), 
        abbreviation: partyState.abbreviation.trim().toUpperCase(), 
        doctrine_id, 
        tenet_id,
        slogan: partyState.slogan,
        colorHex: partyState.colorHex,
        crisis: partyState.crisis,
        ideologyAxes: partyState.ideologyAxes,
        policies: partyState.policies,
        founders: partyState.founders
      }, selectedJurisdictionId);
      await onRefresh();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Failed to found party';
      setErr(msg);
      window.alert('Could not found party: ' + msg);
    } finally { setBusy(false); }
  }

  async function recruit() {
    try { setBusy(true); await politicsApi.recruitNpc(selectedJurisdictionId); await onRefresh(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Recruit failed'); }
    finally { setBusy(false); }
  }

  async function pressConfGlobal() {
    try { setBusy(true); await politicsApi.doPressConference(); await onRefresh(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Action failed.'); }
    finally { setBusy(false); }
  }

  async function doAction(type: string) {
    setBusy(true); setErr(null);
    try { const res = await politicsApi.doGeneralAction(type); setErr((res as any)?.message ?? 'Done.'); await onRefresh(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Action failed.'); }
    finally { setBusy(false); }
  }

  async function doMedia(type: 'press_conference' | 'interview') {
    setBusy(true); setErr(null);
    try {
      const res = type === 'press_conference'
        ? await politicsApi.doPressConference()
        : await politicsApi.doExclusiveInterview();
      setErr((res as any)?.message ?? 'Done.'); await onRefresh();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Action failed.'); }
    finally { setBusy(false); }
  }

  async function doPc(action: string) {
    setBusy(true); setErr(null);
    try { const res = await politicsApi.spendPc(action); setErr((res as any)?.message ?? 'Done.'); await onRefresh(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Action failed.'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: myParty ? 0 : 80 }}>

      {isLocked ? (
        <Panel title="Locked"><div style={{ color: T.faint, fontStyle: 'italic' }}>{jurisdiction?.name || 'This state'} is not yet open for political activity.</div></Panel>
      ) : myParty ? (
        <>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            background: `radial-gradient(ellipse at top right, ${myParty.identity?.color ? myParty.identity.color + '20' : 'rgba(255,215,0,0.15)'} 0%, rgba(10,12,18,0.95) 70%)`,
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 16,
            padding: '24px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 24px 48px rgba(0,0,0,0.6)',
            position: 'relative', overflow: 'hidden', fontFamily: SANS,
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'
          }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.3, pointerEvents: 'none',
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, position: 'relative', zIndex: 1 }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ padding: '4px 10px', borderRadius: 4, background: myParty.identity?.color ? myParty.identity.color + '20' : 'rgba(255,215,0,0.2)', color: myParty.identity?.color || T.gold, fontSize: 10, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', border: `1px solid ${myParty.identity?.color ? myParty.identity.color + '40' : 'rgba(255,215,0,0.4)'}` }}>
                    Your Party
                  </div>
                </div>
                <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 800, fontFamily: HEADING, margin: '0 0 4px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ 
                    width: 20, 
                    height: 20, 
                    borderRadius: '50%', 
                    background: myParty.identity?.color || T.gold, 
                    boxShadow: `0 0 24px ${myParty.identity?.color ? myParty.identity.color + '90' : T.goldGlow}` 
                  }} />
                  {myParty.name}
                  {myParty.abbreviation && <span style={{ color: T.muted, fontSize: 24, fontFamily: MONO, textTransform: 'uppercase', fontWeight: 600 }}>[{myParty.abbreviation}]</span>}
                </h1>
                {(myParty.slogan || myParty.identity?.motto) && (
                  <div style={{ color: T.faint, fontSize: 14, fontStyle: 'italic', marginTop: 4, marginBottom: 8, fontFamily: SANS }}>
                    "{myParty.slogan || myParty.identity?.motto}"
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  <span style={{ color: myParty.identity?.color || T.gold, fontFamily: MONO, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    {CREED_NAME_BY_ID[getDoctrineId(myParty)!] || 'Independent'}
                  </span>
                  {(myParty.tenet_id || myParty.tenetId) && TENETS[getDoctrineId(myParty)!]?.find(t => t.id === (myParty.tenet_id || myParty.tenetId)) && (
                    <>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                      <span style={{ color: T.ivory, fontSize: 12, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {TENETS[getDoctrineId(myParty)!]?.find(t => t.id === (myParty.tenet_id || myParty.tenetId))?.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{ flexBasis: '100%' }} />

              <div style={{ flex: 1, minWidth: 280, marginTop: 16, padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: 12, border: `1px solid rgba(255,255,255,0.06)`, backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ color: T.muted, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Party Treasury</span>
                  <span style={{ color: T.ivory, fontSize: 28, fontWeight: 700, fontFamily: MONO, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                    $ {Number(myParty.treasury || 0).toLocaleString('en-US')}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 24, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: T.muted, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Current Seats</span>
                  <span style={{ color: T.blueBright, fontSize: 28, fontWeight: 700, fontFamily: MONO, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                    {Number(myParty.seat_count || 0)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 16 }}>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      placeholder="Amount" 
                      value={donationAmount || ''} 
                      onChange={(e) => setDonationAmount(Number(e.target.value.replace(/,/g, '')))}
                      style={{ 
                        width: 140, padding: '10px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.6)', 
                        border: `1px solid rgba(255,255,255,0.1)`, color: T.ivory, fontFamily: MONO, fontSize: 14,
                        transition: 'border 0.2s', outline: 'none'
                      }} 
                      onFocus={e => e.currentTarget.style.border = `1px solid ${myParty.identity?.color || T.gold}`}
                      onBlur={e => e.currentTarget.style.border = `1px solid rgba(255,255,255,0.1)`}
                    />
                    <Btn label={busy ? "..." : "Donate"} onClick={donate} disabled={busy || donationAmount <= 0} primary />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Fundraiser Result Card ── */}
          {fundraiseResult && (() => {
            const fr = fundraiseResult;
            const outcomeColors: Record<string, string> = {
              critical: '#fbbf24', success: '#34d399', weak: '#94a3b8', flop: '#f97316', disaster: '#ef4444'
            };
            const outcomeIcons: Record<string, string> = {
              critical: '🎉', success: '✓', weak: '↘', flop: '─', disaster: '⚠'
            };
            const col = outcomeColors[fr.outcome] ?? '#94a3b8';
            return (
              <div style={{ background: `linear-gradient(135deg, ${col}12, rgba(15,17,26,0.95))`, border: `1px solid ${col}40`, borderLeft: `3px solid ${col}`, borderRadius: 12, padding: '20px 24px', position: 'relative' }}>
                <button onClick={() => setFundraiseResult(null)} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 22 }}>{outcomeIcons[fr.outcome]}</span>
                  <div>
                    <div style={{ color: col, fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Fundraiser — {fr.outcome.toUpperCase()}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: SANS, marginTop: 2, fontStyle: 'italic' }}>{fr.narrative}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Raised</div>
                    <div style={{ color: fr.gain >= 0 ? col : '#ef4444', fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>{fr.gain >= 0 ? '+' : ''}${Math.abs(fr.gain).toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Treasury</div>
                    <div style={{ color: 'rgba(255,255,255,0.8)', fontFamily: MONO, fontSize: 14, fontWeight: 600 }}>${fr.newTreasury.toLocaleString()}</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: MONO }}>was ${fr.oldTreasury.toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Conditions</div>
                    <div style={{ color: fr.fatigueMult < 60 ? '#f97316' : '#94a3b8', fontSize: 10, fontFamily: MONO }}>{fr.fatigueMult < 60 ? `⚡ Donor fatigue (${fr.fatigueMult}%)` : '✓ Fresh pool'}</div>
                    <div style={{ color: fr.competitors > 0 ? '#f97316' : '#94a3b8', fontSize: 10, fontFamily: MONO }}>{fr.competitors > 0 ? `⚔ ${fr.competitors} rival${fr.competitors > 1 ? 's' : ''} competing` : '✓ No competition'}</div>
                  </div>
                </div>
                {fr.autoScandal && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 12px', color: '#fca5a5', fontSize: 12, fontFamily: MONO }}>⚠ Scandal generated — check Scandals tab</div>}
              </div>
            );
          })()}

          {/* ── Command Hub ── */}
          {(() => {
            const tabStyle = (active: boolean): React.CSSProperties => ({
              padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700,
              fontFamily: MONO, letterSpacing: '0.12em', textTransform: 'uppercase',
              background: active ? 'rgba(251,191,36,0.15)' : 'transparent',
              color: active ? '#fde68a' : 'rgba(255,255,255,0.35)',
              border: active ? '1px solid rgba(251,191,36,0.35)' : '1px solid transparent',
              transition: 'all 0.15s ease',
            });
            const ActionBtn = ({ label, apCost, pcCost, desc, onClick: h, disabled: dis }: { label: string; apCost?: number; pcCost?: number; desc: string; onClick: () => void; disabled?: boolean }) => {
              const apOk = apCost == null || (myAp?.current_ap ?? 0) >= apCost;
              const pcOk = pcCost == null || (myPc?.current_pc ?? 0) >= pcCost;
              const canAct = apOk && pcOk && !busy && !dis;
              const accent = apCost ? '#fbbf24' : '#a78bfa';
              return (
                <div
                  onClick={canAct ? h : undefined}
                  title={desc}
                  style={{
                    padding: '12px 16px', borderRadius: 10, cursor: canAct ? 'pointer' : 'not-allowed',
                    background: canAct ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                    border: `1px solid ${canAct ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
                    opacity: canAct ? 1 : 0.45, transition: 'all 0.15s ease',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}
                  onMouseEnter={e => { if (canAct) { e.currentTarget.style.background = `${accent}15`; e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                  onMouseLeave={e => { if (canAct) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: canAct ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, fontFamily: SANS }}>{label}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {apCost != null && <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontFamily: MONO, background: apOk ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)', color: apOk ? '#fbbf24' : '#ef4444', border: `1px solid ${apOk ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)'}` }}>{apCost} AP</span>}
                      {pcCost != null && <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontFamily: MONO, background: pcOk ? 'rgba(167,139,250,0.15)' : 'rgba(239,68,68,0.15)', color: pcOk ? '#a78bfa' : '#ef4444', border: `1px solid ${pcOk ? 'rgba(167,139,250,0.3)' : 'rgba(239,68,68,0.3)'}` }}>{pcCost} PC</span>}
                    </div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: SANS, lineHeight: 1.4 }}>{desc}</span>
                </div>
              );
            };

            const sigAction = myParty?.doctrine_id ? ({
              forge_accord: 'union_address', the_ledger: 'investor_roadshow', the_homestead: 'town_hall',
              the_commons: 'shop_floor_tour', the_vanguard: 'listening_tour', the_compact: 'coalition_outreach',
              the_syndicate: 'shop_floor_tour', the_directory: 'investor_roadshow',
            } as Record<string, string>)[myParty.doctrine_id] : null;
            const sigLabel = sigAction ? sigAction.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : null;

            return (
              <div style={{ background: 'rgba(10,12,20,0.8)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', overflow: 'hidden' }}>
                {/* Tab bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', flexWrap: 'wrap' }}>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: MONO, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginRight: 8 }}>Commands</span>
                  {(['organising', 'comms', 'strategy', 'power', ...(sigAction ? ['signature'] : [])] as const).map(tab => (
                    <button key={tab} style={tabStyle(cmdTab === tab)} onClick={() => setCmdTab(tab as any)}>
                      {tab === 'organising' ? '⚙ Organising' : tab === 'comms' ? '📡 Comms' : tab === 'strategy' ? '🎯 Strategy' : tab === 'power' ? '⚡ Power Plays' : `✦ ${sigLabel}`}
                    </button>
                  ))}
                  <div style={{ flexGrow: 1 }} />
                  {isLeader && (
                    <button onClick={dissolveParty} disabled={!!busy} style={{ padding: '6px 14px', borderRadius: 6, cursor: 'pointer', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 10, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.18)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}>
                      Dissolve Party
                    </button>
                  )}
                  {!isLeader && (
                    <button onClick={async () => { if (window.confirm('Leave this party?')) { setBusy(true); try { await politicsApi.leaveParty(myParty.id); await onRefresh(); } catch (e: any) { setErr(e?.response?.data?.message || 'Failed'); } finally { setBusy(false); } } }} style={{ padding: '6px 14px', borderRadius: 6, cursor: 'pointer', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 10, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Leave Party</button>
                  )}
                </div>

                {/* Tab content */}
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                  {cmdTab === 'organising' && (<>
                    <ActionBtn label="Hold Fundraiser" apCost={1} desc="Draw from national donor pool. Outcome varies — charisma and competition determine your share." onClick={fundraise} />
                    <ActionBtn label="Recruit Candidate" apCost={1} desc="Pay $5,000 to attract an NPC candidate to your party roster." onClick={recruit} />
                    <ActionBtn label="Issue Statement" apCost={1} desc="Public statement. Improves popularity by 1." onClick={() => doAction('statement')} />
                  </>)}
                  {cmdTab === 'comms' && (<>
                    <ActionBtn label="Press Conference" apCost={1} desc="Increase media warmth with all press outlets. Boosts party reach this arc." onClick={pressConfGlobal} />
                    <ActionBtn label="Exclusive Interview" apCost={2} desc="Deeper media engagement — bigger warmth gain with your top outlet." onClick={async () => { setBusy(true); setErr(null); try { const res = await politicsApi.doExclusiveInterview(); setErr((res as any)?.message ?? 'Done.'); await onRefresh(); } catch (e: any) { setErr(e?.response?.data?.message || 'Failed.'); } finally { setBusy(false); } }} />
                    <ActionBtn label="Coalition Outreach" apCost={2} desc="Cross-party dialogue. Improves coalition formation odds." onClick={() => doAction('negotiate')} />
                    <ActionBtn label="Endorse Candidate" apCost={2} desc="Boosts a candidate's campaign reach this arc." onClick={() => doAction('endorsement')} />
                  </>)}
                  {cmdTab === 'strategy' && (<>
                    <ActionBtn label="Edit Platform" desc="Adjust your five policy axes. Changes feed into voter alignment." onClick={() => { setIsEditingPlatform(true); setPlatformEdits(parsePlatform(myParty.platform)); }} />
                    <ActionBtn label="Scout Rival" apCost={2} desc="File a scouting report. Rivals' platform positions become visible." onClick={() => doAction('scout')} />
                    <ActionBtn label="Suppress Scandal" pcCost={4} desc="Bury a rumour-phase scandal before it reaches the press." onClick={async () => { setBusy(true); setErr(null); try { const res = await politicsApi.spendPc('suppress_scandal'); setErr((res as any)?.message ?? 'Done.'); await onRefresh(); } catch (e: any) { setErr(e?.response?.data?.message || 'Failed.'); } finally { setBusy(false); } }} />
                  </>)}
                  {cmdTab === 'power' && (<>
                    <ActionBtn label="Discipline Faction" pcCost={3} desc="Spend 3 PC to snap a restless faction back into line." onClick={async () => { setBusy(true); setErr(null); try { const res = await politicsApi.spendPc('discipline_faction'); setErr((res as any)?.message ?? 'Done.'); await onRefresh(); } catch (e: any) { setErr(e?.response?.data?.message || 'Failed.'); } finally { setBusy(false); } }} />
                    <ActionBtn label="Rally the Base" pcCost={2} desc="Emergency rally. Restores loyalty across all factions." onClick={async () => { setBusy(true); setErr(null); try { const res = await politicsApi.spendPc('rally_base'); setErr((res as any)?.message ?? 'Done.'); await onRefresh(); } catch (e: any) { setErr(e?.response?.data?.message || 'Failed.'); } finally { setBusy(false); } }} />
                    <ActionBtn label="Negotiate Strength" pcCost={2} desc="Enter coalition talks with leverage." onClick={async () => { setBusy(true); setErr(null); try { const res = await politicsApi.spendPc('negotiate_strength'); setErr((res as any)?.message ?? 'Done.'); await onRefresh(); } catch (e: any) { setErr(e?.response?.data?.message || 'Failed.'); } finally { setBusy(false); } }} />
                    <ActionBtn label="Emergency Decree" pcCost={6} desc="Premier only: bypass the legislature once." onClick={async () => { setBusy(true); setErr(null); try { const res = await politicsApi.spendPc('emergency_decree'); setErr((res as any)?.message ?? 'Done.'); await onRefresh(); } catch (e: any) { setErr(e?.response?.data?.message || 'Failed.'); } finally { setBusy(false); } }} disabled={!myParty?.isPremier} />
                  </>)}
                  {cmdTab === 'signature' && sigAction && (<>
                    <ActionBtn label={sigLabel!} apCost={6} desc={`Your doctrine's signature action. High AP cost, powerful unique effect.`} onClick={() => doAction(sigAction)} />
                  </>)}
                </div>

                {/* AP/PC resource bar */}
                <div style={{ display: 'flex', gap: 20, padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AP</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {Array.from({ length: myAp?.ap_cap ?? 12 }).map((_, i) => (
                        <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: i < (myAp?.current_ap ?? 0) ? '#fbbf24' : 'rgba(255,255,255,0.08)', transition: 'background 0.2s', boxShadow: i < (myAp?.current_ap ?? 0) ? '0 0 4px rgba(251,191,36,0.5)' : 'none' }} />
                      ))}
                    </div>
                    <span style={{ color: '#fbbf24', fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>{myAp?.current_ap ?? 0}/{myAp?.ap_cap ?? 12}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>PC</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {Array.from({ length: myPc?.pc_cap ?? 10 }).map((_, i) => (
                        <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: i < (myPc?.current_pc ?? 0) ? '#a78bfa' : 'rgba(255,255,255,0.08)', transition: 'background 0.2s', boxShadow: i < (myPc?.current_pc ?? 0) ? '0 0 4px rgba(167,139,250,0.5)' : 'none' }} />
                      ))}
                    </div>
                    <span style={{ color: '#a78bfa', fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>{myPc?.current_pc ?? 0}/{myPc?.pc_cap ?? 10}</span>
                  </div>
                </div>
              </div>
            );
          })()}



          {/* Founding Principles (if rich data is present) */}
          {(myParty.crisis_id || (myParty.founders && myParty.founders.length > 0)) && (
            <Panel title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Flame size={14} /> Founding Spark</span>} accent={T.gold}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                {myParty.crisis_id && CRISES.find(c => c.id === myParty.crisis_id) && (() => {
                  const c = CRISES.find(cr => cr.id === myParty.crisis_id)!;
                  return (
                    <div style={{ flex: 1, minWidth: 250 }}>
                      <div style={{ color: T.faint, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.1em' }}>The Catalyst</div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 24 }}>{c.icon}</div>
                        <div>
                          <div style={{ color: T.ivory, fontSize: 14, fontWeight: 600, fontFamily: SANS, marginBottom: 4 }}>{c.headline}</div>
                          <div style={{ color: T.muted, fontSize: 12, fontStyle: 'italic', lineHeight: 1.4 }}>"{c.subtext}"</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {(() => {
                  const founders = parseJsonArray(myParty.founders);
                  if (founders.length === 0) return null;
                  return (
                    <div style={{ flex: 1, minWidth: 250 }}>
                      <div style={{ color: T.faint, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.1em' }}>Core Founders</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {founders.map((fid: string) => {
                        const f = CO_FOUNDERS.find(cf => cf.id === fid);
                        if (!f) return null;
                        return (
                          <div key={fid} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: `1px solid ${f.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 10, color: f.accent }}>
                              {f.portrait}
                            </div>
                            <div>
                              <div style={{ color: T.ivory, fontSize: 13, fontWeight: 600, fontFamily: SANS }}>{f.name}</div>
                              <div style={{ color: T.faint, fontSize: 11, fontFamily: SANS }}>{f.title}</div>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </Panel>
          )}

          <Panel title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Flag size={14} /> Platform & Planks</span>
              {isLeader && isEditingPlatform && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button 
                    onClick={() => { setIsEditingPlatform(false); setPlatformEdits(null); }}
                    style={{ background: 'transparent', border: `1px solid ${T.faint}`, color: T.faint, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontFamily: MONO, textTransform: 'uppercase' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={savePlatformEdits}
                    disabled={busy}
                    style={{ background: T.gold, border: 'none', color: '#000', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', fontWeight: 'bold' }}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          } accent={T.gold}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Legacy Pillars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ color: T.faint, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Legacy Alignment</div>
                {PILLARS.map((p) => {
                  const _platform = parsePlatform(myParty.platform);
                  const baseValue = isNaN(Number(_platform[p.axis])) ? 50 : Number(_platform[p.axis] ?? 50);
                  const v = isEditingPlatform && platformEdits ? (platformEdits[p.axis] ?? baseValue) : baseValue;
                  const isKeystone = CREEDS[getDoctrineId(myParty)!]?.keystone === p.axis;
                  return (
                    <div key={p.axis}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ color: isKeystone ? T.gold : T.text, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: isKeystone ? 600 : 400 }}>
                          {isKeystone && <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.gold, boxShadow: `0 0 8px ${T.goldSoft}` }} />}
                          {p.name}
                        </span>
                        <span style={{ color: isKeystone ? T.gold : T.faint, fontFamily: MONO, fontSize: 12, fontWeight: isKeystone ? 600 : 400 }}>{nearestRung(p.axis, v)}</span>
                      </div>
                      {isEditingPlatform ? (
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={v}
                          onChange={(e) => setPlatformEdits({ ...platformEdits, [p.axis]: Number(e.target.value) })}
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                      ) : (
                        <div style={{ height: 6, background: T.panel2, borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${v}%`, height: '100%', background: isKeystone ? T.gold : T.border }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                        <span style={{ color: T.faint, fontSize: 10 }}>{p.low}</span>
                        <span style={{ color: T.faint, fontSize: 10 }}>{p.high}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modern Ideology Axes (Rich Data) */}
              {(() => {
                const axes = parseJsonObject(myParty.ideology_axes);
                if (Object.keys(axes).length === 0) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: T.faint, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Ideological Axes</div>
                    {IDEOLOGY_AXES.map((axis) => {
                      const val = axes[axis.id] || 0;
                      return (
                        <div key={axis.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ color: T.ivory, fontSize: 13, fontFamily: SANS, fontWeight: 600 }}>{axis.label}</span>
                            <span style={{ color: axis.color, fontFamily: MONO, fontSize: 12, fontWeight: 600 }}>
                              {val > 0 ? `+${val}` : val}
                            </span>
                          </div>
                          <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 99, position: 'relative', display: 'flex', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.5)' }}>
                            {/* Center tick */}
                            <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
                            <div style={{ width: '50%', height: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                              {val < 0 && <div style={{ width: `${Math.abs(val)}%`, height: '100%', background: `linear-gradient(90deg, transparent, ${axis.color})`, borderRadius: '99px 0 0 99px', boxShadow: `0 0 10px ${axis.color}80` }} />}
                            </div>
                            <div style={{ width: '50%', height: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                              {val > 0 && <div style={{ width: `${val}%`, height: '100%', background: `linear-gradient(90deg, ${axis.color}, transparent)`, borderRadius: '0 99px 99px 0', boxShadow: `0 0 10px ${axis.color}80` }} />}
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <span style={{ color: T.faint, fontSize: 10 }}>{axis.left}</span>
                            <span style={{ color: T.faint, fontSize: 10 }}>{axis.right}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Manifesto Policies (Rich Data) */}
              {(() => {
                const policies = parseJsonObject(myParty.manifesto_policies);
                if (Object.keys(policies).length === 0) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: T.faint, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Manifesto Policies</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                      {Object.entries(policies).map(([pillarId, stanceId]) => {
                        const pillar = POLICY_PILLARS.find(p => p.id === pillarId);
                        const stance = pillar?.stances.find(s => s.id === stanceId);
                        if (!pillar || !stance) return null;
                        return (
                          <div key={pillarId} 
                            style={{ 
                              background: 'rgba(15,17,26,0.6)', 
                              padding: 16, 
                              borderRadius: 12, 
                              border: '1px solid rgba(255,255,255,0.06)',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              display: 'flex', flexDirection: 'column', gap: 6
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
                              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)';
                            }}
                          >
                            <div style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', marginBottom: 2 }}>{pillar.label}</div>
                            <div style={{ color: T.ivory, fontSize: 14, fontWeight: 700, fontFamily: SANS, marginBottom: 2 }}>{stance.label}</div>
                            <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5 }}>{stance.desc}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </Panel>

          {/* Political Capital Resource Bar */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,15,60,0.95) 100%)',
            border: `1px solid rgba(139, 92, 246, 0.25)`,
            borderTop: `1px solid rgba(139, 92, 246, 0.5)`,
            boxShadow: '0 12px 32px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
            borderRadius: 16,
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            padding: '16px 20px',
          }}>
            {/* AP */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.faint }}>Action Points</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: Math.max(0, Math.min(50, Number(myAp?.ap_cap) || 12)) }).map((_, i) => (
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
                {Array.from({ length: Math.max(0, Math.min(50, Number(myPc?.pc_cap) || 10)) }).map((_, i) => (
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
          <CampaignPanel partyId={myParty.id} isLeader={!!isLeader} onRefresh={onRefresh} />

          {/* Interest Groups */}
          <InterestGroupPanel partyId={myParty.id} isLeader={!!isLeader} onRefresh={onRefresh} />

          {/* Media Landscape */}
          <MediaPanel partyId={myParty.id} isLeader={!!isLeader} onRefresh={onRefresh} />

          {/* News Feed */}
          <NewsFeedPanel />

          {/* ── All Parties in Jurisdiction ─────────────────────────────────── */}
          {Array.isArray(parties) && parties.length > 1 && (
            <Panel
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={13} />
                  <span>All Parties in Jurisdiction</span>
                  <span style={{ padding: '1px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', color: T.muted, fontSize: 10, fontFamily: MONO }}>
                    {parties.length}
                  </span>
                </div>
              }
            >
              <AllPartiesPanel
                parties={parties}
                myPartyId={myParty?.id}
                characterId={character?.id}
                onJoin={handleJoinParty}
                joinBusy={joinBusy}
                joinErr={joinErr}
              />
            </Panel>
          )}

          <Panel title="Roster">
            <div style={{ color: T.muted, fontSize: 14, marginBottom: 16 }}>
              Bench: <span style={{ color: T.ivory, fontWeight: 600 }}>{myParty.members?.length ?? myParty.member_count ?? 0}</span> candidate(s).
              Recruiting pulls in an NPC loosely aligned to your platform.
            </div>
            
            {myParty.members && myParty.members.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {myParty.members.map((m: any) => (
                  <div key={m.id} style={{
                    padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${T.border}`, borderRadius: 8,
                    display: 'flex', flexDirection: 'column', gap: 6
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ color: T.ivory, fontWeight: 600, fontSize: 15 }}>{m.name}</span>
                      {m.role === 'leader' && <span style={{ background: `${T.goldSoft}30`, color: T.gold, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase' }}>Leader</span>}
                    </div>
                    <div style={{ color: T.muted, fontSize: 12, display: 'flex', gap: 12, marginTop: 4 }}>
                      <span>Econ: {m.ideology_score_economic ?? 50}</span>
                      <span>Social: {m.ideology_score_social ?? 50}</span>
                    </div>
                    <div style={{ color: T.faint, fontSize: 11, display: 'flex', gap: 12 }}>
                      <span>Cred: {m.credibility ?? 0}</span>
                      <span>Inf: {m.influence ?? 0}</span>
                    </div>
                    {isLeader && m.role !== 'leader' && (
                      <button 
                        onClick={() => transferLeadership(m.id)}
                        disabled={busy}
                        style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(201,162,74,0.1)', border: `1px solid rgba(201,162,74,0.3)`, color: T.gold, fontSize: 10, borderRadius: 4, cursor: 'pointer', fontFamily: MONO, textTransform: 'uppercase' }}
                      >
                        Make Leader
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>


          {err && <div style={{ color: T.red, fontSize: 13, marginTop: 12 }}>{err}</div>}
        </>
      ) : overview?.globalParty ? (
        <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
          <div style={{ padding: '24px 32px', background: 'rgba(0,0,0,0.4)', borderRadius: 12, border: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: SANS }}>
              <div style={{ ...stampStyle, textShadow: `0 0 10px ${T.goldSoft}` }}>Restricted Action</div>
              <h1 style={{ color: T.ivory, fontSize: 20, fontWeight: 700, margin: '8px 0 0', letterSpacing: '-0.02em' }}>Already in a Party</h1>
              <p style={{ color: T.muted, fontSize: 15, marginTop: 8, lineHeight: 1.6, maxWidth: 600 }}>
                You are already a member of <strong>{overview.globalParty.name}</strong>. A politician can only be active in one state's politics at a time.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Show all existing parties so an unaffiliated player can browse + join */}
          {Array.isArray(parties) && parties.length > 0 && (
            <Panel
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={13} />
                  <span>Active Parties — Join or Found Your Own</span>
                  <span style={{ padding: '1px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', color: T.muted, fontSize: 10, fontFamily: MONO }}>
                    {parties.length}
                  </span>
                </div>
              }
            >
              <div style={{ color: T.faint, fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
                Browse existing parties and click <strong style={{ color: T.ivory }}>Join</strong> to enlist under a leader, or scroll down to found your own.
              </div>
              <AllPartiesPanel
                parties={parties}
                myPartyId={undefined}
                characterId={character?.id}
                onJoin={handleJoinParty}
                joinBusy={joinBusy}
                joinErr={joinErr}
              />
            </Panel>
          )}
          <PartyCreation 
            onComplete={found} 
            initialLeaderName={character?.name || ''} 
            onCancel={onNavigate ? () => onNavigate('overview') : undefined}
          />
        </>
      )}
    </div>
  );
}
