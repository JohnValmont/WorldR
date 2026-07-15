'use client';
// WORLDr — Party screen. Founding flow (redesigned) + party identity view.
// The founding flow is a guided experience: name your party (with a live crest),
// pick a Creed from rich cards that PREVIEW its platform, signature move and the
// voter blocs it naturally courts, choose a Tenet, then found from a sticky bar.
// Engine contract is unchanged: foundParty({ name, abbreviation, doctrine_id, tenet_id }, stateId).
import React, { useState } from 'react';
import { politicsApi } from '@/lib/api';
import { SEGMENTS } from '@/lib/politicsConstants';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, stampStyle } from './_lib/theme';
import { CREEDS, CREED_ORDER, CREED_NAME_BY_ID, PILLARS, PILLAR_BY_AXIS, BLOC_NAME_BY_KEY, type CreedId } from './_lib/model';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Panel, Stamp, Meter } from './_components/DeskUI';
import { partyColor } from './_components/Viz';

interface Props {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  character: any;
  parties: any[];
  myAp?: { current_ap: number; ap_cap: number };
  onRefresh: () => void;
}

const CREED_PLATFORMS: Record<CreedId, Record<string, number>> = {
  forge_accord:  { taxation: 20, labour: 80, investment: 80, trade: 20, stability: 50 },
  the_ledger:    { taxation: 80, labour: 20, investment: 20, trade: 80, stability: 80 },
  the_homestead: { taxation: 50, labour: 50, investment: 20, trade: 20, stability: 80 },
  the_commons:   { taxation: 20, labour: 80, investment: 80, trade: 50, stability: 20 },
  the_vanguard:  { taxation: 50, labour: 50, investment: 50, trade: 80, stability: 20 },
  the_compact:   { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 },
};

const SIGNATURE_NAME: Record<CreedId, string> = {
  forge_accord: 'Rally the Workers', the_ledger: 'Investor Roadshow', the_homestead: 'Town Hall',
  the_commons: 'Shop Floor Tour', the_vanguard: 'Listening Tour', the_compact: 'Coalition Outreach',
};

const TENETS: Record<CreedId, { id: string; name: string; type: string; blurb: string }[]> = {
  forge_accord:  [{ id: 'forge_radicals', name: 'Shop Floor Radicals', type: 'intensify', blurb: 'Double down on labour — deepen Fit with Workers.' }, { id: 'forge_modernizers', name: 'Factory Modernizers', type: 'broaden', blurb: 'Reach toward Business without losing your base.' }],
  the_ledger:    [{ id: 'ledger_hardliners', name: 'Hard Austerity', type: 'intensify', blurb: 'Uncompromising on tax — own the Business bloc.' }, { id: 'ledger_expansionists', name: 'Trade Expansionists', type: 'broaden', blurb: 'Court Merchants with an open-trade agenda.' }],
  the_homestead: [{ id: 'homestead_roots', name: 'Back to Roots', type: 'intensify', blurb: 'Lean into order — cement the Middle Class.' }, { id: 'homestead_pragmatists', name: 'Pragmatic Centre', type: 'broaden', blurb: 'Soften the edges to reach Professionals.' }],
  the_commons:   [{ id: 'commons_vanguard', name: 'Reform Vanguard', type: 'intensify', blurb: 'Bold redistribution — energise Workers.' }, { id: 'commons_outreach', name: 'Cross-Class Outreach', type: 'broaden', blurb: 'Build a coalition beyond the shop floor.' }],
  the_vanguard:  [{ id: 'vanguard_professionals', name: 'Professional Class', type: 'intensify', blurb: 'Own the reformist Professionals bloc.' }, { id: 'vanguard_traders', name: 'Trade First', type: 'broaden', blurb: 'Win Merchants with open markets.' }],
  the_compact:   [{ id: 'compact_builders', name: 'Infrastructure First', type: 'intensify', blurb: 'Investment-led centrism to steady the state.' }, { id: 'compact_populists', name: 'Household Compact', type: 'broaden', blurb: 'A big-tent pitch to families and workers.' }],
};

function fitPct(platform: Record<string, number>, seg: any): number {
  let wsum = 0, acc = 0;
  for (const ax of Object.keys(seg.priorities)) {
    const w = seg.priorities[ax];
    acc += w * (1 - Math.abs((platform[ax] ?? 50) - seg.ideal[ax]) / 100);
    wsum += w;
  }
  return wsum ? (acc / wsum) * 100 : 0;
}
function naturalBlocs(platform: Record<string, number>): string[] {
  return [...SEGMENTS].map((s: any) => ({ k: s.key, f: fitPct(platform, s) })).sort((a, b) => b.f - a.f).slice(0, 2).map((x) => BLOC_NAME_BY_KEY[x.k] || x.k);
}

