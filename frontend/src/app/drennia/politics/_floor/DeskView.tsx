'use client';
// The Desk: everything that needs you this month, on one screen.
import React, { useState } from 'react';
import { politicsApi } from '@/lib/api';
import { formatPolArc } from '@/lib/calendar';
import type { HandCard } from './types';
import { Btn, Card, Chip, EffectChips, Label, Meter, PartyDot, T, money, pct, signed, useFloor, leaderTitle } from './kit';
import { BillCard } from './bills';
import { coalitionNeedsMe } from './CoalitionView';
import { RaceHero } from './race';
import { electionLine } from './worldKit';

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
              aria-describedby={cant ? `sit-${card.key}-${i}-why` : undefined}
              className="w-full h-full text-left rounded-xl p-3 transition-colors enabled:hover:brightness-125 disabled:cursor-not-allowed"
              style={{ background: cant ? 'transparent' : T.raised, border: `1px ${cant ? 'dashed' : 'solid'} ${cant ? T.lineStrong : T.line}` }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: T.text }}>{o.label}</span>
                {o.cost.ap > 0 && <Chip color={T.accent}>{o.cost.ap} energy</Chip>}
                {cant && <span id={`sit-${card.key}-${i}-why`} className="text-[11px]" style={{ color: T.faint }}>Needs {o.cost.ap} energy · you have {ap}</span>}
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
              <div className="text-sm font-semibold" style={{ color: T.text }}>{s.short}{a.rally.homeGroup === s.key && <span className="ml-1.5 text-[10px] uppercase tracking-wider" style={{ color: T.accent }} title="Your home voter group: your rallies here go further">home</span>}</div>
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
        Vote share and projected seats of {desk.parliament.seats}. Majority {desk.parliament.majority}. {electionLine(desk.desk.world.find(n => n.mine)?.election)}.
      </div>
    </Card>
  );
}

/**
 * The career ladder: eight rungs from citizen to world statesman. Shows where you
 * stand, the highest you have climbed, what the next rung needs, and your record.
 */
