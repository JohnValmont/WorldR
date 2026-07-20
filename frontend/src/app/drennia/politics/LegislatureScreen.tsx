'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { JURISDICTION_MODEL } from './_lib/model';
import { T, MONO, HEADING, SANS, stampStyle, glassPanelStyle } from './_lib/theme';
import { formatGameDate } from '@/lib/calendar';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Scroll, Shield, Building2, Gavel, FileText, CheckCircle2, XCircle, ChevronRight, Inbox, Vote } from 'lucide-react';

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

// ── Glass Panel Component ──
function GlassPanel({ title, children, accent, flex }: { title: React.ReactNode, children: React.ReactNode, accent?: string, flex?: number | string }) {
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
      {title && (
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid rgba(255,255,255,0.05)', 
          fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: accent || T.faint,
          background: 'rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          {title}
        </div>
      )}
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// ── OLED Interactive Button ──
function OledBtn({ label, onClick, primary, disabled, tone = T.mint }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean; tone?: string }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        padding: '10px 16px', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        fontSize: 12, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase',
        background: primary ? (hover ? `${tone}25` : `${tone}15`) : (hover ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'),
        color: primary ? tone : T.ivory,
        border: `1px solid ${primary ? tone : 'rgba(255,255,255,0.1)'}`,
        boxShadow: primary ? `0 0 16px ${tone}40` : 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8
      }}>
      {label}
    </button>
  );
}

