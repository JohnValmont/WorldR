'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCharacterStore } from '../../../store/character.store';
import { LogoSVG } from '../../../components/LogoSVG';
import { formatNumberUS } from '../../../lib/partyHelpers';

// PALETTE  (calm dark olive / charcoal political-strategy style)
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// bg:      #11140f
// panel:   #181c17
// border:  #2a2f26
// accent:  #d4a91f  (muted gold)
// text:    #d6d9d2  (soft off-white)
// muted:   #7a8070  (gray-green)

const BG = '#11140f';
const PANEL = '#1b1f1a';
const BORDER = '#2d3329';
const ACCENT = '#d4a91f';
const TEXT = '#d6d9d2';
const MUTED = '#7a8070';
const PANEL2 = '#151814';



// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// IDEOLOGY MAP
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const IDEOLOGY_NAMES: Record<string, string> = {
  capitalism: 'Capitalism', communism: 'Communism',
  free_market: 'Free Market Liberalism', state_intervention: 'State Interventionism',
  conservatism: 'Conservatism', progressivism: 'Progressivism',
  authoritarian: 'Authoritarian Order', democratic_reform: 'Democratic Reform',
  nationalism: 'Nationalism', globalism: 'Globalism',
  industrialism: 'Industrialism', environmentalism: 'Environmentalism',
  welfare_state: 'Welfare State', fiscal_conservatism: 'Fiscal Conservatism',
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// TYPES
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface PlayerCtx {
  characterName: string;
  characterAge: number | string;
  countryName: string;
  continentName: string;
  partyName: string;
  partyAbbreviation: string;
  partyColor: string;
  partyLogoId: string;
  ideologyIds: string[];
  partyDescription: string;
  partyCreatedAt: string;
  selectedPath: string;
  partyId?: string;
  partyFunds: number;
  partyBudget?: any;
  partyStats?: any;
}

interface PartyAction {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Position {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  actions: PartyAction[];
  filledBy?: {
    name: string;
    age: number | string;
    skill: number | string;
    loyalty: number;
    status: string;
    type?: string;
    salary?: number;
    risk?: string;
    trait?: string;
  };
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ


const MAIN_TABS = ['Home', 'Actions', 'Government', 'Nation', 'World', 'Ledger'] as const;
type MainTab = (typeof MAIN_TABS)[number];

interface PlayerCtx {
  characterName: string;
  characterAge: number | string;
  countryName: string;
  continentName: string;
  partyName: string;
  partyAbbreviation: string;
  partyColor: string;
  partyLogoId: string;
  ideologyIds: string[];
  partyDescription: string;
  partyCreatedAt: string;
  selectedPath: string;
  partyId?: string;
  partyFunds: number;
  partyBudget?: any;
  partyStats?: any;
}

export default function GovernmentPage() {
  const router = useRouter();
  const { character } = useCharacterStore();
  const [ctx, setCtx] = useState<PlayerCtx | null>(null);
  
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let countryName = 'Drennia', continentName = 'Varelia';
    try {
      const raw = localStorage.getItem('worldr_selected_country');
      if (raw) { const c = JSON.parse(raw); countryName = c.countryName ?? 'Drennia'; continentName = c.continentName ?? 'Varelia'; }
    } catch { }

    let partyName = '—', partyAbbreviation = '—', partyColor = '#d4a91f', partyLogoId = 'flag', partyId = '';
    let ideologyIds: string[] = [], partyDescription = '', partyCreatedAt = '';
    try {
      const pRaw = localStorage.getItem('worldr_current_party');
      if (pRaw) {
        const p = JSON.parse(pRaw);
        partyId = p.partyId;
        partyName = p.partyName ?? '—';
        partyAbbreviation = p.partyAbbreviation ?? '—';
        partyLogoId = p.partyLogoId ?? 'flag';
        partyColor = p.colorId ? (p.colorId === 'green' ? '#4a5045' : '#d4a91f') : '#d4a91f'; 
        ideologyIds = p.ideologyIds ?? [];
        partyDescription = p.partyDescription ?? '';
        partyCreatedAt = p.createdAt ?? '';
      }
    } catch { }

    const charName = [character.firstName, character.middleName, character.lastName].filter(Boolean).join(' ') || '—';
    const charAge = character.age ?? 30;

    setCtx({
      characterName: charName,
      characterAge: charAge,
      countryName,
      continentName,
      partyName,
      partyAbbreviation,
      partyColor,
      partyLogoId,
      ideologyIds,
      partyDescription,
      partyCreatedAt,
      selectedPath: 'Politician',
      partyId,
      partyFunds: 0,
      partyBudget: null as any,
      partyStats: null as any
    });
  }, [character]);

  const [activeGovSubtab, setActiveGovSubtab] = useState<'Overview'|'Parliament'|'Ministries'|'My Ministries'|'Bills & Debate'|'Propose Bill'|'Lawbook'|'Voting Record'>('Overview');
  const [pastElection, setPastElection] = useState<any>(null);
  const [govRecord, setGovRecord] = useState<any>(null);
  const [selectedMinId, setSelectedMinId] = useState<string>('pm');
  
  useEffect(() => {
    if (!ctx) return;
    // 1. Fetch latest past election
    const rawElections = localStorage.getItem('worldr_past_elections');
    if (!rawElections) return;
    const elections: any[] = JSON.parse(rawElections);
    const countryElections = elections.filter(e => e.countryName === ctx.countryName).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (countryElections.length === 0) return;
    const latestElection = countryElections[0];
    setPastElection(latestElection);

    // 2. Load or generate Ministry Data
    const rawGov = localStorage.getItem('worldr_government_ministries');
    let govList: any[] = rawGov ? JSON.parse(rawGov) : [];
    
    let currentGov = govList.find(g => g.electionId === latestElection.id && g.countryName === ctx.countryName);
    
    if (!currentGov) {
      // Generate new government record
      
      // Find party with highest seats
      const sortedParties = [...(latestElection.parties || [])].sort((a, b) => b.seats - a.seats);
      let governingParty = null;
      let govType = 'Independent-Dominated Parliament';
      
      if (sortedParties.length > 0 && sortedParties[0].seats > 0) {
        governingParty = sortedParties[0];
        if (governingParty.seats >= latestElection.majoritySeats) {
          govType = 'Majority Government';
        } else {
          govType = 'Minority Government';
        }
      }

      // Generate exact 8 ministries
      const offices = [
        { id: 'pm', name: 'Prime Minister', label: 'Leadership' },
        { id: 'finance', name: 'Finance Minister', label: 'Fiscal Management' },
        { id: 'interior', name: 'Interior Minister', label: 'Administration' },
        { id: 'economy', name: 'Economy Minister', label: 'Economic Planning' },
        { id: 'social', name: 'Social Minister', label: 'Public Services' },
        { id: 'justice', name: 'Justice Minister', label: 'Legal Reform' },
        { id: 'defence', name: 'Defence Minister', label: 'Security' },
        { id: 'foreign', name: 'Foreign Minister', label: 'Diplomacy' },
      ];

      const generateName = () => {
        const fns = ['Aris', 'Bane', 'Cael', 'Dora', 'Elara', 'Fenn', 'Gael', 'Hale', 'Ira', 'Jace', 'Lyra', 'Nia', 'Orin', 'Quinn', 'Sia', 'Uri', 'Wren', 'Yara'];
        const lns = ['Voss', 'Tarn', 'Kest', 'Renn', 'Vale', 'Thorn', 'Lest', 'Gant', 'Vane', 'Sorn', 'Karn', 'Vell', 'Tess'];
        return `${fns[Math.floor(Math.random() * fns.length)]} ${lns[Math.floor(Math.random() * lns.length)]}`;
      };

      // Extract existing player staff if the governing party is the current player
      let localStaff: any = {};
      let isPlayerGov = governingParty && governingParty.partyId === ctx.partyId;
      if (isPlayerGov) {
         try {
           const sRaw = localStorage.getItem('worldr_party_staff');
           if (sRaw) localStaff = JSON.parse(sRaw);
         } catch(e) {}
      }

      const ministries = offices.map((off) => {
        let ministerName = generateName();
        let origin = 'party_member';
        let age = Math.floor(35 + Math.random() * 33);
        let skill = Math.floor(45 + Math.random() * 40);
        let loyalty = Math.floor(45 + Math.random() * 50);

        if (governingParty) {
          if (off.id === 'pm') {
            // If it's the player, use characterName
            ministerName = isPlayerGov ? ctx.characterName : governingParty.leaderName;
            origin = 'party_leader';
            skill = 85;
            loyalty = 100;
          } else if (isPlayerGov) {
             let matchingStaff = null;
             if (off.id === 'finance' && localStaff['treasurer']) matchingStaff = localStaff['treasurer'];
             if (off.id === 'interior' && localStaff['membershipOfficer']) matchingStaff = localStaff['membershipOfficer'];
             if (off.id === 'economy' && localStaff['campaignMediaManager']) matchingStaff = localStaff['campaignMediaManager'];
             if (off.id === 'justice' && localStaff['publicImageManager']) matchingStaff = localStaff['publicImageManager'];
             
             if (matchingStaff) {
               ministerName = matchingStaff.name;
               age = matchingStaff.age;
               skill = matchingStaff.skill;
               loyalty = matchingStaff.loyalty;
               origin = 'party_official';
             }
          }
        }

        return {
          ministryId: off.id,
          officeName: off.name,
          controllingPartyId: governingParty ? governingParty.partyId : null,
          controllingPartyName: governingParty ? governingParty.partyName : 'None',
          controllingPartyAbbreviation: governingParty ? governingParty.partyAbbreviation : 'IND',
          ministerName: governingParty ? ministerName : 'Vacant',
          ministerAge: age,
          ministerSkill: skill,
          ministerLoyalty: loyalty,
          skillLabel: off.label,
          origin,
          status: governingParty ? 'Active' : 'Inactive'
        };
      });

      currentGov = {
        governmentId: Math.random().toString(36).substring(2, 10),
        electionId: latestElection.id,
        countryName: ctx.countryName,
        continentName: ctx.continentName,
        formedAt: new Date().toISOString(),
        governingPartyId: governingParty ? governingParty.partyId : null,
        governingPartyName: governingParty ? governingParty.partyName : null,
        governingPartyAbbreviation: governingParty ? governingParty.partyAbbreviation : null,
        governmentType: govType,
        ministries
      };
      
      govList.push(currentGov);
      localStorage.setItem('worldr_government_ministries', JSON.stringify(govList));
    }
    
    setGovRecord(currentGov);
  }, [ctx?.countryName, ctx?.partyId, ctx?.characterName, ctx?.continentName]);


  
  if (!mounted || !ctx) return null;

  const handleNavigateElections = () => {
    router.push('/varelia/actions');
  };
  
  

  const handleLogout = () => {
    useCharacterStore.getState().resetCharacter();
    localStorage.removeItem('worldr_character');
    router.push('/');
  };

  const renderTopNav = () => (
    <>
      <header className="shrink-0 h-14 flex items-center justify-between px-4 md:px-5 relative z-30" style={{ background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0" style={{ background: ACCENT }}>
            <LogoSVG logoId={ctx.partyLogoId || 'flag'} color={ctx.partyColor || '#4a5045'} size={20} />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black tracking-widest uppercase text-white">WORLDr</h1>
            <div className="text-[9px] md:text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Alpha 0.1 • {ctx.countryName}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button id="topbar-logout" type="button" title="Logout" onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-sm text-[10px] font-mono uppercase tracking-widest transition-colors"
            style={{ background: PANEL2, border: `1px solid ${BORDER}`, color: MUTED }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#c04040')}
            onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden md:block">Logout</span>
          </button>
        </div>
      </header>

      <nav className="shrink-0 flex items-center px-4 md:px-5"
        style={{ height: '38px', background: PANEL, borderBottom: `1px solid ${BORDER}`, zIndex: 20 }}>
        {(MAIN_TABS as readonly string[]).map((tab) => {
          const isHome = tab === 'Home';
          const isActions = tab === 'Actions';
          const isGovernment = tab === 'Government';
          const isEnabled = isHome || isActions || isGovernment;
          const isCurrent = isGovernment;
          return (
            <button key={tab} id={`main-tab-${tab.toLowerCase()}`} type="button"
              disabled={!isEnabled}
              onClick={() => {
                if (isHome) router.push('/varelia/news');
                else if (isActions) router.push('/varelia/actions');
              }}
              className="relative px-4 h-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-100"
              style={{
                color: isCurrent ? ACCENT : isEnabled ? MUTED : '#3a4a3a',
                cursor: isEnabled ? 'pointer' : 'not-allowed',
                background: isCurrent ? `${ACCENT}11` : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!isCurrent && isEnabled) e.currentTarget.style.color = '#a0b0a0';
              }}
              onMouseLeave={(e) => {
                if (!isCurrent && isEnabled) e.currentTarget.style.color = MUTED;
              }}>
              {tab}
              {isCurrent && (
                <div className="absolute bottom-0 left-0 w-full h-0.5" style={{ background: ACCENT }} />
              )}
              {!isEnabled && (
                <span className="ml-1.5 text-[8px] bg-black/40 px-1 py-0.5 rounded-sm border" style={{ color: '#5a6b5a', borderColor: '#2a3a2a' }}>
                  SOON
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );

   
  if (!ctx.partyId) {
    return (
      <div className="min-h-screen flex flex-col font-sans select-none" style={{ background: BG, color: TEXT }}>
        {renderTopNav()}
        <main className="flex-1 relative overflow-hidden flex">
          <div className="flex-1 flex flex-col items-center justify-center p-8 h-full">
            <div className="text-sm font-bold tracking-widest text-zinc-300 uppercase mb-2 text-center">No Party Found</div>
            <div className="text-[11px] text-zinc-500 text-center max-w-md leading-relaxed">
              Government data is unavailable. Create or load a political party first.
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!pastElection || !govRecord) {
    return (
    <div className="min-h-screen flex flex-col font-sans select-none" style={{ background: BG, color: TEXT }}>
      {renderTopNav()}
      <main className="flex-1 relative overflow-hidden flex">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative border-r" style={{ borderColor: BORDER }}>

      <div className="flex flex-col items-center justify-center p-8 h-full" style={{ background: BG }}>
        <div className="w-12 h-12 flex items-center justify-center rounded-full mb-4" style={{ background: `${PANEL2}`, border: `1px solid ${BORDER}` }}>
          <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="text-sm font-bold tracking-widest text-zinc-300 uppercase mb-2 text-center">No Parliament Formed Yet</div>
        <div className="text-[11px] text-zinc-500 text-center max-w-md mb-6 leading-relaxed">
          Complete an election before government institutions become active.
        </div>
        <button onClick={handleNavigateElections} className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40`, color: ACCENT }}>
          Go to Elections
        </button>
      </div>
        
        </div>
      </main>
    </div>
  );
  }

  // Calculate party status
  const currentPartyRow = (pastElection.parties || []).find((p: any) => 
    (p.partyId && p.partyId === ctx.partyId) ||
    (p.partyAbbreviation && p.partyAbbreviation === ctx.partyAbbreviation) ||
    (p.partyName && p.partyName === ctx.partyName)
  );
  const currentPartySeats = currentPartyRow?.seats || 0;
  let partyStatus = 'Outside Parliament';
  if (currentPartySeats >= (pastElection?.majoritySeats || 61)) partyStatus = 'Majority Government';
  else if (currentPartySeats >= 30) partyStatus = 'Major Party';
  else if (currentPartySeats >= 15) partyStatus = 'Rising Party';
  else if (currentPartySeats >= 5) partyStatus = 'Minor Party';
  else if (currentPartySeats >= 1) partyStatus = 'Small Entry';

  const renderSeatChart = () => {
    // Grid of 120 blocks representing seats
    const sortedParties = [...(pastElection.parties || [])].sort((a, b) => b.seats - a.seats);
    let blocks = [];
    sortedParties.forEach(p => {
       for(let i=0; i<p.seats; i++) {
         blocks.push({ color: p.partyId === ctx.partyId ? ACCENT : p.partyColor || '#4a5045', id: p.partyId });
       }
    });
    for(let i=0; i<(pastElection.independentIndividuals?.seats || 0); i++) {
       blocks.push({ color: '#555555', id: 'indep' });
    }
    
    return (
      <div className="flex flex-wrap gap-1 max-w-[280px]">
        {blocks.map((b, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: b.color, opacity: b.color === ACCENT ? 1 : 0.8 }} />
        ))}
      </div>
    );
  };

  const currentPartyGov = govRecord.governingPartyId === ctx.partyId;
  const controlledMinistries = (govRecord.ministries || []).filter((m: any) => m.controllingPartyId === ctx.partyId);
  const selectedMin = controlledMinistries.find((m: any) => m.ministryId === selectedMinId) || controlledMinistries[0];

  const getMinistryActions = (minId: string) => {
    switch(minId) {
      case 'pm': return ['Set Government Priority', 'Address Nation', 'Coordinate Cabinet'];
      case 'finance': return ['Review Budget', 'Tax Impact Study', 'Anti-Waste Audit'];
      case 'interior': return ['Public Order Review', 'Administrative Report', 'Local Governance Plan'];
      case 'economy': return ['Industrial Capacity Review', 'Business Roundtable', 'Employment Strategy'];
      case 'social': return ['Public Services Review', 'Youth Skills Program', 'Welfare Conditions Report'];
      case 'justice': return ['Corruption Risk Review', 'Court Efficiency Study', 'Public Integrity Campaign'];
      case 'defence': return ['Security Readiness Review', 'Veterans Welfare Report', 'Defence Audit'];
      case 'foreign': return ['Diplomatic Briefing', 'Trade Relations Review', 'Foreign Reputation Campaign'];
      default: return [];
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG }}>
      {/* Sub-nav */}
      <div className="shrink-0 flex items-center px-4 overflow-x-auto" style={{ height: '38px', background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex gap-1 h-full">
          {(['Overview', 'Parliament', 'Ministries', 'My Ministries', 'Bills & Debate', 'Propose Bill', 'Lawbook', 'Voting Record'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveGovSubtab(tab)}
              className="px-3 h-full flex items-center text-[10px] font-bold uppercase tracking-[0.12em] transition-all whitespace-nowrap"
              style={{
                color: activeGovSubtab === tab ? ACCENT : MUTED,
                borderBottom: activeGovSubtab === tab ? `2px solid ${ACCENT}` : '2px solid transparent'
              }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20">
        
        {['Bills & Debate', 'Propose Bill', 'Lawbook', 'Voting Record'].includes(activeGovSubtab) && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-xs font-bold uppercase text-zinc-500 tracking-widest mb-2">Coming Soon</div>
            <div className="text-[11px] text-zinc-600 max-w-sm text-center">
              Bills, debates, voting records, and laws will be built after the parliament and ministry foundation.
            </div>
          </div>
        )}

        {activeGovSubtab === 'Overview' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left Panel */}
              <div className="flex-1 p-5 rounded-sm" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-100">{ctx.countryName} Government</h2>
                    <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mt-1">Parliament formed after the latest national election.</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">{govRecord.governmentType}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3" style={{ background: PANEL2, border: `1px solid ${BORDER}` }}>
                    <div className="text-[9px] uppercase font-mono text-zinc-500 mb-1">System</div>
                    <div className="text-xs font-bold text-zinc-300">Parliamentary</div>
                  </div>
                  <div className="p-3" style={{ background: PANEL2, border: `1px solid ${BORDER}` }}>
                    <div className="text-[9px] uppercase font-mono text-zinc-500 mb-1">Latest Election</div>
                    <div className="text-xs font-bold text-zinc-300 truncate">{pastElection.electionName}</div>
                  </div>
                  <div className="p-3" style={{ background: PANEL2, border: `1px solid ${BORDER}` }}>
                    <div className="text-[9px] uppercase font-mono text-zinc-500 mb-1">Parliament Seats</div>
                    <div className="text-xs font-bold text-zinc-300">{formatNumberUS((pastElection?.parliamentSeats || 120))}</div>
                  </div>
                  <div className="p-3" style={{ background: PANEL2, border: `1px solid ${BORDER}` }}>
                    <div className="text-[9px] uppercase font-mono text-zinc-500 mb-1">Majority Required</div>
                    <div className="text-xs font-bold text-amber-500">{formatNumberUS((pastElection?.majoritySeats || 61))}</div>
                  </div>
                </div>

                {/* Developer comment per TASK 15 */}
                <div className="p-3 mt-4 border-l-2 border-emerald-900" style={{ background: '#0a100c' }}>
                  <div className="text-[10px] text-emerald-600/70 italic mb-1">Developer Note:</div>
                  <div className="text-[10px] text-emerald-500/50 leading-relaxed">
                    Government foundation is local-only. In multiplayer, government formation, cabinet ownership, ministry actions, and bill voting must be server-side. Independent Individuals are not AI parties. They represent non-party parliamentary seats and follow fixed bill voting behavior. Coalition mechanics are not implemented yet. Alpha rule: largest player party with seats forms government.
                  </div>
                </div>
              </div>

              {/* Right Panel - Visual */}
              <div className="w-full md:w-72 p-5 rounded-sm flex flex-col items-center justify-center" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-6 w-full text-center border-b pb-2" style={{ borderColor: BORDER }}>
                  Seat Distribution
                </div>
                {renderSeatChart()}
                <div className="w-full mt-6 space-y-2">
                  <div className="flex justify-between items-center text-[10px] uppercase font-mono">
                    <span className="text-zinc-500">Your Seats</span>
                    <span className="font-bold text-zinc-300">{formatNumberUS(currentPartySeats)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] uppercase font-mono">
                    <span className="text-zinc-500">Governing Party</span>
                    <span className="font-bold" style={{ color: ACCENT }}>{govRecord.governingPartyAbbreviation || 'None'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] uppercase font-mono">
                    <span className="text-zinc-500">Independent Seats</span>
                    <span className="font-bold text-zinc-400">{formatNumberUS((pastElection.independentIndividuals?.seats || 0))}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] uppercase font-mono">
                    <span className="text-zinc-500">Ministries Controlled</span>
                    <span className="font-bold text-emerald-500">{currentPartyGov ? 8 : 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeGovSubtab === 'Parliament' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-5 rounded-sm" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Parliament Composition</h3>
                  <p className="text-[10px] uppercase font-mono text-zinc-500 mt-1">{ctx.countryName} National Assembly</p>
                </div>
                <div className="text-[10px] uppercase font-mono text-emerald-500 border border-emerald-900 px-2 py-1 bg-emerald-950/20">
                  Total Seats: {formatNumberUS((pastElection?.parliamentSeats || 120))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b text-zinc-500 uppercase font-mono tracking-wider" style={{ borderColor: BORDER }}>
                      <th className="pb-2 font-normal w-1/3">Group / Party</th>
                      <th className="pb-2 font-normal">Leader</th>
                      <th className="pb-2 font-normal text-right">Seats</th>
                      <th className="pb-2 font-normal text-right">Vote Share</th>
                      <th className="pb-2 font-normal text-right">Parl. Share</th>
                      <th className="pb-2 font-normal pl-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Player Parties */}
                    {[...(pastElection.parties || [])].sort((a, b) => b.seats - a.seats).map((p: any) => {
                      const isMe = p.partyId === ctx.partyId;
                      let pStatus = 'Outside Parliament';
                      if (p.seats >= (pastElection?.majoritySeats || 61)) pStatus = 'Majority Government';
                      else if (p.seats >= 30) pStatus = 'Major Party';
                      else if (p.seats >= 15) pStatus = 'Rising Party';
                      else if (p.seats >= 5) pStatus = 'Minor Party';
                      else if (p.seats >= 1) pStatus = 'Small Entry';
                      
                      return (
                        <tr key={p.partyId} className="border-b last:border-0" style={{ borderColor: BORDER }}>
                          <td className="py-3 pr-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: isMe ? ACCENT : p.partyColor || '#4a5045' }} />
                              <span className={`font-bold ${isMe ? 'text-amber-400' : 'text-zinc-200'} truncate`}>{p.partyName} ({p.partyAbbreviation})</span>
                              {isMe && <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1 py-0.5 rounded-sm font-mono tracking-widest ml-1">YOU</span>}
                            </div>
                          </td>
                          <td className="py-3 text-zinc-300">{p.leaderName}</td>
                          <td className="py-3 text-right font-bold text-zinc-100">{formatNumberUS(p.seats)}</td>
                          <td className="py-3 text-right text-zinc-400 font-mono">{p.voteShare.toFixed(1)}%</td>
                          <td className="py-3 text-right text-zinc-400 font-mono">{((p.seats / (pastElection?.parliamentSeats || 120)) * 100).toFixed(1)}%</td>
                          <td className="py-3 pl-4 text-emerald-500/80 font-mono text-[9px] uppercase">{pStatus}</td>
                        </tr>
                      );
                    })}

                    {/* Independents */}
                    <tr className="border-b last:border-0 bg-white/[0.01]" style={{ borderColor: BORDER }}>
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#555555' }} />
                          <span className="font-bold text-zinc-400 truncate">Independent Individuals</span>
                        </div>
                      </td>
                      <td className="py-3 text-zinc-600">ΓÇö</td>
                      <td className="py-3 text-right font-bold text-zinc-400">{formatNumberUS((pastElection.independentIndividuals?.seats || 0))}</td>
                      <td className="py-3 text-right text-zinc-500 font-mono">{pastElection.notaPercent?.toFixed(1) || '0.0'}%</td>
                      <td className="py-3 text-right text-zinc-500 font-mono">{(((pastElection.independentIndividuals?.seats || 0) / (pastElection?.parliamentSeats || 120)) * 100).toFixed(1)}%</td>
                      <td className="py-3 pl-4 text-zinc-600 font-mono text-[9px] uppercase">Non-party bloc</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-sm border-l-2" style={{ background: PANEL2, borderLeftColor: MUTED, borderTop: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 mb-2">Independent Individuals Rule</h4>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Independent Individuals are not AI parties and cannot be negotiated with. On future bills they will automatically vote 30% Yes, 30% No, and 40% NOTA.
                </p>
              </div>
              <div className="p-4 rounded-sm border-l-2" style={{ background: PANEL2, borderLeftColor: ACCENT, borderTop: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-amber-500/80 mb-2">Legislative Rule</h4>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Ordinary bills will require <strong className="text-zinc-200">{formatNumberUS((pastElection?.majoritySeats || 61))} Yes votes</strong> to pass in DrenniaΓÇÖs {formatNumberUS((pastElection?.parliamentSeats || 120))}-seat parliament.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeGovSubtab === 'Ministries' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-zinc-100">National Ministries</h2>
              <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mt-1">Cabinet offices controlled by the governing party.</p>
            </div>

            {!govRecord.governingPartyId ? (
              <div className="p-6 text-center border rounded-sm" style={{ background: PANEL, borderColor: BORDER }}>
                <div className="text-[11px] text-zinc-400">No player-led government has formed. Ministries are inactive until a player party leads government.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(govRecord.ministries || []).map((min: any) => (
                  <div key={min.ministryId} className="p-4 rounded-sm relative overflow-hidden group" style={{ background: PANEL, border: `1px solid ${min.ministryId === 'pm' ? ACCENT : BORDER}` }}>
                    {min.ministryId === 'pm' && <div className="absolute top-0 left-0 w-full h-1" style={{ background: ACCENT }} />}
                    
                    <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 mb-1">{min.officeName}</div>
                    <div className="text-[13px] font-bold text-zinc-100 truncate mb-3">{min.ministerName}</div>
                    
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-zinc-600">Party</span>
                        <span className="text-emerald-500 font-bold">{min.controllingPartyAbbreviation}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-zinc-600">Skill ({min.skillLabel})</span>
                        <span className="text-amber-500">{min.ministerSkill}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-zinc-600">Loyalty</span>
                        <span className="text-blue-400">{min.ministerLoyalty}</span>
                      </div>
                    </div>
                    
                    <div className="text-[8px] uppercase font-mono tracking-widest text-zinc-600 bg-black/20 text-center py-1 rounded-sm border border-white/[0.05]">
                      {min.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeGovSubtab === 'My Ministries' && (
          <div className="max-w-5xl mx-auto h-full min-h-[400px]">
            {!currentPartyGov ? (
              <div className="p-8 text-center border rounded-sm flex flex-col items-center justify-center h-64" style={{ background: PANEL, borderColor: BORDER }}>
                <div className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-2">No Ministries Controlled</div>
                <div className="text-[11px] text-zinc-500 max-w-sm">Your party does not currently control any national ministries. Win government in an election to control ministries.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 h-full">
                {/* Left - List */}
                <div className="flex flex-col space-y-2">
                  {controlledMinistries.map((min: any) => (
                    <button key={min.ministryId} type="button" onClick={() => setSelectedMinId(min.ministryId)}
                      className="text-left p-3 rounded-sm transition-colors group flex items-center justify-between"
                      style={{ background: selectedMin?.ministryId === min.ministryId ? PANEL2 : PANEL, border: `1px solid ${selectedMin?.ministryId === min.ministryId ? ACCENT : BORDER}` }}>
                      <div>
                         <div className="text-[9px] uppercase font-mono tracking-widest mb-0.5" style={{ color: min.ministryId === 'pm' ? ACCENT : MUTED }}>{min.officeName}</div>
                         <div className="text-[11px] font-bold text-zinc-200">{min.ministerName}</div>
                      </div>
                      <svg className={`w-3.5 h-3.5 transition-colors ${selectedMin?.ministryId === min.ministryId ? 'text-amber-500' : 'text-zinc-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>

                {/* Right - Profile & Actions */}
                {selectedMin && (
                  <div className="rounded-sm p-6" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                    <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-4">Ministry Selected</div>
                    <div className="flex justify-between items-start mb-8 pb-6 border-b" style={{ borderColor: BORDER }}>
                      <div>
                        <h2 className="text-2xl font-bold text-zinc-100 mb-1">{selectedMin.officeName}</h2>
                        <p className="text-xs text-emerald-500 font-mono tracking-widest uppercase mb-4">{selectedMin.ministerName}</p>
                        
                        <div className="flex gap-4">
                          <div className="px-3 py-1.5 rounded-sm bg-black/20 border border-white/5">
                            <div className="text-[8px] uppercase font-mono text-zinc-500 mb-0.5">Skill ({selectedMin.skillLabel})</div>
                            <div className="text-xs font-bold text-amber-400">{selectedMin.ministerSkill}</div>
                          </div>
                          <div className="px-3 py-1.5 rounded-sm bg-black/20 border border-white/5">
                            <div className="text-[8px] uppercase font-mono text-zinc-500 mb-0.5">Loyalty</div>
                            <div className="text-xs font-bold text-blue-400">{selectedMin.ministerLoyalty}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-zinc-500 mb-1">Status</div>
                        <div className="text-[11px] font-bold text-emerald-400">{selectedMin.status}</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[11px] uppercase font-bold text-zinc-300 tracking-widest mb-4">Available Actions</h3>
                      <div className="space-y-3">
                        {getMinistryActions(selectedMin.ministryId).map((act, i) => (
                          <div key={i} className="p-4 rounded-sm flex items-center justify-between opacity-50" style={{ background: PANEL2, border: `1px solid ${BORDER}` }}>
                            <div>
                              <div className="text-xs font-bold text-zinc-300">{act}</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">Requires Government Module Expansion</div>
                            </div>
                            <button disabled className="px-4 py-1.5 text-[9px] uppercase font-mono tracking-widest bg-black/40 border border-zinc-700 text-zinc-500 rounded-sm cursor-not-allowed">
                              Coming Soon
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );

}
