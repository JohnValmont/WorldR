// ───────────────────────────────────────────────────────────────────────────
// WORLDr — Political Desk shared VISUALISATION kit.
// Turns raw engine numbers (perParty / segmentShares) into the visual language of
// an election night: a parliament hemicycle, vote-share bars, and a bloc-contest
// map. Import these so every political screen speaks the same visual dialect.
// All colours come from the T palette; no external chart libraries.
// ───────────────────────────────────────────────────────────────────────────
'use client';
import React from 'react';
import { T, MONO } from '../_lib/theme';

// ─── Party colours ────────────────────────────────────────────────────
// Stable colour per Creed (doctrine_id) so a party keeps its colour everywhere.
// Falls back to a deterministic palette slot for unknown / independent parties.
const CREED_COLORS: Record<string, string> = {
  forge_accord: '#d98a4a', // Populist  — ember orange
  the_ledger:   '#5f8fbf', // Liberal   — market blue
  the_homestead:'#7c6fae', // Conservative — royal violet
  the_commons:  '#c8624f', // Socialist — red
  the_vanguard: '#5fbf8f', // Progressive — mint green
  the_compact:  '#d4a24a', // Centrist  — gold
};
const FALLBACK_PALETTE = ['#5f8fbf', '#c8624f', '#5fbf8f', '#d4a24a', '#7c6fae', '#d98a4a', '#4aa3a3', '#b06f9c'];

export interface PartyLike {
  id?: string;
  party_id?: string;
  name?: string;
  doctrine_id?: string | null;
  leader_character_id?: string | null;
  is_npc?: boolean;
}

