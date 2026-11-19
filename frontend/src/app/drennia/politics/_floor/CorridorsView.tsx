'use client';
// Corridors: the multiplayer side of politics. Who's who in your nation, every
// politician's public record, your personal deals (handshakes), and the
// nation / party / private rooms where the real negotiating happens.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { chatApi, politicsApi, type ChatMessage } from '@/lib/api';
import type { Corridors, Deal, DealSide, Person, Vote } from './types';
import { Btn, Card, Chip, Label, PartyDot, Sheet, T, money, useFloor } from './kit';
import { errorText } from './worldKit';
import { TAB_DATA } from './tabData';

type Room = { kind: 'nation' } | { kind: 'party' } | { kind: 'dm'; id: string; name: string };

function ago(iso: string | null): string {
  if (!iso) return 'not seen yet';
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 5) return 'active now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

function Record({ r }: { r: { kept: number; broken: number } }) {
  if (!r.kept && !r.broken) return <span style={{ color: T.faint }}>no deals yet</span>;
  return (
    <span>
      <span style={{ color: T.good }}>{r.kept} kept</span>
      {r.broken > 0 && <span style={{ color: T.bad }}> · {r.broken} broken</span>}
    </span>
  );
}

const sideText = (s: DealSide, who: 'I' | 'They') => { // "I vote for…" / "They vote for…"
  const parts: string[] = [];
  if (s.vote && s.billTitle) parts.push(`vote ${s.vote === 'yea' ? 'for' : 'against'} “${s.billTitle}”`);
  if (s.cash > 0) parts.push(`pay ${money(s.cash)}`);
  return parts.length ? `${who} ${parts.join(' and ')}` : null;
};
const RESULT_COLOR = { kept: T.good, broken: T.bad, void: T.faint } as const;

function DealCard({ d, onDone }: { d: Deal; onDone: () => void }) {
  const { act, busy } = useFloor();
  const give = sideText(d.iGive, 'I'), get = sideText(d.iGet, 'They');
  const label = d.status === 'offered' ? (d.mine ? 'Waiting for their answer' : 'An offer for you')
    : d.status === 'accepted' ? 'Hands shaken: waiting for the vote' : d.status === 'settled' ? 'Settled' : d.status;
  return (
    <div className="rounded-xl p-3" style={{ background: T.raised, border: `1px solid ${d.status === 'offered' && !d.mine ? T.accent : T.line}` }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: T.text }}>{d.otherName}</span>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: d.status === 'offered' && !d.mine ? T.accent : T.faint }}>{label}</span>
      </div>
      <div className="text-xs mt-1.5 space-y-0.5" style={{ color: T.dim }}>
        {give && <div>{give}{d.iGive.result && <span style={{ color: RESULT_COLOR[d.iGive.result] }}> · {d.iGive.result}</span>}</div>}
        {get && <div>{get}{d.iGet.result && <span style={{ color: RESULT_COLOR[d.iGet.result] }}> · {d.iGet.result}</span>}</div>}
        {d.note && <div className="italic" style={{ color: T.faint }}>“{d.note}”</div>}
      </div>
      {d.status === 'offered' && (
        <div className="flex gap-2 mt-2.5">
          {d.mine
            ? <Btn small disabled={busy} onClick={() => act(() => politicsApi.withdrawHandshake(d.id)).then(onDone)}>Withdraw</Btn>
            : <>
                <Btn small kind="primary" disabled={busy} id={`hs-accept-${d.id.slice(0, 6)}`} onClick={() => act(() => politicsApi.respondHandshake(d.id, true)).then(onDone)}>Shake hands</Btn>
                <Btn small disabled={busy} onClick={() => act(() => politicsApi.respondHandshake(d.id, false)).then(onDone)}>Decline</Btn>
              </>}
        </div>
      )}
    </div>
  );
}

