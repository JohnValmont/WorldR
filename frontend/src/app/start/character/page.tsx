'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

function getInitials(first: string, last: string): string {
  const parts = [first, last].filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.map((p) => p.charAt(0).toUpperCase()).join('').slice(0, 3);
}

function buildFullName(first: string, last: string): string {
  return [first, last].filter(Boolean).join(' ') || '—';
}

const STATES = [
  { id: 'Drennport State', desc: 'Capital politics, royal institutions, bureaucracy, universities, finance, and national media.' },
  { id: 'Ironvale State', desc: 'Factories, unions, industrial towns, manufacturing, and labour politics.' },
  { id: 'Greenmere State', desc: 'Rural communities, farms, local councils, religion, agriculture, and family networks.' },
  { id: 'Westport State', desc: 'Ports, trade, companies, stock market, finance, exporters, and business patrons.' }
];

const HOUSEHOLDS = [
  { id: 'Struggling Household', chips: ['Credibility ↑', 'Charisma ↑', 'Resources ↓', 'Family pressure'] },
  { id: 'Stable Middle-Class Household', chips: ['Balanced start', 'Credibility ↑', 'Resources slight ↑'] },
  { id: 'Business Household', chips: ['Resources ↑', 'Influence ↑', 'Business obligation risk'] },
  { id: 'Civil Service Household', chips: ['Credibility ↑', 'Influence ↑', 'Insider reputation risk'] },
  { id: 'Military Household', chips: ['Credibility ↑', 'Influence ↑', 'Security establishment tie'] },
  { id: 'Political Household', chips: ['Influence ↑↑', 'Resources ↑', 'Nepotism attack risk'] }
];

const CHILDHOOD_MARKS = [
  { id: 'Always Watching Adults Talk Power', desc: 'You learned early that decisions are made behind closed doors.', chips: ['Influence leaning', 'Political awareness'] },
  { id: 'Had to Earn Money Early', desc: 'You understood cost, debt, and survival before adulthood.', chips: ['Resources leaning', 'Family pressure'] },
  { id: 'Protected Younger Family Members', desc: 'Responsibility arrived early.', chips: ['Credibility leaning', 'Obligation'] },
  { id: 'Moved Between Towns', desc: 'You learned to adapt quickly but never felt fully rooted.', chips: ['Charisma leaning', 'Lower home familiarity'] },
  { id: 'Lived Near Institutions', desc: 'Courts, ministries, universities, or offices shaped your imagination.', chips: ['Credibility leaning', 'Influence leaning'] }
];

const REPUTATIONS = [
  { id: 'School Representative', chips: ['Credibility ↑', 'Charisma ↑', 'Influence ↑'] },
  { id: 'Debate Winner', chips: ['Charisma ↑↑', 'Credibility ↑'] },
  { id: 'Community Helper', chips: ['Credibility ↑↑', 'Influence ↑'] },
  { id: 'Young Hustler', chips: ['Resources ↑', 'Charisma ↑', 'Credibility slight ↓'] },
  { id: 'Top Student', chips: ['Credibility ↑↑', 'Charisma slight ↓'] },
  { id: 'Cadet / Youth Corps', chips: ['Credibility ↑', 'Influence ↑', 'Security leaning'] },
  { id: 'Online Creator', chips: ['Charisma ↑↑', 'Influence ↑', 'Public controversy risk'] }
];

const SUPPORTERS = [
  { id: 'Teacher Mentor', chips: ['Credibility ↑', 'First Contact'] },
  { id: 'Local Councillor', chips: ['Influence ↑', 'Political favor obligation'] },
  { id: 'Business Patron', chips: ['Resources ↑', 'Influence ↑', 'Business obligation'] },
  { id: 'Union Organizer', chips: ['Influence ↑', 'Charisma ↑', 'Labour obligation'] },
  { id: 'Journalist Contact', chips: ['Charisma ↑', 'Influence ↑', 'Media exposure risk'] },
  { id: 'Military Officer', chips: ['Credibility ↑', 'Influence ↑', 'First Contact'] },
  { id: 'Religious / Community Elder', chips: ['Credibility ↑', 'Influence ↑', 'Community expectation'] }
];

const BURDENS = [
  { id: 'Family Debt', chips: ['Resources ↓', 'Obligation: Family debt', 'Vulnerability: Money pressure'] },
  { id: 'Sick Parent / Family Care', chips: ['Credibility ↑', 'Resources ↓', 'Obligation: Family care'] },
  { id: 'Public Embarrassment', chips: ['Credibility ↓', 'Charisma ↓', 'Vulnerability: Public embarrassment'] },
  { id: 'Scholarship Pressure', chips: ['Credibility ↑', 'Resources slight ↓', 'Obligation: Academic pressure'] },
  { id: 'No Major Burden', chips: ['Resources slight ↑', 'No major vulnerability'] }
];

