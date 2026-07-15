'use client';
// ───────────────────────────────────────────────────────────────────────────
// WORLDr — Campaign screen (the player's agency hub / War Room).
// This is where "playing" happens: stand for election, then spend cash on the
// campaign trail (queued bloc actions that build Reach and resolve on the next
// month tick) and spend AP on instant War Room moves (statement, fundraise,
// scout, negotiate, and your Creed-locked Signature action). A live scoreboard
// shows projected seats / vote share so every action has a visible consequence.
//
// All actions call the REAL backend endpoints:
//   • declareCandidacy      POST /politics/candidacy
//   • queueCampaignAction   POST /politics/campaign/actions   (resolves next tick)
//   • doGeneralAction       POST /politics/general-action     (instant, spends AP)
// ───────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { SEGMENTS } from '@/lib/politicsConstants';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO } from './_lib/theme';
import { BLOC_NAME_BY_KEY, JURISDICTION_MODEL } from './_lib/model';
import { Panel, Stamp, StatTile } from './_components/DeskUI';

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

// ── Campaign-trail actions (queued; resolve on the next month tick) ──────────
interface TrailDef { type: string; name: string; blurb: string; cash: number; targeting: 'segment' | 'all' | 'none'; gate?: string; }
const TRAIL: TrailDef[] = [
  { type: 'canvass',     name: 'Canvass a Bloc',   blurb: 'Door-to-door ground game in one bloc. Cheap, steady Reach.',       cash: 1500,  targeting: 'segment' },
  { type: 'rally',       name: 'Hold a Rally',     blurb: 'A big turnout event that surges Reach with one bloc.',            cash: 5000,  targeting: 'segment' },
  { type: 'media_ad',    name: 'Media Blitz',      blurb: 'Broadcast advertising that lifts Reach across every bloc.',       cash: 12000, targeting: 'all' },
  { type: 'debate',      name: 'Take the Debate',  blurb: 'Free, high-impact across all blocs. Needs Credibility ≥ 40.',     cash: 0,     targeting: 'all', gate: 'Credibility ≥ 40' },
  { type: 'endorsement', name: 'Court Endorsers',  blurb: 'Spend Influence to win a bloc through a trusted endorsement.',     cash: 0,     targeting: 'segment', gate: 'uses Influence' },
  { type: 'fundraiser',  name: 'Fundraising Drive', blurb: 'Refill the war chest. Resolves into party Treasury next month.',  cash: 0,     targeting: 'none' },
];

// ── War Room actions (instant; spend AP) ────────────────────────────────
interface WarDef { type: string; name: string; blurb: string; ap: number; }
const WAR_ROOM: WarDef[] = [
  { type: 'statement',  name: 'Issue a Statement', blurb: 'Court public opinion — a small, immediate popularity lift.', ap: 3 },
  { type: 'fundraise',  name: 'Quick Fundraise',   blurb: 'Instant cash into the party treasury (scales with charisma).', ap: 1 },
  { type: 'scout',      name: 'Scout Rivals',      blurb: 'Reveal rival party platforms so you can out-position them.',  ap: 2 },
  { type: 'negotiate',  name: 'Back-Channel Talks', blurb: 'Improve your odds when a coalition must be formed.',         ap: 2 },
];

// Creed-locked Signature action (6 AP), mapped from the party's doctrine_id.
const SIGNATURE: Record<string, { type: string; name: string; blurb: string }> = {
  forge_accord:  { type: 'union_address',      name: 'Rally the Workers',  blurb: 'Signature (Populist): a powerful surge with industrial Workers.' },
  the_ledger:    { type: 'investor_roadshow',  name: 'Investor Roadshow',  blurb: 'Signature (Liberal): raise a large war chest from business backers.' },
  the_homestead: { type: 'town_hall',          name: 'Town Hall',          blurb: 'Signature (Conservative): reinforce trust and steady the Middle Class.' },
  the_commons:   { type: 'shop_floor_tour',    name: 'Shop Floor Tour',    blurb: 'Signature (Socialist): energise labour and ease your next recruit.' },
  the_vanguard:  { type: 'listening_tour',     name: 'Listening Tour',     blurb: 'Signature (Progressive): refresh segment sentiment data.' },
  the_compact:   { type: 'coalition_outreach', name: 'Coalition Outreach', blurb: 'Signature (Centrist): open cross-party dialogue, boosting coalition odds.' },
};

function Btn({ label, onClick, primary, disabled }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '8px 13px', borderRadius: 4, cursor: disabled ? 'default' : 'pointer', fontSize: 11.5, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', background: primary ? T.gold : T.panel2, color: primary ? '#1a1408' : T.text, border: `1px solid ${primary ? T.gold : T.border}`, opacity: disabled ? 0.4 : 1, whiteSpace: 'nowrap' }}>
      {label}
    </button>
  );
}

