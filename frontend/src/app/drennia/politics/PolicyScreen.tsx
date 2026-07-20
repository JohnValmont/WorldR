'use client';
import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO } from './_lib/theme';
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
      effects: <span style={{ color: T.mint }}>Treasury Revenue +</span>,
      canPropose: !!myParty,
    },
    {
      id: 'infrastructure',
      title: 'Infrastructure Level',
      type: 'TIERED',
      description: 'The overall level of public infrastructure, affecting transportation and logistics efficiency.',
      currentValue: `Level ${activePolicy?.infrastructure_level ?? 1}`,
      effects: <span style={{ color: T.mint }}>Logistics Bonus +</span>,
      canPropose: false,
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Stamp style={{ color: T.gold }}>THE POLICY DESK</Stamp>
        <h1 style={{ color: T.ivory, fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
          Policies — {jurisdiction?.name}
        </h1>
        <div style={{ color: T.faint, fontSize: 13 }}>
          Every policy in force across the jurisdiction. Propose a change to send it to the chamber.
        </div>
      </div>

      {isLocked ? (
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: '24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={20} color={T.muted} />
          <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 14 }}>The {jurisdiction?.name} policy desk is not yet open.</div>
        </div>
      ) : (        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px 8px', borderBottom: `1px solid ${T.border}`, fontFamily: MONO, fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <div style={{ flex: '0 0 240px' }}>Policy</div>
            <div style={{ flex: '0 0 100px' }}>Type</div>
            <div style={{ flex: '0 0 120px' }}>In Force</div>
            <div style={{ flex: 1 }}>Effect</div>
            <div style={{ width: 120 }}></div>
          </div>
          {policies.map((pol) => {
            const isProposing = activeProposal === pol.id;

            return (
              <div key={pol.id} style={{ 
                display: 'flex', alignItems: 'center', padding: '12px 16px', 
                background: isProposing ? T.blueDim : 'rgba(255,255,255,0.01)', 
                border: `1px solid ${isProposing ? T.blueLine : 'transparent'}`,
                borderBottom: isProposing ? `1px solid ${T.blueLine}` : `1px solid ${T.borderSoft}`,
                borderRadius: isProposing ? 6 : 0,
                transition: 'all 0.2s ease',
                position: 'relative'
              }}>
                <div style={{ flex: '0 0 240px', paddingRight: 20 }}>
                  <div style={{ color: isProposing ? T.ivory : T.text, fontWeight: 700, fontSize: 14 }}>{pol.title}</div>
                  <div style={{ color: T.faint, fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>{pol.description}</div>
                </div>

                <div style={{ flex: '0 0 100px' }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: T.muted }}>{pol.type}</div>
                </div>

                <div style={{ flex: '0 0 120px', display: 'flex', alignItems: 'center', gap: 6, color: isProposing ? T.blueBright : T.ivory, fontWeight: 700, fontSize: 13, fontFamily: MONO }}>
                  <div style={{ width: 4, height: 4, borderRadius: 2, background: isProposing ? T.blueBright : T.muted }} />
                  {pol.currentValue}
                </div>

                <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>
                  {pol.effects}
                </div>

                <div style={{ width: 120, textAlign: 'right' }}>
                  {pol.canPropose && !isProposing && (
                    <button onClick={() => { setActiveProposal(pol.id); setErr(null); }} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${T.border}`,
                      color: T.text,
                      padding: '6px 12px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontFamily: MONO,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.blueDim; e.currentTarget.style.color = T.blueBright; e.currentTarget.style.borderColor = T.blueLine; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.border; }}
                    >
                      Propose
                    </button>
                  )}
                  {isProposing && (
                    <button onClick={() => setActiveProposal(null)} style={{
                      background: 'transparent', color: T.muted, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600
                    }}>
                      Cancel
                    </button>
                  )}
                </div>

                {isProposing && (
                  <div style={{ position: 'absolute', top: '100%', left: -1, right: -1, background: T.panel, border: `1px solid ${T.blueLine}`, borderTop: 'none', borderRadius: '0 0 6px 6px', padding: 16, zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: T.ivory, fontSize: 13 }}>
                          <span>Proposed Rate: {rate}%</span>
                        </div>
                        <input type="range" min="0" max="60" value={rate} onChange={(e) => setRate(Number(e.target.value))} style={{ width: '100%', accentColor: T.gold }} />
                      </div>
                      <div style={{ width: 140 }}>
                        <button onClick={propose} disabled={busy === 'propose'} style={{ width: '100%', padding: '8px', background: `${T.gold}20`, border: `1px solid ${T.gold}`, color: T.gold, borderRadius: 4, cursor: busy === 'propose' ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                          {busy === 'propose' ? 'Drafting...' : 'Submit'}
                        </button>
                        {err && <div style={{ color: T.red, fontSize: 11, marginTop: 4 }}>{err}</div>}
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
