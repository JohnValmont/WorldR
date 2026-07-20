'use client';
import React from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { T, MONO, SANS, stampStyle, glassPanelStyle } from './_lib/theme';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { PILLARS } from './_lib/model';
import { formatGameDateShort } from '@/lib/calendar';

interface Props {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  ledger: any[];
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...glassPanelStyle, fontFamily: SANS }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ ...stampStyle, textShadow: `0 0 10px ${T.goldSoft}` }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function StatDial({ label, value }: { label: string; value: number }) {
  const normValue = Math.max(0, Math.min(10, value || 0));
  const fill = (normValue / 10) * 100;
  
  let color: string = T.gold;
  if (normValue < 4) color = T.red;
  else if (normValue > 7) color = T.mint;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: SANS }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: T.text, fontSize: 14, fontWeight: 600, letterSpacing: '0.01em' }}>{label}</span>
        <span style={{ color, fontFamily: MONO, fontSize: 14, fontWeight: 700, textShadow: `0 0 12px ${color}` }}>{normValue.toFixed(1)}</span>
      </div>
      <div style={{ height: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 99, overflow: 'hidden', border: `1px solid ${T.borderSoft}` }}>
        <div style={{ width: `${fill}%`, height: '100%', background: `linear-gradient(90deg, ${T.panel2}, ${color})`, boxShadow: `0 0 10px ${color}`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>
    </div>
  );
}

export default function NationScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, overview, ledger }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  
  const { data: billsData } = useSWR(['bills', selectedJurisdictionId], () => politicsApi.getBills(selectedJurisdictionId));
  const activePolicy = billsData?.activePolicy;
  const conditions = overview?.conditions;

  const policyPlatform = activePolicy?.policy_platform || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />

      {isLocked ? (
        <Panel title="Locked"><div style={{ color: T.faint, fontStyle: 'italic' }}>{jurisdiction?.name || 'This state'} is not yet open for political activity.</div></Panel>
      ) : (
        <>
          <div style={{ fontFamily: SANS }}>
            <h1 style={{ color: T.ivory, fontSize: 36, fontWeight: 800, margin: '8px 0 0', letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Drennia Nation</h1>
            <p style={{ color: T.muted, fontSize: 15, marginTop: 8, lineHeight: 1.6 }}>Overview of the nation's economic and political health.</p>
          </div>

          <Panel title="National Profile">
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: SANS }}>
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ color: T.text, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  The <strong>Nation of Drennia</strong> is a constitutional monarchy situated in the northern industrial corridor. Renowned for its deep-water ports, sprawling manufacturing hubs, and rich labor history, Drennia balances heavy industry with a modernizing service economy. While the Monarch serves as the ceremonial head of state, political power is wielded by the elected National Parliament and fiercely independent regional states.
                </p>
              </div>
              <div style={{ flex: '1 1 300px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.faint, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Capital</div>
                  <div style={{ fontSize: 14, color: T.ivory, fontWeight: 500 }}>Drennport</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.faint, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Government</div>
                  <div style={{ fontSize: 14, color: T.ivory, fontWeight: 500 }}>Constitutional Monarchy</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.faint, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Legislature</div>
                  <div style={{ fontSize: 14, color: T.ivory, fontWeight: 500 }}>National Parliament (20 Seats)</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.faint, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Currency</div>
                  <div style={{ fontSize: 14, color: T.ivory, fontWeight: 500 }}>Standard Credit (CR)</div>
                </div>
              </div>
            </div>
          </Panel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Panel title="National Conditions">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <StatDial label="Prosperity" value={conditions?.prosperity ?? 5} />
                  <StatDial label="Jobs & Employment" value={conditions?.jobs ?? 5} />
                  <StatDial label="Public Order" value={conditions?.order ?? 5} />
                  <StatDial label="Social Cohesion" value={conditions?.cohesion ?? 5} />
                  <StatDial label="Budget Health" value={conditions?.budget ?? 5} />
                </div>
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}`, color: T.muted, fontSize: 13, lineHeight: 1.5 }}>
                  These dials reflect the core well-being of the nation. They drift over time toward targets defined by the governing coalition's platform and enacted laws.
                </div>
              </Panel>

              <Panel title="National Demographics">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: T.text, fontSize: 14 }}>Total Population</span>
                    <span style={{ color: T.ivory, fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>
                      {overview?.activeState?.population != null ? Number(overview.activeState.population).toLocaleString('en-US') : '2,400,000'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: T.text, fontSize: 14 }}>Registered Voters</span>
                    <span style={{ color: T.ivory, fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>
                      {overview?.activeState?.registered_voters != null ? Number(overview.activeState.registered_voters).toLocaleString('en-US') : '1,600,000'}
                    </span>
                  </div>
                </div>
              </Panel>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Panel title="Active Laws & Governance">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: T.text, fontSize: 14 }}>Industry Tax Rate</span>
                    <span style={{ color: T.gold, fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>
                      {((activePolicy?.industry_tax_rate ?? 0.20) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: T.text, fontSize: 14 }}>Infrastructure Level</span>
                    <span style={{ color: T.gold, fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>
                      Level {activePolicy?.infrastructure_level ?? 1}
                    </span>
                  </div>
                </div>
              </Panel>

              <Panel title="Legislated Platform (Overrides Governing Platform)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {PILLARS.map((p) => {
                    const v = policyPlatform[p.axis];
                    if (v === undefined) return null;
                    return (
                      <div key={p.axis}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ color: T.text, fontSize: 13 }}>{p.name}</span>
                          <span style={{ color: T.gold, fontFamily: MONO, fontSize: 12 }}>{v}%</span>
                        </div>
                        <div style={{ height: 6, background: T.panel2, borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${v}%`, height: '100%', background: T.gold }} />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(policyPlatform).length === 0 && (
                    <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 13 }}>No permanent platform shifts have been legislated. The state follows the governing coalition's baseline platform.</div>
                  )}
                </div>
              </Panel>
            </div>
          </div>

          <Panel title="National Dispatch">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ledger.slice(0, 5).map((l: any) => (
                <div key={l.id} style={{ display: 'flex', gap: 16, paddingBottom: 16, borderBottom: `1px solid ${T.borderSoft}` }}>
                  <div style={{ color: T.gold, fontFamily: MONO, fontSize: 12, flexShrink: 0, marginTop: 4, fontWeight: 600, opacity: 0.8 }}>{formatGameDateShort(l.arc)}</div>
                  <div>
                    <div style={{ color: T.ivory, fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>{l.headline}</div>
                    <div style={{ color: T.text, fontSize: 14, marginTop: 6, lineHeight: 1.5, opacity: 0.8 }}>{l.body}</div>
                  </div>
                </div>
              ))}
              {ledger.length === 0 && (
                <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 13 }}>No recent dispatches.</div>
              )}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