function Btn({ label, onClick, primary, disabled }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '11px 18px', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        fontSize: 12.5, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase',
        background: primary ? T.gold : T.panel2, color: primary ? '#1a1408' : T.text, border: `1px solid ${primary ? T.gold : T.border}`, whiteSpace: 'nowrap' }}>
      {label}
    </button>
  );
}

function Crest({ abbr, color, size = 54 }: { abbr: string; color: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: `${color}22`, border: `1.5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: size * 0.3, color, letterSpacing: '0.04em' }}>{(abbr || '—').slice(0, 4)}</span>
    </div>
  );
}

function MiniPlatform({ platform }: { platform: Record<string, number> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
      {PILLARS.map((p) => (
        <div key={p.axis} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 74, fontFamily: MONO, fontSize: 9, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{p.name.split(' ')[0]}</span>
          <div style={{ flex: 1, height: 4, background: T.bg, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${platform[p.axis] ?? 50}%`, height: '100%', background: T.gold }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function nearestRung(axis: string, value: number) {
  const p = PILLAR_BY_AXIS[axis as keyof typeof PILLAR_BY_AXIS];
  if (!p) return '';
  let best = p.rungs[0];
  for (const r of p.rungs) if (Math.abs(r.value - value) < Math.abs(best.value - value)) best = r;
  return best.label;
}

export default function PartyScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, character, parties, onRefresh }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const myParty = Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id) : undefined;

  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [creed, setCreed] = useState<CreedId | null>(null);
  const [tenet, setTenet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cash = Number(character?.finances?.cash_in_hand ?? 0);
  const canAfford = cash >= 25000;
  const crestColor = creed ? partyColor({ doctrine_id: creed }, 0) : T.faint;

  async function found() {
    if (!name.trim() || !abbreviation.trim() || !creed) return;
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

  if (!isLocked && myParty) {
    const doctrine = (myParty.doctrine_id || myParty.doctrineId) as CreedId;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Crest abbr={myParty.abbreviation || myParty.name?.slice(0, 3)} color={partyColor(myParty, 0)} size={60} />
          <div>
            <div style={stampStyle}>Your Party</div>
            <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '4px 0 0' }}>{myParty.name}
              {myParty.abbreviation && <span style={{ color: T.faint, fontSize: 20, fontFamily: MONO, textTransform: 'uppercase', marginLeft: 8 }}>[{myParty.abbreviation}]</span>}
            </h1>
            <div style={{ color: partyColor(myParty, 0), fontFamily: MONO, fontSize: 12, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {CREED_NAME_BY_ID[doctrine] || 'Independent'}
            </div>
          </div>
        </div>

        <Panel title="Platform · Planks">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PILLARS.map((p) => {
              const v = Number(myParty.platform?.[p.axis] ?? 50);
              return (
                <div key={p.axis}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ color: T.text, fontSize: 13 }}>{p.name}</span>
                    <span style={{ color: T.gold, fontFamily: MONO, fontSize: 12 }}>{nearestRung(p.axis, v)}</span>
                  </div>
                  <Meter value={v} tone={T.gold} height={6} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                    <span style={{ color: T.faint, fontSize: 10 }}>{p.low}</span>
                    <span style={{ color: T.faint, fontSize: 10 }}>{p.high}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Roster" action={<Btn label={busy ? '…' : 'Recruit Candidate'} onClick={recruit} disabled={busy} />}>
          <div style={{ color: T.muted, fontSize: 14, lineHeight: 1.6 }}>
            Bench: <span style={{ color: T.ivory, fontWeight: 600 }}>{myParty.member_count ?? myParty.members?.length ?? myParty.roster?.length ?? 0}</span> candidate(s).
            Recruiting pulls in an NPC loosely aligned to your platform (costs Treasury + 4 AP). More seats need more candidates on the bench.
          </div>
        </Panel>
        {err && <div style={{ color: T.red, fontSize: 13 }}>{err}</div>}
      </div>
    );
  }

  if (isLocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
        <Panel title="Locked"><div style={{ color: T.faint, fontStyle: 'italic' }}>{jurisdiction?.name || 'This state'} is not yet open for political activity.</div></Panel>
      </div>
    );
  }

  const selectedCreed = creed ? CREEDS[creed] : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 88 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />

      <div>
        <div style={stampStyle}>Found a Party · {jurisdiction?.name}</div>
        <h1 style={{ color: T.ivory, fontSize: 30, fontWeight: 700, margin: '8px 0 0', letterSpacing: '-0.01em' }}>Build a Movement</h1>
        <p style={{ color: T.muted, fontSize: 14, marginTop: 6, maxWidth: 660 }}>
          You are the permanent Leader; only NPC recruits fill your bench. Your Creed locks your identity, sets your starting platform, and unlocks a unique Signature action.
        </p>
      </div>

      <Panel title="1 · Party Identity">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Crest abbr={abbreviation || (name ? name.slice(0, 3).toUpperCase() : '')} color={crestColor} />
          <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 260, flexWrap: 'wrap' }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Party name…" maxLength={40}
              style={{ flex: 1, minWidth: 180, padding: '12px 14px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, color: T.ivory, fontSize: 15, outline: 'none' }} />
            <input value={abbreviation} onChange={(e) => setAbbreviation(e.target.value.toUpperCase())} placeholder="ABBR" maxLength={6}
              style={{ width: 130, padding: '12px 14px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, color: T.ivory, fontSize: 15, outline: 'none', fontFamily: MONO, textTransform: 'uppercase' }} />
          </div>
        </div>
      </Panel>

      <div>
        <Stamp>2 · Choose Your Creed</Stamp>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 12 }}>
          {CREED_ORDER.map((id) => {
            const c = CREEDS[id]; const on = creed === id;
            const col = partyColor({ doctrine_id: id }, 0);
            const plat = CREED_PLATFORMS[id];
            const blocs = naturalBlocs(plat);
            return (
              <button key={id} onClick={() => { setCreed(id); setTenet(null); }}
                style={{ textAlign: 'left', padding: 16, borderRadius: 6, cursor: 'pointer',
                  background: on ? T.goldSoft : T.panel2, border: `1px solid ${on ? T.goldLine : T.border}`,
                  boxShadow: on ? `0 0 0 1px ${T.goldSoft}` : 'none', transition: 'background .15s, border .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: col, flexShrink: 0 }} />
                  <span style={{ color: on ? T.gold : T.ivory, fontWeight: 700, fontSize: 16 }}>{c.name}</span>
                  <span style={{ marginLeft: 'auto', color: T.faint, fontFamily: MONO, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.tagline}</span>
                </div>
                <div style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginTop: 8 }}>{c.blurb}</div>
                <MiniPlatform platform={plat} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {c.keystone && <span style={{ fontFamily: MONO, fontSize: 9.5, color: T.blue, border: `1px solid ${T.blue}44`, background: `${T.blue}12`, borderRadius: 3, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Keystone: {PILLAR_BY_AXIS[c.keystone]?.name}</span>}
                  <span style={{ fontFamily: MONO, fontSize: 9.5, color: T.gold, border: `1px solid ${T.goldLine}`, background: T.goldSoft, borderRadius: 3, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>★ {SIGNATURE_NAME[id]}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: T.faint, marginTop: 8, letterSpacing: '0.03em' }}>Courts: {blocs.join(' · ')}</div>
              </button>
            );
          })}
        </div>
      </div>

      {creed && (
        <div>
          <Stamp>3 · Choose a Tenet — your faction&apos;s edge</Stamp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
            {TENETS[creed].map((tn) => {
              const on = tenet === tn.id;
              return (
                <button key={tn.id} onClick={() => setTenet(on ? null : tn.id)}
                  style={{ textAlign: 'left', padding: 15, borderRadius: 6, cursor: 'pointer', background: on ? T.goldSoft : T.panel2, border: `1px solid ${on ? T.goldLine : T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: on ? T.gold : T.ivory, fontWeight: 700, fontSize: 14 }}>{tn.name}</span>
                    <span style={{ color: tn.type === 'intensify' ? T.red : T.mint, fontFamily: MONO, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tn.type}</span>
                  </div>
                  <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>{tn.blurb}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {err && <div style={{ color: T.red, fontSize: 13, border: `1px solid ${T.red}55`, background: `${T.red}14`, padding: 12, borderRadius: 4 }}>{err}</div>}

      <div style={{ position: 'sticky', bottom: 0, marginTop: 4, background: T.panel, border: `1px solid ${selectedCreed ? T.goldLine : T.border}`, borderRadius: 6, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', boxShadow: '0 -6px 24px rgba(0,0,0,0.35)' }}>
        <Crest abbr={abbreviation || (name ? name.slice(0, 3).toUpperCase() : '')} color={crestColor} size={44} />
        <div style={{ minWidth: 160 }}>
          <div style={{ color: T.ivory, fontWeight: 700, fontSize: 15 }}>{name || 'Unnamed Party'}</div>
          <div style={{ color: T.muted, fontFamily: MONO, fontSize: 11, marginTop: 2 }}>{selectedCreed ? selectedCreed.name : 'Pick a Creed'}{tenet ? ` · ${TENETS[creed!].find((t) => t.id === tenet)?.name}` : ''}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={stampStyle}>Founding Cost</div>
          <div style={{ color: canAfford ? T.gold : T.red, fontFamily: MONO, fontSize: 18, fontWeight: 700 }}>-$25,000</div>
          {!canAfford && <div style={{ color: T.red, fontFamily: MONO, fontSize: 10 }}>Insufficient cash (${cash.toLocaleString('en-US')})</div>}
        </div>
        <Btn label={busy ? 'Founding…' : 'Found Party'} primary onClick={found} disabled={busy || !name.trim() || !abbreviation.trim() || !creed || !canAfford} />
      </div>
    </div>
  );
}
