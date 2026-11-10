'use client';
import React from 'react';
import type { Capitol } from './types';
import { C, STAT_LABELS } from './theme';
import { Hemicycle, ApprovalDial, StatBar, PhaseTrack } from './charts';
import { Portrait, PartyMark } from './art';
import { Panel, Pill, CareerLadder, BrassButton } from './ui';
import { formatPolArc } from '@/lib/calendar';

const NEWS_ICON: Record<string, string> = {
  election_results: '🗳', government_formed: '🏛', cabinet_formed: '🏛', cabinet_reshuffle: '🔁',
  bill_tabled: '📜', bill_passed: '✅', bill_failed: '✗', scandal: '⚠', petition_failed: '✗',
};

export default function OverviewTab({ cap, go }: { cap: Capitol; go: (tab: string) => void }) {
  const byId = new Map(cap.parties.map(p => [p.id, p]));
  const gov = cap.parliament.government;
  const lead = gov ? byId.get(gov.leadPartyId) : null;
  const me = cap.me;
  const openBills = cap.bills.filter(b => b.status === 'proposed');

  const career = me ? (
    <Panel kicker="Your career" title={me.name} action={me.party ? <PartyMark color={me.party.color} abbr={me.party.name.split(' ').map(w => w[0]).join('').slice(0, 3)} /> : undefined}>
      <CareerLadder me={me} />
      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        {[['AP', `${me.ap.current}/${me.ap.cap}`], ['Credibility', me.credibility], ['Influence', me.influence]].map(([k, v]) => (
          <div key={k as string} className="rounded-md py-2" style={{ background: 'rgba(10,14,24,0.55)', border: `1px solid ${C.lineSoft}` }}>
            <div className="font-mono text-sm" style={{ color: C.ivory }}>{v}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>{k}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {!me.party && <BrassButton onClick={() => go('party')}>Join or found a party</BrassButton>}
        {me.party && (cap.calendar.phase === 'filing' || cap.calendar.phase === 'campaign') && <BrassButton onClick={() => go('campaign')}>Go to campaign desk</BrassButton>}
        {me.canTableBill && <BrassButton onClick={() => go('laws')}>Table a bill</BrassButton>}
        {me.party && <BrassButton variant="ghost" onClick={() => go('party')}>Party HQ</BrassButton>}
      </div>
    </Panel>
  ) : (
    <Panel title="Enter politics"><p className="text-xs" style={{ color: C.muted }}>Create a character to take part.</p></Panel>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      {/* On phones the player's own career comes first. */}
      <div className="lg:hidden">{career}</div>
      <div className="space-y-4 min-w-0">
        <Panel kicker={cap.parliament.name} title="The Chamber" action={<BrassButton small variant="ghost" onClick={() => go('parliament')}>Open Parliament →</BrassButton>}>
          <Hemicycle parties={cap.parties} total={cap.parliament.seats} majority={cap.parliament.majority} governmentIds={gov?.memberPartyIds ?? []} />
          {gov && lead ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs" style={{ color: C.ink }}>
              <Pill color={gov.type === 'majority' ? C.yea : gov.type === 'coalition' ? C.brass : C.nay}>{gov.type} government</Pill>
              <span>led by <b style={{ color: C.ivory }}>{lead.name}</b> with {gov.seats} of {cap.parliament.seats} seats</span>
              {gov.memberPartyIds.length > 1 && (
                <span className="flex items-center gap-1">· with {gov.memberPartyIds.filter(id => id !== lead.id).map(id => byId.get(id)?.abbreviation).join(', ')}</span>
              )}
            </div>
          ) : (
            <p className="mt-4 text-xs" style={{ color: C.muted }}>
              Drennia&apos;s first election is due {formatPolArc(cap.calendar.electionArc)}. Until then the chamber stands empty and a caretaker administration runs the country.
            </p>
          )}
        </Panel>

        <Panel kicker="Executive" title="Government" action={<BrassButton small variant="ghost" onClick={() => go('parliament')}>Cabinet →</BrassButton>}>
          {cap.premier ? (
            <div className="flex items-center gap-4">
              <Portrait name={cap.premier.name} color={byId.get(cap.premier.partyId)?.color ?? C.brass} size={72} isPlayer={cap.premier.isPlayer} />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: C.brass }}>Premier</div>
                <div className="font-serif text-lg font-bold" style={{ color: C.ivory }}>{cap.premier.name}</div>
                <div className="text-xs" style={{ color: C.muted }}>{byId.get(cap.premier.partyId)?.name} · since {formatPolArc(cap.premier.since)}</div>
              </div>
            </div>
          ) : <p className="text-xs" style={{ color: C.muted }}>No Premier yet. The largest party after the election will form the first government.</p>}
          {cap.cabinet.some(c => c.holderName) && (
            <div className="grid grid-cols-5 gap-2 mt-4">
              {cap.cabinet.map(c => (
                <div key={c.key} className="text-center min-w-0" title={`${c.title}: ${c.holderName}`}>
                  <div className="flex justify-center"><Portrait name={c.holderName || c.key} color={byId.get(c.partyId || '')?.color ?? '#3A4254'} size={44} isPlayer={c.isPlayer} vacant={!c.holderName} /></div>
                  <div className="text-[10px] mt-1 font-semibold truncate" style={{ color: C.ink }}>{c.short}</div>
                  <div className="text-[10px] truncate" style={{ color: C.muted }}>{c.holderName?.split(' ').slice(-1)[0] ?? '—'}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel kicker="The Drennian Gazette" title="Latest from the capital">
          {cap.news.length === 0 ? <p className="text-xs" style={{ color: C.muted }}>No news yet. Stories appear as the months turn.</p> : (
            <ul className="divide-y" style={{ borderColor: C.lineSoft }}>
              {cap.news.slice(0, 8).map(n => (
                <li key={n.id} className="py-2.5 flex gap-3" style={{ borderColor: C.lineSoft }}>
                  <span className="w-5 text-center shrink-0" aria-hidden>{NEWS_ICON[n.kind] ?? '•'}</span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold leading-snug" style={{ color: C.ivory }}>{n.headline}</div>
                    <div className="text-[11px] mt-0.5 line-clamp-2" style={{ color: C.muted }}>{formatPolArc(n.arc)} · {n.body}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="space-y-4 min-w-0">
        <div className="hidden lg:block">{career}</div>

        <Panel kicker="State of the nation" title="Approval & conditions" action={<BrassButton small variant="ghost" onClick={() => go('nation')}>Nation →</BrassButton>}>
          <div className="flex items-center gap-4">
            <div className="shrink-0"><ApprovalDial value={cap.approval.current} size={140} /></div>
            <p className="text-xs leading-relaxed" style={{ color: C.ink }}>
              Approval comes from the economy and public services. At the next election it moves the governing parties&apos; vote by up to a fifth, up or down.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 mt-3">
            {['prosperity', 'cost_of_living', 'fiscal_health', 'order_safety', 'equity', 'human_development'].map(k => (
              <StatBar key={k} name={STAT_LABELS[k].name} value={cap.stats[k] ?? 50} good={STAT_LABELS[k].good} blurb={STAT_LABELS[k].blurb} />
            ))}
          </div>
        </Panel>

        <Panel kicker="Election calendar" title={cap.calendar.monthsToElection > 0 ? `Election in ${cap.calendar.monthsToElection} month${cap.calendar.monthsToElection === 1 ? '' : 's'}` : 'Election season'} action={<BrassButton small variant="ghost" onClick={() => go('elections')}>Polls →</BrassButton>}>
          <PhaseTrack {...cap.calendar} />
        </Panel>

        <Panel kicker="Order paper" title={`${openBills.length} bill${openBills.length === 1 ? '' : 's'} before Parliament`} action={<BrassButton small variant="ghost" onClick={() => go('parliament')}>Vote →</BrassButton>}>
          {openBills.length === 0 ? <p className="text-xs" style={{ color: C.muted }}>No bills this month. Bills are voted on the month after they are tabled.</p> : (
            <ul className="space-y-2">
              {openBills.slice(0, 4).map(b => (
                <li key={b.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate" style={{ color: C.ivory }}>{b.title}</span>
                  <Pill color={b.projectedPass ? C.yea : C.nay}>{b.tally.yea}–{b.tally.nay}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
