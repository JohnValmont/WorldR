'use client';
// The Desk: everything that needs you this month, on one screen.
import React, { useState } from 'react';
import { politicsApi } from '@/lib/api';
import { formatPolArc } from '@/lib/calendar';
import type { HandCard } from './types';
import { Btn, Card, Chip, EffectChips, Label, Meter, PartyDot, T, money, pct, signed, useFloor, leaderTitle } from './kit';
import { BillCard } from './bills';

const TONE = { good: T.good, mixed: T.accent, bad: T.bad } as const;

function Situation({ card }: { card: HandCard }) {
  const { desk, act, busy } = useFloor();
  const segs = desk.desk.segments;
  const ap = desk.me?.ap.current ?? 0;
  if (card.status === 'resolved' && card.result) {
    return (
      <Card className="p-4" style={{ opacity: 0.92 }}>
        <Label>{card.kicker} · decided</Label>
        <h3 className="font-serif text-lg font-bold mt-0.5" style={{ color: T.text }}>{card.title}</h3>
        <div className="text-xs mt-1" style={{ color: T.faint }}>You chose: {card.options[card.chosen ?? 0]?.label}</div>
        <p className="text-sm mt-2 pl-3" style={{ color: T.text, borderLeft: `2px solid ${TONE[card.result.tone]}` }}>{card.result.text}</p>
        <div className="mt-2"><EffectChips effects={card.result.effects} segments={segs} /></div>
      </Card>
    );
  }
  return (
    <Card className="p-4 sm:p-5" tone="accent">
      <Label color={T.accent}>{card.kicker}</Label>
      <h3 className="font-serif text-xl font-bold mt-0.5 leading-snug" style={{ color: T.text }}>{card.title}</h3>
      <p className="text-sm mt-2 leading-relaxed" style={{ color: T.dim }}>{card.body}</p>
      <div className={`mt-4 grid gap-2 ${card.options.length === 3 ? 'md:grid-cols-3' : card.options.length === 2 ? 'md:grid-cols-2' : ''}`}>
        {card.options.map((o, i) => {
          const cant = o.cost.ap > ap;
          return (
            <button key={i} type="button" disabled={busy || cant} id={`sit-${card.key}-${i}`}
              onClick={() => act(() => politicsApi.chooseSituation(card.id, i))}
              className="w-full h-full text-left rounded-xl p-3 transition-colors disabled:opacity-45 hover:brightness-125"
              style={{ background: T.raised, border: `1px solid ${T.line}` }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: T.text }}>{o.label}</span>
                {o.cost.ap > 0 && <Chip color={T.accent}>{o.cost.ap} energy</Chip>}
                {o.cost.cash > 0 && <Chip color={T.accent}>{money(o.cost.cash)} of yours</Chip>}
                {o.cost.funds > 0 && <Chip color={T.accent}>{money(o.cost.funds)} party funds</Chip>}
              </div>
              <div className="mt-1.5 space-y-1">
                {o.outcomes.map((oc, j) => (
                  <div key={j} className="flex flex-wrap items-center gap-1.5 text-[11px]" style={{ color: T.faint }}>
                    {o.outcomes.length > 1 && <span className="font-mono w-9 shrink-0" style={{ color: TONE[oc.tone] }}>{pct(oc.chance)}</span>}
                    <EffectChips effects={oc.effects} segments={segs} />
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function QuickActions() {
  const { desk, act, busy } = useFloor();
  const a = desk.desk.actions;
  const me = desk.me!;
  const [last, setLast] = useState<string | null>(null);
  if (!a || !me.party) return null;
  const ap = me.ap.current;
  const support = desk.desk.support[me.party.id] ?? {};
  const target = desk.desk.supportTargets[me.party.id] ?? {};
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <Label>Win voters</Label>
        <span className="text-[11px]" style={{ color: T.faint }}>Support fades back toward your party's natural level each month</span>
      </div>
      <div className="mt-3 space-y-2">
        {desk.desk.segments.map(s => (
          <div key={s.key} className="flex items-center gap-3">
            <div className="w-24 shrink-0">
              <div className="text-sm font-semibold" style={{ color: T.text }}>{s.short}{a.rally.homeGroup === s.key && <span className="ml-1.5 text-[9px] uppercase tracking-wider" style={{ color: T.accent }} title="Your home voter group: your rallies here go further">home</span>}</div>
              <div className="text-[10px]" style={{ color: T.faint }}>{pct(s.size)} of voters</div>
            </div>
            <div className="flex-1 min-w-0">
              <Meter value={support[s.key] ?? 0} color={me.party!.color} marker={target[s.key]} />
            </div>
            <div className="w-9 text-right font-mono text-sm" style={{ color: T.text }}>{Math.round(support[s.key] ?? 0)}</div>
            <Btn small disabled={busy || ap < a.rally.ap} id={`rally-${s.key}`}
              title={`Hold a rally: +${a.rally.gain[s.key]} support with ${s.label}`}
              onClick={() => act(() => politicsApi.rally(s.key), r => { const t = `Rally held: ${s.short} ${signed(r.gain, 1)}`; setLast(t); return t; })}>
              Rally +{a.rally.gain[s.key]}
            </Btn>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 flex flex-wrap items-center gap-2" style={{ borderTop: `1px solid ${T.line}` }}>
        <Btn small disabled={busy || ap < a.fundraise.ap} id="act-fundraise"
          onClick={() => act(() => politicsApi.fundraise(), r => `Fundraiser (${r.mood} night): ${money(r.take)} for the party.`)}>
          Fundraiser · {money(a.fundraise.low)}–{money(a.fundraise.high)}
        </Btn>
        <Btn small disabled={busy || ap < a.ad.ap} id="act-ad"
          title={a.ad.paidBy === 'you' ? 'Only the leader can spend party funds, so this comes from your own money.' : 'Paid from party funds.'}
          onClick={() => act(() => politicsApi.runAd(), r => `Ads are running: every group ${signed(r.gain, 1)}.`)}>
          Ad campaign +{a.ad.gain} all · {money(a.ad.cost)} {a.ad.paidBy === 'you' ? 'of yours' : 'party funds'}
        </Btn>
        <span className="text-[11px] ml-auto" style={{ color: T.faint }}>Rally {a.rally.ap} · fundraiser {a.fundraise.ap} · ads {a.ad.ap} energy</span>
      </div>
      {last && <div className="sr-only" aria-live="polite">{last}</div>}
    </Card>
  );
}

function Standing() {
  const { desk, go } = useFloor();
  const latest = desk.polls.latest;
  const hist = desk.polls.history;
  const prev = hist.length > 1 ? hist[hist.length - 2] : null;
  const mine = desk.me?.party?.id;
  if (!latest) return null;
  const rows = desk.parties.map(p => ({ p, share: latest.shares[p.id] ?? 0, seats: latest.seats[p.id] ?? 0, d: prev ? (latest.shares[p.id] ?? 0) - (prev.shares[p.id] ?? 0) : 0 }))
    .sort((a, b) => b.share - a.share);
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <Label>If the election were today</Label>
        <button type="button" className="text-[11px] underline" style={{ color: T.dim }} onClick={() => go('voters')}>Details</button>
      </div>
      <div className="mt-2 space-y-1.5">
        {rows.map(({ p, share, seats, d }) => (
          <div key={p.id} className="flex items-center gap-2 text-sm">
            <PartyDot color={p.color} />
            <span className="flex-1 truncate" style={{ color: p.id === mine ? T.text : T.dim, fontWeight: p.id === mine ? 700 : 400 }}>{p.name}</span>
            <span className="font-mono text-xs" style={{ color: Math.abs(d) < 0.0005 ? T.faint : d > 0 ? T.good : T.bad }}>{Math.abs(d) < 0.0005 ? '' : `${d > 0 ? '▲' : '▼'}${(Math.abs(d) * 100).toFixed(1)}`}</span>
            <span className="font-mono w-12 text-right" style={{ color: T.text }}>{pct(share, 1)}</span>
            <span className="font-mono w-8 text-right text-xs" style={{ color: T.faint }}>{seats}</span>
          </div>
        ))}
      </div>
      <div className="text-[11px] mt-2" style={{ color: T.faint }}>
        Vote share and projected seats of {desk.parliament.seats}. Majority {desk.parliament.majority}. Election in {desk.calendar.monthsToElection} month{desk.calendar.monthsToElection === 1 ? '' : 's'}.
      </div>
    </Card>
  );
}

/** Where you are on the road to power, and the one thing that gets you to the next step. */
function RoadToPower() {
  const { desk, go } = useFloor();
  const me = desk.me!;
  const title = leaderTitle(desk);
  const leadClout = desk.desk.rules.leadershipMinClout ?? 45;
  const steps = [
    { label: 'Join a party', done: !!me.party, hint: 'Pick the party closest to your views in the Party tab. You get a seat at once.', go: 'party' },
    { label: 'Hold a seat', done: me.hasSeat || me.rung === 'mp' || me.rung === 'minister' || me.rung === 'premier', hint: 'Join a party that holds seats, or stand in a district at the next election.', go: 'party' },
    { label: 'Lead your party', done: me.isPartyLeader, hint: me.influence >= leadClout ? 'You have the clout. Challenge for the leadership in the Party tab.' : `Build clout to ${leadClout} (you have ${me.influence}): keep your word, win votes, take the decisions that impress.`, go: 'party' },
    { label: 'Enter government', done: !!me.party?.inGovernment && (me.isPartyLeader || !!me.office), hint: me.party?.inGovernment ? 'Your party governs. Lead it, or be appointed a minister.' : 'Win seats and make your party the one others must ally with.', go: 'voters' },
    { label: title, done: me.rung === 'premier', hint: `Lead the largest party in the governing coalition and you become ${title}.`, go: 'chamber' },
  ];
  const next = steps.findIndex(s => !s.done);
  return (
    <Card className="p-4" tone={next >= 0 ? undefined : 'accent'}>
      <div className="flex items-baseline justify-between">
        <Label>Road to power</Label>
        {me.background && <span className="text-[11px]" style={{ color: T.faint }} title={me.background.edge}>{me.background.label}</span>}
      </div>
      <ol className="mt-3 relative">
        {steps.map((s, i) => {
          const isNext = i === next;
          return (
            <li key={s.label} className="flex gap-3 pb-3 last:pb-0 relative">
              {i < steps.length - 1 && <span className="absolute left-[9px] top-5 bottom-0 w-px" style={{ background: s.done ? T.accent : T.line }} />}
              <span className="relative z-10 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ width: 19, height: 19, background: s.done ? T.accent : isNext ? T.accentSoft : T.raised, border: `1px solid ${s.done || isNext ? T.accent : T.line}`, color: s.done ? '#17130A' : T.accent }}>
                {s.done ? '✓' : i + 1}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold" style={{ color: s.done ? T.dim : isNext ? T.text : T.faint }}>{s.label}</div>
                {isNext && (
                  <button type="button" onClick={() => go(s.go)} className="text-left text-xs mt-0.5 leading-snug hover:underline" style={{ color: T.dim }}>{s.hint}</button>
                )}
                {isNext && i === 2 && !me.isPartyLeader && <div className="mt-1.5 w-40"><Meter value={Math.min(me.influence, leadClout)} max={leadClout} /></div>}
              </div>
            </li>
          );
        })}
      </ol>
      {next < 0 && <p className="text-xs mt-2" style={{ color: T.accent }}>You run the country. Keep the coalition together and win the next election.</p>}
    </Card>
  );
}

function News() {
  const { desk } = useFloor();
  return (
    <Card className="p-4">
      <Label>The Gazette</Label>
      <div className="mt-2 space-y-2.5">
        {desk.news.slice(0, 7).map(n => (
          <div key={n.id}>
            <div className="text-sm font-semibold leading-snug" style={{ color: T.text }}>{n.headline}</div>
            <div className="text-[11px]" style={{ color: T.faint }}>{formatPolArc(n.arc)}</div>
          </div>
        ))}
        {desk.news.length === 0 && <div className="text-xs" style={{ color: T.faint }}>Nothing has happened yet.</div>}
      </div>
    </Card>
  );
}

export default function DeskView() {
  const { desk, act, busy, go } = useFloor();
  const me = desk.me;
  const hand = desk.desk.hand;
  const openCards = hand.filter(h => h.status === 'open');
  const doneCards = hand.filter(h => h.status === 'resolved');
  const openBills = desk.bills.filter(b => b.status === 'proposed');
  const toVote = me?.voteMode ? openBills.filter(b => !b.myVote) : [];
  const voted = me?.voteMode ? openBills.filter(b => b.myVote) : [];
  const incoming = desk.desk.deals?.incoming ?? [];

  if (!me) {
    return <Card className="p-6 text-sm" ><span style={{ color: T.dim }}>Create your character to enter politics.</span></Card>;
  }
  const nothingLeft = openCards.length === 0 && toVote.length === 0 && incoming.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5">
      <div className="space-y-4 min-w-0">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight" style={{ color: T.text }}>
            {openCards.length + toVote.length + incoming.length > 0
              ? `${openCards.length + toVote.length + incoming.length} thing${openCards.length + toVote.length + incoming.length === 1 ? '' : 's'} need you`
              : 'Your desk is clear'}
          </h2>
          <p className="text-sm mt-1" style={{ color: T.dim }}>{me.nextGoal}</p>
        </div>

        {!me.party && (
          <Card className="p-5" tone="accent">
            <Label color={T.accent}>Enter politics</Label>
            <h3 className="font-serif text-xl font-bold mt-1" style={{ color: T.text }}>Pick a side, or start one</h3>
            <p className="text-sm mt-1" style={{ color: T.dim }}>
              Join a party and you take one of its seats in Parliament today: you can vote on every bill at once.
              Or found your own for {money(desk.desk.rules.partyFoundingCost)} and fight for seats at the next election.
            </p>
            <div className="mt-3"><Btn kind="primary" onClick={() => go('party')} id="cta-party">Choose a party</Btn></div>
          </Card>
        )}

        {incoming.map(o => (
          <Card key={o.id} className="p-4" tone="accent">
            <Label color={T.accent}>An offer</Label>
            <p className="text-sm mt-1" style={{ color: T.text }}>
              <strong>{o.fromName}</strong> asks your party to vote <strong>{o.askedVote === 'yea' ? 'for' : 'against'}</strong> “{o.billTitle}”.
              In return they will owe you a favour{o.cash > 0 ? ` and donate ${money(o.cash)} to your party` : ''}.
            </p>
            <div className="flex gap-2 mt-3">
              <Btn small kind="primary" disabled={busy} onClick={() => act(() => politicsApi.respondPact(o.id, true), 'Deal struck. Your word is given.')}>Accept</Btn>
              <Btn small disabled={busy} onClick={() => act(() => politicsApi.respondPact(o.id, false), 'Offer declined.')}>Decline</Btn>
            </div>
          </Card>
        ))}

        {(desk.desk.handshakesIncoming ?? 0) > 0 && (
          <Card className="p-4" tone="accent">
            <Label color={T.accent}>In the corridors</Label>
            <p className="text-sm mt-1" style={{ color: T.text }}>
              {desk.desk.handshakesIncoming === 1 ? 'A politician has' : `${desk.desk.handshakesIncoming} politicians have`} offered you a deal.
            </p>
            <div className="mt-3"><Btn small kind="primary" onClick={() => go('corridors')} id="cta-corridors">See the offer{desk.desk.handshakesIncoming === 1 ? '' : 's'}</Btn></div>
          </Card>
        )}

        {openCards.map(c => <Situation key={c.id} card={c} />)}

        {toVote.length > 0 && <Label>Votes waiting for you</Label>}
        {toVote.map(b => <BillCard key={b.id} bill={b} compact />)}

        {me.party && <QuickActions />}

        {nothingLeft && me.party && (
          <p className="text-xs" style={{ color: T.faint }}>
            New decisions arrive when the month turns. Spend what energy you have left on voters above, or work the room in the Chamber.
          </p>
        )}

        {(doneCards.length > 0 || voted.length > 0) && <Label>Done this month</Label>}
        {doneCards.map(c => <Situation key={c.id} card={c} />)}
        {voted.map(b => <BillCard key={b.id} bill={b} compact />)}
      </div>

      <aside className="space-y-4">
        <RoadToPower />
        <Standing />
        <News />
      </aside>
    </div>
  );
}
