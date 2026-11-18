'use client';
// Nation: your country among the others, how it is doing, and the powers of office.
import React from 'react';
import { politicsApi } from '@/lib/api';
import type { NationRow, NationSim } from './types';
import { Btn, Card, Chip, EffectChips, Label, Meter, PartyDot, T, leaderTitle, pct, signed, statLowerIsBetter, statName, useFloor } from './kit';

/** A small flag drawn from the nation's recipe (pattern + colours). */
export function Flag({ flag, width = 44 }: { flag: NationRow['flag']; width?: number }) {
  const h = Math.round(width * 0.62);
  const c = flag.colors;
  return (
    <svg width={width} height={h} viewBox="0 0 100 62" role="img" aria-label="Flag" style={{ borderRadius: 4, flexShrink: 0, boxShadow: '0 0 0 1px rgba(255,255,255,0.15)' }}>
      {flag.pattern === 'tricolor-horizontal' && c.slice(0, 3).map((col, i) => <rect key={i} x="0" y={i * 62 / 3} width="100" height={62 / 3 + 0.5} fill={col} />)}
      {flag.pattern === 'tricolor-vertical' && c.slice(0, 3).map((col, i) => <rect key={i} x={i * 100 / 3} y="0" width={100 / 3 + 0.5} height="62" fill={col} />)}
      {flag.pattern === 'cross' && (<><rect width="100" height="62" fill={c[0]} /><rect x="30" y="0" width="12" height="62" fill={c[1]} /><rect x="0" y="25" width="100" height="12" fill={c[1]} /></>)}
      {flag.pattern === 'hoist-triangle-band' && (<><rect width="100" height="62" fill={c[0]} /><rect x="0" y="25" width="100" height="12" fill={c[1]} /><polygon points="0,0 38,31 0,62" fill={c[2] ?? c[1]} /></>)}
      {flag.emblem !== 'none' && flag.pattern !== 'cross' && <circle cx={flag.pattern === 'hoist-triangle-band' ? 13 : 50} cy="31" r="6" fill={flag.emblemColor} />}
    </svg>
  );
}

function PowerBar({ label, value, best }: { label: string; value: number; best: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[11px]" style={{ color: T.faint }}>{label}</span>
      <div className="flex-1"><Meter value={value} color={best ? T.accent : 'rgba(255,255,255,0.35)'} height={5} /></div>
      <span className="w-6 text-right font-mono text-xs" style={{ color: best ? T.text : T.dim }}>{value}</span>
    </div>
  );
}

