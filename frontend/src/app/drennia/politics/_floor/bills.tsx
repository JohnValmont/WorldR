'use client';
// Bills: the whip count, your vote, and working the room for more votes.
import React, { useState } from 'react';
import { politicsApi } from '@/lib/api';
import type { FloorBill, Vote } from './types';
import { Btn, Card, Chip, Label, PartyDot, Sheet, T, WhipBar, money, useFloor } from './kit';

const SOURCE_NOTE: Record<string, string> = {
  leader: 'leader has voted', pact: 'bound by a deal', favour: 'repaying a favour', pressure: 'under pressure', ideology: 'by conviction',
};

/** When Parliament counts this bill: bills are voted at the end of the month after they are tabled. */
function whenCounted(bill: FloorBill, arc: number): string {
  return bill.proposedArc >= arc ? 'Counted at the end of next month' : 'Counted when this month ends';
}

export function BillCard({ bill, compact = false }: { bill: FloorBill; compact?: boolean }) {
  const { desk, act, busy } = useFloor();
  const [dealing, setDealing] = useState(false);
  const me = desk.me;
  const open = bill.status === 'proposed';
  const total = desk.parliament.seats;
  const myPartyId = me?.party?.id;
  const myLine = myPartyId ? bill.partyVotes[myPartyId] : undefined;
  const mode = open ? me?.voteMode ?? null : null;
  const obligations = (desk.desk.deals?.favoursOwed ?? []).filter(f => f.status === 'called' && f.billId === bill.id);
  const promised = (desk.desk.deals?.pacts ?? []).find(p => p.billId === bill.id && !p.mine && p.status === 'accepted');
  const bound: Vote | null = obligations[0]?.vote ?? promised?.askedVote ?? null;

  const vote = (v: Vote) => act(() => politicsApi.voteBill(bill.id, v), mode === 'line'
    ? `Your party will vote ${v === 'yea' ? 'for' : 'against'}.`
    : `You voted ${v === 'yea' ? 'for' : 'against'}.`);

  return (
    <Card className="p-4" tone={bound && me?.isPartyLeader ? 'accent' : undefined}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px]" style={{ color: T.faint }}>
            {bill.proposer && <><PartyDot color={bill.proposer.color} /><span>{bill.proposer.name}</span></>}
            <span>·</span>
            <span>{bill.fromGovernment ? 'Government bill' : 'Opposition bill'}</span>
          </div>
          <h3 className="font-serif text-lg font-bold leading-snug mt-0.5" style={{ color: T.text }}>{bill.title}</h3>
        </div>
        {!open && <Chip color={bill.status === 'passed' ? T.good : T.bad} filled>{bill.status === 'passed' ? 'Passed' : 'Defeated'}</Chip>}
      </div>

      <div className="mt-3"><WhipBar yea={bill.tally.yea} nay={bill.tally.nay} total={total} margin={desk.desk.rules.passMargin} /></div>

      {!compact && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {desk.parties.filter(p => p.seats > 0).map(p => {
            const v = bill.partyVotes[p.id];
            const row = bill.byParty?.[p.id];
            const split = row && row.rebels > 0;
            return (
              <span key={p.id} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs" style={{ background: 'rgba(255,255,255,0.04)', color: T.dim }}
                title={open && v ? `${p.name}: ${SOURCE_NOTE[bill.lineSource?.[p.id]] ?? ''}` : p.name}>
                <PartyDot color={p.color} />
                <span className="font-semibold" style={{ color: T.text }}>{p.abbreviation}</span>
                <span style={{ color: v === 'yea' ? T.good : v === 'nay' ? T.bad : T.faint }}>{v === 'yea' ? 'for' : v === 'nay' ? 'against' : '–'}</span>
                {open && bill.lineSource?.[p.id] === 'pact' && <span title="Bound by a deal">🤝</span>}
                {open && bill.lineSource?.[p.id] === 'favour' && <span title="Repaying a favour">↩</span>}
                {split && <span style={{ color: T.accent }} title="MPs voting against their party">{row.rebels} rebel{row.rebels === 1 ? '' : 's'}</span>}
              </span>
            );
          })}
        </div>
      )}

      {open && bound && me?.isPartyLeader && (
        <div className="mt-3 rounded-xl p-3 text-sm" style={{ background: T.accentSoft, color: T.text }}>
          <strong>Your word is given:</strong> your party is expected to vote {bound === 'yea' ? 'for' : 'against'} this.
          {' '}Vote the other way and everyone will know you broke it.
        </div>
      )}

      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {mode ? (
            <>
              <Btn kind="yea" small disabled={busy} onClick={() => vote('yea')} id={`vote-yea-${bill.id}`}>{bill.myVote === 'yea' ? '✓ ' : ''}Vote for</Btn>
              <Btn kind="nay" small disabled={busy} onClick={() => vote('nay')} id={`vote-nay-${bill.id}`}>{bill.myVote === 'nay' ? '✓ ' : ''}Vote against</Btn>
              <span className="text-xs" style={{ color: T.faint }}>
                {mode === 'line'
                  ? `You set the line for all ${me?.party?.seats ?? 0} of your party's seats.`
                  : bill.myVote && myLine && bill.myVote !== myLine
                    ? 'You are defying your party: costs clout, earns a little trust.'
                    : `Your own seat. Your party is voting ${myLine === 'yea' ? 'for' : 'against'}.`}
              </span>
            </>
          ) : (
            <span className="text-xs" style={{ color: T.faint }}>{me?.party ? 'You need a seat in Parliament to vote.' : 'Join a party with seats to vote on this.'}</span>
          )}
          <span className="ml-auto text-[11px]" style={{ color: T.faint }}>{whenCounted(bill, desk.calendar.arc)}</span>
        </div>
      )}
      {open && desk.desk.deals?.canDeal && !compact && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.line}` }}>
          <Btn small onClick={() => setDealing(true)} id={`deal-${bill.id}`}>Work the room for votes</Btn>
        </div>
      )}
      {dealing && <DealSheet bill={bill} onClose={() => setDealing(false)} />}
    </Card>
  );
}

/** Ask other parties for their votes, or call in favours you are owed. */
function DealSheet({ bill, onClose }: { bill: FloorBill; onClose: () => void }) {
  const { desk, act, busy } = useFloor();
  const deals = desk.desk.deals!;
  const [want, setWant] = useState<Vote>(bill.partyVotes[desk.me!.party!.id] ?? 'yea');
  const [cash, setCash] = useState<Record<string, number>>({});
  const rules = desk.desk.rules;
  const forecasts = deals.forecasts[bill.id] ?? {};
  const held = deals.favoursHeld.filter(f => f.status === 'open');

  return (
    <Sheet title="Work the room" onClose={onClose} wide>
      <p className="text-sm mb-3" style={{ color: T.dim }}>
        <strong style={{ color: T.text }}>{bill.title}.</strong> Ask a party for its votes. In return you owe it a favour, which it can call in on a later bill.
        Keep your word and your reputation grows. Break it and nobody deals with you for a year.
      </p>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm" style={{ color: T.dim }}>I want them to vote</span>
        <Btn small kind={want === 'yea' ? 'yea' : 'ghost'} onClick={() => setWant('yea')}>for</Btn>
        <Btn small kind={want === 'nay' ? 'nay' : 'ghost'} onClick={() => setWant('nay')}>against</Btn>
      </div>
      <div className="space-y-2">
        {desk.parties.filter(p => forecasts[p.id]).map(p => {
          const f = forecasts[p.id];
          const current = bill.partyVotes[p.id];
          const already = current === want;
          const fc = f[want];
          const donation = cash[p.id] ?? 0;
          // The server decides; this mirrors its sum so the button tells the truth.
          const score = fc ? fc.score + donation / rules.pactCashPerPoint : 0;
          const needed = fc && !fc.accept ? Math.ceil((-fc.score * rules.pactCashPerPoint + 1) / 1000) * 1000 : 0;
          const reachable = needed > 0 && needed <= rules.pactMaxCash && fc!.score > -9;
          const favour = held.find(h => h.partyId === p.id);
          return (
            <div key={p.id} className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-center gap-2">
                <PartyDot color={p.color} size={10} />
                <span className="font-semibold text-sm" style={{ color: T.text }}>{p.name}</span>
                <span className="text-xs" style={{ color: T.faint }}>{p.seats} seats · now voting {current === 'yea' ? 'for' : 'against'}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {f.committed ? <span style={{ color: T.accent }}>Already committed on this bill.</span>
                  : already ? <span style={{ color: T.faint }}>Already voting your way.</span>
                  : f.human ? (
                    <>
                      <span style={{ color: T.dim }}>Led by a player. Your offer goes to their desk.</span>
                      <Btn small kind="primary" disabled={busy || f.live === 'offered'} onClick={() => act(() => politicsApi.offerPact(bill.id, p.id, want, donation), r => r.message)}>
                        {f.live === 'offered' ? 'Offer sent' : `Offer a favour (${rules.pactAp} energy)`}
                      </Btn>
                    </>
                  ) : (
                    <>
                      <span style={{ color: score > 0 ? T.good : T.bad }}>
                        {score > 0 ? 'They will agree.' : fc?.reason}
                      </span>
                      {score <= 0 && reachable && (
                        <Btn small onClick={() => setCash({ ...cash, [p.id]: needed })}>Add a {money(needed)} donation</Btn>
                      )}
                      {donation > 0 && <Chip color={T.accent}>with {money(donation)} from party funds</Chip>}
                      {score > 0 && (
                        <Btn small kind="primary" disabled={busy} onClick={() => act(() => politicsApi.offerPact(bill.id, p.id, want, donation), r => r.message)}>
                          Strike the deal ({rules.pactAp} energy)
                        </Btn>
                      )}
                    </>
                  )}
                {favour && !f.committed && !already && (
                  <Btn small kind="primary" disabled={busy} onClick={() => act(() => politicsApi.callFavour(favour.id, bill.id, want), `${p.name} must now vote ${want === 'yea' ? 'for' : 'against'}.`)}>
                    Call in their favour (free)
                  </Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {deals.wordBrokenLeft > 0 && <p className="text-xs mt-3" style={{ color: T.bad }}>Your party broke its word. Computer-run parties will not deal with you for {deals.wordBrokenLeft} more months.</p>}
    </Sheet>
  );
}

/** Pick a law and the change you want to make to it. */
export function TableBillSheet({ onClose, initialLawId = null }: { onClose: () => void; initialLawId?: string | null }) {
  const { desk, act, busy } = useFloor();
  const [lawId, setLawId] = useState<string | null>(initialLawId);
  const law = desk.laws.find(l => l.id === lawId) ?? null;
  const openCats = new Set(desk.bills.filter(b => b.status === 'proposed').map(b => b.category));
  const seatsOf = (ids: string[]) => desk.parties.filter(p => ids.includes(p.id)).reduce((a, p) => a + p.seats, 0);
  return (
    <Sheet title={law ? law.name : 'Table a bill'} onClose={onClose} wide>
      {!law ? (
        <>
          <p className="text-sm mb-3" style={{ color: T.dim }}>Choose a law to change. Costs {desk.me?.tableBillApCost} energy. Parliament votes at the end of next month.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {desk.laws.map(l => {
              const cur = l.options.find(o => o.id === l.currentOptionId);
              const blocked = openCats.has(l.id);
              return (
                <button key={l.id} type="button" disabled={blocked} onClick={() => setLawId(l.id)}
                  className="text-left rounded-xl p-3 disabled:opacity-40" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                  <div className="font-semibold text-sm" style={{ color: T.text }}>{l.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: T.faint }}>{blocked ? 'Already before Parliament' : `Now: ${cur?.name ?? '—'}`}</div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <button type="button" className="text-xs mb-3 underline" style={{ color: T.dim }} onClick={() => setLawId(null)}>← All laws</button>
          <div className="space-y-2">
            {law.options.map(o => {
              const current = o.id === law.currentOptionId;
              const backers = seatsOf(o.supporters);
              return (
                <div key={o.id} className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${current ? T.accent : T.line}` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm" style={{ color: T.text }}>{o.name}</div>
                      <div className="text-xs mt-1 flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: T.dim }}>
                        {Object.entries(o.effects).filter(([, v]) => v).map(([k, v]) => (
                          <span key={k}>{k.replace(/_/g, ' ')} <span style={{ color: (k === 'cost_of_living' ? v < 0 : v > 0) ? T.good : T.bad }}>{v > 0 ? '+' : ''}{v}</span></span>
                        ))}
                        {Object.values(o.effects).every(v => !v) && <span>No measured effect</span>}
                      </div>
                    </div>
                    {current ? <Chip color={T.accent}>Law today</Chip> : (
                      <Btn small kind="primary" disabled={busy} onClick={() => act(() => politicsApi.proposeBill('policy_change', { category: law.id, option: o.id }), 'Bill tabled.').then(ok => ok && onClose())}>
                        Table it
                      </Btn>
                    )}
                  </div>
                  {!current && (
                    <div className="text-[11px] mt-2" style={{ color: backers >= desk.parliament.majority ? T.good : T.faint }}>
                      Parties that prefer this to today's law hold {backers} of {desk.parliament.seats} seats.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Sheet>
  );
}

