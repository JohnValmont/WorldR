'use client';
import React, { useState } from 'react';
import type { Bill, Capitol, CapitolParty, Me, Rung } from './types';
import { C } from './theme';
import { PartyMark } from './art';
import { formatPolArc } from '@/lib/calendar';

export function Panel({ title, kicker, action, children, className = '', pad = true }: {
  title?: React.ReactNode; kicker?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section
      className={`rounded-xl relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(180deg, ${C.stone2} 0%, ${C.stone} 100%)`, border: `1px solid ${C.line}` }}
    >
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.brass}, transparent)`, opacity: 0.5 }} />
      {(title || kicker || action) && (
        <header className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4">
          <div className="min-w-0">
            {kicker && <div className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: C.brass }}>{kicker}</div>}
            {title && <h2 className="font-serif text-[15px] sm:text-base font-bold leading-tight mt-0.5" style={{ color: C.ivory }}>{title}</h2>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? 'px-4 sm:px-5 pb-4 pt-3' : ''}>{children}</div>
    </section>
  );
}

export function Pill({ children, color = C.brass, solid = false }: { children: React.ReactNode; color?: string; solid?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={solid ? { background: color, color: '#0A0E18' } : { color, border: `1px solid ${color}55`, background: `${color}14` }}
    >
      {children}
    </span>
  );
}

export function BrassButton({ children, onClick, disabled, variant = 'solid', title, small = false }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'solid' | 'ghost' | 'yea' | 'nay'; title?: string; small?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    solid: { background: `linear-gradient(180deg, #D9B33C, ${C.brass})`, color: '#14100A', border: '1px solid #E2C25A' },
    ghost: { background: 'transparent', color: C.ivory, border: `1px solid ${C.line}` },
    yea: { background: 'rgba(63,163,107,0.15)', color: '#7FD3A2', border: '1px solid rgba(63,163,107,0.5)' },
    nay: { background: 'rgba(194,72,63,0.15)', color: '#E88C84', border: '1px solid rgba(194,72,63,0.5)' },
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`${small ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-2 text-xs'} rounded-md font-semibold tracking-wide transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100`}
      style={styles[variant]}
    >
      {children}
    </button>
  );
}

/** Yes/no bar for a bill with the majority-of-votes-cast midpoint. */
export function TallyBar({ yea, nay, total }: { yea: number; nay: number; total: number }) {
  const abst = Math.max(0, total - yea - nay);
  return (
    <div>
      <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: '#1C2333' }}>
        <div style={{ width: `${(100 * yea) / total}%`, background: C.yea }} />
        <div style={{ width: `${(100 * abst) / total}%` }} />
        <div style={{ width: `${(100 * nay) / total}%`, background: C.nay }} />
      </div>
      <div className="flex justify-between text-[11px] mt-1 font-mono">
        <span style={{ color: '#7FD3A2' }}>{yea} yes</span>
        {abst > 0 && <span style={{ color: C.faint }}>{abst} not voting</span>}
        <span style={{ color: '#E88C84' }}>{nay} no</span>
      </div>
    </div>
  );
}

