'use client';
// The Floor — look and small building blocks for the politics screens.
// One dark surface, one amber accent; party colours are the only other colour.
import React, { createContext, useContext, useEffect } from 'react';
import type { Desk, Effects, Segment } from './types';

export const T = {
  bg: '#0C0E13',
  surface: '#14171F',
  raised: '#1C202B',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.16)',
  text: '#ECEAE4',
  dim: '#A3A4AC',
  faint: '#6E707A',
  accent: '#E8B84B',
  accentSoft: 'rgba(232,184,75,0.12)',
  good: '#4FB286',
  bad: '#D9625A',
  goodSoft: 'rgba(79,178,134,0.12)',
  badSoft: 'rgba(217,98,90,0.12)',
} as const;

export const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
export const signed = (n: number, d = 0) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(d).replace(/\.0$/, '')}`;
export const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;

export interface FloorApi {
  desk: Desk;
  refresh: () => Promise<any>;
  /** Run an action, show the result as a toast, then reload the desk. */
  act: (fn: () => Promise<any>, okText?: string | ((res: any) => string)) => Promise<any>;
  busy: boolean;
  go: (tab: string) => void;
}
export const FloorContext = createContext<FloorApi | null>(null);
export function useFloor(): FloorApi {
  const v = useContext(FloorContext);
  if (!v) throw new Error('FloorContext missing');
  return v;
}

export function Card({ children, className = '', tone, style }: { children: React.ReactNode; className?: string; tone?: 'accent' | 'bad' | 'good'; style?: React.CSSProperties }) {
  const border = tone === 'accent' ? T.accent : tone === 'bad' ? T.bad : tone === 'good' ? T.good : T.line;
  return (
    <section className={`rounded-2xl ${className}`} style={{ background: T.surface, border: `1px solid ${border}`, ...style }}>
      {children}
    </section>
  );
}

export function Label({ children, color = T.faint }: { children: React.ReactNode; color?: string }) {
  return <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>{children}</div>;
}

type BtnKind = 'primary' | 'ghost' | 'yea' | 'nay' | 'quiet';
export function Btn({ children, onClick, kind = 'ghost', disabled, small, full, title, id }: {
  children: React.ReactNode; onClick?: () => void; kind?: BtnKind; disabled?: boolean; small?: boolean; full?: boolean; title?: string; id?: string;
}) {
  const styles: Record<BtnKind, React.CSSProperties> = {
    primary: { background: T.accent, color: '#17130A', border: `1px solid ${T.accent}` },
    ghost: { background: 'transparent', color: T.text, border: `1px solid ${T.lineStrong}` },
    yea: { background: T.goodSoft, color: T.good, border: `1px solid ${T.good}` },
    nay: { background: T.badSoft, color: T.bad, border: `1px solid ${T.bad}` },
    quiet: { background: 'transparent', color: T.dim, border: '1px solid transparent' },
  };
  return (
    <button
      id={id} type="button" title={title} onClick={onClick} disabled={disabled}
      className={`${small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'} ${full ? 'w-full' : ''} rounded-xl font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:opacity-75`}
      style={styles[kind]}
    >
      {children}
    </button>
  );
}

export function Chip({ children, color = T.dim, filled = false, title }: { children: React.ReactNode; color?: string; filled?: boolean; title?: string }) {
  return (
    <span title={title} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ color: filled ? '#0C0E13' : color, background: filled ? color : 'transparent', border: `1px solid ${color}` }}>
      {children}
    </span>
  );
}

export function PartyDot({ color, size = 8 }: { color: string; size?: number }) {
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: color }} />;
}

