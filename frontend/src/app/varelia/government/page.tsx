'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCharacterStore } from '../../../store/character.store';
import { LogoSVG } from '../../../components/LogoSVG';
import { formatNumberUS } from '../../../lib/partyHelpers';
import { VareliaGameShell } from '../../../components/VareliaGameShell';

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

  const [activeGovSubtab, setActiveGovSubtab] = useState<'Administration'|'Parliament'|'Cabinet'|'My Ministries'|'Bills & Debate'|'Propose Bill'|'Lawbook'|'Voting Record'>('Administration');
  const [pastElection, setPastElection] = useState<any>(null);
  const [govRecord, setGovRecord] = useState<any>(null);
  const [selectedMinId, setSelectedMinId] = useState<string>('pm');
  
  useEffect(() => {
    if (!ctx) return;
    // 1. Fetch latest past election
    const rawElections = localStorage.getItem('worldr_past_elections');
    if (!rawElections) { setPastElection(null); return; }
    const elections: any[] = JSON.parse(rawElections);
    // Find the latest election where the player party participated and is not dissolved
    const activeElections = elections.filter(e => e.countryName === ctx.countryName && e.parties?.some((p:any) => p.partyId === ctx.partyId && !p.dissolved)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (activeElections.length === 0) {
      setPastElection(null);
      return;
    }
    const latestElection = activeElections[0];
    setPastElection(latestElection);

    // 2. Load or generate Ministry Data
    const rawGov = localStorage.getItem('worldr_government_ministries');
    let govList: any[] = rawGov ? JSON.parse(rawGov) : [];
    
    // Ensure we match by resultId so new elections correctly create new government records
    let currentGov = govList.find(g => g.resultId === latestElection.resultId && g.countryName === ctx.countryName);
    
    if (!currentGov) {
      // Generate new government record
      
      // Find party with highest seats
      const sortedParties = [...(latestElection.parties || [])].sort((a, b) => b.seats - a.seats);
      let governingParty = null;
      let govType = 'Independent-Dominated Parliament';
      
      if (sortedParties.length > 0 && sortedParties[0].seats > 0) {
        governingParty = sortedParties[0];
        if (governingParty.seats >= (latestElection.majoritySeats || 61)) {
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
          ministerApproval: loyalty,
          skillLabel: off.label,
          origin,
          status: governingParty ? 'Active' : 'Inactive'
        };
      });

      currentGov = {
        governmentId: Math.random().toString(36).substring(2, 10),
        electionId: latestElection.electionId,
        resultId: latestElection.resultId,
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


  const handleResignMinister = (ministryId: string) => {
    if (!ctx || !govRecord || !ctx.partyId) return;
    
    // Find ministry to ensure we control it
    const min = govRecord.ministries?.find((m: any) => m.ministryId === ministryId);
    if (!min || min.controllingPartyId !== ctx.partyId || min.ministryId === 'pm') return;

    if (!window.confirm(`Are you sure you want ${min.ministerName} to resign as ${min.officeName}? This office will become vacant.`)) return;

    const updatedGov = { ...govRecord };
    const updatedMinistries = updatedGov.ministries.map((m: any) => {
      if (m.ministryId === ministryId) {
        return {
          ...m,
          ministerName: 'Vacant',
          ministerAge: null,
          ministerSkill: null,
          ministerLoyalty: null,
          ministerApproval: null,
          status: 'Vacant'
        };
      }
      return m;
    });

    updatedGov.ministries = updatedMinistries;
    
    // Save
    try {
      const rawGov = localStorage.getItem('worldr_government_ministries');
      if (rawGov) {
        const govList = JSON.parse(rawGov);
        const newGovList = govList.map((g: any) => g.governmentId === govRecord.governmentId ? updatedGov : g);
        localStorage.setItem('worldr_government_ministries', JSON.stringify(newGovList));
      }
    } catch(e) {}
    
    setGovRecord(updatedGov);
  };

  const handleAppointMinister = (ministryId: string) => {
    if (!ctx || !govRecord || !ctx.partyId) return;
    
    const min = govRecord.ministries?.find((m: any) => m.ministryId === ministryId);
    if (!min || min.controllingPartyId !== ctx.partyId || min.status !== 'Vacant') return;

    const fns = ['Aris', 'Bane', 'Cael', 'Dora', 'Elara', 'Fenn', 'Gael', 'Hale', 'Ira', 'Jace', 'Lyra', 'Nia', 'Orin', 'Quinn', 'Sia', 'Uri', 'Wren', 'Yara'];
    const lns = ['Voss', 'Tarn', 'Kest', 'Renn', 'Vale', 'Thorn', 'Lest', 'Gant', 'Vane', 'Sorn', 'Karn', 'Vell', 'Tess'];
    
    // Prevent duplicate names in current cabinet
    let newName = '';
    let isDuplicate = true;
    while(isDuplicate) {
      newName = `${fns[Math.floor(Math.random() * fns.length)]} ${lns[Math.floor(Math.random() * lns.length)]}`;
      isDuplicate = govRecord.ministries.some((m: any) => m.ministerName === newName);
    }

    const updatedGov = { ...govRecord };
    const updatedMinistries = updatedGov.ministries.map((m: any) => {
      if (m.ministryId === ministryId) {
        return {
          ...m,
          ministerName: newName,
          ministerAge: Math.floor(35 + Math.random() * 33),
          ministerSkill: Math.floor(45 + Math.random() * 40),
          ministerLoyalty: Math.floor(45 + Math.random() * 50),
          status: 'Active'
        };
      }
      return m;
    });

    updatedGov.ministries = updatedMinistries;
    
    // Save
    try {
      const rawGov = localStorage.getItem('worldr_government_ministries');
      if (rawGov) {
        const govList = JSON.parse(rawGov);
        const newGovList = govList.map((g: any) => g.governmentId === govRecord.governmentId ? updatedGov : g);
        localStorage.setItem('worldr_government_ministries', JSON.stringify(newGovList));
      }
    } catch(e) {}
    
    setGovRecord(updatedGov);
  };

  if (!mounted || !ctx) return null;

  const handleNavigateElections = () => {
    router.push('/varelia/actions');
  };

   
  if (!ctx.partyId) {
    return (
      <VareliaGameShell activeMainTab="Government" ctx={ctx}>
        <main className="flex-1 relative overflow-hidden flex">
          <div className="flex-1 flex flex-col items-center justify-center p-8 h-full">
            <div className="text-sm font-bold tracking-widest text-zinc-300 uppercase mb-2 text-center">No Party Found</div>
            <div className="text-[11px] text-zinc-500 text-center max-w-md leading-relaxed">
              Government data is unavailable. Create or load a political party first.
            </div>
          </div>
        </main>
      </VareliaGameShell>
    );
  }

  if (!pastElection || !govRecord) {
    return (
    <VareliaGameShell activeMainTab="Government" ctx={ctx}>
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
    </VareliaGameShell>
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
    // Collect groups
    const sortedParties = [...(pastElection.parties || [])].sort((a, b) => b.seats - a.seats);
    let groups: {id: string, name: string, abb: string, seats: number, color: string, isGov: boolean}[] = [];
    
    sortedParties.forEach(p => {
      if (p.seats > 0) {
        const isGov = p.partyId === govRecord?.governingPartyId;
        groups.push({ 
          id: p.partyId, 
          name: p.partyName,
          abb: p.partyAbbreviation,
          seats: p.seats, 
          color: isGov ? ACCENT : '#4a5045',
          isGov
        });
      }
    });
    
    if (pastElection.independentIndividuals?.seats > 0) {
      groups.push({
        id: 'independent',
        name: 'Independent Individuals',
        abb: 'IND',
        seats: pastElection.independentIndividuals.seats,
        color: '#3f3f46',
        isGov: false
      });
    }

    const totalSeats = pastElection?.parliamentSeats || 120;
    
    const rows = 5;
    const rowRadii = [100, 130, 160, 190, 220];
    const seatsPerRow = [14, 19, 24, 29, 34]; // sums to 120
    const cx = 250;
    const cy = 260;
    
    let dots: {x: number, y: number, color: string, id: string, isGov: boolean}[] = [];
    let currentGroupIdx = 0;
    let seatsPlacedForGroup = 0;

    for (let r = 0; r < rows; r++) {
      const radius = rowRadii[r];
      const count = seatsPerRow[r];
      for (let i = 0; i < count; i++) {
        const angle = Math.PI - (i / (count - 1)) * Math.PI;
        const x = cx + radius * Math.cos(angle);
        const y = cy - radius * Math.sin(angle);
        
        let color = '#333';
        let id = 'empty';
        let isGov = false;
        
        if (currentGroupIdx < groups.length) {
          color = groups[currentGroupIdx].color;
          id = groups[currentGroupIdx].id;
          isGov = groups[currentGroupIdx].isGov;
          seatsPlacedForGroup++;
          if (seatsPlacedForGroup >= groups[currentGroupIdx].seats) {
            currentGroupIdx++;
            seatsPlacedForGroup = 0;
          }
        }
        
        dots.push({ x, y, color, id, isGov });
      }
    }

    const govGroups = groups.filter(g => g.isGov);
    const oppGroups = groups.filter(g => !g.isGov);

    return (
      <div className="w-full flex flex-col items-center">
        <svg width="500" height="280" viewBox="0 0 500 280" className="w-full h-auto drop-shadow-xl" style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))' }}>
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={6} fill={d.color} opacity={d.isGov ? 1 : 0.6} stroke={d.isGov ? 'rgba(212,169,31,0.5)' : 'none'} strokeWidth={d.isGov ? 1.5 : 0} />
          ))}
          <text x="250" y="210" textAnchor="middle" className="text-4xl font-bold font-mono" fill="#d4d4d8">
            {formatNumberUS(totalSeats)}
          </text>
          <text x="250" y="235" textAnchor="middle" className="text-[12px] font-mono tracking-[0.2em] uppercase" fill="#71717a">
            Total Seats
          </text>
          
          <line x1="250" y1="160" x2="250" y2="70" stroke="#71717a" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <text x="250" y="60" textAnchor="middle" className="text-[10px] font-mono uppercase tracking-widest" fill="#71717a">
            Majority {(pastElection?.majoritySeats || 61)}
          </text>
        </svg>

        <div className="w-full mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t" style={{ borderColor: BORDER }}>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-emerald-500/80 mb-3 font-bold">Governing Party</div>
            {govGroups.length > 0 ? govGroups.map(g => (
              <div key={g.id} className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: g.color }} />
                  <span className="text-xs font-bold text-zinc-200">{g.name} ({g.abb})</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-500">{g.seats}</span>
              </div>
            )) : <div className="text-[11px] text-zinc-500">None</div>}
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-3 font-bold">Opposition / Independents</div>
            {oppGroups.length > 0 ? oppGroups.map(g => (
              <div key={g.id} className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: g.color }} />
                  <span className="text-xs font-bold text-zinc-400">{g.name} ({g.abb})</span>
                </div>
                <span className="text-xs font-mono text-zinc-500">{g.seats}</span>
              </div>
            )) : <div className="text-[11px] text-zinc-500">None</div>}
          </div>
        </div>
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
    <VareliaGameShell activeMainTab="Government" ctx={ctx}>
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG }}>
      {/* Sub-nav */}
      <div className="shrink-0 flex items-center px-4 overflow-x-auto" style={{ height: '38px', background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex gap-1 h-full">
          {(['Administration', 'Parliament', 'Cabinet', 'My Ministries', 'Bills & Debate', 'Propose Bill', 'Lawbook', 'Voting Record'] as const).map(tab => (
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

        {activeGovSubtab === 'Administration' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT COLUMN: Administration & Head of Government */}
              <div className="space-y-6">
                <div className="p-5 rounded-sm" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-6 w-full text-center border-b pb-2" style={{ borderColor: BORDER }}>
                    Current Administration
                  </div>
                  
                  {govRecord.governingPartyId ? (
                    <>
                      <h2 className="text-xl font-bold text-zinc-100 mb-1">
                        {govRecord.ministries?.find((m:any) => m.ministryId === 'pm')?.ministerName?.split(' ').pop() || govRecord.governingPartyName} Administration
                      </h2>
                      <div className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest mb-6">{govRecord.governmentType}</div>

                      <div className="space-y-4">
                        <div>
                          <div className="text-[9px] uppercase font-mono text-zinc-500 mb-0.5">Term</div>
                          <div className="text-xs font-bold text-zinc-300">48 Months</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-mono text-zinc-500 mb-0.5">Governing Party</div>
                          <div className="text-xs font-bold" style={{ color: ACCENT }}>{govRecord.governingPartyAbbreviation} &middot; {govRecord.governingPartyName}</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-mono text-zinc-500 mb-0.5">Parliament Control</div>
                          <div className="text-xs font-bold text-zinc-300">{formatNumberUS(currentPartySeats)} / {formatNumberUS((pastElection?.parliamentSeats || 120))} seats</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.05]">
                          <div>
                            <div className="text-[9px] uppercase font-mono text-zinc-500 mb-0.5">Public Approval</div>
                            <div className="text-sm font-bold text-emerald-400">53%</div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase font-mono text-zinc-500 mb-0.5">State Apparatus</div>
                            <div className="text-sm font-bold text-amber-500">54 / 100</div>
                          </div>
                        </div>
                        <p className="text-[8px] text-zinc-600 italic leading-tight mt-2">
                          Approval Rating and State Apparatus are display-only for now and will affect future government legitimacy and elections later.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-zinc-400 text-sm font-bold mb-2">No Administration Formed Yet</div>
                      <div className="text-[10px] text-zinc-600">A player-led party must win government control to form an administration.</div>
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-sm" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-4 w-full text-center border-b pb-2" style={{ borderColor: BORDER }}>
                    Head of Government
                  </div>
                  
                  {govRecord.governingPartyId ? (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-sm shrink-0 bg-black/40 border border-white/10 flex items-center justify-center">
                         <span className="text-lg font-bold text-zinc-600">PM</span>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-mono text-amber-500 mb-0.5 tracking-widest">Prime Minister</div>
                        <div className="text-sm font-bold text-zinc-100">{govRecord.ministries?.find((m:any) => m.ministryId === 'pm')?.ministerName}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">{govRecord.governingPartyAbbreviation} &middot; {govRecord.governingPartyName}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-[10px] text-zinc-500 py-4">Vacant</div>
                  )}
                </div>
              </div>

              {/* CENTER COLUMN: Issues & Timeline */}
              <div className="space-y-6">
                <div className="p-5 rounded-sm h-[200px]" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <div className="text-[11px] uppercase font-mono tracking-widest text-zinc-300 font-bold mb-1">Pressing Issues</div>
                  <div className="text-[9px] text-zinc-500 mb-6">Time-sensitive decisions will appear here when national events are triggered.</div>
                  
                  <div className="text-center text-[10px] text-zinc-600 mt-8 max-w-[80%] mx-auto">
                    No pressing issues right now. Time-sensitive national decisions will appear here when triggered.
                  </div>
                </div>

                <div className="p-5 rounded-sm min-h-[300px]" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-[11px] uppercase font-mono tracking-widest text-zinc-300 font-bold">Executive Timeline</div>
                    <div className="flex gap-2">
                      {['All', 'Bills', 'Policy', 'Cabinet', 'Crisis'].map((f, i) => (
                        <div key={f} className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded-sm cursor-default ${i === 0 ? 'bg-amber-500/20 text-amber-500' : 'text-zinc-600'}`}>
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {govRecord.governingPartyId ? (
                      <>
                        <div className="flex gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <div>
                            <div className="text-xs text-zinc-300">{govRecord.governingPartyName} formed a {govRecord.governmentType}</div>
                            <div className="text-[9px] text-zinc-500 font-mono mt-0.5">Recent</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <div>
                            <div className="text-xs text-zinc-300">{govRecord.ministries?.find((m:any) => m.ministryId === 'pm')?.ministerName} became Prime Minister</div>
                            <div className="text-[9px] text-zinc-500 font-mono mt-0.5">Recent</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <div>
                            <div className="text-xs text-zinc-300">Drennia Parliamentary Election concluded</div>
                            <div className="text-[9px] text-zinc-500 font-mono mt-0.5">Past</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-[10px] text-zinc-600 mt-8">
                        No executive events recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Cabinet Quick List */}
              <div className="space-y-6">
                <div className="p-5 rounded-sm" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <div className="text-[11px] uppercase font-mono tracking-widest text-zinc-300 font-bold mb-6 border-b pb-2" style={{ borderColor: BORDER }}>
                    Cabinet &middot; 8
                  </div>
                  
                  <div className="space-y-3">
                    {govRecord.ministries?.map((min: any) => (
                      <div key={min.ministryId} className="flex items-center gap-3 p-2 hover:bg-white/[0.02] rounded-sm transition-colors">
                        <div className="w-8 h-8 rounded-sm bg-black/40 border flex items-center justify-center shrink-0" style={{ borderColor: min.ministryId === 'pm' ? ACCENT : 'rgba(255,255,255,0.05)' }}>
                          <span className="text-[10px] font-bold" style={{ color: min.ministryId === 'pm' ? ACCENT : '#a1a1aa' }}>
                            {min.ministerName?.split(' ').map((n: string) => n[0]).join('').substring(0,2) || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-zinc-200 truncate">{min.ministerName}</div>
                          <div className="text-[9px] text-zinc-500 font-mono uppercase truncate">{min.ministryId === 'pm' ? 'Prime Minister' : min.officeName.replace(' Minister', '')}</div>
                        </div>
                        <div className="text-right shrink-0 w-16">
                          <div className="text-[8px] text-zinc-500 font-mono uppercase mb-0.5">Approval</div>
                          <div className="text-[10px] font-bold text-emerald-400">{min.ministerApproval || min.ministerLoyalty || 0}%</div>
                          <div className="w-full h-1 bg-black/50 mt-1 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${min.ministerApproval || min.ministerLoyalty || 0}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {!govRecord.ministries?.length && (
                      <div className="text-center text-[10px] text-zinc-500 py-4">Cabinet empty</div>
                    )}
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        )}

        {activeGovSubtab === 'Parliament' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="w-full p-6 md:p-8 rounded-sm flex flex-col items-center" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
              <div className="text-sm uppercase font-mono tracking-widest text-zinc-300 font-bold mb-8 w-full text-center border-b pb-4" style={{ borderColor: BORDER }}>
                Seat Distribution
              </div>
              {renderSeatChart()}
            </div>

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

        {activeGovSubtab === 'Cabinet' && (
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
                  <div key={min.ministryId} className="p-4 rounded-sm relative overflow-hidden flex flex-col group" style={{ background: PANEL, border: `1px solid ${min.ministryId === 'pm' ? ACCENT : BORDER}` }}>
                    {min.ministryId === 'pm' && <div className="absolute top-0 left-0 w-full h-1" style={{ background: ACCENT }} />}
                    
                    <div className="flex-1">
                      <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 mb-1">{min.officeName}</div>
                      <div className="text-[13px] font-bold truncate mb-3" style={{ color: min.status === 'Vacant' ? '#a1a1aa' : '#f4f4f5' }}>
                        {min.ministerName}
                      </div>
                      
                      <div className="space-y-1.5 mb-4 p-2.5 rounded-sm bg-black/20 border border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-600">Party</span>
                          <span className="text-emerald-500 font-bold">{min.controllingPartyAbbreviation}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-600">Skill</span>
                          <span className="text-amber-500">{min.ministerSkill || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-600">Loyalty</span>
                          <span className="text-blue-400">{min.ministerLoyalty || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto text-center border-t border-white/[0.05] pt-3">
                      {min.controllingPartyId === ctx.partyId ? (
                        <>
                          {min.status === 'Vacant' ? (
                            <button
                              onClick={() => handleAppointMinister(min.ministryId)}
                              className="w-full text-[9px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-colors py-1.5 rounded-sm border border-amber-500/30"
                            >
                              Appoint Minister
                            </button>
                          ) : (
                            <>
                              {min.ministryId === 'pm' ? (
                                <div className="text-[8px] uppercase font-mono tracking-widest text-emerald-500 bg-emerald-500/10 py-1.5 rounded-sm border border-emerald-500/20">
                                  Head of Government
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleResignMinister(min.ministryId)}
                                  className="w-full text-[9px] uppercase font-bold tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors py-1.5 rounded-sm border border-red-500/20"
                                >
                                  Resign
                                </button>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <div className="text-[8px] uppercase font-mono tracking-widest text-zinc-500 bg-black/20 py-1.5 rounded-sm border border-white/[0.1]">
                          {min.status === 'Vacant' ? 'Vacant' : 'Occupied'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeGovSubtab === 'My Ministries' && (
          <div className="max-w-5xl mx-auto h-full min-h-[400px]">
            {controlledMinistries.length === 0 ? (
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
                        <div className="text-[11px] font-bold text-emerald-400 mb-2">{selectedMin.status}</div>
                        
                        {selectedMin.status === 'Vacant' ? (
                          <button
                            onClick={() => handleAppointMinister(selectedMin.ministryId)}
                            className="px-4 py-1.5 text-[9px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-colors rounded-sm border border-amber-500/30"
                          >
                            Appoint Minister
                          </button>
                        ) : selectedMin.ministryId !== 'pm' ? (
                          <button
                            onClick={() => handleResignMinister(selectedMin.ministryId)}
                            className="px-4 py-1.5 text-[9px] uppercase font-bold tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors rounded-sm border border-red-500/20"
                          >
                            Resign
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[11px] uppercase font-bold text-zinc-300 tracking-widest mb-4">Available Actions</h3>
                      <div className="space-y-3">
                        {selectedMin.status === 'Vacant' ? (
                          <div className="p-6 rounded-sm text-center border" style={{ background: PANEL2, borderColor: BORDER }}>
                            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Ministry is Vacant</div>
                            <div className="text-[9px] text-zinc-600 mt-1">Appoint a minister to unlock actions.</div>
                          </div>
                        ) : (
                          getMinistryActions(selectedMin.ministryId).map((act, i) => (
                            <div key={i} className="p-4 rounded-sm flex items-center justify-between opacity-50" style={{ background: PANEL2, border: `1px solid ${BORDER}` }}>
                              <div>
                                <div className="text-xs font-bold text-zinc-300">{act}</div>
                                <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">Requires Government Module Expansion</div>
                              </div>
                              <button disabled className="px-4 py-1.5 text-[9px] uppercase font-mono tracking-widest bg-black/40 border border-zinc-700 text-zinc-500 rounded-sm cursor-not-allowed">
                                Coming Soon
                              </button>
                            </div>
                          ))
                        )}
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
    </VareliaGameShell>
  );

}
