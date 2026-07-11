'use client';
import React from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { SEGMENTS } from '@/lib/politicsConstants';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO } from './_lib/theme';
import { BLOC_NAME_BY_KEY, PILLAR_BY_AXIS, JURISDICTION_MODEL } from './_lib/model';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Panel, Stamp, Meter, StatTile } from './_components/DeskUI';

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

const REAL_HOURS_PER_MONTH = 8; // GDD $3

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

/** The scheduled-election banner: countdown + term progress. No phase ceremony —
 *  campaigning and legislating are open at all times; the vote simply resolves on
 *  Election Day (GDD $3–4 / Task C removed the phase gates). */
function ElectionHero({
  jurisdictionName,
  cycle,
  seats,
  majority,
  termMonths,
}: {
  jurisdictionName: string;
  cycle: any;
  seats: number;
  majority: number;
  termMonths: number;
}) {
  const months: number | null = cycle?.monthsToElection ?? null;
  const cycleNumber = cycle?.cycleNumber;
  const electionArc = cycle?.electionArc;

  const bigValue = months == null ? '—' : months <= 0 ? 'IMMINENT' : String(months).padStart(2, '0');
  const unit = months == null || months <= 0 ? '' : months === 1 ? 'MONTH' : 'MONTHS';

  // 1 in-game month = 8 real hours (GDD $3).
  const realHours = months != null ? months * REAL_HOURS_PER_MONTH : null;
  const realNote = realHours != null && months! > 0
    ? `≈ ${Math.floor(realHours / 24)}d ${realHours % 24}h real time`
    : null;

  // Term progress toward Election Day (0–100). Hidden if we can't compute it.
  const termProgress = months != null && termMonths > 0
    ? Math.max(0, Math.min(100, ((termMonths - months) / termMonths) * 100))
    : null;

  return (
    <Panel accent style={{ textAlign: 'center', padding: '26px 24px 20px' }}>
      <Stamp style={{ justifyContent: 'center' }}>Next Election</Stamp>
      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.3em', color: T.muted, marginTop: 14 }}>ELECTION DAY</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 12, marginTop: 4 }}>
        <span style={{ fontFamily: MONO, fontSize: 52, fontWeight: 800, color: T.ivory, letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{bigValue}</span>
        {unit && <span style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.24em', color: T.gold }}>{unit}</span>}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.14em', color: T.muted, marginTop: 8, textTransform: 'uppercase' }}>
        {jurisdictionName} Assembly{cycleNumber != null ? ` · Cycle ${cycleNumber}` : ''}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, marginTop: 4 }}>
        {seats} seats · {majority} for a majority{electionArc != null ? ` · resolves at arc ${electionArc}` : ''}{realNote ? ` · ${realNote}` : ''}
      </div>

      {termProgress != null && (
        <div style={{ maxWidth: 520, margin: '18px auto 0', textAlign: 'left' }}>
          <Meter label="Term progress" value={termProgress} display={`${Math.round(termProgress)}%`} tone={T.gold} height={6} />
        </div>
      )}
      <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, marginTop: 12, letterSpacing: '0.04em' }}>
        Campaign, court blocs and propose laws anytime — there are no locked phases. The vote simply resolves on Election Day.
      </div>
    </Panel>
  );
}

export default function ElectionsScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, overview, character, parties }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const jModel = JURISDICTION_MODEL[selectedJurisdictionId] || JURISDICTION_MODEL.ironvale;
  const { data: polls } = useSWR(isLocked ? null : ['polls', selectedJurisdictionId], () => politicsApi.getPolls(selectedJurisdictionId).catch(() => null));

  const myParty = Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id) : undefined;
  const myPlatform = myParty?.platform;

  const projections: any[] = Array.isArray(polls) ? polls : (polls?.parties || polls?.projections || []);
  const maxSeats = projections.reduce((m: number, p: any) => Math.max(m, Number(p.projected_seats ?? p.seats ?? 0)), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />

      <div>
        <Stamp>Electorate · {jurisdiction?.name}</Stamp>
        <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '8px 0 0' }}>Read the Room</h1>
        <p style={{ color: T.muted, fontSize: 14, marginTop: 6, maxWidth: 640 }}>Every bloc has an ideal platform. Court the ones no rival owns — standing where others stand splits the vote.</p>
      </div>

      {isLocked ? (
        <Panel title="Locked"><div style={{ color: T.faint, fontStyle: 'italic' }}>{jurisdiction?.name} is not yet open for political activity.</div></Panel>
      ) : (
        <>
          <ElectionHero
            jurisdictionName={jurisdiction?.name || 'Ironvale'}
            cycle={overview?.cycle}
            seats={jModel.seats}
            majority={jModel.majority}
            termMonths={jModel.termMonths}
          />

          <Panel title="The Electorate">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
              {SEGMENTS.map((seg: any) => {
                const fit = fitPct(myPlatform, seg);
                const sizePct = Math.round(seg.size * 100);
                return (
                  <div key={seg.key} style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 4, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ color: T.ivory, fontWeight: 700, fontSize: 15 }}>{BLOC_NAME_BY_KEY[seg.key] || seg.label}</span>
                      <span style={{ color: T.gold, fontFamily: MONO, fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{sizePct}%</span>
                    </div>
                    <div style={{ color: T.faint, fontFamily: MONO, fontSize: 10.5, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{leaning(seg)}</div>
                    <div style={{ marginTop: 10 }}>
                      <Meter label="Bloc size" value={sizePct} display={`${sizePct}%`} tone={T.blue} height={5} />
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <Meter label="Your Fit" value={fit} display={fit == null ? '—' : `${fit}%`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Live Projections — if the vote were held today">
            {projections.length === 0 ? (
              <div style={{ color: T.faint, fontStyle: 'italic' }}>Projections sharpen as parties file and campaigns build reach. The result is resolved on Election Day above.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {projections.slice(0, 8).map((p: any, i: number) => {
                  const share = Number(p.projected_share ?? p.share ?? p.vote_share ?? 0);
                  const seats = p.projected_seats ?? p.seats;
                  const pct = share <= 1 ? share * 100 : share;
                  const barVal = seats != null && maxSeats > 0 ? (Number(seats) / maxSeats) * 100 : pct;
                  const isMine = myParty && (p.id === myParty.id || p.party_id === myParty.id || p.name === myParty.name);
                  return (
                    <div key={p.id || p.party_id || i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: isMine ? T.gold : T.text, fontSize: 13, fontWeight: isMine ? 700 : 400 }}>{p.name || p.party_name || 'Party'}{isMine ? ' · You' : ''}</span>
                        <span style={{ color: T.muted, fontFamily: MONO, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{seats != null ? `${seats} seats · ${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}</span>
                      </div>
                      <Meter value={barVal} tone={isMine ? T.gold : T.blue} height={7} />
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
