'use client';
// ─────────────────────────────────────────────────────────────────────────────
// WORLDr — Nation screen (the state of the nation).
// Shows the five Jurisdiction Conditions (Prosperity · Jobs · Order · Cohesion ·
// Budget, 0–10) that the whole simulation reacts to. These are NOT set directly:
// they drift each month toward the policy in force. When the Legislature passes a
// bill, that law updates the state's policy platform (backend), and these stats
// visibly move over the following months. This screen makes that cause→effect
// legible: current stats, active laws, how each policy lever moves the nation,
// and a dispatches feed of what recently changed.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO } from './_lib/theme';
import { JURISDICTION_MODEL } from './_lib/model';
import { Panel, Stamp } from './_components/DeskUI';
import { formatGameDateShort } from '@/lib/calendar';

interface Props {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  character: any;
  parties: any[];
  myAp?: { current_ap: number; ap_cap: number };
  onRefresh?: () => void;
}

const STATS: { key: string; name: string; blurb: string; driver: string }[] = [
  { key: 'prosperity', name: 'Prosperity', blurb: 'Living standards and growth.', driver: 'Lifted by open Trade and generous spending; hurt by austerity and closed borders.' },
  { key: 'jobs',       name: 'Jobs',       blurb: 'Employment across the state.',  driver: 'Lifted by State-Built industry and protected Trade; hurt by free markets.' },
  { key: 'order',      name: 'Order',      blurb: 'Public order and safety.',      driver: 'Lifted by firm Social Order; eroded by liberal order and radical reform.' },
  { key: 'cohesion',   name: 'Cohesion',   blurb: 'Social unity and trust.',       driver: 'Lifted by generous spending; strained by austerity and radical reform.' },
  { key: 'budget',     name: 'Budget',     blurb: 'Health of public finances.',    driver: 'Built by lean/austere taxation; drained by lavish spending and state industry.' },
];

// GDD §16 ladder → condition effect summary (accurate to the tuned tables).
const LADDER: { pillar: string; extremes: string }[] = [
  { pillar: 'Tax & Spending', extremes: 'Austere → Budget ▲, Prosperity ▼, Cohesion ▼   ·   Lavish → Prosperity ▲, Cohesion ▲▲, Jobs ▲, Budget ▼▼' },
  { pillar: 'State Role',     extremes: 'Free Market → Prosperity ▲, Jobs ▼   ·   State-Run → Jobs ▲▲, Prosperity ▼, Budget ▼' },
  { pillar: 'Trade',          extremes: 'Closed → Jobs ▲▲, Prosperity ▼▼   ·   Free Trade → Prosperity ▲▲, Jobs ▼▼' },
  { pillar: 'Social Order',   extremes: 'Strict → Order ▲▲, Cohesion ▼   ·   Open → Cohesion ▲, Order ▼▼' },
  { pillar: 'Reform Pace',    extremes: 'Fixed → Cohesion ▲   ·   Radical → Prosperity ▲, Order ▼, Cohesion ▼▼' },
];

function tone(v: number) { return v >= 6.5 ? T.mint : v >= 4 ? T.gold : T.red; }
function label(v: number) { return v >= 7.5 ? 'Strong' : v >= 6 ? 'Healthy' : v >= 4 ? 'Fragile' : v >= 2.5 ? 'Strained' : 'Critical'; }

