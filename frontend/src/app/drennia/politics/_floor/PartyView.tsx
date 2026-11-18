'use client';
// Party: join one, found one, stand for election, or take it over.
import React, { useState } from 'react';
import { politicsApi } from '@/lib/api';
import { CREEDS, CREED_ORDER, CreedId } from '../_lib/model';
import { Btn, Card, Chip, Label, Meter, PartyDot, Sheet, T, leaderTitle, money, useFloor, convictionFit } from './kit';
import type { MemberWork } from './types';

const COLORS = ['#D9625A', '#E8B84B', '#4FB286', '#4C9BD9', '#9B7FE0', '#E07FB0', '#5FC7C2', '#C9C2B2'];

function FoundSheet({ onClose }: { onClose: () => void }) {
  const { desk, act, busy } = useFloor();
  const [name, setName] = useState('');
  const [abbr, setAbbr] = useState('');
  const [creed, setCreed] = useState<CreedId>('the_compact');
  const [color, setColor] = useState(COLORS[3]);
  const cost = desk.desk.rules.partyFoundingCost;
  const cash = desk.me?.cash ?? 0;
  const valid = name.trim().length >= 3 && abbr.trim().length >= 2 && abbr.trim().length <= 6;
  const field = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none';
  return (
    <Sheet title="Found a party" onClose={onClose} wide>
      <p className="text-sm mb-4" style={{ color: T.dim }}>
        You lead it from day one. It starts with no seats: build support, then win them at the next election
        (in {desk.calendar.monthsToElection} month{desk.calendar.monthsToElection === 1 ? '' : 's'}). Costs {money(cost)} of your own money.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
        <input id="found-name" className={field} style={{ background: T.surface, border: `1px solid ${T.lineStrong}`, color: T.text }} placeholder="Party name" maxLength={60} value={name} onChange={e => setName(e.target.value)} />
        <input id="found-abbr" className={field} style={{ background: T.surface, border: `1px solid ${T.lineStrong}`, color: T.text }} placeholder="Initials" maxLength={6} value={abbr} onChange={e => setAbbr(e.target.value.toUpperCase())} />
      </div>
      <div className="mt-3"><Label>What it stands for</Label></div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {CREED_ORDER.map(id => (
          <button key={id} type="button" onClick={() => setCreed(id)} className="text-left rounded-xl p-2.5"
            style={{ background: T.surface, border: `1px solid ${creed === id ? T.accent : T.line}` }}>
            <div className="text-sm font-semibold" style={{ color: T.text }}>{CREEDS[id].name}</div>
            <div className="text-[11px]" style={{ color: T.faint }}>{CREEDS[id].tagline}</div>
          </button>
        ))}
      </div>
      <p className="text-xs mt-2" style={{ color: T.dim }}>{CREEDS[creed].blurb}</p>
      <div className="mt-3 flex items-center gap-2">
        <Label>Colour</Label>
        {COLORS.map(c => (
          <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setColor(c)} className="rounded-full" style={{ width: 22, height: 22, background: c, outline: color === c ? `2px solid ${T.text}` : 'none', outlineOffset: 2 }} />
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Btn kind="primary" id="found-submit" disabled={busy || !valid || cash < cost}
          onClick={() => act(() => politicsApi.foundParty({ name: name.trim(), abbreviation: abbr.trim(), doctrine_id: creed, tenet_id: null, colorHex: color }), `${name.trim()} is founded.`).then(ok => ok && onClose())}>
          Found the party · {money(cost)}
        </Btn>
        {cash < cost && <span className="text-xs" style={{ color: T.bad }}>You have {money(cash)}.</span>}
      </div>
    </Sheet>
  );
}

function PartyList() {
  const { desk, act, busy } = useFloor();
  const [founding, setFounding] = useState(false);
  const wait = desk.desk.partyRoom?.cooldownLeft ?? 0;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: T.text }}>Choose your party</h2>
        <p className="text-sm mt-1" style={{ color: T.dim }}>
          Join one and you take one of its seats at once. You can vote with it or against it, win it voters, and one day lead it.
          {wait > 0 && <span style={{ color: T.bad }}> You changed party recently: you can join another in {wait} month{wait === 1 ? '' : 's'}.</span>}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {desk.parties.map(p => {
          const sup = desk.desk.support[p.id] ?? {};
          const top = [...desk.desk.segments].sort((a, b) => (sup[b.key] ?? 0) - (sup[a.key] ?? 0))[0];
          const fit = convictionFit(desk.me?.convictions, p.platform as any);
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="rounded-lg flex items-center justify-center font-bold text-xs shrink-0" style={{ width: 40, height: 40, background: p.color, color: '#0C0E13' }}>{p.abbreviation.slice(0, 3)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-serif text-lg font-bold leading-tight" style={{ color: T.text }}>{p.name}</div>
                    {fit != null && <Chip color={fit >= 80 ? T.good : fit >= 65 ? T.accent : T.faint} title="How close this party is to what you said you believe when you signed up">{fit}% your views</Chip>}
                  </div>
                  <div className="text-xs" style={{ color: T.faint }}>
                    {p.seats} seats · {p.leadsGovernment ? 'leads the government' : p.inGovernment ? 'in government' : 'opposition'} · led by {p.leaderName ?? 'the party machine'}
                  </div>
                </div>
              </div>
              {p.motto && <p className="text-xs italic mt-2" style={{ color: T.dim }}>“{p.motto}”</p>}
              <div className="text-xs mt-2" style={{ color: T.dim }}>Strongest with {top?.label.toLowerCase()} ({Math.round(sup[top?.key ?? ''] ?? 0)}).</div>
              <div className="mt-3">
                <Btn small kind="primary" disabled={busy || wait > 0} id={`join-${p.abbreviation}`}
                  onClick={() => act(() => politicsApi.joinParty(p.id), r => r?.seatedIn ? `Welcome. You now sit for ${r.seatedIn}.` : `You have joined ${p.name}.`)}>
                  Join{p.seats > 0 ? ' and take a seat' : ''}
                </Btn>
              </div>
            </Card>
          );
        })}
        <Card className="p-4" tone="accent">
          <Label color={T.accent}>Or go your own way</Label>
          <div className="font-serif text-lg font-bold mt-1" style={{ color: T.text }}>Found a new party</div>
          <p className="text-xs mt-1" style={{ color: T.dim }}>Full control from day one, no seats until you win them. {money(desk.desk.rules.partyFoundingCost)}.</p>
          <div className="mt-3"><Btn small onClick={() => setFounding(true)} id="found-open">Found a party</Btn></div>
        </Card>
      </div>
      {founding && <FoundSheet onClose={() => setFounding(false)} />}
    </div>
  );
}

