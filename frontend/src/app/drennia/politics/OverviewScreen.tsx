'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { T, MONO, HEADING, crisisColor, crisisDim, trendProps } from './_lib/theme';
import { JURISDICTION_MODEL } from './_lib/model';
import type { PoliticsSection } from './_components/PoliticsSidebar';
import { Panel, Stamp, Meter, StatTile } from './_components/DeskUI';
import { formatGameDateShort } from '@/lib/calendar';

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
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <circle cx="65" cy="65" r={r} fill="none" stroke={T.border} strokeWidth="9"
          strokeDasharray={`${arc} ${C}`} strokeLinecap="round" transform="rotate(135 65 65)" />
        <circle cx="65" cy="65" r={r} fill="none" stroke={gaugeColor} strokeWidth="9"
          strokeDasharray={`${(arc * v) / 100} ${C}`} strokeLinecap="round"
          transform="rotate(135 65 65)" filter="url(#glow)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.faint }}>Support</div>
        <div style={{ fontFamily: MONO, fontSize: 24, fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: pct == null ? T.faint : T.ivory, lineHeight: 1, marginTop: 3 }}>
          {pct == null ? '—' : `${pct.toFixed(1)}%`}
        </div>
      </div>
    </div>
  );
}

// ── Mini sparkline bar (last 6 data points) ───────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const w = 80, h = 24;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Crisis row item ───────────────────────────────────────────────────────
function CrisisRow({ severity, title, sub }: { severity: 'critical' | 'warning' | 'info'; title: string; sub?: string }) {
  const color = crisisColor(severity);
  const dim   = crisisDim(severity);
  const icons = { critical: '⬤', warning: '◆', info: '●' };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', background: dim, border: `1px solid ${color}40`, borderRadius: 8, marginBottom: 6 }}>
      <span style={{ color, fontSize: 10, marginTop: 3, flexShrink: 0 }}>{icons[severity]}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: HEADING, fontSize: 13, fontWeight: 600, color: T.ivory, lineHeight: 1.3 }}>{title}</div>
        {sub && <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Recommended action chip ───────────────────────────────────────────────
function RecommendedAction({ cost, label, onClick }: { cost: number; label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
        background: hover ? T.panel2 : 'transparent',
        border: `1px solid ${hover ? T.blueLine : T.border}`,
        transition: 'all 0.2s ease', marginBottom: 4,
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: T.gold, background: T.goldSoft, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
        ⚡ {cost} AP
      </span>
      <span style={{ fontFamily: HEADING, fontSize: 13, color: T.text, fontWeight: 500, flex: 1 }}>{label}</span>
      <span style={{ color: T.faint, fontSize: 10 }}>→</span>
    </button>
  );
}

// ── Action button ──────────────────────────────────────────────────────────
function Btn({ label, onClick, primary, disabled }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '9px 14px', borderRadius: 6, cursor: disabled ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', background: primary ? T.blue : T.panel2, color: primary ? '#fff' : T.text, border: `1px solid ${primary ? T.blue : T.border}`, opacity: disabled ? 0.45 : 1, transition: 'all 0.2s ease' }}>
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
  const ayes = floorBill?.ayes ?? floorBill?.votes_for;
  const nays = floorBill?.nays ?? floorBill?.votes_against;

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

  async function vote(id: string, v: 'aye' | 'nay') {
    try { setBusy(v); await politicsApi.voteBill(id, v); await onRefresh(); } catch { } finally { setBusy(null); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '8px 0' }}>
        <div>
          <Stamp>{jMeta.name} — Command Center</Stamp>
          <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 800, fontFamily: "'Lexend', system-ui", margin: '10px 0 0', letterSpacing: '-0.02em' }}>
            {myParty ? myParty.name : 'Political Desk'}
            {myParty?.abbreviation && <span style={{ color: T.faint, fontSize: 18, fontFamily: MONO, textTransform: 'uppercase', marginLeft: 10 }}>[{myParty.abbreviation}]</span>}
          </h1>
          {myParty?.doctrine_id && <div style={{ fontFamily: MONO, fontSize: 11, color: T.faint, marginTop: 4, letterSpacing: '0.08em' }}>{myParty.doctrine_id.replace(/_/g, ' ').toUpperCase()}</div>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Approval trend chip */}
          {support != null && (
            <div style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.faint }}>Approval</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: T.ivory }}>{support.toFixed(1)}%</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ color: trendColor, fontSize: 11, lineHeight: 1 }}>{trendArrow}</span>
                  <Sparkline values={supportHistory} color={trendColor} />
                </div>
              </div>
            </div>
          )}
          {monthsToElection != null && (
            <div style={{ background: T.panel2, border: `1px solid ${monthsToElection <= 6 ? T.red + '80' : T.border}`, borderRadius: 10, padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.faint }}>Election</div>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: monthsToElection <= 6 ? T.red : T.warning, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                {monthsToElection <= 0 ? 'IMMINENT' : `${monthsToElection} mo`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── No party CTA ── */}
      {!myParty && (
        <div style={{ background: T.blueDim, border: `1px solid ${T.blueLine}`, borderRadius: 10, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <Stamp>Get Started</Stamp>
            <div style={{ color: T.text, fontSize: 14, lineHeight: 1.6, marginTop: 10, maxWidth: 540, fontFamily: "'Source Sans 3', system-ui" }}>
              You have no party. Found a movement, choose your Creed, and stand for {jMeta.name}. Your Creed locks your ideological identity and unlocks a unique Signature action.
            </div>
          </div>
          <Btn label="Found a Party" primary onClick={() => onNavigate('party')} />
        </div>
      )}

      {/* ── 2-column: Morning Briefing + Recommended Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Morning Briefing / Crisis Radar */}
        <Panel title="Morning Briefing">
          {briefingItems.map((item, i) => (
            <CrisisRow key={i} severity={item.severity} title={item.title} sub={item.sub} />
          ))}
        </Panel>

        {/* Recommended Actions */}
        <Panel title="Recommended Actions">
          <div style={{ color: T.faint, fontFamily: MONO, fontSize: 10.5, marginBottom: 12, letterSpacing: '0.06em' }}>
            Actions cost Action Points (AP). You gain {myAp?.ap_cap ?? 12} AP per month.
          </div>
          {recommendations.map((rec, i) => (
            <RecommendedAction key={i} cost={rec.cost} label={rec.label} onClick={() => onNavigate(rec.section)} />
          ))}
        </Panel>
      </div>

      {/* ── Jurisdiction Conditions strip ── */}
      {hasConditions && (
        <Panel title="Jurisdiction Conditions" accent>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            {(['prosperity', 'jobs', 'order', 'cohesion', 'budget'] as const).map((key) => {
              const v   = typeof cond[key] === 'number' ? Number(cond[key]) : 5;
              const label = key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.faint }}>{label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: condTone(v), fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(1)}</span>
                  </div>
                  <Meter value={v * 10} tone={condTone(v)} height={7} />
                </div>
              );
            })}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: T.faint, marginTop: 12, letterSpacing: '0.06em' }}>
            0–10 scale — moved by the governing party's active policy each month — feeds bloc turnout and crisis events
          </div>
        </Panel>
      )}

      {/* ── 3-column: Standing | On the Floor | Chronicle ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.2fr) minmax(200px, 1.4fr) minmax(200px, 1.4fr)', gap: 16 }}>

        {/* Standing */}
        <Panel title="Standing">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Gauge pct={support} />
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <StatTile label="Action Points" value={myAp?.current_ap ?? 0} sub={`of ${myAp?.ap_cap ?? 12} — renews monthly`} tone={T.gold} />
              <StatTile label="Seats Target" value={jMeta.seats} sub={`${jMeta.majority} for majority`} tone={T.ivory} />
            </div>
            {!myParty && <Btn label="Found a Party" primary onClick={() => onNavigate('party')} />}
          </div>
        </Panel>

        {/* On the Floor */}
        <Panel title="On the Floor" action={<Btn label="Legislature →" onClick={() => onNavigate('legislature')} />}>
          {floorBill ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ color: T.ivory, fontWeight: 700, fontSize: 14, fontFamily: "'Lexend', system-ui" }}>{floorBill.title || floorBill.name || floorBill.type || 'Bill on the floor'}</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{floorBill.type || 'motion'} — {floorBill.status || 'open'}</div>
              </div>
              {(ayes != null || nays != null) && (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    {ayes != null && <StatTile label="Ayes" value={ayes} tone={T.mint} />}
                    {nays != null && <StatTile label="Nays" value={nays} tone={T.red} />}
                  </div>
                  {ayes != null && nays != null && (
                    <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: T.redDim }}>
                      <div style={{ height: '100%', width: `${(ayes / (ayes + nays)) * 100}%`, background: T.mint, transition: 'width 0.8s ease', boxShadow: `0 0 8px ${T.mint}` }} />
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn label="Aye" primary onClick={() => vote(floorBill.id, 'aye')} disabled={!!busy} />
                <Btn label="Nay" onClick={() => vote(floorBill.id, 'nay')} disabled={!!busy} />
              </div>
            </div>
          ) : (
            <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 13 }}>No bills on the floor. Propose one in the Legislature — it's open at any time.</div>
          )}
        </Panel>

        {/* Chronicle */}
        <Panel title="Chronicle">
          {events.length === 0 ? (
            <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 13 }}>No recent activity. Actions, bills and governing events appear here as they resolve.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {events.slice(0, 6).map((e: any, i: number) => (
                <div key={e.id || i} style={{ borderBottom: i < Math.min(events.length - 1, 5) ? `1px solid ${T.borderSoft}` : 'none', paddingBottom: 10 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>
                    {e.arc != null ? formatGameDateShort(e.arc) : e.kind || ''}
                  </div>
                  <div style={{ color: T.text, fontSize: 13, lineHeight: 1.45 }}>
                    {e.headline || e.title || e.message || e.description || e.kind || 'Event'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Recommended Move footer ── */}
      <Panel title="Strategic Guidance">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ color: T.muted, fontSize: 13.5, lineHeight: 1.6, flex: 1, minWidth: 240, fontFamily: "'Source Sans 3', system-ui" }}>
            {myParty
              ? 'Read the electorate, then campaign where no rival stands — owning open ground beats crowding a popular bloc.'
              : 'Your first move: found a party and pick the Creed that matches how you want to govern.'}
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <Btn label={myParty ? 'Electorate →' : 'Found a Party'} primary onClick={() => onNavigate(myParty ? 'elections' : 'party')} />
            <Btn label="Party →" onClick={() => onNavigate('party')} />
          </div>
        </div>
      </Panel>

    </div>
  );
}