/** First steps for a new player. Ticks come from the server; the card goes away when all are done. */
function FirstStepsCard({ where, className }: { where: 'top' | 'side'; className: string }) {
  const { desk, go } = useFloor();
  const fs = desk.desk.firstSteps;
  if (!fs || fs.complete) return null;
  const open = (to: string | null) => {
    if (to === null) { document.getElementById('desk-this-month')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (to.startsWith('/')) { window.location.href = to; return; }
    go(to);
  };
  return (
    <div className={className}>
    <Card className="p-4" tone="accent">
      <div className="flex items-baseline justify-between">
        <Label color={T.accent}>First steps</Label>
        <span className="text-[11px]" style={{ color: T.dim }}>{fs.done} of {fs.total} done</span>
      </div>
      <div className="mt-2"><Meter value={(fs.done / fs.total) * 100} /></div>
      <ol className="mt-3 space-y-2.5">
        {fs.steps.map(s => {
          const isNext = s.key === fs.next;
          return (
            <li key={s.key} className="flex gap-2.5">
              <span aria-hidden className="mt-0.5 inline-flex items-center justify-center rounded-full text-[11px] font-bold shrink-0"
                style={{ width: 18, height: 18, background: s.done ? T.good : 'transparent', color: s.done ? '#0B0D12' : T.faint, border: `1px solid ${s.done ? T.good : T.lineStrong}` }}>
                {s.done ? '✓' : ''}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold" style={{ color: s.done ? T.dim : T.text, textDecoration: s.done ? 'line-through' : undefined }}>
                  {s.title}<span className="sr-only">{s.done ? ' (done)' : ' (not done yet)'}</span>
                </div>
                {isNext && (
                  <>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: T.dim }}>{s.why}</p>
                    <div className="mt-2"><Btn small kind="primary" onClick={() => open(s.go)} id={`first-step-${where}-${s.key}`}>{s.cta}</Btn></div>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
    </div>
  );
}

function CareerLadder() {
  const { desk, go } = useFloor();
  const me = desk.me!;
  const ladder = desk.desk.ladder ?? [];
  const career = desk.desk.career;
  const leadClout = desk.desk.rules.leadershipMinClout ?? 45;
  const currentIdx = ladder.findIndex(r => r.current);
  const next = ladder[currentIdx + 1];
  const goTo: Record<string, string> = { member: 'party', candidate: 'party', mp: 'party', leader: 'party', minister: 'chamber', premier: 'chamber', statesman: 'wire' };
  const months = career ? [
    career.monthsHead ? `${career.monthsHead} mo ${leaderTitle(desk)}` : null,
    career.monthsMinister ? `${career.monthsMinister} mo minister` : null,
    career.monthsLeader ? `${career.monthsLeader} mo party leader` : null,
    career.monthsMp ? `${career.monthsMp} mo MP` : null,
  ].filter(Boolean) : [];
  return (
    <Card className="p-4" tone={next ? undefined : 'accent'}>
      <div className="flex items-baseline justify-between">
        <Label>Career ladder</Label>
        {me.background && <span className="text-[11px]" style={{ color: T.faint }} title={me.background.edge}>{me.background.label}</span>}
      </div>
      <ol className="mt-3 relative">
        {[...ladder].reverse().map((r, ri) => {
          const i = ladder.length - 1 - ri;
          const isNext = i === currentIdx + 1;
          return (
            <li key={r.key} className="flex gap-3 pb-2.5 last:pb-0 relative">
              {ri < ladder.length - 1 && <span className="absolute left-[9px] top-5 bottom-0 w-px" style={{ background: ladder[i - 1]?.reached && r.reached ? T.accent : T.line }} />}
              <span className="relative z-10 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ width: 19, height: 19, background: r.current ? T.accent : r.reached ? T.accentSoft : T.raised, border: `1px solid ${r.reached || isNext ? T.accent : T.line}`, color: r.current ? '#17130A' : T.accent }}>
                {r.reached && !r.current ? '✓' : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: r.current ? T.text : r.reached ? T.dim : isNext ? T.text : T.faint }}>{r.title}</span>
                  {r.current && <Chip color={T.accent}>you</Chip>}
                  {r.peak && !r.current && <Chip color={T.dim} title="The highest rung you have reached">peak</Chip>}
                </div>
                {r.current && <div className="text-[11px] mt-0.5 leading-snug" style={{ color: T.faint }}>{r.unlocks}</div>}
                {isNext && ladder[currentIdx]?.next && (
                  <button type="button" onClick={() => go(goTo[r.key] ?? 'party')} className="text-left text-xs mt-0.5 leading-snug hover:underline" style={{ color: T.dim }}>
                    {ladder[currentIdx].next}
                  </button>
                )}
                {isNext && r.key === 'leader' && !me.isPartyLeader && <div className="mt-1.5 w-40"><Meter value={Math.min(me.influence, leadClout)} max={leadClout} /></div>}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 pt-3 text-[11px] space-y-0.5" style={{ borderTop: `1px solid ${T.line}`, color: T.faint }}>
        <button type="button" onClick={() => go('wire')} className="hover:underline text-left" style={{ color: T.dim }}>
          {me.worldRank ? `World Influence Index: #${me.worldRank.rank} of ${me.worldRank.of} (${me.worldRank.share}%)` : 'Not yet ranked in the World Influence Index'}
        </button>
        {career?.bestWorldRank && <div>Best world rank: #{career.bestWorldRank}{career.monthsWorldTop ? ` · ${career.monthsWorldTop} month${career.monthsWorldTop === 1 ? '' : 's'} at #1` : ''}</div>}
        {months.length > 0 && <div>{months.join(' · ')}</div>}
      </div>
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
        {desk.news.length === 0 && <div className="text-[13px] leading-relaxed" style={{ color: T.dim }}>Nothing has happened yet. Bills, votes and elections appear here when the month turns.</div>}
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
  // Decisions of office that live on the Nation tab: shown here as reminders, decided there.
  const sim = desk.desk.world.find(n => n.mine)?.sim ?? null;
  const isHead = !!me && desk.premier?.characterId === me.characterId;
  const isFinance = !!me && desk.cabinet.find(c => c.key === 'finance')?.characterId === me.characterId;
  const budgetDue = !!sim && (isHead || isFinance) && !sim.budget.setThisMonth && sim.budget.splitSource === 'computer';
  const offersToUs = sim && isHead ? sim.foreign.treaties.filter(t => t.status === 'proposed' && t.awaitingVoteIn === desk.desk.world.find(n => n.mine)?.name) : [];
  const officeTasks = (budgetDue ? 1 : 0) + (offersToUs.length > 0 ? 1 : 0);

  if (!me) {
    return <Card className="p-6 text-sm" ><span style={{ color: T.dim }}>Create your character to enter politics.</span></Card>;
  }
  const pendingCount = openCards.length + toVote.length + incoming.length + officeTasks;
  const nothingLeft = openCards.length === 0 && toVote.length === 0 && incoming.length === 0 && officeTasks === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5">
      <div className="space-y-4 min-w-0">
        {/* Phones: the side column comes last, so first steps sit on top here. */}
        <FirstStepsCard where="top" className="lg:hidden" />
        <RaceHero />
        <div className="flex items-end justify-between gap-3 pt-2" id="desk-this-month">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: T.faint }}>This month</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight flex items-center gap-3" style={{ color: T.text }}>
              {pendingCount > 0 && <span className="inline-flex items-center justify-center rounded-xl font-sans text-lg" style={{ minWidth: 38, height: 38, background: T.accent, color: '#17130A', boxShadow: '0 0 24px rgba(232,184,75,0.45)' }}>{pendingCount}</span>}
              {pendingCount > 0 ? (pendingCount === 1 ? 'thing needs you' : 'things need you') : 'Your desk is clear'}
            </h2>
            <p className="text-sm mt-1" style={{ color: T.dim }}>{me.nextGoal}</p>
          </div>
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

        {desk.desk.partyRoom?.contest?.status === 'open' && (
          <Card className="p-4" tone="accent">
            <Label color={T.accent}>Leadership contest</Label>
            <p className="text-sm mt-1" style={{ color: T.text }}>
              {me.characterId === desk.desk.partyRoom.contest.leader.id
                ? <><strong>{desk.desk.partyRoom.contest.challenger.name}</strong> is challenging you for the leadership of your party. Win your members over before the count.</>
                : me.characterId === desk.desk.partyRoom.contest.challenger.id
                  ? <>Your challenge to <strong>{desk.desk.partyRoom.contest.leader.name}</strong> is under way. Win your members over before the count.</>
                  : <><strong>{desk.desk.partyRoom.contest.challenger.name}</strong> is challenging <strong>{desk.desk.partyRoom.contest.leader.name}</strong> for the leadership of your party.
                    {desk.desk.partyRoom.contest.myBallot ? ` You back the ${desk.desk.partyRoom.contest.myBallot}.` : ' Cast your ballot.'}</>}
            </p>
            <div className="mt-3"><Btn small kind="primary" onClick={() => go('party')} id="cta-contest">See the contest</Btn></div>
          </Card>
        )}

        {coalitionNeedsMe(desk) && desk.desk.coalition && (() => {
          const c = desk.desk.coalition!;
          const incoming = c.offers.filter(o => o.status === 'pending' && o.toPartyId === c.me.partyId);
          return (
            <Card className="p-4" tone="accent">
              <Label color={T.accent}>{c.phase === 'talks' ? 'Coalition talks' : 'Coalition'}</Label>
              <p className="text-sm mt-1" style={{ color: T.text }}>
                {incoming.length
                  ? `${incoming.map(o => o.fromName).join(' and ')} ${incoming.length === 1 ? 'offers' : 'offer'} your party a place in government.`
                  : `No party has a majority. As a party leader you can make offers to build a government of ${c.majority} seats.`}
              </p>
              <div className="mt-3"><Btn small kind="primary" onClick={() => go('nation:coalition')} id="cta-coalition">{incoming.length ? 'See the offer' : 'Open talks'}</Btn></div>
            </Card>
          );
        })()}

        {budgetDue && sim && (
          <Card className="p-4" tone="accent">
            <Label color={T.accent}>The budget</Label>
            <p className="text-sm mt-1" style={{ color: T.text }}>
              ${(sim.budget.discretionary / 1e9).toFixed(1)}B a year of programmes is being split by the governing party’s platform. As {isHead ? leaderTitle(desk) : 'finance minister'}, you can set it yourself this month.
            </p>
            <div className="mt-3"><Btn small kind="primary" onClick={() => go('nation:budget')} id="cta-budget">Set the budget</Btn></div>
          </Card>
        )}

        {offersToUs.length > 0 && (
          <Card className="p-4" tone="accent">
            <Label color={T.accent}>Foreign affairs</Label>
            <p className="text-sm mt-1" style={{ color: T.text }}>
              {offersToUs.map(t => `${t.withName} offers a ${t.name.toLowerCase()}`).join('; ')}. Parliament votes on {offersToUs.length === 1 ? 'it' : 'them'} when the month closes.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Btn small kind="primary" onClick={() => go('chamber')} id="cta-treaty-vote">Whip the vote</Btn>
              <Btn small onClick={() => go('nation:foreign')} id="cta-foreign">Relations</Btn>
            </div>
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
        <FirstStepsCard where="side" className="hidden lg:block" />
        <CareerLadder />
        <Standing />
        <News />
      </aside>
    </div>
  );
}
