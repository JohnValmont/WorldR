'use client';
// World Press: the Meridian Wire, a neutral international news agency
// (docs/WORLD_STAGE.md). Monthly World Influence Index, stories from every
// capital, and dispatches written by players (like the Supremacy 1914 paper).
import React, { useState } from 'react';
import useSWR from 'swr';
import { agencyApi } from '@/lib/api';
import { formatPolArc } from '@/lib/calendar';
import { Btn, Card, Chip, Label, PartyDot, T, useFloor } from './kit';
import type { Dispatch, Edition, IndexRow, WireFront } from './types';

function Move({ move }: { move: number | null }) {
  if (move == null) return <span className="text-[10px] font-semibold" style={{ color: T.accent }}>NEW</span>;
  if (move === 0) return <span className="text-[11px]" style={{ color: T.faint }}>–</span>;
  return <span className="text-[11px] font-mono font-semibold" style={{ color: move > 0 ? T.good : T.bad }}>{move > 0 ? '▲' : '▼'}{Math.abs(move)}</span>;
}

function IndexTable({ rows, mine, total, maxShare }: { rows: IndexRow[]; mine: IndexRow | null; total: number; maxShare: number }) {
  const { desk } = useFloor();
  const meId = desk.me?.characterId;
  const Row = ({ r }: { r: IndexRow }) => {
    const isMe = r.characterId === meId;
    return (
      <li className="grid grid-cols-[28px_30px_minmax(0,1fr)_64px] sm:grid-cols-[32px_34px_minmax(0,1fr)_150px] items-center gap-2 py-2"
        style={{ borderTop: `1px solid ${T.line}`, background: isMe ? T.accentSoft : undefined }}>
        <span className="font-serif text-lg font-bold text-right" style={{ color: r.rank <= 3 ? T.accent : T.text }}>{r.rank}</span>
        <span className="text-center"><Move move={r.move} /></span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {r.partyColor && <PartyDot color={r.partyColor} />}
            <span className="text-sm font-semibold truncate" style={{ color: T.text }}>{r.name}</span>
            {r.isPlayer && <Chip color={isMe ? T.accent : T.dim}>{isMe ? 'you' : 'player'}</Chip>}
          </div>
          <div className="text-[11px] truncate" style={{ color: T.faint }}>{r.officeLabel} · {r.nationName}</div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <div className="hidden sm:block flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.share / Math.max(maxShare, 0.1)) * 100)}%`, background: r.rank <= 3 ? T.accent : T.dim }} />
          </div>
          <span className="font-mono text-sm w-14 text-right" style={{ color: T.text }}>{r.share.toFixed(1)}%</span>
        </div>
      </li>
    );
  };
  return (
    <>
      <ol>{rows.map(r => <Row key={r.key} r={r} />)}</ol>
      {mine && !rows.some(r => r.key === mine.key) && (
        <>
          <div className="text-center text-xs py-1" style={{ color: T.faint }}>…</div>
          <ol><Row r={mine} /></ol>
        </>
      )}
      <p className="text-[11px] mt-2" style={{ color: T.faint }}>
        {total} politicians ranked across the three nations. The % is each one's share of all the influence in the world.
      </p>
    </>
  );
}

