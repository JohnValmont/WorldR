'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Factors {
  Credibility: number;
  Charisma: number;
  Influence: number;
  Resources: number;
}

interface FormData {
  firstName: string;
  lastName: string;
  homeState: string;
  household: string;
  childhoodMark: string;
  npcContact: string;
  npcContactName: string;
  npcContactType: string;
  earlyBurden: string;
  firstAmbition: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const STATES = [
  {
    id: 'Drennport State',
    desc: 'Capital of Drennia. Royal institutions, ministries, universities, and national media.',
    flavor: 'You grew up in the shadow of Drennia\'s institutions — parliament buildings, old ministries, and people who spoke about power as if they owned it.',
  },
  {
    id: 'Ironvale State',
    desc: 'Industrial heartland. Factories, unions, workers\' movements, and manufacturing towns.',
    flavor: 'You grew up where the smoke never quite cleared — Ironvale\'s factories ran through the night and its workers expected nothing to be given freely.',
  },
  {
    id: 'Greenmere State',
    desc: 'Rural heartland. Farms, local councils, religious communities, and family networks.',
    flavor: 'You grew up where everybody knew everybody — Greenmere\'s villages ran on trust, obligation, and the rhythm of seasons.',
  },
  {
    id: 'Westport State',
    desc: 'Trade and commerce hub. Ports, companies, stock markets, and business circles.',
    flavor: 'You grew up where money moved constantly — Westport\'s docks never slept and its merchants spoke of opportunity the way others spoke of fate.',
  },
];

const STATE_EFFECTS: Record<string, Partial<Factors>> = {
  'Drennport State':  { Credibility: 1, Influence: 1 },
  'Ironvale State':   { Charisma: 1, Credibility: 1 },
  'Greenmere State':  { Credibility: 1, Charisma: 1 },
  'Westport State':   { Resources: 1, Influence: 1 },
};

const HOUSEHOLDS = [
  { id: 'Struggling Household',         desc: 'Limited money, family pressure, and early lessons in survival.' },
  { id: 'Stable Middle-Class Household', desc: 'Modest comfort. Expectations were clear, life was predictable.' },
  { id: 'Business Household',            desc: 'Trade, commerce, or enterprise defined the household dynamic.' },
  { id: 'Civil Service Household',       desc: 'A parent worked for the state. Order, procedure, and caution.' },
  { id: 'Military Household',            desc: 'Discipline, hierarchy, and service were core values.' },
  { id: 'Political Household',           desc: 'Politics was dinner table conversation. Connections came early.' },
];

const HOUSEHOLD_EFFECTS: Record<string, Partial<Factors>> = {
  'Struggling Household':          { Credibility: 1, Charisma: 1 },
  'Stable Middle-Class Household': { Credibility: 1, Resources: 1 },
  'Business Household':            { Resources: 2 },
  'Civil Service Household':       { Credibility: 1, Influence: 1 },
  'Military Household':            { Credibility: 1, Influence: 1 },
  'Political Household':           { Influence: 1, Resources: 1 },
};

const CHILDHOOD_MARKS = [
  { id: 'Top Student',              desc: 'Grades opened doors before you could speak with authority.' },
  { id: 'Debate Voice',             desc: 'You learned early how to hold a room with words alone.' },
  { id: 'Community Helper',         desc: 'People trusted you before they had reason to.' },
  { id: 'Quiet Survivor',           desc: 'You adapted fast and asked for nothing. That was enough.' },
  { id: 'Young Hustler',            desc: 'You found angles others missed. Not always quietly.' },
  { id: 'Cadet / Discipline Track', desc: 'Structure gave you confidence. Rules gave you standing.' },
  { id: 'Local Organizer',          desc: 'You got people moving before you had a title.' },
];

const CHILDHOOD_EFFECTS: Record<string, Partial<Factors>> = {
  'Top Student':              { Credibility: 2 },
  'Debate Voice':             { Charisma: 2 },
  'Community Helper':         { Credibility: 1, Charisma: 1 },
  'Quiet Survivor':           { Credibility: 1, Resources: 1 },
  'Young Hustler':            { Resources: 1, Influence: 1 },
  'Cadet / Discipline Track': { Credibility: 1, Influence: 1 },
  'Local Organizer':          { Charisma: 1, Influence: 1 },
};

const NPC_CONTACTS = [
  { id: 'Teacher Mentor',     name: 'Mara Velden',    title: 'Secondary School Teacher',     desc: 'She marked your essays carefully and then told you to aim further.' },
  { id: 'Local Councillor',   name: 'Jonas Kest',     title: 'District Councillor',          desc: 'He gave you your first handshake in a room that mattered.' },
  { id: 'Business Patron',    name: 'Elric Voss',     title: 'Trade Company Director',       desc: 'He believed in you for reasons that were never entirely clear.' },
  { id: 'Journalist Contact', name: 'Talia Renn',     title: 'Regional Press Reporter',      desc: 'She showed you that the right story at the right time could move anything.' },
  { id: 'Community Elder',    name: 'Father Corin Vale', title: 'Parish Community Leader',  desc: 'He vouched for your character before you had done much to earn it.' },
  { id: 'Military Officer',   name: 'Captain Edrin Holt', title: 'Army Reserve Officer',    desc: 'He told you that preparation was the only kind of luck worth having.' },
  { id: 'Union Organizer',    name: 'Sera Dunne',     title: 'Workers\' Union Representative', desc: 'She taught you that collective voice moves what individual pleading cannot.' },
];

const NPC_EFFECTS: Record<string, Partial<Factors>> = {
  'Teacher Mentor':     { Credibility: 1 },
  'Local Councillor':   { Influence: 1 },
  'Business Patron':    { Resources: 1 },
  'Journalist Contact': { Charisma: 1 },
  'Community Elder':    { Credibility: 1 },
  'Military Officer':   { Influence: 1 },
  'Union Organizer':    { Charisma: 1 },
};

const BURDENS = [
  { id: 'Family Debt',              desc: 'Money owed that the household could not hide or ignore.' },
  { id: 'Sick Parent / Family Care', desc: 'You stepped in before you were old enough to understand what that meant.' },
  { id: 'Public Embarrassment',     desc: 'Something happened that gave others a story about you before you could write one yourself.' },
  { id: 'Scholarship Pressure',     desc: 'Your opportunity was conditional. You knew it every day.' },
  { id: 'No Major Burden',          desc: 'You carried less than most. That too shaped how you saw the world.' },
];

const BURDEN_EFFECTS: Record<string, Partial<Factors>> = {
  'Family Debt':               { Credibility: 1 },
  'Sick Parent / Family Care': { Credibility: 1 },
  'Public Embarrassment':      { Charisma: 1 },
  'Scholarship Pressure':      { Credibility: 1 },
  'No Major Burden':           { Resources: 1 },
};

const AMBITIONS = [
  { id: 'To Be Respected',             desc: 'More than money. More than power. You want to be taken seriously.', leaning: 'credibility' },
  { id: 'To Be Heard',                 desc: 'You have something to say. You intend to find an audience.', leaning: 'charisma' },
  { id: 'To Know Powerful People',     desc: 'You understand that access matters more than talent.', leaning: 'influence' },
  { id: 'To Never Be Poor Again',      desc: 'You have felt what scarcity does. You will not return to it.', leaning: 'resources' },
  { id: 'To Build Something of My Own', desc: 'An institution, a company, a movement — yours, not inherited.', leaning: 'enterprise' },
  { id: 'To Change the Country',       desc: 'You believe Drennia could be better. You want to be part of that.', leaning: 'politics' },
];

const AMBITION_EFFECTS: Record<string, Partial<Factors>> = {
  'To Be Respected':             { Credibility: 1 },
  'To Be Heard':                 { Charisma: 1 },
  'To Know Powerful People':     { Influence: 1 },
  'To Never Be Poor Again':      { Resources: 1 },
  'To Build Something of My Own': { Resources: 1, Influence: 1 },
  'To Change the Country':       { Credibility: 1, Charisma: 1 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyEffects(base: Factors, effects: Partial<Factors>): Factors {
  return {
    Credibility: base.Credibility + (effects.Credibility || 0),
    Charisma:    base.Charisma    + (effects.Charisma    || 0),
    Influence:   base.Influence   + (effects.Influence   || 0),
    Resources:   base.Resources   + (effects.Resources   || 0),
  };
}

function calcFactors(form: FormData): Factors {
  let f: Factors = { Credibility: 0, Charisma: 0, Influence: 0, Resources: 0 };
  if (form.homeState)     f = applyEffects(f, STATE_EFFECTS[form.homeState] || {});
  if (form.household)     f = applyEffects(f, HOUSEHOLD_EFFECTS[form.household] || {});
  if (form.childhoodMark) f = applyEffects(f, CHILDHOOD_EFFECTS[form.childhoodMark] || {});
  if (form.npcContact)    f = applyEffects(f, NPC_EFFECTS[form.npcContact] || {});
  if (form.earlyBurden)   f = applyEffects(f, BURDEN_EFFECTS[form.earlyBurden] || {});
  if (form.firstAmbition) f = applyEffects(f, AMBITION_EFFECTS[form.firstAmbition] || {});
  return f;
}

function getStateFlavorText(state: string, name: string): string {
  const flavors: Record<string, string> = {
    'Drennport State': `${name ? name + ' grew' : 'You grew'} up where Drennia's institutions cast long shadows — parliament, ministries, and universities shaped what ambition looked like.`,
    'Ironvale State':  `${name ? name + ' grew' : 'You grew'} up in Ironvale, where the factories defined the rhythm of life and hard work was both expectation and identity.`,
    'Greenmere State': `${name ? name + ' grew' : 'You grew'} up in Greenmere's close-knit world — farms, local churches, and councils where your family name mattered more than any credential.`,
    'Westport State':  `${name ? name + ' grew' : 'You grew'} up in Westport, where cargo moved constantly and everyone seemed to be calculating what they could buy, sell, or trade next.`,
  };
  return flavors[state] || 'Your early life shaped how you see the world.';
}

function generateSummaryParagraph(form: FormData): string {
  const name = [form.firstName, form.lastName].filter(Boolean).join(' ') || 'This person';
  const contact = NPC_CONTACTS.find(c => c.id === form.npcContact);
  const contactName = contact?.name || 'an early mentor';
  
  const burdenPhrase = form.earlyBurden === 'No Major Burden'
    ? 'without heavy obligations to carry'
    : `carrying the weight of ${form.earlyBurden.toLowerCase()}`;

  return `Raised in ${form.homeState} in a ${form.household.toLowerCase()}, ${name} enters adult life ${burdenPhrase}. Shaped by a childhood defined by ${form.childhoodMark ? form.childhoodMark.toLowerCase() : 'early experience'}, and encouraged early by ${contactName}, ${name} holds the ambition to ${form.firstAmbition.toLowerCase() || 'find a path forward'}. Drennia is already moving. The question is whether ${form.firstName || 'they'} can find a way into it.`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FactorStrip({ factors }: { factors: Factors }) {
  const bars = [
    { label: 'Cred', value: factors.Credibility, color: '#818cf8' },
    { label: 'Char', value: factors.Charisma,    color: '#34d399' },
    { label: 'Infl', value: factors.Influence,   color: '#f59e0b' },
    { label: 'Rsrc', value: factors.Resources,   color: '#60a5fa' },
  ];
  const maxVal = 20;
  return (
    <div className="flex items-center gap-4 px-6 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}>
      {bars.map(b => (
        <div key={b.label} className="flex items-center gap-2 flex-1">
          <span className="text-[9px] font-mono uppercase tracking-widest shrink-0" style={{ color: b.color, opacity: 0.7, width: '28px' }}>{b.label}</span>
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, (b.value / maxVal) * 100)}%`, background: b.color }}
            />
          </div>
          <span className="text-[10px] font-mono font-bold" style={{ color: b.color, minWidth: '14px' }}>{b.value}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="transition-all duration-300"
          style={{
            width:  i === current ? '20px' : '6px',
            height: '6px',
            borderRadius: '3px',
            background: i < current ? 'rgba(245,158,11,0.6)' : i === current ? '#f59e0b' : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
    </div>
  );
}

interface ChoiceCardProps {
  label: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
  effect?: string;
}

function ChoiceCard({ label, desc, selected, onClick, effect }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-sm transition-all duration-200 group"
      style={{
        padding: '16px 20px',
        background: selected ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)',
        border: selected ? '1.5px solid rgba(245,158,11,0.5)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: selected ? '0 0 20px rgba(245,158,11,0.06)' : 'none',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: selected ? '#f59e0b' : 'rgba(255,255,255,0.2)',
            background: selected ? '#f59e0b' : 'transparent',
          }}
        >
          {selected && (
            <svg className="w-2 h-2" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3 5.5L6.5 2" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold leading-snug" style={{ color: selected ? '#fef3c7' : '#d4d4d8' }}>{label}</div>
          {desc && <div className="text-[11px] mt-1 leading-relaxed" style={{ color: selected ? 'rgba(253,230,138,0.6)' : 'rgba(255,255,255,0.3)' }}>{desc}</div>}
          {effect && <div className="text-[10px] mt-1.5 font-mono" style={{ color: selected ? '#86efac' : 'rgba(134,239,172,0.3)' }}>{effect}</div>}
        </div>
      </div>
    </button>
  );
}

function NpcChoiceCard({ npc, selected, onClick }: { npc: typeof NPC_CONTACTS[0]; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-sm transition-all duration-200"
      style={{
        padding: '16px 20px',
        background: selected ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)',
        border: selected ? '1.5px solid rgba(245,158,11,0.5)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: selected ? '0 0 20px rgba(245,158,11,0.06)' : 'none',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold font-mono"
          style={{ background: selected ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', color: selected ? '#f59e0b' : '#71717a' }}
        >
          {npc.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold leading-none mb-0.5" style={{ color: selected ? '#fef3c7' : '#d4d4d8' }}>{npc.name}</div>
          <div className="text-[10px] font-mono mb-1.5" style={{ color: selected ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.25)' }}>{npc.title}</div>
          <div className="text-[11px] leading-relaxed" style={{ color: selected ? 'rgba(253,230,138,0.6)' : 'rgba(255,255,255,0.3)' }}>{npc.desc}</div>
        </div>
      </div>
    </button>
  );
}

// ─── Scene layouts ────────────────────────────────────────────────────────────

const TOTAL_STEPS = 7;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateCharacterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const [form, setForm] = useState<FormData>({
    firstName: '',
    lastName: '',
    homeState: '',
    household: '',
    childhoodMark: '',
    npcContact: '',
    npcContactName: '',
    npcContactType: '',
    earlyBurden: '',
    firstAmbition: '',
  });

  const factors = calcFactors(form);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
      if (!granted) {
        router.replace('/pre-alpha-access');
      } else {
        setAuthorized(true);
      }
    }
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, [router]);

  const pick = useCallback((key: keyof FormData, val: string, extra?: Partial<FormData>) => {
    setForm(p => ({ ...p, [key]: val, ...extra }));
  }, []);

  const goNext = () => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setTransitioning(false);
    }, 220);
  };

  const goPrev = () => {
    if (step === 0) { router.push('/world-entry'); return; }
    setTransitioning(true);
    setTimeout(() => {
      setStep(s => s - 1);
      setTransitioning(false);
    }, 220);
  };

  const handleFinish = () => {
    const contact = NPC_CONTACTS.find(c => c.id === form.npcContact);
    const ambitionData = AMBITIONS.find(a => a.id === form.firstAmbition);

    const citizenFile = {
      name: { first: form.firstName, last: form.lastName },
      age: 18,
      motherland: 'Drennia',
      capital: 'Drennport',
      continent: 'Varelia',
      homeState: form.homeState,
      householdBackground: form.household,
      childhoodMark: form.childhoodMark,
      firstNpcContact: form.npcContact,
      firstNpcContactName: contact?.name || '',
      firstNpcContactType: form.npcContact,
      earlyBurden: form.earlyBurden,
      firstAmbition: form.firstAmbition,
      firstObligation: form.earlyBurden !== 'No Major Burden' ? form.earlyBurden : null,
      firstVulnerability: form.earlyBurden === 'Public Embarrassment' ? 'Public image risk' : 'Inexperience in adult life',
      earlyLeaning: ambitionData?.leaning || '',
      factors: {
        Credibility: factors.Credibility,
        Charisma:    factors.Charisma,
        Influence:   factors.Influence,
        Resources:   factors.Resources,
      },
      contact: {
        id: 'c1',
        name: contact?.name || '',
        role: contact?.title || '',
        type: form.npcContact,
        strength: 20,
      },
      obligation: form.earlyBurden !== 'No Major Burden' ? {
        type: form.earlyBurden.toLowerCase().replace(/[/ ]+/g, '_'),
        description: form.earlyBurden,
        severity: 'minor',
      } : null,
      vulnerability: {
        type: 'inexperienced',
        description: form.earlyBurden === 'Public Embarrassment' ? 'A past public embarrassment follows you.' : 'New to adult public life.',
        severity: 'minor',
      },
      money: 200 + factors.Resources * 30,
      summaryParagraph: generateSummaryParagraph(form),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(citizenFile));
    localStorage.setItem('worldr_character_origin_v1', JSON.stringify({ homeState: form.homeState, household: form.household, motherland: 'Drennia' }));
    router.push('/start/confirm-citizen');
  };

  const canAdvance = (): boolean => {
    if (step === 0) return form.firstName.trim().length > 0 && form.lastName.trim().length > 0;
    if (step === 1) return !!form.homeState;
    if (step === 2) return !!form.household;
    if (step === 3) return !!form.childhoodMark;
    if (step === 4) return !!form.npcContact;
    if (step === 5) return !!form.earlyBurden;
    if (step === 6) return !!form.firstAmbition;
    return false;
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07100D' }}>
        <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const stateFlavor = form.homeState ? STATES.find(s => s.id === form.homeState)?.flavor || '' : '';
  const contact = NPC_CONTACTS.find(c => c.id === form.npcContact);

  // Dynamic scene context text
  const getStep3Context = () => {
    if (!form.homeState) return 'Before you could choose anything, the household you were born into chose for you.';
    const map: Record<string, string> = {
      'Drennport State': 'In Drennport\'s world of institutions and ambition, the household you came from set the ceiling others assumed you had.',
      'Ironvale State':   'In Ironvale, whether your household owned the factory or worked in it changed everything.',
      'Greenmere State':  'In Greenmere, family name and household history were common currency before talent was.',
      'Westport State':   'In Westport, your household\'s relationship with money was the first lesson you ever received.',
    };
    return map[form.homeState] || 'Before you could choose anything, the household you were born into chose for you.';
  };

  const getStep4Context = () => {
    const nameStr = form.firstName || 'You';
    if (!form.childhoodMark) return `${nameStr} had to become something before adult life began.`;
    const hh = form.household;
    if (hh === 'Struggling Household') return `In a household with limited means, ${nameStr} still found a way to be noticed.`;
    if (hh === 'Political Household') return `With politics at the dinner table, ${nameStr} was already being watched.`;
    if (hh === 'Business Household') return `In a household built on enterprise, ${nameStr} found their own edge early.`;
    return `Before any official opportunity arrived, ${nameStr} had already built a reputation of a kind.`;
  };

  const getStep5Context = () => {
    const nameStr = form.firstName || 'You';
    const stateCtx: Record<string, string> = {
      'Drennport State': `In Drennport, first contacts came from institutions. ${nameStr} met someone who saw potential before the records did.`,
      'Ironvale State':   `In Ironvale, doors opened through either effort or someone who witnessed it. ${nameStr}'s first door came from a person.`,
      'Greenmere State':  `In Greenmere, community ties mattered more than credentials. ${nameStr}'s first real contact was part of that fabric.`,
      'Westport State':   `In Westport, the right introduction could change a career before it started. ${nameStr}'s came from an unexpected source.`,
    };
    return stateCtx[form.homeState] || `${nameStr} did not rise alone. Someone opened the first door.`;
  };

  const getStep6Context = () => {
    const nameStr = form.firstName || 'You';
    const markCtx: Record<string, string> = {
      'Top Student':              `Even as ${nameStr} built a reputation for excellence, something weighed on the years before adulthood.`,
      'Debate Voice':             `${nameStr}'s voice carried early, but something from before shaped what it was carrying.`,
      'Community Helper':         `${nameStr} gave freely to others, while carrying something of their own.`,
      'Quiet Survivor':           `${nameStr} adapted and survived. But survival always has a cost.`,
      'Young Hustler':            `${nameStr} moved fast and found angles. But not everything moved on their own terms.`,
      'Cadet / Discipline Track': `Discipline kept ${nameStr} steady. It was also what they needed to carry something quietly.`,
      'Local Organizer':          `${nameStr} helped others find direction while navigating something personal of their own.`,
    };
    return markCtx[form.childhoodMark] || `Before ${nameStr}'s adult life could begin cleanly, something had to be carried first.`;
  };

  const getStep7Context = () => {
    const nameStr = form.firstName || 'You';
    const contactName = contact?.name || 'their contact';
    const burden = form.earlyBurden;
    if (burden === 'No Major Burden') {
      return `${nameStr} enters adult life relatively unencumbered — supported by ${contactName} and shaped by everything that came before. But the question of what to do with freedom still stands.`;
    }
    return `${nameStr} carries the weight of ${burden.toLowerCase()} into adulthood. Encouraged by ${contactName}, and shaped by experience, the question now is: what does ${nameStr} want most from the life ahead?`;
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(30, 30, 60, 0.6) 0%, #07100D 60%)',
        opacity: revealed ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            className="text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
            {step === 0 ? 'Back to Map' : 'Back'}
          </button>
        </div>

        <ProgressDots total={TOTAL_STEPS} current={step} />

        <div className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest">
          Scene {step + 1} / {TOTAL_STEPS}
        </div>
      </div>

      {/* Main scene area */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-4 py-12"
        style={{
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.22s ease, transform 0.22s ease',
        }}
      >
        <div className="w-full max-w-xl">

          {/* ── STEP 0 — LIFE OPENING ── */}
          {step === 0 && (
            <div className="flex flex-col gap-8">
              <div>
                <div className="text-[10px] font-mono text-amber-500/50 uppercase tracking-[0.3em] mb-3">Life Beginning</div>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4 leading-tight">
                  Your Life Begins
                </h1>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  In Drennia, power is not given to most people. It is earned through reputation, money, contacts, and public record. Before your adult life begins, the country is already moving around you.
                </p>
              </div>

              <div className="p-4 rounded-sm text-[11px] font-mono text-zinc-600 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex justify-between"><span className="text-zinc-700">Motherland</span><span className="text-zinc-400">Drennia</span></div>
                <div className="flex justify-between"><span className="text-zinc-700">Capital</span><span className="text-zinc-400">Drennport</span></div>
                <div className="flex justify-between"><span className="text-zinc-700">Starting Age</span><span className="text-zinc-400">18</span></div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-2">First Name <span className="text-amber-500">*</span></label>
                  <input
                    id="char-first-name"
                    autoFocus
                    className="w-full rounded-sm px-4 py-3 text-base font-sans outline-none transition-all duration-200 placeholder:text-zinc-700 bg-black/30 border border-white/[0.07] text-white focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/15"
                    placeholder="e.g. Arven"
                    value={form.firstName}
                    onChange={e => pick('firstName', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && canAdvance()) goNext(); }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-2">Last Name <span className="text-amber-500">*</span></label>
                  <input
                    id="char-last-name"
                    className="w-full rounded-sm px-4 py-3 text-base font-sans outline-none transition-all duration-200 placeholder:text-zinc-700 bg-black/30 border border-white/[0.07] text-white focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/15"
                    placeholder="e.g. Veyran"
                    value={form.lastName}
                    onChange={e => pick('lastName', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && canAdvance()) goNext(); }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 1 — HOME STATE ── */}
          {step === 1 && (
            <div className="flex flex-col gap-8">
              <div>
                <div className="text-[10px] font-mono text-amber-500/50 uppercase tracking-[0.3em] mb-3">Scene 1 — Origin</div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-4 leading-tight">
                  Where were you raised?
                </h1>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Your state shaped your accent, your expectations, and the kind of people you grew up around.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {STATES.map(s => (
                  <ChoiceCard
                    key={s.id}
                    label={s.id}
                    desc={s.desc}
                    selected={form.homeState === s.id}
                    onClick={() => pick('homeState', s.id)}
                    effect={Object.entries(STATE_EFFECTS[s.id] || {}).map(([k, v]) => `+${v} ${k}`).join('  ')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2 — HOUSEHOLD ── */}
          {step === 2 && (
            <div className="flex flex-col gap-8">
              <div>
                <div className="text-[10px] font-mono text-amber-500/50 uppercase tracking-[0.3em] mb-3">Scene 2 — Background</div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-4 leading-tight">
                  What kind of home shaped you?
                </h1>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {getStep3Context()}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {HOUSEHOLDS.map(h => (
                  <ChoiceCard
                    key={h.id}
                    label={h.id}
                    desc={h.desc}
                    selected={form.household === h.id}
                    onClick={() => pick('household', h.id)}
                    effect={Object.entries(HOUSEHOLD_EFFECTS[h.id] || {}).map(([k, v]) => `+${v} ${k}`).join('  ')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3 — CHILDHOOD MARK ── */}
          {step === 3 && (
            <div className="flex flex-col gap-8">
              <div>
                <div className="text-[10px] font-mono text-amber-500/50 uppercase tracking-[0.3em] mb-3">Scene 3 — Character</div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-4 leading-tight">
                  What first made people notice you?
                </h1>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {getStep4Context()}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {CHILDHOOD_MARKS.map(c => (
                  <ChoiceCard
                    key={c.id}
                    label={c.id}
                    desc={c.desc}
                    selected={form.childhoodMark === c.id}
                    onClick={() => pick('childhoodMark', c.id)}
                    effect={Object.entries(CHILDHOOD_EFFECTS[c.id] || {}).map(([k, v]) => `+${v} ${k}`).join('  ')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 4 — NPC CONTACT ── */}
          {step === 4 && (
            <div className="flex flex-col gap-8">
              <div>
                <div className="text-[10px] font-mono text-amber-500/50 uppercase tracking-[0.3em] mb-3">Scene 4 — First Contact</div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-4 leading-tight">
                  Who first opened a door for you?
                </h1>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {getStep5Context()}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {NPC_CONTACTS.map(npc => (
                  <NpcChoiceCard
                    key={npc.id}
                    npc={npc}
                    selected={form.npcContact === npc.id}
                    onClick={() => pick('npcContact', npc.id, { npcContactName: npc.name, npcContactType: npc.id })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 5 — EARLY BURDEN ── */}
          {step === 5 && (
            <div className="flex flex-col gap-8">
              <div>
                <div className="text-[10px] font-mono text-amber-500/50 uppercase tracking-[0.3em] mb-3">Scene 5 — Burden</div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-4 leading-tight">
                  What weighed on you before adulthood?
                </h1>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {getStep6Context()}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {BURDENS.map(b => (
                  <ChoiceCard
                    key={b.id}
                    label={b.id}
                    desc={b.desc}
                    selected={form.earlyBurden === b.id}
                    onClick={() => pick('earlyBurden', b.id)}
                    effect={Object.entries(BURDEN_EFFECTS[b.id] || {}).map(([k, v]) => `+${v} ${k}`).join('  ')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 6 — FIRST AMBITION ── */}
          {step === 6 && (
            <div className="flex flex-col gap-8">
              <div>
                <div className="text-[10px] font-mono text-amber-500/50 uppercase tracking-[0.3em] mb-3">Scene 6 — Ambition</div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-4 leading-tight">
                  What do you want most?
                </h1>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {getStep7Context()}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {AMBITIONS.map(a => (
                  <ChoiceCard
                    key={a.id}
                    label={a.id}
                    desc={a.desc}
                    selected={form.firstAmbition === a.id}
                    onClick={() => pick('firstAmbition', a.id)}
                    effect={Object.entries(AMBITION_EFFECTS[a.id] || {}).map(([k, v]) => `+${v} ${k}`).join('  ')}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Factor strip + Continue bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <FactorStrip factors={factors} />

        <div className="flex items-center justify-end px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' }}>
          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance()}
              className="group relative inline-flex items-center gap-2.5 px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] rounded-sm overflow-hidden transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: canAdvance() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245,158,11,0.08)',
                color: canAdvance() ? '#000' : '#78716c',
                boxShadow: canAdvance() ? '0 4px 20px rgba(245,158,11,0.2)' : 'none',
              }}
            >
              {canAdvance() && <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)' }} />}
              Continue
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={!canAdvance()}
              className="group relative inline-flex items-center gap-2.5 px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] rounded-sm overflow-hidden transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: canAdvance() ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(99,102,241,0.08)',
                color: canAdvance() ? '#fff' : '#78716c',
                boxShadow: canAdvance() ? '0 4px 20px rgba(99,102,241,0.25)' : 'none',
              }}
            >
              {canAdvance() && <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)' }} />}
              Confirm Life
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