export function BillCard({ bill, cap, onVote, busy }: { bill: Bill; cap: Capitol; onVote?: (id: string, v: 'yea' | 'nay') => void; busy?: boolean }) {
  const parties = cap.parties;
  const byId = new Map(parties.map(p => [p.id, p]));
  const law = bill.category ? cap.laws.find(l => l.id === bill.category) : null;
  const from = law?.options.find(o => o.id === bill.currentOptionId)?.name;
  const me = cap.me;
  const canVote = bill.status === 'proposed' && me?.isPartyLeader && (me.party?.seats ?? 0) > 0;
  const statusPill = bill.status === 'proposed'
    ? <Pill color={bill.projectedPass ? C.yea : C.nay}>{bill.projectedPass ? 'Likely to pass' : 'Likely to fail'}</Pill>
    : bill.status === 'passed' ? <Pill color={C.yea} solid>Passed</Pill> : <Pill color={C.nay} solid>Defeated</Pill>;

  return (
    <article className="rounded-lg p-3.5" style={{ background: 'rgba(10,14,24,0.55)', border: `1px solid ${C.lineSoft}` }}>
      <div className="flex items-start gap-3">
        {bill.proposer && <PartyMark color={bill.proposer.color} abbr={bill.proposer.abbreviation} size={30} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold leading-snug" style={{ color: C.ivory }}>{bill.title}</h3>
            {statusPill}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: C.muted }}>
            {bill.proposer?.name ?? 'Unknown'} · {bill.fromGovernment ? 'government bill' : 'opposition bill'} · tabled {formatPolArc(bill.proposedArc)}
            {from && bill.status === 'proposed' && <> · replaces <span style={{ color: C.ink }}>{from}</span></>}
          </div>
        </div>
      </div>
      <div className="mt-3"><TallyBar yea={bill.tally.yea} nay={bill.tally.nay} total={cap.parliament.seats} /></div>
      {bill.status === 'proposed' && Object.keys(bill.partyVotes).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {Object.entries(bill.partyVotes).map(([pid, v]) => {
            const p = byId.get(pid);
            if (!p || !p.seats) return null;
            return (
              <span key={pid} className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${p.color}22`, color: v === 'yea' ? '#7FD3A2' : '#E88C84', border: `1px solid ${p.color}55` }}>
                {p.abbreviation} {v === 'yea' ? '✓' : '✗'} {p.seats}
              </span>
            );
          })}
        </div>
      )}
      {canVote && onVote && (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[11px]" style={{ color: C.muted }}>Your party&apos;s {me?.party?.seats} votes:</span>
          <BrassButton small variant="yea" disabled={busy} onClick={() => onVote(bill.id, 'yea')}>{bill.myVote === 'yea' ? '✓ Voting yes' : 'Vote yes'}</BrassButton>
          <BrassButton small variant="nay" disabled={busy} onClick={() => onVote(bill.id, 'nay')}>{bill.myVote === 'nay' ? '✗ Voting no' : 'Vote no'}</BrassButton>
        </div>
      )}
    </article>
  );
}

const RUNG_LABEL: Record<Rung, string> = { citizen: 'Citizen', member: 'Party member', candidate: 'Candidate', mp: 'Member of Parliament', minister: 'Minister', premier: 'Premier' };

export function CareerLadder({ me }: { me: Me }) {
  const idx = me.ladder.indexOf(me.rung);
  return (
    <div>
      <ol className="flex items-center">
        {me.ladder.map((r, i) => (
          <li key={r} className="flex items-center flex-1 last:flex-none min-w-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              title={RUNG_LABEL[r]}
              style={i <= idx ? { background: i === idx ? C.brass : 'rgba(201,162,39,0.35)', color: '#14100A' } : { border: `1px solid ${C.line}`, color: C.faint }}
            >
              {i + 1}
            </div>
            {i < me.ladder.length - 1 && <div className="h-px flex-1 mx-1" style={{ background: i < idx ? C.brass : C.line }} />}
          </li>
        ))}
      </ol>
      <div className="flex justify-between text-[10px] mt-1.5" style={{ color: C.muted }}>
        <span>Citizen</span><span className="hidden sm:inline">Member of Parliament</span><span>Premier</span>
      </div>
      <div className="mt-3 text-sm font-semibold" style={{ color: C.ivory }}>{me.office ?? RUNG_LABEL[me.rung]}</div>
      {me.seatDistrict && <div className="text-xs" style={{ color: C.muted }}>Seat: {me.seatDistrict}</div>}
      {!me.seatDistrict && me.candidacyDistrict && <div className="text-xs" style={{ color: C.muted }}>Standing in {me.candidacyDistrict}</div>}
      <p className="text-xs leading-relaxed mt-2" style={{ color: C.ink }}>{me.nextGoal}</p>
    </div>
  );
}

export function PlatformBars({ party }: { party: CapitolParty }) {
  const axes: { key: keyof CapitolParty['platform']; low: string; high: string }[] = [
    { key: 'taxation', low: 'High tax', high: 'Low tax' },
    { key: 'labour', low: 'Employers', high: 'Workers' },
    { key: 'investment', low: 'Private', high: 'State' },
    { key: 'trade', low: 'Protect', high: 'Open' },
    { key: 'stability', low: 'Reform', high: 'Order' },
  ];
  return (
    <div className="space-y-1">
      {axes.map(a => (
        <div key={a.key} className="flex items-center gap-2 text-[10px]" style={{ color: C.faint }}>
          <span className="w-14 text-right truncate">{a.low}</span>
          <div className="flex-1 h-1 rounded-full relative" style={{ background: '#1C2333' }}>
            <div className="absolute w-2 h-2 -top-0.5 rounded-full -translate-x-1/2" style={{ left: `${party.platform[a.key]}%`, background: party.color }} />
          </div>
          <span className="w-14 truncate">{a.high}</span>
        </div>
      ))}
    </div>
  );
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (fn: () => Promise<any>, okText: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: okText }); }
    catch (e: any) { setMsg({ ok: false, text: e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Something went wrong' }); }
    finally { setBusy(false); }
  };
  return { busy, msg, setMsg, run };
}

export function Toast({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <div className="text-xs px-3 py-2 rounded-md mt-2" style={{ background: msg.ok ? 'rgba(63,163,107,0.12)' : 'rgba(194,72,63,0.12)', color: msg.ok ? '#7FD3A2' : '#E88C84', border: `1px solid ${msg.ok ? 'rgba(63,163,107,0.4)' : 'rgba(194,72,63,0.4)'}` }}>
      {msg.text}
    </div>
  );
}
