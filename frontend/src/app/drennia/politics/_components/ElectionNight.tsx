// ───────────────────────────────────────────────────────────────────────────
// WORLDr — Election Night overlay.
// A dramatised, animated reveal of an election result (or a live projection run
// "as if the vote were held today"). Seats fill the hemicycle progressively, vote
// bars count up, blocs are "called" one by one, then a verdict banner resolves the
// government maths (majority / largest-party / coalition needed). Pure presentation
// layered on the deterministic engine numbers — it invents nothing.
// ───────────────────────────────────────────────────────────────────────────
'use client';
import React, { useEffect, useState } from 'react';
import { T, MONO } from '../_lib/theme';
import { Hemicycle, PartyBars, type SeatBloc, type VoteRow } from './Viz';

export interface BlocCall {
  label: string;
  winnerName: string;
  winnerColor: string;
  sharePct: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  jurisdictionName: string;
  /** "PROJECTION" (live re-run) or "RESULT" (resolved Election Day). */
  mode: 'projection' | 'result';
  rows: VoteRow[]; // ranked, coloured, with seats + votes
  totalSeats: number;
  majority: number;
  blocCalls: BlocCall[];
  myPartyName?: string | null;
}

const DURATION = 3600; // ms for the seat-fill sweep

export default function ElectionNight({
  open,
  onClose,
  jurisdictionName,
  mode,
  rows,
  totalSeats,
  majority,
  blocCalls,
  myPartyName,
}: Props) {
  const [reveal, setReveal] = useState(0); // 0..1 sweep
  const [phase, setPhase] = useState<'intro' | 'counting' | 'verdict'>('intro');

  useEffect(() => {
    if (!open) { setReveal(0); setPhase('intro'); return; }
    setReveal(0);
    setPhase('intro');
    const t0 = window.setTimeout(() => setPhase('counting'), 900);
    let raf = 0;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / DURATION);
      setReveal(p);
      if (p < 1) raf = window.requestAnimationFrame(step);
      else setPhase('verdict');
    };
    const t1 = window.setTimeout(() => { raf = window.requestAnimationFrame(step); }, 900);
    return () => { window.clearTimeout(t0); window.clearTimeout(t1); window.cancelAnimationFrame(raf); };
  }, [open]);

  if (!open) return null;

  const seatBlocs: SeatBloc[] = rows.map((r) => ({ partyId: r.key, name: r.name, color: r.color, seats: r.seats, isMine: r.isMine }));
  const totalVotes = rows.reduce((a, r) => a + r.votes, 0);
  const maxSeats = rows.reduce((m, r) => Math.max(m, r.seats), 0);
  const leader = rows[0];
  const leaderMajority = leader ? leader.seats >= majority : false;
  const calledBlocs = Math.round(blocCalls.length * reveal);

  // Verdict text
  let verdictTitle = '';
  let verdictBody = '';
  if (phase === 'verdict' && leader) {
    if (leaderMajority) {
      verdictTitle = `${leader.name} wins a majority`;
      verdictBody = `${leader.seats} of ${totalSeats} seats — clear command of the chamber. ${leader.isMine ? 'The Premiership is yours.' : 'They form a government alone.'}`;
    } else {
      const short = majority - leader.seats;
      verdictTitle = `Hung chamber — ${leader.name} largest`;
      verdictBody = `${leader.seats}/${totalSeats}, ${short} short of the ${majority} needed. A coalition must be brokered.${leader.isMine ? ' Open Formation to negotiate.' : ''}`;
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(6,7,9,0.86)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 720, background: T.panel, border: `1px solid ${T.goldLine}`,
          borderRadius: 6, boxShadow: `0 0 0 1px ${T.goldSoft}, 0 30px 80px rgba(0,0,0,0.6)`,
          padding: '22px 24px 24px', maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 12, background: T.gold, borderRadius: 1 }} />
            <span style={{ fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.24em', fontSize: 10, color: T.faint }}>
              {jurisdictionName} · {mode === 'result' ? 'Election Result' : 'Live Projection'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 4, fontFamily: MONO, fontSize: 11, padding: '4px 10px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            Close
          </button>
        </div>

        {/* headline */}
        <div style={{ textAlign: 'center', marginTop: 14, minHeight: 30 }}>
          <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.28em', color: T.muted, textTransform: 'uppercase' }}>
            {phase === 'intro' ? 'Polls have closed' : phase === 'counting' ? 'Counting the vote…' : 'Result declared'}
          </div>
        </div>

        {/* hemicycle */}
        <div style={{ marginTop: 10 }}>
          <Hemicycle blocs={seatBlocs} total={totalSeats} majority={majority} revealFraction={reveal} height={190} />
          <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 11, color: T.faint, marginTop: -4 }}>
            {majority} seats for a majority · {totalSeats} total
          </div>
        </div>

        {/* bars */}
        <div style={{ marginTop: 18 }}>
          <PartyBars rows={rows} totalVotes={totalVotes} maxSeats={maxSeats} revealFraction={reveal} />
        </div>

        {/* bloc calls */}
        {blocCalls.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 10, color: T.faint, marginBottom: 8 }}>Blocs Called</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {blocCalls.map((b, i) => {
                const called = i < calledBlocs;
                return (
                  <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 4, background: called ? T.panel2 : T.bg, border: `1px solid ${called ? T.border : T.borderSoft}`, opacity: called ? 1 : 0.45, transition: 'opacity .3s' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: called ? b.winnerColor : T.faint }} />
                    <span style={{ fontSize: 12, color: T.text }}>{b.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: T.muted }}>{called ? `${b.winnerName} ${Math.round(b.sharePct)}%` : '…'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* verdict */}
        {phase === 'verdict' && leader && (
          <div style={{ marginTop: 20, padding: '16px 18px', borderRadius: 5, background: leaderMajority ? T.goldSoft : `${T.red}14`, border: `1px solid ${leaderMajority ? T.goldLine : `${T.red}55`}` }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: leaderMajority ? T.gold : T.red }}>Verdict</div>
            <div style={{ color: T.ivory, fontSize: 18, fontWeight: 700, marginTop: 6 }}>{verdictTitle}</div>
            <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{verdictBody}</div>
          </div>
        )}
      </div>
    </div>
  );
}
