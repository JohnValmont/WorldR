'use client';
// The Chamber: who holds Parliament, what is before it, and who owes whom.
import React, { useState } from 'react';
import { Hemicycle } from '../_capitol/charts';
import { Btn, Card, Chip, Label, PartyDot, T, leaderTitle, useFloor } from './kit';
import { BillCard, FavourLedger, TableBillSheet } from './bills';

function Government() {
  const { desk } = useFloor();
  const gov = desk.parliament.government;
  const party = (id: string | null) => desk.parties.find(p => p.id === id);
  if (!gov) {
    return (
      <Card className="p-4">
        <Label>Government</Label>
        <p className="text-sm mt-1" style={{ color: T.dim }}>
          {desk.parliament.filled > 0 ? 'Parties are negotiating. No government has formed yet.' : 'Parliament has not been elected yet. The founding election is this month.'}
        </p>
      </Card>
    );
  }
  const margin = gov.seats - desk.parliament.majority;
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Label>Government</Label>
        <Chip color={margin >= 0 ? T.good : T.bad}>{margin >= 0 ? `majority of ${margin + 1}` : `${-margin} short of a majority`}</Chip>
      </div>
      <div className="mt-2 text-sm" style={{ color: T.text }}>
        <span className="font-serif text-lg font-bold">{leaderTitle(desk)} {desk.premier?.name ?? '—'}</span>
        {desk.premier?.isPlayer && <span className="ml-2"><Chip color={T.accent}>player</Chip></span>}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {gov.memberPartyIds.map(id => (
          <span key={id} className="inline-flex items-center gap-1.5 text-xs rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', color: T.dim }}>
            <PartyDot color={party(id)?.color ?? T.faint} />{party(id)?.name} <span className="font-mono" style={{ color: T.text }}>{party(id)?.seats}</span>
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        {desk.cabinet.filter(c => c.holderName).map(c => (
          <div key={c.key} className="flex items-center gap-2 text-xs" style={{ color: T.dim }}>
            <PartyDot color={party(c.partyId)?.color ?? T.faint} size={6} />
            <span style={{ color: T.faint }}>{c.short}</span>
            <span className="truncate" style={{ color: T.text }}>{c.holderName}</span>
            {c.isPlayer && <Chip color={T.accent}>player</Chip>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** After an election, coalition talks run on Nation → Coalition (docs/COALITIONS.md). */
function Formation() {
  const { desk, go } = useFloor();
  const c = desk.desk.coalition;
  if (!c || c.phase !== 'talks') return null;
  const lead = c.blocs[0];
  return (
    <Card className="p-4" tone="accent">
      <Label color={T.accent}>Forming a government</Label>
      <p className="text-sm mt-1" style={{ color: T.text }}>
        No party has a majority ({c.majority} seats).{lead ? ` Biggest bloc so far: ${lead.leadName}${lead.partners.length ? ` + ${lead.partners.map(p => p.name).join(' + ')}` : ''}, ${lead.seats} seats.` : ''}
      </p>
      <div className="mt-3"><Btn small kind="primary" onClick={() => go('nation:coalition')} id="cta-coalition-chamber">Coalition talks</Btn></div>
    </Card>
  );
}

export default function ChamberView() {
  const { desk } = useFloor();
  const [tabling, setTabling] = useState(false);
  const me = desk.me;
  const open = desk.bills.filter(b => b.status === 'proposed');
  const past = desk.bills.filter(b => b.status !== 'proposed').slice(0, 6);
  const gov = desk.parliament.government;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
      <div className="space-y-4 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: T.text }}>Before Parliament</h2>
            <p className="text-sm mt-1" style={{ color: T.dim }}>
              {desk.desk.rules.passMargin > 1
                ? `A bill needs ${desk.desk.rules.passMargin} more votes for than against, or the ${desk.nation.headOfState?.title ?? 'head of state'} returns it unsigned.`
                : 'A bill passes with more votes for than against.'} Parties vote as blocs unless an MP breaks ranks.
            </p>
          </div>
          {me?.canTableBill && <Btn kind="primary" onClick={() => setTabling(true)} id="table-bill">Table a bill · {me.tableBillApCost} energy</Btn>}
        </div>
        <Formation />
        {open.length === 0 && (
          <Card className="p-5"><p className="text-sm" style={{ color: T.dim }}>Nothing is before Parliament this month.{me?.canTableBill ? ' Table a bill of your own.' : ''}</p></Card>
        )}
        {open.map(b => <BillCard key={b.id} bill={b} />)}
        {me?.party && <FavourLedger />}
        {past.length > 0 && <Label>Recent votes</Label>}
        {past.map(b => <BillCard key={b.id} bill={b} compact />)}
      </div>
      <aside className="space-y-4">
        <Card className="p-4">
          <Label>{desk.parliament.name}</Label>
          <div className="mt-2">
            <Hemicycle parties={desk.parties as any} total={desk.parliament.seats} majority={desk.parliament.majority} governmentIds={gov?.memberPartyIds ?? []} size={340} />
          </div>
        </Card>
        <Government />
      </aside>
      {tabling && <TableBillSheet onClose={() => setTabling(false)} />}
    </div>
  );
}
