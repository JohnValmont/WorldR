import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, HEADING, SANS, stampStyle, glassPanelStyle } from './_lib/theme';
import { POLICY_CATALOG, PolicyCategoryDef } from './_lib/macroEconomy';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Shield, FileText, Settings, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

interface Props {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  character: any;
  parties: any[];
  myAp?: { current_ap: number; ap_cap: number };
  myPc?: { current_pc: number; pc_cap: number };
  onRefresh?: () => void;
}

// ── OLED Interactive Button ──
function OledBtn({ label, onClick, primary, disabled, tone = T.mint, icon: Icon }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean; tone?: string, icon?: any }) {
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
        boxShadow: primary && hover ? `0 0 16px ${tone}40` : 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8
      }}>
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
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
          padding: '10px 14px', 
          borderBottom: '1px solid rgba(255,255,255,0.05)', 
          fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: accent || T.faint,
          background: 'rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          {title}
        </div>
      )}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

export default function PolicyScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, overview, character, parties, onRefresh, myAp, myPc }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const { data, mutate } = useSWR(isLocked ? null : ['bills', selectedJurisdictionId], () => politicsApi.getBills(selectedJurisdictionId).catch(() => null));
  const [targetOption, setTargetOption] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activeProposal, setActiveProposal] = useState<string | null>(null);

  const activePolicies = data?.activePolicy?.active_policies || {};
  const myParty = overview?.globalParty || (Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id || p.members?.some((m: any) => m.character_id === character?.id || m.id === character?.id)) : undefined);

  async function refresh() { await mutate(); if (onRefresh) await onRefresh(); }
  
  async function propose(category: string) {
    if (!targetOption) return;
    try { 
      setBusy('propose'); 
      setErr(null); 
      await politicsApi.proposeBill('policy_change', { category, option: targetOption }, selectedJurisdictionId); 
      await refresh(); 
      setActiveProposal(null);
    } catch (e: any) { 
      setErr(e?.response?.data?.error || e?.response?.data?.message || 'Failed to propose'); 
    } finally { 
      setBusy(null); 
    }
  }

  const policies = POLICY_CATALOG;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 24, fontFamily: SANS }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      {/* ── POLICY HERO (compact) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10,12,20,0.7)',
        border: `1px solid rgba(255,255,255,0.06)`,
        borderRadius: 10,
        padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.faint, fontWeight: 600 }}>Policy Desk</div>
          <h1 style={{ color: T.ivory, fontSize: 18, fontWeight: 700, fontFamily: HEADING, margin: 0, letterSpacing: '-0.02em' }}>
            Active Directives <span style={{ color: T.muted, fontWeight: 400, fontSize: 14 }}>· {jurisdiction?.name}</span>
          </h1>
          <div style={{ color: T.faint, fontSize: 12 }}>
            Policies in force. Party Leaders may propose changes.
          </div>
        </div>
      </div>

      {isLocked ? (
        <GlassPanel title={<><Shield size={14} /> Locked</>}>
          <div style={{ color: T.faint, fontStyle: 'italic' }}>The {jurisdiction?.name} policy desk is not yet open.</div>
        </GlassPanel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {policies.map((pol) => {
            const isProposing = activeProposal === pol.id;

            return (
              <div key={pol.id} style={{
                background: isProposing ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'linear-gradient(145deg, rgba(18, 20, 26, 0.7) 0%, rgba(10, 12, 16, 0.9) 100%)',
                border: `1px solid ${isProposing ? T.blueLine : 'rgba(255, 255, 255, 0.08)'}`,
                boxShadow: isProposing ? `0 4px 32px ${T.blueLine}40` : '0 4px 24px rgba(0,0,0,0.4)',
                borderRadius: 12,
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex', flexDirection: 'column'
              }}>
                {/* Main Card */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', gap: 16, position: 'relative' }}>
                  
                  {/* Title & Desc */}
                  <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={13} color={isProposing ? T.blueBright : T.muted} />
                      <span style={{ color: isProposing ? T.ivory : T.text, fontWeight: 600, fontSize: 14, fontFamily: HEADING }}>{pol.name}</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: '0 0 auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: T.muted, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>In Force</span>
                      <span style={{ background: `${T.blueLine}15`, border: `1px solid ${T.blueLine}40`, color: T.blueBright, padding: '4px 8px', borderRadius: 4, fontSize: 11, fontFamily: MONO, fontWeight: 700, textShadow: `0 0 12px ${T.blueBright}80` }}>
                        {(pol.options.find(o => o.id === activePolicies[pol.id])?.name || activePolicies[pol.id] || 'None').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ flex: '0 0 120px', display: 'flex', justifyContent: 'flex-end' }}>
                    {!!myParty && !isProposing && (
                      <OledBtn label="Propose" tone={T.blueBright} onClick={() => { setActiveProposal(pol.id); setTargetOption(activePolicies[pol.id]); setErr(null); }} />
                    )}
                    {isProposing && (
                      <button onClick={() => setActiveProposal(null)} style={{
                        background: 'transparent', color: T.muted, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: MONO, textTransform: 'uppercase'
                      }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Control Console (Expandable) */}
                {isProposing && (
                  <div style={{ 
                    padding: '12px 16px', 
                    background: 'rgba(0,0,0,0.4)', 
                    borderTop: `1px solid rgba(255,255,255,0.05)`, 
                    display: 'flex', flexDirection: 'column', gap: 12 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Settings size={14} color={T.gold} />
                      <span style={{ ...stampStyle, color: T.gold, borderColor: 'rgba(255,215,0,0.3)', fontSize: 10 }}>DRAFTING PROPOSAL</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                      {!!myParty && isProposing && (
                        <div style={{ padding: '16px 18px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {pol.options.map(opt => (
                              <button key={opt.id} onClick={() => setTargetOption(opt.id)}
                                style={{
                                  padding: '8px 12px', borderRadius: 6,
                                  background: targetOption === opt.id ? `${T.blueBright}20` : 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${targetOption === opt.id ? T.blueBright : 'rgba(255,255,255,0.1)'}`,
                                  color: targetOption === opt.id ? T.ivory : T.muted,
                                  fontSize: 12, fontWeight: targetOption === opt.id ? 700 : 500,
                                  cursor: 'pointer'
                                }}>
                                {opt.name.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Submit Module */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 180 }}>
                        <OledBtn 
                          label={busy === 'propose' ? 'Proposing...' : 'Submit Reform (2 AP, 2 PC)'} 
                          icon={busy === 'propose' ? undefined : CheckCircle2}
                          tone={T.gold} 
                          primary 
                          onClick={() => propose(pol.id)} 
                          disabled={
                            busy === 'propose' || 
                            targetOption === activePolicies[pol.id] ||
                            (myAp?.current_ap ?? 0) < 2 ||
                            (myPc?.current_pc ?? 0) < 2
                          } 
                        />
                        {err && <div style={{ color: T.red, fontSize: 11, fontFamily: MONO, textAlign: 'center' }}>{err}</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

