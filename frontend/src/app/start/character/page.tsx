'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Factors { Credibility: number; Charisma: number; Influence: number; Cash: number; }

interface ChoiceOption {
  id: string;
  title: string;
  story: string;
  perception: string;
  chips: string[];
  effects: Partial<Factors>;
  cash?: number;
  obligation?: string;
  vulnerability?: string;
  tag?: string;
}

// ─── Scene Data ───────────────────────────────────────────────────────────────

const STATES: ChoiceOption[] = [
  {
    id: 'Drennport State',
    title: 'Drennport State',
    story: 'You grew up near ministries, universities, royal ceremonies, finance houses, and national media.',
    perception: 'People see you as someone familiar with the language of institutions.',
    chips: ['Civic familiarity', 'Institutional world', 'Public record culture'],
    effects: { Credibility: 1 },
    tag: 'civic',
  },
  {
    id: 'Ironvale State',
    title: 'Ironvale State',
    story: 'You grew up around factories, unions, industrial towns, and families who understood work before politics.',
    perception: 'People see you as grounded, direct, and not easily impressed by ceremony.',
    chips: ['Labour familiarity', 'Working-town instinct', 'Union adjacent'],
    effects: { Charisma: 1 },
    tag: 'labour',
  },
  {
    id: 'Greenmere State',
    title: 'Greenmere State',
    story: 'You grew up among farms, local councils, religious communities, and families where reputation travelled fast.',
    perception: 'People see you as someone with deep community roots and local trust.',
    chips: ['Community familiarity', 'Rural trust', 'Close network loyalty'],
    effects: { Credibility: 1 },
    tag: 'community',
  },
  {
    id: 'Westport State',
    title: 'Westport State',
    story: 'You grew up near ports, exporters, banks, traders, and people who measured ambition in deals.',
    perception: 'People see you as commercially aware and comfortable with money and risk.',
    chips: ['Business familiarity', 'Trade networks', 'Port economy instinct'],
    effects: { Influence: 1 },
    tag: 'commercial',
  },
];

const HOUSEHOLDS: ChoiceOption[] = [
  {
    id: 'Struggling Household',
    title: 'Struggling Household',
    story: 'Money was counted carefully. You learned that dignity and survival are not always the same thing.',
    perception: 'People may later see your ambition as shaped by personal scarcity.',
    chips: ['Family pressure', 'Survival instinct', 'Self-reliance'],
    effects: { Charisma: 1 },
    tag: 'struggle',
  },
  {
    id: 'Stable Middle-Class Household',
    title: 'Stable Middle-Class',
    story: 'Your home was not powerful, but it was steady. Expectations were clear, and failure was quietly feared.',
    perception: 'People see you as someone with respectable — if unspectacular — origins.',
    chips: ['Stable upbringing', 'Respectability', 'Cautious risk profile'],
    effects: { Credibility: 1 },
    tag: 'stable',
  },
  {
    id: 'Business Household',
    title: 'Business Household',
    story: 'Trade, profit, and risk were normal conversation. You learned that money can open doors before speeches do.',
    perception: 'People may see you as commercially connected — or commercially obligated.',
    chips: ['Business expectation', 'Commercial network seed', 'Corporate adjacent'],
    effects: { Influence: 1 },
    tag: 'business',
  },
  {
    id: 'Civil Service Household',
    title: 'Civil Service Household',
    story: 'Rules, offices, exams, procedure, and caution shaped the rhythm of your home.',
    perception: 'People may see you as someone who understands the state from the inside.',
    chips: ['Institutional familiarity', 'Insider reputation risk', 'Procedural thinking'],
    effects: { Credibility: 1 },
    tag: 'civil_service',
  },
  {
    id: 'Military Household',
    title: 'Military Household',
    story: 'Discipline, hierarchy, service, and reputation were treated as family values.',
    perception: 'People may see you as rigid, reliable, or tied to the security establishment.',
    chips: ['Security familiarity', 'Rigid public image', 'Hierarchy instinct'],
    effects: { Credibility: 1 },
    tag: 'military',
  },
  {
    id: 'Political Household',
    title: 'Political Household',
    story: 'Politics was not distant. Names, favors, elections, and loyalty were part of dinner-table conversation.',
    perception: 'People may see you as privileged — or suspect you of carrying old debts.',
    chips: ['Political family network', 'Nepotism risk', 'Party adjacent'],
    effects: { Influence: 1 },
    tag: 'political',
  },
];

const CHILDHOOD_MARKS: ChoiceOption[] = [
  {
    id: 'Top Student',
    title: 'Top Student',
    story: 'You were known for marks, discipline, and being called when adults needed a responsible example.',
    perception: 'People remember you as serious and capable from a young age.',
    chips: ['Academic reputation', 'Trusted by institutions', 'High expectation burden'],
    effects: { Credibility: 2 },
    tag: 'academic',
  },
  {
    id: 'Debate Voice',
    title: 'Debate Voice',
    story: 'You learned that a room can shift when someone speaks with timing and nerve.',
    perception: 'People remember you as someone who could always find the argument.',
    chips: ['Speaking reputation', 'Persuasion instinct', 'Public voice seed'],
    effects: { Charisma: 2 },
    tag: 'speaker',
  },
  {
    id: 'Community Helper',
    title: 'Community Helper',
    story: 'You became useful before you became famous. People remembered you because you showed up.',
    perception: 'People see you as genuinely trustworthy — not just socially skilled.',
    chips: ['Community goodwill', 'Volunteer reputation', 'Grassroots network'],
    effects: { Credibility: 1, Charisma: 1 },
    tag: 'helper',
  },
  {
    id: 'Quiet Survivor',
    title: 'Quiet Survivor',
    story: 'You were not always noticed, but you watched carefully and learned how to endure.',
    perception: 'People may underestimate you — which is occasionally useful.',
    chips: ['Resilience', 'Low visibility', 'Observation instinct'],
    effects: { Credibility: 1, },
    tag: 'survivor',
  },
  {
    id: 'Young Hustler',
    title: 'Young Hustler',
    story: 'You found small ways to earn, trade, arrange, and survive before others understood money.',
    perception: 'People see you as resourceful — or as someone who bends rules when needed.',
    chips: ['Street commerce', 'Risk appetite', 'Informal network'],
    effects: { Influence: 1 },
    tag: 'hustler',
  },
  {
    id: 'Cadet / Discipline Track',
    title: 'Cadet / Discipline Track',
    story: 'You entered structured youth programs where order, uniform, and rank mattered.',
    perception: 'People see you as disciplined and connected to the security world.',
    chips: ['Security familiarity', 'Rank instinct', 'Structured background'],
    effects: { Credibility: 1, Influence: 1 },
    tag: 'cadet',
  },
  {
    id: 'Local Organizer',
    title: 'Local Organizer',
    story: 'You were the one who gathered people, settled disputes, and convinced others to move.',
    perception: 'People see you as a natural coordinator — with the obligations that brings.',
    chips: ['Organizer seed', 'Community trust', 'Leadership expectation'],
    effects: { Charisma: 1, Influence: 1 },
    tag: 'organizer',
  },
];

