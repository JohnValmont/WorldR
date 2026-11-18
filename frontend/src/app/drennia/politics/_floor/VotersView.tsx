'use client';
// Voters: who backs whom, how the country is doing, and the last election.
import React from 'react';
import { PollChart } from '../_capitol/charts';
import { ApprovalWhy, Btn, Card, Label, PartyDot, T, pct, useFloor } from './kit';

function SupportTable() {
  const { desk } = useFloor();
  const mine = desk.me?.party?.id;
  const parties = desk.parties;
  return (
    <Card className="p-4 overflow-x-auto">
      <Label>Support by voter group</Label>
      <p className="text-xs mt-1" style={{ color: T.faint }}>
        0 to 100. This is what elections are fought over: rallies, ads, the laws you back and whether you keep your word all move it.
      </p>
      <table className="w-full mt-3 text-sm" style={{ minWidth: 480 }}>
        <thead>
          <tr>
            <th className="text-left font-normal pb-2" style={{ color: T.faint }} />
            {parties.map(p => (
              <th key={p.id} className="text-right font-semibold pb-2 px-2" style={{ color: p.id === mine ? T.text : T.dim }}>
                <span className="inline-flex items-center gap-1.5"><PartyDot color={p.color} />{p.abbreviation}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {desk.desk.segments.map(s => {
            const best = Math.max(...parties.map(p => desk.desk.support[p.id]?.[s.key] ?? 0));
            return (
              <tr key={s.key} style={{ borderTop: `1px solid ${T.line}` }}>
                <td className="py-2 pr-2">
                  <div className="font-semibold" style={{ color: T.text }}>{s.label}</div>
                  <div className="text-[10px]" style={{ color: T.faint }}>{pct(s.size)} of voters</div>
                </td>
                {parties.map(p => {
                  const v = desk.desk.support[p.id]?.[s.key] ?? 0;
                  return (
                    <td key={p.id} className="py-2 px-2 text-right font-mono" style={{ color: v === best ? T.text : T.dim, fontWeight: v === best ? 700 : 400, background: p.id === mine ? 'rgba(255,255,255,0.03)' : undefined }}>
                      {Math.round(v)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function Districts() {
  const { desk } = useFloor();
  const party = (id: string) => desk.parties.find(p => p.id === id);
  return (
    <Card className="p-4">
      <Label>The {desk.districts.length} districts</Label>
      <p className="text-xs mt-1" style={{ color: T.faint }}>Seats in each district are shared between parties by their vote there.</p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
        {desk.districts.map(d => (
          <div key={d.id}>
            <div className="flex items-baseline justify-between text-xs">
              <span style={{ color: d.name === desk.me?.seatDistrict ? T.accent : T.text }}>{d.name}{d.name === desk.me?.seatDistrict ? ' · your seat' : ''}</span>
              <span className="font-mono" style={{ color: T.faint }}>{d.seats}</span>
            </div>
            <div className="flex h-1.5 mt-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              {Object.entries(d.sitting).sort((a, b) => b[1] - a[1]).map(([pid, n]) => (
                <div key={pid} title={`${party(pid)?.name}: ${n}`} style={{ width: `${(n / d.seats) * 100}%`, background: party(pid)?.color ?? T.faint }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function VotersView({ onReplay }: { onReplay: () => void }) {
  const { desk, go } = useFloor();
  const el = desk.desk.election;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
      <div className="space-y-4 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: T.text }}>The voters</h2>
            <p className="text-sm mt-1" style={{ color: T.dim }}>
              Next election in {desk.calendar.monthsToElection} month{desk.calendar.monthsToElection === 1 ? '' : 's'}. All {desk.parliament.seats} seats are up.
            </p>
          </div>
          {el?.hasResults && <Btn onClick={onReplay} id="replay-election">Replay election night</Btn>}
        </div>
        <SupportTable />
        <Card className="p-4">
          <Label>Opinion polls</Label>
          <div className="mt-2">
            {desk.polls.history.length > 1
              ? <PollChart history={desk.polls.history} parties={desk.parties as any} height={220} />
              : <p className="text-sm" style={{ color: T.dim }}>The first poll is taken when the month turns.</p>}
          </div>
        </Card>
        <Districts />
      </div>
      <aside className="space-y-4">
        <Card className="p-4">
          <Label>Government approval</Label>
          <div className="mt-2 flex items-center gap-3">
            <div className="font-serif text-4xl font-bold" style={{ color: desk.approval.live >= 50 ? T.good : T.bad }}>{Math.round(desk.approval.live)}%</div>
            <div className="text-xs" style={{ color: T.dim }}>
              {desk.approval.live >= 50 ? 'Governing parties gain votes at the election.' : 'Governing parties lose votes at the election.'}
              <br /><button type="button" className="underline" onClick={() => go('nation:standing')}>State of the nation</button>
            </div>
          </div>
          <ApprovalWhy approval={desk.approval} />
        </Card>
      </aside>
    </div>
  );
}
