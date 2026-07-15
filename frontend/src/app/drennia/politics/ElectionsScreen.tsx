'use client';
import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { SEGMENTS } from '@/lib/politicsConstants';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO } from './_lib/theme';
import { BLOC_NAME_BY_KEY, PILLAR_BY_AXIS, JURISDICTION_MODEL } from './_lib/model';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Panel, Stamp, Meter } from './_components/DeskUI';
import { Hemicycle, PartyBars, BlocContest, partyColor, type VoteRow, type SeatBloc } from './_components/Viz';
import ElectionNight, { type BlocCall } from './_components/ElectionNight';

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

const REAL_HOURS_PER_MONTH = 8; // GDD §3

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

/** Scheduled-election banner: countdown + term progress. No phase ceremony. */
function ElectionHero({ jurisdictionName, cycle, seats, majority, termMonths, onRunNight, canRun }: {
  jurisdictionName: string; cycle: any; seats: number; majority: number; termMonths: number;
  onRunNight: () => void; canRun: boolean;
}) {
  const months: number | null = cycle?.monthsToElection ?? null;
  const cycleNumber = cycle?.cycleNumber;
  const electionArc = cycle?.electionArc;
  const bigValue = months == null ? '—' : months <= 0 ? 'IMMINENT' : String(months).padStart(2, '0');
  const unit = months == null || months <= 0 ? '' : months === 1 ? 'MONTH' : 'MONTHS';
  const realHours = months != null ? months * REAL_HOURS_PER_MONTH : null;
  const realNote = realHours != null && months! > 0 ? `≈ ${Math.floor(realHours / 24)}d ${realHours % 24}h real time` : null;
  const termProgress = months != null && termMonths > 0 ? Math.max(0, Math.min(100, ((termMonths - months) / termMonths) * 100)) : null;

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
      <button
        onClick={onRunNight}
        disabled={!canRun}
        style={{ marginTop: 18, padding: '10px 20px', borderRadius: 4, cursor: canRun ? 'pointer' : 'default', fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', background: canRun ? T.gold : T.panel2, color: canRun ? '#1a1408' : T.faint, border: `1px solid ${canRun ? T.gold : T.border}` }}
      >
        ▶ Run Election Night
      </button>
      <div style={{ fontFamily: MONO, fontSize: 10, color: T.faint, marginTop: 10, letterSpacing: '0.04em' }}>
        Watch the result as if the vote were held today. Campaign, court blocs and legislate anytime — the vote simply resolves on Election Day.
      </div>
    </Panel>
  );
}

export default function ElectionsScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, overview, character, parties }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const jModel = JURISDICTION_MODEL[selectedJurisdictionId] || JURISDICTION_MODEL.ironvale;
  const { data: polls } = useSWR(
    isLocked ? null : ['polls', selectedJurisdictionId],
    () => politicsApi.getPolls(selectedJurisdictionId).catch(() => null),
    { refreshInterval: 20000 },
  );

  const [nightOpen, setNightOpen] = useState(false);

  const partyList = Array.isArray(parties) ? parties : [];
  const myParty = partyList.find((p: any) => p.leader_character_id === character?.id);
  const myPlatform = myParty?.platform;

  // ── Join engine output (perParty / segmentShares) to party names + colours ──
  const partyById = useMemo(() => {
    const m: Record<string, { party: any; color: string }> = {};
    partyList.forEach((p: any, i: number) => { m[p.id] = { party: p, color: partyColor(p, i) }; });
    return m;
  }, [partyList]);

  const perParty: any[] = Array.isArray(polls?.perParty) ? polls.perParty : [];
  const rows: VoteRow[] = useMemo(() => {
    return perParty
      .map((pp: any) => {
        const meta = partyById[pp.partyId];
        return {
          key: pp.partyId,
          name: meta?.party?.name || 'Independent',
          color: meta?.color || partyColor(undefined, 0),
          votes: Number(pp.votes || 0),
          seats: Number(pp.seats || 0),
          isMine: myParty ? pp.partyId === myParty.id : false,
        } as VoteRow;
      })
      .sort((a, b) => (b.seats - a.seats) || (b.votes - a.votes));
  }, [perParty, partyById, myParty]);

  const seatBlocs: SeatBloc[] = rows.map((r) => ({ partyId: r.key, name: r.name, color: r.color, seats: r.seats, isMine: r.isMine }));
  const totalVotes = rows.reduce((a, r) => a + r.votes, 0);
  const maxSeats = rows.reduce((m, r) => Math.max(m, r.seats), 0);
  const hasProjection = rows.length > 0 && totalVotes > 0;

  const segShares: Record<string, Record<string, number>> = polls?.segmentShares || {};

  // Bloc calls (for Election Night) + electorate map winners.
  const blocCalls: BlocCall[] = useMemo(() => {
    return SEGMENTS.map((seg: any) => {
      const shares = segShares[seg.key] || {};
      let winId = ''; let winShare = -1;
      for (const [pid, sh] of Object.entries(shares)) if ((sh as number) > winShare) { winShare = sh as number; winId = pid; }
      const meta = partyById[winId];
      return {
        label: BLOC_NAME_BY_KEY[seg.key] || seg.label,
        winnerName: meta?.party?.name || '—',
        winnerColor: meta?.color || T.faint,
        sharePct: winShare > 0 ? winShare * 100 : 0,
      };
    });
  }, [segShares, partyById]);

  const pulse = polls?.pulse;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />

      <div>
        <Stamp>Electorate · {jurisdiction?.name}</Stamp>
        <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '8px 0 0' }}>Read the Room</h1>
        <p style={{ color: T.muted, fontSize: 14, marginTop: 6, maxWidth: 640 }}>
          Every bloc has an ideal platform. Court the ones no rival owns — standing where others stand splits the vote.
        </p>
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
            onRunNight={() => setNightOpen(true)}
            canRun={hasProjection}
          />

          {/* ── Projected chamber ────────────────────────────────────── */}
          <Panel title="Projected Chamber — if the vote were held today">
            {!hasProjection ? (
              <div style={{ color: T.faint, fontStyle: 'italic' }}>Projections sharpen as parties file and campaigns build reach.</div>
            ) : (
              <>
                <Hemicycle blocs={seatBlocs} total={jModel.seats} majority={jModel.majority} height={180} />
                <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 11, color: T.faint, margin: '2px 0 18px' }}>
                  {jModel.majority} seats for a majority · {jModel.seats} total
                </div>
                <PartyBars rows={rows} totalVotes={totalVotes} maxSeats={maxSeats} />
                {(pulse?.title || pulse?.detail) && (
                  <div style={{ marginTop: 16, padding: '12px 14px', background: T.panel2, border: `1px solid ${T.goldLine}`, borderRadius: 4 }}>
                    {pulse?.title && <div style={{ color: T.gold, fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>{pulse.title}</div>}
                    {pulse?.detail && <div style={{ color: T.muted, fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{pulse.detail}</div>}
                  </div>
                )}
              </>
            )}
          </Panel>

          {/* ── Electorate map: each bloc as a contested seat ──────────────── */}
          <Panel title="The Electorate — who owns each bloc">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {SEGMENTS.map((seg: any) => {
                const shares = segShares[seg.key] || {};
                let winId = ''; let winShare = -1;
                let contesting = 0;
                for (const [pid, sh] of Object.entries(shares)) {
                  if ((sh as number) > 0.12) contesting++;
                  if ((sh as number) > winShare) { winShare = sh as number; winId = pid; }
                }
                const winMeta = partyById[winId];
                const myShare = myParty ? (shares[myParty.id] ?? null) : null;
                return (
                  <BlocContest
                    key={seg.key}
                    label={BLOC_NAME_BY_KEY[seg.key] || seg.label}
                    sizePct={seg.size * 100}
                    leaning={leaning(seg)}
                    winnerName={winMeta?.party?.name || null}
                    winnerColor={winMeta?.color || null}
                    winnerShare={winShare > 0 ? winShare : null}
                    myShare={myShare}
                    myFit={fitPct(myPlatform, seg)}
                    crowding={contesting}
                  />
                );
              })}
            </div>
          </Panel>
        </>
      )}

      <ElectionNight
        open={nightOpen}
        onClose={() => setNightOpen(false)}
        jurisdictionName={jurisdiction?.name || 'Ironvale'}
        mode="projection"
        rows={rows}
        totalSeats={jModel.seats}
        majority={jModel.majority}
        blocCalls={blocCalls}
        myPartyName={myParty?.name}
      />
    </div>
  );
}