function Composer({ c, to, onClose, onDone }: { c: Corridors; to: Person; onClose: () => void; onDone: () => void }) {
  const { act, busy, desk } = useFloor();
  const me = c.people.find(p => p.isMe);
  const [giveBill, setGiveBill] = useState(''); const [giveVote, setGiveVote] = useState<Vote>('yea'); const [giveCash, setGiveCash] = useState(0);
  const [askBill, setAskBill] = useState(''); const [askVote, setAskVote] = useState<Vote>('yea'); const [askCash, setAskCash] = useState(0);
  const [note, setNote] = useState('');
  const myCash = desk.me?.cash ?? 0;
  const gives = !!giveBill || giveCash > 0, asks = !!askBill || askCash > 0;
  const send = () => act(() => politicsApi.offerHandshake({
    toCharacterId: to.id, note,
    give: { billId: giveBill || null, vote: giveBill ? giveVote : null, cash: giveCash },
    ask: { billId: askBill || null, vote: askBill ? askVote : null, cash: askCash },
  })).then(r => { if (r) { onDone(); onClose(); } });
  const sel = 'w-full rounded-lg px-3 py-2 text-sm';
  const selStyle = { background: T.surface, border: `1px solid ${T.line}`, color: T.text };
  const VotePick = ({ v, set }: { v: Vote; set: (v: Vote) => void }) => (
    <div className="flex gap-1">
      {(['yea', 'nay'] as Vote[]).map(x => (
        <button key={x} type="button" onClick={() => set(x)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: v === x ? (x === 'yea' ? T.goodSoft : T.badSoft) : T.surface, border: `1px solid ${v === x ? (x === 'yea' ? T.good : T.bad) : T.line}`, color: T.text }}>
          {x === 'yea' ? 'For' : 'Against'}
        </button>
      ))}
    </div>
  );
  const Side = ({ title, who, canVote, bill, setBill, vote, setVote, cash, setCash, maxCash }: any) => (
    <div className="rounded-xl p-3 space-y-2" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
      <Label>{title}</Label>
      {canVote ? (
        <>
          <select className={sel} style={selStyle} value={bill} onChange={e => setBill(e.target.value)} aria-label={`${title}: bill`}>
            <option value="">No vote promise</option>
            {c.bills.map(b => <option key={b.id} value={b.id}>{b.title}{b.partyName ? ` (${b.partyName})` : ''}</option>)}
          </select>
          {bill && <VotePick v={vote} set={setVote} />}
        </>
      ) : <div className="text-xs" style={{ color: T.faint }}>{who} no seat, so no vote to promise. Money only.</div>}
      <label className="flex items-center gap-2 text-xs" style={{ color: T.dim }}>
        Money
        <input type="number" min={0} step={5000} max={maxCash} value={cash || ''} placeholder="0"
          onChange={e => setCash(Math.max(0, Math.min(maxCash, Math.round(Number(e.target.value) || 0))))}
          className="flex-1 rounded-lg px-3 py-1.5 text-sm font-mono" style={selStyle} />
      </label>
    </div>
  );
  return (
    <Sheet title={`A deal with ${to.name}`} onClose={onClose} wide>
      <p className="text-xs mb-3" style={{ color: T.dim }}>
        Money changes hands the moment they shake. Vote promises are checked by the game when the bill is counted: a broken promise costs trust and clout and makes the news.
        {c.bills.length === 0 && ' There are no bills before Parliament right now, so only money can be traded until one is tabled.'}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Side title="You give" who="You have" canVote={!!me?.canVote} bill={giveBill} setBill={setGiveBill} vote={giveVote} setVote={setGiveVote} cash={giveCash} setCash={setGiveCash} maxCash={Math.min(c.rules.maxCash, myCash)} />
        <Side title="You ask for" who={`${to.name} has`} canVote={to.canVote} bill={askBill} setBill={setAskBill} vote={askVote} setVote={setAskVote} cash={askCash} setCash={setAskCash} maxCash={c.rules.maxCash} />
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 240))} rows={2} placeholder="A word to go with it (optional)"
        className="w-full mt-3 rounded-lg px-3 py-2 text-sm" style={selStyle} />
      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px]" style={{ color: T.faint }}>Costs {c.rules.handshakeAp} energy to offer.</span>
        <Btn kind="primary" disabled={busy || !gives || !asks} onClick={send} id="hs-send">Offer the deal</Btn>
      </div>
    </Sheet>
  );
}

