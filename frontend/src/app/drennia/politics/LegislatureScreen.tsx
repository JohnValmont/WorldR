'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, stampStyle } from './_lib/theme';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Landmark, CheckCircle, XCircle, MinusCircle, Scroll, Gavel, Shield } from 'lucide-react';

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

function GlassPanel({ title, children, icon: Icon }: { title: React.ReactNode; children: React.ReactNode; icon?: any }) {
  return (
    <div style={{
      background: `linear-gradient(145deg, ${T.panel} 0%, rgba(20,20,20,0.8) 100%)`,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        {Icon && <Icon size={20} color={T.gold} />}
        <div style={{ ...stampStyle, fontSize: 14, letterSpacing: '0.1em' }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function PremiumBtn({ label, onClick, primary, disabled, icon: Icon, color, fullWidth }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean; icon?: any; color?: string; fullWidth?: boolean }) {
  const baseColor = color || (primary ? T.gold : T.ivory);
  const bgColor = primary ? `${baseColor}20` : 'transparent';
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '10px 18px',
      borderRadius: 6,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontSize: 13,
      fontWeight: 700,
      fontFamily: MONO,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      background: bgColor,
      color: baseColor,
      border: `1px solid ${primary ? baseColor : T.border}`,
      transition: 'all 0.2s ease',
      width: fullWidth ? '100%' : 'auto'
    }}
    onMouseEnter={(e) => { if(!disabled) e.currentTarget.style.background = `${baseColor}30`; }}
    onMouseLeave={(e) => { if(!disabled) e.currentTarget.style.background = bgColor; }}
    >
      {Icon && <Icon size={16} />}
      {label}
    </button>
  );
}

export default function LegislatureScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, character, parties, onRefresh }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const { data, mutate } = useSWR(isLocked ? null : ['bills', selectedJurisdictionId], () => politicsApi.getBills(selectedJurisdictionId).catch(() => null));
  const [rate, setRate] = useState(20);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const bills: any[] = Array.isArray(data?.bills) ? data.bills : [];
  const activePolicy = data?.activePolicy;
  const myParty = Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id) : undefined;

  async function refresh() { await mutate(); if (onRefresh) await onRefresh(); }
  async function propose() {
    try { setBusy('propose'); setErr(null); await politicsApi.proposeBill('industry_tax', { rate: rate / 100 }, selectedJurisdictionId); await refresh(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || 'Failed to propose'); } finally { setBusy(null); }
  }
  
  async function vote(id: string, v: 'yea' | 'nay') {
    try { setBusy(id + v); setErr(null); await politicsApi.voteBill(id, v); await refresh(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || 'Failed to vote'); } finally { setBusy(null); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 16 }}>
        <div style={{ padding: 16, background: `${T.gold}15`, borderRadius: 12, border: `1px solid ${T.gold}40` }}>
          <Landmark size={32} color={T.gold} />
        </div>
        <div>
          <div style={{ ...stampStyle, color: T.gold }}>Legislature · {jurisdiction?.name}</div>
          <h1 style={{ color: T.ivory, fontSize: 32, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-0.02em' }}>The Chamber</h1>
        </div>
      </div>

      {isLocked ? (
        <GlassPanel title="Chamber Locked" icon={Shield}>
          <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 15 }}>The {jurisdiction?.name} legislature is not currently in session.</div>
        </GlassPanel>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <GlassPanel title="Active Policies" icon={Scroll}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, borderLeft: `3px solid ${T.gold}` }}>
                  <div style={{ ...stampStyle, color: T.faint, fontSize: 11, marginBottom: 4 }}>Industry Tax Rate</div>
                  <div style={{ color: T.ivory, fontSize: 32, fontWeight: 800, fontFamily: MONO, textShadow: `0 0 16px ${T.gold}40` }}>
                    {activePolicy ? (Number(activePolicy.industry_tax_rate) * 100).toFixed(1) : '0.0'}%
                  </div>
                  <div style={{ color: T.faint, fontSize: 12, marginTop: 4 }}>Deducted from manufacturing net profits at month-end.</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, borderLeft: `3px solid ${T.muted}` }}>
                  <div style={{ ...stampStyle, color: T.faint, fontSize: 11, marginBottom: 4 }}>Infrastructure Level</div>
                  <div style={{ color: T.ivory, fontSize: 22, fontWeight: 700 }}>Level {activePolicy?.infrastructure_level ?? 1}</div>
                </div>
              </div>
            </GlassPanel>

            {myParty && (
              <GlassPanel title="Draft Proposal" icon={Gavel}>
                <div style={{ color: T.muted, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
                  Set the industry tax rate for the jurisdiction. Proposals require a simple majority to pass and become active at the start of the next arc.
                </div>
                
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px 16px', borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ color: T.faint, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Proposed Rate</span>
                    <span style={{ color: T.gold, fontFamily: MONO, fontSize: 18, fontWeight: 700 }}>{rate}%</span>
                  </div>
                  <input 
                    type="range" min={0} max={60} value={rate} 
                    onChange={(e) => setRate(Number(e.target.value))} 
                    style={{ width: '100%', accentColor: T.gold, cursor: 'pointer', height: 6 }} 
                  />
                </div>

                <PremiumBtn 
                  fullWidth
                  label={busy === 'propose' ? 'Drafting...' : 'Submit to Floor'} 
                  primary 
                  icon={Scroll}
                  onClick={propose} 
                  disabled={busy === 'propose'} 
                />
              </GlassPanel>
            )}
          </div>

          <GlassPanel title="On The Floor" icon={Landmark}>
            {bills.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: `1px dashed ${T.border}` }}>
                <Scroll size={32} color={T.muted} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 14 }}>No bills are currently on the floor.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {bills.map((b: any) => {
                  const total = (b.tally?.yea || 0) + (b.tally?.nay || 0) + (b.tally?.abstain || 0);
                  const pYea = total > 0 ? ((b.tally?.yea || 0) / total) * 100 : 0;
                  const pNay = total > 0 ? ((b.tally?.nay || 0) / total) * 100 : 0;
                  const pAbstain = total > 0 ? ((b.tally?.abstain || 0) / total) * 100 : 100;
                  
                  return (
                    <div key={b.id} style={{ 
                      background: 'rgba(0,0,0,0.4)', 
                      border: `1px solid ${b.projectedPass ? T.mint : T.red}40`, 
                      borderRadius: 8, 
                      padding: 20,
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        position: 'absolute', top: 0, right: 0, 
                        background: b.projectedPass ? `${T.mint}20` : `${T.red}20`,
                        color: b.projectedPass ? T.mint : T.red,
                        padding: '4px 12px',
                        borderBottomLeftRadius: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {b.projectedPass ? 'Projected: Pass' : 'Projected: Fail'}
                      </div>

                      <div style={{ color: T.ivory, fontWeight: 700, fontSize: 16, marginBottom: 4, paddingRight: 100 }}>
                        {b.title || b.name || 'Legislative Bill'}
                      </div>
                      <div style={{ color: T.faint, fontSize: 12, marginBottom: 16 }}>
                        Proposed Arc: {b.proposed_arc}
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: MONO, marginBottom: 6, fontWeight: 600 }}>
                          <span style={{ color: T.mint, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12}/> Yea {b.tally?.yea || 0}</span>
                          <span style={{ color: T.faint, display: 'flex', alignItems: 'center', gap: 4 }}><MinusCircle size={12}/> Abstain {b.tally?.abstain || 0}</span>
                          <span style={{ color: T.red, display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={12}/> Nay {b.tally?.nay || 0}</span>
                        </div>
                        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: T.panel, gap: 2 }}>
                          <div style={{ width: `${pYea}%`, background: T.mint, transition: 'width 0.5s ease' }} />
                          <div style={{ width: `${pAbstain}%`, background: T.muted, transition: 'width 0.5s ease' }} />
                          <div style={{ width: `${pNay}%`, background: T.red, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <PremiumBtn 
                            fullWidth
                            label={busy === b.id + 'yea' ? '...' : 'Vote Yea'} 
                            primary color={T.mint} icon={CheckCircle}
                            onClick={() => vote(b.id, 'yea')} 
                            disabled={!!busy} 
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <PremiumBtn 
                            fullWidth
                            label={busy === b.id + 'nay' ? '...' : 'Vote Nay'} 
                            primary color={T.red} icon={XCircle}
                            onClick={() => vote(b.id, 'nay')} 
                            disabled={!!busy} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassPanel>

        </div>
      )}
      {err && (
        <div style={{ padding: 12, background: `${T.red}20`, border: `1px solid ${T.red}40`, color: T.red, borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <XCircle size={16} /> {err}
        </div>
      )}
    </div>
  );
}
