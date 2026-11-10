'use client';
import React, { useMemo } from 'react';
import type { Capitol } from './types';
import { C, PHASES } from './theme';
import { PollChart, SeatBar, PhaseTrack, ApprovalDial } from './charts';
import { Panel, Pill, BrassButton } from './ui';
import { formatPolArc } from '@/lib/calendar';

export default function ElectionsTab({ cap, go }: { cap: Capitol; go: (t: string) => void }) {
  const byId = new Map(cap.parties.map(p => [p.id, p]));
  const latest = cap.polls.latest;
  const phase = PHASES.find(p => p.key === cap.calendar.phase);
  const regions = useMemo(() => {
    const m = new Map<string, typeof cap.districts>();
    for (const d of cap.districts) m.set(d.region, [...(m.get(d.region) ?? []), d]);
    return [...m.entries()];
  }, [cap.districts]);
  const regionName = (code: string) => cap.nation.regions?.find(r => r.code === code)?.name ?? code;
  const leader = latest ? [...cap.parties].sort((a, b) => (latest.seats[b.id] || 0) - (latest.seats[a.id] || 0))[0] : null;
  const leaderSeats = leader && latest ? latest.seats[leader.id] || 0 : 0;

  return (
    <div className="space-y-4">
      <Panel kicker={`Election cycle ${cap.calendar.cycleNumber}`} title={phase ? `${phase.label} phase` : 'Elections'}>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] items-center">
          <div>
            <p className="text-xs mb-3" style={{ color: C.ink }}>{phase?.blurb} Polling day: <b style={{ color: C.ivory }}>{formatPolArc(cap.calendar.electionArc)}</b>{cap.calendar.monthsToElection > 0 && <> · in {cap.calendar.monthsToElection} month{cap.calendar.monthsToElection === 1 ? '' : 's'}</>}.</p>
            <PhaseTrack {...cap.calendar} />
          </div>
          <div className="flex md:flex-col gap-2">
            <BrassButton onClick={() => go('campaign')}>Campaign desk</BrassButton>
            {!cap.me?.party && <BrassButton variant="ghost" onClick={() => go('party')}>Join a party first</BrassButton>}
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel kicker="Opinion polls" title="Voting intention" action={cap.polls.live ? <Pill>Snapshot</Pill> : undefined}>
          <PollChart history={cap.polls.history.length ? cap.polls.history : latest ? [latest] : []} parties={cap.parties} />
          <p className="text-[11px] mt-2" style={{ color: C.muted }}>
            Polls use the real election formula each month: every party&apos;s platform against each district&apos;s voters, campaign effort so far, and the government&apos;s approval.
          </p>
        </Panel>
        <Panel kicker="If the election were held today" title={leader && leaderSeats ? `${leader.abbreviation} would win most seats (${leaderSeats})` : 'Seat projection'}>
          {latest ? <SeatBar parties={cap.parties} seats={latest.seats} total={cap.parliament.seats} majority={cap.parliament.majority} /> : <p className="text-xs" style={{ color: C.muted }}>No projection yet.</p>}
          {leader && leaderSeats > 0 && leaderSeats < cap.parliament.majority && (
            <p className="text-xs mt-3" style={{ color: C.ink }}>Nobody would reach {cap.parliament.majority}: expect coalition talks. Parties within reach of each other&apos;s platforms can govern together.</p>
          )}
          <div className="flex items-center gap-3 mt-4">
            <div className="shrink-0"><ApprovalDial value={cap.approval.current} size={120} /></div>
            <p className="text-[11px]" style={{ color: C.muted }}>Government approval feeds into the vote: a popular government gains, an unpopular one loses.</p>
          </div>
        </Panel>
      </div>

      <Panel kicker="20 districts · 151 seats" title="The electoral map">
        <p className="text-xs mb-3" style={{ color: C.muted }}>
          Each district elects several MPs. Seats are shared by vote share inside the district, so a party with around 10–15% of a district&apos;s vote can win a seat there. Each region&apos;s voters differ: Ironvale is factory country, Drennport leans professional and business, Westport lives off trade, Greenmere is rural and family-minded.
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {regions.map(([code, ds]) => (
            <div key={code} className="rounded-lg p-3" style={{ background: 'rgba(10,14,24,0.55)', border: `1px solid ${C.lineSoft}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif font-bold text-sm" style={{ color: C.ivory }}>{regionName(code)}</span>
                <span className="text-[10px]" style={{ color: C.muted }}>{ds.reduce((a, d) => a + d.seats, 0)} seats</span>
              </div>
              <ul className="space-y-1.5">
                {ds.map(d => {
                  const entries = Object.entries(d.sitting).sort((a, b) => b[1] - a[1]);
                  return (
                    <li key={d.id}>
                      <div className="flex justify-between text-[11px]">
                        <span style={{ color: C.ink }}>{d.name.replace(`${regionName(code)} `, '')}</span>
                        <span className="font-mono" style={{ color: C.muted }}>{d.seats}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden flex mt-0.5" style={{ background: '#1C2333' }}>
                        {entries.map(([pid, n]) => <div key={pid} title={`${byId.get(pid)?.name}: ${n}`} style={{ width: `${(100 * n) / d.seats}%`, background: byId.get(pid)?.color ?? '#555' }} />)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
