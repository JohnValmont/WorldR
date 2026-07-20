'use client';
import React from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, HEADING, SANS, stampStyle, glassPanelStyle } from './_lib/theme';
import { JURISDICTION_MODEL } from './_lib/model';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Shield, Users, Landmark, FileSignature, AlertCircle, CheckCircle2 } from 'lucide-react';

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

const PALETTE = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

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

export default function AssemblyScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, parties }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const jModel = JURISDICTION_MODEL[selectedJurisdictionId] || JURISDICTION_MODEL.national;
  const { data } = useSWR(isLocked ? null : ['council', selectedJurisdictionId], () => politicsApi.getCouncil(selectedJurisdictionId).catch(() => null));
  const { data: coalitionData } = useSWR<{ coalition: any; agreement: any; partners?: any[] } | null>(isLocked ? null : ['coalition-agreement', selectedJurisdictionId], () => politicsApi.getCoalitionAgreement(selectedJurisdictionId).catch(() => null));

  const partySeats: any[] = Array.isArray(data?.partySeats) ? data.partySeats.filter((p: any) => p.seats > 0) : [];
  const totalSeats = jModel.seats;
  const occupiedSeats = partySeats.reduce((s: number, p: any) => s + Number(p.seats || 0), 0);
  const majority = jModel.majority;
  const premier = data?.premier;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24, fontFamily: SANS }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      {/* ── OLED ASSEMBLY HERO ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 24,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(10,15,30,0.95) 100%)',
        border: `1px solid rgba(255,255,255,0.05)`,
        borderRadius: 16,
        padding: '14px 18px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 32px rgba(0,0,0,0.5)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none',
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', zIndex: 1 }}>
          <div style={{ ...stampStyle, color: T.gold, fontSize: 11, letterSpacing: '0.15em', borderColor: 'rgba(255,215,0,0.3)' }}>THE CHAMBER</div>
          <h1 style={{ color: T.ivory, fontSize: 20, fontWeight: 700, fontFamily: HEADING, margin: 0, letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
            {jModel.tier === 'state' ? 'State Assembly' : 'National Parliament'} <span style={{ color: T.muted, fontWeight: 400 }}>of {jModel.name}</span>
          </h1>
          <div style={{ color: T.faint, fontSize: 13, marginTop: 4 }}>
            The composition of the legislature and the current ruling government.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, position: 'relative', zIndex: 1, flexWrap: 'wrap', marginTop: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Seats</span>
            <span style={{ color: T.ivory, fontSize: 24, fontWeight: 700, fontFamily: MONO }}>{totalSeats}</span>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Majority Needed</span>
            <span style={{ color: T.ivory, fontSize: 24, fontWeight: 700, fontFamily: MONO }}>{majority}</span>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Occupied Seats</span>
            <span style={{ color: occupiedSeats >= majority ? T.mint : T.warning, fontSize: 24, fontWeight: 700, fontFamily: MONO }}>{occupiedSeats}</span>
          </div>
        </div>
      </div>

      {isLocked ? (
        <GlassPanel title={<><Shield size={14} /> Locked</>}>
          <div style={{ color: T.faint, fontStyle: 'italic' }}>The {jurisdiction?.name} assembly is not yet open.</div>
        </GlassPanel>
      ) : partySeats.length === 0 ? (
        <GlassPanel title={<><Landmark size={14} /> The Chamber</>}>
          <div style={{ color: T.faint, fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>The chamber is empty. Seats are filled at the next election.</div>
        </GlassPanel>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          
          <GlassPanel title={<><Landmark size={14} /> Composition</>} accent={T.blueLine}>
            {/* Glowing Seat Visualizer */}
            <div style={{ 
              display: 'flex', flexWrap: 'wrap', gap: 8, padding: '28px', 
              background: 'rgba(0,0,0,0.5)', 
              borderRadius: 12, 
              border: `1px solid rgba(255,255,255,0.05)`, 
              boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)' 
            }}>
              {Array.from({ length: totalSeats }).map((_, i) => {
                let currentOffset = 0;
                let seatColor = 'rgba(255,255,255,0.05)'; // Empty seat
                let seatGlow = 'none';
                let seatTitle = 'Vacant';
                
                for (let partyIdx = 0; partyIdx < partySeats.length; partyIdx++) {
                  const p = partySeats[partyIdx];
                  if (i >= currentOffset && i < currentOffset + p.seats) {
                    seatColor = PALETTE[partyIdx % PALETTE.length];
                    seatGlow = `0 0 12px ${seatColor}80, inset 0 1px 2px rgba(255,255,255,0.4)`;
                    seatTitle = p.name;
                    break;
                  }
                  currentOffset += p.seats;
                }

                return (
                  <div 
                    key={i} 
                    title={seatTitle}
                    style={{ 
                      flex: '1 0 calc(10% - 8px)', // 10 per row
                      minWidth: 20,
                      height: 28, 
                      background: seatColor,
                      borderRadius: 4,
                      boxShadow: seatGlow,
                      border: seatColor === 'rgba(255,255,255,0.05)' ? '1px dashed rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.5)',
                      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'help'
                    }} 
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                  />
                );
              })}
            </div>

            {/* Seat Legend */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 24 }}>
              {partySeats.map((p: any, i: number) => {
                const color = PALETTE[i % PALETTE.length];
                return (
                  <div key={p.partyId || i} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, boxShadow: `0 0 8px ${color}60` }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: T.ivory, fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                        {p.abbreviation && <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase' }}>[{p.abbreviation}]</span>}
                      </div>
                    </div>
                    <span style={{ color: color, fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{p.seats}</span>
                  </div>
                );
              })}
            </div>

            {/* Premier Status */}
            {premier && (
              <div style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(255,215,0,0.05)', border: `1px solid rgba(255,215,0,0.2)`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Users size={18} color={T.gold} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ color: T.gold, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Head of Government</span>
                  <div style={{ fontSize: 14 }}>
                    <span style={{ color: T.ivory, fontWeight: 700 }}>{premier.characterName || premier.name || 'Unknown'}</span>
                    <span style={{ color: T.faint, marginLeft: 8 }}>({premier.partyName || 'Independent'})</span>
                  </div>
                </div>
              </div>
            )}
          </GlassPanel>

          {/* Coalition Agreement Panel */}
          {!isLocked && coalitionData?.coalition && (() => {
            const agreement = coalitionData.agreement;
            const coalition = coalitionData.coalition;
            const health = agreement?.health ?? null;
            const healthTone = health == null ? T.faint : health >= 60 ? T.mint : health >= 30 ? T.warning : T.red;
            const statusLabel = agreement?.status === 'under_review' ? 'Under Review' : agreement?.status === 'broken' ? 'Broken' : 'Active';
            const partners: any[] = coalitionData.partners?.length ? coalitionData.partners : Array.isArray(agreement?.partner_terms) ? agreement.partner_terms : [];

            return (
              <GlassPanel title={<><FileSignature size={14} /> Coalition Agreement</>} accent="#8B5CF6">
                
                {/* Header & Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <h3 style={{ color: T.ivory, fontSize: 20, fontWeight: 700, fontFamily: HEADING, margin: 0 }}>Ruling Coalition</h3>
                  <span style={{
                    padding: '4px 12px', borderRadius: 4, fontSize: 10, fontFamily: MONO, letterSpacing: '0.1em',
                    textTransform: 'uppercase', fontWeight: 600,
                    background: agreement?.status === 'broken' ? `${T.red}15` : agreement?.status === 'under_review' ? `${T.warning}15` : `${T.mint}15`,
                    border: `1px solid ${healthTone}40`,
                    color: healthTone,
                    display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    {agreement?.status === 'broken' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                    {statusLabel}
                  </span>
                </div>

                {/* Health bar */}
                {agreement && (
                  <div style={{ marginBottom: 32, padding: '20px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'baseline' }}>
                      <span style={{ color: T.muted, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Agreement Health</span>
                      <span style={{ color: healthTone, fontFamily: MONO, fontSize: 16, fontWeight: 700, textShadow: `0 0 12px ${healthTone}60` }}>{health}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ width: `${health ?? 0}%`, height: '100%', background: healthTone, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: `0 0 12px ${healthTone}` }} />
                    </div>
                    <div style={{ color: T.faint, fontSize: 11, fontStyle: 'italic' }}>
                      {health != null && health >= 60 ? 'Agreement stable — all parties aligned.'
                        : health != null && health >= 30 ? 'Agreement strained — policy review approaching.'
                        : 'Agreement critical — coalition at risk of collapse.'}
                    </div>
                  </div>
                )}

                {/* Member parties */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ ...stampStyle, color: T.faint, fontSize: 10, letterSpacing: '0.1em' }}>MEMBER PARTIES</div>
                  
                  {/* Lead */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ padding: '2px 6px', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', fontFamily: MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 4 }}>Lead</span>
                      <span style={{ color: T.ivory, fontWeight: 700, fontSize: 14 }}>{coalition.lead_party?.name ?? 'Unknown'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: T.faint, fontSize: 11, fontFamily: MONO }}>COHESION</span>
                      <span style={{ color: coalition.lead_party?.cohesion >= 60 ? T.mint : coalition.lead_party?.cohesion >= 35 ? T.warning : T.red, fontFamily: MONO, fontWeight: 700, fontSize: 13 }}>{coalition.lead_party?.cohesion ?? '?'}%</span>
                    </div>
                  </div>
                  
                  {/* Partners */}
                  {partners.map((p: any, i: number) => (
                    <div key={p.party_id ?? i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', color: T.faint, fontFamily: MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 4 }}>Partner</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: T.ivory, fontWeight: 500, fontSize: 14 }}>{p.name}</span>
                          <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO }}>{p.seats} SEATS</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: T.faint, fontSize: 11, fontFamily: MONO }}>COHESION</span>
                        <span style={{ color: p.cohesion >= 60 ? T.mint : p.cohesion >= 35 ? T.warning : T.red, fontFamily: MONO, fontWeight: 700, fontSize: 13 }}>{p.cohesion ?? '?'}%</span>
                      </div>
                    </div>
                  ))}
                  
                  {partners.length === 0 && !agreement && (
                    <div style={{ color: T.faint, fontSize: 13, fontStyle: 'italic', padding: '16px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                      Single-party majority — no agreement required.
                    </div>
                  )}
                </div>

                {/* Next review */}
                {agreement?.next_review_arc && (
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid rgba(255,255,255,0.05)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: T.faint, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Next Review Arc</span>
                    <span style={{ color: '#a78bfa', fontFamily: MONO, fontSize: 14, fontWeight: 700, background: 'rgba(139,92,246,0.1)', padding: '4px 12px', borderRadius: 4 }}>{agreement.next_review_arc}</span>
                  </div>
                )}
              </GlassPanel>
            );
          })()}
        </div>
      )}
    </div>
  );
}
