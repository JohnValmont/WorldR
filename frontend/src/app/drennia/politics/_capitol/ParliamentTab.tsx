'use client';
import React from 'react';
import type { Capitol } from './types';
import { C } from './theme';
import { politicsApi } from '@/lib/api';
import { Hemicycle } from './charts';
import { Portrait, PartyMark } from './art';
import { Panel, Pill, BillCard, PlatformBars, useAction, Toast, BrassButton } from './ui';
import { formatPolArc } from '@/lib/calendar';

export default function ParliamentTab({ cap, refresh }: { cap: Capitol; refresh: () => void }) {
  const byId = new Map(cap.parties.map(p => [p.id, p]));
  const gov = cap.parliament.government;
  const open = cap.bills.filter(b => b.status === 'proposed');
  const past = cap.bills.filter(b => b.status !== 'proposed').slice(0, 10);
  const vote = useAction();
  const appoint = useAction();
  const me = cap.me;
  const isPremier = !!me && cap.premier?.characterId === me.characterId;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel kicker={cap.nation.officialName} title={cap.parliament.name}>
          <Hemicycle parties={cap.parties} total={cap.parliament.seats} majority={cap.parliament.majority} governmentIds={gov?.memberPartyIds ?? []} size={520} />
        </Panel>

        <Panel kicker="Cabinet" title={cap.premier ? `${cap.premier.name}'s government` : 'No government yet'}>
          {cap.premier && (
            <div className="flex items-center gap-3 pb-3 mb-3 border-b" style={{ borderColor: C.lineSoft }}>
              <Portrait name={cap.premier.name} color={byId.get(cap.premier.partyId)?.color ?? C.brass} size={52} isPlayer={cap.premier.isPlayer} />
              <div>
                <div className="text-sm font-semibold" style={{ color: C.ivory }}>{cap.premier.name}</div>
                <div className="text-[11px]" style={{ color: C.muted }}>Premier · {byId.get(cap.premier.partyId)?.name}</div>
              </div>
            </div>
          )}
          <ul className="space-y-2.5">
            {cap.cabinet.map(c => {
              const party = c.partyId ? byId.get(c.partyId) : null;
              return (
                <li key={c.key} className="flex items-start gap-3">
                  <Portrait name={c.holderName || c.key} color={party?.color ?? '#3A4254'} size={40} isPlayer={c.isPlayer} vacant={!c.holderName} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold" style={{ color: C.ivory }}>{c.holderName ?? 'Vacant'} {c.isPlayer && <Pill>Player</Pill>}</div>
                    <div className="text-[11px]" style={{ color: C.brass }}>{c.title}</div>
                    <div className="text-[10px] truncate" style={{ color: C.muted }}>{c.portfolio.map(p => p.name).join(' · ')}</div>
                    {isPremier && me && me.eligibleMinisters.length > 0 && (
                      <select
                        className="mt-1 text-[11px] rounded px-1.5 py-1"
                        style={{ background: C.night, color: C.ink, border: `1px solid ${C.line}` }}
                        defaultValue=""
                        disabled={appoint.busy}
                        onChange={e => {
                          const v = e.target.value;
                          if (!v) return;
                          appoint.run(() => politicsApi.appointMinister(c.key, v === 'npc' ? null : v).then(refresh), 'Minister appointed.');
                        }}
                      >
                        <option value="">Reshuffle…</option>
                        {me.eligibleMinisters.map(m => <option key={m.id} value={m.id}>{m.name} ({byId.get(m.partyId)?.abbreviation})</option>)}
                        <option value="npc">A career civil servant</option>
                      </select>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {!cap.cabinet.some(c => c.holderName) && <p className="text-xs" style={{ color: C.muted }}>Ministers are appointed when a government forms after the election.</p>}
          <Toast msg={appoint.msg} />
        </Panel>
      </div>

      <Panel kicker="Order paper" title="Bills before Parliament">
        <p className="text-xs mb-3" style={{ color: C.muted }}>
          Bills are voted on at the next month&apos;s sitting. Every party votes as a bloc. Party leaders cast their party&apos;s votes; computer-run parties vote by their ideology. Government parties are whipped behind government bills, and the opposition is sceptical of them.
        </p>
        {open.length === 0 ? <p className="text-sm" style={{ color: C.muted }}>Nothing on the order paper this month.</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {open.map(b => <BillCard key={b.id} bill={b} cap={cap} busy={vote.busy} onVote={(id, v) => vote.run(() => politicsApi.voteBill(id, v).then(refresh), v === 'yea' ? 'Your party will vote yes.' : 'Your party will vote no.')} />)}
          </div>
        )}
        <Toast msg={vote.msg} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel kicker="Parties" title="Who sits where">
          <ul className="space-y-3">
            {[...cap.parties].sort((a, b) => b.seats - a.seats || b.members - a.members).map(p => (
              <li key={p.id} className="rounded-lg p-3" style={{ background: 'rgba(10,14,24,0.55)', border: `1px solid ${C.lineSoft}` }}>
                <div className="flex items-start gap-3">
                  <PartyMark color={p.color} abbr={p.abbreviation} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold" style={{ color: C.ivory }}>{p.name}</span>
                      {p.leadsGovernment && <Pill solid>Leads government</Pill>}
                      {!p.leadsGovernment && p.inGovernment && <Pill>Coalition</Pill>}
                      {!p.isNpc && <Pill color="#6EC1E4">Player party</Pill>}
                    </div>
                    <div className="text-[11px]" style={{ color: C.muted }}>
                      {p.leaderName ? `Led by ${p.leaderName}` : 'Leaderless'} · {p.isNpc ? 'computer-run' : `${p.members} member${p.members === 1 ? '' : 's'}`}
                    </div>
                    {p.motto && <div className="text-[11px] italic mt-0.5" style={{ color: C.ink }}>&ldquo;{p.motto}&rdquo;</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-xl font-bold" style={{ color: C.ivory }}>{p.seats}</div>
                    <div className="text-[10px]" style={{ color: C.muted }}>seats</div>
                  </div>
                </div>
                <div className="mt-2.5"><PlatformBars party={p} /></div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel kicker="Hansard" title="Recent votes">
          {past.length === 0 ? <p className="text-sm" style={{ color: C.muted }}>No votes yet.</p> : (
            <ul className="space-y-2.5">
              {past.map(b => (
                <li key={b.id} className="flex items-start gap-3 text-xs">
                  <span className="mt-0.5 font-bold w-4 text-center" style={{ color: b.status === 'passed' ? '#7FD3A2' : '#E88C84' }}>{b.status === 'passed' ? '✓' : '✗'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold" style={{ color: C.ivory }}>{b.title}</div>
                    <div style={{ color: C.muted }}>{b.proposer?.abbreviation} · {b.status === 'passed' ? 'passed' : 'defeated'} {b.tally.yea}–{b.tally.nay}{b.resolvedArc != null ? ` · ${formatPolArc(b.resolvedArc)}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {me?.canTableBill && <div className="mt-4"><BrassButton variant="ghost" small onClick={() => document.getElementById('tab-laws')?.click()}>Table your own bill →</BrassButton></div>}
        </Panel>
      </div>
    </div>
  );
}
