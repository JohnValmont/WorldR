'use client';
// Nation: your country among the others, how it is doing, and the powers of office.
import React from 'react';
import { politicsApi } from '@/lib/api';
import type { NationRow } from './types';
import { Btn, Card, Chip, EffectChips, Label, Meter, PartyDot, T, statLowerIsBetter, statName, useFloor } from './kit';

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

function World() {
  const { desk } = useFloor();
  const nations = [...desk.desk.world].sort((a, b) => b.power.overall - a.power.overall || a.name.localeCompare(b.name));
  const best = (k: 'economy' | 'military' | 'influence') => Math.max(...nations.map(n => n.power[k]));
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {nations.map((n, i) => (
        <Card key={n.countryId} className="p-4" tone={n.mine ? 'accent' : undefined}>
          <div className="flex items-start gap-3">
            <Flag flag={n.flag} />
            <div className="min-w-0 flex-1">
              <div className="font-serif text-lg font-bold leading-tight truncate" style={{ color: T.text }}>{n.name}</div>
              <div className="text-[11px] truncate" style={{ color: T.faint }}>{n.officialName}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-serif text-2xl font-bold leading-none" style={{ color: i === 0 ? T.accent : T.text }}>{n.power.overall}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>power</div>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <PowerBar label="Economy" value={n.power.economy} best={n.power.economy === best('economy')} />
            <PowerBar label="Military" value={n.power.military} best={n.power.military === best('military')} />
            <PowerBar label="Influence" value={n.power.influence} best={n.power.influence === best('influence')} />
          </div>
          <div className="mt-3 pt-3 text-xs space-y-1" style={{ borderTop: `1px solid ${T.line}`, color: T.dim }}>
            <div className="flex items-center gap-1.5">
              {n.leadParty && <PartyDot color={n.leadParty.color} />}
              <span className="truncate">{n.premier ? <>Premier <strong style={{ color: T.text }}>{n.premier}</strong></> : 'No government yet'}</span>
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
          The Premier and the five ministers can act without Parliament: one decree a month each, felt across the whole nation.
          {me.party ? ' Lead the governing party to become Premier, or be named to the cabinet by one.' : ' Join a party to start the climb.'}
        </p>
      </Card>
    );
  }
  const isPremier = office.titles.includes('premier');
  const ap = me.ap.current;
  return (
    <Card className="p-4" tone="accent">
      <div className="flex items-baseline justify-between gap-2">
        <Label color={T.accent}>{isPremier ? 'Premier’s office' : 'Your ministry'}</Label>
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
        <Label>The three nations</Label>
        <p className="text-xs mt-1 mb-3" style={{ color: T.faint }}>
          All three began equal: the same people, wealth and laws. What they become is decided by those who govern them. Military strength follows the defence law.
        </p>
        <World />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="space-y-4 min-w-0">
          <Powers />
          <Cabinet />
        </div>
        <aside className="space-y-4"><StateOfNation /></aside>
      </div>
    </div>
  );
}
