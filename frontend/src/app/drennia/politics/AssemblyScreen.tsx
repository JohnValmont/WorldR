'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, HEADING, SANS, stampStyle, glassPanelStyle } from './_lib/theme';
import { JURISDICTION_MODEL } from './_lib/model';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import CoalitionBuilder from './_components/CoalitionBuilder';
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

export default function AssemblyScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, overview, character, parties, onRefresh }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const jModel = JURISDICTION_MODEL[selectedJurisdictionId] || JURISDICTION_MODEL.national;
  const { data } = useSWR(isLocked ? null : ['council', selectedJurisdictionId], () => politicsApi.getCouncil(selectedJurisdictionId).catch(() => null));
  const { data: coalitionData } = useSWR<{ coalition: any; agreement: any; partners?: any[] } | null>(isLocked ? null : ['coalition-agreement', selectedJurisdictionId], () => politicsApi.getCoalitionAgreement(selectedJurisdictionId).catch(() => null));

  const [busy, setBusy] = useState(false);
  const myParty = overview?.globalParty || (Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id || p.members?.some((m: any) => m.character_id === character?.id || m.id === character?.id)) : undefined);
  const isLeader = myParty && myParty.leader_character_id === character?.id;
  const pendingPetitions = overview?.pendingPetitions || [];

  async function handleRespondToPetition(petitionId: string, action: 'accept' | 'reject') {
    if (busy) return;
    try {
      setBusy(true);
      await politicsApi.respondToPetition(petitionId, action);
      if (onRefresh) await onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  const partySeats: any[] = Array.isArray(data?.partySeats) ? data.partySeats.filter((p: any) => p.seats > 0) : [];
  const totalSeats = jModel.seats;
  const occupiedSeats = partySeats.reduce((s: number, p: any) => s + Number(p.seats || 0), 0);
  const majority = jModel.majority;
  const premier = data?.premier;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24, fontFamily: SANS }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      {/* ── OLED ASSEMBLY HERO ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 14,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(10,15,30,0.95) 100%)',
        border: `1px solid rgba(255,255,255,0.05)`,
        borderRadius: 10,
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
            {jModel.tier === 'state' ? 'State Assembly' : 'National Parliament'} <span style={{ color: T.muted, fontWeight: 400 }}>{jModel.tier === 'state' ? `of ${jModel.name}` : 'of Drennia'}</span>
          </h1>
          <div style={{ color: T.faint, fontSize: 13, marginTop: 4 }}>
            The composition of the legislature and the current ruling government.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, position: 'relative', zIndex: 1, flexWrap: 'wrap', marginTop: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Seats</span>
            <span style={{ color: T.ivory, fontSize: 18, fontWeight: 700, fontFamily: MONO }}>{totalSeats}</span>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Majority Needed</span>
            <span style={{ color: T.ivory, fontSize: 18, fontWeight: 700, fontFamily: MONO }}>{majority}</span>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Occupied Seats</span>
            <span style={{ color: occupiedSeats >= majority ? T.mint : T.warning, fontSize: 18, fontWeight: 700, fontFamily: MONO }}>{occupiedSeats}</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
          
          <GlassPanel title={<><Landmark size={14} /> Composition</>} accent={T.blueLine}>
            {/* ── SVG Hemicycle Parliament Chart ── */}
            {(() => {
              const W = 520, H = 280;
              const cx = W / 2, cy = H - 10;
              const ROWS = 4;
              const ROW_GAP = 28;
              const SEAT_R = 7;
              const START_ANGLE = Math.PI; // 180° (left)
              const END_ANGLE = 0;         // 0°  (right)

              // Build seat-to-party color map
              const seatColors: string[] = [];
              for (const p of partySeats) {
                const idx = partySeats.indexOf(p);
                const col = PALETTE[idx % PALETTE.length];
                for (let s = 0; s < p.seats; s++) seatColors.push(col);
              }
              // Fill remaining with empty
              while (seatColors.length < totalSeats) seatColors.push('rgba(255,255,255,0.07)');

              // Distribute seats across rows (more seats in outer rows proportionally)
              const seatsPerRow: number[] = [];
              {
                // Outer rows have larger circumference, give them proportionally more seats
                const radii = Array.from({ length: ROWS }, (_, i) => 90 + i * ROW_GAP);
                const totalArc = radii.reduce((s, r) => s + r, 0);
                let assigned = 0;
                for (let row = 0; row < ROWS; row++) {
                  const share = row < ROWS - 1
                    ? Math.round((radii[row] / totalArc) * totalSeats)
                    : totalSeats - assigned;
                  seatsPerRow.push(Math.max(1, share));
                  assigned += seatsPerRow[row];
                }
              }

              const svgSeats: { x: number; y: number; color: number; title: string }[] = [];
              let globalIdx = 0;
              for (let row = 0; row < ROWS; row++) {
                const radius = 90 + row * ROW_GAP;
                const count = seatsPerRow[row];
                for (let s = 0; s < count; s++) {
                  const angle = START_ANGLE + (s / (count - 1 || 1)) * (END_ANGLE - START_ANGLE);
                  const x = cx + radius * Math.cos(angle);
                  const y = cy + radius * Math.sin(angle);
                  const color = seatColors[globalIdx] ?? 'rgba(255,255,255,0.07)';
                  // Find party name for this seat
                  let title = 'Vacant';
                  let offset = 0;
                  for (const p of partySeats) {
                    if (globalIdx >= offset && globalIdx < offset + p.seats) { title = p.name; break; }
                    offset += p.seats;
                  }
                  svgSeats.push({ x, y, color: globalIdx, title });
                  svgSeats[svgSeats.length - 1] = { x, y, color: color as any, title };
                  globalIdx++;
                }
              }

              return (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0', background: 'rgba(0,0,0,0.5)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)' }}>
                  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxWidth: '100%' }}>
                    {/* Floor line */}
                    <line x1={20} y1={cy} x2={W - 20} y2={cy} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                    {/* Seats */}
                    {svgSeats.map((seat, i) => (
                      <circle
                        key={i}
                        cx={seat.x}
                        cy={seat.y}
                        r={SEAT_R}
                        fill={seat.color as any}
                        stroke={String(seat.color) === 'rgba(255,255,255,0.07)' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)'}
                        strokeWidth={1}
                        style={{ cursor: 'help', transition: 'r 0.15s ease, opacity 0.15s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.setAttribute('r', '9'); }}
                        onMouseLeave={(e) => { e.currentTarget.setAttribute('r', String(SEAT_R)); }}
                      >
                        <title>{seat.title}</title>
                      </circle>
                    ))}
                    {/* Majority threshold label */}
                    <text x={cx} y={cy - 6} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={10} fontFamily="monospace">
                      MAJORITY: {majority}
                    </text>
                  </svg>
                </div>
              );
            })()}


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
              <div style={{ marginTop: 24, padding: '10px 14px', background: 'rgba(255,215,0,0.05)', border: `1px solid rgba(255,215,0,0.2)`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
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

          {/* Coalition Builder (Formation Phase Only) */}
          {!isLocked && overview?.cycle?.phase === 'formation' && (
            <CoalitionBuilder 
              selectedJurisdictionId={selectedJurisdictionId}
              myParty={myParty}
              partySeats={partySeats}
              parties={parties}
              majority={majority}
              totalSeats={totalSeats}
              onRefresh={onRefresh}
            />
          )}

          {/* Coalition Agreement Panel */}
          {!isLocked && overview?.cycle?.phase !== 'formation' && coalitionData?.coalition && (() => {
            const agreement = coalitionData.agreement;
            const coalition = coalitionData.coalition;
            const health = agreement?.health ?? null;
            const healthTone = health == null ? T.faint : health >= 60 ? T.mint : health >= 30 ? T.warning : T.red;
            const statusLabel = agreement?.status === 'under_review' ? 'Under Review' : agreement?.status === 'broken' ? 'Broken' : 'Active';
            const partners: any[] = coalitionData.partners?.length ? coalitionData.partners : Array.isArray(agreement?.partner_terms) ? agreement.partner_terms : [];

            return (
              <GlassPanel title={<><FileSignature size={14} /> Coalition Agreement</>} accent="#8B5CF6">
                
                {/* Header & Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
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
                  <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8 }}>
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
                    <div key={p.party_id ?? i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 8 }}>
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

          {/* Lobbying Petitions (Party Leader Only) */}
          {isLeader && pendingPetitions.length > 0 && (
            <GlassPanel title={<><FileSignature size={14} /> Incoming Petitions</>} accent={T.gold}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ color: T.faint, fontSize: 13, marginBottom: 4 }}>Corporate backers are offering funds in exchange for policy commitments.</div>
                {pendingPetitions.map((p: any) => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)', border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ color: T.ivory, fontSize: 15, fontWeight: 700 }}>{p.company_name}</div>
                        <div style={{ color: T.faint, fontSize: 12 }}>Wants <strong style={{ color: T.text }}>{p.policy_category}</strong> policy set to <strong style={{ color: T.text }}>{p.desired_option}</strong></div>
                      </div>
                      <div style={{ color: T.gold, fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>+${Number(p.offered_funds).toLocaleString('en-US')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleRespondToPetition(p.id, 'accept')} disabled={busy} style={{ flex: 1, padding: '8px', borderRadius: 4, background: T.mint, color: '#000', border: 'none', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>ACCEPT</button>
                      <button onClick={() => handleRespondToPetition(p.id, 'reject')} disabled={busy} style={{ flex: 1, padding: '8px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', color: T.ivory, border: 'none', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>REJECT</button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

        </div>
      )}
    </div>
  );
}
