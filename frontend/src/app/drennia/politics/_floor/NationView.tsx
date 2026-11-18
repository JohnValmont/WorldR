'use client';
// Nation: your country among the others, how it is doing, and the powers of office.
import React, { useEffect, useState } from 'react';
import { politicsApi } from '@/lib/api';
import { formatPolArc } from '@/lib/calendar';
import type { ChronicleNation, NationBudget, NationForeign, NationSim, NationTrade } from './types';
import { ApprovalWhy, Btn, Card, Chip, EffectChips, Label, Meter, PartyDot, T, leaderTitle, pct, statLowerIsBetter, statName, useFloor } from './kit';
import {
  AdministrationBadge, AdministrationHistory, CARETAKER_COLOR, ElectionTimeline, Flag, MetricTabs, MetricTile, Stat, Trend, TrendChart,
  administrationBands, bn, compact, electionLine, heroBackground, metricById, months, tierColor, useChronicle,
} from './worldKit';

export { Flag } from './worldKit';

/** Your nation's people, jobs, sectors and buildings. */
function Economy({ sim, name }: { sim: NationSim; name: string }) {
  const pc = sim.populationChange;
  const net = pc.births - pc.deaths + pc.migration;
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Label>The economy of {name}</Label>
        <span className="text-[11px]" style={{ color: T.faint }}>{sim.projected ? 'Starting point: the first month has not closed yet' : 'Updated each month'}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl p-3" style={{ background: T.raised }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>Population</div>
          <div className="font-serif text-xl font-bold" style={{ color: T.text }}>{compact(sim.population)}</div>
          <div className="text-[11px]" style={{ color: net >= 0 ? T.good : T.bad }}>{net >= 0 ? '+' : '−'}{compact(Math.abs(net))} last month</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: T.raised }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>Unemployment</div>
          <div className="font-serif text-xl font-bold" style={{ color: sim.unemployment > 0.08 ? T.bad : T.text }}>{pct(sim.unemployment, 1)}</div>
          <Trend value={sim.unemploymentTrend == null ? null : sim.unemploymentTrend * 100} suffix=" pts" lowerIsBetter />
        </div>
        <div className="rounded-xl p-3" style={{ background: T.raised }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>Output a year</div>
          <div className="font-serif text-xl font-bold" style={{ color: T.text }}>${compact(sim.gdpYearly)}</div>
          <Trend value={sim.gdpTrend == null ? null : sim.gdpTrend * 100} suffix="%" />
        </div>
        <div className="rounded-xl p-3" style={{ background: T.raised }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>Per person</div>
          <div className="font-serif text-xl font-bold" style={{ color: T.text }}>${compact(sim.gdpPerPerson)}</div>
          <div className="text-[11px]" style={{ color: T.faint }}>{compact(sim.labourForce)} in work or looking</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_90px_90px_110px] gap-2 text-[10px] uppercase tracking-wider pb-1" style={{ color: T.faint }}>
          <span>Sector</span><span className="text-right">Jobs</span><span className="text-right">Output</span><span className="text-right">Buildings</span>
        </div>
        <div className="space-y-2">
          {sim.sectors.map(sec => (
            <div key={sec.id}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_90px_90px_110px] gap-x-2 items-baseline text-sm">
                <span style={{ color: T.text }}>{sec.name}</span>
                <span className="text-right font-mono text-xs" style={{ color: T.dim }}>{compact(sec.jobs)}<span className="sm:hidden"> jobs · ${compact(sec.outputYearly)}</span></span>
                <span className="hidden sm:block text-right font-mono text-xs" style={{ color: T.dim }}>${compact(sec.outputYearly)}</span>
                <span className="hidden sm:block text-right font-mono text-xs" style={{ color: T.dim }}>{compact(sec.buildings)} {sec.buildingName}</span>
              </div>
              <div className="mt-1"><Meter value={sec.outputShare * 100} max={60} color="rgba(232,184,75,0.55)" height={4} /></div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[11px]" style={{ color: T.faint }}>
        Last month: {compact(pc.births)} born, {compact(pc.deaths)} died, {pc.migration >= 0 ? `${compact(pc.migration)} arrived` : `${compact(-pc.migration)} left`}.
        Jobs follow prosperity and the laws on tariffs, wages, company tax and interest rates; hiring takes months.
        Factories run by car companies add jobs here. The rating is for comparison only: it never moves votes.
      </p>
    </Card>
  );
}


/** The state's books, and (for the head of government or finance minister) the budget split. */
function Budget({ budget, gdp, name }: { budget: NationBudget; gdp: number; name: string }) {
  const { desk, act, busy } = useFloor();
  const me = desk.me;
  const finance = desk.cabinet.find(c => c.key === 'finance');
  const canEdit = !!me && (desk.premier?.characterId === me.characterId || finance?.characterId === me.characterId);
  const [draft, setDraft] = useState<Record<string, number>>(budget.split);
  useEffect(() => { setDraft(budget.split); }, [budget.split]);
  const used = Object.values(draft).reduce((a, b) => a + b, 0);
  const share = (x: number) => (gdp > 0 ? `${(x / gdp * 100).toFixed(1)}% of GDP` : '');
  const deficit = budget.deficit > 0;
  const setShare = (id: string, v: number) => {
    const others = Object.entries(draft).filter(([k]) => k !== id).reduce((a, [, x]) => a + x, 0);
    setDraft({ ...draft, [id]: Math.max(0, Math.min(v, 1 - others)) });
  };
  const maxLine = Math.max(...budget.lines.map(l => l.amount), 1);
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Label>The budget of {name}</Label>
        <span className="text-[11px]" style={{ color: T.faint }}>Yearly, at this month’s rate</span>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl p-3" style={{ background: T.raised }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>Money in</div>
          <div className="font-serif text-xl font-bold" style={{ color: T.text }}>{bn(budget.revenue)}</div>
          <div className="text-[11px]" style={{ color: T.faint }}>{budget.tariffs > 0 ? `incl. ${bn(budget.tariffs)} tariffs` : share(budget.revenue)}</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: T.raised }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>Money out</div>
          <div className="font-serif text-xl font-bold" style={{ color: T.text }}>{bn(budget.spending)}</div>
          <div className="text-[11px]" style={{ color: T.faint }}>{share(budget.spending)}</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: T.raised }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>{deficit ? 'Deficit' : 'Surplus'}</div>
          <div className="font-serif text-xl font-bold" style={{ color: deficit ? T.bad : T.good }}>{bn(Math.abs(budget.deficit))}</div>
          <div className="text-[11px]" style={{ color: T.faint }}>{share(Math.abs(budget.deficit))}</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: T.raised }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>Debt</div>
          <div className="font-serif text-xl font-bold" style={{ color: budget.debtRatio > 0.9 ? T.bad : T.text }}>{bn(budget.debt)}</div>
          <div className="text-[11px]" style={{ color: budget.debtRatio > 0.9 ? T.bad : T.faint }}>{pct(budget.debtRatio, 0)} of GDP{budget.debtRatio > 0.9 ? ' · hurting the economy' : ''}</div>
        </div>
      </div>
      {budget.funded < 1 && (
        <p className="mt-2 text-xs" style={{ color: T.bad }}>Debt is past the ceiling: lenders refuse, so programmes get only {pct(budget.funded, 0)} of their money.</p>
      )}

      <div className="mt-4 space-y-1.5">
        {budget.lines.filter(l => l.amount > 0).map(l => (
          <div key={`${l.kind}-${l.id}`} className="grid grid-cols-[minmax(0,1fr)_70px] sm:grid-cols-[180px_minmax(0,1fr)_70px] gap-2 items-center text-xs">
            <span style={{ color: l.kind === 'programme' ? T.text : T.dim }}>{l.name}</span>
            <div className="hidden sm:block"><Meter value={l.amount} max={maxLine} color={l.kind === 'programme' ? T.accent : l.kind === 'interest' ? T.bad : 'rgba(255,255,255,0.35)'} height={4} /></div>
            <span className="text-right font-mono" style={{ color: T.dim }}>{bn(l.amount)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${T.line}` }}>
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-semibold" style={{ color: T.text }}>Programmes · {bn(budget.discretionary)} a year to split</div>
          <span className="text-[11px]" style={{ color: T.faint }}>
            {budget.splitSource === 'player' ? `Set by ${budget.splitBy}` : `Decided by the ${budget.splitBy ?? 'government'}’s platform`}
          </span>
        </div>
        <div className="mt-2 space-y-3">
          {budget.programmes.map(p => (
            <div key={p.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span style={{ color: T.text }}>{p.name}</span>
                <span className="font-mono text-xs" style={{ color: T.dim }}>{Math.round((canEdit ? draft[p.id] ?? 0 : p.share) * 100)}%</span>
              </div>
              <div className="text-[11px]" style={{ color: T.faint }}>{p.blurb}</div>
              {canEdit
                ? <input type="range" min={0} max={100} step={1} aria-label={p.name} disabled={busy || budget.setThisMonth}
                    value={Math.round((draft[p.id] ?? 0) * 100)} onChange={e => setShare(p.id, Number(e.target.value) / 100)}
                    className="w-full mt-1" style={{ accentColor: T.accent }} />
                : <div className="mt-1"><Meter value={p.share * 100} color={T.accent} marker={25} height={5} /></div>}
            </div>
          ))}
        </div>
        {canEdit && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Btn small kind="primary" id="set-budget" disabled={busy || budget.setThisMonth}
              onClick={() => act(() => politicsApi.setBudget(draft), r => r.message)}>
              {budget.setThisMonth ? 'Set this month' : 'Set the budget'}
            </Btn>
            <span className="text-xs" style={{ color: T.dim }}>{used < 0.995 ? `${Math.round((1 - used) * 100)}% saved: cuts the deficit` : 'All spent'}</span>
          </div>
        )}
        <p className="mt-3 text-[11px]" style={{ color: T.faint }}>
          A quarter each is neutral. More for one programme means less for the others; saving cuts the deficit but weakens what goes unfunded.
          Laws decide the rest: tax laws set money in, welfare, health, schools and defence laws set what is committed.
          {canEdit ? ' One change a month; it takes effect when the month closes.' : ' The head of government or the finance minister sets the split.'}
        </p>
      </div>
    </Card>
  );
}

/** Trade with the other nations. */
function Trade({ trade, name }: { trade: NationTrade; name: string }) {
  const surplus = trade.balanceYearly >= 0;
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Label>{name} and the world</Label>
        <span className="text-[11px]" style={{ color: T.faint }}>Farm goods, factory goods and energy, yearly</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label={surplus ? 'Trade surplus' : 'Trade deficit'} value={bn(Math.abs(trade.balanceYearly))} bad={!surplus} />
        <Stat label="Tariff money" value={bn(trade.tariffRevenueYearly)} />
        <Stat label="Efficiency" value={`${trade.efficiency >= 1 ? '+' : '−'}${Math.abs((trade.efficiency - 1) * 100).toFixed(1)}%`} bad={trade.efficiency < 1} />
      </div>
      <div className="mt-4">
        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_80px_80px_60px_80px] gap-2 text-[10px] uppercase tracking-wider pb-1" style={{ color: T.faint }}>
          <span>Goods</span><span className="text-right">Exports</span><span className="text-right">Imports</span><span className="text-right">Tariff</span><span className="text-right">Jobs</span>
        </div>
        {trade.sectors.map(s => (
          <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_80px_80px_60px_80px] gap-x-2 gap-y-0.5 items-baseline text-sm py-1" style={{ borderTop: `1px solid ${T.line}` }}>
            <span style={{ color: T.text }}>{s.name}</span>
            <span className="sm:hidden text-right font-mono text-xs" style={{ color: T.dim }}>
              {s.exportsYearly > 0 ? `sells ${bn(s.exportsYearly)}` : s.importsYearly > 0 ? `buys ${bn(s.importsYearly)}` : 'self-sufficient'} · {pct(s.tariff, 0)} tariff
            </span>
            <span className="hidden sm:block text-right font-mono text-xs" style={{ color: s.exportsYearly > 0 ? T.good : T.faint }}>{s.exportsYearly > 0 ? bn(s.exportsYearly) : '—'}</span>
            <span className="hidden sm:block text-right font-mono text-xs" style={{ color: s.importsYearly > 0 ? T.text : T.faint }}>{s.importsYearly > 0 ? bn(s.importsYearly) : '—'}</span>
            <span className="hidden sm:block text-right font-mono text-xs" style={{ color: T.dim }}>{pct(s.tariff, 0)}</span>
            <span className="hidden sm:block text-right font-mono text-xs" style={{ color: Math.abs(s.jobsEffect) < 0.0005 ? T.faint : s.jobsEffect > 0 ? T.good : T.bad }}>
              {Math.abs(s.jobsEffect) < 0.0005 ? '—' : `${s.jobsEffect > 0 ? '+' : '−'}${Math.abs(s.jobsEffect * 100).toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: T.faint }}>
        Each nation uses its share of the world’s goods; what it lacks it buys from nations with spare. A higher tariff (the Trade Tariffs law)
        means fewer imports, more made at home and more tariff money, but dearer shopping, less efficient work, and lost sales for your suppliers.
        A tariff on goods you do not import does nothing. Jobs are measured against your founding tariffs.
      </p>
    </Card>
  );
}

function StateOfNation() {
  const { desk } = useFloor();
  const approval = desk.approval.live;
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <Label>State of {desk.nation.shortName}</Label>
        <span className="text-xs" style={{ color: T.faint }}>50 is normal</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="font-serif text-4xl font-bold" style={{ color: approval >= 50 ? T.good : T.bad }}>{Math.round(approval)}%</div>
        <div className="text-xs" style={{ color: T.dim }}>
          approve of the government.<br />
          {approval >= 50 ? 'Governing parties gain votes at the election.' : 'Governing parties lose votes at the election.'}
        </div>
      </div>
      <ApprovalWhy approval={desk.approval} />
      <div className="mt-4 space-y-2">
        {Object.entries(desk.stats).map(([k, v]) => {
          const good = statLowerIsBetter(k) ? v <= 50 : v >= 50;
          return (
            <div key={k} className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-xs" style={{ color: T.dim }}>{statName(k)}</div>
              <div className="flex-1"><Meter value={v} color={good ? T.good : T.bad} marker={50} height={5} /></div>
              <div className="w-7 text-right font-mono text-xs" style={{ color: T.text }}>{Math.round(v)}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** What makes this nation different to play. */
function HowItWorks() {
  const { desk } = useFloor();
  const mine = desk.desk.world.find(n => n.mine);
  if (!mine) return null;
  return (
    <Card className="p-4">
      <Label>How {mine.name} works</Label>
      {mine.culture && <p className="text-sm mt-2 italic" style={{ color: T.dim }}>{mine.culture}</p>}
      <ul className="mt-3 space-y-1.5">
        {mine.traits.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm" style={{ color: T.text }}><span style={{ color: T.accent }}>•</span><span>{t}</span></li>
        ))}
      </ul>
      <div className="mt-3 pt-3 text-xs" style={{ borderTop: `1px solid ${T.line}`, color: T.dim }}>
        <strong style={{ color: T.text }}>{mine.headOfState.title} {mine.headOfState.name}.</strong> {mine.headOfState.role}
      </div>
    </Card>
  );
}

/** What your office lets you do without asking Parliament. */
function Powers() {
  const { desk, act, busy } = useFloor();
  const office = desk.desk.office;
  const me = desk.me;
  if (!me) return null;
  if (!office) {
    return (
      <Card className="p-4">
        <Label>Powers of office</Label>
        <p className="text-sm mt-1" style={{ color: T.dim }}>
          The {leaderTitle(desk)} and the five ministers can act without Parliament: one decree a month each, felt across the whole nation.
          {me.party ? ` Lead the governing party to become ${leaderTitle(desk)}, or be named to the cabinet by one.` : ' Join a party to start the climb.'}
        </p>
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

/** The Premier names ministers from the players in the governing parties. */
function Cabinet() {
  const { desk, act, busy } = useFloor();
  const me = desk.me;
  const isPremier = !!me && desk.premier?.characterId === me.characterId;
  const eligible = me?.eligibleMinisters ?? [];
  const party = (id: string | null) => desk.parties.find(p => p.id === id);
  if (!desk.parliament.government) return null;
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Label>The cabinet</Label>
        {isPremier && <span className="text-[11px]" style={{ color: T.faint }}>You appoint. Players in governing parties can be named.</span>}
        {!isPremier && <span className="text-[11px]" style={{ color: T.faint }}>Appointed by the {leaderTitle(desk)}</span>}
      </div>
      <div className="mt-2 space-y-2">
        {desk.cabinet.filter(c => c.holderName).map(c => (
          <div key={c.key} className="flex flex-wrap items-center gap-2 text-sm">
            <PartyDot color={party(c.partyId)?.color ?? T.faint} />
            <span className="w-20 text-xs" style={{ color: T.faint }}>{c.short}</span>
            <span className="flex-1 min-w-0 truncate" style={{ color: T.text }}>{c.holderName}</span>
            {c.isPlayer && <Chip color={T.accent}>player</Chip>}
            {isPremier && eligible.length > 0 && (
              <select aria-label={`Appoint ${c.title}`} disabled={busy} value="" className="rounded-lg text-xs px-2 py-1"
                style={{ background: T.raised, color: T.text, border: `1px solid ${T.lineStrong}` }}
                onChange={e => { const v = e.target.value; if (v) act(() => politicsApi.appointMinister(c.key, v === 'npc' ? null : v), `${c.title} appointed.`); }}>
                <option value="">Appoint…</option>
                {eligible.map(m => <option key={m.id} value={m.id}>{m.name} (trust {m.credibility})</option>)}
                <option value="npc">A career official</option>
              </select>
            )}
          </div>
        ))}
      </div>
      {isPremier && eligible.length === 0 && <p className="text-[11px] mt-2" style={{ color: T.faint }}>No other players sit in the governing parties yet, so officials hold the posts.</p>}
    </Card>
  );
}

// ─── Foreign affairs ────────────────────────────────────────────────────────

const TREATY_INFO: Record<string, { name: string; blurb: string }> = {
  trade_pact: { name: 'Trade pact', blurb: 'No tariffs between you on farm goods, factory goods and energy. Their parliament must ratify it.' },
  defence_pact: { name: 'Defence pact', blurb: 'Both gain military strength and standing. Their parliament must ratify it.' },
  embargo: { name: 'Embargo', blurb: 'No trade at all, either way. Your own parliament must vote for it. Ends any pact.' },
};
const relationsWord = (s: number) => (s >= 75 ? 'Close allies' : s >= 60 ? 'Friendly' : s >= 40 ? 'Neutral' : s >= 25 ? 'Cool' : 'Hostile');

/** Relations with each nation, treaties in force or awaiting a vote, and (for the head of government) the levers. */
function Foreign({ foreign, name }: { foreign: NationForeign; name: string }) {
  const { desk, act, busy } = useFloor();
  const me = desk.me;
  const isHead = !!me && desk.premier?.characterId === me.characterId;
  const flagOf = (code: string) => desk.desk.world.find(n => n.polStateCode === code)?.flag;
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Label>Relations</Label>
        <span className="text-[11px]" style={{ color: T.faint }}>50 is neutral · drifts back over time</span>
      </div>
      <div className="mt-3 space-y-4">
        {foreign.relations.map(r => {
          const treaties = foreign.treaties.filter(t => t.with === r.code);
          const has = (k: string) => treaties.some(t => t.kind === k);
          const flag = flagOf(r.code);
          return (
            <div key={r.code} className="rounded-xl p-3" style={{ background: T.raised }}>
              <div className="flex items-center gap-3">
                {flag && <Flag flag={flag} width={34} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-sm" style={{ color: T.text }}>{r.name}</span>
                    <span className="text-xs" style={{ color: r.score >= 50 ? T.good : T.bad }}>{relationsWord(r.score)} · <span className="font-mono">{Math.round(r.score)}</span></span>
                  </div>
                  <div className="mt-1"><Meter value={r.score} color={r.score >= 50 ? T.good : T.bad} marker={50} height={5} /></div>
                </div>
              </div>
              {treaties.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {treaties.map(t => (
                    <span key={t.id} className="inline-flex items-center gap-2">
                      <Chip color={t.kind === 'embargo' ? T.bad : t.status === 'active' ? T.good : T.accent} filled={t.status === 'active'}>
                        {t.name}{t.status === 'proposed' ? ` · vote in ${t.awaitingVoteIn}` : t.kind === 'embargo' ? (t.imposedByUs ? ' · by us' : ' · on us') : ''}
                      </Chip>
                      {isHead && t.status === 'active' && (t.kind !== 'embargo' || t.imposedByUs) && (
                        <Btn small disabled={busy} id={`end-${t.id}`} onClick={() => act(() => politicsApi.withdrawTreaty(t.id), r2 => r2.message)}>
                          {t.kind === 'embargo' ? 'Lift' : 'Walk out'}
                        </Btn>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {isHead && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['trade_pact', 'defence_pact', 'embargo'] as const).filter(k => !has(k) && (k === 'embargo' || !has('embargo'))).map(k => (
                    <Btn key={k} small kind={k === 'embargo' ? undefined : 'primary'} disabled={busy} id={`propose-${k}-${r.code}`}
                      onClick={() => act(() => politicsApi.proposeTreaty(k, r.code), r2 => r2.message)}>
                      {k === 'embargo' ? 'Embargo' : `Offer ${TREATY_INFO[k].name.toLowerCase()}`}
                    </Btn>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 space-y-1">
        {Object.entries(TREATY_INFO).map(([k, v]) => (
          <p key={k} className="text-[11px]" style={{ color: T.faint }}><strong style={{ color: T.dim }}>{v.name}:</strong> {v.blurb}</p>
        ))}
        <p className="text-[11px]" style={{ color: T.faint }}>
          {isHead
            ? 'Proposing costs energy. Treaty votes appear in the Chamber like any bill. Walking out of a pact hurts relations badly.'
            : `Only ${name}’s head of government can offer or end treaties. Treaty votes appear in the Chamber like any bill.`}
        </p>
      </div>
    </Card>
  );
}

// ─── Charts and the government of the day ───────────────────────────────────

/** A chart card for one nation, with a choice of measure and shading for each administration. */
function NationChart({ history, ids, initial, title, nowArc }: { history: ChronicleNation | undefined; ids: string[]; initial: string; title: string; nowArc: number }) {
  const [metric, setMetric] = useState(initial);
  const m = metricById(metric);
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>{title}</Label>
          <div className="font-serif text-lg font-bold" style={{ color: T.text }}>{m.label}</div>
        </div>
        <MetricTabs value={metric} onChange={setMetric} ids={ids} />
      </div>
      <div className="mt-3">
        <TrendChart series={[{ key: 'v', name: history?.name ?? '', color: T.accent, points: history?.series ?? [] }]} metric={m}
          bands={history ? administrationBands(history.administrations, nowArc) : undefined} />
      </div>
      <p className="mt-2 text-[11px]" style={{ color: T.faint }}>Shaded bands show who governed: party colour for elected governments, grey for caretakers.</p>
    </Card>
  );
}

/** Who runs the country today. A caretaker government stands in while no government commands Parliament. */
function GovernmentOfTheDay({ history }: { history: ChronicleNation | undefined }) {
  const { desk } = useFloor();
  const mine = desk.desk.world.find(n => n.mine);
  const a = mine?.administration;
  if (!a) return null;
  const caretaker = a.kind === 'caretaker';
  const record = history?.current;
  const ch = record?.change;
  const changes = ch ? [
    { label: 'rating', value: ch.rating, digits: 1, suffix: '', lower: false },
    { label: 'GDP', value: ch.gdpGrowth == null ? null : ch.gdpGrowth * 100, digits: 1, suffix: '%', lower: false },
    { label: 'jobless', value: ch.unemployment == null ? null : ch.unemployment * 100, digits: 1, suffix: ' pts', lower: true },
    { label: 'approval', value: ch.approval, digits: 0, suffix: ' pts', lower: false },
  ].filter((c): c is { label: string; value: number; digits: number; suffix: string; lower: boolean } => c.value != null && Math.abs(c.value) >= 0.5 * 10 ** -c.digits) : [];
  return (
    <Card className="p-4" style={{ borderColor: caretaker ? CARETAKER_COLOR : a.partyColor ?? T.line }}>
      <Label color={caretaker ? CARETAKER_COLOR : T.accent}>{caretaker ? 'Caretaker government' : 'The government'}</Label>
      <div className="mt-2"><AdministrationBadge a={a} /></div>
      <p className="mt-3 text-sm" style={{ color: T.dim }}>
        {caretaker
          ? <>No government commands the {mine!.legislatureName} yet, so {a.headTitle} {a.headName}, the head of state, leads a caretaker government. It keeps the state running and hands over the moment a government forms. Bills already tabled are still voted on.</>
          : <>{a.headTitle} {a.headName} leads {a.partyName}{a.coalition.length ? ` in coalition with ${a.coalition.join(', ')}` : ''}. Governments are named after the one who leads them.</>}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="In office since" value={a.sinceArc != null ? formatPolArc(a.sinceArc, true) : 'this month'} />
        <Stat label="Time in office" value={record ? months(record.months) : '—'} />
        <Stat label="Laws passed" value={String(record?.laws.count ?? 0)} />
      </div>
      {changes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: T.faint }}>
          <span>Since taking office:</span>
          {changes.map(c => <span key={c.label}>{c.label} <Trend value={c.value} digits={c.digits} suffix={c.suffix} lowerIsBetter={c.lower} /></span>)}
        </div>
      )}
    </Card>
  );
}

// ─── Layout: one tab, short sections ────────────────────────────────────────

/** Set by go('nation:<section>') to open the tab at a section (read once on mount). */
export const NATION_SECTION_KEY = 'worldr_nation_section';
const LAST_SECTION_KEY = 'worldr_nation_last_section';
type Section = 'overview' | 'economy' | 'budget' | 'foreign' | 'government' | 'history';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'economy', label: 'Economy' },
  { id: 'budget', label: 'Budget' },
  { id: 'foreign', label: 'Foreign affairs' },
  { id: 'government', label: 'Government' },
  { id: 'history', label: 'History' },
];
const isSection = (v: string | null): v is Section => !!v && SECTIONS.some(s => s.id === v);

/** Pure read (safe to run twice, as React does in development); the request is cleared after mount. */
function initialSection(): Section {
  try {
    const asked = sessionStorage.getItem(NATION_SECTION_KEY);
    if (asked === 'standing') return 'overview'; // old link name
    if (isSection(asked)) return asked;
    const last = localStorage.getItem(LAST_SECTION_KEY);
    if (isSection(last)) return last;
  } catch { /* private mode */ }
  return 'overview';
}

export default function NationView() {
  const { desk, go } = useFloor();
  const mine = desk.desk.world.find(n => n.mine);
  const sim = mine?.sim ?? null;
  const { data: chronicle } = useChronicle();
  const history = chronicle?.nations.find(n => n.code === mine?.polStateCode);
  const nowArc = chronicle?.arc ?? desk.calendar.arc;
  // The tab only renders in the browser (after the desk loads), so reading storage up front is safe.
  const [section, setSection] = useState<Section>(initialSection);
  useEffect(() => { try { sessionStorage.removeItem(NATION_SECTION_KEY); } catch { /* private mode */ } }, []);
  const choose = (s: Section) => { setSection(s); try { localStorage.setItem(LAST_SECTION_KEY, s); } catch { /* private mode */ } };

  // A dot on a section that wants something from you.
  const me = desk.me;
  const isHead = !!me && desk.premier?.characterId === me.characterId;
  const isFinance = !!me && desk.cabinet.find(c => c.key === 'finance')?.characterId === me.characterId;
  const attention: Partial<Record<Section, boolean>> = {
    budget: !!sim && (isHead || isFinance) && !sim.budget.setThisMonth && sim.budget.splitSource === 'computer',
    foreign: !!sim && isHead && sim.foreign.treaties.some(t => t.status === 'proposed' && t.awaitingVoteIn === mine?.name),
    government: !!desk.desk.office && !desk.desk.office.usedThisMonth,
  };
  const cal = desk.calendar;
  const points = history?.series ?? [];

  return (
    <div className="space-y-4">
      {/* Hero: the flag, the government of the day, the standing and the next election. */}
      <div className="rounded-2xl p-5 sm:p-6" style={{ background: mine ? heroBackground(mine.flag) : T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex flex-wrap items-start gap-4">
          {mine && <Flag flag={mine.flag} width={84} />}
          <div className="min-w-[220px] flex-1">
            <h2 className="font-serif text-2xl sm:text-4xl font-bold leading-tight" style={{ color: T.text }}>{desk.nation.officialName}</h2>
            <p className="text-sm" style={{ color: T.dim }}>{desk.nation.government} · capital {desk.nation.capital}{desk.nation.motto ? ` · “${desk.nation.motto}”` : ''}</p>
          </div>
          {sim && (
            <button type="button" onClick={() => go('world')} className="text-right shrink-0 rounded-xl px-3 py-2" title="See the world ranking"
              style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${T.line}` }}>
              <div className="font-serif text-4xl font-bold leading-none" style={{ color: T.accent }}>{sim.rating.toFixed(1)}</div>
              <div className="text-[11px] mt-1" style={{ color: tierColor(sim.tier) }}>{sim.tier} · #{sim.rank} in the world</div>
              <div><Trend value={sim.ratingTrend} /></div>
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
          {mine?.administration && <AdministrationBadge a={mine.administration} />}
          <button type="button" onClick={() => choose('overview')} className="text-xs rounded-lg px-3 py-2 text-left flex items-center gap-2"
            style={{ background: cal.phase === 'formation' || cal.phase === 'polling' ? T.accentSoft : 'rgba(0,0,0,0.25)', border: `1px solid ${cal.phase === 'governing' ? T.line : T.accent}`, color: T.text }}>
            <span aria-hidden>🗳</span>{electionLine(mine?.election)}
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Nation sections" className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1" style={{ borderBottom: `1px solid ${T.line}` }}>
        {SECTIONS.map(s => (
          <button key={s.id} role="tab" aria-selected={section === s.id} id={`nation-${s.id}`} type="button" onClick={() => choose(s.id)}
            className="relative shrink-0 px-3 py-2 text-sm font-semibold rounded-t-lg"
            style={{ color: section === s.id ? T.text : T.faint, background: section === s.id ? T.raised : 'transparent', borderBottom: section === s.id ? `2px solid ${T.accent}` : '2px solid transparent' }}>
            {s.label}
            {attention[s.id] && <span aria-label="needs you" className="absolute top-1.5 right-1 inline-block rounded-full" style={{ width: 6, height: 6, background: T.accent }} />}
          </button>
        ))}
      </div>

      {section === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricTile metric={metricById('rating')} points={points} />
            <MetricTile metric={metricById('gdp')} points={points} />
            <MetricTile metric={metricById('jobless')} points={points} />
            <MetricTile metric={metricById('approval')} points={points} />
          </div>
          <ElectionTimeline phase={cal.phase} arc={cal.arc} filingArc={cal.filingArc} campaignArc={cal.campaignArc} electionArc={cal.electionArc}
            formationEndArc={cal.formationEndArc} monthsToElection={cal.monthsToElection} nation={desk.nation.shortName}
            nextEstimate={mine?.election?.phase === 'formation' ? mine.election.electionArc : null} />
          <NationChart history={history} nowArc={nowArc} title={`${desk.nation.shortName} over time`} initial="rating" ids={['rating', 'gdp', 'jobless', 'approval', 'perPerson', 'population', 'debt']} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start"><StateOfNation /><HowItWorks /></div>
        </div>
      )}

      {section === 'economy' && sim && (
        <div className="space-y-4">
          <NationChart history={history} nowArc={nowArc} title="The economy over time" initial="gdp" ids={['gdp', 'perPerson', 'jobless', 'population']} />
          <Economy sim={sim} name={mine!.name} />
        </div>
      )}

      {section === 'budget' && sim && (
        <div className="space-y-4">
          <Budget budget={sim.budget} gdp={sim.gdpYearly} name={mine!.name} />
          <NationChart history={history} nowArc={nowArc} title="The nation's debt" initial="debt" ids={['debt']} />
        </div>
      )}

      {section === 'foreign' && sim && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <Foreign foreign={sim.foreign} name={mine!.name} />
          <Trade trade={sim.trade} name={mine!.name} />
        </div>
      )}

      {section === 'government' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
          <div className="space-y-4"><GovernmentOfTheDay history={history} /><Powers /></div>
          <Cabinet />
        </div>
      )}

      {section === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start">
          <Card className="p-4">
            <div className="flex items-baseline justify-between gap-2">
              <Label>Administrations of {desk.nation.shortName}</Label>
              <span className="text-[11px]" style={{ color: T.faint }}>Who ruled, when, and what changed</span>
            </div>
            <p className="mt-1 mb-3 text-[11px]" style={{ color: T.faint }}>
              A government is named after its leader. When none commands Parliament, the head of state leads a caretaker government until one forms. Tap one to see what changed.
            </p>
            <AdministrationHistory list={history?.administrations ?? []} nation={desk.nation.shortName} />
          </Card>
          <NationChart history={history} nowArc={nowArc} title="The record" initial="rating" ids={['rating', 'gdp', 'jobless', 'approval', 'debt']} />
        </div>
      )}

      {!sim && (section === 'economy' || section === 'budget' || section === 'foreign') && (
        <Card className="p-4 text-sm"><span style={{ color: T.dim }}>The nation’s figures appear after the first month closes.</span></Card>
      )}
    </div>
  );
}