export function Meter({ value, max = 100, color = T.accent, marker, height = 6 }: { value: number; max?: number; color?: string; marker?: number; height?: number }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="relative w-full rounded-full" style={{ height, background: 'rgba(255,255,255,0.07)' }}>
      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${w}%`, background: color }} />
      {marker != null && <div className="absolute -inset-y-0.5 w-px" style={{ left: `${Math.max(0, Math.min(100, (marker / max) * 100))}%`, background: T.text, opacity: 0.6 }} />}
    </div>
  );
}

/** Energy as pips: the one budget every action draws on. Unused energy carries over, up to the cap. */
export function Energy({ current, cap }: { current: number; cap: number }) {
  const dense = cap > 12;
  return (
    <span className="inline-flex items-center gap-[2px]" title={`${current} of ${cap} energy. Each month adds 12; what you do not use carries over, up to ${cap}.`} aria-label={`${current} of ${cap} energy`}>
      {Array.from({ length: cap }, (_, i) => (
        <span key={i} className="inline-block rounded-sm" style={{ width: dense ? 3 : 5, height: 12, marginLeft: dense && i === 12 ? 3 : 0, background: i < current ? T.accent : 'rgba(255,255,255,0.12)' }} />
      ))}
      <span className="ml-1.5 font-mono" style={{ color: T.text }}>{current}</span>
    </span>
  );
}

const STAT_NAMES: Record<string, { name: string; lowerIsBetter?: boolean }> = {
  prosperity: { name: 'Prosperity' }, cost_of_living: { name: 'Cost of living', lowerIsBetter: true }, fiscal_health: { name: 'Public finances' },
  equity: { name: 'Fairness' }, human_development: { name: 'Health & schools' }, order_safety: { name: 'Law & order' },
  freedom_rights: { name: 'Freedoms' }, bureaucracy: { name: 'State capacity' }, global_standing: { name: 'Global standing' },
};
export const statName = (k: string) => STAT_NAMES[k]?.name ?? k;
export const statLowerIsBetter = (k: string) => !!STAT_NAMES[k]?.lowerIsBetter;

/** The consequences of a choice, as small coloured tokens. */
export function EffectChips({ effects, segments, rivalName }: { effects: Effects; segments: Segment[]; rivalName?: string }) {
  const out: { text: string; good: boolean }[] = [];
  if (effects.trust) out.push({ text: `Trust ${signed(effects.trust)}`, good: effects.trust > 0 });
  if (effects.clout) out.push({ text: `Clout ${signed(effects.clout)}`, good: effects.clout > 0 });
  if (effects.cash) out.push({ text: `${effects.cash > 0 ? '+' : '−'}${money(Math.abs(effects.cash))} you`, good: effects.cash > 0 });
  if (effects.funds) out.push({ text: `${effects.funds > 0 ? '+' : '−'}${money(Math.abs(effects.funds))} party`, good: effects.funds > 0 });
  for (const [k, v] of Object.entries(effects.support ?? {})) {
    if (!v) continue;
    const name = k === 'all' ? 'All voters' : segments.find(s => s.key === k)?.short ?? k;
    out.push({ text: `${name} ${signed(v, 1)}`, good: v > 0 });
  }
  if (effects.rival) out.push({ text: `${rivalName ?? 'Rival'} ${signed(effects.rival)}`, good: effects.rival < 0 });
  for (const [k, v] of Object.entries(effects.stat ?? {})) {
    if (!v) continue;
    out.push({ text: `${statName(k)} ${signed(v)}`, good: statLowerIsBetter(k) ? v < 0 : v > 0 });
  }
  if (!out.length) return <span className="text-[11px]" style={{ color: T.faint }}>No lasting effect</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {out.map((o, i) => <Chip key={i} color={o.good ? T.good : T.bad}>{o.text}</Chip>)}
    </span>
  );
}

/** A dialog that slides up from the bottom on phones and sits centred on larger screens. */
export function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose} />
      <div className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5`} style={{ background: T.raised, border: `1px solid ${T.lineStrong}` }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="font-serif text-xl font-bold leading-tight" style={{ color: T.text }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none px-2 -mr-2" style={{ color: T.dim }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Yes/no bar with the winning line in the middle. A bill passes with more yes than no. */
/** What the head of government is called in this player's nation. */
/** How well your sign-up convictions fit a party platform, 0..100 (same rule as character.rules.ts). */
export function convictionFit(conv: Record<string, number> | null | undefined, platform: Record<string, number> | undefined): number | null {
  if (!conv || !platform) return null;
  const axes = Object.keys(conv);
  if (!axes.length) return null;
  return Math.round(100 - axes.reduce((s, a) => s + Math.abs(conv[a] - Number((platform as any)[a] ?? 50)), 0) / axes.length);
}

export const leaderTitle = (desk: Desk) => desk.nation.headOfGovernment?.title ?? 'Premier';

export function WhipBar({ yea, nay, total, margin = 1 }: { yea: number; nay: number; total: number; margin?: number }) {
  const y = (yea / total) * 100, n = (nay / total) * 100;
  return (
    <div>
      <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="absolute inset-y-0 left-0" style={{ width: `${y}%`, background: T.good }} />
        <div className="absolute inset-y-0 right-0" style={{ width: `${n}%`, background: T.bad }} />
        <div className="absolute inset-y-0 w-px" style={{ left: '50%', background: T.text }} />
      </div>
      <div className="flex justify-between mt-1 text-xs font-mono">
        <span style={{ color: T.good }}>{yea} for</span>
        <span style={{ color: yea > nay && yea - nay < margin ? T.accent : T.faint }}>
          {yea - nay >= margin ? `passing by ${yea - nay}`
            : yea > nay ? `${yea - nay} ahead, needs ${margin}`
            : yea === nay ? 'tied: fails' : `failing by ${nay - yea}`}
        </span>
        <span style={{ color: T.bad }}>{nay} against</span>
      </div>
    </div>
  );
}
