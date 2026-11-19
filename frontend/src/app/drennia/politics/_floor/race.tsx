'use client';
// Your race: where you stand for Parliament, how it looks, and when filing is.
// Filing controls are always visible; outside filing they are locked and say why.
import React, { useMemo, useState } from 'react';
import { MapPin, Trophy, Users, Vote, Flag as FlagIcon, Megaphone, Landmark, Sparkles } from 'lucide-react';
import { politicsApi } from '@/lib/api';
import { formatPolArc } from '@/lib/calendar';
import type { Race, RaceDistrict } from './types';
import { Btn, Chip, LockedBtn, Sheet, T, pct, useFloor } from './kit';

const seatLine = (seats: number) => 1 / (Math.max(1, Math.round(seats)) + 1);
const TONE: Record<RaceDistrict['tone'], string> = { good: T.good, ok: T.good, warn: T.accent, bad: T.bad };

const STEPS = [
  { id: 'governing', label: 'Governing', icon: Landmark },
  { id: 'filing', label: 'Filing', icon: FlagIcon },
  { id: 'campaign', label: 'Campaign', icon: Megaphone },
  { id: 'polling', label: 'Election day', icon: Vote },
  { id: 'formation', label: 'Forming', icon: Users },
] as const;

/** Your party's share against the line that wins a seat. */
export function SeatGauge({ share, seats, color, height = 10, labels = true }: { share: number; seats: number; color: string; height?: number; labels?: boolean }) {
  const line = seatLine(seats);
  const max = Math.max(line * 2, share * 1.2, 0.05);
  const w = Math.min(100, (share / max) * 100);
  const l = (line / max) * 100;
  const over = share >= line;
  return (
    <div>
      <div className="relative w-full rounded-full overflow-hidden" style={{ height, background: 'rgba(255,255,255,0.07)' }}>
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: over ? `0 0 14px ${color}88` : undefined }} />
        <div className="absolute -inset-y-1 w-0.5" style={{ left: `${l}%`, background: T.text }} />
      </div>
      {labels && (
        <div className="relative mt-1 h-4 text-[10px] font-mono" style={{ color: T.faint }}>
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${Math.min(88, Math.max(12, l))}%` }}>{pct(line, 1)} wins a seat</span>
        </div>
      )}
    </div>
  );
}

function Stepper({ race }: { race: Race }) {
  const idx = STEPS.findIndex(s => s.id === race.phase);
  // After an overdue count the cycle's own dates are years old: show the stages without them.
  const old = !!race.arcs.stale;
  const when: Record<string, string> = {
    governing: '', filing: old ? 'done' : formatPolArc(race.arcs.filing, true), campaign: old ? 'done' : formatPolArc(race.arcs.campaign, true),
    polling: old ? 'done' : formatPolArc(race.arcs.polling, true), formation: `to ${formatPolArc(race.arcs.formationEnd, true)}`,
  };
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Election cycle">
      {STEPS.map((s, i) => {
        const now = i === idx, done = i < idx;
        const Icon = s.icon;
        return (
          <li key={s.id} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center rounded-full shrink-0" style={{ width: 22, height: 22, background: now ? T.accent : done ? 'rgba(232,184,75,0.18)' : 'rgba(255,255,255,0.06)', color: now ? '#17130A' : done ? T.accent : T.faint, boxShadow: now ? '0 0 16px rgba(232,184,75,0.6)' : undefined }}>
                <Icon size={12} strokeWidth={2.4} />
              </span>
              <span className="hidden sm:block h-px flex-1" style={{ background: done ? 'rgba(232,184,75,0.5)' : T.line }} />
            </div>
            <div className="mt-1 text-[11px] font-semibold truncate" style={{ color: now ? T.text : done ? T.dim : T.faint }}>{s.label}</div>
            <div className="text-[10px] font-mono truncate" style={{ color: now ? T.accent : T.faint }}>{now ? 'now' : when[s.id]}</div>
          </li>
        );
      })}
    </ol>
  );
}

/** The one button for standing: Stand / Change district when filing is open, otherwise locked with the reason. */
export function StandControl({ race, onOpen, small }: { race: Race | null | undefined; onOpen: () => void; small?: boolean }) {
  if (!race) return null;
  const label = race.myDistrictId ? 'Change district' : 'Stand for election';
  if (race.window.open) return <Btn kind="primary" small={small} onClick={onOpen} id="stand-open">{label}</Btn>;
  return <LockedBtn kind="primary" small={small} reason={race.window.lockReason ?? 'Filing is closed.'} id="stand-open">{label}</LockedBtn>;
}

/** What to do now, in one sentence. */
function nextStep(race: Race, hasParty: boolean, my: RaceDistrict | null, rec: RaceDistrict | null): string {
  if (!hasParty) return 'Join or found a party: every candidate stands for one. Then pick the district you will fight.';
  switch (race.phase) {
    case 'governing':
      return my
        ? `You stand in ${my.name}${race.drafted ? ', the best open district your party had for you' : ''}. You can change district during filing, from ${formatPolArc(race.arcs.filing, false)}. Until then, build Trust and your party's support.`
        : `Filing opens in ${formatPolArc(race.arcs.filing, false)}. If you have not picked a district when the month turns, your party puts you up in your best open one (you can still change it during filing).`;
    case 'filing':
      return my
        ? `You stand in ${my.name}. You can switch until the campaign starts in ${formatPolArc(race.arcs.campaign, false)}.`
        : `Filing is open until ${formatPolArc(race.arcs.campaign, false)}. Pick your district${rec ? `: ${rec.name} is your best chance` : ''}. If you do not, your party picks for you.`;
    case 'campaign':
      return my
        ? `Campaign in ${my.name}: rallies and ads raise your party's support, and your own Trust counts here. Votes are counted in ${formatPolArc(race.arcs.polling, false)}.`
        : 'Filing has closed. Your party puts you up in your best open district when the month turns.';
    case 'polling':
      return 'Election day. The votes are counted when this month turns.';
    default:
      return `The votes are in and a government is forming.${hasParty && !my ? ' Once it takes office, your party puts you up in your best open district for the next election automatically; you can change it during filing.' : ''}${race.arcs.nextFiling != null ? ` Filing for the next election opens about ${formatPolArc(race.arcs.nextFiling, false)}.` : ''}`;
  }
}