export function FavourLedger() {
  const { desk } = useFloor();
  const deals = desk.desk.deals;
  if (!deals) return null;
  const name = (id: string) => desk.parties.find(p => p.id === id);
  const live = (s: string) => ['pending', 'open', 'called'].includes(s);
  const held = deals.favoursHeld.filter(f => live(f.status));
  const owed = deals.favoursOwed.filter(f => live(f.status));
  const note = (f: { status: string; billTitle: string | null; vote: Vote | null }) =>
    f.status === 'pending' ? 'once they deliver' : f.status === 'called' ? `called: vote ${f.vote === 'yea' ? 'for' : 'against'} “${f.billTitle}”` : 'not yet called';
  return (
    <Card className="p-4">
      <Label>Favours</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 text-sm">
        <div>
          <div className="font-semibold mb-1" style={{ color: T.text }}>Owed to your party</div>
          {held.length === 0 && <div className="text-xs" style={{ color: T.faint }}>Nobody owes you anything yet.</div>}
          {held.map(f => <div key={f.id} className="flex items-center gap-2 text-xs py-0.5" style={{ color: T.dim }}><PartyDot color={name(f.partyId)?.color ?? T.faint} />{name(f.partyId)?.name} <span style={{ color: T.faint }}>· {note(f)}</span></div>)}
        </div>
        <div>
          <div className="font-semibold mb-1" style={{ color: T.text }}>Your party owes</div>
          {owed.length === 0 && <div className="text-xs" style={{ color: T.faint }}>You owe nobody.</div>}
          {owed.map(f => <div key={f.id} className="flex items-center gap-2 text-xs py-0.5" style={{ color: f.status === 'called' ? T.accent : T.dim }}><PartyDot color={name(f.partyId)?.color ?? T.faint} />{name(f.partyId)?.name} <span style={{ color: T.faint }}>· {note(f)}</span></div>)}
        </div>
      </div>
    </Card>
  );
}