const NPC_CONTACTS: ChoiceOption[] = [
  {
    id: 'Fen Arras Jr.',
    title: 'Fen Arras Jr.',
    story: 'Operator at Saltgate Counting House. He notices young talent and trades in access before money.',
    perception: 'People will know you have a foot in Westport docks and commerce.',
    chips: ['Business contact', 'Westport access', 'Commercial obligation'],
    effects: { Influence: 1 },
    obligation: 'Owe a favor to Fen Arras Jr.',
    tag: 'trade',
  },
  {
    id: 'Mara Velden',
    title: 'Mara Velden',
    story: 'A teacher or early mentor who noticed your effort before anyone with power did. She told you to aim further.',
    perception: 'People will see you as someone who earned early support through merit.',
    chips: ['Academic validation', 'Credibility foundation', 'Educator network'],
    effects: { Credibility: 1 },
    tag: 'teacher',
  },
  {
    id: 'Junior Finance Clerk',
    title: 'Junior Finance Clerk',
    story: 'A clerk at the Drennport Credit House who occasionally passes you information others pay for.',
    perception: 'People see you as someone who understands the inside of financial institutions.',
    chips: ['Finance contact', 'Institutional network', 'Credit access'],
    effects: { Influence: 1 },
    tag: 'finance',
  },
  {
    id: 'Sera Duvall',
    title: 'Sera Duvall',
    story: 'Union Organizer in Ironvale. She introduced you to rooms where workers spoke honestly about power.',
    perception: 'People in labour circles will know your name. Business circles will note it cautiously.',
    chips: ['Labour network tie', 'Working-class credibility', 'Business suspicion risk'],
    effects: { Charisma: 1 },
    tag: 'union',
  },
  {
    id: 'Director Kovath',
    title: 'Director Kovath',
    story: 'Owner of the Ironvale Industrial Plant. He saw ambition and offered help that was never completely free.',
    perception: 'People will wonder what Kovath got in return. They will not be wrong to wonder.',
    chips: ['Commercial backing', 'Business obligation', 'Corporate expectation'],
    effects: { Influence: 1 },
    obligation: 'Business expectation from Director Kovath',
    tag: 'director',
  },
  {
    id: 'Ysella Murn',
    title: 'Ysella Murn',
    story: 'Director of the Greenmere Agricultural Co-op. She manages the market and watches who builds trust.',
    perception: 'People in the local community economy will trust you because she does.',
    chips: ['Community commerce', 'Local business trust', 'Agriculture network'],
    effects: { Credibility: 1 },
    tag: 'coop',
  },
  {
    id: 'Elder Corvan Ashfell',
    title: 'Corvan Ashfell',
    story: 'He carries trust in places where official titles matter less than memory and reputation.',
    perception: 'People in your community will see you as blessed by a respected name.',
    chips: ['Community expectation', 'Faith network', 'Local moral authority'],
    effects: { Credibility: 1 },
    tag: 'elder',
  },
];

const BURDENS: ChoiceOption[] = [
  {
    id: 'Family Debt',
    title: 'Family Debt',
    story: 'Money owed by others still shaped your choices before you had a choice of your own.',
    perception: 'People who know may see it as character-building. Or as a liability.',
    chips: ['Money pressure', 'Family debt', 'Financial vulnerability'],
    effects: { Credibility: 1 },
    obligation: 'Family financial debt',
    vulnerability: 'Money pressure visible to adversaries',
    tag: 'debt',
  },
  {
    id: 'Sick Parent / Family Care',
    title: 'Family Care',
    story: 'Responsibility entered your life through care, not ambition. You became an adult through necessity.',
    perception: 'People who know may see you as unusually self-sufficient — or as someone who sacrificed.',
    chips: ['Family care', 'High personal expense risk', 'Empathy reputation'],
    effects: { Credibility: 1 },
    obligation: 'Ongoing family care responsibility',
    tag: 'care',
  },
  {
    id: 'Public Embarrassment',
    title: 'Public Embarrassment',
    story: 'Something went wrong publicly enough that people remembered it. It taught you how fast stories travel.',
    perception: 'People who know may bring it up. It also gave you a kind of resilience others lack.',
    chips: ['Image risk', 'Comeback story', 'Public memory vulnerability'],
    effects: { Charisma: 1 },
    vulnerability: 'Public embarrassment on record',
    tag: 'embarrassment',
  },
  {
    id: 'Scholarship Pressure',
    title: 'Scholarship Pressure',
    story: 'Every opportunity felt conditional. Every result felt like a referendum on whether you deserved it.',
    perception: 'People see you as driven. Some will ask why you always seem to need to prove something.',
    chips: ['Academic pressure', 'Conditional access', 'High-performance expectation'],
    effects: { Credibility: 1 },
    tag: 'scholarship',
  },
  {
    id: 'No Major Burden',
    title: 'No Major Burden',
    story: 'You entered adulthood with fewer visible burdens. That too shaped how you see others who carry more.',
    perception: 'People will not see obvious vulnerabilities. That does not mean none exist.',
    chips: ['Stable start', 'Limited early hardship', 'Unproven resilience'],
    effects: { },
    tag: 'clean',
  },
];