/** The Desk's headline panel: your district, your chance, and the election calendar. */
export function RaceHero() {
  const { desk, go } = useFloor();
  const me = desk.me!;
  const race = desk.desk.race;
  const [picking, setPicking] = useState(false);
  if (!race) return null;
  const color = me.party?.color ?? T.accent;
  const my = race.districts.find(d => d.id === race.myDistrictId) ?? null;
  const rec = race.districts.find(d => d.recommended) ?? null;
  const show = my ?? (race.phase === 'filing' || race.phase === 'governing' ? rec : null);
  return (
    <section id="race-hero" className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
      style={{
        background: `radial-gradient(120% 140% at 100% 0%, ${color}38 0%, transparent 52%), radial-gradient(80% 120% at 0% 100%, rgba(232,184,75,0.10) 0%, transparent 60%), repeating-linear-gradient(135deg, rgba(255,255,255,0.018) 0 2px, transparent 2px 14px), linear-gradient(180deg, #191D28 0%, ${T.surface} 100%)`,
        border: `1px solid ${color}55`, boxShadow: `0 30px 70px -40px ${color}88, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: T.accent }}>Your race</span>
            {race.drafted && <Chip color={T.accent}>chosen by your party</Chip>}
            {!my && show && <Chip color={T.accent}><Sparkles size={11} /> recommended</Chip>}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <MapPin size={22} style={{ color }} aria-hidden />
            <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-none" style={{ color: T.text }}>{my ? my.name : me.party ? (show ? show.name : 'No district yet') : 'Not standing'}</h2>
          </div>
          <div className="mt-1.5 text-sm" style={{ color: T.dim }}>
            {show ? <>{show.region ? `${show.region} · ` : ''}{show.seats} seats · your party holds {show.sitting} · {my ? 'you stand here' : 'not chosen yet'}</> : 'Every seat in Parliament is won in a district.'}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {me.party
            ? <StandControl race={race} onOpen={() => setPicking(true)} />
            : <Btn kind="primary" onClick={() => go('party')} id="race-party">Choose a party</Btn>}
          {me.party && <Btn onClick={() => setPicking(true)} id="race-districts">All districts</Btn>}
        </div>
      </div>

      {show && me.party && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 items-end">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wider" style={{ color: T.faint }}>{me.party.name} in today&apos;s poll</span>
              <span className="text-xs font-semibold" style={{ color: TONE[show.tone] }}>{show.chance}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-serif text-4xl font-bold" style={{ color: T.text }}>{pct(show.partyShare, 1)}</span>
              <span className="text-xs" style={{ color: T.dim }}>projected {show.projectedSeats} of {show.seats} seats</span>
            </div>
            <div className="mt-2"><SeatGauge share={show.partyShare} seats={show.seats} color={color} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat icon={<Trophy size={14} />} label="Rank" value={`#${show.rank}`} sub={`of ${race.districts.length}`} />
            <MiniStat icon={<Users size={14} />} label="Your Trust" value={String(me.credibility)} sub="counts here" />
            <MiniStat icon={<Vote size={14} />} label="Votes in" value={race.arcs.stale ? 'Counted' : formatPolArc(race.arcs.polling, true)} sub={race.phase === 'formation' ? 'counted' : `${Math.max(0, race.arcs.polling - desk.calendar.arc)} mo`} />
          </div>
        </div>
      )}

      <div className="mt-5"><Stepper race={race} /></div>
      <p className="mt-3 text-sm" style={{ color: T.dim }}>{nextStep(race, !!me.party, my, rec)}</p>
      {picking && <DistrictPicker race={race} onClose={() => setPicking(false)} />}
    </section>
  );
}

