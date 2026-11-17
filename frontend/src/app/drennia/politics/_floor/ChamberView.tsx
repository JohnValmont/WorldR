'use client';
// The Chamber: who holds Parliament, what is before it, and who owes whom.
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { Hemicycle } from '../_capitol/charts';
import { Btn, Card, Chip, Label, PartyDot, T, useFloor } from './kit';
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
        <span className="font-serif text-lg font-bold">Premier {desk.premier?.name ?? '—'}</span>
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

/** After an election the largest party builds a government. Player leaders do it by hand. */
function Formation() {
  const { desk, act, busy } = useFloor();
  const { data, mutate } = useSWR(desk.calendar.phase === 'formation' ? 'forming-coalition' : null, () => politicsApi.getFormingCoalition());
  const me = desk.me;
  if (desk.calendar.phase !== 'formation') return null;
  const co = data?.coalition;
  const myParty = me?.party?.id;
  const isFormateur = !!co && co.formateur?.id === myParty && me?.isPartyLeader;
  const invitedMe = !!co && (co.invited ?? []).some((p: any) => p.id === myParty) && me?.isPartyLeader;
  const inIds = new Set<string>([co?.formateur?.id, ...(co?.accepted ?? []).map((p: any) => p.id), ...(co?.invited ?? []).map((p: any) => p.id)].filter(Boolean));
  const run = (action: string, id: string, text: string) => act(() => politicsApi.manageCoalition(action, id), text).then(() => mutate());
  return (
    <Card className="p-4" tone="accent">
      <Label color={T.accent}>Forming a government</Label>
      {!co ? <p className="text-sm mt-1" style={{ color: T.dim }}>The votes are counted. Talks begin when the month turns.</p> : (
        <>
          <p className="text-sm mt-1" style={{ color: T.text }}>
            <strong>{co.formateur?.name}</strong> is trying to build a majority: {co.confirmedSeats} of the {desk.parliament.majority} seats needed so far.
          </p>
          {invitedMe && (
            <div className="flex gap-2 mt-3">
              <Btn small kind="primary" disabled={busy} onClick={() => run('accept', co.formateur.id, 'You have joined the government.')}>Join the government</Btn>
              <Btn small disabled={busy} onClick={() => run('decline', co.formateur.id, 'You stay in opposition.')}>Stay in opposition</Btn>
            </div>
          )}
          {isFormateur && (
            <div className="mt-3 space-y-1.5">
              {desk.parties.filter(p => p.seats > 0 && !inIds.has(p.id)).map(p => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <PartyDot color={p.color} /><span className="flex-1" style={{ color: T.text }}>{p.name} <span className="font-mono text-xs" style={{ color: T.faint }}>{p.seats}</span></span>
                  <Btn small disabled={busy} onClick={() => run('invite', p.id, `${p.name} invited.`)}>Invite</Btn>
                </div>
              ))}
              <p className="text-[11px]" style={{ color: T.faint }}>Computer-run parties accept if their platform is close enough to yours. If no majority forms in time, you govern as a minority.</p>
            </div>
          )}
        </>
      )}
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
            <p className="text-sm mt-1" style={{ color: T.dim }}>A bill passes with more votes for than against. Parties vote as blocs unless an MP breaks ranks.</p>
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
