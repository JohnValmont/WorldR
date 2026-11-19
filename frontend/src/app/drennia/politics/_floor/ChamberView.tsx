'use client';
// The Chamber: who holds Parliament, what is before it, the laws in force, every party, and treaties.
import React, { useEffect, useState } from 'react';
import { formatPolArc } from '@/lib/calendar';
import { Hemicycle } from '../_capitol/charts';
import { Btn, Card, Chip, Label, LockedBtn, Meter, PartyDot, T, leaderTitle, pct, useFloor } from './kit';
import { BillCard, FavourLedger, TableBillSheet } from './bills';
import { Foreign, NATION_SECTION_KEY } from './NationView';

function Government() {
  const { desk, go } = useFloor();
  const gov = desk.parliament.government;
  const party = (id: string | null) => desk.parties.find(p => p.id === id);
  if (!gov) {
    return (
      <Card className="p-4">
        <Label>Government</Label>
        <p className="text-sm mt-1" style={{ color: T.dim }}>
          {desk.parliament.filled > 0 ? 'Parties are negotiating. No government has formed yet.' : 'Parliament has not been elected yet. The founding election is this month.'}
        </p>
        {desk.parliament.filled > 0 && <div className="mt-3"><Btn small onClick={() => go('nation:coalition')} id="cta-coalition-government">See the coalition talks</Btn></div>}
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
      <div className="mt-3"><Btn small onClick={() => go('cabinet')} id="chamber-open-cabinet">The cabinet</Btn></div>
    </Card>
  );
}

/** After an election, coalition talks run on Nation → Coalition (docs/COALITIONS.md). */
function Formation() {
  const { desk, go } = useFloor();
  const c = desk.desk.coalition;
  const between = ['polling', 'formation'].includes(desk.calendar.phase);
  if (!c || (c.phase !== 'talks' && !between)) return null;
  const lead = c.blocs[0];
  return (
    <Card className="p-4" tone="accent">
      <Label color={T.accent}>Forming a government</Label>
      <p className="text-sm mt-1" style={{ color: T.text }}>
        {c.phase === 'talks'
          ? <>No party has a majority ({c.majority} seats).{lead ? ` Biggest bloc so far: ${lead.leadName}${lead.partners.length ? ` + ${lead.partners.map(p => p.name).join(' + ')}` : ''}, ${lead.seats} seats.` : ''}</>
          : <>The votes are counted when this month ends. A party with {c.majority} seats governs at once; otherwise coalition talks open, and every party leader with seats can make offers.</>}
      </p>
      <div className="mt-3"><Btn small kind="primary" onClick={() => go('nation:coalition')} id="cta-coalition-chamber">Coalition talks</Btn></div>
    </Card>
  );
}

/** "Table a bill": open when allowed, otherwise visible and locked with the server's reason. */
function TableBillButton({ onOpen, small, lawName }: { onOpen: () => void; small?: boolean; lawName?: string }) {
  const { desk } = useFloor();
  const me = desk.me;
  const label = lawName ? 'Propose a change' : `Table a bill${me ? ` · ${me.tableBillApCost} energy` : ''}`;
  if (me?.canTableBill) return <Btn small={small} kind={lawName ? 'ghost' : 'primary'} onClick={onOpen} id={lawName ? undefined : 'table-bill'}>{label}</Btn>;
  const reason = me?.tableBillLock ?? (me ? 'Your party needs seats in Parliament to table bills.' : 'Create a character and join a party to table bills.');
  return <LockedBtn small={small} kind={lawName ? 'ghost' : 'primary'} reason={reason} id={lawName ? undefined : 'table-bill'}>{label}</LockedBtn>;
}

function Floor({ onTable }: { onTable: () => void }) {
  const { desk } = useFloor();
  const me = desk.me;
  const open = desk.bills.filter(b => b.status === 'proposed');
  const past = desk.bills.filter(b => b.status !== 'proposed').slice(0, 6);
  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: T.text }}>Before Parliament</h2>
          <p className="text-sm mt-1" style={{ color: T.dim }}>
            {desk.desk.rules.passMargin > 1
              ? `A bill needs ${desk.desk.rules.passMargin} more votes for than against, or the ${desk.nation.headOfState?.title ?? 'head of state'} returns it unsigned.`
              : 'A bill passes with more votes for than against.'} Parties vote as blocs unless an MP breaks ranks. Votes are counted when the month ends.
          </p>
        </div>
        <TableBillButton onOpen={onTable} />
      </div>
      {me && !me.canTableBill && me.tableBillLock && (
        <p className="text-xs" style={{ color: T.faint }}>{me.tableBillLock}</p>
      )}
      <Formation />
      {open.length === 0 && (
        <Card className="p-5"><p className="text-sm" style={{ color: T.dim }}>Nothing is before Parliament this month.{me?.canTableBill ? ' Table a bill of your own, or pick a law under Laws in force.' : ''}</p></Card>
      )}
      {open.map(b => <BillCard key={b.id} bill={b} />)}
      {me?.party && <FavourLedger />}
      {past.length > 0 && <Label>Recent votes</Label>}
      {past.map(b => <BillCard key={b.id} bill={b} compact />)}
    </div>
  );
}

