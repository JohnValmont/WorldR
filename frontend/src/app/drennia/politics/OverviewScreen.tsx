'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { T, MONO, HEADING, crisisColor, crisisDim, trendProps, glassPanelStyle } from './_lib/theme';
import { JURISDICTION_MODEL } from './_lib/model';
import type { PoliticsSection } from './_components/PoliticsSidebar';
import { Stamp, StatTile } from './_components/DeskUI';
import { formatGameDateShort } from '@/lib/calendar';
import { AlertCircle, ChevronRight, Activity, CalendarDays, ShieldAlert, Zap } from 'lucide-react';

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
  return v >= 6.5 ? T.mint : v >= 4 ? T.warning : T.red;
}

// ── OLED Meter for Conditions ──────────────────────────────────────────────
function OledMeter({ value, label, tone }: { value: number, label: string, tone: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.faint }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: tone, textShadow: `0 0 8px ${tone}60` }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value * 10}%`, background: tone, transition: 'width 0.8s ease', boxShadow: `0 0 8px ${tone}` }} />
      </div>
    </div>
  );
}

// ── Support arc gauge ──────────────────────────────────────────────────────
function Gauge({ pct }: { pct: number | null }) {
  const r = 48, C = 2 * Math.PI * r, arc = C * 0.75;
  const v = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const gaugeColor = pct == null ? T.faint : pct >= 50 ? T.mint : pct >= 35 ? T.warning : T.red;
  return (
    <div style={{ position: 'relative', width: 130, height: 130 }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"
          strokeDasharray={`${arc} ${C}`} strokeLinecap="round" transform="rotate(135 65 65)" />
        {pct != null && (
          <circle cx="65" cy="65" r={r} fill="none" stroke={gaugeColor} strokeWidth="8"
            strokeDasharray={`${(arc * v) / 100} ${C}`} strokeLinecap="round"
            transform="rotate(135 65 65)" filter="url(#glow)" />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.faint }}>Support</div>
        <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: pct == null ? T.faint : T.ivory, lineHeight: 1, marginTop: 4, textShadow: pct == null ? 'none' : `0 0 12px ${gaugeColor}40` }}>
          {pct == null ? '—' : `${pct.toFixed(1)}%`}
        </div>
      </div>
    </div>
  );
}

// ── Mini sparkline bar ───────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) {
    return (
      <svg width="80" height="24" viewBox="0 0 80 24" style={{ opacity: 0.2 }}>
        <line x1="0" y1="12" x2="80" y2="12" stroke={T.faint} strokeWidth="1.5" strokeDasharray="2 4" />
      </svg>
    );
  }
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const w = 80, h = 24;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />
    </svg>
  );
}

// ── Glass Panel Component ──────────────────────────────────────────────────
function GlassPanel({ title, children, accent, flex }: { title: React.ReactNode, children: React.ReactNode, accent?: string, flex?: number }) {
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
      }}>
        {title}
      </div>
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// ── Recommended Action Item ───────────────────────────────────────────────
function ActionItem({ cost, label, onClick }: { cost: number; label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '12px 16px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
        background: hover ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${hover ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
        transition: 'all 0.2s ease', marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 6, background: 'rgba(255, 215, 0, 0.1)', color: T.gold, flexShrink: 0 }}>
        <Zap size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: HEADING, fontSize: 13, color: hover ? T.ivory : T.text, fontWeight: 500, transition: 'color 0.2s' }}>{label}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: T.gold, marginTop: 4 }}>Cost: {cost} AP</div>
      </div>
      <ChevronRight size={16} color={hover ? T.gold : T.faint} style={{ transition: 'all 0.2s', transform: hover ? 'translateX(2px)' : 'none' }} />
    </button>
  );
}

// ── Action button ──────────────────────────────────────────────────────────
function Btn({ label, onClick, primary, disabled }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button 
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ 
        padding: '10px 16px', borderRadius: 6, cursor: disabled ? 'default' : 'pointer', 
        fontSize: 12, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', 
        background: primary ? (hover ? '#3b82f6' : T.blue) : (hover ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'), 
        color: primary ? '#fff' : T.ivory, 
        border: `1px solid ${primary ? T.blueLine : 'rgba(255,255,255,0.1)'}`, 
        boxShadow: primary ? `0 0 16px ${T.blue}40` : 'none',
        opacity: disabled ? 0.45 : 1, transition: 'all 0.2s ease',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8
      }}
    >
      {label}
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
  const myParty = Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id) : undefined;
  const support: number | null = myParty ? (myParty.popularity ?? myParty.approval ?? myParty.projected_share ?? null) : null;

  const bills: any[] = Array.isArray(billData?.bills) ? billData.bills : [];
  const floorBill = bills.find((b: any) => {
    const s = String(b?.status || '').toLowerCase();
    return s.includes('floor') || s.includes('open') || s.includes('voting');
  }) || bills[0];
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
  const { arrow: trendArrow, color: trendColor } = trendProps(latestDelta);

  async function vote(id: string, v: 'yea' | 'nay') {
    try { setBusy(v); await politicsApi.voteBill(id, v); await onRefresh(); } catch { } finally { setBusy(null); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24 }}>

      {/* ── OLED HERO HEADER ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(10,15,30,0.95) 100%)',
        border: `1px solid rgba(255,255,255,0.05)`,
        borderRadius: 10,
        padding: '14px 18px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 32px rgba(0,0,0,0.5)',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative Grid Background */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none',
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <Stamp>{jMeta.name} — Command Center</Stamp>
            <h1 style={{ color: T.ivory, fontSize: 18, fontWeight: 700, fontFamily: "'Outfit', 'Lexend', system-ui", margin: '8px 0 4px', letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
              {myParty ? myParty.name : 'Political Desk'}
              {myParty?.abbreviation && <span style={{ color: T.faint, fontSize: 18, fontFamily: MONO, textTransform: 'uppercase', marginLeft: 12, fontWeight: 500 }}>[{myParty.abbreviation}]</span>}
            </h1>
            <div style={{ fontFamily: MONO, fontSize: 12, color: T.blueLine, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {myParty?.doctrine_id ? myParty.doctrine_id.replace(/_/g, ' ') : 'NO ACTIVE DOCTRINE'}
            </div>
            
            {/* Action Points Inline Display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
              <div style={{ padding: '6px 12px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={14} color={T.gold} />
                <span style={{ fontFamily: MONO, fontSize: 12, color: T.gold, fontWeight: 600 }}>{myAp?.current_ap ?? 0} / {myAp?.ap_cap ?? 12} AP</span>
              </div>
              <span style={{ color: T.faint, fontSize: 12 }}>Available Action Points</span>
            </div>
          </div>

          {/* OLED Metric Blocks */}
          <div style={{ display: 'flex', gap: 16 }}>
            {support != null && (
              <div style={{ 
                background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, 
                padding: '10px 14px', minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.faint, fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  <Activity size={12} /> Approval
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: T.ivory, textShadow: `0 0 16px ${trendColor}60` }}>
                    {support.toFixed(1)}<span style={{ fontSize: 16, color: T.muted }}>%</span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, width: '100%', justifyContent: 'center' }}>
                  <span style={{ color: trendColor, fontSize: 12, fontWeight: 700 }}>{trendArrow}</span>
                  <div style={{ width: 60 }}><Sparkline values={supportHistory} color={trendColor} /></div>
                </div>
              </div>
            )}
            
            {monthsToElection != null && (
              <div style={{ 
                background: monthsToElection <= 6 ? 'rgba(220,38,38,0.1)' : 'rgba(0,0,0,0.4)', 
                border: `1px solid ${monthsToElection <= 6 ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.08)'}`, 
                borderRadius: 12, padding: '10px 14px', minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: monthsToElection <= 6 ? T.red : T.faint, fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  <CalendarDays size={12} /> Election
                </div>
                <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: monthsToElection <= 6 ? T.red : T.warning, marginTop: 8, textShadow: monthsToElection <= 6 ? `0 0 16px ${T.red}60` : 'none' }}>
                  {monthsToElection <= 0 ? 'IMMINENT' : monthsToElection}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: monthsToElection <= 6 ? T.red : T.faint, marginTop: 4, letterSpacing: '0.05em' }}>
                  {monthsToElection === 1 ? 'MONTH' : 'MONTHS'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── NO PARTY CTA ── */}
      {!myParty && (
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(29,78,216,0.05) 100%)', 
          border: `1px solid ${T.blueLine}`, borderRadius: 12, padding: '24px 32px', 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
          boxShadow: `0 8px 32px rgba(37,99,235,0.1)`
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.blue, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
              <AlertCircle size={16} /> Action Required
            </div>
            <h2 style={{ color: T.ivory, fontSize: 20, margin: '0 0 8px', fontFamily: HEADING, fontWeight: 600 }}>Get Started: Found a Party</h2>
            <div style={{ color: T.faint, fontSize: 12, lineHeight: 1.6, maxWidth: 600 }}>
              You have no active political presence. Found a movement, choose your Creed, and stand for {jMeta.name}. Your Creed locks your ideological identity and unlocks a unique Signature action.
            </div>
          </div>
          <Btn label="Found a Party" primary onClick={() => onNavigate('party')} />
        </div>
      )}

      {/* ── SITUATION ROOM (Briefing + Conditions) ── */}
      <GlassPanel title="Situation Room" accent={T.warning}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          
          {/* Briefing List */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: T.faint, fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Morning Briefing</div>
            {briefingItems.map((item, i) => {
              const color = crisisColor(item.severity);
              const Icon = item.severity === 'critical' ? ShieldAlert : item.severity === 'warning' ? AlertCircle : Activity;
              return (
                <div key={i} style={{ 
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', 
                  background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: 8,
                  boxShadow: `0 4px 12px ${color}10`
                }}>
                  <Icon size={16} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: HEADING, fontSize: 14, fontWeight: 600, color: T.ivory, lineHeight: 1.3 }}>{item.title}</div>
                    {item.sub && <div style={{ fontFamily: MONO, fontSize: 11, color: T.muted, marginTop: 4 }}>{item.sub}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conditions Grid */}
          {hasConditions && (
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ color: T.faint, fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Jurisdiction Conditions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                {(['prosperity', 'jobs', 'order', 'cohesion', 'budget'] as const).map((key) => {
                  const v = typeof cond[key] === 'number' ? Number(cond[key]) : 5;
                  const label = key.charAt(0).toUpperCase() + key.slice(1);
                  return <OledMeter key={key} value={v} label={label} tone={condTone(v)} />;
                })}
              </div>
              <div style={{ color: T.faint, fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>These metrics move based on the governing party's policies and impact national stability.</div>
            </div>
          )}
          
          {/* National Stats Grid */}
          {overview?.activeState && (
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ color: T.faint, fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>National Statistics</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.faint }}>GDP</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: T.ivory }}>
                      CR {Number(overview.activeState.stat_gdp || 1000000).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.faint }}>Unemployment</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: T.ivory }}>
                      {Number(overview.activeState.stat_unemployment || 5).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.faint }}>Tax Revenue</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: T.ivory }}>
                      CR {Number(overview.activeState.stat_tax_revenue || 150000).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.faint }}>Per Capita</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: T.ivory }}>
                      CR {Number(overview.activeState.stat_per_capita || 45000).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.faint }}>Pollution</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: T.ivory }}>
                      {Number(overview.activeState.stat_pollution || 50).toFixed(1)}
                    </span>
                  </div>
                </div>

              </div>
              <div style={{ color: T.faint, fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>Macro-economic indicators defining national progress.</div>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* ── 3-COLUMN DASH ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        
        {/* Tactical Recommendations */}
        <GlassPanel title="Tactical Recommendations">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recommendations.map((rec, i) => (
              <ActionItem key={i} cost={rec.cost} label={rec.label} onClick={() => onNavigate(rec.section)} />
            ))}
          </div>
        </GlassPanel>

        {/* On The Floor */}
        <GlassPanel title="On The Floor" accent={floorBill ? T.blue : undefined}>
          {floorBill ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: T.ivory, fontWeight: 700, fontSize: 16, fontFamily: HEADING, lineHeight: 1.3 }}>{floorBill.title || floorBill.name || floorBill.type || 'Bill on the floor'}</div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: T.blueLine, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-block', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                  {floorBill.type || 'motion'} — {floorBill.status || 'open'}
                </div>
              </div>
              
              {(ayes != null || nays != null) && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, textTransform: 'uppercase' }}>Ayes</span>
                      <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: T.mint }}>{ayes ?? 0}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, textTransform: 'uppercase' }}>Nays</span>
                      <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: T.red }}>{nays ?? 0}</span>
                    </div>
                  </div>
                  {ayes != null && nays != null && (
                    <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: T.redDim, display: 'flex' }}>
                      <div style={{ height: '100%', width: `${(ayes / (ayes + nays || 1)) * 100}%`, background: T.mint, transition: 'width 0.8s ease', boxShadow: `0 0 8px ${T.mint}` }} />
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
                <div style={{ flex: 1 }}><Btn label="Aye" primary onClick={() => vote(floorBill.id, 'yea')} disabled={!!busy} /></div>
                <div style={{ flex: 1 }}><Btn label="Nay" onClick={() => vote(floorBill.id, 'nay')} disabled={!!busy} /></div>
              </div>
            </div>
          ) : (
            <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
              No bills on the floor. Propose one in the Legislature.
            </div>
          )}
        </GlassPanel>

        {/* Live Chronicle */}
        <GlassPanel title="Live Chronicle">
          {events.length === 0 ? (
            <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No recent activity logged.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: '-10px' }}>
              {events.slice(0, 5).map((e: any, i: number) => (
                <div key={e.id || i} style={{ 
                  padding: '12px 10px', 
                  borderBottom: i < Math.min(events.length - 1, 4) ? `1px solid rgba(255,255,255,0.05)` : 'none',
                  display: 'flex', flexDirection: 'column', gap: 4
                }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {e.arc != null ? formatGameDateShort(e.arc) : e.kind || ''}
                  </div>
                  <div style={{ color: T.text, fontSize: 13, lineHeight: 1.5 }}>
                    {e.headline || e.title || e.message || e.description || e.kind || 'Event'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

    </div>
  );
}
