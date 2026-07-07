'use client';
import React from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { SEGMENTS } from '@/lib/politicsConstants';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, stampStyle } from './_lib/theme';
import { BLOC_NAME_BY_KEY, PILLAR_BY_AXIS } from './_lib/model';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';

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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: 20 }}>
      <div style={{ ...stampStyle, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

// Indicative Fit (display only) — the engine uses the tuned POL_FIT_EXP formula.
function fitPct(platform: any, seg: any): number | null {
  if (!platform) return null;
  let wsum = 0, acc = 0;
  for (const ax of Object.keys(seg.priorities)) {
    const w = seg.priorities[ax];
    const diff = Math.abs((platform[ax] ?? 50) - seg.ideal[ax]) / 100;
    acc += w * (1 - diff); wsum += w;
  }
  return wsum ? Math.round((acc / wsum) * 100) : null;
}

function leaning(seg: any): string {
  let topAx = ''; let topW = -1;
  for (const ax of Object.keys(seg.priorities)) if (seg.priorities[ax] > topW) { topW = seg.priorities[ax]; topAx = ax; }
  const p = PILLAR_BY_AXIS[topAx as keyof typeof PILLAR_BY_AXIS];
  if (!p) return '';
  const ideal = seg.ideal[topAx];
  const pole = ideal >= 60 ? p.high : ideal <= 40 ? p.low : 'Balanced';
  return `${p.name}: ${pole}`;
}

export default function ElectionsScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, character, parties }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const { data: polls } = useSWR(isLocked ? null : ['polls', selectedJurisdictionId], () => politicsApi.getPolls(selectedJurisdictionId).catch(() => null));

  const myParty = Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id) : undefined;
  const myPlatform = myParty?.platform;

  const projections: any[] = Array.isArray(polls) ? polls : (polls?.parties || polls?.projections || []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />

      <div>
        <div style={stampStyle}>Electorate · {jurisdiction?.name}</div>
        <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '6px 0 0' }}>Read the Room</h1>
        <p style={{ color: T.muted, fontSize: 14, marginTop: 6 }}>Every bloc has an ideal platform. Court the ones no rival owns — standing where others stand splits the vote.</p>
      </div>

      {isLocked ? (
        <Panel title="Locked"><div style={{ color: T.faint, fontStyle: 'italic' }}>{jurisdiction?.name} is not yet open for political activity.</div></Panel>
      ) : (
        <>
          <Panel title="The Electorate">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {SEGMENTS.map((seg: any) => {
                const fit = fitPct(myPlatform, seg);
                return (
                  <div key={seg.key} style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 4, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ color: T.ivory, fontWeight: 700, fontSize: 15 }}>{BLOC_NAME_BY_KEY[seg.key] || seg.label}</span>
                      <span style={{ color: T.gold, fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{Math.round(seg.size * 100)}%</span>
                    </div>
                    <div style={{ color: T.faint, fontFamily: MONO, fontSize: 10.5, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{leaning(seg)}</div>
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: T.muted, fontSize: 11 }}>Your Fit</span>
                        <span style={{ color: fit == null ? T.faint : fit >= 60 ? T.mint : fit >= 40 ? T.gold : T.red, fontFamily: MONO, fontSize: 11 }}>{fit == null ? '\u2014' : `${fit}%`}</span>
                      </div>
                      <div style={{ height: 6, background: T.bg, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${fit ?? 0}%`, height: '100%', background: fit == null ? T.faint : fit >= 60 ? T.mint : fit >= 40 ? T.gold : T.red }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Projected Result — if the vote were held today">
            {projections.length === 0 ? (
              <div style={{ color: T.faint, fontStyle: 'italic' }}>Projections open once candidates are confirmed and campaigns begin.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projections.slice(0, 8).map((p: any, i: number) => {
                  const share = Number(p.projected_share ?? p.share ?? p.vote_share ?? 0);
                  const seats = p.projected_seats ?? p.seats;
                  const pct = share <= 1 ? share * 100 : share;
                  return (
                    <div key={p.id || p.party_id || i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: T.text, fontSize: 13 }}>{p.name || p.party_name || 'Party'}</span>
                        <span style={{ color: T.muted, fontFamily: MONO, fontSize: 12 }}>{seats != null ? `${seats} seats` : `${pct.toFixed(1)}%`}</span>
                      </div>
                      <div style={{ height: 6, background: T.panel2, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(2, Math.min(100, pct))}%`, height: '100%', background: T.gold }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