function Stories({ edition }: { edition: Edition }) {
  const byNation = new Map<string, typeof edition.stories>();
  for (const s of edition.stories) byNation.set(s.nationName, [...(byNation.get(s.nationName) ?? []), s]);
  if (!byNation.size) return <p className="text-sm" style={{ color: T.faint }}>A quiet month in the capitals.</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...byNation.entries()].map(([nation, stories]) => (
        <div key={nation} className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] pb-1 mb-2" style={{ color: T.accent, borderBottom: `1px solid ${T.line}` }}>{nation}</div>
          <div className="space-y-2.5">
            {stories.map((s, i) => (
              <div key={i}>
                <div className="text-sm font-semibold leading-snug" style={{ color: T.text }}>{s.headline}</div>
                <div className="text-xs leading-snug mt-0.5" style={{ color: T.dim }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DispatchCard({ d, onDone, printed }: { d: Dispatch; onDone: () => void; printed?: boolean }) {
  const { act, busy } = useFloor();
  const run = (fn: () => Promise<any>) => act(fn, (r: any) => r?.message).then(onDone);
  const canReact = !printed && !d.mine && !d.myReaction && d.status === 'published';
  return (
    <article className="py-3" style={{ borderTop: `1px solid ${T.line}` }}>
      <h4 className="font-serif text-base font-bold leading-snug" style={{ color: T.text }}>{d.headline}</h4>
      <div className="text-[11px] mt-0.5" style={{ color: T.faint }}>
        Dispatch from {d.author.name}{d.author.nationName ? `, ${d.author.nationName}` : ''}
        {d.status === 'hidden' && <span style={{ color: T.bad }}> · hidden while the Wire reviews reports</span>}
      </div>
      <p className="text-sm mt-1.5 whitespace-pre-line leading-relaxed" style={{ color: T.dim }}>{d.body}</p>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span className="text-xs font-mono" style={{ color: T.text }}>{d.endorsements} endorsement{d.endorsements === 1 ? '' : 's'}</span>
        {canReact && <Btn small kind="yea" disabled={busy} onClick={() => run(() => agencyApi.react(d.id, 'endorse'))}>Endorse</Btn>}
        {canReact && <Btn small kind="quiet" disabled={busy} title="Abusive, spam or out-of-game content" onClick={() => { if (window.confirm('Report this dispatch to the Wire? Use this for abuse or spam, not for stories you disagree with.')) run(() => agencyApi.react(d.id, 'report')); }}>Report</Btn>}
        {d.myReaction && <Chip color={d.myReaction === 'endorse' ? T.good : T.faint}>{d.myReaction === 'endorse' ? 'you endorsed' : 'you reported'}</Chip>}
        {d.mine && !printed && <Btn small kind="quiet" disabled={busy} onClick={() => { if (window.confirm('Withdraw your dispatch?')) run(() => agencyApi.withdraw(d.id)); }}>Withdraw</Btn>}
      </div>
    </article>
  );
}

function Compose({ front, onDone }: { front: WireFront; onDone: () => void }) {
  const { act, busy } = useFloor();
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const a = front.allowance;
  if (!a) return null;
  const left = a.perMonth - a.filed;
  const disabled = busy || left <= 0 || a.energy < a.ap || headline.trim().length < 8 || body.trim().length < 40;
  const submit = () => act(() => agencyApi.fileDispatch(headline, body), (r: any) => r?.message).then(ok => {
    if (ok) { setHeadline(''); setBody(''); onDone(); }
  });
  return (
    <Card className="p-4">
      <Label>File a dispatch</Label>
      <p className="text-xs mt-1" style={{ color: T.dim }}>
        News, rumour, opinion or propaganda: write for readers in all three nations. Your name goes on it.
        {` ${left} of ${a.perMonth} left this month · ${a.ap} energy each.`}
      </p>
      <input value={headline} onChange={e => setHeadline(e.target.value.slice(0, front.rules.headlineMax))} placeholder="Headline" id="dispatch-headline"
        className="w-full mt-3 rounded-xl px-3 py-2 text-sm font-serif font-bold outline-none" style={{ background: T.raised, color: T.text, border: `1px solid ${T.line}` }} />
      <textarea value={body} onChange={e => setBody(e.target.value.slice(0, front.rules.bodyMax))} placeholder="Your story (at least 40 characters)" rows={5} id="dispatch-body"
        className="w-full mt-2 rounded-xl px-3 py-2 text-sm outline-none resize-y" style={{ background: T.raised, color: T.text, border: `1px solid ${T.line}` }} />
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="text-[11px] font-mono" style={{ color: T.faint }}>{body.length}/{front.rules.bodyMax}</span>
        <Btn small kind="primary" disabled={disabled} onClick={submit} id="dispatch-file">File it · {a.ap} energy</Btn>
      </div>
      <p className="text-[11px] mt-2" style={{ color: T.faint }}>
        Every {front.rules.endorsementsPerClout} endorsements your dispatches earn in a month give you +1 clout (up to {front.rules.maxCloutPerMonth}). The most endorsed are printed in the next edition.
      </p>
    </Card>
  );
}

export default function WireView() {
  const { desk } = useFloor();
  const { data: front, error, mutate } = useSWR('wire-front', () => agencyApi.getFront(), { refreshInterval: 30_000 });
  const [arc, setArc] = useState<number | null>(null);
  const [mode, setMode] = useState<'edition' | 'live'>('edition');
  const { data: archived } = useSWR(arc != null ? ['wire-edition', arc] : null, () => agencyApi.getEdition(arc!));

  if (error) return <Card className="p-5"><span className="text-sm" style={{ color: T.bad }}>The wire is down: {String(error?.message ?? error)}</span></Card>;
  if (!front) return <Card className="p-5"><span className="text-sm" style={{ color: T.dim }}>Fetching the wire…</span></Card>;

  const edition = arc != null ? archived ?? null : front.edition;
  const showLive = mode === 'live' || !edition;
  const rows = showLive ? front.live.top : edition!.rankings;
  const mine = showLive ? front.live.mine : edition!.mine;
  const maxShare = Math.max(0.1, ...rows.map(r => r.share));
  const refresh = () => { mutate(); };

  return (
    <div className="space-y-5">
      <header className="text-center pb-3" style={{ borderBottom: `3px double ${T.lineStrong}` }}>
        <div className="font-serif text-3xl sm:text-5xl font-black tracking-tight" style={{ color: T.text }}>{front.agency.name}</div>
        <div className="text-[11px] uppercase tracking-[0.2em] mt-1" style={{ color: T.faint }}>{front.agency.tagline}</div>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs" style={{ color: T.dim }}>
          {edition && <span>Edition of {formatPolArc(edition.arc, false)}</span>}
          {front.archive.length > 1 && (
            <select value={arc ?? ''} onChange={e => { setArc(e.target.value === '' ? null : Number(e.target.value)); setMode('edition'); }}
              className="rounded-lg px-2 py-1 text-xs" style={{ background: T.raised, color: T.text, border: `1px solid ${T.line}` }} aria-label="Past editions">
              <option value="">Latest edition</option>
              {front.archive.slice(1).map(a => <option key={a.arc} value={a.arc}>{formatPolArc(a.arc, false)}</option>)}
            </select>
          )}
        </div>
      </header>

      {edition && !showLive && (
        <h2 className="font-serif text-2xl sm:text-4xl font-bold leading-tight text-center max-w-3xl mx-auto" style={{ color: T.text }}>{edition.headline}</h2>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5">
        <div className="space-y-5 min-w-0">
          <Card className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Label color={T.accent}>World Influence Index</Label>
              <div className="flex gap-1.5">
                {edition && <Btn small kind={!showLive ? 'primary' : 'ghost'} onClick={() => setMode('edition')}>{arc != null ? 'That edition' : 'Last edition'}</Btn>}
                <Btn small kind={showLive ? 'primary' : 'ghost'} onClick={() => setMode('live')}>Live now</Btn>
              </div>
            </div>
            <p className="text-xs mt-1 mb-2" style={{ color: T.dim }}>
              {showLive
                ? 'How the Index stands this minute. It is printed when the month turns; arrows compare with the last edition.'
                : `The ${rows.length < front.rules.publishSize ? rows.length : front.rules.publishSize} most influential politicians in the world. Office, party strength, clout, trust, laws passed and promises kept all count; a stronger nation lends a little weight.`}
            </p>
            <IndexTable rows={rows} mine={mine} total={showLive ? front.live.total : edition!.total} maxShare={maxShare} />
          </Card>

          {edition && (
            <Card className="p-4">
              <Label>From the capitals</Label>
              <div className="mt-3"><Stories edition={edition} /></div>
            </Card>
          )}

          {edition && edition.dispatches.length > 0 && (
            <Card className="p-4">
              <Label>Readers' dispatches printed in this edition</Label>
              <div className="mt-1">{edition.dispatches.map(d => <DispatchCard key={d.id} d={d} onDone={refresh} printed />)}</div>
            </Card>
          )}

          {!front.edition && (
            <Card className="p-4">
              <p className="text-sm" style={{ color: T.dim }}>The first edition goes to press when this month turns.</p>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          {desk.me && <Compose front={front} onDone={refresh} />}
          <Card className="p-4">
            <Label>This month on the wire</Label>
            <p className="text-[11px] mt-1" style={{ color: T.faint }}>
              Written by players. The Wire prints them as filed and has not checked them.
            </p>
            {front.dispatches.length === 0
              ? <p className="text-sm mt-3" style={{ color: T.dim }}>Nobody has filed yet this month. Be the first.</p>
              : <div className="mt-1">{front.dispatches.map(d => <DispatchCard key={d.id} d={d} onDone={refresh} />)}</div>}
          </Card>
        </aside>
      </div>
    </div>
  );
}