/** Deterministic colour for a party: by Creed first, else a stable palette slot. */
export function partyColor(party: PartyLike | undefined, index = 0): string {
  if (party?.doctrine_id && CREED_COLORS[party.doctrine_id]) return CREED_COLORS[party.doctrine_id];
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

// ─── Parliament hemicycle ───────────────────────────────────────────────
export interface SeatBloc {
  partyId: string;
  name: string;
  color: string;
  seats: number;
  isMine?: boolean;
}

interface SeatDot { x: number; y: number; }

/** Lay out `total` seats as concentric arcs of a semicircle (left→right by angle). */
function layoutSeats(total: number, w: number): { dots: SeatDot[]; r: number } {
  if (total <= 0) return { dots: [], r: 6 };
  const cx = w / 2;
  const cy = w / 2; // baseline sits at vertical centre of the square-ish viewbox
  const rows = Math.max(3, Math.min(9, Math.round(Math.sqrt(total / 2.2))));
  const rMax = w / 2 - 12;
  const rMin = rMax * 0.42;
  // Seats per row are proportional to the row radius (outer rows are longer).
  const radii: number[] = [];
  for (let i = 0; i < rows; i++) radii.push(rMin + ((rMax - rMin) * i) / Math.max(1, rows - 1));
  const weightSum = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.max(1, Math.round((r / weightSum) * total)));
  // Fix rounding drift so counts sum to `total`.
  let drift = total - counts.reduce((a, b) => a + b, 0);
  for (let i = counts.length - 1; drift !== 0 && i >= 0; i--) {
    const step = drift > 0 ? 1 : -1;
    if (counts[i] + step >= 1) { counts[i] += step; drift -= step; }
  }
  // Build dots, then sort by angle so party colours fill left→right like a real chamber.
  const raw: { angle: number; x: number; y: number }[] = [];
  for (let i = 0; i < rows; i++) {
    const n = counts[i];
    const r = radii[i];
    for (let s = 0; s < n; s++) {
      const t = n === 1 ? 0.5 : s / (n - 1);
      const angle = Math.PI + t * Math.PI; // 180°→360°
      raw.push({ angle, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  }
  raw.sort((a, b) => a.angle - b.angle);
  const dotR = Math.max(3.5, Math.min(7, rMax / (rows * 2.6)));
  return { dots: raw.map((d) => ({ x: d.x, y: d.y })), r: dotR };
}

/**
 * Parliament seating arc. Colours seats party-by-party (in `blocs` order),
 * draws the majority threshold, and can partially fill for an election-night reveal.
 */
export function Hemicycle({
  blocs,
  total,
  majority,
  revealFraction = 1,
  height = 190,
}: {
  blocs: SeatBloc[];
  total: number;
  majority?: number;
  /** 0..1 — fraction of seats to show as "called" (rest render as empty benches). */
  revealFraction?: number;
  height?: number;
}) {
  const w = height * 2; // 2:1 viewbox for a semicircle
  const { dots, r } = layoutSeats(total, w);
  // Assign each dot to a party in order.
  const seatParty: (SeatBloc | null)[] = [];
  let idx = 0;
  for (const b of blocs) for (let i = 0; i < b.seats && idx < dots.length; i++) { seatParty[idx] = b; idx++; }
  while (seatParty.length < dots.length) seatParty.push(null);
  const revealed = Math.round(dots.length * Math.max(0, Math.min(1, revealFraction)));

  return (
    <div style={{ width: '100%', maxWidth: w, margin: '0 auto' }}>
      <svg viewBox={`0 0 ${w} ${w / 2 + 14}`} width="100%" style={{ display: 'block' }}>
        {/* majority marker — vertical tick at chamber apex */}
        {majority != null && (
          <line x1={w / 2} y1={8} x2={w / 2} y2={26} stroke={T.gold} strokeWidth={1.5} strokeDasharray="2 2" opacity={0.7} />
        )}
        {dots.map((d, i) => {
          const p = seatParty[i];
          const shown = i < revealed;
          const fill = !shown || !p ? T.raised : p.color;
          return (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={r}
              fill={fill}
              stroke={p?.isMine && shown ? T.ivory : 'none'}
              strokeWidth={p?.isMine ? 1.4 : 0}
              style={{ transition: 'fill .25s ease' }}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ─── Vote-share / seat bars ────────────────────────────────────────────
export interface VoteRow {
  key: string;
  name: string;
  color: string;
  votes: number;
  seats: number;
  isMine?: boolean;
}

/** Ranked party bars showing seats + vote share, coloured by party. */
export function PartyBars({
  rows,
  totalVotes,
  maxSeats,
  revealFraction = 1,
}: {
  rows: VoteRow[];
  totalVotes: number;
  maxSeats: number;
  revealFraction?: number;
}) {
  if (!rows.length) {
    return <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 13 }}>No parties have filed yet.</div>;
  }
  const rf = Math.max(0, Math.min(1, revealFraction));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((p) => {
        const sharePct = totalVotes > 0 ? (p.votes / totalVotes) * 100 : 0;
        const barPct = maxSeats > 0 ? (p.seats / maxSeats) * 100 : sharePct;
        return (
          <div key={p.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: p.color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: p.isMine ? T.gold : T.text, fontSize: 13, fontWeight: p.isMine ? 700 : 500 }}>
                  {p.name}{p.isMine ? ' · You' : ''}
                </span>
              </span>
              <span style={{ color: T.muted, fontFamily: MONO, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(p.seats * rf)} <span style={{ color: T.faint }}>seats</span> · {(sharePct * rf).toFixed(1)}%
              </span>
            </div>
            <div style={{ height: 8, background: T.bg, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${barPct * rf}%`, height: '100%', background: p.color, transition: 'width .5s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Bloc-contest row (electorate map) ───────────────────────────────────
/** One voter bloc as a contested seat: size, leaning, who's winning it, your Fit. */
export function BlocContest({
  label,
  sizePct,
  leaning,
  turnoutPct,
  winnerName,
  winnerColor,
  winnerShare,
  myShare,
  myFit,
  crowding,
}: {
  label: string;
  sizePct: number;
  leaning: string;
  turnoutPct?: number | null;
  winnerName?: string | null;
  winnerColor?: string | null;
  winnerShare?: number | null; // 0..1
  myShare?: number | null; // 0..1
  myFit?: number | null; // 0..100
  crowding?: number | null; // # parties clustered on this bloc
}) {
  const winPct = winnerShare != null ? Math.round(winnerShare * 100) : null;
  const minePct = myShare != null ? Math.round(myShare * 100) : null;
  const iWin = winnerName && minePct != null && winPct != null && myShare != null && winnerShare != null && Math.abs(myShare - winnerShare) < 1e-6;
  return (
    <div style={{ background: T.panel2, border: `1px solid ${iWin ? T.goldLine : T.border}`, borderRadius: 4, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: T.ivory, fontWeight: 700, fontSize: 14.5 }}>{label}</span>
        <span style={{ color: T.gold, fontFamily: MONO, fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{Math.round(sizePct)}%</span>
      </div>
      <div style={{ color: T.faint, fontFamily: MONO, fontSize: 10, marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {leaning}{turnoutPct != null ? ` · ${Math.round(turnoutPct)}% turnout` : ''}
      </div>

      {/* Who is winning this bloc */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: winnerColor || T.faint, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ color: winnerName ? T.text : T.faint, fontSize: 12 }}>
          {winnerName ? `${winnerName} leads` : 'Uncontested'}{winPct != null ? ` · ${winPct}%` : ''}
        </span>
      </div>

      {/* Your standing in this bloc */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ color: T.muted, fontSize: 11 }}>Your Fit</span>
          <span style={{ color: myFit == null ? T.faint : myFit >= 60 ? T.mint : myFit >= 40 ? T.gold : T.red, fontFamily: MONO, fontSize: 11 }}>
            {myFit == null ? '—' : `${myFit}%`}{minePct != null ? ` · ${minePct}% share` : ''}
          </span>
        </div>
        <div style={{ height: 5, background: T.bg, borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${myFit == null ? 0 : Math.max(0, Math.min(100, myFit))}%`, height: '100%', background: myFit == null ? T.faint : myFit >= 60 ? T.mint : myFit >= 40 ? T.gold : T.red, transition: 'width .4s ease' }} />
        </div>
      </div>

      {crowding != null && crowding > 1 && (
        <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 10, color: T.red, letterSpacing: '0.04em' }}>
          ⚔ {crowding} parties crowding this bloc — the vote splits
        </div>
      )}
    </div>
  );
}

// ─── Momentum pill ───────────────────────────────────────────────────
export function Momentum({ delta }: { delta: number | null | undefined }) {
  if (delta == null || Math.abs(delta) < 0.05) {
    return <span style={{ color: T.faint, fontFamily: MONO, fontSize: 11 }}>— steady</span>;
  }
  const up = delta > 0;
  return (
    <span style={{ color: up ? T.mint : T.red, fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>
      {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
    </span>
  );
}
