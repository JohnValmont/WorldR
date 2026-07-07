'use client';
import React, { useState } from 'react';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, stampStyle } from './_lib/theme';
import { CREEDS, CREED_ORDER, CREED_NAME_BY_ID, PILLARS, PILLAR_BY_AXIS, type CreedId } from './_lib/model';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';

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

const TENETS: Record<CreedId, { id: string; name: string; type: string }[]> = {
  forge_accord:  [{ id: 'forge_radicals', name: 'Shop Floor Radicals', type: 'intensify' }, { id: 'forge_modernizers', name: 'Factory Modernizers', type: 'broaden' }],
  the_ledger:    [{ id: 'ledger_hardliners', name: 'Hard Austerity', type: 'intensify' }, { id: 'ledger_expansionists', name: 'Trade Expansionists', type: 'broaden' }],
  the_homestead: [{ id: 'homestead_roots', name: 'Back to Roots', type: 'intensify' }, { id: 'homestead_pragmatists', name: 'Pragmatic Centre', type: 'broaden' }],
  the_commons:   [{ id: 'commons_vanguard', name: 'Reform Vanguard', type: 'intensify' }, { id: 'commons_outreach', name: 'Cross-Class Outreach', type: 'broaden' }],
  the_vanguard:  [{ id: 'vanguard_professionals', name: 'Professional Class', type: 'intensify' }, { id: 'vanguard_traders', name: 'Trade First', type: 'broaden' }],
  the_compact:   [{ id: 'compact_builders', name: 'Infrastructure First', type: 'intensify' }, { id: 'compact_populists', name: 'Household Compact', type: 'broaden' }],
};

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={stampStyle}>{title}</div>{action}
      </div>
      {children}
    </div>
  );
}

function Btn({ label, onClick, primary, disabled }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '10px 16px', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        fontSize: 12.5, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase',
        background: primary ? T.gold : T.panel2, color: primary ? '#1a1408' : T.text, border: `1px solid ${primary ? T.gold : T.border}` }}>
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

export default function PartyScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, character, parties, onRefresh }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const myParty = Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id) : undefined;

  const [name, setName] = useState('');
  const [creed, setCreed] = useState<CreedId | null>(null);
  const [tenet, setTenet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function found() {
    if (!name.trim() || !creed) return;
    try {
      setBusy(true); setErr(null);
      await politicsApi.foundParty({ name: name.trim(), doctrine_id: creed, tenet_id: tenet }, selectedJurisdictionId);
      await onRefresh();
    } catch (e: any) { setErr(e?.response?.data?.message || e?.message || 'Failed to found party'); }
    finally { setBusy(false); }
  }

  async function recruit() {
    try { setBusy(true); await politicsApi.recruitNpc(selectedJurisdictionId); await onRefresh(); }
    catch (e: any) { setErr(e?.response?.data?.message || e?.message || 'Recruit failed'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />

      {isLocked ? (
        <Panel title="Locked"><div style={{ color: T.faint, fontStyle: 'italic' }}>{jurisdiction?.name || 'This state'} is not yet open for political activity.</div></Panel>
      ) : myParty ? (
        <>
          <div>
            <div style={stampStyle}>Your Party</div>
            <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '6px 0 0' }}>{myParty.name}</h1>
            <div style={{ color: T.gold, fontFamily: MONO, fontSize: 12, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {CREED_NAME_BY_ID[(myParty.doctrine_id || myParty.doctrineId) as CreedId] || 'Independent'}
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
                    <div style={{ height: 6, background: T.panel2, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${v}%`, height: '100%', background: T.gold }} />
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

          <Panel title="Roster" action={<Btn label={busy ? '\u2026' : 'Recruit Candidate'} onClick={recruit} disabled={busy} />}>
            <div style={{ color: T.muted, fontSize: 14 }}>
              Bench: <span style={{ color: T.ivory, fontWeight: 600 }}>{myParty.member_count ?? myParty.members?.length ?? myParty.roster?.length ?? 0}</span> candidate(s).
              Recruiting pulls in an NPC loosely aligned to your platform.
            </div>
          </Panel>
          {err && <div style={{ color: T.red, fontSize: 13 }}>{err}</div>}
        </>
      ) : (
        <>
          <div>
            <div style={stampStyle}>Found a Party</div>
            <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '6px 0 0' }}>Stand for {jurisdiction?.name}</h1>
            <p style={{ color: T.muted, fontSize: 14, marginTop: 6 }}>Choose a Creed to set your identity. You are the permanent Leader — only NPC recruits can join your bench.</p>
          </div>

          <Panel title="Party Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter party name…" maxLength={40}
              style={{ width: '100%', padding: '11px 14px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, color: T.ivory, fontSize: 14, outline: 'none' }} />
          </Panel>

          <Panel title="Choose Your Creed">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {CREED_ORDER.map((id) => {
                const c = CREEDS[id]; const on = creed === id;
                return (
                  <button key={id} onClick={() => { setCreed(id); setTenet(null); }}
                    style={{ textAlign: 'left', padding: 16, borderRadius: 4, cursor: 'pointer',
                      background: on ? T.goldSoft : T.panel2, border: `1px solid ${on ? T.goldLine : T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ color: on ? T.gold : T.ivory, fontWeight: 700, fontSize: 15 }}>{c.name}</span>
                      <span style={{ color: T.faint, fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.tagline}</span>
                    </div>
                    <div style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginTop: 6 }}>{c.blurb}</div>
                    {c.keystone && <div style={{ color: T.blue, fontFamily: MONO, fontSize: 10.5, marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Keystone: {PILLAR_BY_AXIS[c.keystone]?.name}</div>}
                  </button>
                );
              })}
            </div>
          </Panel>

          {creed && (
            <Panel title="Choose a Tenet">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {TENETS[creed].map((tn) => {
                  const on = tenet === tn.id;
                  return (
                    <button key={tn.id} onClick={() => setTenet(on ? null : tn.id)}
                      style={{ textAlign: 'left', padding: 14, borderRadius: 4, cursor: 'pointer', background: on ? T.goldSoft : T.panel2, border: `1px solid ${on ? T.goldLine : T.border}` }}>
                      <div style={{ color: on ? T.gold : T.ivory, fontWeight: 600, fontSize: 14 }}>{tn.name}</div>
                      <div style={{ color: T.faint, fontFamily: MONO, fontSize: 10.5, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tn.type}</div>
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: '16px 20px' }}>
            <div>
              <div style={stampStyle}>Founding Cost</div>
              <div style={{ color: T.red, fontFamily: MONO, fontSize: 18, fontWeight: 700 }}>-$25,000</div>
            </div>
            <Btn label={busy ? 'Founding\u2026' : 'Found Party'} primary onClick={found} disabled={busy || !name.trim() || !creed} />
          </div>
          {err && <div style={{ color: T.red, fontSize: 13 }}>{err}</div>}
        </>
      )}
    </div>
  );
}
