'use client';
// Nation → Coalition: talks after an election, the government's deal, and how tightly it holds.
// Rules and numbers: docs/COALITIONS.md (server: coalition.rules.ts / coalition.service.ts).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { politicsApi } from '@/lib/api';
import { formatPolArc } from '@/lib/calendar';
import type { CoalitionForecast, CoalitionOffer, CoalitionView as CV, Desk } from './types';
import { Btn, Card, Chip, Label, Meter, PartyDot, Sheet, T, useFloor } from './kit';

/** Does the Coalition section want something from this player? (a dot on the section) */
export function coalitionNeedsMe(desk: Desk): boolean {
  const c = desk.desk.coalition;
  if (!c || !c.me.partyId) return false;
  const incoming = c.offers.some(o => o.status === 'pending' && o.toPartyId === c.me.partyId);
  return incoming || (c.phase === 'talks' && c.me.canOffer);
}

const unityColor = (u: number | null, walkout: number) => (u == null ? T.dim : u >= 55 ? T.good : u >= 35 ? T.accent : u >= walkout ? '#E08A4B' : T.bad);
const STATUS_LABEL: Record<CoalitionOffer['status'], string> = { pending: 'Waiting', accepted: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn', void: 'Lapsed' };
const STATUS_COLOR: Record<CoalitionOffer['status'], string> = { pending: T.accent, accepted: T.good, declined: T.bad, withdrawn: T.faint, void: T.faint };

function usePostNames(c: CV) {
  return useMemo(() => Object.fromEntries(c.posts.map(p => [p.key, p.short])), [c.posts]);
}
/** Party colours come from the desk's party list (the same colours every politics screen uses). */
function useColorOf(): (partyId: string) => string {
  const { desk } = useFloor();
  return (partyId: string) => (desk.parties as any[]).find(p => p.id === partyId)?.color ?? T.dim;
}

/** One offer: who to whom, the price, and what happened. */
function OfferCard({ c, o }: { c: CV; o: CoalitionOffer }) {
  const { act, busy } = useFloor();
  const colorOf = useColorOf();
  const posts = usePostNames(c);
  const mine = o.fromPartyId === c.me.partyId;
  const toMe = o.toPartyId === c.me.partyId;
  return (
    <div className="rounded-xl p-3" style={{ background: T.raised, border: `1px solid ${toMe && o.status === 'pending' ? T.accent : T.line}` }}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <PartyDot color={colorOf(o.fromPartyId)} /><strong style={{ color: T.text }}>{o.fromName}</strong>
        <span style={{ color: T.faint }}>{o.kind === 'join' ? 'invites' : 'offers'}</span>
        <PartyDot color={colorOf(o.toPartyId)} /><strong style={{ color: T.text }}>{o.toName}</strong>
        <span className="ml-auto"><Chip color={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</Chip></span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {o.hog && <Chip color={T.accent} filled>{c.headOfGovernmentTitle}</Chip>}
        {o.posts.map(p => <Chip key={p} color={T.text}>{posts[p] ?? p}</Chip>)}
        {o.promises.map(p => <Chip key={p.category} color={T.dim}>Law: {p.title}{p.months ? ` · ${p.months} mo` : ''}</Chip>)}
        {!o.hog && !o.posts.length && !o.promises.length && <span className="text-xs" style={{ color: T.faint }}>No ministries or promises</span>}
      </div>
      {o.reason && o.status !== 'pending' && (
        <p className="text-xs mt-2" style={{ color: T.dim }}>{o.reason}{o.score != null ? ` (score ${o.score >= 0 ? '+' : ''}${o.score.toFixed(2)})` : ''}</p>
      )}
      {toMe && o.status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <Btn small kind="yea" disabled={busy} onClick={() => act(() => politicsApi.coalitionRespond(o.id, true), r => r?.message ?? 'Accepted.')}>Accept</Btn>
          <Btn small kind="nay" disabled={busy} onClick={() => act(() => politicsApi.coalitionRespond(o.id, false), r => r?.message ?? 'Declined.')}>Decline</Btn>
        </div>
      )}
      {mine && (o.status === 'pending' || (o.status === 'accepted' && o.kind === 'form' && c.phase === 'talks')) && (
        <div className="mt-3"><Btn small kind="quiet" disabled={busy} onClick={() => act(() => politicsApi.coalitionWithdraw(o.id), 'Offer withdrawn.')}>Withdraw</Btn></div>
      )}
    </div>
  );
}

/** Build an offer: ministries, law promises, the top job, with the other party's answer forecast live. */
function OfferSheet({ c, toPartyId, onClose }: { c: CV; toPartyId: string; onClose: () => void }) {
  const { act, busy } = useFloor();
  const target = c.parties.find(p => p.id === toPartyId)!;
  const existing = c.offers.find(o => o.fromPartyId === c.me.partyId && o.toPartyId === toPartyId && o.status === 'pending');
  const [posts, setPosts] = useState<string[]>(existing?.posts ?? []);
  const [promises, setPromises] = useState<{ category: string; option: string; months: number }[]>(
    existing?.promises.map(p => ({ category: p.category, option: p.option, months: p.months ?? 6 })) ?? [],
  );
  const [hog, setHog] = useState(!!existing?.hog);
  const [forecast, setForecast] = useState<CoalitionForecast | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const elsewhere = new Set(c.offers.filter(o => o.fromPartyId === c.me.partyId && o.toPartyId !== toPartyId && (o.status === 'pending' || o.status === 'accepted')).flatMap(o => o.posts));
  const hogElsewhere = c.offers.some(o => o.fromPartyId === c.me.partyId && o.toPartyId !== toPartyId && (o.status === 'pending' || o.status === 'accepted') && o.hog);
  const complete = promises.every(p => p.category && p.option);
  const offer = { toPartyId, posts, promises: promises.filter(p => p.category && p.option), hog };

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!complete || (!posts.length && !promises.length && !hog)) { setForecast(null); setProblem(null); return; }
    timer.current = setTimeout(() => {
      politicsApi.coalitionForecast(offer)
        .then((f: CoalitionForecast) => { setForecast(f); setProblem(null); })
        .catch((e: any) => { setForecast(null); setProblem(e?.response?.data?.error ?? 'Could not check this offer.'); });
    }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(offer)]);

  const togglePost = (k: string) => setPosts(ps => (ps.includes(k) ? ps.filter(x => x !== k) : [...ps, k]));
  const lawOf = (cat: string) => c.laws.find(l => l.category === cat);
  const send = () => act(() => politicsApi.coalitionOffer(offer), r => r?.message ?? 'Offer sent.').then(ok => { if (ok) onClose(); });

  return (
    <Sheet title={`${c.me.offerKind === 'join' ? 'Invite' : 'Offer a coalition to'} ${target.name}`} onClose={onClose} wide>
      <div className="space-y-5">
        <p className="text-sm" style={{ color: T.dim }}>
          {target.seats} seats. {target.human ? 'A player leads this party and answers themselves.' : 'A computer-run party: it answers when the month ends, taking its best offer.'}
          {target.distanceFromMe != null && <> Views apart: <strong style={{ color: T.text }}>{target.distanceFromMe.toFixed(2)}</strong> (0 = identical).</>}
        </p>

        <div>
          <Label>Ministries</Label>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {c.posts.map(p => {
              const blocked = elsewhere.has(p.key) || !c.me.offerablePosts.includes(p.key);
              const on = posts.includes(p.key);
              return (
                <button key={p.key} type="button" disabled={blocked} onClick={() => togglePost(p.key)}
                  className="text-left rounded-xl p-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: on ? T.accentSoft : T.raised, border: `1px solid ${on ? T.accent : T.line}` }}>
                  <div className="flex items-center justify-between text-sm font-semibold" style={{ color: T.text }}>
                    <span>{p.short}</span><span className="text-[11px] font-mono" style={{ color: T.faint }}>worth {p.value.toFixed(2)}</span>
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: T.faint }}>{elsewhere.has(p.key) ? 'Already offered to another party' : !c.me.offerablePosts.includes(p.key) ? 'Your party does not hold it' : p.blurb}</div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] mt-2" style={{ color: T.faint }}>Your own party keeps at least one ministry. A partner expects about its share of seats in ministries; more is generous, less is stingy.</p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Law promises ({promises.length}/{c.limits.maxPromises})</Label>
            {promises.length < c.limits.maxPromises && (
              <Btn small kind="quiet" onClick={() => setPromises(ps => [...ps, { category: '', option: '', months: 6 }])}>+ Add a promise</Btn>
            )}
          </div>
          <div className="mt-2 space-y-2">
            {promises.length === 0 && <p className="text-xs" style={{ color: T.faint }}>Promise to have a law in force by a deadline. The other party values laws it likes; a law it dislikes counts against you. Break the promise and the coalition suffers.</p>}
            {promises.map((pr, i) => {
              const law = lawOf(pr.category);
              const used = new Set(promises.filter((_, j) => j !== i).map(x => x.category));
              const set = (patch: Partial<typeof pr>) => setPromises(ps => ps.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_110px_auto] gap-2 items-center">
                  <select value={pr.category} onChange={e => set({ category: e.target.value, option: '' })} className="rounded-lg px-2 py-2 text-sm" style={{ background: T.raised, color: T.text, border: `1px solid ${T.line}` }}>
                    <option value="">Choose a law…</option>
                    {c.laws.filter(l => !used.has(l.category)).map(l => <option key={l.category} value={l.category}>{l.name}</option>)}
                  </select>
                  <select value={pr.option} disabled={!law} onChange={e => set({ option: e.target.value })} className="rounded-lg px-2 py-2 text-sm" style={{ background: T.raised, color: T.text, border: `1px solid ${T.line}` }}>
                    <option value="">Change it to…</option>
                    {law?.options.filter(o => o.id !== law.current).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <select value={pr.months} onChange={e => set({ months: Number(e.target.value) })} className="rounded-lg px-2 py-2 text-sm" style={{ background: T.raised, color: T.text, border: `1px solid ${T.line}` }}>
                    {Array.from({ length: c.limits.maxMonths - c.limits.minMonths + 1 }, (_, k) => c.limits.minMonths + k).map(m => <option key={m} value={m}>within {m} mo</option>)}
                  </select>
                  <Btn small kind="quiet" onClick={() => setPromises(ps => ps.filter((_, j) => j !== i))}>Remove</Btn>
                </div>
              );
            })}
          </div>
        </div>

        {c.me.offerKind === 'form' && (
          <label className={`flex items-start gap-3 rounded-xl p-3 ${hogElsewhere ? 'opacity-40' : 'cursor-pointer'}`} style={{ background: hog ? T.accentSoft : T.raised, border: `1px solid ${hog ? T.accent : T.line}` }}>
            <input type="checkbox" className="mt-1" checked={hog} disabled={hogElsewhere} onChange={e => setHog(e.target.checked)} />
            <span>
              <span className="block text-sm font-semibold" style={{ color: T.text }}>Give them the top job: their leader becomes {c.headOfGovernmentTitle}</span>
              <span className="block text-[11px]" style={{ color: T.faint }}>{hogElsewhere ? 'Already offered to another party.' : 'The biggest prize in politics. Your party keeps the ministries you do not give away.'}</span>
            </span>
          </label>
        )}

        <div className="rounded-xl p-3" style={{ background: T.bg, border: `1px solid ${problem ? T.bad : forecast?.accept ? T.good : T.line}` }}>
          <Label>Their answer</Label>
          {problem ? <p className="text-sm mt-1" style={{ color: T.bad }}>{problem}</p>
            : !forecast ? <p className="text-sm mt-1" style={{ color: T.faint }}>Choose what you offer to see how they would answer.</p>
              : forecast.human ? <p className="text-sm mt-1" style={{ color: T.dim }}>{forecast.reason}</p>
                : (
                  <>
                    <p className="text-sm mt-1 font-semibold" style={{ color: forecast.accept ? T.good : T.bad }}>
                      {forecast.accept ? 'They would say yes' : 'They would say no'} <span className="font-mono text-xs" style={{ color: T.faint }}>score {forecast.score! >= 0 ? '+' : ''}{forecast.score!.toFixed(2)}</span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: T.dim }}>{forecast.reason}</p>
                    {forecast.parts && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(forecast.parts).filter(([, v]) => Math.abs(v) >= 0.005).map(([k, v]) => (
                          <Chip key={k} color={v >= 0 ? T.good : T.bad}>{k} {v >= 0 ? '+' : ''}{v.toFixed(2)}</Chip>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] mt-2" style={{ color: T.faint }}>A rival may offer them more before the month ends. They take their best offer.</p>
                  </>
                )}
        </div>

        <div className="flex justify-end gap-2">
          <Btn kind="quiet" onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" disabled={busy || !complete || !!problem || (!posts.length && !promises.length && !hog)} onClick={send} id="send-coalition-offer">
            {existing ? 'Send new terms' : 'Send offer'}
          </Btn>
        </div>
      </div>
    </Sheet>
  );
}