/** Radial 0–10 dial. */
function Dial({ value, name, sub }: { value: number; name: string; sub: string }) {
  const r = 40, C = 2 * Math.PI * r, arc = C * 0.75;
  const v = Math.max(0, Math.min(10, value));
  const col = tone(v);
  return (
    <div style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: 112, height: 112 }}>
        <svg width="112" height="112" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r={r} fill="none" stroke={T.border} strokeWidth="8" strokeDasharray={`${arc} ${C}`} strokeLinecap="round" transform="rotate(135 56 56)" />
          <circle cx="56" cy="56" r={r} fill="none" stroke={col} strokeWidth="8" strokeDasharray={`${(arc * v) / 10} ${C}`} strokeLinecap="round" transform="rotate(135 56 56)" style={{ transition: 'stroke-dasharray .5s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, color: col, lineHeight: 1 }}>{v.toFixed(1)}</div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: col, marginTop: 3 }}>{label(v)}</div>
        </div>
      </div>
      <div style={{ color: T.ivory, fontWeight: 700, fontSize: 14 }}>{name}</div>
      <div style={{ color: T.faint, fontSize: 11.5, textAlign: 'center', lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

const KIND_STYLE: Record<string, { color: string; label: string }> = {
  bill_passed:   { color: T.mint, label: 'LAW PASSED' },
  bill_failed:   { color: T.red,  label: 'BILL FAILED' },
  election:      { color: T.gold, label: 'ELECTION' },
  crisis:        { color: T.red,  label: 'CRISIS' },
  governing:     { color: T.blue, label: 'GOVERNING' },
  government:    { color: T.blue, label: 'GOVERNMENT' },
};

export default function NationScreen({ selectedJurisdictionId, overview, parties, character }: Props) {
  const jid = selectedJurisdictionId;
  const jurisdiction = JURISDICTIONS.find((j) => j.id === jid);
  const jModel = JURISDICTION_MODEL[jid] || JURISDICTION_MODEL.ironvale;

  const { data: billData } = useSWR(['nation-bills', jid], () => politicsApi.getBills(jid).catch(() => null), { refreshInterval: 20000 });
  const { data: ledger = [] } = useSWR(['nation-ledger', jid], () => politicsApi.getLedger(14, jid).catch(() => []), { refreshInterval: 20000 });

  const cond: any = overview?.conditions || {};
  const hasCond = cond && typeof cond === 'object' && Object.keys(cond).length > 0;
  const activePolicy: any = billData?.activePolicy || null;
  const taxRate = activePolicy?.industry_tax_rate != null ? Number(activePolicy.industry_tax_rate) : null;
  const infra = activePolicy?.infrastructure_level != null ? Number(activePolicy.infrastructure_level) : null;

  const partyList = Array.isArray(parties) ? parties : [];
  const premier = overview?.premier || null;

  const atRisk = hasCond ? STATS.filter((s) => Number(cond[s.key] ?? 5) < 4) : [];
  const events: any[] = Array.isArray(ledger) ? ledger : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Stamp>The Nation · {jurisdiction?.name}</Stamp>
        <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '8px 0 0' }}>State of the Nation</h1>
        <p style={{ color: T.muted, fontSize: 14, marginTop: 6, maxWidth: 680 }}>
          Five indicators the whole simulation reacts to. They aren&apos;t set by decree — they drift toward the policy in force.
          Pass laws in the Legislature and watch the nation respond over the coming months.
        </p>
      </div>

      {/* Stability watch */}
      {hasCond && (
        <div style={{ padding: '12px 16px', borderRadius: 4, border: `1px solid ${atRisk.length ? `${T.red}55` : T.goldLine}`, background: atRisk.length ? `${T.red}14` : T.goldSoft }}>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: atRisk.length ? T.red : T.gold }}>
            {atRisk.length ? '⚠ Stability Watch' : '✓ The nation is stable'}
          </span>
          <span style={{ color: T.muted, fontSize: 13, marginLeft: 10 }}>
            {atRisk.length ? `At risk: ${atRisk.map((s) => s.name).join(', ')} — a sustained slide can trigger a crisis event.` : 'No indicator is in the danger zone.'}
          </span>
        </div>
      )}

      {/* The five stats */}
      <Panel title="Nation Stats — 0 to 10">
        {!hasCond ? (
          <div style={{ color: T.faint, fontStyle: 'italic' }}>Conditions are not yet reported for this jurisdiction.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            {STATS.map((s) => <Dial key={s.key} value={Number(cond[s.key] ?? 5)} name={s.name} sub={s.blurb} />)}
          </div>
        )}
      </Panel>

      {/* Active laws + governing */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Panel title="Laws in Force">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: T.text, fontSize: 13 }}>Industry Tax Rate</span>
              <span style={{ color: T.gold, fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{taxRate == null ? '—' : `${(taxRate * 100).toFixed(1)}%`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: T.text, fontSize: 13 }}>Infrastructure Level</span>
              <span style={{ color: T.ivory, fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{infra == null ? '—' : infra}</span>
            </div>
            <div style={{ color: T.faint, fontSize: 11.5, lineHeight: 1.5, marginTop: 2 }}>
              Every law the Council passes updates the policy in force and reshapes the targets above. Propose new bills in the Legislature.
            </div>
          </div>
        </Panel>

        <Panel title="Government">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: T.muted, fontSize: 13 }}>
              Premier: <span style={{ color: T.ivory, fontWeight: 600 }}>{premier?.characterName || premier?.partyName || '—'}</span>
            </div>
            <div style={{ color: T.muted, fontSize: 13 }}>
              Parties contesting {jurisdiction?.name}: <span style={{ color: T.ivory, fontWeight: 600 }}>{partyList.length}</span>
            </div>
            <div style={{ color: T.faint, fontSize: 11.5, lineHeight: 1.5, marginTop: 2 }}>
              The governing party&apos;s platform is the baseline for nation targets; passed laws override individual pillars.
            </div>
          </div>
        </Panel>
      </div>

      {/* How laws move the nation */}
      <Panel title="How Laws Move the Nation (policy → stats)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LADDER.map((l) => (
            <div key={l.pillar} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 12, alignItems: 'baseline', paddingBottom: 8, borderBottom: `1px solid ${T.borderSoft}` }}>
              <span style={{ color: T.gold, fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>{l.pillar}</span>
              <span style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5 }}>{l.extremes}</span>
            </div>
          ))}
          <div style={{ color: T.faint, fontSize: 11, marginTop: 2 }}>▲ raises · ▼ lowers · doubled arrows = stronger effect. Effects apply while the policy sits on that rung.</div>
        </div>
      </Panel>

      {/* Dispatches */}
      <Panel title="Nation Dispatches">
        {events.length === 0 ? (
          <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 13 }}>No dispatches yet. Passed laws, elections and crises appear here as they resolve.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map((e: any, i: number) => {
              const ks = KIND_STYLE[String(e.kind || '')] || { color: T.faint, label: String(e.kind || 'EVENT').toUpperCase() };
              return (
                <div key={e.id || i} style={{ display: 'flex', gap: 12, paddingBottom: 10, borderBottom: i < events.length - 1 ? `1px solid ${T.borderSoft}` : 'none' }}>
                  <div style={{ flexShrink: 0, width: 96 }}>
                    <div style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 3, background: `${ks.color}1e`, border: `1px solid ${ks.color}55` }}>
                      <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: ks.color }}>{ks.label}</span>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: T.faint, marginTop: 4 }}>{e.month != null ? formatGameDateShort(e.month) : e.arc != null ? formatGameDateShort(e.arc) : ''}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {e.headline && <div style={{ color: T.ivory, fontSize: 13, fontWeight: 600 }}>{e.headline}</div>}
                    <div style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.45, marginTop: e.headline ? 2 : 0 }}>{e.body || e.title || e.message || ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
