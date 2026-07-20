'use client';
import React, { useState } from 'react';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, SANS, stampStyle, glassPanelStyle, interactiveCardStyle } from './_lib/theme';
import { CREEDS, CREED_ORDER, CREED_NAME_BY_ID, PILLARS, PILLAR_BY_AXIS, type CreedId, BLOC_NAME_BY_KEY } from './_lib/model';
import type { Axis } from '@/lib/politicsConstants';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Stamp } from './_components/DeskUI';

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

const CREED_PLATFORMS: Record<CreedId, Record<Axis, number>> = {
  forge_accord:  { taxation: 20, labour: 80, investment: 80, trade: 20, stability: 80 },
  the_ledger:    { taxation: 80, labour: 20, investment: 20, trade: 80, stability: 50 },
  the_homestead: { taxation: 50, labour: 50, investment: 50, trade: 20, stability: 80 },
  the_commons:   { taxation: 20, labour: 80, investment: 80, trade: 50, stability: 20 },
  the_vanguard:  { taxation: 20, labour: 50, investment: 50, trade: 80, stability: 20 },
  the_compact:   { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 },
};

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
    <div style={{ ...glassPanelStyle, fontFamily: SANS }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ ...stampStyle, textShadow: `0 0 10px ${T.goldSoft}` }}>{title}</div>{action}
      </div>
      {children}
    </div>
  );
}

function Btn({ label, onClick, primary, disabled }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: '12px 24px', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        fontSize: 12, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase',
        background: primary ? `linear-gradient(135deg, ${T.gold}, #B8860B)` : 'rgba(255,255,255,0.03)',
        color: primary ? '#111' : T.text,
        border: `1px solid ${primary ? T.goldLine : T.border}`,
        boxShadow: primary ? `0 4px 15px ${T.goldSoft}, inset 0 1px 0 rgba(255,255,255,0.3)` : 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        textShadow: primary ? 'none' : `0 1px 2px rgba(0,0,0,0.5)`,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: myParty ? 0 : 80 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />

      {isLocked ? (
        <Panel title="Locked"><div style={{ color: T.faint, fontStyle: 'italic' }}>{jurisdiction?.name || 'This state'} is not yet open for political activity.</div></Panel>
      ) : myParty ? (
        <>
          <div style={{ fontFamily: SANS }}>
            <div style={{ ...stampStyle, textShadow: `0 0 10px ${T.goldSoft}` }}>Your Party</div>
            <h1 style={{ color: T.ivory, fontSize: 32, fontWeight: 800, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 14, letterSpacing: '-0.02em' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: `radial-gradient(circle at 30% 30%, ${T.gold}, #B8860B)`, boxShadow: `0 0 12px ${T.goldGlow}` }} />
              {myParty.name}
              {myParty.abbreviation && <span style={{ color: T.faint, fontSize: 22, fontFamily: MONO, textTransform: 'uppercase', fontWeight: 600 }}>[{myParty.abbreviation}]</span>}
            </h1>
            <div style={{ color: T.gold, fontFamily: MONO, fontSize: 13, marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.15em', textShadow: `0 0 10px ${T.goldSoft}` }}>
              {CREED_NAME_BY_ID[(myParty.doctrine_id || myParty.doctrineId) as CreedId] || 'Independent'}
            </div>
          </div>

          <Panel title="Platform & Planks">
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
          <div style={{ fontFamily: SANS }}>
            <div style={{ ...stampStyle, textShadow: `0 0 10px ${T.goldSoft}` }}>Found a Party</div>
            <h1 style={{ color: T.ivory, fontSize: 36, fontWeight: 800, margin: '8px 0 0', letterSpacing: '-0.02em' }}>Stand for {jurisdiction?.name}</h1>
            <p style={{ color: T.muted, fontSize: 15, marginTop: 8, lineHeight: 1.6, maxWidth: 600 }}>Choose a Creed to set your identity. You are the permanent Leader — only NPC recruits can join your bench.</p>
          </div>

          <Panel title="Party Identity">
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', fontFamily: SANS }}>
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
                      textAlign: 'left', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 20,
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
          <div style={{ position: 'fixed', bottom: 0, left: 240 /* roughly sidebar width */, right: 0, background: 'rgba(8, 9, 12, 0.85)', borderTop: `1px solid ${T.border}`, boxShadow: `0 -10px 40px rgba(0,0,0,0.5)`, backdropFilter: 'blur(20px)', padding: '24px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50, fontFamily: SANS }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <div>
                <div style={stampStyle}>Founding Cost</div>
                <div style={{ color: T.red, fontFamily: MONO, fontSize: 24, fontWeight: 700, textShadow: `0 0 12px rgba(224, 82, 70, 0.4)`, marginTop: 4 }}>-$25,000</div>
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