/** The race to a majority during talks. */
function Race({ c }: { c: CV }) {
  const colorOf = useColorOf();
  return (
    <Card className="p-4">
      <Label>The race to {c.majority} seats</Label>
      {c.blocs.length === 0 ? <p className="text-sm mt-2" style={{ color: T.dim }}>No one has made an offer yet.</p> : (
        <div className="mt-3 space-y-3">
          {c.blocs.map(b => {
            const pendingSeats = b.pending.reduce((t, p) => t + (c.parties.find(x => x.id === p.partyId)?.seats ?? 0), 0);
            return (
              <div key={b.leadPartyId}>
                <div className="flex items-center gap-2 text-sm">
                  <PartyDot color={colorOf(b.leadPartyId)} />
                  <strong style={{ color: T.text }}>{b.leadName}</strong>
                  {b.partners.length > 0 && <span style={{ color: T.dim }}>+ {b.partners.map(p => p.name).join(' + ')}</span>}
                  <span className="ml-auto font-mono text-xs" style={{ color: b.seats >= c.majority ? T.good : T.text }}>{b.seats}{pendingSeats ? ` (+${pendingSeats} asked)` : ''}</span>
                </div>
                <div className="mt-1.5"><Meter value={b.seats} max={c.parties.reduce((t, p) => t + p.seats, 0)} marker={c.majority} color={colorOf(b.leadPartyId)} /></div>
                {b.pending.length > 0 && <p className="text-[11px] mt-1" style={{ color: T.faint }}>Waiting on: {b.pending.map(p => p.name).join(', ')}</p>}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] mt-3" style={{ color: T.faint }}>The line marks a majority. The first bloc past it governs. When talks end, the biggest bloc governs as a minority.</p>
    </Card>
  );
}

/** The sitting government: who holds what, its promises, and how tightly it holds. */
function Government({ c }: { c: CV }) {
  const { act, busy } = useFloor();
  const g = c.government!;
  const posts = usePostNames(c);
  const colorOf = useColorOf();
  const color = unityColor(g.unity, g.walkoutAt);
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Label>The government</Label>
        <span className="ml-auto"><Chip color={g.status === 'minority' ? T.bad : T.good}>{g.status === 'minority' ? `Minority · ${g.seats} of ${c.majority} needed` : `Majority · ${g.seats} seats`}</Chip></span>
      </div>
      <div className="mt-3 space-y-2">
        {g.members.map(m => (
          <div key={m.partyId} className="flex flex-wrap items-center gap-2 text-sm">
            <PartyDot color={colorOf(m.partyId)} />
            <strong style={{ color: T.text }}>{m.name}</strong>
            <span className="font-mono text-xs" style={{ color: T.faint }}>{m.seats}</span>
            {m.role === 'lead' && <Chip color={T.accent}>{c.headOfGovernmentTitle}</Chip>}
            <span className="ml-auto flex flex-wrap gap-1">{m.posts.map(p => <Chip key={p} color={T.dim}>{posts[p] ?? p}</Chip>)}</span>
          </div>
        ))}
      </div>
      {g.hogConceded && <p className="text-[11px] mt-2" style={{ color: T.faint }}>The party that built this government gave the top job to a partner.</p>}

      {g.unity != null ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <Label>Unity</Label>
            <span className="text-sm font-semibold" style={{ color }}>{g.unityLabel} · {g.unity}</span>
          </div>
          <div className="mt-1.5"><Meter value={g.unity} color={color} marker={g.walkoutAt} height={8} /></div>
          <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: T.faint }}>
            Started at {g.baseUnity}. The government whip pulls at {g.whipPercent}% of normal strength: below 100%, partners vote their own way on bills they dislike.
            Below {g.walkoutAt} a computer-run partner walks out. Kept promises raise unity; broken promises, defeated government bills, outvoted partners and scandals lower it.
          </p>
        </div>
      ) : (
        <p className="text-xs mt-4" style={{ color: T.dim }}>A one-party government: no coalition to hold together, and the whip pulls at full strength.</p>
      )}

      {g.promises.length > 0 && (
        <div className="mt-4">
          <Label>Promises in the deal</Label>
          <div className="mt-2 space-y-1.5">
            {g.promises.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <span style={{ color: T.text }}>{p.title}</span>
                <span className="text-xs" style={{ color: T.faint }}>to {p.toName}</span>
                <span className="ml-auto">
                  {p.status === 'pending'
                    ? <Chip color={p.monthsLeft <= 2 ? T.bad : T.accent}>{p.monthsLeft > 0 ? `${p.monthsLeft} mo left` : 'due now'}{p.tried ? ' · voted down once' : ''}</Chip>
                    : <Chip color={p.status === 'kept' ? T.good : p.status === 'broken' ? T.bad : T.faint}>{p.status === 'kept' ? 'Kept' : p.status === 'broken' ? 'Broken' : 'Lapsed'}</Chip>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {c.me.canLeave && (
        <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${T.line}` }}>
          <Btn small kind="nay" disabled={busy} onClick={() => { if (window.confirm('Take your party out of the government? Its ministries go back to the leading party.')) act(() => politicsApi.coalitionLeave(), r => r?.message ?? 'You left the government.'); }}>
            Leave the government
          </Btn>
        </div>
      )}
    </Card>
  );
}

/** Parties you could make an offer to. */
function Parties({ c, onOffer }: { c: CV; onOffer: (id: string) => void }) {
  const join = c.me.offerKind === 'join';
  const colorOf = useColorOf();
  const list = c.parties.filter(p => p.id !== c.me.partyId && (!join || !p.inGovernment));
  return (
    <Card className="p-4">
      <Label>{join ? 'Bring a party into government' : 'Parties in Parliament'}</Label>
      <div className="mt-3 space-y-2">
        {list.map(p => (
          <div key={p.id} className="flex items-center gap-2 text-sm">
            <PartyDot color={colorOf(p.id)} />
            <span className="flex-1 min-w-0" style={{ color: T.text }}>
              {p.name} <span className="font-mono text-xs" style={{ color: T.faint }}>{p.seats}</span>
              {p.distanceFromMe != null && <span className="block text-[11px]" style={{ color: T.faint }}>views apart {p.distanceFromMe.toFixed(2)}{p.human ? ' · player-led' : ''}</span>}
            </span>
            {c.me.canOffer && <Btn small onClick={() => onOffer(p.id)}>{c.offers.some(o => o.fromPartyId === c.me.partyId && o.toPartyId === p.id && o.status === 'pending') ? 'Change offer' : 'Offer'}</Btn>}
          </div>
        ))}
      </div>
      {!c.me.canOffer && <p className="text-[11px] mt-3" style={{ color: T.faint }}>{c.me.whyNot}</p>}
    </Card>
  );
}

function HowItWorks({ c }: { c: CV }) {
  return (
    <Card className="p-4">
      <Label>Who can offer a coalition</Label>
      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed list-disc pl-4" style={{ color: T.dim }}>
        <li><strong style={{ color: T.text }}>After an election,</strong> the leader of any party with seats. Smaller parties can band together against the largest.</li>
        <li><strong style={{ color: T.text }}>Between elections,</strong> only the {c.headOfGovernmentTitle}&apos;s party, to bring a party into government.</li>
        <li>An offer can include ministries, up to {c.limits.maxPromises} law promises with deadlines, and (after an election) the top job itself.</li>
        <li>Computer-run parties take the best offer at the end of the month. A party can join only one government at a time.</li>
        <li>Parties far apart in their views rarely agree. A rival bloc of the smaller parties tries only if it would start with unity of at least {c.limits.rivalMinUnity}.</li>
      </ul>
    </Card>
  );
}

export default function CoalitionView() {
  const { desk } = useFloor();
  const c = desk.desk.coalition;
  const [offerTo, setOfferTo] = useState<string | null>(null);
  if (!c) return <Card className="p-4 text-sm"><span style={{ color: T.dim }}>Coalition information is not available.</span></Card>;

  const myId = c.me.partyId;
  const incoming = c.offers.filter(o => o.toPartyId === myId && o.status === 'pending');
  const others = c.offers.filter(o => !incoming.includes(o));

  return (
    <div className="space-y-4">
      {c.phase === 'talks' ? (
        <Card className="p-4" tone="accent">
          <Label color={T.accent}>Coalition talks</Label>
          <p className="text-sm mt-1" style={{ color: T.text }}>
            No party won a majority of its own ({c.majority} seats needed). Talks end in {formatPolArc(c.talksEndArc)}.
            {c.me.canOffer ? ' You lead a party with seats: make offers, or answer the ones you receive.' : ''}
          </p>
        </Card>
      ) : c.phase === 'none' ? (
        <Card className="p-4"><p className="text-sm" style={{ color: T.dim }}>Parliament has not been elected yet.</p></Card>
      ) : null}

      {incoming.length > 0 && (
        <Card className="p-4" tone="accent">
          <Label color={T.accent}>Offers to your party</Label>
          <div className="mt-3 space-y-2">{incoming.map(o => <OfferCard key={o.id} c={c} o={o} />)}</div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          {c.phase === 'talks' && <Race c={c} />}
          {c.phase === 'governing' && c.government && <Government c={c} />}
          {others.length > 0 && (
            <Card className="p-4">
              <Label>{c.phase === 'talks' ? 'Offers on the table' : 'Recent offers'}</Label>
              <div className="mt-3 space-y-2">{others.map(o => <OfferCard key={o.id} c={c} o={o} />)}</div>
            </Card>
          )}
        </div>
        <aside className="space-y-4">
          {(c.phase === 'talks' || c.me.offerKind === 'join') && <Parties c={c} onOffer={setOfferTo} />}
          <HowItWorks c={c} />
        </aside>
      </div>
      {offerTo && <OfferSheet c={c} toPartyId={offerTo} onClose={() => setOfferTo(null)} />}
    </div>
  );
}