export default function CampaignScreen({ selectedJurisdictionId, overview, character, parties, myAp, onRefresh }: Props) {
  const jid = selectedJurisdictionId;
  const jurisdiction = JURISDICTIONS.find((j) => j.id === jid);
  const jModel = JURISDICTION_MODEL[jid] || JURISDICTION_MODEL.ironvale;
  const partyList = Array.isArray(parties) ? parties : [];
  const myParty = partyList.find((p: any) => p.leader_character_id === character?.id);

  const { data: polls, mutate: mutatePolls } = useSWR(['camp-polls', jid], () => politicsApi.getPolls(jid).catch(() => null), { refreshInterval: 20000 });

  const [standing, setStanding] = useState<boolean | null>(null); // null = unknown
  const [seg, setSeg] = useState<string>(SEGMENTS[0]?.key || '');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const ap = myAp?.current_ap ?? 0;
  const cash = Number(character?.finances?.cash_in_hand ?? 0);
  const treasury = Number(myParty?.treasury ?? 0);
  const credibility = Number(character?.political?.credibility ?? character?.credibility ?? 0);

  // Live scoreboard from the engine projection.
  const perParty: any[] = Array.isArray(polls?.perParty) ? polls.perParty : [];
  const totalVotes = perParty.reduce((a, p) => a + Number(p.votes || 0), 0);
  const mine = myParty ? perParty.find((p) => p.partyId === myParty.id) : null;
  const myShare = mine && totalVotes > 0 ? (Number(mine.votes) / totalVotes) * 100 : null;
  const mySeats = mine ? Number(mine.seats || 0) : 0;

  const sigDef = myParty?.doctrine_id ? SIGNATURE[myParty.doctrine_id] : null;

  function flash(ok: boolean, msg: string) { setToast({ ok, msg }); window.setTimeout(() => setToast(null), 4500); }
  async function refreshAll() { await Promise.all([mutatePolls(), onRefresh?.()]); }

  async function stand() {
    setBusy('stand');
    try {
      await politicsApi.declareCandidacy(jid);
      setStanding(true);
      flash(true, `You are standing for ${jurisdiction?.name}. Now campaign to win seats.`);
      await refreshAll();
    } catch (e: any) {
      const msg = String(e?.response?.data?.message || e?.message || '');
      if (msg.toLowerCase().includes('already')) { setStanding(true); flash(true, 'You are already standing this cycle.'); }
      else flash(false, msg || 'Could not declare candidacy.');
    } finally { setBusy(null); }
  }

  async function runTrail(def: TrailDef) {
    setBusy(def.type);
    try {
      const body: any = { action_type: def.type };
      if (def.targeting === 'segment') body.target_segment = seg;
      await politicsApi.queueCampaignAction(body, jid);
      const where = def.targeting === 'segment' ? ` at ${BLOC_NAME_BY_KEY[seg] || seg}` : def.targeting === 'all' ? ' across every bloc' : '';
      flash(true, `${def.name}${where} queued — it resolves on the next month tick and moves your projection.`);
      await refreshAll();
    } catch (e: any) {
      const msg = String(e?.response?.data?.message || e?.message || '');
      if (msg.toLowerCase().includes('candidate')) { setStanding(false); flash(false, 'Stand for election first, then campaign.'); }
      else flash(false, msg || 'Action failed.');
    } finally { setBusy(null); }
  }

  async function runWar(type: string, cost: number) {
    setBusy(type);
    try {
      const res: any = await politicsApi.doGeneralAction(type, {}, jid);
      flash(true, res?.message || 'Action complete.');
      await refreshAll();
    } catch (e: any) {
      flash(false, String(e?.response?.data?.message || e?.message || 'Action failed.'));
    } finally { setBusy(null); }
  }

  if (!myParty) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <Stamp>Campaign · {jurisdiction?.name}</Stamp>
          <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '8px 0 0' }}>The War Room</h1>
        </div>
        <Panel accent>
          <div style={{ color: T.text, fontSize: 14, lineHeight: 1.6 }}>
            You need a party before you can campaign. Open the <strong style={{ color: T.gold }}>Party</strong> tab to found one and choose your Creed.
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Stamp>Campaign · {jurisdiction?.name}</Stamp>
        <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '8px 0 0' }}>The War Room</h1>
        <p style={{ color: T.muted, fontSize: 14, marginTop: 6, maxWidth: 660 }}>
          Stand for election, then work the trail. Campaign actions build Reach and resolve on the next month tick; War Room moves are instant and cost Action Points.
        </p>
      </div>

      {/* Scoreboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <StatTile label="Projected Seats" value={`${mySeats} / ${jModel.seats}`} sub={`${jModel.majority} for a majority`} tone={mySeats >= jModel.majority ? T.mint : T.ivory} />
        <StatTile label="Projected Share" value={myShare == null ? '—' : `${myShare.toFixed(1)}%`} sub="live engine run" tone={T.blue} />
        <StatTile label="Action Points" value={ap} sub="+12 each month · no cap" tone={T.gold} />
        <StatTile label="Your Cash" value={`$${cash.toLocaleString('en-US')}`} tone={T.mint} />
        <StatTile label="Party Treasury" value={`$${treasury.toLocaleString('en-US')}`} tone={T.mint} />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ padding: '11px 14px', borderRadius: 4, fontSize: 13, lineHeight: 1.5, background: toast.ok ? T.goldSoft : `${T.red}14`, border: `1px solid ${toast.ok ? T.goldLine : `${T.red}55`}`, color: toast.ok ? T.ivory : T.red }}>
          {toast.msg}
        </div>
      )}

      {/* Stand for election */}
      {standing !== true && (
        <Panel accent title="Stand for Election">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ color: T.muted, fontSize: 13.5, lineHeight: 1.6, flex: 1, minWidth: 240 }}>
              Declare your candidacy for the {jurisdiction?.name} Assembly this cycle. You must be standing before campaign actions count toward your seats.
            </div>
            <Btn label={busy === 'stand' ? 'Filing…' : 'Stand for Election'} primary disabled={busy === 'stand'} onClick={stand} />
          </div>
        </Panel>
      )}

      {/* Campaign trail */}
      <Panel title="The Campaign Trail — build Reach (resolves next month)">
        {/* bloc picker */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.faint, marginBottom: 8 }}>Target bloc (for bloc-specific actions)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SEGMENTS.map((s: any) => {
              const on = s.key === seg;
              return (
                <button key={s.key} onClick={() => setSeg(s.key)}
                  style={{ padding: '6px 11px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontFamily: MONO, background: on ? T.goldSoft : T.panel2, color: on ? T.gold : T.muted, border: `1px solid ${on ? T.goldLine : T.border}` }}>
                  {BLOC_NAME_BY_KEY[s.key] || s.label} · {Math.round(s.size * 100)}%
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {TRAIL.map((a) => {
            const gated = a.type === 'debate' && credibility < 40;
            const disabled = !!busy || gated;
            return (
              <div key={a.type} style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 4, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ color: T.ivory, fontWeight: 700, fontSize: 14 }}>{a.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: a.cash > 0 ? T.mint : T.faint }}>{a.cash > 0 ? `$${a.cash.toLocaleString()}` : 'Free'}</span>
                </div>
                <div style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, flex: 1 }}>{a.blurb}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {a.targeting === 'segment' ? `→ ${BLOC_NAME_BY_KEY[seg] || seg}` : a.targeting === 'all' ? '→ all blocs' : '→ treasury'}{a.gate ? ` · ${a.gate}` : ''}
                  </span>
                  <Btn label={busy === a.type ? '…' : gated ? 'Locked' : 'Run'} disabled={disabled} onClick={() => runTrail(a)} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* War Room (instant, AP) */}
      <Panel title="War Room — instant moves (spend AP)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {WAR_ROOM.map((a) => {
            const cant = ap < a.ap;
            return (
              <div key={a.type} style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 4, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ color: T.ivory, fontWeight: 700, fontSize: 14 }}>{a.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: cant ? T.red : T.gold }}>{a.ap} AP</span>
                </div>
                <div style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, flex: 1 }}>{a.blurb}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Btn label={busy === a.type ? '…' : cant ? 'Not enough AP' : 'Do it'} disabled={!!busy || cant} onClick={() => runWar(a.type, a.ap)} />
                </div>
              </div>
            );
          })}

          {/* Signature action (Creed-locked) */}
          {sigDef && (
            <div style={{ background: T.goldSoft, border: `1px solid ${T.goldLine}`, borderRadius: 4, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ color: T.gold, fontWeight: 700, fontSize: 14 }}>★ {sigDef.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: ap < 6 ? T.red : T.gold }}>6 AP</span>
              </div>
              <div style={{ color: T.text, fontSize: 12.5, lineHeight: 1.5, flex: 1 }}>{sigDef.blurb}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Btn label={busy === sigDef.type ? '…' : ap < 6 ? 'Not enough AP' : 'Unleash'} primary disabled={!!busy || ap < 6} onClick={() => runWar(sigDef.type, 6)} />
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