function StatBox({ label, value, accent }: { label: string, value: React.ReactNode, accent?: string }) {
  return (
    <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: `1px solid rgba(255,255,255,0.05)`, borderTop: accent ? `1px solid ${accent}` : undefined, borderRadius: 8, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8, transition: 'background 0.2s ease', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: accent ? `linear-gradient(180deg, ${accent}10 0%, transparent 100%)` : 'transparent', pointerEvents: 'none' }} />
      <div style={{ ...stampStyle, fontSize: 10, color: T.faint, zIndex: 1 }}>{label}</div>
      <div style={{ color: T.ivory, fontSize: 24, fontWeight: 700, fontFamily: MONO, zIndex: 1 }}>{value}</div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24, fontFamily: SANS }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      {/* ── OLED ASSEMBLY HERO ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 24,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(10,15,30,0.95) 100%)',
        border: `1px solid rgba(255,255,255,0.05)`,
        borderRadius: 16,
        padding: '32px 36px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 32px rgba(0,0,0,0.5)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none',
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', zIndex: 1 }}>
          <div style={{ ...stampStyle, color: T.gold, fontSize: 11, letterSpacing: '0.15em', borderColor: 'rgba(255,215,0,0.3)' }}>THE LEGISLATURE</div>
          <h1 style={{ color: T.ivory, fontSize: 36, fontWeight: 800, fontFamily: HEADING, margin: 0, letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
            {assemblyType} <span style={{ color: T.muted, fontWeight: 400 }}>of {jurisdiction?.name || 'the Jurisdiction'}</span>
          </h1>
          <div style={{ color: T.faint, fontSize: 13, marginTop: 4 }}>
            The chamber where bills are proposed, debated, and voted into law.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <StatBox label="CURRENT SESSION" value={monthYear} accent={T.blueLine} />
          <StatBox label="TOTAL SEATS" value={totalSeats} />
          <StatBox label="OVERALL MAJORITY" value={majority} />
          <StatBox label="GOVERNMENT BLOC" value={councilData?.premier?.partyName || '--'} accent={T.gold} />
        </div>
      </div>

      {err && (
        <div style={{ padding: '16px 20px', background: `${T.red}15`, border: `1px solid ${T.red}40`, color: T.red, borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
          <XCircle size={16} /> {err}
        </div>
      )}

      {isLocked ? (
        <GlassPanel title={<><Shield size={14} /> Locked</>}>
          <div style={{ color: T.faint, fontStyle: 'italic' }}>The {jurisdiction?.name} legislature is not currently in session.</div>
        </GlassPanel>
      ) : (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          {/* Left Column (Main Content) */}
          <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* ON THE FLOOR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ ...stampStyle, color: T.muted }}>ON THE FLOOR</div>
              </div>

              {proposedBills.length === 0 ? (
                <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px dashed rgba(255,255,255,0.1)`, borderRadius: 12, padding: 60, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <Scroll size={32} color={T.muted} opacity={0.5} />
                  <div>
                    <div style={{ color: T.ivory, fontWeight: 600, fontSize: 15, fontFamily: HEADING, marginBottom: 4 }}>Nothing on the floor</div>
                    <div style={{ color: T.faint, fontSize: 13, fontStyle: 'italic' }}>No bills are currently being debated or voted on.</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {proposedBills.map((b: any) => {
                    const total = (b.tally?.yea || 0) + (b.tally?.nay || 0) + (b.tally?.abstain || 0);
                    const pYea = total > 0 ? ((b.tally?.yea || 0) / total) * 100 : 0;
                    const pNay = total > 0 ? ((b.tally?.nay || 0) / total) * 100 : 0;
                    const pAbstain = total > 0 ? ((b.tally?.abstain || 0) / total) * 100 : 100;
                    
                    return (
                      <GlassPanel key={b.id} title={<><Gavel size={14} /> Legislative Bill</>} accent={T.blueLine}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div style={{ color: T.ivory, fontWeight: 700, fontSize: 20, fontFamily: HEADING }}>{b.title || b.name || 'Legislative Bill'}</div>
                          <div style={{ color: T.faint, fontSize: 12, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={12} /> By: The Assembly</div>
                        </div>
                        <div style={{ color: T.faint, fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                          {b.description || 'An act to amend the jurisdiction policies, with effect from the next session.'}
                        </div>

                        {/* Whip Bar */}
                        <div style={{ marginBottom: 24, padding: '20px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                            <div style={{ ...stampStyle, fontSize: 10, color: T.gold, borderColor: 'rgba(255,215,0,0.3)' }}>WHIP ESTIMATE</div>
                            <div style={{ color: b.projectedPass ? T.mint : T.red, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {b.projectedPass ? <><CheckCircle2 size={14} /> Passing</> : <><XCircle size={14} /> Failing</>}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', marginBottom: 16 }}>
                            <div style={{ width: `${pYea}%`, background: T.mint, boxShadow: `0 0 12px ${T.mint}80`, transition: 'width 0.5s ease' }} />
                            <div style={{ width: `${pAbstain}%`, background: T.muted, transition: 'width 0.5s ease' }} />
                            <div style={{ width: `${pNay}%`, background: T.red, boxShadow: `0 0 12px ${T.red}80`, transition: 'width 0.5s ease' }} />
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontFamily: MONO }}>
                            <div style={{ display: 'flex', gap: 16 }}>
                              <span style={{ color: T.mint, fontWeight: 700 }}>AYE {b.tally?.yea || 0}</span>
                              <span style={{ color: T.muted }}>ABS {b.tally?.abstain || 0}</span>
                              <span style={{ color: T.red, fontWeight: 700 }}>NAY {b.tally?.nay || 0}</span>
                            </div>
                            <span style={{ color: T.ivory, opacity: 0.8 }}>{majority} to pass</span>
                          </div>
                          <div style={{ color: b.projectedPass ? T.mint : T.red, fontSize: 11, marginTop: 12, fontWeight: 500, fontStyle: 'italic', opacity: 0.8 }}>
                            {b.projectedPass ? 'This bill would pass if voting closed now.' : 'This bill would fail if voting closed now. Flag issues.'}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <OledBtn label="Vote Aye" tone={T.mint} primary onClick={() => vote(b.id, 'yea')} disabled={!!busy} />
                          <OledBtn label="Vote Nay" tone={T.red} primary onClick={() => vote(b.id, 'nay')} disabled={!!busy} />
                        </div>
                      </GlassPanel>
                    );
                  })}
                </div>
              )}
            </div>

            {/* IN COMMITTEE & UPCOMING AGENDA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ ...stampStyle, color: T.muted }}>IN COMMITTEE</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px dashed rgba(255,255,255,0.1)`, borderRadius: 12, padding: '32px 24px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ color: T.ivory, fontWeight: 600, fontSize: 14, fontFamily: HEADING, marginBottom: 8 }}>Nothing in committee</div>
                  <div style={{ color: T.faint, fontSize: 12, fontStyle: 'italic' }}>Propose a law to send it to committee first for debate and refinement.</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ ...stampStyle, color: T.muted }}>UPCOMING AGENDA</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px dashed rgba(255,255,255,0.1)`, borderRadius: 12, padding: '32px 24px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ color: T.ivory, fontWeight: 600, fontSize: 14, fontFamily: HEADING, marginBottom: 8 }}>Nothing on the agenda</div>
                  <div style={{ color: T.faint, fontSize: 12, fontStyle: 'italic' }}>Cleared measures await the floor automatically on their scheduled month.</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: LEGISLATIVE HISTORY */}
          <div style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ ...stampStyle, color: T.muted }}>LEGISLATIVE HISTORY</div>
            </div>
            
            <div style={{
              background: 'linear-gradient(145deg, rgba(18, 20, 26, 0.7) 0%, rgba(10, 12, 16, 0.9) 100%)',
              border: `1px solid rgba(255, 255, 255, 0.08)`,
              borderRadius: 12,
              overflow: 'hidden'
            }}>
              {historyBills.length === 0 ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: T.faint, fontSize: 13, fontStyle: 'italic', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <Inbox size={24} opacity={0.5} />
                  No past bills to display.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {historyBills.map((b, i) => {
                    const isPassed = b.status === 'passed';
                    const tone = isPassed ? T.mint : T.red;
                    
                    return (
                      <div key={b.id} style={{ 
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', 
                        padding: '16px 20px', 
                        borderTop: i > 0 ? `1px solid rgba(255,255,255,0.05)` : 'none',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, paddingRight: 12 }}>
                          <div style={{ color: T.ivory, fontSize: 14, fontWeight: 600, fontFamily: HEADING }}>{b.title || b.name || 'Legislative Bill'}</div>
                          <div style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <FileText size={10} /> Proposed Arc: {b.proposed_arc}
                          </div>
                        </div>
                        <div style={{ 
                          color: tone, 
                          background: `${tone}15`,
                          border: `1px solid ${tone}40`,
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 10, 
                          fontWeight: 700, 
                          fontFamily: MONO, 
                          textTransform: 'uppercase',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          {isPassed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {b.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