const AMBITIONS = [
  { id: 'To Be Respected', chips: ['Leans Credibility'] },
  { id: 'To Be Heard', chips: ['Leans Charisma'] },
  { id: 'To Know Powerful People', chips: ['Leans Influence'] },
  { id: 'To Never Be Poor Again', chips: ['Leans Resources'] },
  { id: 'To Build Something Own', chips: ['Leans Business path'] },
  { id: 'To Change the Country', chips: ['Leans Politics path'] }
];

export default function CreateCharacterPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    familyName: '',
    homeState: '',
    household: '',
    childhood: '',
    reputation: '',
    supporter: '',
    burden: '',
    ambition: ''
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState(false);
  const [authorized, setAuthorized] = useState(false);

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

  const updateForm = (key: string, val: string) => setFormData(p => ({ ...p, [key]: val }));

  const calculateFactors = () => {
    let base = { Credibility: 35, Charisma: 35, Influence: 20, Resources: 15 };
    const add = (f: keyof typeof base, val: number) => { base[f] += val; };

    if (formData.household === 'Struggling Household') { add('Credibility', 5); add('Charisma', 5); add('Resources', -5); }
    if (formData.household === 'Stable Middle-Class Household') { add('Credibility', 5); add('Resources', 2); }
    if (formData.household === 'Business Household') { add('Resources', 10); add('Influence', 5); }
    if (formData.household === 'Civil Service Household') { add('Credibility', 5); add('Influence', 5); }
    if (formData.household === 'Military Household') { add('Credibility', 5); add('Influence', 5); }
    if (formData.household === 'Political Household') { add('Influence', 10); add('Resources', 5); }

    if (formData.childhood === 'Always Watching Adults Talk Power') { add('Influence', 5); }
    if (formData.childhood === 'Had to Earn Money Early') { add('Resources', 5); }
    if (formData.childhood === 'Protected Younger Family Members') { add('Credibility', 5); }
    if (formData.childhood === 'Moved Between Towns') { add('Charisma', 5); }
    if (formData.childhood === 'Lived Near Institutions') { add('Credibility', 3); add('Influence', 3); }

    if (formData.reputation === 'School Representative') { add('Credibility', 5); add('Charisma', 5); add('Influence', 5); }
    if (formData.reputation === 'Debate Winner') { add('Charisma', 10); add('Credibility', 5); }
    if (formData.reputation === 'Community Helper') { add('Credibility', 10); add('Influence', 5); }
    if (formData.reputation === 'Young Hustler') { add('Resources', 5); add('Charisma', 5); add('Credibility', -2); }
    if (formData.reputation === 'Top Student') { add('Credibility', 10); add('Charisma', -2); }
    if (formData.reputation === 'Cadet / Youth Corps') { add('Credibility', 5); add('Influence', 5); }
    if (formData.reputation === 'Online Creator') { add('Charisma', 10); add('Influence', 5); }

    if (formData.supporter === 'Teacher Mentor') { add('Credibility', 5); }
    if (formData.supporter === 'Local Councillor') { add('Influence', 5); }
    if (formData.supporter === 'Business Patron') { add('Resources', 5); add('Influence', 5); }
    if (formData.supporter === 'Union Organizer') { add('Influence', 5); add('Charisma', 5); }
    if (formData.supporter === 'Journalist Contact') { add('Charisma', 5); add('Influence', 5); }
    if (formData.supporter === 'Military Officer') { add('Credibility', 5); add('Influence', 5); }
    if (formData.supporter === 'Religious / Community Elder') { add('Credibility', 5); add('Influence', 5); }

    if (formData.burden === 'Family Debt') { add('Resources', -5); }
    if (formData.burden === 'Sick Parent / Family Care') { add('Credibility', 5); add('Resources', -5); }
    if (formData.burden === 'Public Embarrassment') { add('Credibility', -5); add('Charisma', -5); }
    if (formData.burden === 'Scholarship Pressure') { add('Credibility', 5); add('Resources', -2); }
    if (formData.burden === 'No Major Burden') { add('Resources', 2); }

    if (formData.ambition === 'To Be Respected') { add('Credibility', 2); }
    if (formData.ambition === 'To Be Heard') { add('Charisma', 2); }
    if (formData.ambition === 'To Know Powerful People') { add('Influence', 2); }
    if (formData.ambition === 'To Never Be Poor Again') { add('Resources', 2); }

    return base;
  };

  const factors = calculateFactors();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.firstName.trim()) e.firstName = 'First name is required.';
    if (!formData.lastName.trim()) e.lastName = 'Last name is required.';
    if (!formData.familyName.trim()) e.familyName = 'Family name is required.';
    if (!formData.homeState) e.homeState = 'Required';
    if (!formData.household) e.household = 'Required';
    if (!formData.childhood) e.childhood = 'Required';
    if (!formData.reputation) e.reputation = 'Required';
    if (!formData.supporter) e.supporter = 'Required';
    if (!formData.burden) e.burden = 'Required';
    if (!formData.ambition) e.ambition = 'Required';
    return e;
  };

  const isValid = Object.keys(validate()).length === 0;

  const handleSubmit = () => {
    if (!isValid) return;

    // Build the citizen file
    const citizenFile = {
      name: { first: formData.firstName, last: formData.lastName },
      age: 18,
      origin: { continent: 'Varelia', nation: 'Drennia', state: formData.homeState },
      background: {
        household: formData.household,
        childhoodMark: formData.childhood,
        pre18Reputation: formData.reputation,
        firstSupporter: formData.supporter,
        earlyBurden: formData.burden,
        firstAmbition: formData.ambition
      },
      factors,
      contact: {
        id: 'c1',
        name: formData.supporter === 'Teacher Mentor' ? 'Mr. Vance (Teacher)' : 'Local Contact',
        role: formData.supporter,
        type: 'mentor',
        strength: 20
      },
      obligation: formData.burden === 'No Major Burden' ? null : {
        type: formData.burden.toLowerCase().replace(/ /g, '_'),
        description: formData.burden,
        severity: 'minor'
      },
      vulnerability: {
        type: 'inexperienced',
        description: 'New to adult public life.',
        severity: 'minor'
      },
      leaning: formData.ambition.replace('To ', ''),
      money: 500 + Math.floor(factors.Resources * 10)
    };

    localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(citizenFile));
    router.push('/start/confirm-citizen');
  };

  const inputClass = (field: string) =>
    `w-full rounded-sm px-4 py-3 text-sm font-sans outline-none transition-all duration-200 placeholder:text-zinc-700 ` +
    'bg-black/30 border border-white/[0.07] text-white focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/15 hover:border-white/[0.12]';

  const renderChoiceList = (key: string, list: any[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
      {list.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => updateForm(key, item.id)}
          className="text-left p-3 rounded-sm transition-all duration-200 flex flex-col justify-between"
          style={{
            minHeight: '80px',
            background: formData[key as keyof typeof formData] === item.id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)',
            border: formData[key as keyof typeof formData] === item.id ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div>
            <div className="text-sm font-bold text-zinc-200 mb-1">{item.id}</div>
            {item.desc && <div className="text-[10px] text-zinc-500 font-mono leading-relaxed">{item.desc}</div>}
          </div>
          {item.chips && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.chips.map((c: string) => (
                <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-sm font-mono" style={{ background: c.includes('↑') ? 'rgba(52,211,153,0.1)' : c.includes('↓') || c.includes('Risk') || c.includes('pressure') ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', color: c.includes('↑') ? '#34d399' : c.includes('↓') || c.includes('Risk') || c.includes('pressure') ? '#f87171' : '#a1a1aa' }}>
                  {c}
                </span>
              ))}
            </div>
          )}
        </button>
      ))}
    </div>
  );

  if (!authorized) {
    return <div className="min-h-screen bg-[#07100D] flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" /></div>;
  }

  return (
    <div
      className="min-h-screen max-w-7xl mx-auto px-4 md:px-8 py-6 transition-all duration-500 bg-[#07100D]"
      style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(14px)' }}
    >
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">Create Your Life</h1>
        <p className="text-zinc-500 text-sm leading-relaxed">Your identity will shape how the world sees you.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 xl:gap-8">
        
        {/* Left: Form */}
        <div className="rounded-sm p-6 md:p-8 space-y-12" style={{ background: 'rgba(10,10,18,0.7)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
          
          <section>
            <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2 mb-4">Identity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">First Name <span className="text-amber-500">*</span></label>
                <input className={inputClass('firstName')} placeholder="e.g. Arven" value={formData.firstName} onChange={(e) => updateForm('firstName', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">Last Name <span className="text-amber-500">*</span></label>
                <input className={inputClass('lastName')} placeholder="e.g. Veyran" value={formData.lastName} onChange={(e) => updateForm('lastName', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">Family Name <span className="text-amber-500">*</span></label>
                <input className={inputClass('familyName')} placeholder="e.g. Veyran" value={formData.familyName} onChange={(e) => updateForm('familyName', e.target.value)} />
                <p className="text-zinc-700 text-[10px] mt-1.5 font-mono">Your hereditary family lineage name.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2 mb-4">Home State</h3>
            {renderChoiceList('homeState', STATES)}
          </section>

          <section>
            <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2 mb-4">Household Background</h3>
            {renderChoiceList('household', HOUSEHOLDS)}
          </section>

          <section>
            <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2 mb-4">Childhood Mark</h3>
            {renderChoiceList('childhood', CHILDHOOD_MARKS)}
          </section>

          <section>
            <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2 mb-4">Pre-18 Public Reputation</h3>
            {renderChoiceList('reputation', REPUTATIONS)}
          </section>

          <section>
            <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2 mb-4">First Supporter</h3>
            {renderChoiceList('supporter', SUPPORTERS)}
          </section>

          <section>
            <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2 mb-4">Early Burden</h3>
            {renderChoiceList('burden', BURDENS)}
          </section>

          <section>
            <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2 mb-4">First Ambition</h3>
            {renderChoiceList('ambition', AMBITIONS)}
          </section>

          <div className="h-px bg-white/[0.04]" />

          <div className="flex items-center justify-between gap-4 flex-wrap pt-4">
            <p className="text-zinc-700 text-[10px] font-mono leading-relaxed max-w-sm">
              <span className="text-amber-500/60">*</span> All fields required. Your identity will be used throughout the game.
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid}
              className="group relative inline-flex items-center gap-2.5 px-8 py-3 text-sm font-semibold uppercase tracking-[0.15em] rounded-sm overflow-hidden transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: isValid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245,158,11,0.08)', color: isValid ? '#000' : '#78716c', border: isValid ? 'none' : '1px solid rgba(245,158,11,0.12)', boxShadow: isValid ? '0 4px 20px rgba(245,158,11,0.2)' : 'none' }}
            >
              {isValid && <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }} />}
              Submit File
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: Identity Preview */}
        <div className="lg:sticky lg:top-8 self-start h-auto min-h-[480px]">
          <div className="rounded-sm overflow-hidden h-full flex flex-col" style={{ background: 'rgba(10,10,20,0.8)', border: '1px solid rgba(245,158,11,0.12)', boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
            <div className="px-5 py-3 border-b border-white/[0.05]" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.06), rgba(0,0,0,0))' }}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.8)] animate-pulse" />
                <span className="text-[9px] font-mono text-amber-500/70 uppercase tracking-[0.3em]">Identity Preview</span>
              </div>
            </div>
            <div className="flex-1 p-5 flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-sm flex items-center justify-center text-xl font-bold font-mono tracking-tighter" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
                    {getInitials(formData.firstName, formData.lastName)}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)] animate-pulse" />
                    <span className="text-[9px] font-mono text-emerald-400/80 uppercase tracking-widest">New Citizen</span>
                  </div>
                  <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">WORLDr / DRENNIA</div>
                </div>
              </div>

              <div className="h-px" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.2), rgba(255,255,255,0.03), transparent)' }} />
              
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.18em]">Full Name</span>
                  <span className="text-right text-xs font-medium text-white">{buildFullName(formData.firstName, formData.lastName)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.18em]">Family Name</span>
                  <span className="text-right text-xs font-medium text-zinc-300">{formData.familyName || '—'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.18em]">Age</span>
                  <span className="text-right text-xs font-medium text-zinc-300">18 years</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.18em]">Origin</span>
                  <span className="text-right text-xs font-medium text-amber-500">Drennia</span>
                </div>
              </div>

              <div className="h-px bg-white/[0.04]" />

              <div>
                <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.18em] mb-3 block">Calculated Factors</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Credibility</div>
                    <div className="text-lg font-bold text-white">{factors.Credibility}</div>
                  </div>
                  <div className="p-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Charisma</div>
                    <div className="text-lg font-bold text-white">{factors.Charisma}</div>
                  </div>
                  <div className="p-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Influence</div>
                    <div className="text-lg font-bold text-white">{factors.Influence}</div>
                  </div>
                  <div className="p-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Resources</div>
                    <div className="text-lg font-bold text-white">{factors.Resources}</div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-white/[0.04]">
                <div className="font-mono text-[8px] text-zinc-700 tracking-widest">DOC · {new Date().getFullYear()} · WORLDr</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