/** Big numbers, short: 10.4M, $346B, 1,240. */
function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${(n / 1e9).toFixed(a >= 1e11 ? 0 : 1)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(0)}k`;
  return Math.round(n).toLocaleString();
}

const TIER_COLOR: Record<string, string> = {
  'Superpower': '#E8B84B', 'Great power': '#C9A2F0', 'Regional power': '#6FB7E8', 'Middle power': '#A3A4AC', 'Minor state': '#6E707A',
};
const tierColor = (t: string) => TIER_COLOR[t] ?? T.dim;

function Trend({ value, digits = 1, suffix = '', lowerIsBetter = false }: { value: number | null; digits?: number; suffix?: string; lowerIsBetter?: boolean }) {
  // Hide changes that would print as zero at this precision.
  if (value == null || Math.abs(value) < 0.5 * 10 ** -digits) return null;
  const good = lowerIsBetter ? value < 0 : value > 0;
  return <span className="text-[11px] font-mono" style={{ color: good ? T.good : T.bad }}>{value > 0 ? '▲' : '▼'} {signed(value, digits)}{suffix}</span>;
}

function World() {
  const { desk } = useFloor();
  const score = (n: NationRow) => n.sim?.rating ?? n.power.overall;
  const nations = [...desk.desk.world].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  const best = (id: string) => Math.max(...nations.map(n => n.sim?.pillars.find(p => p.id === id)?.value ?? 0));
  const bestPower = (k: 'economy' | 'military' | 'influence') => Math.max(...nations.map(n => n.power[k]));
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {nations.map((n, i) => (
        <Card key={n.countryId} className="p-4" tone={n.mine ? 'accent' : undefined}>
          <div className="flex items-start gap-3">
            <Flag flag={n.flag} />
            <div className="min-w-0 flex-1">
              <div className="font-serif text-lg font-bold leading-tight truncate" style={{ color: T.text }}>{n.name}</div>
              <div className="text-[11px] truncate" style={{ color: T.faint }}>{n.government} · {n.legislatureName}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-serif text-2xl font-bold leading-none" style={{ color: i === 0 ? T.accent : T.text }}>{n.sim ? n.sim.rating.toFixed(1) : n.power.overall}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>{n.sim ? `#${n.sim.rank} · of 100` : 'power'}</div>
            </div>
          </div>
          {n.sim ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <Chip color={tierColor(n.sim.tier)} filled>{n.sim.tier}</Chip>
                <Trend value={n.sim.ratingTrend} />
              </div>
              <div className="mt-3 space-y-1.5">
                {n.sim.pillars.map(p => <PowerBar key={p.id} label={p.name} value={Math.round(p.value)} best={p.value === best(p.id)} />)}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="People" value={compact(n.sim.population)} />
                <Stat label="Jobless" value={pct(n.sim.unemployment, 1)} bad={n.sim.unemployment > 0.08} />
                <Stat label="GDP / yr" value={`$${compact(n.sim.gdpYearly)}`} />
              </div>
            </>
          ) : (
            <div className="mt-3 space-y-1.5">
              <PowerBar label="Economy" value={n.power.economy} best={n.power.economy === bestPower('economy')} />
              <PowerBar label="Military" value={n.power.military} best={n.power.military === bestPower('military')} />
              <PowerBar label="Influence" value={n.power.influence} best={n.power.influence === bestPower('influence')} />
            </div>
          )}
          <div className="mt-3 pt-3 text-xs space-y-1" style={{ borderTop: `1px solid ${T.line}`, color: T.dim }}>
            <div className="flex items-center gap-1.5">
              {n.leadParty && <PartyDot color={n.leadParty.color} />}
              <span className="truncate">{n.premier ? <>{n.leaderTitle} <strong style={{ color: T.text }}>{n.premier}</strong></> : 'No government yet'}</span>
              {n.premierIsPlayer && <Chip color={T.accent}>player</Chip>}
            </div>
            <div>{n.leadParty ? `${n.leadParty.name} government, ${n.governmentSeats} of ${n.seats} seats` : 'Parliament not yet elected'}</div>
            <div className="flex justify-between">
              <span>Approval <strong style={{ color: n.approval >= 50 ? T.good : T.bad }}>{Math.round(n.approval)}%</strong></span>
              {n.monthsToElection != null && <span>Election in {n.monthsToElection} mo</span>}
            </div>
            <div className="flex items-center gap-2">
              <span>Players</span>
              <span className="inline-flex gap-[3px]">{Array.from({ length: n.cap }, (_, k) => <span key={k} className="inline-block rounded-full" style={{ width: 7, height: 7, background: k < n.players ? T.accent : 'rgba(255,255,255,0.14)' }} />)}</span>
              <span className="font-mono">{n.players}/{n.cap}</span>
              {n.mine && <Chip color={T.accent} filled>yours</Chip>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-lg py-1.5" style={{ background: T.raised }}>
      <div className="font-mono text-sm" style={{ color: bad ? T.bad : T.text }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>{label}</div>
    </div>
  );
}

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

export default function NationView() {
  const { desk } = useFloor();
  const mine = desk.desk.world.find(n => n.mine);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        {mine && <Flag flag={mine.flag} width={72} />}
        <div className="min-w-0">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight" style={{ color: T.text }}>{desk.nation.officialName}</h2>
          <p className="text-sm" style={{ color: T.dim }}>{desk.nation.government} · capital {desk.nation.capital}{desk.nation.motto ? ` · “${desk.nation.motto}”` : ''}</p>
        </div>
      </div>
      <div>
        <Label>World ranking</Label>
        <p className="text-xs mt-1 mb-3" style={{ color: T.faint }}>
          The world ranking, out of 100. Three very different countries that start on level terms: each is ahead somewhere and behind somewhere else. What they become, from Minor state to Superpower, is decided by those who govern them. Military strength follows the defence law.
        </p>
        <World />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="space-y-4 min-w-0">
          {mine?.sim && <Economy sim={mine.sim} name={mine.name} />}
          <Powers />
          <Cabinet />
        </div>
        <aside className="space-y-4"><HowItWorks /><StateOfNation /></aside>
      </div>
    </div>
  );
}
