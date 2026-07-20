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
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {policies.map((pol) => {
            const isProposing = activeProposal === pol.id;

            return (
              <Panel key={pol.id} accent={isProposing} style={{ display: 'flex', flexDirection: 'column', minHeight: 280, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ color: T.ivory, fontWeight: 700, fontSize: 16 }}>{pol.title}</div>
                  <Stamp style={{ fontSize: 10, color: T.muted }}>{pol.type}</Stamp>
                </div>
                <div style={{ color: T.faint, fontSize: 13, lineHeight: 1.5, marginBottom: 24, flex: 1 }}>
                  {pol.description}
                </div>

                {!isProposing ? (
                  <>
                    <Stamp style={{ color: T.muted, marginBottom: 12 }}>IN FORCE NOW</Stamp>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.gold, fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: T.gold }} />
                      {pol.currentValue}
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 24, fontWeight: 600 }}>
                      {pol.effects}
                    </div>
                    {pol.canPropose && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                        <button onClick={() => { setActiveProposal(pol.id); setErr(null); }} style={{
                          background: 'transparent',
                          border: `1px solid ${T.gold}`,
                          color: T.gold,
                          padding: '6px 16px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontFamily: MONO,
                          fontWeight: 700,
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = `${T.gold}15`}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          Propose Change
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: '#171717', padding: '16px', borderRadius: 6, border: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <span style={{ color: T.faint, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proposed Rate</span>
                        <span style={{ color: T.gold, fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{rate}%</span>
                      </div>
                      <input 
                        type="range" min={0} max={60} value={rate} 
                        onChange={(e) => setRate(Number(e.target.value))} 
                        style={{ width: '100%', accentColor: T.gold, cursor: 'pointer', height: 4 }} 
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setActiveProposal(null)} style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${T.border}`, color: T.faint, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Cancel</button>
                      <button onClick={propose} disabled={busy === 'propose'} style={{ flex: 2, padding: '8px', background: `${T.gold}20`, border: `1px solid ${T.gold}`, color: T.gold, borderRadius: 4, cursor: busy === 'propose' ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', transition: 'background 0.15s ease' }}>
                        {busy === 'propose' ? 'Drafting...' : 'Submit'}
                      </button>
                    </div>
                    {err && <div style={{ color: T.red, fontSize: 12, textAlign: 'center' }}>{err}</div>}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