const AMBITIONS: ChoiceOption[] = [
  {
    id: 'To Build Something of My Own',
    title: 'Build Something of My Own',
    story: 'You want an institution, company, or movement that answers to you — not inherited.',
    perception: 'People will see a builder. They will wait to see what gets built — and what gets broken.',
    chips: ['Builder leaning', 'Enterprise drive', 'Independence priority'],
    effects: { Influence: 1 },
    tag: 'builder',
  },
  {
    id: 'To Never Be Poor Again',
    title: 'To Never Be Poor Again',
    story: 'You want money not for luxury first, but for control over your own life.',
    perception: 'People will see someone motivated. They may also see hunger that is hard to hide.',
    chips: ['Wealth drive', 'Survival instinct', 'Financial security priority'],
    effects: {},
    tag: 'wealth',
  },
  {
    id: 'To Be Respected',
    title: 'To Be Respected',
    story: 'You want people to believe you can carry responsibility. Not fame — trust.',
    perception: 'People will see someone careful about reputation above all else.',
    chips: ['Public trust leaning', 'Credibility-first strategy', 'Conservative image'],
    effects: { Credibility: 1 },
    tag: 'respect',
  },
  {
    id: 'To Know Powerful People',
    title: 'To Know Powerful People',
    story: 'You understand that doors open faster when the right names know yours.',
    perception: 'People will see a careful networker — or an opportunist, depending on who they are.',
    chips: ['Network power leaning', 'Influence-first strategy', 'Access driven'],
    effects: { Influence: 1 },
    tag: 'network',
  },
  {
    id: 'To Be Heard',
    title: 'To Be Heard',
    story: 'You want your voice to matter in rooms that usually ignore people like you.',
    perception: 'People will see someone who keeps finding a microphone.',
    chips: ['Public voice leaning', 'Platform seeking', 'Charisma-first strategy'],
    effects: { Charisma: 1 },
    tag: 'voice',
  },
  {
    id: 'To Change the Country',
    title: 'Change the Country',
    story: 'You are drawn to the machinery of Drennia itself. Something in it needs fixing and you believe you can help fix it.',
    perception: 'People will see idealism. Some will appreciate it. Others will try to use it.',
    chips: ['Civic reform leaning', 'Civic drive', 'Idealist profile'],
    effects: { Credibility: 1 },
    tag: 'reform',
  },
];

// ─── Helper functions ─────────────────────────────────────────────────────────

interface Choices {
  homeState: string;
  household: string;
  childhoodMark: string;
  npcContact: string;
  earlyBurden: string;
  firstAmbition: string;
}

function calcFactors(choices: Choices): Factors {
  let f: Factors = { Credibility: 0, Charisma: 0, Influence: 0, Cash: 0 };
  const apply = (opts: ChoiceOption[], val?: string) => {
    if (!val) return;
    const found = opts.find(o => o.id === val);
    if (found) {
      for (const [k, v] of Object.entries(found.effects || {})) {
        f[k as keyof Factors] += (v as number);
      }
      if (found.cash) f.Cash += found.cash;
    }
  };
  apply(STATES,          choices.homeState);
  apply(HOUSEHOLDS,      choices.household);
  apply(CHILDHOOD_MARKS, choices.childhoodMark);
  apply(NPC_CONTACTS,    choices.npcContact);
  apply(BURDENS,         choices.earlyBurden);
  apply(AMBITIONS,       choices.firstAmbition);
  return f;
}

