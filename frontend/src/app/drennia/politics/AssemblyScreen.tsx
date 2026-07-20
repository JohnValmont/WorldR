'use client';
import React from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO } from './_lib/theme';
import { JURISDICTION_MODEL } from './_lib/model';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Panel, Stamp } from './_components/DeskUI';
import { Shield } from 'lucide-react';

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

const PALETTE = ['#d4a24a', '#5f8fbf', '#5fbf8f', '#c8624f', '#9b7fbf', '#c9a24a', '#7fbfb0'];

export default function AssemblyScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, parties }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const jModel = JURISDICTION_MODEL[selectedJurisdictionId] || JURISDICTION_MODEL.national;
  const { data } = useSWR(isLocked ? null : ['council', selectedJurisdictionId], () => politicsApi.getCouncil(selectedJurisdictionId).catch(() => null));
  const { data: coalitionData } = useSWR(isLocked ? null : ['coalition-agreement', selectedJurisdictionId], () => politicsApi.getCoalitionAgreement(selectedJurisdictionId).catch(() => null));

  const partySeats: any[] = Array.isArray(data?.partySeats) ? data.partySeats.filter((p: any) => p.seats > 0) : [];
  const totalSeats = jModel.seats;
  const occupiedSeats = partySeats.reduce((s: number, p: any) => s + Number(p.seats || 0), 0);
  const majority = jModel.majority;
  const premier = data?.premier;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0' }}>
        <Stamp style={{ color: T.gold }}>THE ASSEMBLY</Stamp>
        <h1 style={{ color: T.ivory, fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          {jModel.tier === 'state' ? 'State Assembly' : 'National Parliament'} of {jModel.name}
        </h1>
        <div style={{ color: T.faint, fontSize: 14, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {jModel.seats} seats — {jModel.majority} for a majority
        </div>
      </div>

      {isLocked ? (
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: '24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={20} color={T.muted} />
          <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 14 }}>The {jurisdiction?.name} assembly is not yet open.</div>
        </div>
      ) : partySeats.length === 0 ? (
        <Panel title="THE CHAMBER"><div style={{ color: T.faint, fontStyle: 'italic', textAlign: 'center', padding: 24 }}>The chamber is empty. Seats are filled at the next election.</div></Panel>
      ) : (
        <Panel title={`COMPOSITION — ${totalSeats} SEATS`} accent>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 20, background: 'rgba(0,0,0,0.4)', borderRadius: 6, border: `1px solid ${T.borderSoft}`, boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
            {Array.from({ length: totalSeats }).map((_, i) => {
              // Find which party this seat belongs to
              let currentOffset = 0;
              let seatColor: string = T.border;
              let seatTitle = 'Vacant';
              
              for (let partyIdx = 0; partyIdx < partySeats.length; partyIdx++) {
                const p = partySeats[partyIdx];
                if (i >= currentOffset && i < currentOffset + p.seats) {
                  seatColor = PALETTE[partyIdx % PALETTE.length];
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
                    flex: '1 0 calc(10% - 6px)', // approx 10 per row for 20 seats = 2 rows
                    minWidth: 16,
                    height: 24, 
                    background: seatColor,
                    borderRadius: 2,
                    boxShadow: seatColor !== T.border ? `0 0 8px ${seatColor}60, inset 0 1px 0 rgba(255,255,255,0.2)` : 'inset 0 1px 0 rgba(0,0,0,0.5)',
                    border: `1px solid rgba(0,0,0,0.8)`,
                    opacity: seatColor !== T.border ? 1 : 0.3,
                    transition: 'transform 0.2s'
                  }} 
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {partySeats.map((p: any, i: number) => (
              <div key={p.partyId || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i % PALETTE.length] }} />
                  <span style={{ color: T.text, fontSize: 13 }}>{p.name} {p.abbreviation ? <span style={{ color: T.faint, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', marginLeft: 4 }}>[{p.abbreviation}]</span> : null}</span>
                </div>
                <span style={{ color: T.ivory, fontFamily: MONO, fontSize: 13, fontWeight: 700 }}>{p.seats}</span>
              </div>
            ))}
          </div>
          {premier && <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border}`, color: T.muted, fontSize: 13 }}>Premier: <span style={{ color: T.gold, fontWeight: 600 }}>{premier.characterName || premier.name || 'Unknown'}</span> <span style={{ color: T.faint }}>({premier.partyName || ''})</span></div>}
        </Panel>
      )}

      {/* Coalition Agreement Panel */}
      {!isLocked && coalitionData?.coalition && (() => {
        const agreement = coalitionData.agreement;
        const coalition = coalitionData.coalition;
        const health = agreement?.health ?? null;
        const healthTone = health == null ? T.faint : health >= 60 ? '#4ade80' : health >= 30 ? T.gold : T.red;
        const statusLabel = agreement?.status === 'under_review' ? 'Under Review' : agreement?.status === 'broken' ? 'Broken' : 'Active';
        const partners: any[] = agreement?.partner_terms ?? [];

        return (
          <div style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,15,60,0.8) 100%)',
            border: `1px solid rgba(139, 92, 246, 0.25)`,
            borderTop: `1px solid rgba(139, 92, 246, 0.5)`,
            borderRadius: 8,
            padding: '20px 24px',
            boxShadow: '0 4px 24px rgba(139, 92, 246, 0.1)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 11, background: '#a78bfa', borderRadius: 1 }} />
                <span style={{ fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.22em', fontSize: 10, color: '#a78bfa' }}>Coalition Agreement</span>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 3, fontSize: 9, fontFamily: MONO, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: agreement?.status === 'broken' ? 'rgba(224,82,70,0.15)' : agreement?.status === 'under_review' ? 'rgba(227,182,102,0.15)' : 'rgba(74,222,128,0.1)',
                border: `1px solid ${healthTone}40`,
                color: healthTone,
              }}>{statusLabel}</span>
            </div>

            {/* Health bar */}
            {agreement && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: T.muted, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Agreement Health</span>
                  <span style={{ color: healthTone, fontFamily: MONO, fontSize: 13, fontWeight: 700 }}>{health}%</span>
                </div>
                <div style={{ height: 5, background: 'rgba(0,0,0,0.4)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${health ?? 0}%`, height: '100%', background: healthTone, transition: 'width 0.8s ease', boxShadow: `0 0 8px ${healthTone}` }} />
                </div>
                <div style={{ color: T.faint, fontSize: 10, marginTop: 4, fontFamily: MONO }}>
                  {health != null && health >= 60 ? 'Agreement stable — all parties aligned'
                    : health != null && health >= 30 ? 'Agreement strained — review approaching'
                    : 'Agreement critical — coalition at risk'}
                </div>
              </div>
            )}

            {/* Member parties */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Lead */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#a78bfa', fontFamily: MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Lead</span>
                  <span style={{ color: T.ivory, fontWeight: 600, fontSize: 13 }}>{coalition.lead_party?.name ?? 'Unknown'}</span>
                </div>
                <span style={{ color: T.faint, fontSize: 11, fontFamily: MONO }}>Cohesion: <span style={{ color: coalition.lead_party?.cohesion >= 60 ? '#4ade80' : coalition.lead_party?.cohesion >= 35 ? T.gold : T.red }}>{coalition.lead_party?.cohesion ?? '?'}%</span></span>
              </div>
              {/* Partners */}
              {partners.map((p: any, i: number) => (
                <div key={p.party_id ?? i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, borderRadius: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: T.faint, fontFamily: MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Partner</span>
                    <span style={{ color: T.text, fontWeight: 500, fontSize: 13 }}>{p.name}</span>
                    <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO }}>{p.seats} seats</span>
                  </div>
                  <span style={{ color: T.faint, fontSize: 11, fontFamily: MONO }}>Cohesion: <span style={{ color: p.cohesion >= 60 ? '#4ade80' : p.cohesion >= 35 ? T.gold : T.red }}>{p.cohesion ?? '?'}%</span></span>
                </div>
              ))}
              {partners.length === 0 && !agreement && (
                <div style={{ color: T.faint, fontSize: 12, fontStyle: 'italic', padding: '8px 0' }}>Single-party majority — no agreement required.</div>
              )}
            </div>

            {/* Next review */}
            {agreement?.next_review_arc && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid rgba(255,255,255,0.05)`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.faint, fontSize: 11, fontFamily: MONO }}>Next review arc</span>
                <span style={{ color: '#a78bfa', fontFamily: MONO, fontSize: 11, fontWeight: 600 }}>Arc {agreement.next_review_arc}</span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
