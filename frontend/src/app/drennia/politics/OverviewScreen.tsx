'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { T, MONO } from './_lib/theme';
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

// Condition colours: 0—10 scale.
function condTone(v: number) { return v >= 6.5 ? T.mint : v >= 4 ? T.gold : T.red; }

/** Support arc gauge. */
function Gauge({ pct }: { pct: number | null }) {
  const r = 48, C = 2 * Math.PI * r, arc = C * 0.75;
  const v = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: 'relative', width: 130, height: 130 }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke={T.border} strokeWidth="9" strokeDasharray={`${arc} ${C}`} strokeLinecap="round" transform="rotate(135 65 65)" />
        <circle cx="65" cy="65" r={r} fill="none" stroke={T.gold} strokeWidth="9" strokeDasharray={`${(arc * v) / 100} ${C}`} strokeLinecap="round" transform="rotate(135 65 65)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.faint }}>Support</div>
        <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: pct == null ? T.faint : T.ivory, lineHeight: 1, marginTop: 3 }}>
          {pct == null ? '—' : `${pct.toFixed(1)}%`}
        </div>
      </div>
    </div>
  );
}

/** Action button — reused locally. */
function Btn({ label, onClick, primary, disabled }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '9px 14px', borderRadius: 4, cursor: disabled ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', background: primary ? T.gold : T.panel2, color: primary ? '#1a1408' : T.text, border: `1px solid ${primary ? T.gold : T.border}`, opacity: disabled ? 0.45 : 1 }}>
      {label}
    </button>
  );
}

export default function OverviewScreen({ overview, character, parties, myAp, selectedJurisdictionId, onNavigate, onRefresh }: Props) {
  const jid = selectedJurisdictionId;
  const { data: billData } = useSWR(['ov-bills', jid], () => politicsApi.getBills(jid).catch(() => null), { refreshInterval: 20000 });
  const { data: ledger = [] } = useSWR(['ov-ledger', jid], () => politicsApi.getLedger(8, jid).catch(() => []), { refreshInterval: 20000 });
  const [busy, setBusy] = useState<string | null>(null);

  const jMeta = JURISDICTION_MODEL[jid] || JURISDICTION_MODEL.ironvale;
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

  // Jurisdiction Conditions (Task E / GDD $11) — now visible for the first time.
  const cond: any = overview?.conditions;
  const hasConditions = cond && typeof cond === 'object';

  const monthsToElection: number | null = overview?.cycle?.monthsToElection ?? null;

  async function vote(id: string, v: 'aye' | 'nay') {
    try { setBusy(v); await politicsApi.voteBill(id, v); await onRefresh(); } catch { /* shown elsewhere */ } finally { setBusy(null); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* — Page header — */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Stamp>This Month — {jMeta.name}</Stamp>
          <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '8px 0 0', letterSpacing: '-0.01em' }}>
            {myParty ? myParty.name : 'Political Desk'}
            {myParty?.abbreviation && <span style={{ color: T.faint, fontSize: 20, fontFamily: MONO, textTransform: 'uppercase', marginLeft: 8 }}>[{myParty.abbreviation}]</span>}
          </h1>
          {myParty?.doctrine_id && <div style={{ fontFamily: MONO, fontSize: 11, color: T.faint, marginTop: 4, letterSpacing: '0.08em' }}>{myParty.doctrine_id.replace(/_/g, ' ').toUpperCase()}</div>}
        </div>
        {monthsToElection != null && (
          <div style={{ background: T.panel2, border: `1px solid ${T.goldLine}`, borderRadius: 4, padding: '10px 16px', textAlign: 'right' }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.faint }}>Next Election</div>
            <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: T.gold, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
              {monthsToElection <= 0 ? 'IMMINENT' : `${monthsToElection} mo`}
            </div>
          </div>
        )}
      </div>

      {/* — No party — founding call-to-action — */}
      {!myParty && (
        <Panel accent>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <Stamp>Get Started</Stamp>
              <div style={{ color: T.text, fontSize: 14, lineHeight: 1.6, marginTop: 10, maxWidth: 540 }}>
                You have no party. Found a movement, choose your Creed, and stand for {jMeta.name}. Your Creed locks your ideological identity and unlocks a unique Signature action.
              </div>
            </div>
            <Btn label="Found a Party" primary onClick={() => onNavigate('party')} />
          </div>
        </Panel>
      )}

      {/* — Jurisdiction Conditions strip (Task E / GDD $11) — */}
      {hasConditions && (
        <Panel title="Jurisdiction Conditions">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            {(['prosperity', 'jobs', 'order', 'cohesion', 'budget'] as const).map((key) => {
              const v = typeof cond[key] === 'number' ? Number(cond[key]) : 5;
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
            0—10 — moved by the governing party's active policy each month — feeds bloc turnout and crisis events
          </div>
        </Panel>
      )}

      {/* — 3-column centre: Standing | On the Floor | Chronicle — */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.2fr) minmax(200px, 1.4fr) minmax(200px, 1.4fr)', gap: 16 }}>

        {/* Standing */}
        <Panel title="Standing">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Gauge pct={support} />
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <StatTile label="Action Points" value={myAp?.current_ap ?? 0} sub="+12 each month — no cap" tone={T.gold} />
              <StatTile label="Seats Target" value={jMeta.seats} sub={`${jMeta.majority} for a majority`} tone={T.ivory} />
            </div>
            {!myParty && <Btn label="Found a Party" primary onClick={() => onNavigate('party')} />}
          </div>
        </Panel>

        {/* On the Floor */}
        <Panel title="On the Floor" action={<Btn label="Legislature" onClick={() => onNavigate('legislature')} />}>
          {floorBill ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ color: T.ivory, fontWeight: 700, fontSize: 14 }}>{floorBill.title || floorBill.name || floorBill.type || 'Bill on the floor'}</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{floorBill.type || 'motion'} — {floorBill.status || 'open'}</div>
              </div>
              {(ayes != null || nays != null) && (
                <div style={{ display: 'flex', gap: 12 }}>
                  {ayes != null && <StatTile label="Ayes" value={ayes} tone={T.mint} />}
                  {nays != null && <StatTile label="Nays" value={nays} tone={T.red} />}
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

      {/* — Recommended Move (contextual, quiet footer) — */}
      <Panel title="Recommended Move">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ color: T.muted, fontSize: 13.5, lineHeight: 1.6, flex: 1, minWidth: 240 }}>
            {myParty
              ? 'Read the electorate, then campaign where no rival stands — owning open ground beats crowding a popular bloc.'
              : 'Your first move: found a party and pick the Creed that matches how you want to govern.'}
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <Btn label={myParty ? 'Electorate' : 'Found a Party'} primary onClick={() => onNavigate(myParty ? 'elections' : 'party')} />
            <Btn label="Party" onClick={() => onNavigate('party')} />
          </div>
        </div>
      </Panel>

    </div>
  );
}
