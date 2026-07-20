'use client';
import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, HEADING, SANS, stampStyle, glassPanelStyle } from './_lib/theme';
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

export default function PolicyScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, character, parties, onRefresh }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const { data, mutate } = useSWR(isLocked ? null : ['bills', selectedJurisdictionId], () => politicsApi.getBills(selectedJurisdictionId).catch(() => null));
  const [rate, setRate] = useState(20);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activeProposal, setActiveProposal] = useState<string | null>(null);

  const activePolicy = data?.activePolicy;
  const myParty = Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id) : undefined;

  useEffect(() => {
    if (activePolicy) {
      setRate(Math.round(Number(activePolicy.industry_tax_rate) * 100) || 20);
    }
  }, [activePolicy]);

  async function refresh() { await mutate(); if (onRefresh) await onRefresh(); }
  
  async function propose() {
    try { 
      setBusy('propose'); 
      setErr(null); 
      await politicsApi.proposeBill('industry_tax', { rate: rate / 100 }, selectedJurisdictionId); 
      await refresh(); 
      setActiveProposal(null);
    } catch (e: any) { 
      setErr(e?.response?.data?.error || e?.response?.data?.message || 'Failed to propose'); 
    } finally { 
      setBusy(null); 
    }
  }

  const policies = [
    {
      id: 'industry_tax',
      title: 'Industry Tax Rate',
      type: 'SPECTRUM',
      description: 'Determines the percentage of net profits deducted from manufacturing corporations at month-end.',
      currentValue: activePolicy ? `${(Number(activePolicy.industry_tax_rate) * 100).toFixed(1)}%` : '0.0%',
      effects: <><CheckCircle2 size={12} color={T.mint} /> Treasury Revenue</>,
      canPropose: !!myParty,
    },
    {
      id: 'infrastructure',
      title: 'Infrastructure Level',
      type: 'TIERED',
      description: 'The overall level of public infrastructure, affecting transportation and logistics efficiency.',
      currentValue: `Level ${activePolicy?.infrastructure_level ?? 1}`,
      effects: <><CheckCircle2 size={12} color={T.mint} /> Logistics Bonus</>,
      canPropose: false,
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24, fontFamily: SANS }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      {/* ── OLED POLICY HERO ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 16,
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
          <div style={{ ...stampStyle, color: T.gold, fontSize: 11, letterSpacing: '0.15em', borderColor: 'rgba(255,215,0,0.3)' }}>THE POLICY DESK</div>
          <h1 style={{ color: T.ivory, fontSize: 36, fontWeight: 800, fontFamily: HEADING, margin: 0, letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
            Active Directives <span style={{ color: T.muted, fontWeight: 400 }}>of {jurisdiction?.name}</span>
          </h1>
          <div style={{ color: T.faint, fontSize: 14, marginTop: 4 }}>
            Every policy currently in force across the jurisdiction. Party Leaders may propose legislative changes.
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
                <div style={{ display: 'flex', alignItems: 'center', padding: '24px 28px', gap: 24, position: 'relative' }}>
                  
                  {/* Title & Desc */}
                  <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={16} color={isProposing ? T.blueBright : T.muted} />
                      <span style={{ color: isProposing ? T.ivory : T.text, fontWeight: 700, fontSize: 18, fontFamily: HEADING }}>{pol.title}</span>
                    </div>
                    <div style={{ color: T.faint, fontSize: 13, lineHeight: 1.5 }}>{pol.description}</div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: '0 0 auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: T.muted, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Type</span>
                      <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: T.text, padding: '4px 8px', borderRadius: 4, fontSize: 11, fontFamily: MONO, fontWeight: 600 }}>{pol.type}</span>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: T.muted, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>In Force</span>
                      <span style={{ background: `${T.blueLine}15`, border: `1px solid ${T.blueLine}40`, color: T.blueBright, padding: '4px 8px', borderRadius: 4, fontSize: 11, fontFamily: MONO, fontWeight: 700, textShadow: `0 0 12px ${T.blueBright}80` }}>{pol.currentValue}</span>
                    </div>
                  </div>

                  {/* Effects */}
                  <div style={{ flex: '0 0 160px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: T.muted, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Primary Effect</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.ivory, fontSize: 12, fontWeight: 600 }}>{pol.effects}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ flex: '0 0 120px', display: 'flex', justifyContent: 'flex-end' }}>
                    {pol.canPropose && !isProposing && (
                      <OledBtn label="Propose" tone={T.blueBright} onClick={() => { setActiveProposal(pol.id); setErr(null); }} />
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
                    padding: '24px 28px', 
                    background: 'rgba(0,0,0,0.4)', 
                    borderTop: `1px solid rgba(255,255,255,0.05)`, 
                    display: 'flex', flexDirection: 'column', gap: 20 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Settings size={14} color={T.gold} />
                      <span style={{ ...stampStyle, color: T.gold, borderColor: 'rgba(255,215,0,0.3)', fontSize: 10 }}>DRAFTING PROPOSAL</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                      {/* Slider Track */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: T.ivory, fontSize: 14, fontWeight: 700, fontFamily: MONO }}>
                          <span>0%</span>
                          <span style={{ color: T.gold, textShadow: `0 0 12px ${T.gold}80` }}>Target: {rate}%</span>
                          <span>60%</span>
                        </div>
                        <input 
                          type="range" min="0" max="60" value={rate} 
                          onChange={(e) => setRate(Number(e.target.value))} 
                          style={{ 
                            width: '100%', 
                            height: 6,
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: 3,
                            outline: 'none',
                            appearance: 'none',
                            cursor: 'ew-resize'
                          }} 
                        />
                      </div>
                      
                      {/* Submit Module */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 160 }}>
                        <OledBtn 
                          label={busy === 'propose' ? 'Drafting...' : 'Submit to Floor'} 
                          icon={busy === 'propose' ? undefined : Zap}
                          tone={T.gold} 
                          primary 
                          onClick={propose} 
                          disabled={busy === 'propose'} 
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