function ProfileSheet({ p, onClose, onMessage, onDeal }: { p: Person; onClose: () => void; onMessage: () => void; onDeal: () => void }) {
  const { data } = useSWR(p.isPlayer ? ['person', p.id] : null, () => politicsApi.getPerson(p.id));
  return (
    <Sheet title={p.name} onClose={onClose}>
      <div className="text-sm" style={{ color: T.dim }}>
        {p.role}{p.party ? ` · ${p.party.name}` : ''}{p.district ? ` · sits for ${p.district}` : ''}
      </div>
      {data?.background && <div className="text-xs mt-1" style={{ color: T.faint }}>{data.background.label}: {data.background.blurb}</div>}
      {p.isPlayer ? (
        <>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {[['Trust', p.trust], ['Clout', p.clout], ['Word', null]].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg p-2" style={{ background: T.surface }}>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>{k}</div>
                <div className="text-sm font-semibold mt-0.5" style={{ color: T.text }}>{v ?? <Record r={p.record} />}</div>
              </div>
            ))}
          </div>
          {(data?.career || data?.worldRank) && (
            <div className="mt-3 text-xs" style={{ color: T.dim }} id="profile-career">
              {data?.worldRank && <div>World Influence Index: #{data.worldRank.rank} of {data.worldRank.of} ({data.worldRank.share}%)</div>}
              {data?.career && (
                <div style={{ color: T.faint }}>
                  {[data.career.monthsHead ? `${data.career.monthsHead} months heading the government` : null,
                    data.career.monthsMinister ? `${data.career.monthsMinister} as minister` : null,
                    data.career.monthsLeader ? `${data.career.monthsLeader} as party leader` : null,
                    data.career.monthsMp ? `${data.career.monthsMp} as MP` : null,
                    data.career.bestWorldRank ? `best world rank #${data.career.bestWorldRank}` : null].filter(Boolean).join(' · ') || 'No offices held yet.'}
                </div>
              )}
            </div>
          )}
          <Label>How they voted</Label>
          <div className="mt-1 space-y-1">
            {!data && <div className="text-xs" style={{ color: T.faint }}>Loading…</div>}
            {data && data.votes.length === 0 && <div className="text-xs" style={{ color: T.faint }}>No recorded votes yet.</div>}
            {data?.votes.map(v => (
              <div key={v.billId} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate" style={{ color: T.dim }}>{v.title}</span>
                <Chip color={v.vote === 'yea' ? T.good : T.bad}>{v.vote === 'yea' ? 'For' : 'Against'}</Chip>
              </div>
            ))}
          </div>
          {data && data.brokenWord.length > 0 && (
            <div className="mt-3 text-xs" style={{ color: T.bad }}>{data.brokenWord.map((b, i) => <div key={i}>{b.body}</div>)}</div>
          )}
          {!p.isMe && (
            <div className="flex gap-2 mt-4">
              <Btn kind="primary" onClick={onDeal} id="profile-deal">Propose a deal</Btn>
              <Btn onClick={onMessage} id="profile-message">Message</Btn>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm mt-3" style={{ color: T.dim }}>
          Runs {p.party?.name} for the computer. To win its votes, the party leader can offer it a deal on a bill in the Chamber.
        </p>
      )}
    </Sheet>
  );
}

function Rooms({ room, setRoom, hasParty }: { room: Room; setRoom: (r: Room) => void; hasParty: boolean }) {
  const { desk } = useFloor();
  const channel = room.kind === 'dm' ? 'private' : room.kind;
  const withId = room.kind === 'dm' ? room.id : undefined;
  const key = ['room', channel, withId ?? ''];
  const { data, mutate, error } = useSWR(key, () => chatApi.getMessages(channel, undefined, withId), { refreshInterval: 5000 });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const msgs: ChatMessage[] = data?.messages ?? [];
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [msgs.length]);
  const send = async () => {
    const body = text.trim(); if (!body) return;
    setSending(true); setErr(null);
    try { await chatApi.sendMessage(body, channel, withId); setText(''); await mutate(); }
    catch (e: any) { setErr(e?.response?.data?.message || e?.response?.data?.error || 'Could not send'); }
    finally { setSending(false); }
  };
  const tab = (r: Room, label: string, disabled = false) => {
    const on = r.kind === room.kind && (r.kind !== 'dm' || (room.kind === 'dm' && room.id === (r as any).id));
    return (
      <button type="button" disabled={disabled} onClick={() => setRoom(r)} className="px-3 py-2 text-xs font-semibold whitespace-nowrap disabled:opacity-40"
        style={{ color: on ? T.text : T.faint, borderBottom: `2px solid ${on ? T.accent : 'transparent'}` }}>{label}</button>
    );
  };
  const roomName = room.kind === 'nation' ? `everyone in ${desk.nation.shortName}` : room.kind === 'party' ? 'your party only' : `${room.name} only`;
  return (
    <Card className="p-0 flex flex-col" style={{ minHeight: 420 }}>
      <div className="flex gap-1 px-3 pt-1 overflow-x-auto" style={{ borderBottom: `1px solid ${T.line}` }}>
        {tab({ kind: 'nation' }, 'Nation')}
        {tab({ kind: 'party' }, 'Party room', !hasParty)}
        {room.kind === 'dm' && tab(room, room.name)}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ maxHeight: 440 }} id="room-messages">
        {error && <div className="text-xs" style={{ color: T.bad }}>{(error as any)?.response?.data?.message ?? 'This room is closed to you.'}</div>}
        {!error && msgs.length === 0 && <div className="text-xs" style={{ color: T.faint }}>Nothing said yet. Open the conversation.</div>}
        {msgs.map(m => (
          <div key={m.id}>
            <div className="text-[11px]" style={{ color: T.faint }}>
              <span className="font-semibold" style={{ color: T.dim }}>{m.character_name}</span> · {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm whitespace-pre-wrap break-words" style={{ color: T.text }}>{m.body}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="p-3 flex gap-2" style={{ borderTop: `1px solid ${T.line}` }} onSubmit={e => { e.preventDefault(); send(); }}>
        <input value={text} onChange={e => setText(e.target.value.slice(0, 500))} placeholder={`Say something to ${roomName}`} id="room-input"
          className="flex-1 rounded-lg px-3 py-2 text-sm min-w-0" style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.text }} />
        <Btn kind="primary" disabled={sending || !text.trim()} id="room-send" onClick={send}>Send</Btn>
      </form>
      {err && <div className="px-3 pb-2 text-xs" style={{ color: T.bad }}>{err}</div>}
    </Card>
  );
}