function MiniStat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${T.line}` }}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>{icon}{label}</div>
      <div className="font-serif text-base sm:text-lg font-bold leading-tight whitespace-nowrap" style={{ color: T.text }}>{value}</div>
      <div className="text-[10px]" style={{ color: T.faint }}>{sub}</div>
    </div>
  );
}

/** Every district, best first, with your party's chance in each. */
export function DistrictPicker({ race, onClose }: { race: Race; onClose: () => void }) {
  const { desk, act, busy } = useFloor();
  const color = desk.me?.party?.color ?? T.accent;
  const regions = useMemo(() => [...new Set(race.districts.map(d => d.region).filter(Boolean) as string[])].sort(), [race.districts]);
  const [region, setRegion] = useState<string | null>(null);
  const list = race.districts.filter(d => !region || d.region === region);
  const stand = (d: RaceDistrict) => act(() => politicsApi.declareCandidacy(d.id), r => r?.message ?? `You stand in ${d.name}.`).then(ok => ok && onClose());
  return (
    <Sheet full kicker={race.window.open ? 'Filing is open' : 'Filing is closed'} title="Choose your district" onClose={onClose}>
      <p className="text-sm -mt-2 mb-4 max-w-3xl" style={{ color: T.dim }}>
        Seats in each district are shared by vote share. The white line is the share that wins one seat; beat it and your party takes a seat there.
        Your own Trust ({desk.me?.credibility}) counts in your district instead of the party&apos;s 50. Lose it and you can still be seated from your party&apos;s list.
        {!race.window.open && race.window.lockReason ? ` ${race.window.lockReason}` : ''}
      </p>
      {regions.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[null, ...regions].map(r => (
            <button key={r ?? 'all'} type="button" onClick={() => setRegion(r)} className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: region === r ? T.accentSoft : 'transparent', color: region === r ? T.accent : T.dim, border: `1px solid ${region === r ? T.accent : T.line}` }}>
              {r ?? 'All regions'}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {list.map(d => {
          const ring = d.mine ? color : d.recommended ? T.accent : T.line;
          return (
            <div key={d.id} id={`district-${d.id.slice(0, 8)}`} className="relative rounded-2xl p-4 flex flex-col"
              style={{ background: d.mine ? `linear-gradient(180deg, ${color}22, ${T.surface})` : T.surface, border: `1px solid ${ring}`, boxShadow: d.recommended || d.mine ? `0 18px 40px -26px ${ring}` : undefined, opacity: d.takenBy ? 0.6 : 1 }}>
              {d.recommended && !d.mine && <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: T.accent, color: '#17130A' }}><Sparkles size={10} /> Best for you</span>}
              <div className="flex items-start gap-3">
                <span className="font-serif text-2xl font-bold leading-none w-8 shrink-0" style={{ color: d.rank <= 3 ? T.accent : T.faint }}>{d.rank}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-tight truncate" style={{ color: T.text }}>{d.name}</div>
                  <div className="text-[11px]" style={{ color: T.faint }}>{d.region ? `${d.region} · ` : ''}{d.seats} seats · you hold {d.sitting}</div>
                </div>
                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: TONE[d.tone] }}>{d.chance}</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between text-xs">
                <span style={{ color: T.dim }}>Party poll <strong className="font-mono" style={{ color: T.text }}>{pct(d.partyShare, 1)}</strong></span>
                <span className="font-mono" style={{ color: T.faint }}>~{d.projectedSeats} seat{d.projectedSeats === 1 ? '' : 's'}</span>
              </div>
              <div className="mt-1.5"><SeatGauge share={d.partyShare} seats={d.seats} color={color} height={7} labels={false} /></div>
              <div className="mt-3 pt-3 flex items-center justify-between gap-2" style={{ borderTop: `1px solid ${T.line}` }}>
                <span className="text-[11px]" style={{ color: d.mine ? color : d.takenBy ? T.dim : T.faint }}>
                  {d.mine ? 'You stand here' : d.takenBy ? `${d.takenBy} stands here` : `${pct(seatLine(d.seats), 1)} wins a seat`}
                </span>
                {d.mine ? <Chip color={color}>yours</Chip>
                  : d.takenBy ? <LockedBtn small reason={`${d.takenBy} already stands in ${d.name} for your party. Pick another district, or talk to them in the Corridors.`}>Taken</LockedBtn>
                  : race.window.open ? <Btn small kind={d.recommended ? 'primary' : 'ghost'} disabled={busy} onClick={() => stand(d)} id={`stand-${d.name.replace(/\s+/g, '-')}`}>{race.myDistrictId ? 'Move here' : 'Stand here'}</Btn>
                  : <LockedBtn small reason={race.window.lockReason ?? 'Filing is closed.'}>{race.myDistrictId ? 'Move here' : 'Stand here'}</LockedBtn>}
              </div>
            </div>
          );
        })}
      </div>
      {list.length === 0 && <p className="text-sm" style={{ color: T.dim }}>Districts appear after the nation&apos;s first election.</p>}
    </Sheet>
  );
}
