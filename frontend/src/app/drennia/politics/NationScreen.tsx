'use client';
import React from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { T, MONO, stampStyle } from './_lib/theme';
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
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={stampStyle}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function StatDial({ label, value }: { label: string; value: number }) {
  const normValue = Math.max(0, Math.min(10, value || 0));
  const fill = (normValue / 10) * 100;
  
  let color: string = T.ivory;
  if (normValue < 4) color = T.red;
  else if (normValue > 7) color = T.blue;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span style={{ color, fontFamily: MONO, fontSize: 13, fontWeight: 700 }}>{normValue.toFixed(1)}</span>
      </div>
      <div style={{ height: 6, background: T.panel2, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${fill}%`, height: '100%', background: color }} />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />

      {isLocked ? (
        <Panel title="Locked"><div style={{ color: T.faint, fontStyle: 'italic' }}>{jurisdiction?.name || 'This state'} is not yet open for political activity.</div></Panel>
      ) : (
        <>
          <div>
            <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '6px 0 0' }}>State of {jurisdiction?.name}</h1>
            <p style={{ color: T.muted, fontSize: 14, marginTop: 6 }}>Overview of the state's economic and political health.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            <Panel title="Jurisdiction Conditions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <StatDial label="Prosperity" value={conditions?.prosperity ?? 5} />
                <StatDial label="Jobs & Employment" value={conditions?.jobs ?? 5} />
                <StatDial label="Public Order" value={conditions?.order ?? 5} />
                <StatDial label="Social Cohesion" value={conditions?.cohesion ?? 5} />
                <StatDial label="Budget Health" value={conditions?.budget ?? 5} />
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}`, color: T.muted, fontSize: 13, lineHeight: 1.5 }}>
                These dials reflect the core well-being of the state. They drift over time toward targets defined by the governing coalition's platform and enacted laws.
              </div>
            </Panel>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                <div key={l.id} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ color: T.faint, fontFamily: MONO, fontSize: 11, flexShrink: 0, marginTop: 2 }}>{formatGameDateShort(l.arc)}</div>
                  <div>
                    <div style={{ color: T.ivory, fontWeight: 600, fontSize: 14 }}>{l.headline}</div>
                    <div style={{ color: T.muted, fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>{l.body}</div>
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