export default function CorridorsView() {
  const { desk } = useFloor();
  const { data: c, mutate, error } = useSWR(TAB_DATA.corridors.key, TAB_DATA.corridors.fetch, { refreshInterval: 20_000 });
  const [room, setRoom] = useState<Room>({ kind: 'nation' });
  const [profile, setProfile] = useState<Person | null>(null);
  const [dealWith, setDealWith] = useState<Person | null>(null);
  const deals = c?.deals ?? [];
  const incoming = deals.filter(d => d.status === 'offered' && !d.mine);
  const live = deals.filter(d => (d.status === 'offered' && d.mine) || d.status === 'accepted');
  const past = deals.filter(d => ['settled', 'declined', 'expired', 'withdrawn'].includes(d.status)).slice(0, 6);
  const players = useMemo(() => (c?.people ?? []).filter(p => p.isPlayer), [c]);
  const computers = useMemo(() => (c?.people ?? []).filter(p => !p.isPlayer), [c]);
  const refresh = () => { mutate(); };

  if (error && !c) return (
    <Card className="p-5 text-sm">
      <span style={{ color: T.bad }}>{errorText(error, 'Couldn’t open the corridors.')}</span>
      <button type="button" className="ml-3 underline" style={{ color: T.text }} onClick={() => mutate()}>Try again</button>
    </Card>
  );
  if (!c) return <div className="py-16 text-center text-xs uppercase tracking-[0.3em]" style={{ color: T.faint }}>Walking the corridors…</div>;

  const PersonRow = ({ p }: { p: Person }) => (
    <button type="button" onClick={() => setProfile(p)} id={`person-${p.id.slice(0, 8)}`}
      className="w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 hover:brightness-125" style={{ background: p.isMe ? T.accentSoft : T.raised, border: `1px solid ${T.line}` }}>
      {p.party ? <PartyDot color={p.party.color} size={10} /> : <span className="inline-block rounded-full" style={{ width: 10, height: 10, border: `1px solid ${T.faint}` }} />}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold truncate" style={{ color: T.text }}>{p.name}{p.isMe ? ' (you)' : ''}</span>
        <span className="block text-[11px] truncate" style={{ color: T.faint }}>{p.role}{p.party ? ` · ${p.party.name}` : ''}{p.isPlayer && !p.isMe ? ` · ${ago(p.lastSeen)}` : ''}</span>
      </span>
      {p.isPlayer && (
        <span className="text-right text-[11px] shrink-0" style={{ color: T.dim }}>
          <span className="block">Trust <b style={{ color: T.text }}>{p.trust}</b> · Clout <b style={{ color: T.text }}>{p.clout}</b></span>
          <span className="block"><Record r={p.record} /></span>
        </span>
      )}
    </button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-5">
      <div className="space-y-4 min-w-0">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight" style={{ color: T.text }}>The corridors</h2>
          <p className="text-sm mt-1" style={{ color: T.dim }}>
            Where deals are made. Talk to anyone, offer votes or money for votes, and remember: everyone can see whether you keep your word.
          </p>
        </div>

        {(incoming.length > 0 || live.length > 0) && (
          <Card className="p-4">
            <Label color={incoming.length ? T.accent : T.faint}>Your deals</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[...incoming, ...live].map(d => <DealCard key={d.id} d={d} onDone={refresh} />)}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex items-baseline justify-between">
            <Label>Who&apos;s who in {desk.nation.shortName}</Label>
            <span className="text-[11px]" style={{ color: T.faint }}>{players.length} player{players.length === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-2 space-y-1.5">{players.map(p => <PersonRow key={p.id} p={p} />)}</div>
          {computers.length > 0 && (
            <>
              <div className="text-[10px] uppercase tracking-wider mt-4 mb-1.5" style={{ color: T.faint }}>Computer-run party leaders</div>
              <div className="grid gap-1.5 sm:grid-cols-2">{computers.map(p => <PersonRow key={p.id} p={p} />)}</div>
            </>
          )}
        </Card>

        {past.length > 0 && (
          <Card className="p-4">
            <Label>Past deals</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">{past.map(d => <DealCard key={d.id} d={d} onDone={refresh} />)}</div>
          </Card>
        )}
      </div>

      <aside className="min-w-0">
        <Rooms room={room} setRoom={setRoom} hasParty={!!c.me.partyId} />
      </aside>

      {profile && (
        <ProfileSheet p={profile} onClose={() => setProfile(null)}
          onMessage={() => { setRoom({ kind: 'dm', id: profile.id, name: profile.name }); setProfile(null); }}
          onDeal={() => { setDealWith(profile); setProfile(null); }} />
      )}
      {dealWith && <Composer c={c} to={dealWith} onClose={() => setDealWith(null)} onDone={refresh} />}
    </div>
  );
}