function getChronicleFragments(choices: Choices, firstName: string): string[] {
  const name = firstName || 'The citizen';
  const frags: string[] = [];

  frags.push(`${name}'s file begins in Drennia, age 18, under the shadow of Drennport's record halls.`);

  if (choices.homeState) {
    const stateStory: Record<string, string> = {
      'Drennport State': `Raised in Drennport State, ${name} grew up close to politics, offices, and the language of national ambition.`,
      'Ironvale State':  `Raised in Ironvale State, ${name} grew up around factories, unions, and people for whom work was identity.`,
      'Greenmere State': `Raised in Greenmere State, ${name} grew up in a world of community obligation and close-held reputation.`,
      'Westport State':  `Raised in Westport State, ${name} grew up around trade, ports, and people who spoke in deals.`,
    };
    frags.push(stateStory[choices.homeState] || '');
  }
  if (choices.household) {
    const hhStory: Record<string, string> = {
      'Struggling Household':         `The household taught that dignity and survival are not always the same lesson.`,
      'Stable Middle-Class Household': `The household was steady, if not powerful. Expectations mattered more than ambition.`,
      'Business Household':            `The household spoke of money as language, leverage, and expectation.`,
      'Civil Service Household':       `The household ran on rules, procedure, and the quiet weight of the state.`,
      'Military Household':            `The household treated discipline and reputation as inherited values.`,
      'Political Household':           `The household treated politics as normal life. Names and favours were familiar currency.`,
    };
    frags.push(hhStory[choices.household] || '');
  }
  if (choices.childhoodMark) {
    const markStory: Record<string, string> = {
      'Top Student':              `Before adult life, ${name} was known for discipline, marks, and being called when responsible examples were needed.`,
      'Debate Voice':             `Before adult life, ${name} learned that a room can shift when someone speaks with timing and nerve.`,
      'Community Helper':         `Before adult life, ${name} became useful before becoming well known. People remembered because ${name} showed up.`,
      'Quiet Survivor':           `Before adult life, ${name} watched carefully and endured. Not always noticed — which had its own value.`,
      'Young Hustler':            `Before adult life, ${name} found angles others missed and understood money before most understood the rules.`,
      'Cadet / Discipline Track': `Before adult life, ${name} entered structured programs where rank and order shaped the world.`,
      'Local Organizer':          `Before adult life, ${name} was already gathering people and settling what others left unresolved.`,
    };
    frags.push(markStory[choices.childhoodMark] || '');
  }
  if (choices.npcContact) {
    const contact = NPC_CONTACTS.find(c => c.id === choices.npcContact);
    if (contact) {
      const cStory: Record<string, string> = {
        'Teacher Mentor':   `${contact.title} noticed ${name}'s effort before anyone with power did. A first door, quietly opened.`,
        'Local Councillor': `${contact.title} showed ${name} that local politics is where larger careers begin.`,
        'Business Patron':  `${contact.title} extended help that carried its own expectations. ${name} understood the terms.`,
        'Union Organizer':  `${contact.title} introduced ${name} to rooms where workers spoke honestly about power.`,
        'Journalist Contact': `${contact.title} taught ${name} that stories travel faster than facts.`,
        'Military Officer': `${contact.title} opened a door into circles where discipline was the only currency accepted.`,
        'Community Elder':  `${contact.title} vouched for ${name} in places where trust matters more than title.`,
      };
      frags.push(cStory[choices.npcContact] || '');
    }
  }
  if (choices.earlyBurden) {
    const bStory: Record<string, string> = {
      'Family Debt':              `Entering adulthood, ${name} carries family debt — an obligation that shapes every decision about money.`,
      'Sick Parent / Family Care': `Entering adulthood, ${name} carries the weight of family care — responsibility arrived before ambition.`,
      'Public Embarrassment':     `Entering adulthood, ${name} carries the memory of a public stumble — and the resilience it built.`,
      'Scholarship Pressure':     `Entering adulthood, ${name} carries the pressure of conditional access — every opportunity feels borrowed.`,
      'No Major Burden':          `Entering adulthood, ${name} carries fewer obvious burdens — and fewer easy explanations for what drives them.`,
    };
    frags.push(bStory[choices.earlyBurden] || '');
  }
  if (choices.firstAmbition) {
    const aStory: Record<string, string> = {
      'To Be Respected':             `${name} wants, above all, to be taken seriously. Not famous — trusted.`,
      'To Be Heard':                 `${name} wants to reach rooms that usually ignore people like them.`,
      'To Know Powerful People':     `${name} understands that the right introduction can change a career before it starts.`,
      'To Never Be Poor Again':      `${name} wants control over their own life, beginning with money.`,
      'To Build Something of My Own': `${name} wants an institution or enterprise that answers only to them.`,
      'To Change the Country':       `${name} is drawn to Drennia's machinery. Something needs fixing. They believe they can help.`,
    };
    frags.push(aStory[choices.firstAmbition] || '');
  }
  return frags.filter(Boolean);
}

