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

function getActiveGovernmentState(ctx: any) {
  if (!ctx || !ctx.countryName) return null;

  const rawElections = localStorage.getItem('worldr_past_elections');
  if (!rawElections) return null;
  const elections: any[] = JSON.parse(rawElections);
  const activeElections = elections.filter(e => e.countryName === ctx.countryName && e.parties?.some((p:any) => p.partyId === ctx.partyId && !p.dissolved)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  if (activeElections.length === 0) return null;
  const latestElection = activeElections[0];

  const rawGov = localStorage.getItem('worldr_government_cabinet');
  let govList: any[] = rawGov ? JSON.parse(rawGov) : [];
  
  if (govList.length === 0) {
    const oldGov = localStorage.getItem('worldr_government_ministries');
    if (oldGov) govList = JSON.parse(oldGov);
  }

  let currentGov = govList.find(g => g.resultId === latestElection.resultId && g.countryName === ctx.countryName);

  const sortedParties = [...(latestElection.parties || [])].filter((p:any) => !p.dissolved).sort((a:any, b:any) => b.seats - a.seats);
  let governingParty = null;
  let govType = 'Independent-Dominated Parliament';
  const majorityReq = latestElection.majoritySeats || 61;
  const parliamentSeats = latestElection.parliamentSeats || 120;
  
  if (sortedParties.length > 0 && sortedParties[0].seats > 0) {
    governingParty = sortedParties[0];
    if (governingParty.seats >= majorityReq) {
      govType = 'Majority Government';
    } else {
      govType = 'Minority Government';
    }
  }

  const offices = [
    { id: 'pm', name: 'Prime Minister', policyArea: ['government direction', 'national leadership', 'mandate management'] },
    { id: 'finance', name: 'Finance Minister', policyArea: ['taxes', 'budget', 'spending', 'debt', 'fiscal credibility'] },
    { id: 'interior', name: 'Interior Minister', policyArea: ['administration', 'public order', 'bureaucracy', 'local government'] },
    { id: 'economy', name: 'Economy Minister', policyArea: ['jobs', 'industry', 'business', 'trade inside economy'] },
    { id: 'social', name: 'Social Minister', policyArea: ['health', 'education', 'welfare', 'labour', 'youth'] },
    { id: 'justice', name: 'Justice Minister', policyArea: ['courts', 'corruption', 'legal reform', 'public integrity'] },
    { id: 'defence', name: 'Defence Minister', policyArea: ['military', 'readiness', 'veterans', 'national security'] },
    { id: 'foreign', name: 'Foreign Minister', policyArea: ['diplomacy', 'treaties', 'foreign reputation', 'external trade relations'] },
  ];

  if (!currentGov) {
    const generateName = () => {
      const fns = ['Aris', 'Bane', 'Cael', 'Dora', 'Elara', 'Fenn', 'Gael', 'Hale', 'Ira', 'Jace', 'Lyra', 'Nia', 'Orin', 'Quinn', 'Sia', 'Uri', 'Wren', 'Yara'];
      const lns = ['Voss', 'Tarn', 'Kest', 'Renn', 'Vale', 'Thorn', 'Lest', 'Gant', 'Vane', 'Sorn', 'Karn', 'Vell', 'Tess'];
      return `${fns[Math.floor(Math.random() * fns.length)]} ${lns[Math.floor(Math.random() * lns.length)]}`;
    };

    let localStaff: any = {};
    let isPlayerGov = governingParty && governingParty.partyId === ctx.partyId;
    if (isPlayerGov) {
       try {
         const sRaw = localStorage.getItem('worldr_party_staff');
         if (sRaw) localStaff = JSON.parse(sRaw);
       } catch(e) {}
    }

    const cabinet = offices.map((off) => {
      let ministerName = generateName();
      let age = Math.floor(35 + Math.random() * 33);
      let skill = Math.floor(45 + Math.random() * 40);
      let loyalty = Math.floor(45 + Math.random() * 50);

      if (governingParty) {
        if (off.id === 'pm') {
          ministerName = isPlayerGov ? ctx.characterName : governingParty.leaderName;
          skill = 85; loyalty = 100;
        } else if (isPlayerGov) {
           let matchingStaff = null;
           if (off.id === 'finance' && localStaff['treasurer']) matchingStaff = localStaff['treasurer'];
           if (off.id === 'interior' && localStaff['membershipOfficer']) matchingStaff = localStaff['membershipOfficer'];
           if (off.id === 'economy' && localStaff['campaignMediaManager']) matchingStaff = localStaff['campaignMediaManager'];
           if (off.id === 'justice' && localStaff['publicImageManager']) matchingStaff = localStaff['publicImageManager'];
           if (matchingStaff) {
             ministerName = matchingStaff.name;
             age = matchingStaff.age; skill = matchingStaff.skill; loyalty = matchingStaff.loyalty;
           }
        }
      }
      return {
        officeId: off.id,
        officeName: off.name,
        controllingPartyId: governingParty ? governingParty.partyId : null,
        ministerName: governingParty ? ministerName : 'Vacant',
        ministerSkill: skill,
        ministerLoyalty: loyalty,
        ministerApproval: loyalty,
        policyArea: off.policyArea,
        status: governingParty ? 'Active' : 'Vacant'
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
      cabinet,
      ministries: cabinet
    };
    
    govList.push(currentGov);
    localStorage.setItem('worldr_government_cabinet', JSON.stringify(govList));
  }

  if (currentGov.cabinet || currentGov.ministries) {
    const cab = currentGov.cabinet || currentGov.ministries;
    currentGov.cabinet = cab.map((m:any) => {
      let readinessScore = 0;
      let readinessLabel = 'Vacant';
      if (m.status === 'Vacant' || m.ministerName === 'Vacant') {
        readinessLabel = 'Vacant';
      } else {
        readinessScore = (m.ministerSkill * 0.45) + (m.ministerApproval * 0.35) + (m.ministerLoyalty * 0.20);
        if (readinessScore >= 80) readinessLabel = 'Strong';
        else if (readinessScore >= 65) readinessLabel = 'Stable';
        else if (readinessScore >= 50) readinessLabel = 'Unsteady';
        else readinessLabel = 'Weak';
      }
      
      const staticOffice = offices.find(o => o.id === m.officeId || o.id === m.ministryId);
      return {
        ...m,
        ministryId: m.officeId || m.ministryId,
        officeId: m.officeId || m.ministryId,
        readinessScore,
        readinessLabel,
        policyArea: staticOffice?.policyArea || [],
        activeIssueLoad: 0
      };
    });
    currentGov.ministries = currentGov.cabinet;
  }

  const getOrGenerate = (key: string, generator: () => any) => {
    const raw = localStorage.getItem(key);
    let list = raw ? JSON.parse(raw) : [];
    let record = list.find((item:any) => item.governmentId === currentGov.governmentId);
    if (!record && currentGov.governingPartyId) {
      record = generator();
      if (record) {
        list.push(record);
        localStorage.setItem(key, JSON.stringify(list));
      }
    }
    return record;
  };

  const mandate = getOrGenerate('worldr_government_mandates', () => {
    let strength = 'Moderate';
    if (governingParty && governingParty.seats >= majorityReq && (governingParty.voteShare || 0) > 40) strength = 'Strong';
    else if (governingParty && governingParty.seats < 30) strength = 'Weak';

    return {
      mandateId: Math.random().toString(36).substring(2, 10),
      governmentId: currentGov.governmentId,
      title: 'Economic Renewal',
      strength,
      publicExpectation: 'Citizens expect visible action on jobs, industry, business confidence, and cost-of-living pressure.',
      priorityBlocs: ['Urban Professionals', 'Industrial Workers', 'Small Business Owners'],
      responsibleOffices: ['Economy Minister', 'Finance Minister', 'Social Minister'],
      recommendedPolicyAreas: ['Industrialisation', 'Jobs & Skills', 'Small Business Support', 'Cost of Living Relief'],
      patience: 'Medium',
      ignoredRisk: 'Promise failure risk increases if no economy/jobs policy is advanced.',
      fulfilledScore: 0,
      createdAt: new Date().toISOString()
    };
  });

  const getOrGenerateList = (key: string, generator: () => any[]) => {
    const raw = localStorage.getItem(key);
    let list = raw ? JSON.parse(raw) : [];
    let records = list.filter((item:any) => item.governmentId === currentGov.governmentId);
    if (records.length === 0 && currentGov.governingPartyId) {
      records = generator();
      list.push(...records);
      localStorage.setItem(key, JSON.stringify(list));
    }
    return records;
  };

  const nationalIssues = getOrGenerateList('worldr_government_issues', () => {
    return [
      {
        issueId: Math.random().toString(36).substring(2, 10),
        governmentId: currentGov.governmentId,
        title: 'Industrial Modernization Gap',
        severity: 'Moderate',
        status: 'Active',
        responsibleOffice: 'Economy Minister',
        officeId: 'economy',
        affectedBlocs: ['Industrial Workers', 'Urban Professionals', 'Small Business Owners'],
        recommendedResponses: ['Industrialisation Act', 'Jobs & Skills Program', 'Small Business Modernization'],
        riskIfIgnored: 'Employment confidence weakens and industry-focused voters become impatient.',
        timePressure: 'Medium',
        createdAt: new Date().toISOString()
      },
      {
        issueId: Math.random().toString(36).substring(2, 10),
        governmentId: currentGov.governmentId,
        title: 'Cost of Living Pressure',
        severity: 'High',
        status: 'Urgent',
        responsibleOffice: 'Finance Minister',
        officeId: 'finance',
        affectedBlocs: ['Urban Professionals', 'Rural Workers'],
        recommendedResponses: ['Tax Relief', 'Price Controls'],
        riskIfIgnored: 'Public approval will sink rapidly across all working-class demographics.',
        timePressure: 'High',
        createdAt: new Date().toISOString()
      },
      {
        issueId: Math.random().toString(36).substring(2, 10),
        governmentId: currentGov.governmentId,
        title: 'Bureaucratic Inefficiency',
        severity: 'Mild',
        status: 'Watching',
        responsibleOffice: 'Interior Minister',
        officeId: 'interior',
        affectedBlocs: ['Middle Class', 'Small Business Owners'],
        recommendedResponses: ['Administrative Reform', 'Digital Government Act'],
        riskIfIgnored: 'Slight drag on overall government efficiency and baseline approval.',
        timePressure: 'Low',
        createdAt: new Date().toISOString()
      },
      {
        issueId: Math.random().toString(36).substring(2, 10),
        governmentId: currentGov.currentGov,
        title: 'Youth Employment Concern',
        severity: 'Moderate',
        status: 'Active',
        responsibleOffice: 'Social Minister',
        officeId: 'social',
        affectedBlocs: ['Youth', 'Urban Professionals'],
        recommendedResponses: ['Youth Skills File', 'Education Subsidies'],
        riskIfIgnored: 'Youth support evaporates entirely and crime may tick up.',
        timePressure: 'Medium',
        createdAt: new Date().toISOString()
      }
    ];
  });

  if (currentGov.cabinet) {
    currentGov.cabinet.forEach((m:any) => {
      m.activeIssueLoad = nationalIssues.filter((i:any) => i.officeId === m.officeId).length;
    });
  }

  const policyPipeline = getOrGenerateList('worldr_policy_pipeline', () => {
    return [
      {
        fileId: Math.random().toString(36).substring(2, 10),
        governmentId: currentGov.governmentId,
        title: 'Industrial Modernization File',
        source: 'National Issue',
        relatedIssueId: nationalIssues.find((i:any) => i.officeId === 'economy')?.issueId || null,
        responsibleOffice: 'Economy Minister',
        officeId: 'economy',
        readiness: 'Medium',
        stage: 'Under Review',
        expectedBenefits: ['+15 Industry', '+10 Jobs'],
        risks: ['-5 Budget'],
        createdAt: new Date().toISOString()
      },
      {
        fileId: Math.random().toString(36).substring(2, 10),
        governmentId: currentGov.governmentId,
        title: 'Cost of Living Response File',
        source: 'Mandate',
        responsibleOffice: 'Finance Minister',
        officeId: 'finance',
        readiness: 'Low',
        stage: 'Concept',
        createdAt: new Date().toISOString()
      },
      {
        fileId: Math.random().toString(36).substring(2, 10),
        governmentId: currentGov.governmentId,
        title: 'Administrative Efficiency File',
        source: 'National Issue',
        responsibleOffice: 'Interior Minister',
        officeId: 'interior',
        readiness: 'Medium',
        stage: 'Under Review',
        createdAt: new Date().toISOString()
      },
      {
        fileId: Math.random().toString(36).substring(2, 10),
        governmentId: currentGov.governmentId,
        title: 'Youth Skills File',
        source: 'National Issue',
        responsibleOffice: 'Social Minister',
        officeId: 'social',
        readiness: 'Low',
        stage: 'Concept',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const publicNarrative = getOrGenerate('worldr_government_narratives', () => {
    return {
      narrativeId: Math.random().toString(36).substring(2, 10),
      governmentId: currentGov.governmentId,
      mediaTone: 'Cautiously optimistic',
      citizenExpectation: 'Deliver visible economic results early.',
      oppositionLine: 'Too much power concentrated in one party.',
      governmentImage: 'Strong mandate, untested in office.',
      recentShift: 'Election victory has raised expectations.',
      createdAt: new Date().toISOString()
    };
  });

  const executiveTimeline = getOrGenerateList('worldr_executive_timeline', () => {
    const leaderName = governingParty ? governingParty.leaderName : 'A leader';
    const partyAbb = governingParty ? governingParty.partyAbbreviation : 'IND';
    
    return [
      { eventId: Math.random().toString(36).substring(2, 10), governmentId: currentGov.governmentId, type: 'election', title: 'Drennia Parliamentary Election concluded.', gameDate: 'May 2026', createdAt: new Date().toISOString() },
      { eventId: Math.random().toString(36).substring(2, 10), governmentId: currentGov.governmentId, type: 'formation', title: `${partyAbb} formed a ${govType}.`, gameDate: 'May 2026', createdAt: new Date().toISOString() },
      { eventId: Math.random().toString(36).substring(2, 10), governmentId: currentGov.governmentId, type: 'pm', title: `${leaderName} became Prime Minister.`, gameDate: 'May 2026', createdAt: new Date().toISOString() },
      { eventId: Math.random().toString(36).substring(2, 10), governmentId: currentGov.governmentId, type: 'cabinet', title: `Cabinet sworn into office.`, gameDate: 'May 2026', createdAt: new Date().toISOString() },
      { eventId: Math.random().toString(36).substring(2, 10), governmentId: currentGov.governmentId, type: 'mandate', title: `Governing mandate established: Economic Renewal.`, gameDate: 'May 2026', createdAt: new Date().toISOString() },
      { eventId: Math.random().toString(36).substring(2, 10), governmentId: currentGov.governmentId, type: 'issues', title: `National issues briefing opened.`, gameDate: 'May 2026', createdAt: new Date().toISOString() },
    ];
  });

  const governmentRisk = [
    { riskId: 'promise', label: 'Promise Failure Risk', level: mandate ? 'Medium' : 'Low', reason: 'No laws/policies advanced yet to address mandate.' },
    { riskId: 'budget', label: 'Budget Pressure', level: 'Medium', reason: 'Mandate recommendations require high spending.' },
    { riskId: 'cabinet', label: 'Cabinet Instability', level: currentGov.cabinet?.some((m:any) => m.readinessLabel === 'Weak' || m.readinessLabel === 'Vacant') ? 'Medium' : 'Low', reason: 'Several ministries are weak or vacant.' },
    { riskId: 'public', label: 'Public Disappointment', level: 'Low', reason: 'Honeymoon period maintains baseline approval.' },
    { riskId: 'admin', label: 'Administrative Weakness', level: currentGov.cabinet?.find((m:any) => m.officeId === 'interior')?.readinessLabel === 'Weak' ? 'Medium' : 'Low', reason: 'Interior ministry state.' },
    { riskId: 'opposition', label: 'Opposition Pressure', level: govType === 'Minority Government' ? 'High' : 'Low', reason: govType === 'Minority Government' ? 'Relying on confidence supply.' : 'Strong majority.' },
    { riskId: 'scandal', label: 'Scandal Exposure', level: 'Low', reason: 'No active corruption.' },
  ];

  return {
    ...currentGov,
    pastElection: latestElection,
    parties: sortedParties,
    independentIndividuals: latestElection.independentIndividuals,
    parliamentSeats,
    majoritySeats: majorityReq,
    mandate,
    nationalIssues,
    publicNarrative,
    governmentRisk,
    policyPipeline,
    executiveTimeline
  };
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

  const [activeGovSubtab, setActiveGovSubtab] = useState<'Administration'|'Parliament'|'Cabinet'|'My Offices'|'Legislation'|'Lawbook'|'Records'>('Administration');
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
    const min = (govRecord.cabinet || govRecord.ministries)?.find((m: any) => m.ministryId === ministryId);
    if (!min || min.controllingPartyId !== ctx.partyId || min.ministryId === 'pm') return;

    if (!window.confirm(`Are you sure you want ${min.ministerName} to resign as ${min.officeName}? This office will become vacant.`)) return;

    const updatedGov = { ...govRecord };
    const updatedMinistries = (updatedGov.cabinet || updatedGov.ministries).map((m: any) => {
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

    updatedGov.cabinet = updatedMinistries;
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
    
    const min = (govRecord.cabinet || govRecord.ministries)?.find((m: any) => m.ministryId === ministryId);
    if (!min || min.controllingPartyId !== ctx.partyId || min.status !== 'Vacant') return;

    const fns = ['Aris', 'Bane', 'Cael', 'Dora', 'Elara', 'Fenn', 'Gael', 'Hale', 'Ira', 'Jace', 'Lyra', 'Nia', 'Orin', 'Quinn', 'Sia', 'Uri', 'Wren', 'Yara'];
    const lns = ['Voss', 'Tarn', 'Kest', 'Renn', 'Vale', 'Thorn', 'Lest', 'Gant', 'Vane', 'Sorn', 'Karn', 'Vell', 'Tess'];
    
    // Prevent duplicate names in current cabinet
    let newName = '';
    let isDuplicate = true;
    while(isDuplicate) {
      newName = `${fns[Math.floor(Math.random() * fns.length)]} ${lns[Math.floor(Math.random() * lns.length)]}`;
      isDuplicate = (govRecord.cabinet || govRecord.ministries).some((m: any) => m.ministerName === newName);
    }

    const updatedGov = { ...govRecord };
    const updatedMinistries = (updatedGov.cabinet || updatedGov.ministries).map((m: any) => {
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

    updatedGov.cabinet = updatedMinistries;
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
    const majorityReq = pastElection?.majoritySeats || 61;
    
    // Smaller compact chart
    const rows = 4;
    const rowRadii = [60, 80, 100, 120];
    const seatsPerRow = [20, 26, 33, 41]; // sums to 120
    const cx = 140;
    const cy = 135;
    
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
        <svg width="280" height="150" viewBox="0 0 280 150" className="w-full h-auto drop-shadow-lg max-w-[280px]">
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={3.5} fill={d.color} opacity={d.isGov ? 1 : 0.6} stroke={d.isGov ? 'rgba(212,169,31,0.5)' : 'none'} strokeWidth={d.isGov ? 1 : 0}>
              <title>{d.id === 'independent' ? 'IND · Independent Individuals' : 'MP · Party Member'}</title>
            </circle>
          ))}
          <text x={cx} y={cy - 20} textAnchor="middle" className="text-2xl font-bold font-mono" fill="#d4d4d8">
            {formatNumberUS(totalSeats)}
          </text>
          <text x={cx} y={cy - 5} textAnchor="middle" className="text-[9px] font-mono tracking-[0.2em] uppercase" fill="#71717a">
            SEATS
          </text>
          
          <line x1={cx} y1={cy - 60} x2={cx} y2="15" stroke="#71717a" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
          <text x={cx} y="10" textAnchor="middle" className="text-[8px] font-mono uppercase tracking-widest" fill="#71717a">
            Majority {majorityReq}
          </text>
        </svg>

        <div className="w-full mt-2 flex flex-col gap-4">
          <div>
            <div className="text-[9px] uppercase font-mono tracking-widest text-emerald-500/80 mb-2 font-bold">Government</div>
            {govGroups.length > 0 ? govGroups.map(g => (
              <div key={g.id} className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: g.color }} />
                  <span className="text-xs font-bold text-zinc-200">{g.abb} &middot; {g.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-500">{g.seats} seats</span>
              </div>
            )) : <div className="text-[11px] text-zinc-500">None</div>}
          </div>
          <div>
            <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 mb-2 font-bold">Opposition / Non-Party</div>
            {oppGroups.length > 0 ? oppGroups.map(g => (
              <div key={g.id} className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: g.color }} />
                  <span className="text-xs font-bold text-zinc-400">{g.abb} &middot; {g.name}</span>
                </div>
                <span className="text-xs font-mono text-zinc-500">{g.seats} seats</span>
              </div>
            )) : <div className="text-[11px] text-zinc-500">None</div>}
          </div>
        </div>
      </div>
    );
  };
  
  const currentPartyGov = govRecord.governingPartyId === ctx.partyId;
  const controlledMinistries = (govRecord.cabinet || []).filter((m: any) => m.controllingPartyId === ctx.partyId);
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
          {(['Administration', 'Parliament', 'Cabinet', 'My Offices', 'Legislation', 'Lawbook', 'Records'] as const).map(tab => (
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
        
        {['Legislation', 'Lawbook', 'Records'].includes(activeGovSubtab) && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-xs font-bold uppercase text-zinc-500 tracking-widest mb-2">Coming Soon</div>
            <div className="text-[11px] text-zinc-600 max-w-sm text-center">
              Bills, debates, voting records, and laws will be built after the parliament and ministry foundation.
            </div>
          </div>
        )}

        {activeGovSubtab === 'Administration' && (
          <div className="max-w-[1400px] mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6">
              
              {/* LEFT COLUMN: Administration & Mandate */}
              <div className="space-y-6">
                <div className="p-5 rounded-sm" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-6 w-full text-center border-b pb-2" style={{ borderColor: BORDER }}>
                    Current Administration
                  </div>
                  
                  {govRecord.governingPartyId ? (
                    <>
                      <h2 className="text-xl font-bold text-zinc-100 mb-1">
                        {govRecord.cabinet?.find((m:any) => m.officeId === 'pm')?.ministerName?.split(' ').pop() || govRecord.governingPartyName} Administration
                      </h2>
                      <div className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest mb-6">{govRecord.governmentType}</div>

                      <div className="space-y-4">
                        <div>
                          <div className="text-[9px] uppercase font-mono text-zinc-500 mb-0.5">Term Length</div>
                          <div className="text-xs font-bold text-zinc-300">48 Months</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-mono text-zinc-500 mb-0.5">Governing Party</div>
                          <div className="text-xs font-bold" style={{ color: ACCENT }}>{govRecord.governingPartyAbbreviation} &middot; {govRecord.governingPartyName}</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-mono text-zinc-500 mb-0.5">Mandate Strength</div>
                          <div className="text-xs font-bold text-zinc-300">{govRecord.mandate?.strength || 'Unknown'}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-zinc-400 text-sm font-bold mb-2">No Administration</div>
                      <div className="text-[10px] text-zinc-600">A player-led party must win government control to form an administration.</div>
                    </div>
                  )}
                </div>

                {govRecord.mandate && (
                  <div className="p-5 rounded-sm" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                    <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-4 w-full text-center border-b pb-2" style={{ borderColor: BORDER }}>
                      Governing Mandate
                    </div>
                    
                    <div className="text-[13px] font-bold text-zinc-100 mb-2">{govRecord.mandate.title}</div>
                    <div className="text-[10px] text-zinc-400 mb-4 leading-relaxed">{govRecord.mandate.publicExpectation}</div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="text-[8px] uppercase font-mono text-zinc-500 mb-1">Priority Demographics</div>
                        <div className="flex flex-wrap gap-1.5">
                          {govRecord.mandate.priorityBlocs.map((b:any, i:number) => (
                             <div key={i} className="text-[9px] font-mono px-1.5 py-0.5 bg-black/30 border border-white/5 rounded-sm text-zinc-400">{b}</div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase font-mono text-zinc-500 mb-1">Mandate Failure Risk</div>
                        <div className="text-[10px] text-red-400/80">{govRecord.mandate.ignoredRisk}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-5 rounded-sm" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-4 w-full text-center border-b pb-2" style={{ borderColor: BORDER }}>
                    Government Risk Factors
                  </div>
                  <div className="space-y-3">
                    {govRecord.governmentRisk?.map((r:any, i:number) => {
                      let color = 'text-emerald-500';
                      if (r.level === 'Medium') color = 'text-amber-500';
                      if (r.level === 'High') color = 'text-red-500';
                      return (
                        <div key={i} className="flex justify-between items-start">
                          <div>
                            <div className="text-[10px] font-bold text-zinc-300">{r.label}</div>
                            {r.level !== 'Low' && <div className="text-[9px] text-zinc-500 mt-0.5 max-w-[150px] leading-tight">{r.reason}</div>}
                          </div>
                          <div className={`text-[9px] uppercase font-mono font-bold ${color}`}>{r.level}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* CENTER COLUMN: Issues & Policy Pipeline */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Issues Board */}
                  <div className="p-5 rounded-sm min-h-[300px]" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                    <div className="flex justify-between items-center mb-6 border-b pb-3" style={{ borderColor: BORDER }}>
                      <div className="text-[11px] uppercase font-mono tracking-widest text-zinc-300 font-bold">National Issues</div>
                      <div className="text-[10px] font-mono text-zinc-500">{govRecord.nationalIssues?.length || 0} Active</div>
                    </div>
                    
                    <div className="space-y-3">
                      {govRecord.nationalIssues?.map((issue:any, i:number) => {
                         let statusColor = 'bg-zinc-800 text-zinc-400';
                         if (issue.status === 'Urgent') statusColor = 'bg-red-500/20 text-red-500 border border-red-500/20';
                         if (issue.status === 'Active') statusColor = 'bg-amber-500/20 text-amber-500 border border-amber-500/20';
                         return (
                           <div key={i} className="p-3 bg-black/20 border border-white/5 rounded-sm">
                             <div className="flex justify-between items-start mb-2">
                               <div className="text-xs font-bold text-zinc-200">{issue.title}</div>
                               <div className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded-sm ${statusColor}`}>{issue.status}</div>
                             </div>
                             <div className="flex gap-4 mt-3">
                               <div>
                                 <div className="text-[8px] uppercase font-mono text-zinc-500 mb-0.5">Responsible</div>
                                 <div className="text-[10px] text-zinc-400">{issue.responsibleOffice}</div>
                               </div>
                               <div>
                                 <div className="text-[8px] uppercase font-mono text-zinc-500 mb-0.5">Time Pressure</div>
                                 <div className="text-[10px] text-zinc-400">{issue.timePressure}</div>
                               </div>
                             </div>
                           </div>
                         )
                      })}
                      {!govRecord.nationalIssues?.length && (
                        <div className="text-center text-[10px] text-zinc-600 mt-8">No national issues reported.</div>
                      )}
                    </div>
                  </div>

                  {/* Policy Pipeline */}
                  <div className="p-5 rounded-sm min-h-[300px]" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                    <div className="flex justify-between items-center mb-6 border-b pb-3" style={{ borderColor: BORDER }}>
                      <div className="text-[11px] uppercase font-mono tracking-widest text-zinc-300 font-bold">Policy Pipeline</div>
                      <div className="text-[10px] font-mono text-zinc-500">{govRecord.policyPipeline?.length || 0} Files</div>
                    </div>

                    <div className="space-y-3">
                      {govRecord.policyPipeline?.map((pipe:any, i:number) => {
                         return (
                           <div key={i} className="p-3 bg-black/20 border border-white/5 rounded-sm flex items-center justify-between">
                             <div>
                               <div className="text-xs font-bold text-zinc-300 mb-1">{pipe.title}</div>
                               <div className="text-[9px] text-zinc-500 font-mono">By: {pipe.responsibleOffice}</div>
                             </div>
                             <div className="text-right">
                               <div className="text-[8px] uppercase font-mono text-zinc-500 mb-1">Stage</div>
                               <div className="text-[10px] font-bold text-emerald-400">{pipe.stage}</div>
                             </div>
                           </div>
                         )
                      })}
                      {!govRecord.policyPipeline?.length && (
                        <div className="text-center text-[10px] text-zinc-600 mt-8">Policy pipeline empty.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-sm" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <div className="flex justify-between items-center mb-6 border-b pb-3" style={{ borderColor: BORDER }}>
                    <div className="text-[11px] uppercase font-mono tracking-widest text-zinc-300 font-bold">Executive Timeline</div>
                    <div className="text-[10px] font-mono text-zinc-500">Record of actions</div>
                  </div>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {govRecord.executiveTimeline ? govRecord.executiveTimeline.map((ev:any, i:number) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: ev.type === 'formation' ? ACCENT : '#52525b' }} />
                        <div>
                          <div className="text-xs text-zinc-300">{ev.title}</div>
                          <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{ev.gameDate}</div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-[10px] text-zinc-600 mt-8">No executive events recorded yet.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Cabinet Readiness */}
              <div className="space-y-6">
                <div className="p-5 rounded-sm" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <div className="text-[11px] uppercase font-mono tracking-widest text-zinc-300 font-bold mb-6 border-b pb-2" style={{ borderColor: BORDER }}>
                    Cabinet Readiness
                  </div>
                  
                  <div className="space-y-3">
                    {govRecord.cabinet?.map((min: any) => {
                      let rColor = '#a1a1aa';
                      if (min.readinessLabel === 'Strong') rColor = '#10b981';
                      if (min.readinessLabel === 'Stable') rColor = '#3b82f6';
                      if (min.readinessLabel === 'Unsteady') rColor = '#f59e0b';
                      if (min.readinessLabel === 'Weak') rColor = '#ef4444';
                      
                      return (
                        <div key={min.officeId} className="flex items-center gap-3 p-2 hover:bg-white/[0.02] rounded-sm transition-colors border border-transparent hover:border-white/5">
                          <div className="w-8 h-8 rounded-sm bg-black/40 border flex items-center justify-center shrink-0" style={{ borderColor: min.officeId === 'pm' ? ACCENT : 'rgba(255,255,255,0.05)' }}>
                            <span className="text-[10px] font-bold" style={{ color: min.officeId === 'pm' ? ACCENT : '#a1a1aa' }}>
                              {min.ministerName?.split(' ').map((n: string) => n[0]).join('').substring(0,2) || '?'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-zinc-200 truncate">{min.ministerName}</div>
                            <div className="text-[9px] text-zinc-500 font-mono uppercase truncate">{min.officeId === 'pm' ? 'Prime Minister' : min.officeName.replace(' Minister', '')}</div>
                          </div>
                          <div className="text-right shrink-0 w-16">
                            <div className="text-[8px] text-zinc-500 font-mono uppercase mb-0.5">State</div>
                            <div className="text-[10px] font-bold" style={{ color: rColor }}>{min.readinessLabel}</div>
                          </div>
                        </div>
                      )
                    })}
                    
                    {!govRecord.cabinet?.length && (
                      <div className="text-center text-[10px] text-zinc-500 py-4">Cabinet empty</div>
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-sm" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-4 w-full text-center border-b pb-2" style={{ borderColor: BORDER }}>
                    Public Narrative
                  </div>
                  {govRecord.publicNarrative ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-[8px] uppercase font-mono text-zinc-500 mb-1">Media Tone</div>
                        <div className="text-xs font-bold text-zinc-300">{govRecord.publicNarrative.mediaTone}</div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase font-mono text-zinc-500 mb-1">Citizen Expectation</div>
                        <div className="text-xs font-bold text-zinc-300">{govRecord.publicNarrative.citizenExpectation}</div>
                      </div>
                      <div className="p-3 bg-black/20 border border-white/5 rounded-sm italic text-[10px] text-zinc-400">
                        "{govRecord.publicNarrative.oppositionLine}"
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-[10px] text-zinc-500 py-4">No data</div>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        )}

{activeGovSubtab === 'Parliament' && (() => {
          const govPartyId = govRecord?.governingPartyId;
          const govPartyObj = (pastElection?.parties || []).find((p:any) => p.partyId === govPartyId);
          const governingSeats = govPartyObj ? govPartyObj.seats : 0;
          const majorityReq = pastElection?.majoritySeats || 61;
          const totalSeats = pastElection?.parliamentSeats || 120;
          
          let majorityStatusTitle = 'NO PLAYER-LED GOVERNMENT';
          let majorityStatusColor = '#a1a1aa'; // zinc-400
          let majorityStatusText = 'No government has been formed.';
          
          if (govPartyId) {
            if (governingSeats >= majorityReq) {
              majorityStatusTitle = 'MAJORITY SECURED';
              majorityStatusColor = ACCENT;
              majorityStatusText = `+${governingSeats - majorityReq} above majority`;
            } else {
              majorityStatusTitle = 'MINORITY GOVERNMENT';
              majorityStatusColor = '#f59e0b'; // amber-500
              majorityStatusText = `${majorityReq - governingSeats} seats short of majority`;
            }
          }

          return (
            <div className="mx-auto" style={{ maxWidth: '1560px', padding: '0 24px', marginBottom: '48px' }}>
              <div className="grid grid-cols-1 gap-5" style={{ gridTemplateColumns: 'minmax(0, 1fr)', '@media (min-width: 1050px)': { gridTemplateColumns: '350px 1fr' } } as any} 
                ref={(el) => { if(el) { if(window.innerWidth >= 1050) el.style.gridTemplateColumns = '350px 1fr'; else el.style.gridTemplateColumns = 'minmax(0, 1fr)'; } }}>
                
                {/* LEFT COLUMN: Compact 350px Fixed on desktop */}
                <div className="space-y-5" style={{ minWidth: '0' }}>
                  {/* Unified Chamber Makeup & Majority Card */}
                  <div className="p-5 rounded-sm flex flex-col" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                    <div className="text-[11px] uppercase font-mono tracking-widest text-zinc-300 font-bold mb-4 w-full border-b pb-3" style={{ borderColor: BORDER }}>
                      CURRENT PARLIAMENT
                    </div>
                    {renderSeatChart()}
                    
                    <div className="mt-6 pt-4 border-t" style={{ borderColor: BORDER }}>
                      <div className="text-[10px] uppercase font-mono tracking-widest font-bold mb-1" style={{ color: majorityStatusColor }}>
                        {majorityStatusTitle}
                      </div>
                      <div className="text-xs text-zinc-400">{majorityStatusText}</div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Flexible 1fr Legislative Floor */}
                <div className="space-y-5" style={{ minWidth: '0', flex: 1 }}>
                  {/* Legislative Floor Card */}
                  <div className="p-6 rounded-sm flex flex-col h-full min-h-[500px]" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-[14px] uppercase font-mono tracking-widest text-zinc-100 font-bold">LEGISLATIVE FLOOR</h2>
                        <p className="text-[11px] text-zinc-500 mt-1">Bills, debates, and votes currently before Drennia’s parliament.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="text-[9px] uppercase font-mono px-3 py-2 rounded-sm border border-amber-500 text-amber-500 bg-amber-500/10">Active Bills</button>
                        <button className="text-[9px] uppercase font-mono px-3 py-2 rounded-sm border border-zinc-700 text-zinc-400 hover:bg-white/5">Resolved</button>
                        <button className="text-[9px] uppercase font-mono px-3 py-2 rounded-sm border border-zinc-700 text-zinc-400 hover:bg-white/5">All Laws</button>
                        <button onClick={() => setActiveGovSubtab('Legislation')} className="text-[9px] uppercase font-bold tracking-widest px-4 py-2 rounded-sm bg-amber-500 text-black hover:bg-amber-400 ml-2">Propose Bill</button>
                      </div>
                    </div>
                    
                    <div className="flex gap-8 mb-8 border-b pb-5" style={{ borderColor: BORDER }}>
                      <div>
                        <div className="text-[9px] uppercase font-mono text-zinc-500 mb-1">Active Bills</div>
                        <div className="text-2xl font-bold text-zinc-200">0</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-mono text-zinc-500 mb-1">Voting Open</div>
                        <div className="text-2xl font-bold text-zinc-200">0</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-mono text-zinc-500 mb-1">Passed Laws</div>
                        <div className="text-2xl font-bold text-zinc-200">0</div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                      <div className="text-sm font-bold text-zinc-400 mb-2">No active bills before parliament.</div>
                      <div className="text-[11px] text-zinc-500 mb-6">Draft a bill from the Legislation tab to begin debate.</div>
                      <button onClick={() => setActiveGovSubtab('Legislation')} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors border text-amber-500 border-amber-500/30 hover:bg-amber-500/10">
                        Go to Legislation
                      </button>
                    </div>
                    
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <div className="text-[9px] font-mono text-zinc-500">
                        <span className="font-bold text-zinc-400">Note:</span> Independent Individuals automatically vote 30% Yes, 30% No, 40% NOTA on future bills.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
                {(govRecord.cabinet || []).map((min: any) => (
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

        {activeGovSubtab === 'My Offices' && (
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