function StandSheet({ onClose }: { onClose: () => void }) {
  const { desk, act, busy } = useFloor();
  const taken = new Set(desk.desk.partyRoom?.districtsTaken ?? []);
  const mine = desk.me!.party!.id;
  return (
    <Sheet title="Stand for election" onClose={onClose} wide>
      <p className="text-sm mb-3" style={{ color: T.dim }}>
        Pick the district you will fight in person. Your own trust with voters ({desk.me?.credibility}) counts there instead of the party's average of 50,
        so stand where your party is already strong. If you lose it, you can still be seated from the party list.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {desk.districts.map(d => (
          <button key={d.id} type="button" disabled={busy || taken.has(d.id)} id={`stand-${d.name.replace(/\s+/g, '-')}`}
            onClick={() => act(() => politicsApi.declareCandidacy(d.id), `You are standing in ${d.name}.`).then(ok => ok && onClose())}
            className="text-left rounded-xl p-3 disabled:opacity-40" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="text-sm font-semibold" style={{ color: T.text }}>{d.name}</div>
            <div className="text-[11px]" style={{ color: T.faint }}>
              {taken.has(d.id) ? 'A colleague is standing here' : `${d.seats} seats · your party holds ${d.sitting[mine] ?? 0}`}
            </div>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** One member's work for the party this month, in a line. */
function WorkLine({ w }: { w: MemberWork }) {
  const bits = [
    w.rallies ? `${w.rallies} rall${w.rallies === 1 ? 'y' : 'ies'}` : null,
    w.ads ? `${w.ads} ad${w.ads === 1 ? '' : 's'}` : null,
    w.fundraisers ? `raised ${money(w.raised)}` : null,
    w.deals ? `${w.deals} deal${w.deals === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  return <div className="text-[11px] mt-0.5" style={{ color: bits.length ? T.dim : T.faint }}>{bits.length ? bits.join(' · ') : 'nothing yet this month'}</div>;
}

/** A leadership contest: who stands, who has voted, the running score and your ballot. */
function ContestCard() {
  const { desk, act, busy } = useFloor();
  const me = desk.me!;
  const c = desk.desk.partyRoom!.contest!;
  const open = c.status === 'open';
  const standing = c.standing;
  const total = standing ? Math.max(1, standing.challenger + standing.leader) : 1;
  const iStand = me.characterId === c.challenger.id || me.characterId === c.leader.id;
  const monthsLeft = Math.max(0, c.closesArc - desk.calendar.arc);
  const Side = ({ who, side }: { who: { name: string; clout: number }; side: 'challenger' | 'leader' }) => {
    const votes = c.ballots.filter(b => b.side === side);
    return (
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider" style={{ color: T.faint }}>{side === 'leader' ? 'Leader' : 'Challenger'}</div>
        <div className="font-serif text-lg font-bold truncate" style={{ color: T.text }}>{who.name}</div>
        <div className="text-xs" style={{ color: T.dim }}>clout {who.clout}{side === 'leader' ? ` + ${c.rules.incumbency} for holding the job` : ''}</div>
        <div className="text-xs mt-1" style={{ color: T.dim }}>
          {votes.length ? votes.map(v => `${v.name}${v.mp ? ' (MP)' : ''}`).join(', ') : 'no ballots yet'}
        </div>
      </div>
    );
  };
  return (
    <Card className="p-4" tone={open ? 'accent' : undefined}>
      <div className="flex items-baseline justify-between gap-2">
        <Label color={open ? T.accent : T.faint}>{open ? 'Leadership contest' : 'Last leadership contest'}</Label>
        {open
          ? <Chip color={T.accent}>{monthsLeft <= 0 ? 'decided when this month ends' : `decided when next month ends`}</Chip>
          : <Chip color={c.status === 'won' ? T.good : T.dim}>{c.status === 'won' ? `${c.challenger.name} won` : c.status === 'lost' ? `${c.leader.name} held on` : 'called off'}</Chip>}
      </div>
      <div className="grid grid-cols-2 gap-4 mt-3">
        <Side who={c.challenger} side="challenger" />
        <Side who={c.leader} side="leader" />
      </div>
      {standing && (
        <div className="mt-3">
          <div className="flex h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div style={{ width: `${(standing.challenger / total) * 100}%`, background: T.bad }} />
            <div style={{ width: `${(standing.leader / total) * 100}%`, background: T.good }} />
          </div>
          <div className="flex justify-between text-xs mt-1 font-mono" style={{ color: T.dim }}>
            <span>{Math.round(standing.challenger)}</span>
            <span>{open ? (standing.winner === 'leader' ? 'the leader would hold on today' : 'the challenger would win today') : 'final'}</span>
            <span>{Math.round(standing.leader)}</span>
          </div>
        </div>
      )}
      {open && (
        <>
          <p className="text-[11px] mt-3" style={{ color: T.faint }}>
            Each member's ballot counts {c.rules.ballotWeight}, an MP's {c.rules.ballotWeight * c.rules.mpMult}. Ties go to the leader. You can change your ballot until the count.
          </p>
          {!iStand ? (
            <div className="flex flex-wrap gap-2 mt-2">
              <Btn small kind={c.myBallot === 'challenger' ? 'primary' : 'ghost'} disabled={busy} id="ballot-challenger"
                onClick={() => act(() => politicsApi.voteInContest('challenger'), r => r.message)}>Back {c.challenger.name}</Btn>
              <Btn small kind={c.myBallot === 'leader' ? 'primary' : 'ghost'} disabled={busy} id="ballot-leader"
                onClick={() => act(() => politicsApi.voteInContest('leader'), r => r.message)}>Back {c.leader.name}</Btn>
            </div>
          ) : (
            <p className="text-xs mt-2" style={{ color: T.dim }}>You are standing: win members over in the party room and in Corridors.</p>
          )}
        </>
      )}
    </Card>
  );
}

function MyParty() {
  const { desk, act, busy } = useFloor();
  const [standing, setStanding] = useState(false);
  const me = desk.me!;
  const party = desk.parties.find(p => p.id === me.party!.id)!;
  const room = desk.desk.partyRoom!;
  const sup = desk.desk.support[party.id] ?? {};
  const tgt = desk.desk.supportTargets[party.id] ?? {};
  const rules = desk.desk.rules;
  const waiting = (room.challengeWaitMonths ?? 0) > 0;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
      <div className="space-y-4 min-w-0">
        <div className="flex items-center gap-3">
          <span className="rounded-xl flex items-center justify-center font-bold shrink-0" style={{ width: 52, height: 52, background: party.color, color: '#0C0E13' }}>{party.abbreviation.slice(0, 3)}</span>
          <div className="min-w-0">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight" style={{ color: T.text }}>{party.name}</h2>
            <div className="text-sm" style={{ color: T.dim }}>
              {party.seats} seats · {party.leadsGovernment ? 'leads the government' : party.inGovernment ? 'in government' : 'opposition'} · funds {money(room.funds ?? 0)}
            </div>
          </div>
        </div>

        <Card className="p-4">
          <Label>Your place in it</Label>
          <div className="mt-2 text-sm" style={{ color: T.text }}>
            {me.isPartyLeader ? 'You lead this party. When you vote, all its seats vote with you, and only you can promise its favours.' :
              me.hasSeat ? `You sit for ${me.seatDistrict ?? 'the party'}. Your vote is your own.` : 'You are a member without a seat. Win one at the next election.'}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {room.canStand && <Btn small kind="primary" onClick={() => setStanding(true)} id="stand-open">Stand for election</Btn>}
            {me.candidacyDistrict && <Chip color={T.accent}>Standing in {me.candidacyDistrict}</Chip>}
            {!me.isPartyLeader && (
              <Btn small disabled={busy} id="leave-party"
                onClick={() => { if (window.confirm('Leave the party? Your seat stays with the party, and you cannot join another for a while.')) act(() => politicsApi.leaveParty(party.id), 'You have left the party.'); }}>
                Leave the party
              </Btn>
            )}
          </div>
        </Card>

        {room.contest && (room.contest.status === 'open' || room.contest.closesArc >= desk.calendar.arc - 1) && <ContestCard />}

        {room.canChallenge && (
          <Card className="p-4">
            <Label>Leadership</Label>
            <p className="text-sm mt-1" style={{ color: T.dim }}>
              {room.leaderIsHuman
                ? `${room.leaderName} leads the party. With ${room.challengeNeed} clout and six months in the party you can force a leadership contest: ${room.leaderName} is told, and the party's members vote before next month ends. You have ${me.influence}.`
                : `Nobody leads the party: the machine runs it by its ideology. To take over you need ${room.challengeNeed} clout and six months in the party. You have ${me.influence}.`}
              {party.leadsGovernment && ` Whoever leads this party is ${leaderTitle(desk)}.`}
            </p>
            <div className="mt-2"><Meter value={me.influence} max={Math.max(room.challengeNeed ?? 1, me.influence)} color={room.challengeWouldWin ? T.good : T.accent} /></div>
            <div className="mt-3 flex items-center gap-3">
              <Btn small kind={room.challengeWouldWin && !waiting ? 'primary' : 'ghost'} disabled={busy || waiting || me.ap.current < rules.leadershipAp || room.contest?.status === 'open'} id="challenge"
                onClick={() => act(() => politicsApi.challengeLeadership(), r => r.message)}>
                {room.leaderIsHuman ? 'Force a leadership contest' : 'Challenge for the leadership'} · {rules.leadershipAp} energy
              </Btn>
              <span className="text-xs" style={{ color: T.faint }}>
                {room.contest?.status === 'open' ? 'A contest is already under way.'
                  : waiting ? `You can challenge in ${room.challengeWaitMonths} month${room.challengeWaitMonths === 1 ? '' : 's'}.`
                  : room.leaderIsHuman ? (room.challengeWouldWin ? 'You can force a contest. Line up your members first.' : 'Not enough clout to force a contest yet.')
                  : room.challengeWouldWin ? 'You would win.' : 'You would lose, and lose clout with it.'}
              </span>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <Label>Players in the party</Label>
            <span className="text-[11px]" style={{ color: T.faint }}>this month's work for the party</span>
          </div>
          <div className="mt-2 space-y-2">
            {(room.members ?? []).map(m => (
              <div key={m.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate" style={{ color: m.isMe ? T.text : T.dim, fontWeight: m.isMe ? 700 : 400 }}>{m.name}{m.isMe ? ' (you)' : ''}</span>
                  {m.role === 'leader' && <Chip color={T.accent}>leader</Chip>}
                  {m.hasSeat && <Chip>MP</Chip>}
                  <span className="font-mono text-xs w-20 text-right" style={{ color: T.faint }}>clout {m.clout}</span>
                </div>
                {m.thisMonth && <WorkLine w={m.thisMonth} />}
              </div>
            ))}
            <div className="text-[11px]" style={{ color: T.faint }}>The party's other {Math.max(0, party.seats - (room.members ?? []).filter(m => m.hasSeat).length)} seats are held by computer-run MPs who follow the party line.</div>
          </div>
        </Card>
      </div>
      <aside className="space-y-4">
        <Card className="p-4">
          <Label>Where the party stands</Label>
          <div className="mt-3 space-y-2.5">
            {desk.desk.segments.map(s => (
              <div key={s.key}>
                <div className="flex justify-between text-xs"><span style={{ color: T.dim }}>{s.label}</span><span className="font-mono" style={{ color: T.text }}>{Math.round(sup[s.key] ?? 0)}</span></div>
                <div className="mt-1"><Meter value={sup[s.key] ?? 0} color={party.color} marker={tgt[s.key]} /></div>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-3" style={{ color: T.faint }}>The thin line is the party's natural level, set by how well its platform fits each group. Support drifts back toward it.</p>
        </Card>
        {desk.desk.log.length > 0 && (
          <Card className="p-4">
            <Label>Your record</Label>
            <div className="mt-2 space-y-1">
              {desk.desk.log.map((l, i) => <div key={i} className="text-xs" style={{ color: T.dim }}>{l.summary}</div>)}
            </div>
          </Card>
        )}
      </aside>
      {standing && <StandSheet onClose={() => setStanding(false)} />}
    </div>
  );
}

export default function PartyView() {
  const { desk } = useFloor();
  if (!desk.me) return <Card className="p-6"><span className="text-sm" style={{ color: T.dim }}>Create your character to enter politics.</span></Card>;
  return desk.me.party ? <MyParty /> : <PartyList />;
}
