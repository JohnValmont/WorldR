'use client';
// The Cabinet: the head of government and every ministry — who holds it, which laws
// it steers, and (for office-holders) the decrees they can issue. Reads GET /politics/desk only.
import React from 'react';
import { politicsApi } from '@/lib/api';
import { formatPolArc } from '@/lib/calendar';
import { Btn, Card, Chip, EffectChips, Label, LockedBtn, PartyDot, T, leaderTitle, useFloor } from './kit';

/** What your office lets you do without asking Parliament. */
export function Powers() {
  const { desk, act, busy } = useFloor();
  const office = desk.desk.office;
  const me = desk.me;
  if (!me) return null;
  if (!office) {
    return (
      <Card className="p-4">
        <Label>Powers of office</Label>
        <p className="text-sm mt-1" style={{ color: T.dim }}>
          The {leaderTitle(desk)} and the ministers can act without Parliament: one decree a month each, felt across the whole nation.
          {me.party ? ` Lead the governing party to become ${leaderTitle(desk)}, or be named to the cabinet by one.` : ' Join a party to start the climb.'}
        </p>
        <div className="mt-3"><LockedBtn small reason={`Only the ${leaderTitle(desk)} and ministers issue decrees.`} id="decree-locked">Issue a decree</LockedBtn></div>
      </Card>
    );
  }
  const isPremier = office.titles.includes('premier');
  const ap = me.ap.current;
  return (
    <Card className="p-4" tone="accent">
      <div className="flex items-baseline justify-between gap-2">
        <Label color={T.accent}>{isPremier ? `${leaderTitle(desk)}’s office` : 'Your ministry'}</Label>
        <span className="text-[11px]" style={{ color: T.faint }}>One decree a month · {office.decreeAp} energy · lasts {office.lastsMonths} months</span>
      </div>
      {office.usedThisMonth
        ? <p className="text-sm mt-2" style={{ color: T.text }}>This month’s order is given. <span style={{ color: T.dim }}>{office.usedThisMonth}</span></p>
        : <p className="text-sm mt-2" style={{ color: T.dim }}>Act without Parliament. Every decree helps one thing and hurts another; laws are still the lasting lever.</p>}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {office.decrees.map(d => (
          <div key={d.key} className="rounded-xl p-3" style={{ background: T.raised, border: `1px solid ${T.line}` }}>
            <div className="font-semibold text-sm" style={{ color: T.text }}>{d.title}</div>
            <div className="text-xs mt-0.5" style={{ color: T.dim }}>{d.blurb}</div>
            <div className="mt-2"><EffectChips effects={{ stat: d.stat, support: d.support }} segments={desk.desk.segments} /></div>
            <div className="mt-2.5">
              <Btn small kind="primary" id={`decree-${d.key}`} disabled={busy || !!office.usedThisMonth || ap < office.decreeAp}
                onClick={() => act(() => politicsApi.issueDecree(d.key), r => r.message)}>
                Issue decree
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Appoint control: only the head of government sees it. */
function AppointSelect({ postKey, title }: { postKey: string; title: string }) {
  const { desk, act, busy } = useFloor();
  const eligible = desk.me?.eligibleMinisters ?? [];
  return (
    <select aria-label={`Appoint ${title}`} disabled={busy} value="" className="rounded-lg text-xs px-2 py-1"
      style={{ background: T.raised, color: T.text, border: `1px solid ${T.lineStrong}` }}
      onChange={e => { const v = e.target.value; if (v) act(() => politicsApi.appointMinister(postKey, v === 'npc' ? null : v), `${title} appointed.`); }}>
      <option value="">Appoint…</option>
      {eligible.map(m => <option key={m.id} value={m.id}>{m.name} (trust {m.credibility})</option>)}
      <option value="npc">A career official</option>
    </select>
  );
}

/** Compact list of ministers (Nation → Government), with a link to the full Cabinet tab. */
export function CabinetList({ compact }: { compact?: boolean }) {
  const { desk, go } = useFloor();
  const me = desk.me;
  const isPremier = !!me && desk.premier?.characterId === me.characterId;
  const eligible = me?.eligibleMinisters ?? [];
  const party = (id: string | null) => desk.parties.find(p => p.id === id);
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Label>The cabinet</Label>
        <span className="text-[11px]" style={{ color: T.faint }}>{isPremier ? 'You appoint' : `Appointed by the ${leaderTitle(desk)}`}</span>
      </div>
      {!desk.parliament.government && <p className="text-sm mt-2" style={{ color: T.dim }}>No government has taken office, so the ministries are run by officials.</p>}
      <div className="mt-2 space-y-2">
        {desk.cabinet.map(c => (
          <div key={c.key} className="flex flex-wrap items-center gap-2 text-sm">
            <PartyDot color={party(c.partyId)?.color ?? T.faint} />
            <span className="w-20 text-xs" style={{ color: T.faint }}>{c.short}</span>
            <span className="flex-1 min-w-0 truncate" style={{ color: c.holderName ? T.text : T.faint }}>{c.holderName ?? 'Vacant'}</span>
            {c.isPlayer && <Chip color={T.accent}>player</Chip>}
            {isPremier && eligible.length > 0 && <AppointSelect postKey={c.key} title={c.title} />}
          </div>
        ))}
      </div>
      {compact && <div className="mt-3"><Btn small onClick={() => go('cabinet')} id="open-cabinet">Open the cabinet</Btn></div>}
    </Card>
  );
}

export default function CabinetView() {
  const { desk, go } = useFloor();
  const me = desk.me;
  const isPremier = !!me && desk.premier?.characterId === me.characterId;
  const eligible = me?.eligibleMinisters ?? [];
  const party = (id: string | null) => desk.parties.find(p => p.id === id);
  const gov = desk.parliament.government;
  const head = desk.premier;
  const headParty = party(head?.partyId ?? null);
  const lawNow = (id: string) => {
    const law = desk.laws.find(l => l.id === id);
    return law?.options.find(o => o.id === law.currentOptionId)?.name ?? '—';
  };
  const openBill = new Set(desk.bills.filter(b => b.status === 'proposed').map(b => b.category));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: T.text }}>The Cabinet</h2>
        <p className="text-sm mt-1" style={{ color: T.dim }}>
          The {leaderTitle(desk)} leads the government and names a minister to each ministry. A minister tables bills on the laws of their ministry
          for less energy, government parties back those bills more readily, and every office-holder may issue one decree a month.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          {/* Head of government */}
          <Card className="p-4" tone={isPremier ? 'accent' : undefined}>
            <Label>{leaderTitle(desk)}</Label>
            {head ? (
              <>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-serif text-xl font-bold" style={{ color: T.text }}>{head.name}</span>
                  {head.isPlayer ? <Chip color={T.accent}>player</Chip> : <Chip>computer-run</Chip>}
                  {isPremier && <Chip color={T.accent} filled>you</Chip>}
                </div>
                <div className="mt-1 text-xs flex flex-wrap items-center gap-2" style={{ color: T.dim }}>
                  {headParty && <span className="inline-flex items-center gap-1.5"><PartyDot color={headParty.color} />{headParty.name}</span>}
                  <span>· in office since {formatPolArc(head.since, false)}</span>
                  {gov && <span>· {gov.type === 'coalition' ? 'coalition' : gov.type === 'minority' ? 'minority government' : 'majority government'}, {gov.seats} of {desk.parliament.seats} seats</span>}
                </div>
              </>
            ) : (
              <p className="text-sm mt-1" style={{ color: T.dim }}>
                No government has taken office. The {desk.nation.headOfState?.title ?? 'head of state'} leads a caretaker government until one forms.
                {desk.parliament.filled > 0 && <> <button type="button" className="underline" onClick={() => go('nation:coalition')}>See the coalition talks</button>.</>}
              </p>
            )}
          </Card>

          {/* Every ministry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {desk.cabinet.map(c => {
              const p = party(c.partyId);
              const mine = !!me && c.characterId === me.characterId;
              return (
                <Card key={c.key} className="p-4" tone={mine ? 'accent' : undefined}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-serif text-lg font-bold" style={{ color: T.text }}>{c.title}</div>
                    {mine && <Chip color={T.accent} filled>you</Chip>}
                  </div>
                  <p className="text-xs mt-1" style={{ color: T.dim }}>{c.blurb}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <PartyDot color={p?.color ?? T.faint} />
                    <span style={{ color: c.holderName ? T.text : T.faint }}>{c.holderName ?? (gov ? 'Vacant' : 'Run by officials')}</span>
                    {c.isPlayer ? <Chip color={T.accent}>player</Chip> : c.holderName ? <Chip>official</Chip> : null}
                    {p && <span className="text-xs" style={{ color: T.faint }}>{p.abbreviation}</span>}
                    {c.since != null && <span className="text-xs" style={{ color: T.faint }}>· since {formatPolArc(c.since, false)}</span>}
                  </div>
                  {isPremier && eligible.length > 0 && <div className="mt-2"><AppointSelect postKey={c.key} title={c.title} /></div>}
                  <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.line}` }}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: T.faint }}>Laws this ministry steers</div>
                    {c.portfolio.length === 0 && <div className="text-xs" style={{ color: T.faint }}>No laws of its own.</div>}
                    {c.portfolio.map(l => (
                      <div key={l.id} className="flex items-center justify-between gap-2 text-xs py-0.5">
                        <span style={{ color: T.dim }}>{l.name}</span>
                        <span className="text-right" style={{ color: T.text }}>{lawNow(l.id)}{openBill.has(l.id) && <span style={{ color: T.accent }}> · vote pending</span>}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
          {isPremier && eligible.length === 0 && <p className="text-xs" style={{ color: T.faint }}>No other players sit in the governing parties yet, so career officials hold the posts.</p>}
          {!isPremier && (
            <p className="text-xs" style={{ color: T.faint }}>
              {me?.party?.inGovernment
                ? `Your party is in government: build trust and the ${leaderTitle(desk)} can name you to a ministry.`
                : `Ministers come from the governing parties. Join one, or win the next election, to be named to the cabinet.`}
            </p>
          )}
        </div>
        <aside className="space-y-4">
          <Powers />
          <Card className="p-4">
            <Label>Change a law</Label>
            <p className="text-xs mt-1" style={{ color: T.dim }}>Lasting change goes through Parliament. Every law, who steers it and what it is set to now is in the Chamber.</p>
            <div className="mt-3"><Btn small onClick={() => go('chamber:laws')} id="cabinet-to-laws">Laws in force</Btn></div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
