'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { JURISDICTION_MODEL } from './_lib/model';
import { T, MONO, stampStyle } from './_lib/theme';
import { formatGameDate } from '@/lib/calendar';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Scroll, Shield } from 'lucide-react';

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

function StatBox({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div style={{ flex: 1, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ ...stampStyle, fontSize: 10, color: T.faint }}>{label}</div>
      <div style={{ color: T.ivory, fontSize: 20, fontWeight: 700, fontFamily: MONO }}>{value}</div>
    </div>
  );
}

export default function LegislatureScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, character, parties, overview, onRefresh }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const { data, mutate } = useSWR(isLocked ? null : ['bills', selectedJurisdictionId], () => politicsApi.getBills(selectedJurisdictionId).catch(() => null));
  const { data: councilData } = useSWR(isLocked ? null : ['council', selectedJurisdictionId], () => politicsApi.getCouncil(selectedJurisdictionId).catch(() => null));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const bills: any[] = Array.isArray(data?.bills) ? data.bills : [];
  const proposedBills = bills.filter(b => b.status === 'proposed');
  const historyBills = bills.filter(b => b.status === 'passed' || b.status === 'failed' || b.status === 'rejected');

  const monthYear = overview?.cycle?.currentArc != null
    ? formatGameDate(overview.cycle.currentArc) 
    : (overview?.sessionMonthLabel || 'Unknown');

  const jModel = JURISDICTION_MODEL[selectedJurisdictionId] || JURISDICTION_MODEL.national;
  const totalSeats = jModel.seats;
  const majority = jModel.majority;
  const assemblyType = jModel.tier === 'national' ? 'National Assembly' : 'State Assembly';

  async function refresh() { await mutate(); if (onRefresh) await onRefresh(); }
  
  async function vote(id: string, v: 'yea' | 'nay') {
    try { setBusy(id + v); setErr(null); await politicsApi.voteBill(id, v); await refresh(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || 'Failed to vote'); } finally { setBusy(null); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ ...stampStyle, color: T.gold, fontSize: 11, letterSpacing: '0.15em' }}>THE LEGISLATURE</div>
        <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
          {assemblyType} of {jurisdiction?.name || 'the Jurisdiction'}
        </h1>
        <div style={{ color: T.faint, fontSize: 13 }}>
          The chamber where bills are proposed, debated, and voted into law.
        </div>
      </div>

      {/* Stat Bar */}
      <div style={{ display: 'flex', gap: 16 }}>
        <StatBox label="SESSION" value={monthYear} />
        <StatBox label="SEATS" value={totalSeats} />
        <StatBox label="OVERALL MAJORITY" value={majority} />
        <StatBox label="GOVERNMENT BLOC" value={councilData?.premier?.partyName || '--'} />
      </div>

      {err && (
        <div style={{ padding: 12, background: `${T.red}15`, border: `1px solid ${T.red}40`, color: T.red, borderRadius: 6, fontSize: 13 }}>
          {err}
        </div>
      )}

      {isLocked ? (
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: '24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={20} color={T.muted} />
          <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 14 }}>The {jurisdiction?.name} legislature is not currently in session.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          
          {/* Left Column (Main Content) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* ON THE FLOOR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ ...stampStyle, color: T.muted }}>ON THE FLOOR</div>
                <Scroll size={14} color={T.muted} />
              </div>

              {proposedBills.length === 0 ? (
                <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, padding: 40, textAlign: 'center' }}>
                  <div style={{ color: T.ivory, fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Nothing on the floor</div>
                  <div style={{ color: T.faint, fontSize: 12, fontStyle: 'italic' }}>No bills are currently being debated or voted on.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {proposedBills.map((b: any) => {
                    const total = (b.tally?.yea || 0) + (b.tally?.nay || 0) + (b.tally?.abstain || 0);
                    const pYea = total > 0 ? ((b.tally?.yea || 0) / total) * 100 : 0;
                    const pNay = total > 0 ? ((b.tally?.nay || 0) / total) * 100 : 0;
                    const pAbstain = total > 0 ? ((b.tally?.abstain || 0) / total) * 100 : 100;
                    
                    return (
                      <div key={b.id} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div style={{ color: T.ivory, fontWeight: 700, fontSize: 16 }}>{b.title || b.name || 'Legislative Bill'}</div>
                            <div style={{ color: T.faint, fontSize: 11, fontStyle: 'italic' }}>By: The Assembly</div>
                          </div>
                          <div style={{ color: T.faint, fontSize: 12, marginBottom: 24, lineHeight: 1.5 }}>
                            An act to amend the jurisdiction policies, with effect from the next session.
                          </div>

                          <div style={{ marginBottom: 12 }}>
                            <div style={{ ...stampStyle, fontSize: 10, color: T.gold, marginBottom: 10 }}>WHIP POLL (REAL)</div>
                            
                            {/* Whip Bar */}
                            <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', background: '#2a2a2a', marginBottom: 12 }}>
                              <div style={{ width: `${pYea}%`, background: T.mint }} />
                              <div style={{ width: `${pAbstain}%`, background: T.muted }} />
                              <div style={{ width: `${pNay}%`, background: T.red }} />
                            </div>
                            
                            <div style={{ fontSize: 12, fontFamily: MONO, color: T.faint }}>
                              <span style={{ color: T.mint, fontWeight: 600 }}>Aye {b.tally?.yea || 0}</span>{' '}
                              <span style={{ color: T.red, fontWeight: 600 }}>Nay {b.tally?.nay || 0}</span>{' '}
                              <span>Not voted {b.tally?.abstain || 0}</span>.{' '}
                              <span style={{ color: T.ivory }}>{majority} to pass.</span>{' '}
                              <span style={{ color: b.projectedPass ? T.mint : T.red, fontWeight: 600 }}>{b.projectedPass ? 'Passing.' : 'Failing.'}</span>
                            </div>
                            <div style={{ color: b.projectedPass ? T.mint : T.red, fontSize: 11, marginTop: 8, fontWeight: 600 }}>
                              {b.projectedPass ? 'Would pass if voting closed now.' : 'Would fail if voting closed now - flag issues.'}
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ padding: '16px 24px', display: 'flex', gap: 12, background: 'rgba(0,0,0,0.1)' }}>
                          <button 
                            onClick={() => vote(b.id, 'yea')} 
                            disabled={!!busy}
                            style={{ padding: '8px 24px', background: 'transparent', border: `1px solid ${T.mint}`, color: T.mint, borderRadius: 4, fontSize: 11, fontFamily: MONO, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', transition: 'background 0.15s ease' }}
                            onMouseEnter={(e) => { if(!busy) e.currentTarget.style.background = `${T.mint}15`; }}
                            onMouseLeave={(e) => { if(!busy) e.currentTarget.style.background = 'transparent'; }}
                          >
                            Vote Aye
                          </button>
                          <button 
                            onClick={() => vote(b.id, 'nay')} 
                            disabled={!!busy}
                            style={{ padding: '8px 24px', background: 'transparent', border: `1px solid ${T.red}`, color: T.red, borderRadius: 4, fontSize: 11, fontFamily: MONO, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', transition: 'background 0.15s ease' }}
                            onMouseEnter={(e) => { if(!busy) e.currentTarget.style.background = `${T.red}15`; }}
                            onMouseLeave={(e) => { if(!busy) e.currentTarget.style.background = 'transparent'; }}
                          >
                            Vote Nay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* IN COMMITTEE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ ...stampStyle, color: T.muted }}>IN COMMITTEE</div>
              </div>
              <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ color: T.ivory, fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Nothing in committee</div>
                <div style={{ color: T.faint, fontSize: 12, fontStyle: 'italic' }}>Propose a law to send it to committee first for debate and refinement.</div>
              </div>
            </div>

            {/* UPCOMING AGENDA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ ...stampStyle, color: T.muted }}>UPCOMING AGENDA</div>
              </div>
              <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ color: T.ivory, fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Nothing on the agenda</div>
                <div style={{ color: T.faint, fontSize: 12, fontStyle: 'italic' }}>Cleared measures await the floor automatically on their scheduled month.</div>
              </div>
            </div>

          </div>

          {/* Right Column: LEGISLATIVE HISTORY */}
          <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ ...stampStyle, color: T.muted }}>LEGISLATIVE HISTORY</div>
            </div>
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 0' }}>
              {historyBills.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: T.faint, fontSize: 13, fontStyle: 'italic' }}>
                  No past bills to display.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {historyBills.map((b, i) => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderTop: i > 0 ? `1px solid ${T.border}` : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ color: T.ivory, fontSize: 13, fontWeight: 600 }}>{b.title || b.name || 'Legislative Bill'}</div>
                        <div style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase' }}>Proposed Arc: {b.proposed_arc}</div>
                      </div>
                      <div style={{ 
                        color: b.status === 'passed' ? T.mint : T.red, 
                        fontSize: 10, 
                        fontWeight: 700, 
                        fontFamily: MONO, 
                        textTransform: 'uppercase' 
                      }}>
                        {b.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