function generateSummary(choices: Choices, firstName: string): string {
  const name = firstName || 'This citizen';
  const contactObj = NPC_CONTACTS.find(c => c.id === choices.npcContact);
  const contactName = contactObj?.title || 'an early contact';
  const state = choices.homeState ? choices.homeState.replace(' State', '') : 'Drennia';
  const hh = choices.household ? choices.household.replace(' Household', '').toLowerCase() : 'household';
  const cashPhrase = '₯1,000,000 in starting capital';
  const ambition = choices.firstAmbition ? choices.firstAmbition.toLowerCase() : 'find a path forward';

  return `Raised in ${state} in a ${hh} household, ${name} enters adulthood with ${cashPhrase}, a first contact in ${contactName}, and a public record that has not yet earned trust. Driven by the ambition to ${ambition.replace('to ', '')}, Drennia's record halls have opened a file. What fills it is still unwritten.`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const GOLD = '#D6B35F';

function FactorRow({ label, value, delta }: { label: string; value: number; delta?: number }) {
  const maxBar = 16;
  const pct = Math.min(100, (value / maxBar) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: '#B9B09B' }}>{label}</span>
        <div className="flex items-center gap-1.5">
          {delta != null && delta > 0 && (
            <span className="text-[9px] font-mono" style={{ color: '#86efac' }}>+{delta}</span>
          )}
          <span className="text-base font-bold" style={{ color: '#F4EBD6' }}>{value}</span>
        </div>
      </div>
      <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GOLD}88, ${GOLD})` }}
        />
      </div>
    </div>
  );
}

function LedgerRow({ label, value }: { label: string; value: string }) {
  const isPending = !value || value === 'Pending';
  return (
    <div className="flex items-start justify-between gap-2 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="text-[9px] font-mono uppercase tracking-[0.15em] shrink-0 mt-0.5" style={{ color: '#7E8378' }}>{label}</span>
      <span className="text-[11px] text-right leading-snug" style={{ color: isPending ? '#3f4b47' : '#B9B09B' }}>
        {isPending ? '—' : value}
      </span>
    </div>
  );
}

function ChipBadge({ label }: { label: string }) {
  return (
    <span
      className="text-[9px] px-2 py-0.5 rounded-sm font-mono whitespace-nowrap"
      style={{ background: 'rgba(214,179,95,0.08)', border: '1px solid rgba(214,179,95,0.2)', color: '#B9B09B' }}
    >
      {label}
    </span>
  );
}

function SceneChoiceCard({ option, selected, onClick }: { option: ChoiceOption; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-sm transition-all duration-200 flex flex-col"
      style={{
        padding: '14px 16px',
        background: selected ? 'rgba(214,179,95,0.07)' : 'rgba(13,24,20,0.6)',
        border: selected ? `1.5px solid rgba(214,179,95,0.55)` : '1px solid rgba(214,179,95,0.12)',
        boxShadow: selected ? '0 0 24px rgba(214,179,95,0.08)' : 'none',
        minHeight: '130px',
      }}
    >
      <div className="flex items-start gap-2.5 mb-2">
        <div
          className="shrink-0 mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all"
          style={{ borderColor: selected ? GOLD : 'rgba(255,255,255,0.2)', background: selected ? GOLD : 'transparent' }}
        >
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-[#06100D]" />}
        </div>
        <span className="text-sm font-bold leading-snug" style={{ color: selected ? '#F4EBD6' : '#B9B09B' }}>{option.title}</span>
      </div>
      <p className="text-[11px] leading-relaxed mb-2.5 pl-[22px]" style={{ color: selected ? 'rgba(244,235,214,0.55)' : 'rgba(255,255,255,0.22)' }}>
        {option.story}
      </p>
      {option.chips && (
        <div className="flex flex-wrap gap-1.5 pl-[22px] mt-auto">
          {option.chips.slice(0, 3).map(c => <ChipBadge key={c} label={c} />)}
          {option.effects && Object.entries(option.effects).map(([k, v]) => (
            <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-sm font-mono" style={{ background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.2)', color: '#86efac' }}>
              +{v} {k.slice(0, 4)}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function NpcChoiceCard({ option, selected, onClick }: { option: ChoiceOption; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-sm transition-all duration-200 flex flex-col"
      style={{
        padding: '14px 16px',
        background: selected ? 'rgba(214,179,95,0.07)' : 'rgba(13,24,20,0.6)',
        border: selected ? `1.5px solid rgba(214,179,95,0.55)` : '1px solid rgba(214,179,95,0.12)',
        boxShadow: selected ? '0 0 24px rgba(214,179,95,0.08)' : 'none',
        minHeight: '130px',
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="shrink-0 w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold font-mono"
          style={{ background: selected ? 'rgba(214,179,95,0.15)' : 'rgba(255,255,255,0.04)', color: selected ? GOLD : '#7E8378', border: `1px solid ${selected ? 'rgba(214,179,95,0.3)' : 'rgba(255,255,255,0.06)'}` }}
        >
          {option.title.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-bold leading-none" style={{ color: selected ? '#F4EBD6' : '#B9B09B' }}>{option.title}</div>
          <div className="text-[9px] font-mono mt-0.5" style={{ color: selected ? `${GOLD}80` : '#3f4b47' }}>{option.id}</div>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed mb-2.5" style={{ color: selected ? 'rgba(244,235,214,0.55)' : 'rgba(255,255,255,0.22)' }}>
        {option.story}
      </p>
      {option.chips && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {option.chips.slice(0, 2).map(c => <ChipBadge key={c} label={c} />)}
          {option.effects && Object.entries(option.effects).map(([k, v]) => (
            <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-sm font-mono" style={{ background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.2)', color: '#86efac' }}>
              +{v} {k.slice(0, 4)}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TOTAL_SCENES = 7;

interface Choices {
  homeState: string;
  household: string;
  childhoodMark: string;
  npcContact: string;
  earlyBurden: string;
  firstAmbition: string;
}

export default function CreateCharacterPage() {
  const router = useRouter();
  const [scene, setScene] = useState(0);
  const [fading, setFading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [choices, setChoices] = useState<Choices>({
    homeState: '', household: '', childhoodMark: '',
    npcContact: '', earlyBurden: '', firstAmbition: '',
  });

  const prevFactors = useCallback(() => {
    const prev = { ...choices };
    // remove current scene's choice to compute delta
    return prev;
  }, [choices]);

  const factors = calcFactors(choices);
  const chronicle = getChronicleFragments(choices, firstName);
  const contact = NPC_CONTACTS.find(c => c.id === choices.npcContact);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    setAuthorized(true);
    const t = setTimeout(() => setRevealed(true), 60);
    return () => clearTimeout(t);
  }, [router]);

  const pick = useCallback((key: keyof Choices, val: string) => {
    setChoices(p => ({ ...p, [key]: val }));
  }, []);

  const goNext = () => {
    setFading(true);
    setTimeout(() => { setScene(s => s + 1); setFading(false); }, 200);
  };

  const goPrev = () => {
    if (scene === 0) { router.push('/world-entry'); return; }
    setFading(true);
    setTimeout(() => { setScene(s => s - 1); setFading(false); }, 200);
  };

  const canAdvance = (): boolean => {
    if (scene === 0) return firstName.trim().length > 1 && lastName.trim().length > 1;
    if (scene === 1) return !!choices.homeState;
    if (scene === 2) return !!choices.household;
    if (scene === 3) return !!choices.childhoodMark;
    if (scene === 4) return !!choices.npcContact;
    if (scene === 5) return !!choices.earlyBurden;
    if (scene === 6) return !!choices.firstAmbition;
    return false;
  };

  const handleFinish = () => {
    const contactObj = NPC_CONTACTS.find(c => c.id === choices.npcContact);
    const ambitionObj = AMBITIONS.find(a => a.id === choices.firstAmbition);
    const burdenObj   = BURDENS.find(b => b.id === choices.earlyBurden);
    const hhObj       = HOUSEHOLDS.find(h => h.id === choices.household);

    const citizenFile = {
      name: { first: firstName, last: lastName },
      age: 18,
      motherland: 'Drennia',
      capital: 'Drennport',
      continent: 'Varelia',
      homeState: choices.homeState,
      householdBackground: choices.household,
      childhoodMark: choices.childhoodMark,
      firstNpcContact: choices.npcContact,
      firstNpcContactName: contactObj?.title || '',
      firstNpcContactType: choices.npcContact,
      earlyBurden: choices.earlyBurden,
      firstAmbition: choices.firstAmbition,
      firstObligation: contactObj?.obligation || burdenObj?.obligation || hhObj?.obligation || null,
      firstVulnerability: contactObj?.vulnerability || burdenObj?.vulnerability || hhObj?.vulnerability || 'Inexperience in public life',
      homeStateFamiliarity: STATES.find(s => s.id === choices.homeState)?.tag || '',
      earlyLeaning: ambitionObj?.tag || '',
      originChronicle: getChronicleFragments(choices, firstName),
      factors,
      contact: {
        id: 'c1',
        name: contactObj?.title || '',
        role: choices.npcContact,
        type: choices.npcContact,
        strength: 20,
      },
      obligation: contactObj?.obligation || burdenObj?.obligation || hhObj?.obligation ? {
        type: (contactObj?.obligation || burdenObj?.obligation || hhObj?.obligation || '').toLowerCase().replace(/[/ ]+/g, '_'),
        description: contactObj?.obligation || burdenObj?.obligation || hhObj?.obligation || '',
        severity: 'minor',
      } : null,
      vulnerability: {
        type: 'inexperienced',
        description: contactObj?.vulnerability || burdenObj?.vulnerability || hhObj?.vulnerability || 'New to adult public life.',
        severity: 'minor',
      },
      personalMoney: 1000000,
      money: 1000000,
      wealth: 1000000,
      summaryParagraph: generateSummary(choices, firstName),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(citizenFile));
    localStorage.setItem('worldr_character_origin_v1', JSON.stringify({
      homeState: choices.homeState,
      household: choices.household,
      motherland: 'Drennia',
    }));
    router.push('/start/confirm-citizen');
  };

  // ── Dynamic scene text ──────────────────────────────────────────────────────

  const getSceneContext = (): string => {
    if (scene === 2) {
      const map: Record<string, string> = {
        'Drennport State': 'In Drennport\'s world of offices and ambition, the household you came from set the ceiling others assumed you had.',
        'Ironvale State':  'In Ironvale, whether your household owned the factory or worked in it changed everything about your early life.',
        'Greenmere State': 'In Greenmere, family name and household standing were currency before any credential mattered.',
        'Westport State':  'In Westport, your household\'s relationship with money was the first lesson you ever received.',
      };
      return map[choices.homeState] || 'Before you could choose anything, the household you were born into chose for you.';
    }
    if (scene === 3) {
      const nm = firstName || 'You';
      const hh = choices.household;
      if (hh === 'Struggling Household') return `In a household with limited means, ${nm} still found a way to be noticed before adulthood arrived.`;
      if (hh === 'Political Household') return `With politics already in the household, ${nm} was being watched before there was anything to watch.`;
      if (hh === 'Business Household') return `In a household built on enterprise, ${nm} found their own edge before anyone assigned one.`;
      return `Before any official opportunity arrived, ${firstName || 'you'} had already built something of a reputation.`;
    }
    if (scene === 4) {
      const nm = firstName || 'You';
      const stateMap: Record<string, string> = {
        'Drennport State': `In Drennport, first contacts come from institutions. ${nm} met someone who saw potential before the records did.`,
        'Ironvale State':  `In Ironvale, doors opened through effort or someone who witnessed it. ${nm}'s first real door came from a person.`,
        'Greenmere State': `In Greenmere, community ties matter more than credentials. ${nm}'s first contact was woven into that fabric.`,
        'Westport State':  `In Westport, the right introduction can change a career before it starts. ${nm}'s came unexpectedly.`,
      };
      return stateMap[choices.homeState] || `${nm} did not begin alone. Someone opened the first door.`;
    }
    if (scene === 5) {
      const nm = firstName || 'You';
      const contactName = contact?.title || 'their contact';
      const markMap: Record<string, string> = {
        'Top Student':              `Even as ${nm} built a reputation for excellence, something else weighed on the years before adulthood.`,
        'Debate Voice':             `${nm}'s voice carried early — but something from before shaped what it was carrying.`,
        'Community Helper':         `${nm} gave freely to others. But ${nm} also carried something personal that was less visible.`,
        'Quiet Survivor':           `${nm} adapted and endured. Survival always has a cost. So does silence.`,
        'Young Hustler':            `${nm} moved fast and found angles. Not everything moved on their own terms.`,
        'Cadet / Discipline Track': `Discipline kept ${nm} steady. It was also what they needed to carry something quietly.`,
        'Local Organizer':          `${nm} helped others find direction while navigating something personal of their own.`,
      };
      return (markMap[choices.childhoodMark] || `Even with ${contactName}'s support, not everything in ${nm}'s early life was simple.`);
    }
    if (scene === 6) {
      const nm = firstName || 'You';
      const contactName = contact?.title || 'their first contact';
      const burden = choices.earlyBurden;
      if (burden === 'No Major Burden') {
        return `${nm} enters adult life relatively unencumbered — supported by ${contactName} and shaped by everything that came before. The question of what to do with this freedom now stands.`;
      }
      return `${nm} carries the weight of ${burden ? burden.toLowerCase() : 'the past'} into adulthood. Encouraged by ${contactName}, shaped by experience — the question now is what ${nm} wants most from the life ahead.`;
    }
    return '';
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#06100D' }}>
        <div className="w-5 h-5 rounded-full border-2 border-[#D6B35F]/20 border-t-[#D6B35F] animate-spin" />
      </div>
    );
  }

  // ── Scene options to render ─────────────────────────────────────────────────
  const sceneOptionsMap: Record<number, ChoiceOption[]> = {
    1: STATES, 2: HOUSEHOLDS, 3: CHILDHOOD_MARKS,
    4: NPC_CONTACTS, 5: BURDENS, 6: AMBITIONS,
  };
  const currentOptions = sceneOptionsMap[scene] || [];
  const currentChoice: string = (() => {
    if (scene === 1) return choices.homeState;
    if (scene === 2) return choices.household;
    if (scene === 3) return choices.childhoodMark;
    if (scene === 4) return choices.npcContact;
    if (scene === 5) return choices.earlyBurden;
    if (scene === 6) return choices.firstAmbition;
    return '';
  })();
  const onChoose = (id: string) => {
    if (scene === 1) pick('homeState', id);
    else if (scene === 2) pick('household', id);
    else if (scene === 3) pick('childhoodMark', id);
    else if (scene === 4) pick('npcContact', id);
    else if (scene === 5) pick('earlyBurden', id);
    else if (scene === 6) pick('firstAmbition', id);
  };

  const sceneTitle = [
    'Your Life Begins',
    'Where were you raised?',
    'What kind of home shaped you?',
    'What first made people notice you?',
    'Who first opened a door for you?',
    'What weighed on you before adulthood?',
    'What do you want most?',
  ][scene] || '';

  const sceneLabel = [
    'Life Opening',
    'Scene 1 — Origin',
    'Scene 2 — Background',
    'Scene 3 — Character',
    'Scene 4 — First Contact',
    'Scene 5 — Burden',
    'Scene 6 — Ambition',
  ][scene] || '';

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 40% 0%, rgba(25,40,35,0.9) 0%, #06100D 55%)',
        opacity: revealed ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        className="w-full h-full grid"
        style={{ gridTemplateColumns: '320px minmax(0,1fr) 320px', gap: '0px' }}
      >

        {/* ── LEFT: Origin Chronicle ───────────────────────────────────────── */}
        <div
          className="h-full overflow-hidden flex flex-col"
          style={{ borderRight: '1px solid rgba(214,179,95,0.10)', background: 'rgba(8,16,13,0.95)' }}
        >
          <div className="px-5 py-5 shrink-0" style={{ borderBottom: '1px solid rgba(214,179,95,0.08)' }}>
            <div className="text-[9px] font-mono uppercase tracking-[0.3em] mb-1" style={{ color: GOLD, opacity: 0.6 }}>Origin Chronicle</div>
            <div className="text-[10px] font-mono" style={{ color: '#7E8378' }}>Your pre-18 life record</div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {chronicle.length === 0 ? (
              <p className="text-[11px] leading-relaxed italic" style={{ color: '#3f4b47' }}>
                Your story has not been written yet.
              </p>
            ) : (
              chronicle.map((frag, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: GOLD, opacity: i === chronicle.length - 1 ? 1 : 0.4 }} />
                    {i < chronicle.length - 1 && <div className="flex-1 w-px mt-1" style={{ background: 'rgba(214,179,95,0.12)' }} />}
                  </div>
                  <p className="text-[11px] leading-relaxed pb-3" style={{ color: i === chronicle.length - 1 ? '#B9B09B' : '#7E8378' }}>
                    {frag}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── CENTER: Current Life Scene ───────────────────────────────────── */}
        <div className="h-full overflow-hidden flex flex-col" style={{ background: 'rgba(10,18,15,0.85)' }}>

          {/* Scene top bar */}
          <div
            className="shrink-0 flex items-center justify-between px-8 py-4"
            style={{ borderBottom: '1px solid rgba(214,179,95,0.08)' }}
          >
            <button
              type="button"
              onClick={goPrev}
              className="flex items-center gap-1.5 transition-colors"
              style={{ color: '#7E8378' }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              <span className="text-[10px] font-mono uppercase tracking-widest">{scene === 0 ? 'World Map' : 'Back'}</span>
            </button>

            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {Array.from({ length: TOTAL_SCENES }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === scene ? '20px' : '6px',
                    height: '5px',
                    borderRadius: '3px',
                    background: i < scene ? `${GOLD}60` : i === scene ? GOLD : 'rgba(255,255,255,0.08)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            <div className="text-[10px] font-mono" style={{ color: '#3f4b47' }}>
              {scene + 1} / {TOTAL_SCENES}
            </div>
          </div>

          {/* Scene content */}
          <div
            className="flex-1 overflow-y-auto flex flex-col px-8 py-8"
            style={{
              opacity: fading ? 0 : 1,
              transform: fading ? 'translateY(6px)' : 'translateY(0)',
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }}
          >
            {/* Scene label + title */}
            <div className="shrink-0 mb-6">
              <div className="text-[9px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: `${GOLD}70` }}>{sceneLabel}</div>
              <h1 className="text-2xl md:text-3xl font-bold mb-4 leading-tight" style={{ color: '#F4EBD6' }}>{sceneTitle}</h1>
              {scene > 0 && scene < 7 && (
                <p className="text-sm leading-relaxed" style={{ color: '#7E8378' }}>{getSceneContext()}</p>
              )}
              {scene === 0 && (
                <p className="text-sm leading-relaxed" style={{ color: '#7E8378' }}>
                  In Drennia, most people are not born powerful. They are noticed, tested, helped, used, trusted, doubted, and recorded. Before adult life begins, your file starts here.
                </p>
              )}
            </div>

            {/* Scene 0: Name input */}
            {scene === 0 && (
              <div className="flex flex-col gap-4 max-w-sm">
                <div
                  className="p-4 rounded-sm mb-2 grid grid-cols-3 gap-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(214,179,95,0.1)' }}
                >
                  {[['Motherland', 'Drennia'], ['Capital', 'Drennport'], ['Age', '18']].map(([l, v]) => (
                    <div key={l}>
                      <div className="text-[8px] font-mono uppercase tracking-widest mb-0.5" style={{ color: '#3f4b47' }}>{l}</div>
                      <div className="text-[11px] font-semibold" style={{ color: '#B9B09B' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-[9px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: '#7E8378' }}>
                    First Name <span style={{ color: GOLD }}>*</span>
                  </label>
                  <input
                    autoFocus
                    className="w-full rounded-sm px-4 py-3 text-base font-sans outline-none transition-all duration-200"
                    style={{ background: 'rgba(13,24,20,0.8)', border: `1px solid rgba(214,179,95,0.15)`, color: '#F4EBD6' }}
                    placeholder="e.g. Arven"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = `rgba(214,179,95,0.5)`)}
                    onBlur={e => (e.target.style.borderColor = `rgba(214,179,95,0.15)`)}
                    onKeyDown={e => { if (e.key === 'Enter' && canAdvance()) goNext(); }}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: '#7E8378' }}>
                    Last Name <span style={{ color: GOLD }}>*</span>
                  </label>
                  <input
                    className="w-full rounded-sm px-4 py-3 text-base font-sans outline-none transition-all duration-200"
                    style={{ background: 'rgba(13,24,20,0.8)', border: `1px solid rgba(214,179,95,0.15)`, color: '#F4EBD6' }}
                    placeholder="e.g. Veyran"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = `rgba(214,179,95,0.5)`)}
                    onBlur={e => (e.target.style.borderColor = `rgba(214,179,95,0.15)`)}
                    onKeyDown={e => { if (e.key === 'Enter' && canAdvance()) goNext(); }}
                  />
                </div>
              </div>
            )}

            {/* Scenes 1–6: Choice grid */}
            {scene > 0 && scene < 7 && currentOptions.length > 0 && (
              <div
                className="grid gap-3 mt-2"
                style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
              >
                {currentOptions.map(opt =>
                  scene === 4 ? (
                    <NpcChoiceCard
                      key={opt.id}
                      option={opt}
                      selected={currentChoice === opt.id}
                      onClick={() => onChoose(opt.id)}
                    />
                  ) : (
                    <SceneChoiceCard
                      key={opt.id}
                      option={opt}
                      selected={currentChoice === opt.id}
                      onClick={() => onChoose(opt.id)}
                    />
                  )
                )}
              </div>
            )}
          </div>

          {/* Continue bar */}
          <div
            className="shrink-0 flex items-center justify-end px-8 py-4 gap-4"
            style={{ borderTop: '1px solid rgba(214,179,95,0.08)', background: 'rgba(6,16,13,0.6)' }}
          >
            {scene < TOTAL_SCENES - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance()}
                className="group relative inline-flex items-center gap-2 px-7 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] rounded-sm overflow-hidden transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                style={{
                  background: canAdvance() ? `linear-gradient(135deg, ${GOLD}, #b8944a)` : 'rgba(214,179,95,0.06)',
                  color: canAdvance() ? '#06100D' : '#7E8378',
                  boxShadow: canAdvance() ? `0 4px 20px rgba(214,179,95,0.18)` : 'none',
                }}
              >
                {canAdvance() && (
                  <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)' }} />
                )}
                Continue
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={!canAdvance()}
                className="group relative inline-flex items-center gap-2 px-7 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] rounded-sm overflow-hidden transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                style={{
                  background: canAdvance() ? `linear-gradient(135deg, ${GOLD}, #b8944a)` : 'rgba(214,179,95,0.06)',
                  color: canAdvance() ? '#06100D' : '#7E8378',
                  boxShadow: canAdvance() ? `0 4px 20px rgba(214,179,95,0.18)` : 'none',
                }}
              >
                {canAdvance() && (
                  <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)' }} />
                )}
                Confirm Life
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Live Life Ledger ──────────────────────────────────────── */}
        <div
          className="h-full overflow-hidden flex flex-col"
          style={{ borderLeft: '1px solid rgba(214,179,95,0.10)', background: 'rgba(8,16,13,0.95)' }}
        >
          <div className="px-5 py-5 shrink-0" style={{ borderBottom: '1px solid rgba(214,179,95,0.08)' }}>
            <div className="text-[9px] font-mono uppercase tracking-[0.3em] mb-1" style={{ color: GOLD, opacity: 0.6 }}>Life Ledger</div>
            <div className="text-[10px] font-mono" style={{ color: '#7E8378' }}>Building in real time</div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">

            {/* Identity */}
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: '#7E8378' }}>Identity</div>
              <div className="space-y-0">
                <LedgerRow label="Name"      value={[firstName, lastName].filter(Boolean).join(' ')} />
                <LedgerRow label="Age"       value="18" />
                <LedgerRow label="Motherland" value="Drennia" />
                <LedgerRow label="Capital"   value="Drennport" />
                <LedgerRow label="Scene"     value={sceneLabel} />
              </div>
            </div>

            {/* Visible Factors */}
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] mb-4" style={{ color: '#7E8378' }}>Visible Factors</div>
              <div className="space-y-3.5">
                <FactorRow label="Credibility" value={factors.Credibility} />
                <FactorRow label="Charisma"    value={factors.Charisma} />
                <FactorRow label="Influence"   value={factors.Influence} />
                
              </div>
            </div>

            {/* Origin Record */}
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: '#7E8378' }}>Origin Record</div>
              <div className="space-y-0">
                <LedgerRow label="Home State"  value={choices.homeState} />
                <LedgerRow label="Household"   value={choices.household} />
                <LedgerRow label="Known For"   value={choices.childhoodMark} />
                <LedgerRow label="Contact"     value={NPC_CONTACTS.find(c => c.id === choices.npcContact)?.title || ''} />
                <LedgerRow label="Burden"      value={choices.earlyBurden} />
                <LedgerRow label="Ambition"    value={choices.firstAmbition} />
              </div>
            </div>

            {/* Obligation / Vulnerability if any */}
            {(choices.npcContact || choices.household || choices.earlyBurden) && (() => {
              const contactObj = NPC_CONTACTS.find(c => c.id === choices.npcContact);
              const hhObj = HOUSEHOLDS.find(h => h.id === choices.household);
              const burdenObj = BURDENS.find(b => b.id === choices.earlyBurden);
              const obl = contactObj?.obligation || burdenObj?.obligation || hhObj?.obligation;
              const vuln = contactObj?.vulnerability || burdenObj?.vulnerability || hhObj?.vulnerability;
              if (!obl && !vuln) return null;
              return (
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: '#7E8378' }}>Emerging Record</div>
                  {obl && (
                    <div className="p-2.5 rounded-sm mb-2" style={{ background: 'rgba(214,179,95,0.05)', border: '1px solid rgba(214,179,95,0.12)' }}>
                      <div className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: `${GOLD}60` }}>Obligation</div>
                      <div className="text-[10px] leading-relaxed" style={{ color: '#B9B09B' }}>{obl}</div>
                    </div>
                  )}
                  {vuln && (
                    <div className="p-2.5 rounded-sm" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}>
                      <div className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: 'rgba(248,113,113,0.5)' }}>Vulnerability</div>
                      <div className="text-[10px] leading-relaxed" style={{ color: '#B9B09B' }}>{vuln}</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* WORLDr mark */}
          <div className="px-5 py-3 shrink-0" style={{ borderTop: '1px solid rgba(214,179,95,0.06)' }}>
            <div className="text-[8px] font-mono uppercase tracking-widest" style={{ color: '#3f4b47' }}>WORLDr · Pre-Alpha · {new Date().getFullYear()}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