/** Every law in force, grouped by the ministry that steers it, each with a way to change it. */
function Laws({ onTable }: { onTable: (lawId: string) => void }) {
  const { desk, go } = useFloor();
  const openBill = new Map(desk.bills.filter(b => b.status === 'proposed').map(b => [b.category, b]));
  const groups = new Map<string, { title: string; laws: typeof desk.laws }>();
  for (const l of desk.laws) {
    const key = l.ministry?.key ?? 'other';
    const title = l.ministry ? (desk.cabinet.find(c => c.key === l.ministry!.key)?.title ?? l.ministry.short) : 'No single ministry';
    const g = groups.get(key) ?? { title, laws: [] };
    g.laws.push(l);
    groups.set(key, g);
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: T.text }}>Laws in force</h2>
          <p className="text-sm mt-1" style={{ color: T.dim }}>
            Every law of {desk.nation.shortName}, what it is set to today and which ministry steers it. To change one, table a bill: Parliament votes on it when the month ends.
          </p>
        </div>
        <Btn small onClick={() => go('cabinet')} id="laws-to-cabinet">See the ministries</Btn>
      </div>
      {[...groups.entries()].map(([key, g]) => (
        <Card key={key} className="p-4">
          <Label>{g.title}</Label>
          <div className="mt-2 divide-y" style={{ borderColor: T.line }}>
            {g.laws.map(l => {
              const cur = l.options.find(o => o.id === l.currentOptionId);
              const pending = openBill.get(l.id);
              return (
                <div key={l.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3" style={{ borderTop: `1px solid ${T.line}` }}>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm" style={{ color: T.text }}>{l.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: T.dim }}>
                      Now: <span style={{ color: T.text }}>{cur?.name ?? '—'}</span>
                      <span style={{ color: T.faint }}> · {l.options.length} options · takes {l.rolloutMonths} month{l.rolloutMonths === 1 ? '' : 's'} to take effect{l.enactedArc != null ? ` · set ${formatPolArc(l.enactedArc, false)}` : ' · founding law'}</span>
                    </div>
                  </div>
                  {pending
                    ? <Chip color={T.accent}>Vote pending: {pending.title}</Chip>
                    : <TableBillButton small lawName={l.name} onOpen={() => onTable(l.id)} />}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Every party of the nation: in Parliament or not, government or opposition. */
function Parties() {
  const { desk } = useFloor();
  const gov = desk.parliament.government;
  const shares = desk.polls.latest?.shares ?? {};
  const list = [...desk.parties].sort((a, b) => b.seats - a.seats || (shares[b.id] ?? 0) - (shares[a.id] ?? 0));
  const seated = list.filter(p => p.seats > 0);
  const opposition = seated.filter(p => !p.inGovernment).reduce((a, p) => a + p.seats, 0);
  const empty = desk.parliament.seats - desk.parliament.filled;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: T.text }}>Parties</h2>
        <p className="text-sm mt-1" style={{ color: T.dim }}>
          {seated.length} of {list.length} parties sit in {desk.parliament.name}. Government {gov?.seats ?? 0} · opposition {opposition}{empty > 0 ? ` · ${empty} seats unfilled` : ''} · {desk.parliament.majority} for a majority.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map(p => {
          const role = p.seats === 0 ? { t: 'Not in Parliament', c: T.faint } : p.leadsGovernment ? { t: 'Leads the government', c: T.accent } : p.inGovernment ? { t: 'In government', c: T.good } : { t: 'Opposition', c: T.dim };
          const mine = desk.me?.party?.id === p.id;
          return (
            <Card key={p.id} className="p-4" tone={mine ? 'accent' : undefined}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PartyDot color={p.color} size={12} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: T.text }}>{p.name} <span style={{ color: T.faint }}>{p.abbreviation}</span></div>
                    <div className="text-xs truncate" style={{ color: T.dim }}>
                      {p.leaderName ? `Led by ${p.leaderName}` : 'No leader'} · {p.isNpc ? 'computer-run' : 'player party'} · {p.members} member{p.members === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-serif text-2xl font-bold leading-none" style={{ color: p.seats ? T.text : T.faint }}>{p.seats}</div>
                  <div className="text-[10px]" style={{ color: T.faint }}>seats</div>
                </div>
              </div>
              <div className="mt-2"><Meter value={p.seats} max={desk.parliament.seats} color={p.color} marker={desk.parliament.majority} height={5} /></div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <Chip color={role.c}>{role.t}</Chip>
                {mine && <Chip color={T.accent} filled>your party</Chip>}
                {shares[p.id] != null && <span style={{ color: T.faint }}>polling {pct(shares[p.id])}</span>}
              </div>
              {p.motto && <p className="text-xs mt-2 italic" style={{ color: T.faint }}>“{p.motto}”</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/** Treaties: votes before Parliament, treaties in force, and the head of government's levers. */
function Treaties() {
  const { desk } = useFloor();
  const mine = desk.desk.world.find(n => n.mine);
  const sim = mine?.sim ?? null;
  const votes = desk.bills.filter(b => b.status === 'proposed' && b.category === 'treaty');
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: T.text }}>Treaties</h2>
        <p className="text-sm mt-1" style={{ color: T.dim }}>
          The {leaderTitle(desk)} offers trade pacts, defence pacts and embargoes. Each one is ratified by a vote in Parliament, counted like any bill.
        </p>
      </div>
      {votes.length > 0 && <Label>Treaty votes this month</Label>}
      {votes.map(b => <BillCard key={b.id} bill={b} />)}
      {sim ? <Foreign foreign={sim.foreign} name={mine!.name} /> : (
        <Card className="p-4 text-sm"><span style={{ color: T.dim }}>Relations appear after the first month closes.</span></Card>
      )}
    </div>
  );
}

type Section = 'floor' | 'laws' | 'parties' | 'treaties';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'floor', label: 'Bills' },
  { id: 'laws', label: 'Laws in force' },
  { id: 'parties', label: 'Parties' },
  { id: 'treaties', label: 'Treaties' },
];
const LAST_KEY = 'worldr_chamber_last_section';
function initialSection(): Section {
  try {
    const asked = sessionStorage.getItem(NATION_SECTION_KEY);
    if (SECTIONS.some(s => s.id === asked)) return asked as Section;
    const last = localStorage.getItem(LAST_KEY);
    if (SECTIONS.some(s => s.id === last)) return last as Section;
  } catch { /* private mode */ }
  return 'floor';
}

export default function ChamberView() {
  const { desk } = useFloor();
  const [tabling, setTabling] = useState<{ lawId: string | null } | null>(null);
  const [section, setSection] = useState<Section>(initialSection);
  useEffect(() => {
    try { if (SECTIONS.some(s => s.id === sessionStorage.getItem(NATION_SECTION_KEY))) sessionStorage.removeItem(NATION_SECTION_KEY); } catch { /* private mode */ }
  }, []);
  const choose = (s: Section) => { setSection(s); try { localStorage.setItem(LAST_KEY, s); } catch { /* private mode */ } };
  const gov = desk.parliament.government;
  const pendingTreaty = desk.bills.some(b => b.status === 'proposed' && b.category === 'treaty');
  const pendingVote = !!desk.me?.voteMode && desk.bills.some(b => b.status === 'proposed' && !b.myVote);
  const dot: Partial<Record<Section, boolean>> = { floor: pendingVote, treaties: pendingTreaty };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
      <div className="space-y-4 min-w-0">
        <div role="tablist" aria-label="Chamber sections" className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1" style={{ borderBottom: `1px solid ${T.line}` }}>
          {SECTIONS.map(s => (
            <button key={s.id} role="tab" aria-selected={section === s.id} id={`chamber-${s.id}`} type="button" onClick={() => choose(s.id)}
              className="relative shrink-0 px-3 py-2 text-sm font-semibold rounded-t-lg"
              style={{ color: section === s.id ? T.text : T.faint, background: section === s.id ? T.raised : 'transparent', borderBottom: section === s.id ? `2px solid ${T.accent}` : '2px solid transparent' }}>
              {s.label}
              {dot[s.id] && <span aria-label="needs you" className="absolute top-1.5 right-1 inline-block rounded-full" style={{ width: 6, height: 6, background: T.accent }} />}
            </button>
          ))}
        </div>
        {section === 'floor' && <Floor onTable={() => setTabling({ lawId: null })} />}
        {section === 'laws' && <Laws onTable={lawId => setTabling({ lawId })} />}
        {section === 'parties' && <Parties />}
        {section === 'treaties' && <Treaties />}
      </div>
      <aside className="space-y-4">
        <Card className="p-4">
          <Label>{desk.parliament.name}</Label>
          <div className="mt-2">
            <Hemicycle parties={desk.parties as any} total={desk.parliament.seats} majority={desk.parliament.majority} governmentIds={gov?.memberPartyIds ?? []} size={340} />
          </div>
          {section !== 'parties' && <div className="mt-3 text-center"><Btn small kind="quiet" onClick={() => choose('parties')} id="chamber-all-parties">All {desk.parties.length} parties</Btn></div>}
        </Card>
        <Government />
      </aside>
      {tabling && <TableBillSheet initialLawId={tabling.lawId} onClose={() => setTabling(null)} />}
    </div>
  );
}
