'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCharacterStore } from '../../../store/character.store';
import { LogoSVG } from '../../../components/LogoSVG';
import { PARTY_COLORS } from '../../../data/political-parties/partyLogos';
import type { RegisteredPoliticalParty } from '../../../data/political-parties/partyTypes';

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE  (calm dark olive / charcoal political-strategy style)
// ─────────────────────────────────────────────────────────────────────────────
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

export function formatMoney(value: number): string {
  if (value >= 1000000) {
    const m = value / 1000000;
    return '$' + (m % 1 === 0 ? m.toFixed(1) : m.toFixed(2)) + 'M';
  }
  return '$' + value.toLocaleString('en-US');
}

// ─────────────────────────────────────────────────────────────────────────────
// IDEOLOGY MAP
// ─────────────────────────────────────────────────────────────────────────────

const IDEOLOGY_NAMES: Record<string, string> = {
  capitalism: 'Capitalism', communism: 'Communism',
  free_market: 'Free Market Liberalism', state_intervention: 'State Interventionism',
  conservatism: 'Conservatism', progressivism: 'Progressivism',
  authoritarian: 'Authoritarian Order', democratic_reform: 'Democratic Reform',
  nationalism: 'Nationalism', globalism: 'Globalism',
  industrialism: 'Industrialism', environmentalism: 'Environmentalism',
  welfare_state: 'Welfare State', fiscal_conservatism: 'Fiscal Conservatism',
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MAIN_TABS = ['Home', 'Actions', 'Government', 'Nation', 'World', 'Ledger'] as const;
type MainTab = (typeof MAIN_TABS)[number];

const CATEGORY_COLORS: Record<string, string> = {
  Outreach: '#3d7a6e',
  Strategy: '#5a4b8a',
  Internal: '#2d5a8a',
  Policy: '#3a6642',
  Campaign: '#7a3a3a',
  Admin: '#4a5045',
  Network: '#2d6a7a',
  Media: '#7a5a1a',
  Funding: '#2d7a5a',
  Growth: '#7a4a2a',
  Research: '#3a4a7a',
  Legal: '#3a3a4a',
  Politics: '#7a2a2a',
};

const POSITION_DEFINITIONS: Omit<Position, 'filledBy'>[] = [
  {
    id: 'party_leader',
    title: 'Party Leader',
    shortTitle: 'Leader',
    description: 'The founder and public face of the party. Controls major identity, leadership, promises, and party-level decisions.',
    actions: [
      { id: 'pl_speech', name: 'Give Public Speech', description: 'Build early recognition through a public address to citizens.', category: 'Outreach' },
      { id: 'pl_direction', name: 'Set Party Direction', description: "Define the movement's immediate political focus and goals.", category: 'Strategy' },
      { id: 'pl_promise', name: 'Declare Main Promise', description: "Announce the central promise that defines the party's campaign.", category: 'Campaign' },
      { id: 'pl_dissolve', name: 'Dissolve Political Party', description: 'Permanently dissolve your registered political party. This releases the party abbreviation and removes the party from public records.', category: 'Leadership' },
    ],
  },
  {
    id: 'treasurer',
    title: 'Treasurer',
    shortTitle: 'Treasurer',
    description: 'Manages party funds, donations, financial discipline, fundraising, and budget-related work.',
    actions: [
      { id: 'smallDonationDrive', name: 'Small Donation Drive', description: 'Run a small public donation campaign to grow party funds.', category: 'Funding' },
      { id: 'tr_fees', name: 'Membership Fee Collection', description: 'Collect monthly dues from registered party members.', category: 'Funding' },
      { id: 'tr_business', name: 'Business Funding Meeting', description: 'Meet business owners to secure financial backing.', category: 'Funding' },
      { id: 'tr_audit', name: 'Audit Party Accounts', description: 'Review financial records to ensure accuracy and compliance.', category: 'Admin' },
    ],
  },
  {
    id: 'campaignMediaManager',
    title: 'Campaign & Media Manager',
    shortTitle: 'Campaign',
    description: 'Handles rallies, public campaigns, voter outreach, media messaging, party statements, interviews, and public visibility.',
    actions: [
      { id: 'doorToDoorCampaign', name: 'Door-to-Door Campaign', description: 'Canvass residential areas to meet voters directly.', category: 'Campaign' },
      { id: 'cm_rally', name: 'Hold Local Rally', description: 'Organize a public rally to energize supporters.', category: 'Campaign' },
      { id: 'cm_survey', name: 'Voter Survey', description: 'Conduct surveys to understand voter priorities.', category: 'Research' },
      { id: 'meo_statement', name: 'Publish Party Statement', description: 'Issue a formal written declaration from the party.', category: 'Media' },
      { id: 'giveInterview', name: 'Give Interview', description: 'Participate in a media interview to communicate party stance.', category: 'Media' },
    ],
  },
  {
    id: 'membershipOfficer',
    title: 'Membership Officer',
    shortTitle: 'Membership',
    description: "Grows party membership, recruits volunteers, expands grassroots organization, and manages supporter recruitment.",
    actions: [
      { id: 'mo_recruit', name: 'Recruit Members', description: 'Run a targeted campaign to attract new party members.', category: 'Growth' },
      { id: 'mo_youth', name: 'Start Youth Membership Drive', description: 'Target young citizens for party membership enrollment.', category: 'Growth' },
      { id: 'openMembershipBooth', name: 'Open Membership Booth', description: 'Set up a public registration booth in a busy location.', category: 'Outreach' },
    ],
  },
  {
    id: 'publicImageManager',
    title: 'Public Image Manager',
    shortTitle: 'Image',
    description: 'Manages the leader’s public image, party identity, branding, messaging style, visual image, and political presentation.',
    actions: [
      { id: 'pim_redo_char', name: 'Redo Character', description: 'Update your character’s personal details while keeping your party, country, and progress intact.', category: 'Identity' },
      { id: 'pim_rebrand_party', name: 'Rebrand Political Party', description: 'Update your party name, abbreviation, logo, color, description, and ideological presentation.', category: 'Branding' },
      { id: 'pim_leader_image', name: 'Refresh Leader Image', description: 'Run a targeted media campaign to improve the leader’s personal appeal.', category: 'Image' },
      { id: 'pim_party_branding', name: 'Improve Party Branding', description: 'Modernize party visuals and messaging to attract a broader audience.', category: 'Branding' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACTION MATH HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function getNationActionCostIndex(countryInfo: any) {
  const gdpPerCapita = Number(countryInfo?.gdpPerCapita) || 28400;
  const gdpInBillions = Number(countryInfo?.gdp) ? Number(countryInfo.gdp) / 1e9 : 88;
  const populationInMillions = Number(countryInfo?.population) ? Number(countryInfo.population) / 1e6 : 3.1;
  const idx = Math.pow(gdpPerCapita / 28400, 0.7) * Math.pow(gdpInBillions / 88, 0.2) * Math.pow(populationInMillions / 3.1, 0.1);
  return Math.max(0.35, Math.min(4.0, idx));
}

export function rollStaffOutcome(skillVal: number | string): number {
  const skill = Number(skillVal) || 50;
  const r = Math.random() * 100;
  if (skill <= 30) {
    if (r < 25) return -1; if (r < 60) return 0; if (r < 85) return 1; if (r < 95) return 2; return 3;
  } else if (skill <= 50) {
    if (r < 15) return -1; if (r < 45) return 0; if (r < 75) return 1; if (r < 95) return 2; return 3;
  } else if (skill <= 60) {
    if (r < 10) return -1; if (r < 35) return 0; if (r < 65) return 1; if (r < 90) return 2; return 3;
  } else if (skill <= 70) {
    if (r < 5) return -1; if (r < 25) return 0; if (r < 50) return 1; if (r < 80) return 2; if (r < 95) return 3; return 4;
  } else if (skill <= 80) {
    if (r < 3) return -1; if (r < 15) return 0; if (r < 35) return 1; if (r < 65) return 2; if (r < 90) return 3; return 4;
  } else if (skill <= 90) {
    if (r < 2) return -1; if (r < 10) return 0; if (r < 25) return 1; if (r < 50) return 2; if (r < 75) return 3; if (r < 90) return 4; return 5;
  } else {
    if (r < 5) return 0; if (r < 15) return 1; if (r < 35) return 2; if (r < 60) return 3; if (r < 80) return 4; if (r < 92) return 5; return 6;
  }
}

export function calculateActionOutcomeScore(staffRoll: number, investmentMultiplier: number, traitBonus: number, loyalty: number, risk: string, stability: number): number {
  let loyaltyMod = 0;
  if (loyalty >= 80) loyaltyMod = 0.2;
  else if (loyalty >= 60) loyaltyMod = 0.1;
  else if (loyalty >= 40) loyaltyMod = 0;
  else if (loyalty >= 25) loyaltyMod = -0.3;
  else loyaltyMod = -0.5;

  let riskMod = 0;
  if (risk === 'Very Low') riskMod = 0.1;
  else if (risk === 'Low') riskMod = 0;
  else if (risk === 'Medium') riskMod = -0.2;
  else if (risk === 'High') riskMod = -0.4;

  const stabilityMod = Math.max(-0.3, Math.min(0.3, (stability - 50) / 100));

  const finalScore = (staffRoll * investmentMultiplier) + traitBonus + loyaltyMod + stabilityMod + riskMod;
  return Math.max(-1, Math.min(10, finalScore));
}

export function getResultQuality(score: number): string {
  if (score < 0) return 'Failed';
  if (score < 2) return 'Weak';
  if (score < 4) return 'Small';
  if (score < 6) return 'Normal';
  if (score < 8) return 'Strong';
  if (score < 9.5) return 'Major';
  return 'Exceptional';
}

// ─────────────────────────────────────────────────────────────────────────────
// ELECTION MATH HELPERS
// Temporary local election strength preview. In multiplayer, final election
// results must be calculated server-side from validated party stats.
// ─────────────────────────────────────────────────────────────────────────────

export function calculateElectionStrength({
  partyStats,
  allocatedFunds,
  hasMainPromise,
}: {
  partyStats: any;
  allocatedFunds: number;
  hasMainPromise: boolean;
}): {
  base: number;
  pollingPower: number;
  recognitionPower: number;
  memberPower: number;
  electionFundPower: number;
  publicTrustPower: number;
  campaignStrengthPower: number;
  mediaPresencePower: number;
  mainPromiseBonus: number;
  controversyPenalty: number;
  baseStrength: number;
  lowStrength: number;
  highStrength: number;
} {
  const support = partyStats?.support || 0.1;
  const recognition = partyStats?.recognition || 0;
  const members = Math.max(1, partyStats?.members || 1);
  const publicTrust = partyStats?.publicTrust || 0;
  const campaignStrength = partyStats?.campaignStrength || 0;
  const mediaPresence = partyStats?.mediaPresence || 0;
  const controversy = partyStats?.controversy || 0;

  const base = 6;
  const pollingPower = support * 12;
  const recognitionPower = recognition * 4;
  const memberPower = Math.min(Math.log10(members + 1) * 5, 30);
  const electionFundPower = Math.min(Math.log(1 + allocatedFunds / 100000) * 8, 35);
  const publicTrustPower = publicTrust * 2;
  const campaignStrengthPower = campaignStrength * 2;
  const mediaPresencePower = mediaPresence * 1.5;
  const mainPromiseBonus = hasMainPromise ? 8 : 0;
  const controversyPenalty = controversy * 3;

  const baseStrength = Math.max(1,
    base + pollingPower + recognitionPower + memberPower +
    electionFundPower + publicTrustPower + campaignStrengthPower +
    mediaPresencePower + mainPromiseBonus - controversyPenalty
  );

  return {
    base,
    pollingPower,
    recognitionPower,
    memberPower,
    electionFundPower,
    publicTrustPower,
    campaignStrengthPower,
    mediaPresencePower,
    mainPromiseBonus,
    controversyPenalty,
    baseStrength,
    lowStrength: baseStrength * 0.94,
    highStrength: baseStrength * 1.06,
  };
}

export function calculateIndependentStrength({
  registeredPlayerPartiesCount,
  totalPlayerRecognition,
}: {
  registeredPlayerPartiesCount: number;
  totalPlayerRecognition: number;
}): number {
  // Independent Individuals are not AI parties; they represent non-party political space.
  const baseScore = 500;
  const registeredPartyMod = 1 - Math.min((registeredPlayerPartiesCount - 1) * 0.07, 0.35);
  const recognitionMod = 1 - Math.min(totalPlayerRecognition * 0.0025, 0.25);
  return Math.max(220, baseScore * registeredPartyMod * recognitionMod);
}

export function getElectionStatusLabel(seatMidpoint: number, independentSeats: number, totalSeats: number): string {
  if (seatMidpoint === 0) return 'Failed to enter parliament';
  if (seatMidpoint <= 3) return 'Tiny parliamentary presence';
  if (seatMidpoint <= 12) return 'Minor party';
  if (seatMidpoint <= 30) return 'Rising party';
  if (seatMidpoint <= 60) return 'Major party / minority government possible';
  if (seatMidpoint >= 61) return 'Majority government';
  if (independentSeats > totalSeats / 2) return 'Independent-dominated parliament likely';
  return 'Minor party';
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0] ?? '').join('').slice(0, 2).toUpperCase() || '??';
}

// ─────────────────────────────────────────────────────────────────────────────
// SALARY LOGIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function parseMoneyToNumber(money: number | string): number {
  const num = Number(money);
  return isNaN(num) ? 0 : num;
}

function parseGDPInBillions(gdp: number | string): number {
  const num = Number(gdp);
  return isNaN(num) ? 88 : num / 1e9;
}

function parsePopulationInMillions(pop: number | string): number {
  const num = Number(pop);
  return isNaN(num) ? 3.1 : num / 1e6;
}

function calculateNationSalaryIndex(countryInfo: any) {
  const gdpInBillions = parseGDPInBillions(countryInfo?.gdp || 88000000000);
  const populationInMillions = parsePopulationInMillions(countryInfo?.population || 3100000);
  const stability = Number(countryInfo?.stability) || 67;
  const government = countryInfo?.government || 'Parliamentary';

  const economyScaleMultiplier = Math.max(0.75, Math.min(2.5, Math.sqrt(gdpInBillions / 100)));
  const populationComplexityMultiplier = Math.max(0.75, Math.min(2.0, Math.sqrt(populationInMillions / 5)));
  const stabilityMultiplier = Math.max(0.85, Math.min(1.25, 0.85 + (stability / 100) * 0.35));

  let governmentMultiplier = 1.00;
  if (government === 'Parliamentary') governmentMultiplier = 1.08;
  else if (government === 'Presidential') governmentMultiplier = 1.05;
  else if (government === 'Constitutional Monarchy') governmentMultiplier = 1.10;
  else if (government === 'Monarchy') governmentMultiplier = 1.00;
  else if (government === 'Military Government') governmentMultiplier = 0.95;
  else if (government === 'Transitional Government') governmentMultiplier = 0.90;

  return { economyScaleMultiplier, populationComplexityMultiplier, stabilityMultiplier, governmentMultiplier };
}

function calculateStaffSalary(countryInfo: any, positionId: string, skill: number, candidateType: 'Safe' | 'Skilled' | 'Risky Elite'): number {
  // Developer Comment: Temporary frontend salary model. In multiplayer, staff salary must be calculated or validated server-side using nation GDP, GDP per capita, population, stability, and government type.
  const gdpPerCapita = Number(countryInfo?.gdpPerCapita) || 28400;
  const averageMonthlyIncome = gdpPerCapita / 12;

  const { economyScaleMultiplier, populationComplexityMultiplier, stabilityMultiplier, governmentMultiplier } = calculateNationSalaryIndex(countryInfo);

  let rolePrestigeMultiplier = 1.00;
  if (positionId === 'treasurer') rolePrestigeMultiplier = 1.35;
  else if (positionId === 'campaignMediaManager') rolePrestigeMultiplier = 1.35;
  else if (positionId === 'publicImageManager') rolePrestigeMultiplier = 1.25;
  else if (positionId === 'membershipOfficer') rolePrestigeMultiplier = 1.00;

  const skillMultiplier = 0.75 + (skill / 100) * 0.95;

  let candidateTypeMultiplier = 1.0;
  if (candidateType === 'Safe') candidateTypeMultiplier = 0.95;
  else if (candidateType === 'Skilled') candidateTypeMultiplier = 1.20;
  else if (candidateType === 'Risky Elite') candidateTypeMultiplier = 1.55;

  const salary = averageMonthlyIncome * rolePrestigeMultiplier * skillMultiplier * candidateTypeMultiplier * economyScaleMultiplier * populationComplexityMultiplier * stabilityMultiplier * governmentMultiplier;
  
  return Math.round(salary / 50) * 50;
}

// ─────────────────────────────────────────────────────────────────────────────
// HIRE STAFF MODAL
// ─────────────────────────────────────────────────────────────────────────────

function HireStaffModal({ positionId, positionTitle, onClose, onHireSuccess, countryInfo }: { positionId: string; positionTitle: string; onClose: () => void; onHireSuccess: (candidate: any) => void; countryInfo: any }) {
  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    const cands: any[] = [];
    const firstNames = ['Aris', 'Bane', 'Cael', 'Dora', 'Elara', 'Fenn', 'Gael', 'Hale', 'Ira', 'Jace', 'Lyra', 'Nia', 'Orin', 'Quinn', 'Sia', 'Uri', 'Wren', 'Yara'];
    const lastNames = ['Voss', 'Tarn', 'Kest', 'Renn', 'Vale', 'Thorn', 'Lest', 'Gant', 'Vane', 'Sorn', 'Karn', 'Vell', 'Tess'];
    
    const types: ('Safe' | 'Skilled' | 'Risky Elite')[] = ['Safe', 'Skilled', 'Risky Elite'];
    
    types.forEach((type) => {
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      let skill = 50;
      let loyalty = 50;
      
      if (type === 'Safe') {
        skill = Math.floor(40 + Math.random() * 30); // 40-69
        loyalty = Math.floor(80 + Math.random() * 20); // 80-99
      } else if (type === 'Skilled') {
        skill = Math.floor(70 + Math.random() * 15); // 70-84
        loyalty = Math.floor(50 + Math.random() * 30); // 50-79
      } else { // Risky Elite
        skill = Math.floor(85 + Math.random() * 15); // 85-99
        loyalty = Math.floor(10 + Math.random() * 30); // 10-39
      }
      
      const age = Math.floor(25 + Math.random() * 40);
      const finalSalary = calculateStaffSalary(countryInfo, positionId, skill, type);

      let risk = 'Low';
      if (type === 'Safe') risk = Math.random() < 0.5 ? 'Very Low' : 'Low';
      else if (type === 'Skilled') risk = Math.random() < 0.5 ? 'Low' : 'Medium';
      else risk = 'High';

      let allTraits = ['Charismatic', 'Connected', 'Organized', 'Ruthless', 'Popular', 'Wealthy', 'Respected'];
      if (positionId === 'treasurer') allTraits = ['Careful Accountant', 'Elite Donor Network', 'Business Circle', 'Anti-Corruption Auditor'];
      else if (positionId === 'campaignMediaManager') allTraits = ['Grassroots Organizer', 'Charismatic Planner', 'Media Friendly', 'Sharp Debater', 'Urban Campaigner', 'Rally Organizer', 'Public Messaging Expert', 'Newspaper Contact'];
      else if (positionId === 'publicImageManager') allTraits = ['Image Consultant', 'Public Branding Expert', 'Reputation Handler', 'Political Stylist', 'Message Designer', 'Brand Strategist', 'Crisis Image Planner'];
      else if (positionId === 'membershipOfficer') allTraits = ['Youth Organizer', 'Community Recruiter', 'Grassroots Connector', 'Activist Network'];

      const trait = allTraits[Math.floor(Math.random() * allTraits.length)];

      cands.push({
        id: Math.random().toString(36).substring(2, 9),
        name: `${fn} ${ln}`,
        age,
        skill,
        loyalty,
        salary: finalSalary,
        status: 'Hired',
        type,
        risk,
        trait
      });
    });
    setCandidates(cands);
  }, [countryInfo, positionId]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleHire = (cand: any) => {
    // Developer Comment: Temporary local hiring. In multiplayer, hiring must be validated server-side.
    try {
      const staffRaw = localStorage.getItem('worldr_party_staff');
      const staff = staffRaw ? JSON.parse(staffRaw) : {};
      staff[positionId] = cand;
      localStorage.setItem('worldr_party_staff', JSON.stringify(staff));
      onHireSuccess(cand);
    } catch(e) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md overflow-hidden"
        style={{ background: PANEL, border: `1px solid ${BORDER}`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', borderRadius: '2px' }}>
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="w-8 h-8 flex items-center justify-center shrink-0"
            style={{ background: `${ACCENT}14`, border: `1px solid ${ACCENT}30`, borderRadius: '2px' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: TEXT }}>Hire {positionTitle}</div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] mt-0.5" style={{ color: MUTED }}>Candidate Selection</div>
          </div>
        </div>
        
        <div className="p-5 space-y-3">
          {candidates.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3" style={{ background: PANEL2, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
              <div>
                <div className="font-bold text-sm text-zinc-200">{c.name}</div>
                <div className="flex items-center gap-3 mt-1.5">
                   <div className="text-[10px]"><span className="text-zinc-500">Age:</span> <span className="text-zinc-300 font-mono">{c.age}</span></div>
                   <div className="text-[10px]"><span className="text-zinc-500">Skill:</span> <span className="text-amber-500 font-mono font-bold">{c.skill}</span></div>
                   <div className="text-[10px]"><span className="text-zinc-500">Loyalty:</span> <span className="text-blue-400 font-mono font-bold">{c.loyalty}</span></div>
                </div>
                <div className="text-[10px] mt-1.5"><span className="text-zinc-500">Type:</span> <span className="text-zinc-300 font-mono">{c.type}</span></div>
                <div className="text-[10px] mt-0.5"><span className="text-zinc-500">Salary:</span> <span className="text-emerald-500 font-mono font-bold">{formatMoney(c.salary)} / month</span></div>
              </div>
              <button type="button" onClick={() => handleHire(c)}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75 shrink-0"
                style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}28`, color: ACCENT, borderRadius: '2px' }}>
                Hire
              </button>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 flex justify-center">
          <button type="button" onClick={onClose}
            className="px-6 py-2 text-xs font-semibold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75"
            style={{ color: MUTED }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEFT COLUMN — POSITION LIST
// ─────────────────────────────────────────────────────────────────────────────

function PositionList({
  positions,
  selectedId,
  onSelect,
  accentColor,
}: {
  positions: Position[];
  selectedId: string;
  onSelect: (id: string) => void;
  accentColor: string;
}) {
  const filled = positions.filter((p) => p.filledBy).length;

  return (
    <div className="flex flex-col h-full overflow-hidden"
      style={{ background: PANEL, borderRight: `1px solid ${BORDER}` }}>
      {/* Header */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="text-[8px] font-mono uppercase tracking-[0.26em] mb-0.5" style={{ color: MUTED }}>Party HQ</div>
        <div className="font-bold text-[11.5px]" style={{ color: TEXT }}>Party Positions</div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {positions.map((pos) => {
          const isSelected = pos.id === selectedId;
          const isFilled = !!pos.filledBy;
          return (
            <button key={pos.id} id={`position-${pos.id}`} type="button"
              onClick={() => onSelect(pos.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all duration-100"
              style={{
                background: isSelected ? 'rgba(212,169,31,0.08)' : 'transparent',
                borderLeft: isSelected ? '2px solid #d4a91f' : '2px solid transparent',
                borderBottom: `1px solid ${BORDER}40`,
              }}>
              {/* Avatar */}
              <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[9px] font-bold font-mono"
                style={{
                  background: isFilled ? `${accentColor}18` : `rgba(255,255,255,0.03)`,
                  border: `1px solid ${isFilled ? accentColor + '35' : BORDER}`,
                  borderRadius: '2px',
                  color: isFilled ? accentColor : MUTED,
                }}>
                {isFilled ? getInitials(pos.filledBy!.name) : '—'}
              </div>
              {/* Text */}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold leading-tight truncate"
                  style={{ color: isSelected ? TEXT : isFilled ? '#b8bcb4' : '#5a6058' }}>
                  {pos.title}
                </div>
                <div className="text-[8.5px] font-mono mt-0.5 truncate"
                  style={{ color: isFilled ? `${accentColor}70` : '#3d4238' }}>
                  {isFilled ? pos.filledBy!.name : 'Vacant'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer count */}
      <div className="px-3 py-2 shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
        <p className="font-mono text-[7.5px] uppercase tracking-widest" style={{ color: '#3d4238' }}>
          {filled} Filled · {positions.length - filled} Vacant
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DUTY ROW (full-width horizontal)
// ─────────────────────────────────────────────────────────────────────────────

function DutyRow({ action, positionTitle, accentColor, isFilled, onTrigger, ctx }: { action: PartyAction; positionTitle: string; accentColor: string; isFilled?: boolean; onTrigger?: (id: string) => void; ctx?: PlayerCtx }) {
  const catColor = CATEGORY_COLORS[action.category] ?? '#3a4238';
  const isDissolve = action.id === 'pl_dissolve';
  const isRedoChar = action.id === 'pim_redo_char';
  const isRebrandParty = action.id === 'pim_rebrand_party';
  
  const implementedIds = ['mo_recruit', 'smallDonationDrive', 'pl_promise', 'cm_rally', 'meo_statement', 'doorToDoorCampaign', 'giveInterview', 'openMembershipBooth', 'pim_redo_char', 'pim_rebrand_party', 'pl_dissolve', 'cm_survey'];
  const isImplementedAction = implementedIds.includes(action.id);
  
  let preconditionError = '';
  
  const isLockedByPrecondition = !!preconditionError;

  const ACTION_HINTS: Record<string, string> = {
    'mo_recruit': '[Members ++++] [Recognition ++] [Party Funds --] [Internal Unity -]',
    'smallDonationDrive': '[Party Funds +++] [Recognition +] [Public Trust -]',
    'pl_promise': '[Recognition ++] [Polling Support +] [Party Funds -] [Flexibility -]',
    'cm_rally': '[Recognition +++] [Polling Support ++] [Public Trust +] [Party Funds --] [Controversy -]',
    'meo_statement': '[Media Presence ++] [Recognition +] [Controversy -] [Polling Support -]',
    'doorToDoorCampaign': '[Public Trust +++] [Polling Support ++] [Recognition +] [Party Funds -] [Controversy -]',
    'giveInterview': '[Media Presence ++++] [Recognition ++] [Polling Support +] [Controversy -] [Public Trust -]',
    'openMembershipBooth': '[Members +++] [Recognition +] [Public Trust +] [Party Funds -] [Polling Support -]',
    'pim_redo_char': '[Identity Refresh +] [Leader Image +] [Party Funds ----]',
    'pim_rebrand_party': '[Party Identity +++] [Recognition +] [Party Funds ----] [Internal Unity -]',
    'pl_dissolve': '[Delete Party]'
  };
  const effectHint = ACTION_HINTS[action.id] || 'Effect hint: Coming soon';

  const renderEffectHint = (hintString: string) => {
    if (!hintString || hintString === 'Effect hint: Coming soon') {
      return <p className="text-[9px] mt-0.5 leading-snug truncate" style={{ color: '#68735b' }}>{hintString}</p>;
    }
    
    // Split by tags e.g. "[Public Trust +++]"
    const parts = hintString.split(/(?=\[)|(?<=\])/g);
    
    return (
      <div className="mt-1.5 flex flex-wrap gap-1 items-center">
        <span className="text-[9px] text-zinc-500 mr-0.5">Effects:</span>
        {parts.map((p, i) => {
          const str = p.trim();
          if (!str) return null;
          if (str.startsWith('[') && str.endsWith(']')) {
            const inner = str.slice(1, -1);
            let colorClass = 'text-zinc-400';
            let bgClass = 'bg-zinc-500/10 border-zinc-500/20';
            
            if (inner === 'Delete Party') {
              colorClass = 'text-red-500 font-bold';
              bgClass = 'bg-red-500/20 border-red-500/40';
            } else if (inner.includes('+')) {
              colorClass = 'text-emerald-400';
              bgClass = 'bg-emerald-500/10 border-emerald-500/20';
            } else if (inner.includes('-')) {
              colorClass = 'text-red-400';
              bgClass = 'bg-red-500/10 border-red-500/20';
            }
            
            return (
              <span key={i} className={`inline-block px-1.5 py-[1px] rounded-sm text-[8px] font-mono tracking-wide border ${colorClass} ${bgClass}`}>
                {inner}
              </span>
            );
          }
          return null; // Ignore plain text between tags if any
        })}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3 transition-colors duration-100"
      style={{
        borderBottom: `1px solid ${BORDER}50`,
        background: 'transparent',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = `rgba(255,255,255,0.018)`)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>

      {/* Left: name + tags + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-semibold text-[12.5px]" style={{ color: TEXT }}>{action.name}</span>
          {/* Category tag */}
          {isDissolve ? (
            <>
              <span className="text-[8px] font-mono font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '2px',
                }}>
                Danger
              </span>
            </>
          ) : isRedoChar || isRebrandParty ? (
            <span className="text-[8px] font-mono font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
              style={{
                background: 'rgba(212,169,31,0.12)',
                color: '#d4a91f',
                border: '1px solid rgba(212,169,31,0.25)',
                borderRadius: '2px',
              }}>
              Image
            </span>
          ) : (
            <span className="text-[8px] font-mono font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
              style={{
                background: `${catColor}28`,
                color: `${catColor}d0`,
                border: `1px solid ${catColor}50`,
                borderRadius: '2px',
              }}>
              {action.category}
            </span>
          )}
          {/* Position tag */}
          <span className="text-[8px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5"
            style={{
              background: `${accentColor}0c`,
              color: `${accentColor}60`,
              border: `1px solid ${accentColor}20`,
              borderRadius: '2px',
            }}>
            {positionTitle}
          </span>
        </div>
        <p className="text-[11px] leading-snug truncate" style={{ color: MUTED }}>{action.description}</p>
        {renderEffectHint(effectHint)}
      </div>

      {/* Right: Coming Soon or Danger Action */}
      <div className="shrink-0 flex items-center">
        {isDissolve ? (
          <button type="button"
            onClick={() => onTrigger && onTrigger(action.id)}
            className="text-[8.5px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 transition-colors hover:bg-red-800/30"
            style={{
              color: '#f87171',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.28)',
              borderRadius: '2px',
              cursor: 'pointer',
            }}>
            Danger / Requires Confirmation
          </button>
        ) : isRedoChar ? (
          <button type="button"
            disabled={!isFilled || (ctx?.partyFunds ?? 0) < 500000}
            onClick={() => onTrigger && onTrigger(action.id)}
            className="text-[8.5px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 transition-colors hover:bg-amber-800/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            style={{
              color: (!isFilled || (ctx?.partyFunds ?? 0) < 500000) ? '#4a5045' : '#d4a91f',
              background: (!isFilled || (ctx?.partyFunds ?? 0) < 500000) ? 'rgba(255,255,255,0.01)' : 'rgba(212,169,31,0.08)',
              border: (!isFilled || (ctx?.partyFunds ?? 0) < 500000) ? `1px solid ${BORDER}` : '1px solid rgba(212,169,31,0.28)',
              borderRadius: '2px',
              cursor: (!isFilled || (ctx?.partyFunds ?? 0) < 500000) ? 'not-allowed' : 'pointer',
            }}>
            {!isFilled ? "Hire a Public Image Manager to use image and identity actions." : ((ctx?.partyFunds ?? 0) < 500000) ? "Insufficient party funds. Requires $500,000." : "$500,000 · Edit Character"}
          </button>
        ) : isRebrandParty ? (
          <button type="button"
            disabled={!isFilled || (ctx?.partyFunds ?? 0) < 500000}
            onClick={() => onTrigger && onTrigger(action.id)}
            className="text-[8.5px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 transition-colors hover:bg-amber-800/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            style={{
              color: (!isFilled || (ctx?.partyFunds ?? 0) < 500000) ? '#4a5045' : '#d4a91f',
              background: (!isFilled || (ctx?.partyFunds ?? 0) < 500000) ? 'rgba(255,255,255,0.01)' : 'rgba(212,169,31,0.08)',
              border: (!isFilled || (ctx?.partyFunds ?? 0) < 500000) ? `1px solid ${BORDER}` : '1px solid rgba(212,169,31,0.28)',
              borderRadius: '2px',
              cursor: (!isFilled || (ctx?.partyFunds ?? 0) < 500000) ? 'not-allowed' : 'pointer',
            }}>
            {!isFilled ? "Hire a Public Image Manager to use image and identity actions." : ((ctx?.partyFunds ?? 0) < 500000) ? "Insufficient party funds. Requires $500,000." : "$500,000 · Edit Party"}
          </button>
        ) : (
          <button type="button"
            disabled={!isImplementedAction || !isFilled || isLockedByPrecondition}
            onClick={() => { if (isImplementedAction && onTrigger) onTrigger(action.id); }}
            className={`text-[8.5px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 transition-colors ${isImplementedAction ? 'hover:bg-white/10' : ''}`}
            style={{
              color: isImplementedAction ? (isFilled && !isLockedByPrecondition ? '#b8bcb4' : '#3d4238') : '#4a5045',
              background: isImplementedAction ? (isFilled && !isLockedByPrecondition ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)') : 'transparent',
              border: `1px solid ${isImplementedAction ? (isFilled && !isLockedByPrecondition ? '#5a6058' : BORDER) : 'transparent'}`,
              borderRadius: '2px',
              cursor: isImplementedAction ? (isFilled && !isLockedByPrecondition ? 'pointer' : 'not-allowed') : 'default',
              opacity: isImplementedAction ? 1 : 0.3,
            }}>
            {!isImplementedAction ? 'Coming Soon' : (!isFilled ? `Locked - Hire ${positionTitle.split(' ')[0]}` : isLockedByPrecondition ? preconditionError : 'Execute Action')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTER — SELECTED POSITION PROFILE + DUTIES
// ─────────────────────────────────────────────────────────────────────────────

function PositionCenter({
  position,
  accentColor,
  partyName,
  countryName,
  ctx,
  onHire,
  onTrigger,
}: {
  position: Position;
  accentColor: string;
  partyName: string;
  countryName: string;
  ctx: PlayerCtx;
  onHire: (title: string) => void;
  onTrigger?: (id: string) => void;
}) {
  const isFilled = !!position.filledBy;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG }}>

      {/* ── Profile Card (compact horizontal) ── */}
      <div className="shrink-0 px-5 pt-4 pb-3">
        <div className="flex items-center gap-4 px-4 py-3"
          style={{
            background: PANEL,
            border: `1px solid ${isFilled ? accentColor + '28' : BORDER}`,
            borderRadius: '2px',
          }}>
          {/* Avatar */}
          <div className="w-12 h-12 flex items-center justify-center shrink-0 font-bold text-base font-mono"
            style={{
              background: isFilled ? `${accentColor}14` : `rgba(255,255,255,0.03)`,
              border: `1.5px solid ${isFilled ? accentColor + '35' : BORDER}`,
              borderRadius: '2px',
              color: isFilled ? accentColor : MUTED,
            }}>
            {isFilled ? getInitials(position.filledBy!.name) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>

          {/* Info block */}
          <div className="flex-1 min-w-0">
            {/* Role title */}
            <div className="text-[8px] font-mono uppercase tracking-[0.26em] mb-0.5"
              style={{ color: isFilled ? `${accentColor}70` : MUTED }}>
              {position.title}
            </div>

            {isFilled ? (
              <>
                <div className="font-bold text-[15px] leading-tight mb-1.5" style={{ color: TEXT }}>
                  {position.filledBy!.name}
                </div>
                {/* Stats row */}
                <div className="flex items-center gap-4 flex-wrap">
                  {[
                    { label: 'Age', value: position.filledBy!.age },
                    { label: 'Skill', value: position.filledBy!.skill },
                    { label: 'Loyalty', value: `${position.filledBy!.loyalty}%` },
                    { label: 'Status', value: position.filledBy!.status },
                    { label: 'Party', value: partyName !== '—' ? partyName : '—' },
                    { label: 'Country', value: countryName },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center gap-1">
                      <span className="text-[8px] font-mono uppercase tracking-[0.15em]" style={{ color: '#4a5045' }}>{f.label}</span>
                      <span className="text-[10px] font-semibold" style={{ color: '#8a9085' }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold text-sm mb-1" style={{ color: '#4a5045' }}>Vacant Position</div>
                <p className="text-[11px] leading-snug mb-2 max-w-sm" style={{ color: '#3d4238' }}>{position.description}</p>
                <button type="button" onClick={() => onHire(position.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-opacity duration-150 hover:opacity-80 mt-1"
                  style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}30`, color: accentColor, borderRadius: '2px' }}>
                  Hire Staff
                </button>
              </>
            )}
          </div>

          {/* Right: filled badge */}
          {isFilled && (
            <div className="shrink-0 hidden sm:flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                <span className="text-[8px] font-mono uppercase tracking-[0.2em]" style={{ color: `${accentColor}70` }}>Occupied</span>
              </div>
              <span className="text-[8px] font-mono" style={{ color: '#3d4238' }}>Founder</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Duties Section Label ── */}
      <div className="shrink-0 px-5 pb-2 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: BORDER }} />
        <span className="text-[8px] font-mono uppercase tracking-[0.26em]" style={{ color: MUTED }}>
          Available Duties · {position.actions.length} actions
        </span>
        <div className="h-px flex-1" style={{ background: BORDER }} />
      </div>

      {/* ── Duty Rows (full-width) ── */}
      <div className="flex-1 overflow-y-auto mx-5 mb-4"
        style={{ border: `1px solid ${BORDER}`, borderRadius: '2px', background: PANEL }}>
        {position.actions.map((action) => (
          <DutyRow key={action.id} action={action} positionTitle={position.title} accentColor={accentColor} isFilled={isFilled} onTrigger={onTrigger} ctx={ctx} />
        ))}
        {/* Coming soon footer note */}
        <div className="px-4 py-2.5 flex items-center gap-2"
          style={{ background: `${ACCENT}06`, borderTop: `1px solid ${BORDER}50` }}>
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-mono text-[8.5px]" style={{ color: '#3d4238' }}>
            Actions require investment, staff loyalty, and country conditions.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTY DROPDOWN (top bar)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// DISSOLVE PARTY CONFIRMATION MODAL
// ─────────────────────────────────────────────────────────────────────────────

function DissolvePartyModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-full max-w-sm overflow-hidden"
        style={{ background: '#1b1f1a', border: `1px solid #2d3329`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', borderRadius: '2px' }}>
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid #2d3329` }}>
          <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-sm text-zinc-100">Dissolve Political Party?</div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] mt-0.5 text-zinc-500">Requires Confirmation</div>
          </div>
        </div>
        <div className="px-5 py-6">
          <p className="text-[11px] leading-relaxed text-zinc-400">
            This will permanently dissolve your political party, remove it from public notices, release its abbreviation, and return you to political party creation. Your character will remain.
          </p>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', borderRadius: '2px' }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75"
            style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.40)', color: '#f87171', borderRadius: '2px' }}>
            Dissolve Party
          </button>
        </div>
      </div>
    </div>
  );
}

function RedoCharModal({ onCancel, onConfirm, canAfford }: { onCancel: () => void; onConfirm: () => void; canAfford: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-full max-w-sm overflow-hidden"
        style={{ background: '#1b1f1a', border: `1px solid #2d3329`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', borderRadius: '2px' }}>
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid #2d3329` }}>
          <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'rgba(212,169,31,0.12)', border: '1px solid rgba(212,169,31,0.25)' }}>
            <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-sm text-zinc-100">Redo Character Details?</div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] mt-0.5 text-zinc-500">Requires Confirmation</div>
          </div>
        </div>
        <div className="px-5 py-6">
          <p className="text-[11px] leading-relaxed text-zinc-400">
            You can update your character name, family name, age, and gender. Your party, country, and political progress will remain unchanged.
          </p>
          <div className="mt-4 flex items-center justify-between p-3 rounded-sm" style={{ background: 'rgba(212,169,31,0.08)', border: '1px solid rgba(212,169,31,0.2)' }}>
             <span className="text-[10px] font-mono text-amber-500/70 uppercase tracking-widest">Identity Cost</span>
             <span className="text-xs font-bold text-amber-400">$500,000</span>
          </div>
          {!canAfford && (
            <div className="mt-2 text-[10px] font-mono text-red-400 uppercase tracking-widest text-center">
              Insufficient party funds. Requires $500,000.
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', borderRadius: '2px' }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={!canAfford}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'rgba(212,169,31,0.14)', border: '1px solid rgba(212,169,31,0.40)', color: '#d4a91f', borderRadius: '2px' }}>
            Pay & Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function RebrandPartyModal({ onCancel, onConfirm, canAfford }: { onCancel: () => void; onConfirm: () => void; canAfford: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-full max-w-sm overflow-hidden"
        style={{ background: '#1b1f1a', border: `1px solid #2d3329`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', borderRadius: '2px' }}>
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid #2d3329` }}>
          <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'rgba(212,169,31,0.12)', border: '1px solid rgba(212,169,31,0.25)' }}>
            <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-sm text-zinc-100">Rebrand Political Party?</div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] mt-0.5 text-zinc-500">Requires Confirmation</div>
          </div>
        </div>
        <div className="px-5 py-6">
          <p className="text-[11px] leading-relaxed text-zinc-400">
            You can update your party identity. Existing public records will reflect the new party details.
          </p>
          <div className="mt-4 flex items-center justify-between p-3 rounded-sm" style={{ background: 'rgba(212,169,31,0.08)', border: '1px solid rgba(212,169,31,0.2)' }}>
             <span className="text-[10px] font-mono text-amber-500/70 uppercase tracking-widest">Branding Cost</span>
             <span className="text-xs font-bold text-amber-400">$500,000</span>
          </div>
          {!canAfford && (
            <div className="mt-2 text-[10px] font-mono text-red-400 uppercase tracking-widest text-center">
              Insufficient party funds. Requires $500,000.
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', borderRadius: '2px' }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={!canAfford}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'rgba(212,169,31,0.14)', border: '1px solid rgba(212,169,31,0.40)', color: '#d4a91f', borderRadius: '2px' }}>
            Pay & Rebrand
          </button>
        </div>
      </div>
    </div>
  );
}

function PartyDropdown({ ctx, onClose }: { ctx: PlayerCtx; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1.5 w-56 overflow-hidden z-50"
      style={{ background: PANEL, border: `1px solid ${BORDER}`, boxShadow: '0 10px 40px rgba(0,0,0,0.7)', borderRadius: '2px' }}>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="text-white font-bold text-xs leading-tight truncate mb-0.5">{ctx.partyName}</div>
        <div className="font-mono text-[9px] font-bold tracking-[0.22em]" style={{ color: ctx.partyColor }}>{ctx.partyAbbreviation}</div>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        {[{ label: 'Path', value: ctx.selectedPath }, { label: 'Leader', value: ctx.characterName }, { label: 'Country', value: ctx.countryName }].map((f) => (
          <div key={f.label} className="flex items-center justify-between">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{f.label}</span>
            <span className="text-[10px] font-semibold truncate max-w-[120px]" style={{ color: TEXT }}>{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER COMPONENTS FOR SUBTABS
// ─────────────────────────────────────────────────────────────────────────────

function PartyStaffView({ positions, onHire, onFire, accentColor }: { positions: Position[]; onHire: (id: string) => void; onFire: (id: string) => void; accentColor: string }) {
  const staff = positions.filter((p) => p.id !== 'party_leader');

  return (
    <div className="h-full overflow-y-auto px-5 py-6" style={{ background: BG }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Party Staff</h2>
          <p className="text-zinc-500 text-xs mt-1">Manage fictional hired officials who help run your political organization.</p>
        </div>

        {/* Note */}
        <div className="rounded-sm px-4 py-3 mb-6 flex items-start gap-2.5" style={{ background: 'rgba(212,169,31,0.04)', border: `1px solid ${BORDER}` }}>
          <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
            Party staff are fictional hired officials controlled by you. Real players cannot join political parties.
          </p>
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staff.map((s) => {
            const isFilled = !!s.filledBy;
            return (
              <div key={s.id} className="p-4 flex flex-col justify-between gap-3" style={{ background: PANEL, border: `1px solid ${isFilled ? accentColor + '30' : BORDER}`, borderRadius: '2px' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-zinc-300">{s.title}</span>
                      {isFilled ? (
                        <span className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5" style={{ background: `${accentColor}15`, color: accentColor, borderRadius: '2px' }}>
                          Filled
                        </span>
                      ) : (
                        <span className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 text-zinc-500" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
                          Vacant
                        </span>
                      )}
                    </div>
                    {isFilled ? (
                      <div className="text-[13px] font-semibold text-zinc-100">{s.filledBy!.name}</div>
                    ) : (
                      <p className="text-[10px] leading-normal text-zinc-500 line-clamp-2">{s.description}</p>
                    )}
                  </div>
                  
                  {isFilled ? (
                    <button type="button" onClick={() => onFire(s.id)} className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75 shrink-0" style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, color: '#f87171', borderRadius: '2px' }}>
                      Fire
                    </button>
                  ) : (
                    <button type="button" onClick={() => onHire(s.id)} className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75 shrink-0" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}30`, color: accentColor, borderRadius: '2px' }}>
                      Hire
                    </button>
                  )}
                </div>
                
                {isFilled && (
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/[0.04] mt-1">
                    <div className="text-[9px]"><span className="text-zinc-500">Skill:</span> <span className="text-amber-500 font-mono font-bold">{s.filledBy!.skill}</span></div>
                    <div className="text-[9px]"><span className="text-zinc-500">Loyalty:</span> <span className="text-emerald-500 font-mono font-bold">{s.filledBy!.loyalty}%</span></div>
                    {/* TypeScript safety cast for the additional properties we added */}
                    <div className="text-[9px]"><span className="text-zinc-500">Salary:</span> <span className="text-zinc-300 font-mono">{formatMoney((s.filledBy as any).salary)}/mo</span></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BudgetView({ budget, partyId }: { budget: any, partyId: string }) {
  const [staffCost, setStaffCost] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    // Developer Comment: Temporary party budget model. In multiplayer, party funds, revenue, expenses, and salary payments must be stored and validated by backend/database.
    let cost = 0;
    try {
      const staffRaw = localStorage.getItem('worldr_party_staff');
      if (staffRaw) {
        const staff = JSON.parse(staffRaw);
        const validRoles = ['treasurer', 'campaignMediaManager', 'policyDirector', 'membershipOfficer'];
        Object.keys(staff).forEach((roleId) => {
          if (validRoles.includes(roleId) && staff[roleId] && staff[roleId].salary) {
            cost += staff[roleId].salary;
          }
        });
      }
      
      const txRaw = localStorage.getItem('worldr_party_transactions');
      if (txRaw) {
        setTransactions(JSON.parse(txRaw).filter((t: any) => t.partyId === partyId));
      }
    } catch(e){}
    setStaffCost(cost);
  }, [partyId, budget]);

  const safeBudget = budget || { partyFunds: 2000000, totalRevenue: 0, totalExpenses: 0, monthlyRevenue: 0, otherExpenses: 0 };
  const netProfit = (safeBudget.totalRevenue || 0) - (safeBudget.totalExpenses || 0);
  
  const monthlyExpenses = staffCost + (safeBudget.otherExpenses || 0);
  const projectedMonthlyNet = (safeBudget.monthlyRevenue || 0) - monthlyExpenses;

  return (
    <div className="h-full overflow-y-auto px-5 py-6" style={{ background: BG }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Party Budget</h2>
          <p className="text-zinc-500 text-xs mt-1">Manage your political organization's finances and staff salaries.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
              <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Party Funds</div>
              <div className="text-lg font-bold text-emerald-500">{formatMoney(safeBudget.partyFunds)}</div>
            </div>
            <div className="p-4" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
              <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Total Revenue</div>
              <div className="text-lg font-bold text-emerald-400">{formatMoney(safeBudget.totalRevenue || 0)}</div>
            </div>
            <div className="p-4" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
              <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Total Expenses</div>
              <div className="text-lg font-bold text-red-400">{formatMoney(safeBudget.totalExpenses || 0)}</div>
            </div>
            <div className="p-4" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
              <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Net Profit</div>
              <div className={`text-lg font-bold ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {netProfit >= 0 ? '+' : ''}{formatMoney(netProfit)}
              </div>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px', padding: '16px' }}>
            <h3 className="text-xs font-bold text-zinc-300 mb-2 uppercase tracking-widest border-b border-white/[0.05] pb-2">Monthly Projection</h3>
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.03]">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Monthly Revenue</span>
              <span className="text-xs font-semibold text-zinc-300">{formatMoney(safeBudget.monthlyRevenue || 0)}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.03]">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Staff Salary Exp.</span>
              <span className="text-xs font-semibold text-red-400">-{formatMoney(staffCost)}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.03]">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Other Expenses</span>
              <span className="text-xs font-semibold text-red-400">-{formatMoney(safeBudget.otherExpenses || 0)}</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.05]">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Projected Net</span>
              <span className={`text-xs font-semibold ${projectedMonthlyNet >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {projectedMonthlyNet >= 0 ? '+' : ''}{formatMoney(projectedMonthlyNet)}
              </span>
            </div>
            <p className="text-[9px] text-zinc-700 text-center mt-2 italic">
              Salaries are not yet automatically deducted.
            </p>
          </div>

          <div className="space-y-4 flex flex-col" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px', maxHeight: '300px' }}>
             <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest border-b border-white/[0.05] px-4 py-3 shrink-0">Recent Transactions</h3>
             <div className="flex-1 overflow-y-auto px-4 pb-4">
                {transactions.length === 0 ? (
                  <p className="text-[10px] text-zinc-500 italic text-center py-6">No financial transactions recorded yet.</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 pb-2 font-normal">Date</th>
                        <th className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 pb-2 font-normal">Source</th>
                        <th className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 pb-2 font-normal text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-t border-white/[0.02]">
                          <td className="py-2 text-[9px] font-mono text-zinc-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                          <td className="py-2 text-[10px] text-zinc-300">{tx.source} <span className="text-zinc-600 text-[8px] ml-1">({tx.category})</span></td>
                          <td className={`py-2 text-[10px] font-mono text-right font-bold ${tx.type === 'revenue' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {tx.type === 'revenue' ? '+' : '-'}{formatMoney(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartyStrategyView({ ctx }: { ctx: PlayerCtx }) {
  const stats = ctx.partyStats || {};
  const recognition = stats.recognition || 0;
  const funds = ctx.partyFunds || 0;

  const isEligible = recognition >= 2 && funds >= 100000;

  const support = stats.support || 0.1;
  const policyCredibility = stats.policyCredibility || 0;
  const campaignStrength = stats.campaignStrength || 0;
  const mediaPresence = stats.mediaPresence || 0;
  const legalReadiness = stats.legalReadiness || 0;
  const publicTrust = stats.publicTrust || 0;
  const members = stats.members || 1;

  // Election campaign data
  let allocatedElectionFunds = 0;
  let isRegistered = false;
  try {
    const campRaw = typeof window !== 'undefined' ? localStorage.getItem('worldr_election_campaigns') : null;
    if (campRaw) {
      const camps = JSON.parse(campRaw);
      const camp = camps.find((c: any) => c.partyId === ctx.partyId && c.electionId === 'drennia_parliamentary_y0');
      if (camp) allocatedElectionFunds = camp.allocatedFunds || 0;
    }
    const regsRaw = typeof window !== 'undefined' ? localStorage.getItem('worldr_election_registrations') : null;
    if (regsRaw) {
      const regs = JSON.parse(regsRaw);
      isRegistered = regs.some((r: any) => r.partyId === ctx.partyId && r.electionId === 'drennia_parliamentary_y0');
    }
  } catch (e) {}

  const [latestSurvey, setLatestSurvey] = useState<any>(null);
  useEffect(() => {
    try {
      const surveysRaw = localStorage.getItem('worldr_election_surveys');
      if (surveysRaw) {
        const surveys = JSON.parse(surveysRaw);
        const partySurveys = surveys.filter((s: any) => s.partyId === ctx.partyId);
        if (partySurveys.length > 0) setLatestSurvey(partySurveys[0]);
      }
    } catch (e) {}
  }, [ctx.partyId]);

  // Election strength preview for strategy panel
  const elStrength = calculateElectionStrength({ partyStats: stats, allocatedFunds: allocatedElectionFunds, hasMainPromise: !!(stats.mainPromise) });
  const indepStrength = calculateIndependentStrength({ registeredPlayerPartiesCount: 1, totalPlayerRecognition: recognition });
  const lowVS = (elStrength.lowStrength / (elStrength.lowStrength + indepStrength)) * 100;
  const highVS = (elStrength.highStrength / (elStrength.highStrength + indepStrength)) * 100;
  const seatLow = Math.floor((lowVS / 100) * 120);
  const seatHigh = Math.ceil((highVS / 100) * 120);

  const fundsBonus = Math.min(funds / 1000000, 5);
  
  const readinessScore = (recognition * 1.5) + (support * 10) + (policyCredibility * 0.8) + 
    (campaignStrength * 0.8) + (mediaPresence * 0.5) + (legalReadiness * 0.5) + 
    (publicTrust * 0.6) + Math.min(members / 1000, 10) + fundsBonus;

  let readinessLevel = "Very Weak";
  let readinessColor = "text-red-500";
  if (readinessScore >= 80) { readinessLevel = "Strong"; readinessColor = "text-emerald-500"; }
  else if (readinessScore >= 50) { readinessLevel = "Competitive"; readinessColor = "text-emerald-400"; }
  else if (readinessScore >= 25) { readinessLevel = "Developing"; readinessColor = "text-amber-400"; }
  else if (readinessScore >= 10) { readinessLevel = "Weak"; readinessColor = "text-amber-500"; }

  const nextSteps: string[] = [];
  if (funds < 100000) nextSteps.push('Raise at least $100,000 for the election registration fee.');
  if (recognition < 2) nextSteps.push('Increase Party Recognition to at least 2.0 to register.');
  if (isRegistered && allocatedElectionFunds === 0) nextSteps.push('Allocate election funds to improve campaign strength.');

  let staffDb: any = {};
  try {
    const staffRaw = typeof window !== 'undefined' ? localStorage.getItem('worldr_party_staff') : null;
    if (staffRaw) staffDb = JSON.parse(staffRaw);
  } catch (e) {}

  if (!staffDb.campaignMediaManager) nextSteps.push("Hire a Campaign & Media Manager.");
  if (!staffDb.treasurer) nextSteps.push("Hire a Treasurer.");
  if (!staffDb.publicImageManager) nextSteps.push("Hire a Public Image Manager if image actions are needed.");
  if (!staffDb.membershipOfficer) nextSteps.push("Hire a Membership Officer.");
  if (!stats.mainPromise) nextSteps.push("Declare a Main Promise to rally voters.");
  
  if (support < 2.0) nextSteps.push("Use Door-to-Door Campaign or Hold Local Rally to improve polling support.");
  if (publicTrust < 2.0) nextSteps.push("Use Door-to-Door Campaign to improve public trust.");
  if (mediaPresence < 2.0) nextSteps.push("Use Give Interview or Publish Party Statement to improve media presence.");
  if (members < 500) nextSteps.push("Use Recruit Members or Open Membership Booth to grow party membership.");

  if (nextSteps.length === 0) nextSteps.push("Your party is well positioned. Focus on maintaining public trust and raising funds.");

  return (
    <div className="h-full overflow-y-auto px-5 py-6" style={{ background: BG }}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Party Strategy</h2>
          <p className="text-zinc-500 text-xs mt-1">Monitor election readiness and define your political platform.</p>
        </div>

        {/* Section 1: Election Eligibility */}
        {latestSurvey ? (
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
            <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: BORDER }}>
               <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Latest Voter Survey</h3>
               <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{new Date(latestSurvey.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Polling Accuracy</div>
                <div className={`text-sm font-bold ${latestSurvey.surveyData.pollingAccuracy === 'Excellent' || latestSurvey.surveyData.pollingAccuracy === 'High' ? 'text-emerald-400' : latestSurvey.surveyData.pollingAccuracy === 'Good' || latestSurvey.surveyData.pollingAccuracy === 'Moderate' ? 'text-amber-400' : 'text-red-400'}`}>
                  {latestSurvey.surveyData.pollingAccuracy}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Proj. Vote Share</div>
                <div className="text-sm font-bold text-amber-400">{latestSurvey.surveyData.projectedVoteShareLow.toFixed(1)}% – {latestSurvey.surveyData.projectedVoteShareHigh.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Proj. Seats</div>
                <div className="text-sm font-bold text-amber-400">{latestSurvey.surveyData.projectedSeatsLow} – {latestSurvey.surveyData.projectedSeatsHigh} seats</div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Campaign Gain</div>
                <div className="text-sm font-bold text-emerald-400">+{latestSurvey.surveyData.campaignStrengthGain.toFixed(2)}</div>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
             <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Election Registration</h3>
          </div>
          
          {(() => {
            let isRegistered = false;
            try {
              const regsRaw = typeof window !== 'undefined' ? localStorage.getItem('worldr_election_registrations') : null;
              if (regsRaw) {
                const regs = JSON.parse(regsRaw);
                if (regs.some((r: any) => r.partyId === ctx.partyId && r.electionName === 'Drennia Parliamentary Election')) {
                  isRegistered = true;
                }
              }
            } catch(e) {}
            
            if (isRegistered) {
              return (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-300">Drennia Parliamentary Election</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-sm border border-emerald-500/20">Registered</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">Election Funds</div><div className="text-xs font-bold text-amber-400">{formatMoney(allocatedElectionFunds)}</div></div>
                    <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">Electoral Strength</div><div className="text-xs font-bold text-zinc-200">{elStrength.baseStrength.toFixed(1)}</div></div>
                    <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">Projected Vote Share</div><div className="text-xs font-bold text-amber-400">{lowVS.toFixed(1)}% – {highVS.toFixed(1)}%</div></div>
                    <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">Projected Seats</div><div className="text-xs font-bold text-amber-400">{seatLow} – {seatHigh}</div></div>
                  </div>
                </div>
              );
            }

            
            return (
              <>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div>
                     <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Required Recog.</div>
                     <div className="text-sm font-semibold text-zinc-400">2.0+</div>
                   </div>
                   <div>
                     <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Current Recog.</div>
                     <div className={`text-sm font-bold ${recognition >= 2 ? 'text-emerald-400' : 'text-red-400'}`}>{recognition.toFixed(2)}</div>
                   </div>
                   <div>
                     <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Registration Fee</div>
                     <div className="text-sm font-semibold text-zinc-400">$100,000</div>
                   </div>
                   <div>
                     <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Current Funds</div>
                     <div className={`text-sm font-bold ${funds >= 100000 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMoney(funds)}</div>
                   </div>
                </div>
                <div className="px-4 py-3 border-t flex justify-between items-center" style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.01)' }}>
                   <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Eligibility Status</span>
                   <span className={`text-xs font-bold uppercase tracking-widest ${isEligible ? 'text-emerald-500' : 'text-red-500'}`}>
                     {isEligible ? 'Eligible to Register' : 'Not Eligible'}
                   </span>
                </div>
              </>
            );
          })()}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Section 2: Election Readiness */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
            <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: BORDER }}>
               <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Readiness Score</h3>
               <span className={`text-xs font-bold uppercase tracking-widest ${readinessColor}`}>{readinessLevel}</span>
            </div>
            <div className="p-4 space-y-3">
               <div className="flex justify-between items-center pb-2 border-b border-white/[0.03]">
                 <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Score Value</span>
                 <span className="text-sm font-bold text-zinc-200">{readinessScore.toFixed(1)} <span className="text-[10px] text-zinc-500 font-normal">/ 100</span></span>
               </div>
               <div className="flex justify-between items-center pb-2 border-b border-white/[0.03]">
                 <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Polling Support</span>
                 <span className="text-xs font-semibold text-zinc-300">{support.toFixed(1)}%</span>
               </div>
               <div className="flex justify-between items-center pb-2 border-b border-white/[0.03]">
                 <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Policy Credibility</span>
                 <span className="text-xs font-semibold text-zinc-300">{policyCredibility.toFixed(1)}</span>
               </div>
               <div className="flex justify-between items-center pb-2 border-b border-white/[0.03]">
                 <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Media Presence</span>
                 <span className="text-xs font-semibold text-zinc-300">{mediaPresence.toFixed(1)}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Public Trust</span>
                 <span className="text-xs font-semibold text-zinc-300">{publicTrust.toFixed(1)}</span>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Section 3: Platform */}
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
                 <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Platform</h3>
              </div>
              <div className="p-4 space-y-4">
                 <div>
                   <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Main Promise</div>
                   <div className="text-sm font-semibold text-emerald-400">{stats.mainPromise || 'None Declared'}</div>
                 </div>
              </div>
            </div>

            {/* Section 4: Recommended Next Steps */}
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
                 <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Actionable Steps</h3>
              </div>
              <div className="p-4">
                 <ul className="space-y-2">
                   {nextSteps.map((step, idx) => (
                     <li key={idx} className="flex gap-2 text-[11px] text-zinc-400 leading-relaxed">
                       <span className="text-accent mt-0.5">•</span> {step}
                     </li>
                   ))}
                 </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getCurrentCountryElection(selectedCountry: { countryName: string, continentName: string }) {
  if (selectedCountry?.countryName === 'Drennia') {
    return {
      electionId: "drennia_parliamentary_y0",
      electionName: "Drennia Parliamentary Election",
      countryName: "Drennia",
      continentName: "Varelia",
      electionType: "Parliamentary Election",
      registrationFee: 100000,
      requiredRecognition: 2,
      status: "Registration Open",
      votingStatus: "Not Started"
    };
  }
  return null;
}

function ElectionsView({ ctx, onUpdateCtx }: { ctx: PlayerCtx; onUpdateCtx: (c: PlayerCtx) => void }) {
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [countryParties, setCountryParties] = useState<any[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [latestSurvey, setLatestSurvey] = useState<any>(null);

  const TOTAL_SEATS = 120;
  const MAJORITY_SEATS = 61;
  const MAX_SLOTS = 8;

  useEffect(() => {
    try {
      const regsRaw = localStorage.getItem('worldr_election_registrations');
      if (regsRaw) setRegistrations(JSON.parse(regsRaw));
      const rpRaw = localStorage.getItem('worldr_registered_parties');
      if (rpRaw) {
        const all = JSON.parse(rpRaw);
        setCountryParties(all.filter((p: any) => p.countryName === ctx.countryName));
      }
      const campRaw = localStorage.getItem('worldr_election_campaigns');
      if (campRaw) {
        const camps = JSON.parse(campRaw);
        const found = camps.find((c: any) => c.partyId === ctx.partyId && c.electionId === 'drennia_parliamentary_y0');
        if (found) setCampaign(found);
      }
      const surveysRaw = localStorage.getItem('worldr_election_surveys');
      if (surveysRaw) {
        const surveys = JSON.parse(surveysRaw);
        const partySurveys = surveys.filter((s: any) => s.partyId === ctx.partyId);
        if (partySurveys.length > 0) setLatestSurvey(partySurveys[0]);
      }
    } catch (e) {}
  }, [ctx.countryName, ctx.partyId]);

  const selectedCountry = { countryName: ctx.countryName, continentName: ctx.continentName };
  const election = getCurrentCountryElection(selectedCountry);

  if (!election) {
    return (
      <div className="h-full overflow-y-auto px-5 py-6" style={{ background: BG }}>
        <div className="max-w-xl mx-auto text-center py-12">
          <p className="text-zinc-500 text-xs">No upcoming elections in {ctx.countryName}.</p>
        </div>
      </div>
    );
  }

  const isRegistered = registrations.some(r => r.partyId === ctx.partyId && r.electionId === election.electionId);
  const recognition = ctx.partyStats?.recognition || 0;
  const funds = ctx.partyFunds;
  const meetsRecognition = recognition >= election.requiredRecognition;
  const meetsFunds = funds >= election.registrationFee;
  const isEligible = meetsRecognition && meetsFunds;

  const allocatedFunds = campaign?.allocatedFunds || 0;
  const hasMainPromise = !!(ctx.partyStats?.mainPromise);

  const strength = calculateElectionStrength({ partyStats: ctx.partyStats, allocatedFunds, hasMainPromise });
  const totalPlayerRecognition = countryParties.reduce((acc: number, p: any) => acc + (p.recognition || 0), recognition);
  const independentStrength = calculateIndependentStrength({
    registeredPlayerPartiesCount: Math.max(1, countryParties.length),
    totalPlayerRecognition,
  });

  const lowVoteShare = (strength.lowStrength / (strength.lowStrength + independentStrength)) * 100;
  const highVoteShare = (strength.highStrength / (strength.highStrength + independentStrength)) * 100;
  const midVoteShare = (lowVoteShare + highVoteShare) / 2;
  const seatLow = Math.floor((lowVoteShare / 100) * TOTAL_SEATS);
  const seatHigh = Math.ceil((highVoteShare / 100) * TOTAL_SEATS);
  const seatMid = Math.round((seatLow + seatHigh) / 2);
  const indepSeats = TOTAL_SEATS - Math.round((midVoteShare / 100) * TOTAL_SEATS);
  const statusLabel = getElectionStatusLabel(seatMid, indepSeats, TOTAL_SEATS);

  const PRESET_AMOUNTS = [100000, 250000, 500000, 1000000, 2000000];

  const handleAllocateFunds = (amount: number) => {
    if (amount < 50000 || amount > ctx.partyFunds) return;
    // Temporary local election fund allocation. In multiplayer, campaign allocation must be
    // validated server-side and stored per partyId/electionId.
    const updatedFunds = ctx.partyFunds - amount;
    let updatedBudget = ctx.partyBudget || { partyId: ctx.partyId, partyFunds: 2000000, totalRevenue: 0, totalExpenses: 0, monthlyRevenue: 0, otherExpenses: 0 };
    updatedBudget = { ...updatedBudget, partyFunds: updatedFunds, totalExpenses: (updatedBudget.totalExpenses || 0) + amount };
    let camps: any[] = [];
    try { const r = localStorage.getItem('worldr_election_campaigns'); if (r) camps = JSON.parse(r); } catch (e) {}
    const idx = camps.findIndex((c: any) => c.partyId === ctx.partyId && c.electionId === election.electionId);
    const now = new Date().toISOString();
    const newCamp = idx >= 0
      ? { ...camps[idx], allocatedFunds: camps[idx].allocatedFunds + amount, updatedAt: now }
      : { campaignId: Math.random().toString(36).slice(2, 9), electionId: election.electionId, partyId: ctx.partyId, partyName: ctx.partyName, partyAbbreviation: ctx.partyAbbreviation, countryName: election.countryName, continentName: election.continentName, allocatedFunds: amount, createdAt: now, updatedAt: now };
    if (idx >= 0) camps[idx] = newCamp; else camps.unshift(newCamp);
    let txs: any[] = [];
    try { const r = localStorage.getItem('worldr_party_transactions'); if (r) txs = JSON.parse(r); } catch (e) {}
    txs.unshift({ id: Math.random().toString(36).slice(2, 9), partyId: ctx.partyId, type: 'expense', category: 'Election Campaign Allocation', source: election.electionName, amount, actionName: 'Allocate Election Funds', createdAt: now });
    let logs: any[] = [];
    try { const r = localStorage.getItem('worldr_activity_log'); if (r) logs = JSON.parse(r); } catch (e) {}
    logs.unshift({ id: Math.random().toString(36).slice(2, 9), partyId: ctx.partyId, countryName: ctx.countryName, continentName: ctx.continentName, actionName: 'Allocate Election Funds', roleName: 'Party Leader', officialName: ctx.characterName, investment: amount, finalScore: 10, resultQuality: 'Success', summary: `Party allocated ${formatMoney(amount)} to the ${election.electionName} campaign.`, createdAt: now });
    try {
      localStorage.setItem('worldr_party_budget', JSON.stringify(updatedBudget));
      localStorage.setItem('worldr_election_campaigns', JSON.stringify(camps));
      localStorage.setItem('worldr_party_transactions', JSON.stringify(txs));
      localStorage.setItem('worldr_activity_log', JSON.stringify(logs));
    } catch (e) {}
    setCampaign(newCamp);
    onUpdateCtx({ ...ctx, partyFunds: updatedFunds, partyBudget: updatedBudget });
    setShowFundModal(false);
    setCustomAmount('');
    setSelectedPreset(null);
  };

  const executeRegistration = () => {
    const updatedFunds = funds - election.registrationFee;
    let updatedBudget = ctx.partyBudget || { partyId: ctx.partyId, partyFunds: 2000000, totalRevenue: 0, totalExpenses: 0, monthlyRevenue: 0, otherExpenses: 0 };
    updatedBudget = { ...updatedBudget, partyFunds: updatedFunds, totalExpenses: (updatedBudget.totalExpenses || 0) + election.registrationFee };
    const now = new Date().toISOString();
    let txs: any[] = []; try { const r = localStorage.getItem('worldr_party_transactions'); if (r) txs = JSON.parse(r); } catch (e) {}
    txs.unshift({ id: Math.random().toString(36).slice(2, 9), partyId: ctx.partyId, type: 'expense', category: 'Election Registration', source: election.electionName, amount: election.registrationFee, actionName: 'Register for Election', createdAt: now });
    const newReg = { registrationId: Math.random().toString(36).slice(2, 9), electionId: election.electionId, electionName: election.electionName, partyId: ctx.partyId, partyName: ctx.partyName, partyAbbreviation: ctx.partyAbbreviation, countryName: election.countryName, continentName: election.continentName, electionType: election.electionType, registrationFeePaid: election.registrationFee, recognitionAtRegistration: recognition, fundsAfterRegistration: updatedFunds, registeredAt: now, status: 'Registered' };
    const updatedRegs = [newReg, ...registrations];
    let logs: any[] = []; try { const r = localStorage.getItem('worldr_activity_log'); if (r) logs = JSON.parse(r); } catch (e) {}
    logs.unshift({ id: Math.random().toString(36).slice(2, 9), partyId: ctx.partyId, countryName: ctx.countryName, continentName: ctx.continentName, actionName: 'Election Registration', roleName: 'Party Leader', officialName: ctx.characterName, investment: election.registrationFee, finalScore: 10, resultQuality: 'Success', summary: `Party registered for the ${election.electionName} after paying the ${formatMoney(election.registrationFee)} registration fee.`, createdAt: now });
    try {
      localStorage.setItem('worldr_party_budget', JSON.stringify(updatedBudget));
      localStorage.setItem('worldr_party_transactions', JSON.stringify(txs));
      localStorage.setItem('worldr_election_registrations', JSON.stringify(updatedRegs));
      localStorage.setItem('worldr_activity_log', JSON.stringify(logs));
    } catch (e) {}
    setRegistrations(updatedRegs);
    onUpdateCtx({ ...ctx, partyFunds: updatedFunds, partyBudget: updatedBudget });
    setShowRegConfirm(false);
  };

  // ─── REGISTERED: CAMPAIGN PREP VIEW ──────────────────────────────────────
  if (isRegistered) {
    const customNum = parseInt(customAmount.replace(/[^0-9]/g, ''), 10) || 0;
    const allocAmount = selectedPreset !== null ? selectedPreset : customNum;
    const canAllocate = allocAmount >= 50000 && allocAmount <= ctx.partyFunds;

    const BreakdownRow = ({ label, value, color }: { label: string; value: number; color: string }) => (
      <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
        <span className="text-[10px] text-zinc-500">{label}</span>
        <span className={`text-[10px] font-mono font-bold ${color}`}>{value >= 0 ? '+' : ''}{value.toFixed(2)}</span>
      </div>
    );

    return (
      <div className="h-full overflow-y-auto px-5 py-6" style={{ background: BG }}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Election Campaign Preparation</h2>
            <p className="text-zinc-500 text-xs mt-1">Your party is registered. Allocate campaign funds and strengthen your position before election day.</p>
          </div>

          {/* Registration Overview + Allocate Button */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Registration Overview</h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-sm border border-emerald-500/20">Registered</span>
            </div>
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Election</div><div className="text-xs font-semibold text-zinc-300">{election.electionName}</div></div>
              <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Parliament Size</div><div className="text-xs font-semibold text-zinc-300">{TOTAL_SEATS} seats</div></div>
              <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Majority Needed</div><div className="text-xs font-bold text-amber-400">{MAJORITY_SEATS} seats</div></div>
              <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Registration Fee Paid</div><div className="text-xs font-semibold text-zinc-300">{formatMoney(election.registrationFee)}</div></div>
              <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Party Funds</div><div className="text-xs font-bold text-emerald-400">{formatMoney(ctx.partyFunds)}</div></div>
              <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Election Funds Allocated</div><div className="text-xs font-bold text-amber-400">{formatMoney(allocatedFunds)}</div></div>
              <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Main Promise</div><div className="text-xs font-semibold text-emerald-400">{ctx.partyStats?.mainPromise || 'Not Declared'}</div></div>
              <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Recognition</div><div className="text-xs font-semibold text-zinc-300">{recognition.toFixed(2)}%</div></div>
            </div>
            <div className="px-5 pb-5">
              <button id="btn-allocate-election-funds" type="button" onClick={() => setShowFundModal(true)}
                className="w-full py-3 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-80"
                style={{ background: 'rgba(212,169,31,0.12)', border: '1px solid rgba(212,169,31,0.35)', color: '#d4a91f', borderRadius: '2px' }}>
                Allocate Election Funds
              </button>
              <p className="text-[9px] text-zinc-600 text-center mt-2">Registration enters the election. Allocated funds power your campaign strength.</p>
            </div>
          </div>

          {/* Latest Voter Survey */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Latest Voter Survey</h3>
              {latestSurvey && <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{new Date(latestSurvey.createdAt).toLocaleDateString()}</span>}
            </div>
            <div className="p-5">
              {latestSurvey ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Polling Accuracy</div>
                    <div className={`text-xs font-bold ${latestSurvey.surveyData.pollingAccuracy === 'Excellent' || latestSurvey.surveyData.pollingAccuracy === 'High' ? 'text-emerald-400' : latestSurvey.surveyData.pollingAccuracy === 'Good' || latestSurvey.surveyData.pollingAccuracy === 'Moderate' ? 'text-amber-400' : 'text-red-400'}`}>
                      {latestSurvey.surveyData.pollingAccuracy}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Margin of Error</div>
                    <div className="text-xs font-mono text-zinc-300">±{latestSurvey.surveyData.voteShareMargin.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Proj. Vote Share</div>
                    <div className="text-xs font-bold text-amber-400">{latestSurvey.surveyData.projectedVoteShareLow.toFixed(1)}% – {latestSurvey.surveyData.projectedVoteShareHigh.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Proj. Seats</div>
                    <div className="text-xs font-bold text-amber-400">{latestSurvey.surveyData.projectedSeatsLow} – {latestSurvey.surveyData.projectedSeatsHigh} seats</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-[11px] text-zinc-500 italic mb-2">No voter survey data available.</p>
                  <p className="text-[10px] text-zinc-400">Assign your Campaign & Media Manager to run a Voter Survey action to project election outcomes.</p>
                </div>
              )}
            </div>
          </div>

          {/* Election Strength Breakdown */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: BORDER }}>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Election Strength Breakdown</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Election results are not based on polling alone. WORLDr calculates electoral strength from polling support, recognition, members, election funds, public trust, campaign strength, media presence, main promise, controversy, and election swing.</p>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <BreakdownRow label="Base Registration" value={strength.base} color="text-amber-400/80" />
                <BreakdownRow label="Polling Support" value={strength.pollingPower} color="text-emerald-400" />
                <BreakdownRow label="Recognition" value={strength.recognitionPower} color="text-emerald-400" />
                <BreakdownRow label="Members Organization" value={strength.memberPower} color="text-emerald-400" />
                <BreakdownRow label={allocatedFunds > 0 ? 'Election Funds' : 'Election Funds (none allocated)'} value={strength.electionFundPower} color={allocatedFunds > 0 ? 'text-emerald-400' : 'text-zinc-600'} />
                <BreakdownRow label="Public Trust" value={strength.publicTrustPower} color="text-emerald-400" />
                <BreakdownRow label="Campaign Strength" value={strength.campaignStrengthPower} color="text-emerald-400" />
                <BreakdownRow label="Media Presence" value={strength.mediaPresencePower} color="text-emerald-400" />
                <BreakdownRow label={hasMainPromise ? 'Main Promise Bonus' : 'Main Promise (none declared)'} value={strength.mainPromiseBonus} color={hasMainPromise ? 'text-emerald-400' : 'text-zinc-600'} />
                <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-[10px] text-zinc-500">Controversy Penalty</span>
                  <span className={`text-[10px] font-mono font-bold ${strength.controversyPenalty > 0 ? 'text-red-400' : 'text-zinc-600'}`}>-{strength.controversyPenalty.toFixed(2)}</span>
                </div>
              </div>
              <div className="pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Total Electoral Strength</span>
                  <span className="text-sm font-bold text-white">{strength.baseStrength.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Swing Range (±6%)</span>
                  <span className="text-xs font-mono text-zinc-300">{strength.lowStrength.toFixed(1)} – {strength.highStrength.toFixed(1)}</span>
                </div>
                <div className="h-px w-full" style={{ background: BORDER }} />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Projected Vote Share</span>
                  <span className="text-sm font-bold text-amber-400">{lowVoteShare.toFixed(1)}% – {highVoteShare.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Projected Seats</span>
                  <span className="text-sm font-bold text-amber-400">{seatLow} – {seatHigh} seats</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Projected Status</span>
                  <span className="text-xs font-bold text-zinc-200">{statusLabel}</span>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}` }}>
                <p className="text-[9px] text-zinc-500 leading-relaxed">Allocated election funds are used for election strength. General party funds are not counted directly. Allocate more funds to increase electoral power.</p>
              </div>
            </div>
          </div>

          {/* Independent Individuals */}
          <div className="p-4 rounded-sm" style={{ background: 'rgba(212,169,31,0.07)', border: '1px solid rgba(212,169,31,0.18)' }}>
            <div className="text-xs font-bold mb-1.5" style={{ color: '#d4a91f' }}>Independent Individuals</div>
            <p className="text-[10px] leading-relaxed mb-2" style={{ color: '#a18017' }}>
              Independent Individuals are not AI parties. They represent non-party elected figures and unaligned political space. Seats not won by player-created parties may be held by Independent Individuals.
            </p>
            <div className="flex gap-6">
              <div><div className="text-[9px] font-mono uppercase tracking-widest text-amber-700 mb-0.5">Independent Strength</div><div className="text-xs font-bold text-amber-500">{independentStrength.toFixed(1)}</div></div>
              <div><div className="text-[9px] font-mono uppercase tracking-widest text-amber-700 mb-0.5">Approx. Independent Seats</div><div className="text-xs font-bold text-amber-500">~{indepSeats} / {TOTAL_SEATS}</div></div>
            </div>
          </div>

          {/* Political Field */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: BORDER }}>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Drennia Political Field</h3>
              <div className="flex gap-5 mt-1.5">
                <span className="text-[9px] font-mono text-zinc-500">Max Politicians: <span className="text-zinc-300">{MAX_SLOTS}</span></span>
                <span className="text-[9px] font-mono text-zinc-500">Player Parties: <span className="text-emerald-400">{Math.min(countryParties.length, MAX_SLOTS)} / {MAX_SLOTS}</span></span>
                <span className="text-[9px] font-mono text-zinc-500">Empty Slots: <span className="text-zinc-400">{Math.max(0, MAX_SLOTS - countryParties.length)}</span></span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th className="px-4 py-2 text-left font-mono text-zinc-600 uppercase tracking-widest">Slot</th>
                    <th className="px-4 py-2 text-left font-mono text-zinc-600 uppercase tracking-widest">Abbr.</th>
                    <th className="px-4 py-2 text-left font-mono text-zinc-600 uppercase tracking-widest">Party Name</th>
                    <th className="px-4 py-2 text-left font-mono text-zinc-600 uppercase tracking-widest">Leader</th>
                    <th className="px-4 py-2 text-left font-mono text-zinc-600 uppercase tracking-widest">Recognition</th>
                    <th className="px-4 py-2 text-left font-mono text-zinc-600 uppercase tracking-widest">Support</th>
                    <th className="px-4 py-2 text-left font-mono text-zinc-600 uppercase tracking-widest">Reg.</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: MAX_SLOTS }).map((_, i) => {
                    const party = countryParties[i];
                    const isCurrentParty = party?.partyId === ctx.partyId;
                    const regForParty = party ? registrations.some(r => r.partyId === party.partyId && r.electionId === election.electionId) : false;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}40`, background: isCurrentParty ? 'rgba(212,169,31,0.04)' : 'transparent' }}>
                        <td className="px-4 py-2 font-mono text-zinc-600">{i + 1}</td>
                        {party ? (
                          <>
                            <td className="px-4 py-2 font-bold" style={{ color: isCurrentParty ? ctx.partyColor : '#7a8070' }}>{party.partyAbbreviation}</td>
                            <td className="px-4 py-2 text-zinc-300 font-semibold">{party.partyName}{isCurrentParty ? ' (You)' : ''}</td>
                            <td className="px-4 py-2 text-zinc-400">{party.characterName || '—'}</td>
                            <td className="px-4 py-2 text-zinc-400">{(party.recognition || 0).toFixed(2)}%</td>
                            <td className="px-4 py-2 text-zinc-400">{(party.support || 0.1).toFixed(1)}%</td>
                            <td className="px-4 py-2">
                              <span className={`font-bold uppercase tracking-widest text-[9px] px-1.5 py-0.5 rounded-sm ${regForParty ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-600 bg-white/[0.03]'}`}>{regForParty ? 'Yes' : 'No'}</span>
                            </td>
                          </>
                        ) : (
                          <td colSpan={6} className="px-4 py-2 text-zinc-700 italic">Empty Politician Slot</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Fund Allocation Modal */}
        {showFundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowFundModal(false); setSelectedPreset(null); setCustomAmount(''); } }}>
            <div className="w-full max-w-sm overflow-hidden" style={{ background: '#1b1f1a', border: `1px solid #2d3329`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', borderRadius: '2px' }}>
              <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid #2d3329` }}>
                <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'rgba(212,169,31,0.12)', border: '1px solid rgba(212,169,31,0.25)' }}>
                  <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-sm text-zinc-100">Allocate Election Funds</div>
                  <div className="text-[9px] font-mono uppercase tracking-[0.18em] mt-0.5 text-zinc-500">Campaign Investment</div>
                </div>
              </div>
              <div className="px-5 py-4 space-y-4">
                <p className="text-[10px] leading-relaxed text-zinc-400">Election funds improve your party's campaign strength during election calculation. Allocated money leaves general party funds and cannot be used for normal party expenses in this alpha version.</p>
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500">Available Party Funds</span>
                  <span className="text-emerald-400 font-bold font-mono">{formatMoney(ctx.partyFunds)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500">Already Allocated</span>
                  <span className="text-amber-400 font-bold font-mono">{formatMoney(allocatedFunds)}</span>
                </div>
                <div className="h-px" style={{ background: BORDER }} />
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Quick Amounts</div>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_AMOUNTS.map((amt) => {
                    const affordable = ctx.partyFunds >= amt;
                    const isSel = selectedPreset === amt;
                    return (
                      <button key={amt} type="button" disabled={!affordable}
                        onClick={() => { setSelectedPreset(amt); setCustomAmount(''); }}
                        className={`py-2 text-[10px] font-bold rounded-sm transition-opacity ${!affordable ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'}`}
                        style={{ background: isSel ? 'rgba(212,169,31,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isSel ? 'rgba(212,169,31,0.5)' : BORDER}`, color: isSel ? '#d4a91f' : '#7a8070' }}>
                        {formatMoney(amt)}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Custom Amount (min $50,000)</div>
                  <input type="number" min={50000} max={ctx.partyFunds} placeholder="e.g. 750000"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setSelectedPreset(null); }}
                    className="w-full px-3 py-2 text-xs text-zinc-200 outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '2px' }} />
                </div>
              </div>
              <div className="px-5 pb-5 flex gap-3">
                <button type="button" onClick={() => { setShowFundModal(false); setSelectedPreset(null); setCustomAmount(''); }}
                  className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-75"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', borderRadius: '2px' }}>
                  Cancel
                </button>
                <button type="button" onClick={() => handleAllocateFunds(allocAmount)} disabled={!canAllocate}
                  className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80"
                  style={{ background: 'rgba(212,169,31,0.14)', border: '1px solid rgba(212,169,31,0.40)', color: '#d4a91f', borderRadius: '2px' }}>
                  {allocAmount >= 50000 ? `Allocate ${formatMoney(allocAmount)}` : 'Allocate Funds'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── NOT REGISTERED: EXISTING REGISTRATION UI ────────────────────────────
  const support = ctx.partyStats?.support || 0.1;
  const policyCredibility = ctx.partyStats?.policyCredibility || 0;
  const campaignStrength = ctx.partyStats?.campaignStrength || 0;
  const mediaPresence = ctx.partyStats?.mediaPresence || 0;
  const publicTrust = ctx.partyStats?.publicTrust || 0;
  const members = ctx.partyStats?.members || 1;
  const fundsBonus = Math.min(funds / 1000000, 5);
  const readinessScore = (recognition * 1.5) + (support * 10) + (policyCredibility * 0.8) + (campaignStrength * 0.8) + (mediaPresence * 0.5) + (publicTrust * 0.6) + Math.min(members / 1000, 10) + fundsBonus;
  let readinessLevel = 'Very Weak'; let readinessColor = 'text-red-500';
  if (readinessScore >= 80) { readinessLevel = 'Strong'; readinessColor = 'text-emerald-500'; }
  else if (readinessScore >= 50) { readinessLevel = 'Competitive'; readinessColor = 'text-emerald-400'; }
  else if (readinessScore >= 25) { readinessLevel = 'Developing'; readinessColor = 'text-amber-400'; }
  else if (readinessScore >= 10) { readinessLevel = 'Weak'; readinessColor = 'text-amber-500'; }

  return (
    <div className="h-full overflow-y-auto px-5 py-6" style={{ background: BG }}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Elections</h2>
          <p className="text-zinc-500 text-xs mt-1">Register your party for upcoming elections and prepare for national competition.</p>
        </div>

        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }} className="p-5">
          <h3 className="font-bold text-zinc-100 text-sm mb-1">{election.countryName} Parliamentary Election</h3>
          <div className="flex items-center gap-3 mt-4 mb-2">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Politician Slots:</div>
            <div className="text-xs font-bold text-emerald-400">{Math.min(countryParties.length, MAX_SLOTS)} / {MAX_SLOTS} filled</div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Registered Player Parties:</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {countryParties.slice(0, MAX_SLOTS).map((p: any) => (
              <span key={p.partyId} className="px-2 py-1 border rounded-sm text-[10px] text-zinc-300 font-semibold" style={{ background: 'rgba(255,255,255,0.03)', borderColor: BORDER }}>
                {p.partyName} ({p.partyAbbreviation})
              </span>
            ))}
            {countryParties.length === 0 && <span className="text-[10px] text-zinc-500 italic">None yet...</span>}
          </div>
          <div className="p-4 rounded-sm" style={{ background: 'rgba(212,169,31,0.08)', border: '1px solid rgba(212,169,31,0.2)' }}>
            <div className="text-xs font-bold mb-1.5" style={{ color: '#d4a91f' }}>Independent Individuals</div>
            <div className="text-[10px] leading-relaxed mb-2" style={{ color: '#a18017' }}>Any seats not won by registered player-created parties will be represented by Independent Individuals. They are not AI parties; they represent non-party elected figures and unaligned political space.</div>
            <div className="text-[10px] font-bold leading-relaxed" style={{ color: '#b58e11' }}>Election participation does not guarantee majority control. If few player parties compete, Independent Individuals will fill the remaining political space.</div>
          </div>
        </div>

        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-5">
              <div>
                <h3 className="font-bold text-zinc-100 text-lg mb-1">{election.electionName}</h3>
                <div className="text-xs text-zinc-400">{election.electionType} · {election.countryName}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Registration Fee</div><div className="text-sm font-semibold text-zinc-300">{formatMoney(election.registrationFee)}</div></div>
                <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Required Recognition</div><div className="text-sm font-semibold text-zinc-300">{election.requiredRecognition.toFixed(1)}%</div></div>
                <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Party Funds</div><div className={`text-sm font-bold ${meetsFunds ? 'text-emerald-400' : 'text-red-400'}`}>{formatMoney(funds)}</div></div>
                <div><div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Current Recognition</div><div className={`text-sm font-bold ${meetsRecognition ? 'text-emerald-400' : 'text-red-400'}`}>{recognition.toFixed(2)}%</div></div>
              </div>
            </div>
            <div className="w-full md:w-56 shrink-0 flex flex-col justify-center gap-4 pl-0 md:pl-6 border-t md:border-t-0 md:border-l pt-6 md:pt-0" style={{ borderColor: BORDER }}>
              <div className="text-center">
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Eligibility</div>
                <div className={`inline-flex px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest ${isEligible ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{isEligible ? 'Eligible' : 'Not Eligible'}</div>
              </div>
              <div className="mt-2">
                <button type="button" disabled={!isEligible} onClick={() => setShowRegConfirm(true)}
                  className={`w-full py-3 text-xs font-bold uppercase tracking-widest transition-opacity ${isEligible ? 'hover:opacity-80' : 'opacity-40 cursor-not-allowed'}`}
                  style={{ background: isEligible ? `${ACCENT}14` : 'rgba(255,255,255,0.03)', border: `1px solid ${isEligible ? ACCENT : BORDER}`, color: isEligible ? ACCENT : MUTED, borderRadius: '2px' }}>
                  Register for Election
                </button>
                {!isEligible && (
                  <div className="text-[9px] text-red-400 text-center mt-2 px-2 leading-relaxed">
                    {!meetsRecognition && !meetsFunds ? 'Need 2% recognition and $100,000 fee.' : !meetsRecognition ? 'Need 2% recognition.' : 'Need $100,000 registration fee.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
          <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: BORDER }}>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Election Readiness</h3>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${readinessColor}`}>{readinessLevel}</span>
          </div>
          <div className="p-4">
            <p className="text-[10px] leading-relaxed text-zinc-500 mb-4">Registration only requires 2% recognition and the $100,000 fee. Readiness affects future election performance, not eligibility.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Recognition</span><span className="text-xs font-semibold text-zinc-300">{recognition.toFixed(2)}%</span></div>
              <div><span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Polling Support</span><span className="text-xs font-semibold text-zinc-300">{support.toFixed(1)}%</span></div>
              <div><span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Members</span><span className="text-xs font-semibold text-zinc-300">{members.toLocaleString()}</span></div>
              <div><span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Party Funds</span><span className="text-xs font-semibold text-zinc-300">{formatMoney(funds)}</span></div>
              <div><span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Public Trust</span><span className="text-xs font-semibold text-zinc-300">{publicTrust.toFixed(1)}</span></div>
              <div><span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Campaign Strength</span><span className="text-xs font-semibold text-zinc-300">{campaignStrength.toFixed(1)}</span></div>
              <div><span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Media Presence</span><span className="text-xs font-semibold text-zinc-300">{mediaPresence.toFixed(1)}</span></div>
              <div><span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Main Promise</span><span className="text-xs font-semibold text-zinc-300">{ctx.partyStats?.mainPromise || 'None'}</span></div>
            </div>
          </div>
        </div>

        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Future Parliament Projections</h3>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-6 mb-5">
              <div><span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Total Seats</span><span className="text-xs font-semibold text-zinc-300">120 seats</span></div>
              <div><span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Majority Needed</span><span className="text-xs font-bold text-emerald-400">61 seats</span></div>
            </div>
            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Possible future outcomes:</div>
            <div className="flex flex-wrap gap-2">
              {['Failed to enter parliament', 'Tiny parliamentary presence', 'Minor party', 'Rising party', 'Major party', 'Minority government possible', 'Majority government'].map(outcome => (
                <span key={outcome} className="px-2 py-1 rounded-sm text-[10px] text-zinc-400 font-semibold" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}` }}>{outcome}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showRegConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRegConfirm(false); }}>
          <div className="w-full max-w-sm overflow-hidden" style={{ background: '#1b1f1a', border: `1px solid #2d3329`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', borderRadius: '2px' }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid #2d3329` }}>
              <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'rgba(212,169,31,0.12)', border: '1px solid rgba(212,169,31,0.25)' }}>
                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <div className="font-bold text-sm text-zinc-100">Register for {election.electionName}?</div>
                <div className="text-[9px] font-mono uppercase tracking-[0.18em] mt-0.5 text-zinc-500">Requires Confirmation</div>
              </div>
            </div>
            <div className="px-5 py-6">
              <p className="text-[11px] leading-relaxed text-zinc-400">Your party meets the legal minimum to register. Registration costs $100,000 and will be deducted from party funds. This does not guarantee election success; it only enters your party into the election.</p>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button type="button" onClick={() => setShowRegConfirm(false)} className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-75" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', borderRadius: '2px' }}>Cancel</button>
              <button type="button" onClick={executeRegistration} className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-75" style={{ background: 'rgba(212,169,31,0.14)', border: '1px solid rgba(212,169,31,0.40)', color: '#d4a91f', borderRadius: '2px' }}>Pay $100,000 and Register</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PastElectionsView() {
  return (
    <div className="h-full overflow-y-auto px-5 py-6" style={{ background: BG }}>
      <div className="max-w-xl mx-auto text-center py-12">
        {/* Header/Title */}
        <h2 className="text-xl font-bold text-white tracking-tight mb-1">Past Elections</h2>
        <p className="text-zinc-500 text-xs mb-8">Review previous election results and your party’s historical performance.</p>

        {/* Empty state icon & text */}
        <div className="w-16 h-16 mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
          <svg className="w-8 h-8 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="font-semibold text-sm mb-2" style={{ color: TEXT }}>No past elections recorded.</p>
        <p className="text-[11px] leading-relaxed max-w-[280px] mx-auto" style={{ color: MUTED }}>
          Election results will appear here after the first election is completed.
        </p>
      </div>
    </div>
  );
}

function ActivityLogView() {
  const [logItems, setLogItems] = useState<{ title: string; time: string; details: string }[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const items: { title: string; time: string; details: string }[] = [];

    try {
      // 1. Character
      const charRaw = localStorage.getItem('worldr_character');
      if (charRaw) {
        const char = JSON.parse(charRaw);
        const name = [char.firstName, char.middleName, char.lastName].filter(Boolean).join(' ') || 'Citizen';
        items.push({
          title: 'Character created',
          time: 'Phase 1 · Milestone 1',
          details: `Character identity created for ${name} (${char.age} yrs, ${char.gender}). Family lineage registered under the name ${char.familyName}.`
        });
      }

      // 2. Party
      const partyRaw = localStorage.getItem('worldr_current_party');
      if (partyRaw) {
        const party = JSON.parse(partyRaw);
        const createdAtStr = party.createdAt ? new Date(party.createdAt).toLocaleDateString() : 'Phase 1 · Milestone 2';
        items.push({
          title: 'Political party registered',
          time: createdAtStr,
          details: `Political party ${party.partyName} registered successfully under abbreviation ${party.partyAbbreviation}. Ideologies: ${party.ideologyIds?.join(', ') || 'None'}.`
        });
      }

      // 3. Country
      const countryRaw = localStorage.getItem('worldr_selected_country');
      if (countryRaw) {
        const c = JSON.parse(countryRaw);
        items.push({
          title: `${c.countryName} selected as motherland`,
          time: 'Phase 1 · Milestone 3',
          details: `Allegiance sworn to the motherland ${c.countryName} inside the continent of ${c.continentName}.`
        });
      }
      // 4. Activity Log (Actions)
      const logsRaw = localStorage.getItem('worldr_activity_log');
      if (logsRaw) {
        const actionLogs = JSON.parse(logsRaw);
        actionLogs.forEach((l: any) => {
          items.push({
            title: `Action: ${l.actionName}`,
            time: new Date(l.createdAt).toLocaleDateString(),
            details: `Executed by ${l.roleName} (${l.officialName}). Result: ${l.resultQuality} (Score: ${l.finalScore.toFixed(2)}). ${l.summary}`
          });
        });
      }
    } catch (e) {
      console.error(e);
    }

    setLogItems(items.reverse());
  }, []);

  return (
    <div className="h-full overflow-y-auto px-5 py-6" style={{ background: BG }}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Activity Log</h2>
          <p className="text-zinc-500 text-xs mt-1">A timeline of your party’s important actions and milestones.</p>
        </div>

        {logItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[11px] leading-relaxed text-zinc-500">
              No activity recorded yet.
            </p>
          </div>
        ) : (
          <div className="relative border-l border-white/[0.05] pl-4 ml-2 space-y-6 py-2">
            {logItems.map((item, idx) => (
              <div key={idx} className="relative">
                {/* Timeline dot */}
                <div className="absolute w-2.5 h-2.5 rounded-full -left-[21.5px] top-1" style={{ background: ACCENT, border: `2px solid ${BG}` }} />
                
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <span className="font-semibold text-xs text-zinc-300">{item.title}</span>
                    <span className="text-[9px] font-mono text-zinc-600">{item.time}</span>
                  </div>
                  <p className="text-[10.5px] leading-relaxed text-zinc-500">{item.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ACTION EXECUTION MODALS
// ─────────────────────────────────────────────────────────────────────────────

function ActionExecutionModal({
  actionId,
  positions,
  ctx,
  onClose,
  onExecute,
}: {
  actionId: string;
  positions: Position[];
  ctx: PlayerCtx;
  onClose: () => void;
  onExecute: (result: any) => void;
}) {
  const [selectedTier, setSelectedTier] = useState<number>(0);
  const [selectedPromise, setSelectedPromise] = useState('');
  const promisesList = [
    'Jobs and Wages', 'Anti-Corruption', 'Lower Taxes', 'Public Welfare', 'National Security',
    'Education Reform', 'Healthcare Reform', 'Business Growth', 'Rural Development', 'Law and Order'
  ];
  
  const position = positions.find(p => p.actions.some(a => a.id === actionId));
  const action = position?.actions.find(a => a.id === actionId);
  const staff = position?.filledBy;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  if (!position || !action || !staff) return null;

  const implementedIds = ['mo_recruit', 'smallDonationDrive', 'pl_promise', 'cm_rally', 'meo_statement', 'doorToDoorCampaign', 'giveInterview', 'openMembershipBooth', 'cm_survey'];
  const isImplemented = implementedIds.includes(actionId);
  
  if (!isImplemented) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="w-full max-w-sm overflow-hidden p-6 text-center"
          style={{ background: PANEL, border: `1px solid ${BORDER}`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', borderRadius: '2px' }}>
          <div className="w-12 h-12 mx-auto rounded-sm flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
            <svg className="w-5 h-5" style={{ color: MUTED }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div className="font-bold text-sm text-zinc-100 mb-2">{action.name}</div>
          <p className="text-[11px] leading-relaxed text-zinc-500 mb-6">
            This action is currently under development and will be available in a future gameplay phase.
          </p>
          <button type="button" onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-75"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', borderRadius: '2px' }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  // Cost Index
  // Drennia => 88B GDP, 3.1M Pop, 28400 GDP per Capita
  const countryInfo = { gdp: 88000000000, population: 3100000, gdpPerCapita: 28400, stability: 67 }; // mock drennia
  const costIndex = getNationActionCostIndex(countryInfo);

  let baseTiers = [
    { base: 20000, mult: 1.00 },
    { base: 60000, mult: 1.25 },
    { base: 120000, mult: 1.60 },
    { base: 300000, mult: 2.10 },
  ];
  
  if (actionId === 'meo_statement' || actionId === 'giveInterview' || actionId === 'openMembershipBooth') {
    baseTiers = [
      { base: 10000, mult: 1.00 },
      { base: 30000, mult: 1.25 },
      { base: 75000, mult: 1.60 },
      { base: 150000, mult: 2.10 },
    ];
  }

  if (actionId === 'cm_survey') {
    baseTiers = [
      { base: 25000, mult: 1.00 },
      { base: 75000, mult: 1.25 },
      { base: 150000, mult: 1.60 },
      { base: 300000, mult: 2.10 },
    ];
  }

  const tiers = baseTiers.map(t => ({ cost: Math.round((t.base * costIndex) / 100) * 100, mult: t.mult }));
  const currentTier = tiers[selectedTier];

  const isPromiseValid = actionId === 'pl_promise' ? !!selectedPromise : true;
  const canAfford = ctx.partyFunds >= currentTier.cost;
  const canExecute = canAfford && isPromiseValid;
  
    const handleExecute = () => {
      if (!canExecute) return;
  
      // Developer Comment: Temporary local action execution. In multiplayer, action execution, random rolls, costs, and results must be performed server-side to prevent cheating.
      const roll = rollStaffOutcome(staff.skill);
      
      const traitMatches: Record<string, string[]> = {
        'mo_recruit': ['Charismatic', 'Popular', 'Connected'],
        'smallDonationDrive': ['Wealthy', 'Connected', 'Respected'],
        'doorToDoorCampaign': ['Charismatic', 'Relatable', 'Popular'],
        'giveInterview': ['Charismatic', 'Articulate', 'Media Savvy'],
        'openMembershipBooth': ['Charismatic', 'Friendly', 'Popular'],
        'cm_survey': ['Analytical', 'Strategic', 'Connected'],
      };
      
      let traitBonus = 0;
      if (traitMatches[actionId]?.includes(staff.trait || '')) {
        traitBonus = 0.5; // Strong match for now
      }
  
      const finalScore = calculateActionOutcomeScore(roll, currentTier.mult, traitBonus, staff.loyalty, staff.risk || 'Low', countryInfo.stability);
      const quality = getResultQuality(finalScore);
  
      // Specific logic
      let membersJoined = 0;
      let recognitionGain = 0;
      let publicTrustGain = 0;
      let moneyRaised = 0;
      let policyCredibilityGain = 0;
      let internalUnityGain = 0;
      let supportGain = 0;
      let controversyGain = 0;
      let mediaPresenceGain = 0;
      let campaignStrengthGain = 0;
      let surveyData: any = null;


      let updatedMainPromise = ctx.partyStats?.mainPromise || '';
      
      if (actionId === 'mo_recruit') {
      if (finalScore < 0) {
        membersJoined = Math.floor(Math.random() * 11);
      } else if (finalScore < 2) {
        membersJoined = Math.floor(10 + Math.random() * 51);
        recognitionGain = 0.02 + Math.random() * 0.06;
        publicTrustGain = Math.random() * 0.05;
      } else if (finalScore < 4) {
        membersJoined = Math.floor(60 + Math.random() * 121);
        recognitionGain = 0.05 + Math.random() * 0.10;
        publicTrustGain = 0.02 + Math.random() * 0.08;
      } else if (finalScore < 6) {
        membersJoined = Math.floor(180 + Math.random() * 321);
        recognitionGain = 0.15 + Math.random() * 0.20;
        publicTrustGain = 0.05 + Math.random() * 0.15;
      } else if (finalScore < 8) {
        membersJoined = Math.floor(500 + Math.random() * 701);
        recognitionGain = 0.35 + Math.random() * 0.35;
        publicTrustGain = 0.15 + Math.random() * 0.20;
      } else if (finalScore < 9.5) {
        membersJoined = Math.floor(1200 + Math.random() * 1301);
        recognitionGain = 0.70 + Math.random() * 0.50;
        publicTrustGain = 0.30 + Math.random() * 0.30;
      } else {
        membersJoined = Math.floor(2500 + Math.random() * 2501);
        recognitionGain = 1.20 + Math.random() * 0.80;
        publicTrustGain = 0.60 + Math.random() * 0.40;
      }
    } else if (actionId === 'smallDonationDrive') {
      let percent = 0;
      if (finalScore < 0) percent = Math.random() * 0.35;
      else if (finalScore < 2) { percent = 0.35 + Math.random() * 0.35; recognitionGain = Math.random() * 0.05; }
      else if (finalScore < 4) { percent = 0.70 + Math.random() * 0.35; recognitionGain = 0.05 + Math.random() * 0.07; }
      else if (finalScore < 6) { percent = 1.05 + Math.random() * 0.30; recognitionGain = 0.12 + Math.random() * 0.13; }
      else if (finalScore < 8) { percent = 1.35 + Math.random() * 0.35; recognitionGain = 0.25 + Math.random() * 0.20; }
      else if (finalScore < 9.5) { percent = 1.70 + Math.random() * 0.35; recognitionGain = 0.45 + Math.random() * 0.25; }
      else { percent = 2.05 + Math.random() * 0.15; recognitionGain = 0.70 + Math.random() * 0.30; }
      moneyRaised = currentTier.cost * percent;
    } else if (actionId === 'pl_promise') {
      if (finalScore < 0) {
        controversyGain = 0.2;
      } else if (finalScore < 2) {
        updatedMainPromise = selectedPromise;
        recognitionGain = 0.05;
      } else if (finalScore < 4) {
        updatedMainPromise = selectedPromise;
        recognitionGain = 0.10;
        policyCredibilityGain = 0.2;
      } else if (finalScore < 6) {
        updatedMainPromise = selectedPromise;
        recognitionGain = 0.25;
        policyCredibilityGain = 0.5;
      } else if (finalScore < 8) {
        updatedMainPromise = selectedPromise;
        recognitionGain = 0.50;
        policyCredibilityGain = 1.0;
        supportGain = 0.02;
      } else if (finalScore < 9.5) {
        updatedMainPromise = selectedPromise;
        recognitionGain = 0.80;
        policyCredibilityGain = 1.5;
        supportGain = 0.05;
      } else {
        updatedMainPromise = selectedPromise;
        recognitionGain = 1.20;
        policyCredibilityGain = 2.0;
        supportGain = 0.10;
      }
    } else if (actionId === 'cm_rally') {
      if (finalScore < 0) {
        recognitionGain = 0.02;
        controversyGain = 0.2;
      } else if (finalScore < 2) {
        recognitionGain = 0.10;
        supportGain = 0.005;
      } else if (finalScore < 4) {
        recognitionGain = 0.25;
        supportGain = 0.01;
        publicTrustGain = 0.05;
      } else if (finalScore < 6) {
        recognitionGain = 0.60;
        supportGain = 0.03;
        publicTrustGain = 0.10;
      } else if (finalScore < 8) {
        recognitionGain = 1.10;
        supportGain = 0.06;
        publicTrustGain = 0.30;
      } else if (finalScore < 9.5) {
        recognitionGain = 1.80;
        supportGain = 0.10;
        publicTrustGain = 0.50;
      } else {
        recognitionGain = 2.50;
        supportGain = 0.18;
        publicTrustGain = 0.80;
      }
    } else if (actionId === 'meo_statement') {
      if (finalScore < 0) {
        controversyGain = 0.2;
      } else if (finalScore < 2) {
        mediaPresenceGain = 0.2;
      } else if (finalScore < 4) {
        mediaPresenceGain = 0.5;
        recognitionGain = 0.05;
      } else if (finalScore < 6) {
        mediaPresenceGain = 1.0;
        recognitionGain = 0.15;
        policyCredibilityGain = 0.1;
      } else if (finalScore < 8) {
        mediaPresenceGain = 1.8;
        recognitionGain = 0.35;
        policyCredibilityGain = 0.3;
      } else if (finalScore < 9.5) {
        mediaPresenceGain = 2.8;
        recognitionGain = 0.60;
        policyCredibilityGain = 0.5;
      } else {
        mediaPresenceGain = 4.0;
        recognitionGain = 0.90;
        policyCredibilityGain = 0.8;
      }
    } else if (actionId === 'doorToDoorCampaign') {
      if (finalScore < 0) {
        recognitionGain = 0.01 + Math.random() * 0.02; // +0.01 to +0.03
        controversyGain = 0.08 + Math.random() * 0.07; // +0.08 to +0.15
      } else if (finalScore < 2) {
        publicTrustGain = 0.05 + Math.random() * 0.10;
        supportGain = 0.002 + Math.random() * 0.004;
        recognitionGain = 0.03 + Math.random() * 0.05;
        controversyGain = 0.02 + Math.random() * 0.04;
      } else if (finalScore < 4) {
        publicTrustGain = 0.15 + Math.random() * 0.20;
        supportGain = 0.006 + Math.random() * 0.006;
        recognitionGain = 0.08 + Math.random() * 0.08;
        controversyGain = Math.random() * 0.02;
      } else if (finalScore < 6) {
        publicTrustGain = 0.35 + Math.random() * 0.30;
        supportGain = 0.012 + Math.random() * 0.010;
        recognitionGain = 0.16 + Math.random() * 0.14;
      } else if (finalScore < 8) {
        publicTrustGain = 0.65 + Math.random() * 0.40;
        supportGain = 0.022 + Math.random() * 0.018;
        recognitionGain = 0.30 + Math.random() * 0.25;
      } else if (finalScore < 9.5) {
        publicTrustGain = 1.05 + Math.random() * 0.55;
        supportGain = 0.040 + Math.random() * 0.030;
        recognitionGain = 0.55 + Math.random() * 0.35;
      } else {
        publicTrustGain = 1.60 + Math.random() * 0.60;
        supportGain = 0.070 + Math.random() * 0.040;
        recognitionGain = 0.90 + Math.random() * 0.30;
      }
    } else if (actionId === 'giveInterview') {
      if (finalScore < 0) {
        controversyGain = 0.25 + Math.random() * 0.20;
        publicTrustGain = -(0.10 + Math.random() * 0.10);
      } else if (finalScore < 2) {
        mediaPresenceGain = 0.20 + Math.random() * 0.30;
        recognitionGain = 0.03 + Math.random() * 0.05;
        supportGain = Math.random() * 0.004;
        controversyGain = 0.08 + Math.random() * 0.07;
        publicTrustGain = -(0.04 + Math.random() * 0.06);
      } else if (finalScore < 4) {
        mediaPresenceGain = 0.50 + Math.random() * 0.50;
        recognitionGain = 0.08 + Math.random() * 0.10;
        supportGain = 0.004 + Math.random() * 0.004;
        controversyGain = 0.02 + Math.random() * 0.03;
        publicTrustGain = -(0.02 + Math.random() * 0.03);
      } else if (finalScore < 6) {
        mediaPresenceGain = 1.00 + Math.random() * 0.80;
        recognitionGain = 0.18 + Math.random() * 0.17;
        supportGain = 0.008 + Math.random() * 0.007;
        controversyGain = Math.random() * 0.02;
        publicTrustGain = -(Math.random() * 0.02);
      } else if (finalScore < 8) {
        mediaPresenceGain = 1.80 + Math.random() * 1.00;
        recognitionGain = 0.35 + Math.random() * 0.30;
        supportGain = 0.015 + Math.random() * 0.013;
      } else if (finalScore < 9.5) {
        mediaPresenceGain = 2.80 + Math.random() * 1.20;
        recognitionGain = 0.65 + Math.random() * 0.35;
        supportGain = 0.028 + Math.random() * 0.022;
      } else {
        mediaPresenceGain = 4.00 + Math.random() * 1.30;
        recognitionGain = 1.00 + Math.random() * 0.45;
        supportGain = 0.050 + Math.random() * 0.030;
      }
    } else if (actionId === 'openMembershipBooth') {
      if (finalScore < 0) {
        membersJoined = Math.floor(Math.random() * 6);
        supportGain = -(0.001 + Math.random() * 0.002);
      } else if (finalScore < 2) {
        membersJoined = Math.floor(5 + Math.random() * 21);
        recognitionGain = 0.01 + Math.random() * 0.03;
        supportGain = -(Math.random() * 0.002);
      } else if (finalScore < 4) {
        membersJoined = Math.floor(25 + Math.random() * 56);
        recognitionGain = 0.04 + Math.random() * 0.06;
        publicTrustGain = 0.01 + Math.random() * 0.02;
      } else if (finalScore < 6) {
        membersJoined = Math.floor(80 + Math.random() * 101);
        recognitionGain = 0.10 + Math.random() * 0.10;
        publicTrustGain = 0.03 + Math.random() * 0.04;
        supportGain = Math.random() * 0.003;
      } else if (finalScore < 8) {
        membersJoined = Math.floor(180 + Math.random() * 201);
        recognitionGain = 0.20 + Math.random() * 0.22;
        publicTrustGain = 0.07 + Math.random() * 0.07;
        supportGain = 0.003 + Math.random() * 0.005;
      } else if (finalScore < 9.5) {
        membersJoined = Math.floor(380 + Math.random() * 381);
        recognitionGain = 0.42 + Math.random() * 0.28;
        publicTrustGain = 0.14 + Math.random() * 0.10;
        supportGain = 0.008 + Math.random() * 0.007;
      } else {
        membersJoined = Math.floor(760 + Math.random() * 491);
        recognitionGain = 0.70 + Math.random() * 0.30;
        publicTrustGain = 0.24 + Math.random() * 0.12;
        supportGain = 0.015 + Math.random() * 0.010;
      }
    } else if (actionId === 'cm_survey') {
      let pollingAccuracy = 'Very Low';
      let voteShareMargin = 8.0;

      if (finalScore < 0) {
        pollingAccuracy = 'Very Low';
        voteShareMargin = 8.0;
      } else if (finalScore < 2) {
        pollingAccuracy = 'Low';
        voteShareMargin = 6.0;
        campaignStrengthGain = 0.05 + Math.random() * 0.05; // 0.05-0.10
      } else if (finalScore < 4) {
        pollingAccuracy = 'Basic';
        voteShareMargin = 4.5;
        campaignStrengthGain = 0.10 + Math.random() * 0.15; // 0.10-0.25
        supportGain = Math.random() * 0.002;
      } else if (finalScore < 6) {
        pollingAccuracy = 'Moderate';
        voteShareMargin = 3.0;
        campaignStrengthGain = 0.25 + Math.random() * 0.20; // 0.25-0.45
        supportGain = 0.002 + Math.random() * 0.004;
      } else if (finalScore < 8) {
        pollingAccuracy = 'Good';
        voteShareMargin = 2.0;
        campaignStrengthGain = 0.45 + Math.random() * 0.25; // 0.45-0.70
        supportGain = 0.006 + Math.random() * 0.006;
      } else if (finalScore < 9.5) {
        pollingAccuracy = 'High';
        voteShareMargin = 1.2;
        campaignStrengthGain = 0.70 + Math.random() * 0.30; // 0.70-1.00
        supportGain = 0.012 + Math.random() * 0.008;
      } else {
        pollingAccuracy = 'Excellent';
        voteShareMargin = 0.8;
        campaignStrengthGain = 1.00 + Math.random() * 0.30; // 1.00-1.30
        supportGain = 0.020 + Math.random() * 0.015;
      }

      // Projection calculation
      const cpRaw = localStorage.getItem('worldr_current_party');
      let isRegistered = false;
      let allocatedFunds = 0;
      if (cpRaw) {
        const cp = JSON.parse(cpRaw);
        const campaignsRaw = localStorage.getItem('worldr_election_campaigns');
        if (campaignsRaw) {
          const campaigns = JSON.parse(campaignsRaw);
          const currentCampaign = campaigns.find((c: any) => c.partyId === cp.partyId);
          if (currentCampaign) {
            isRegistered = true;
            allocatedFunds = currentCampaign.allocatedElectionFunds || 0;
          }
        }
      }

      // Default registered part count / recog
      const rpRaw = localStorage.getItem('worldr_registered_parties');
      const allRegisteredParties = rpRaw ? JSON.parse(rpRaw) : [];
      let totalPlayerRecognition = 0;
      if (ctx.partyStats?.recognition) totalPlayerRecognition += ctx.partyStats.recognition;
      // In multiplayer, you'd add up all parties' recognition here.

      const registeredPlayerPartiesCount = Math.max(1, allRegisteredParties.length);

      const strengthResult = calculateElectionStrength({
        partyStats: ctx.partyStats,
        allocatedFunds,
        hasMainPromise: !!(ctx.partyStats?.mainPromise),
      });

      const independentStrength = calculateIndependentStrength({
        registeredPlayerPartiesCount,
        totalPlayerRecognition
      });

      // Temporary local logic - omitting other player parties
      const otherPlayerPartyStrengths = 0;
      
      const projectedVoteShareBase = (strengthResult.baseStrength / (strengthResult.baseStrength + independentStrength + otherPlayerPartyStrengths)) * 100;
      
      const projectedVoteShareLow = Math.max(0, projectedVoteShareBase - voteShareMargin);
      const projectedVoteShareHigh = Math.min(100, projectedVoteShareBase + voteShareMargin);
      
      const totalSeats = 120;
      const projectedSeatsLow = Math.floor((projectedVoteShareLow / 100) * totalSeats);
      const projectedSeatsHigh = Math.ceil((projectedVoteShareHigh / 100) * totalSeats);

      // We attach these specifically to the result object
      surveyData = {
        pollingAccuracy,
        voteShareMargin,
        projectedVoteShareBase,
        projectedVoteShareLow,
        projectedVoteShareHigh,
        projectedSeatsLow,
        projectedSeatsHigh,
        partyStrength: strengthResult.baseStrength,
        independentStrength,
        campaignStrengthGain
      };
    }
  
    const result = {
      actionId,
      actionName: action.name,
      roleName: position.title,
      officialName: staff.name,
      staffSkill: staff.skill,
      staffRoll: roll,
      investment: currentTier.cost,
      multiplier: currentTier.mult,
      traitBonus,
      loyalty: staff.loyalty,
      risk: staff.risk || 'Low',
      stabilityMod: countryInfo.stability,
      finalScore,
      quality,
      membersJoined,
      recognitionGain,
      publicTrustGain,
      moneyRaised,
      policyCredibilityGain,
      internalUnityGain,
      supportGain,
      controversyGain,
      mediaPresenceGain,
      campaignStrengthGain,
      surveyData,

      updatedMainPromise,
    };
  
    onExecute(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md overflow-hidden flex flex-col"
        style={{ background: PANEL, border: `1px solid ${BORDER}`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', borderRadius: '2px', maxHeight: '90vh' }}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <div className="font-bold text-sm" style={{ color: TEXT }}>{action.name}</div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] mt-0.5" style={{ color: MUTED }}>Action Execution</div>
          </div>
        </div>
        
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Official */}
          <div className="p-3" style={{ background: PANEL2, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{position.title}</span>
              <span className="text-xs font-bold text-zinc-200">{staff.name}</span>
            </div>
            <div className="flex gap-4">
              <div className="text-[10px]"><span className="text-zinc-500">Skill:</span> <span className="text-amber-500 font-mono font-bold">{staff.skill}</span></div>
              <div className="text-[10px]"><span className="text-zinc-500">Loyalty:</span> <span className="text-blue-400 font-mono font-bold">{staff.loyalty}%</span></div>
              <div className="text-[10px]"><span className="text-zinc-500">Trait:</span> <span className="text-zinc-300 font-mono">{staff.trait || 'None'}</span></div>
              <div className="text-[10px]"><span className="text-zinc-500">Risk:</span> <span className="text-red-400 font-mono">{staff.risk || 'Low'}</span></div>
            </div>
          </div>

          {/* Investment */}
          <div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Investment Tier</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {tiers.map((t, idx) => (
                <button key={idx} type="button" onClick={() => setSelectedTier(idx)}
                  className="p-2 text-center border transition-colors rounded-sm"
                  style={{
                    background: selectedTier === idx ? `${ACCENT}14` : PANEL2,
                    borderColor: selectedTier === idx ? ACCENT : BORDER,
                  }}>
                  <div className="text-xs font-bold" style={{ color: selectedTier === idx ? ACCENT : TEXT }}>{formatMoney(t.cost)}</div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: MUTED }}>{t.mult.toFixed(2)}x Mult</div>
                </button>
              ))}
            </div>
          </div>
          
          {actionId === 'pl_promise' && (
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Select Central Promise</div>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {promisesList.map((promise) => (
                  <button key={promise} type="button" onClick={() => setSelectedPromise(promise)}
                    className="p-2 text-left border transition-colors rounded-sm flex items-center justify-between"
                    style={{
                      background: selectedPromise === promise ? `${ACCENT}14` : PANEL2,
                      borderColor: selectedPromise === promise ? ACCENT : BORDER,
                    }}>
                    <span className="text-[11px] font-semibold" style={{ color: selectedPromise === promise ? ACCENT : TEXT }}>{promise}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tip */}
          <div className="p-3" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
             <p className="text-[10px] leading-relaxed text-zinc-500">
               Actions use staff skill, investment, loyalty, risk, traits, and country conditions. Final outcome score ranges from -1 to 10. Higher investment improves potential results but cannot guarantee success.
             </p>
          </div>
        </div>

        <div className="px-5 py-4 shrink-0 flex gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-75"
            style={{ color: MUTED, border: `1px solid ${BORDER}` }}>
            Cancel
          </button>
          <button type="button" onClick={handleExecute} disabled={!canExecute}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-75"
            style={{ 
              background: canExecute ? `${ACCENT}14` : 'transparent', 
              border: `1px solid ${canExecute ? ACCENT : BORDER}`, 
              color: canExecute ? ACCENT : MUTED,
              opacity: canExecute ? 1 : 0.5,
              cursor: canExecute ? 'pointer' : 'not-allowed'
            }}>
            {canAfford ? (actionId === 'pl_promise' && !selectedPromise ? 'Select Promise' : 'Execute Action') : 'Insufficient Funds'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionResultsModal({
  result,
  onClose
}: {
  result: any;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md overflow-hidden flex flex-col"
        style={{ background: PANEL, border: `1px solid ${BORDER}`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', borderRadius: '2px' }}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <div className="font-bold text-sm" style={{ color: TEXT }}>Action Completed: {result.actionName}</div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] mt-0.5 text-emerald-500">{result.quality} Result</div>
          </div>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Final Score</div>
              <div className="text-2xl font-bold text-white">{result.finalScore.toFixed(2)}</div>
              <div className="text-[9px] text-zinc-500">Max: 10.00</div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Staff Roll (Base)</div>
              <div className="text-lg font-bold text-zinc-300">{result.staffRoll}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
             <div className="flex justify-between"><span className="text-zinc-500">Investment Mult:</span> <span className="text-emerald-400 font-mono">x{result.multiplier.toFixed(2)}</span></div>
             <div className="flex justify-between"><span className="text-zinc-500">Trait Bonus:</span> <span className="text-emerald-400 font-mono">+{result.traitBonus.toFixed(1)}</span></div>
             <div className="flex justify-between"><span className="text-zinc-500">Loyalty Mod:</span> <span className="text-zinc-300 font-mono">{result.loyalty >= 60 ? '+' : ''}—</span></div>
             <div className="flex justify-between"><span className="text-zinc-500">Risk Mod:</span> <span className="text-zinc-300 font-mono">—</span></div>
          </div>

          <div className="h-px w-full" style={{ background: BORDER }} />

          <div className="space-y-2">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Outcome Effects</div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Investment Cost</span>
              <span className="text-red-400 font-mono">-{formatMoney(result.investment)}</span>
            </div>
            {result.moneyRaised > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Gross Money Raised</span>
                <span className="text-emerald-400 font-mono">+{formatMoney(result.moneyRaised)}</span>
              </div>
            )}
            {result.moneyRaised > 0 && (
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-white/[0.05] mt-1">
                <span className="text-zinc-300">Net Funds Gain</span>
                <span className={result.moneyRaised - result.investment >= 0 ? "text-emerald-500 font-mono" : "text-red-500 font-mono"}>
                  {result.moneyRaised - result.investment >= 0 ? '+' : '-'}{formatMoney(Math.abs(result.moneyRaised - result.investment))}
                </span>
              </div>
            )}
            {result.membersJoined !== 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">New Members</span>
                <span className={`font-mono ${result.membersJoined > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.membersJoined > 0 ? '+' : ''}{result.membersJoined.toLocaleString()}
                </span>
              </div>
            )}
            {result.recognitionGain !== 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Recognition</span>
                <span className={`font-mono ${result.recognitionGain > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.recognitionGain > 0 ? '+' : ''}{result.recognitionGain.toFixed(2)}
                </span>
              </div>
            )}
            {result.publicTrustGain !== 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Public Trust</span>
                <span className={`font-mono ${result.publicTrustGain > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.publicTrustGain > 0 ? '+' : ''}{result.publicTrustGain.toFixed(2)}
                </span>
              </div>
            )}
            {result.policyCredibilityGain !== 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Policy Credibility</span>
                <span className={`font-mono ${result.policyCredibilityGain > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.policyCredibilityGain > 0 ? '+' : ''}{result.policyCredibilityGain.toFixed(2)}
                </span>
              </div>
            )}
            {result.supportGain !== 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Polling Support</span>
                <span className={`font-mono ${result.supportGain > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.supportGain > 0 ? '+' : ''}{result.supportGain.toFixed(2)}%
                </span>
              </div>
            )}
            {result.mediaPresenceGain !== 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Media Presence</span>
                <span className={`font-mono ${result.mediaPresenceGain > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.mediaPresenceGain > 0 ? '+' : ''}{result.mediaPresenceGain.toFixed(2)}
                </span>
              </div>
            )}
            {result.internalUnityGain !== 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Internal Unity</span>
                <span className={`font-mono ${result.internalUnityGain > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.internalUnityGain > 0 ? '+' : ''}{result.internalUnityGain.toFixed(2)}
                </span>
              </div>
            )}
            {result.controversyGain > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Controversy</span>
                <span className="text-red-400 font-mono">+{result.controversyGain.toFixed(2)}</span>
              </div>
            )}
            {result.actionId === 'pl_promise' && result.updatedMainPromise && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Main Promise</span>
                <span className="text-emerald-400">{result.updatedMainPromise}</span>
              </div>
            )}
            {result.surveyData && (
              <div className="mt-4 pt-3 border-t border-white/[0.05] space-y-2">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Survey Results</div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Polling Accuracy</span>
                  <span className={`font-bold ${result.surveyData.pollingAccuracy === 'Excellent' || result.surveyData.pollingAccuracy === 'High' ? 'text-emerald-400' : result.surveyData.pollingAccuracy === 'Good' || result.surveyData.pollingAccuracy === 'Moderate' ? 'text-amber-400' : 'text-red-400'}`}>{result.surveyData.pollingAccuracy}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Margin of Error</span>
                  <span className="font-mono text-zinc-300">±{result.surveyData.voteShareMargin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Projected Vote Share</span>
                  <span className="font-bold text-amber-400">{result.surveyData.projectedVoteShareLow.toFixed(1)}% – {result.surveyData.projectedVoteShareHigh.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Projected Seats</span>
                  <span className="font-bold text-amber-400">{result.surveyData.projectedSeatsLow} – {result.surveyData.projectedSeatsHigh}</span>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-zinc-400">Campaign Strength Gain</span>
                  <span className="font-bold text-emerald-400">+{result.surveyData.campaignStrengthGain.toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="flex justify-between text-xs font-bold pt-1 border-t border-white/[0.05] mt-1">
              <span className="text-zinc-300">Updated Party Funds</span>
              <span className="text-emerald-500 font-mono">{formatMoney(result.updatedFunds)}</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button type="button" onClick={onClose}
            className="w-full py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-75"
            style={{ background: `${ACCENT}14`, border: `1px solid ${ACCENT}`, color: ACCENT }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActionsPage() {
  const router = useRouter();
  const { character } = useCharacterStore();
  const [revealed, setRevealed] = useState(false);
  const [showPartyMenu, setShowPartyMenu] = useState(false);
  const [showDissolveModal, setShowDissolveModal] = useState(false);
  const [showRedoCharModal, setShowRedoCharModal] = useState(false);
  const [showRebrandPartyModal, setShowRebrandPartyModal] = useState(false);
  const [selectedPosId, setSelectedPosId] = useState('party_leader');
  const [hireTarget, setHireTarget] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [activeSubtab, setActiveSubtab] = useState<'Party HQ' | 'Party Staff' | 'Party Strategy' | 'Budget' | 'Elections' | 'Past Elections' | 'Activity Log'>('Party HQ');
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<any>(null);

  const [ctx, setCtx] = useState<PlayerCtx>({
    characterName: '—', characterAge: '—',
    countryName: 'Drennia', continentName: 'Varelia',
    partyName: '—', partyAbbreviation: '—',
    partyColor: ACCENT, partyLogoId: '',
    ideologyIds: [], partyDescription: '', partyCreatedAt: '',
    selectedPath: 'Politician',
    partyId: '',
    partyFunds: 2000000,
  });

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);

    const charName = [character.firstName, character.middleName, character.lastName].filter(Boolean).join(' ') || '—';
    const charAge = character.age ?? '—';

    let countryName = 'Drennia', continentName = 'Varelia';
    try {
      const raw = localStorage.getItem('worldr_selected_country');
      if (raw) { const c = JSON.parse(raw); countryName = c.countryName ?? 'Drennia'; continentName = c.continentName ?? 'Varelia'; }
    } catch { }

    let partyName = '—', partyAbbreviation = '—', partyColor = ACCENT, partyLogoId = '', partyId = '';
    let ideologyIds: string[] = [], partyDescription = '', partyCreatedAt = '';
    try {
      const pRaw = localStorage.getItem('worldr_current_party');
      if (pRaw) {
        const p: RegisteredPoliticalParty = JSON.parse(pRaw);
        partyId = p.partyId;
        partyName = p.partyName ?? '—';
        partyAbbreviation = p.partyAbbreviation ?? '—';
        partyLogoId = p.partyLogoId ?? '';
        partyColor = PARTY_COLORS.find((c) => c.id === p.colorId)?.hex ?? ACCENT;
        ideologyIds = p.ideologyIds ?? [];
        partyDescription = p.partyDescription ?? '';
        partyCreatedAt = p.createdAt ?? '';
      }
    } catch { }

    const pathRaw = localStorage.getItem('worldr_selected_path') || localStorage.getItem('worldr-path');
    const pathLabels: Record<string, string> = {
      politician: 'Politician', businessman: 'Businessman',
      military: 'Military Officer', judicial: 'Judicial Officer', media: 'Media & Influence',
    };
    const selectedPath = pathLabels[pathRaw ?? ''] ?? 'Politician';

    let partyFunds = 2000000;
    let partyBudget: any = null;
    let partyStats: any = { members: 1, recognition: 0, support: 0.1 };
    try {
      const budgetRaw = localStorage.getItem('worldr_party_budget');
      if (budgetRaw) {
        partyBudget = JSON.parse(budgetRaw);
        partyBudget = {
          partyId,
          partyFunds: partyBudget.partyFunds ?? 2000000,
          totalRevenue: partyBudget.totalRevenue ?? 0,
          totalExpenses: partyBudget.totalExpenses ?? 0,
          monthlyRevenue: partyBudget.monthlyRevenue ?? 0,
          otherExpenses: partyBudget.otherExpenses ?? 0,
        };
        localStorage.setItem('worldr_party_budget', JSON.stringify(partyBudget));
        partyFunds = partyBudget.partyFunds;
      } else if (partyId) {
        partyBudget = { partyId, partyFunds: 2000000, totalRevenue: 0, totalExpenses: 0, monthlyRevenue: 0, otherExpenses: 0 };
        localStorage.setItem('worldr_party_budget', JSON.stringify(partyBudget));
      }

      const statsRaw = localStorage.getItem('worldr_party_stats');
      if (statsRaw) {
        partyStats = JSON.parse(statsRaw);
        // Safe migration
        if (partyStats.policyCredibility === undefined) {
           partyStats = {
              ...partyStats,
              mainPromise: partyStats.mainPromise || "",
              policyCredibility: partyStats.policyCredibility || 0,
              legalReadiness: partyStats.legalReadiness || 0,
              campaignStrength: partyStats.campaignStrength || 0,
              mediaPresence: partyStats.mediaPresence || 0,
              regionalReach: partyStats.regionalReach || 0,
              businessFavorability: partyStats.businessFavorability || 0,
              ruralFavorability: partyStats.ruralFavorability || 0,
              youthFavorability: partyStats.youthFavorability || 0,
              workerFavorability: partyStats.workerFavorability || 0,
              traditionalFavorability: partyStats.traditionalFavorability || 0
           };
           localStorage.setItem('worldr_party_stats', JSON.stringify(partyStats));
        }
      } else if (partyId) {
        partyStats = {
          partyId, members: 1, volunteers: 0, recognition: 0, support: 0.1, internalUnity: 100, controversy: 0,
          publicTrust: 0, mainPromise: "", policyCredibility: 0, legalReadiness: 0, campaignStrength: 0, mediaPresence: 0,
          regionalReach: 0, businessFavorability: 0, ruralFavorability: 0, youthFavorability: 0,
          workerFavorability: 0, traditionalFavorability: 0
        };
        localStorage.setItem('worldr_party_stats', JSON.stringify(partyStats));
      }

      const logRaw = localStorage.getItem('worldr_activity_log');
      if (!logRaw && partyId) {
        localStorage.setItem('worldr_activity_log', JSON.stringify([]));
      }
    } catch(e) {}

    setCtx({ characterName: charName, characterAge: charAge, countryName, continentName, partyName, partyAbbreviation, partyColor, partyLogoId, ideologyIds, partyDescription, partyCreatedAt, selectedPath, partyId, partyFunds, partyBudget, partyStats });

    // Build positions
    const staffRaw = localStorage.getItem('worldr_party_staff');
    let staffDb = staffRaw ? JSON.parse(staffRaw) : {};

    let staffMigrated = false;
    if (staffDb.campaignManager && !staffDb.campaignMediaManager) {
      staffDb.campaignMediaManager = staffDb.campaignManager;
      staffMigrated = true;
    } else if (staffDb.campaign_manager && !staffDb.campaignMediaManager) {
      staffDb.campaignMediaManager = staffDb.campaign_manager;
      staffMigrated = true;
    } else if (staffDb.mediaOfficer && !staffDb.campaignMediaManager) {
      staffDb.campaignMediaManager = staffDb.mediaOfficer;
      staffMigrated = true;
    } else if (staffDb.media_officer && !staffDb.campaignMediaManager) {
      staffDb.campaignMediaManager = staffDb.media_officer;
      staffMigrated = true;
    }

    if (staffDb.policy_director && !staffDb.policyDirector) {
      staffDb.policyDirector = staffDb.policy_director;
      staffMigrated = true;
    }
    if (staffDb.membership_officer && !staffDb.membershipOfficer) {
      staffDb.membershipOfficer = staffDb.membership_officer;
      staffMigrated = true;
    }

    const rolesToRemove = [
      'secretary', 'campaignManager', 'campaign_manager', 
      'spokesperson', 'legalOfficer', 'legal_officer', 
      'publicNetworkOfficer', 'public_network_officer', 
      'mediaOfficer', 'media_officer', 
      'regionalOrganizer', 'regional_organizer',
      'policy_director', 'membership_officer'
    ];
    
    for (const r of rolesToRemove) {
      if (staffDb[r]) {
        delete staffDb[r];
        staffMigrated = true;
      }
    }

    if (staffMigrated) {
      localStorage.setItem('worldr_party_staff', JSON.stringify(staffDb));
    }

    const filled: Position[] = POSITION_DEFINITIONS.map((def) => {
      if (def.id === 'party_leader') {
        return {
          ...def,
          filledBy: {
            name: charName !== '—' ? charName : 'Player Name',
            age: charAge,
            skill: 'Leadership',
            loyalty: 100,
            status: 'Founder',
          },
        };
      }
      
      const hired = staffDb[def.id];
      if (hired) {
         return {
            ...def,
            filledBy: hired
         };
      }
      return { ...def };
    });
    setPositions(filled);

    return () => clearTimeout(t);
  }, [character]);

  const selectedPos = positions.find((p) => p.id === selectedPosId) ?? positions[0];
  const ideologyNames = ctx.ideologyIds.map((id) => IDEOLOGY_NAMES[id] ?? id);

  const handleTriggerAction = (actionId: string) => {
    if (actionId === 'pl_dissolve') {
      setShowDissolveModal(true);
    } else if (actionId === 'pim_redo_char') {
      setShowRedoCharModal(true);
    } else if (actionId === 'pim_rebrand_party') {
      setShowRebrandPartyModal(true);
    } else {
      setActiveActionId(actionId);
    }
  };

  const handleActionExecute = (result: any) => {
    setActiveActionId(null);
    
    // Developer Comment: Temporary frontend economy update. In multiplayer, party funds and stats must be validated and stored in backend/database.
    let updatedFunds = ctx.partyFunds - result.investment + result.moneyRaised;
    let updatedStats = { ...ctx.partyStats };
    
    updatedStats.members = (updatedStats.members || 0) + result.membersJoined;
    updatedStats.recognition = (updatedStats.recognition || 0) + result.recognitionGain;
    updatedStats.publicTrust = (updatedStats.publicTrust || 0) + result.publicTrustGain;
    updatedStats.policyCredibility = (updatedStats.policyCredibility || 0) + result.policyCredibilityGain;
    updatedStats.internalUnity = (updatedStats.internalUnity || 100) + result.internalUnityGain;
    updatedStats.support = (updatedStats.support || 0.1) + result.supportGain;
    updatedStats.controversy = (updatedStats.controversy || 0) + result.controversyGain;
    updatedStats.mediaPresence = (updatedStats.mediaPresence || 0) + result.mediaPresenceGain;
    

    if (result.updatedMainPromise) updatedStats.mainPromise = result.updatedMainPromise;

    let updatedBudget = ctx.partyBudget || { partyId: ctx.partyId, partyFunds: 2000000, totalRevenue: 0, totalExpenses: 0, monthlyRevenue: 0, otherExpenses: 0 };

    try {
      updatedBudget.partyFunds = updatedFunds;
      updatedBudget.totalExpenses += result.investment;
      if (result.moneyRaised > 0) {
        updatedBudget.totalRevenue += result.moneyRaised;
      }
      localStorage.setItem('worldr_party_budget', JSON.stringify(updatedBudget));

      localStorage.setItem('worldr_party_stats', JSON.stringify(updatedStats));

      if (result.membersJoined > 0) {
        const rpRaw = localStorage.getItem('worldr_registered_parties');
        if (rpRaw) {
          const rps = JSON.parse(rpRaw);
          const rpIdx = rps.findIndex((p: any) => p.partyId === ctx.partyId);
          if (rpIdx >= 0) {
            rps[rpIdx].members = updatedStats.members;
            rps[rpIdx].memberCount = updatedStats.members;
            rps[rpIdx].registeredMembers = updatedStats.members;
            localStorage.setItem('worldr_registered_parties', JSON.stringify(rps));
          }
        }
      }


      // Financial Transactions
      const txRaw = localStorage.getItem('worldr_party_transactions');
      const transactions = txRaw ? JSON.parse(txRaw) : [];
      
      if (result.actionId === 'mo_recruit') {
        transactions.unshift({
          id: Math.random().toString(36).substring(2, 9),
          partyId: ctx.partyId,
          type: "expense",
          category: "Recruitment",
          source: "Recruit Members",
          amount: result.investment,
          actionName: result.actionName,
          createdAt: new Date().toISOString()
        });
      } else if (result.actionId === 'smallDonationDrive') {
        transactions.unshift({
          id: Math.random().toString(36).substring(2, 9),
          partyId: ctx.partyId,
          type: "expense",
          category: "Fundraising Cost",
          source: "Small Donation Drive",
          amount: result.investment,
          actionName: result.actionName,
          createdAt: new Date().toISOString()
        });
        transactions.unshift({
          id: Math.random().toString(36).substring(2, 9),
          partyId: ctx.partyId,
          type: "revenue",
          category: "Donation",
          source: "Small Donation Drive",
          amount: result.moneyRaised,
          actionName: result.actionName,
          createdAt: new Date().toISOString()
        });
      } else {
         let txCat = "Operation Cost";
         if (result.actionId === 'doorToDoorCampaign' || result.actionId === 'cm_rally') txCat = "Campaign";
         if (result.actionId === 'giveInterview' || result.actionId === 'meo_statement') txCat = "Media";
         if (result.actionId === 'openMembershipBooth') txCat = "Recruitment";
         if (result.actionId === 'cm_survey') txCat = "Research";
         
         transactions.unshift({
           id: Math.random().toString(36).substring(2, 9),
           partyId: ctx.partyId,
           type: "expense",
           category: txCat,
           source: result.actionName,
           amount: result.investment,
           actionName: result.actionName,
           createdAt: new Date().toISOString()
         });
      }
      localStorage.setItem('worldr_party_transactions', JSON.stringify(transactions));

      // Developer Comment: Temporary local activity log. In multiplayer, logs must be generated server-side.
      if (result.actionId === 'cm_survey' && result.surveyData) {
        const surveysRaw = localStorage.getItem('worldr_election_surveys');
        const surveys = surveysRaw ? JSON.parse(surveysRaw) : [];
        surveys.unshift({
          id: Math.random().toString(36).substring(2, 9),
          partyId: ctx.partyId,
          surveyData: result.surveyData,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('worldr_election_surveys', JSON.stringify(surveys));
      }

      const logRaw = localStorage.getItem('worldr_activity_log');
      const logs = logRaw ? JSON.parse(logRaw) : [];
      let summaryStr = `Action executed with score ${result.finalScore.toFixed(2)}. ${result.membersJoined > 0 ? '+' + result.membersJoined + ' members. ' : ''}${result.moneyRaised > 0 ? 'Raised ' + formatMoney(result.moneyRaised) + '. ' : ''}`;
      
      if (result.actionId === 'mo_recruit') {
        summaryStr = `Membership Officer recruited ${result.membersJoined.toLocaleString()} new members with a ${result.quality.toLowerCase()} recruitment result.`;
      } else if (result.actionId === 'smallDonationDrive') {
        const net = result.moneyRaised - result.investment;
        summaryStr = `Treasurer raised ${formatMoney(result.moneyRaised)} from a small donation drive. Net funds changed by ${net >= 0 ? '+' : '-'}${formatMoney(Math.abs(net))}.`;

      } else if (result.actionId === 'pl_promise') {
        summaryStr = `Party Leader declared ${result.updatedMainPromise || 'a new policy'} as the party's main promise.`;
      } else if (result.actionId === 'cm_rally') {
        summaryStr = `Campaign & Media Manager held a local rally and increased recognition by ${result.recognitionGain.toFixed(2)}.`;
      } else if (result.actionId === 'meo_statement') {
        summaryStr = `Campaign & Media Manager published a party statement.`;
      } else if (result.actionId === 'doorToDoorCampaign') {
        summaryStr = `Campaign & Media Manager ran a door-to-door campaign and improved public trust.`;
      } else if (result.actionId === 'giveInterview') {
        summaryStr = `Campaign & Media Manager gave an interview and expanded media presence.`;
      } else if (result.actionId === 'openMembershipBooth') {
        summaryStr = `Membership Officer opened a membership booth and recruited new members.`;
      } else if (result.actionId === 'cm_survey') {
        summaryStr = `Campaign & Media Manager conducted a voter survey with ${result.surveyData?.pollingAccuracy || 'Unknown'} accuracy.`;
      }

      const newLog = {
        id: Math.random().toString(36).substring(2, 9),
        partyId: ctx.partyId,
        countryName: ctx.countryName,
        continentName: ctx.continentName,
        actionName: result.actionName,
        roleName: result.roleName,
        officialName: result.officialName,
        investment: result.investment,
        finalScore: result.finalScore,
        resultQuality: result.quality,
        summary: summaryStr,
        createdAt: new Date().toISOString()
      };
      logs.unshift(newLog);
      localStorage.setItem('worldr_activity_log', JSON.stringify(logs));
    } catch(e) {}
    
    setCtx({ ...ctx, partyFunds: updatedFunds, partyBudget: updatedBudget, partyStats: updatedStats });
    setActiveResult({ ...result, updatedFunds });
  };

  const handleConfirmRedoChar = () => {
    if (ctx.partyFunds < 500000) return;
    const updatedFunds = ctx.partyFunds - 500000;
    
    let updatedBudget = ctx.partyBudget || { partyId: ctx.partyId, partyFunds: 2000000, totalRevenue: 0, totalExpenses: 0, monthlyRevenue: 0, otherExpenses: 0 };
    updatedBudget.partyFunds = updatedFunds;
    updatedBudget.totalExpenses += 500000;
    
    const txRaw = localStorage.getItem('worldr_party_transactions');
    const transactions = txRaw ? JSON.parse(txRaw) : [];
    transactions.unshift({
      id: Math.random().toString(36).substring(2, 9),
      partyId: ctx.partyId,
      type: "expense",
      category: "Identity Management",
      source: "Redo Character",
      amount: 500000,
      actionName: "Redo Character",
      createdAt: new Date().toISOString()
    });
    const logRaw = localStorage.getItem('worldr_activity_log');
    const logs = logRaw ? JSON.parse(logRaw) : [];
    logs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      partyId: ctx.partyId,
      countryName: ctx.countryName,
      continentName: ctx.continentName,
      actionName: "Redo Character",
      roleName: "Public Image Manager",
      officialName: "Staff",
      investment: 500000,
      finalScore: 10,
      resultQuality: "Success",
      summary: `Public Image Manager initiated character identity changes.`,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('worldr_party_budget', JSON.stringify(updatedBudget));
    localStorage.setItem('worldr_party_transactions', JSON.stringify(transactions));
    localStorage.setItem('worldr_activity_log', JSON.stringify(logs));
    setCtx({ ...ctx, partyFunds: updatedFunds, partyBudget: updatedBudget });
    
    router.push('/onboarding/create-character?mode=edit');
  };

  const handleConfirmRebrandParty = () => {
    if (ctx.partyFunds < 500000) return;
    const updatedFunds = ctx.partyFunds - 500000;
    
    let updatedBudget = ctx.partyBudget || { partyId: ctx.partyId, partyFunds: 2000000, totalRevenue: 0, totalExpenses: 0, monthlyRevenue: 0, otherExpenses: 0 };
    updatedBudget.partyFunds = updatedFunds;
    updatedBudget.totalExpenses += 500000;
    
    const txRaw = localStorage.getItem('worldr_party_transactions');
    const transactions = txRaw ? JSON.parse(txRaw) : [];
    transactions.unshift({
      id: Math.random().toString(36).substring(2, 9),
      partyId: ctx.partyId,
      type: "expense",
      category: "Party Branding",
      source: "Rebrand Political Party",
      amount: 500000,
      actionName: "Rebrand Political Party",
      createdAt: new Date().toISOString()
    });
    const logRaw = localStorage.getItem('worldr_activity_log');
    const logs = logRaw ? JSON.parse(logRaw) : [];
    logs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      partyId: ctx.partyId,
      countryName: ctx.countryName,
      continentName: ctx.continentName,
      actionName: "Rebrand Political Party",
      roleName: "Public Image Manager",
      officialName: "Staff",
      investment: 500000,
      finalScore: 10,
      resultQuality: "Success",
      summary: `Public Image Manager initiated a party rebrand.`,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('worldr_party_budget', JSON.stringify(updatedBudget));
    localStorage.setItem('worldr_party_transactions', JSON.stringify(transactions));
    localStorage.setItem('worldr_activity_log', JSON.stringify(logs));
    setCtx({ ...ctx, partyFunds: updatedFunds, partyBudget: updatedBudget });
    
    router.push('/onboarding/create-party?mode=edit');
  };

  const handleHireSuccess = (cand: any) => {
    if (!hireTarget) return;
    setPositions(prev => prev.map(p => p.id === hireTarget ? { ...p, filledBy: cand } : p));
    setHireTarget(null);
  };

  const handleFireStaff = (posId: string) => {
    try {
      const staffRaw = localStorage.getItem('worldr_party_staff');
      const staff = staffRaw ? JSON.parse(staffRaw) : {};
      delete staff[posId];
      localStorage.setItem('worldr_party_staff', JSON.stringify(staff));
      
      setPositions(prev => prev.map(p => p.id === posId ? { ...p, filledBy: undefined } : p));
    } catch(e) {}
  };

  const handleConfirmDissolve = () => {
    // Temporary local party dissolution. In multiplayer, party dissolution must be enforced by backend ownership checks and must release the abbreviation only after the party record is inactive/deleted.
    
    // 1. Remove current party
    localStorage.removeItem('worldr_current_party');

    // 2. Remove this party from worldr_registered_parties by partyId
    if (ctx.partyId) {
      try {
        const raw = localStorage.getItem('worldr_registered_parties');
        if (raw) {
          const registry: RegisteredPoliticalParty[] = JSON.parse(raw);
          const filtered = registry.filter((p) => p.partyId !== ctx.partyId);
          localStorage.setItem('worldr_registered_parties', JSON.stringify(filtered));
        }
      } catch (e) {}
      
      // Clear direct single-party stats
      localStorage.removeItem('worldr_party_staff');
      localStorage.removeItem('worldr_party_stats');
      localStorage.removeItem('worldr_party_budget');
      localStorage.removeItem('worldr_party_transactions');
      
      // Filter out array-based records
      const filterByParty = (key: string) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              localStorage.setItem(key, JSON.stringify(arr.filter((item: any) => item.partyId !== ctx.partyId)));
            }
          }
        } catch(e) {}
      };
      
      filterByParty('worldr_activity_log');
      filterByParty('worldr_election_registrations');
      filterByParty('worldr_election_promises');
    }

    // 3. Keep worldr_character, keep worldr_selected_path as Politician
    localStorage.setItem('worldr_selected_path', 'politician');
    localStorage.setItem('worldr-path', 'politician');

    // 4. Remove worldr_selected_country for now
    localStorage.removeItem('worldr_selected_country');

    // 5. Redirect to /onboarding/create-party
    router.replace('/onboarding/create-party');
  };

  return (
    <>
      {hireTarget && (
        <HireStaffModal 
          positionId={hireTarget} 
          positionTitle={positions.find(p => p.id === hireTarget)?.title || hireTarget}
          countryInfo={{ gdp: 88000000000, gdpPerCapita: 28400 }} // Drennia default
          onHireSuccess={handleHireSuccess}
          onClose={() => setHireTarget(null)} 
        />
      )}
      {showDissolveModal && <DissolvePartyModal onCancel={() => setShowDissolveModal(false)} onConfirm={handleConfirmDissolve} />}
      {showRedoCharModal && <RedoCharModal onCancel={() => setShowRedoCharModal(false)} onConfirm={handleConfirmRedoChar} canAfford={ctx.partyFunds >= 500000} />}
      {showRebrandPartyModal && <RebrandPartyModal onCancel={() => setShowRebrandPartyModal(false)} onConfirm={handleConfirmRebrandParty} canAfford={ctx.partyFunds >= 500000} />}
      
      {activeActionId && (
        <ActionExecutionModal 
          actionId={activeActionId} 
          positions={positions} 
          ctx={ctx} 
          onClose={() => setActiveActionId(null)} 
          onExecute={handleActionExecute} 
        />
      )}
      
      {activeResult && (
        <ActionResultsModal 
          result={activeResult} 
          onClose={() => setActiveResult(null)} 
        />
      )}

      <div className="h-screen flex flex-col overflow-hidden transition-opacity duration-500"
        style={{ opacity: revealed ? 1 : 0, background: BG }}>

        {/* ══ TOP GAME BAR ═════════════════════════════════════════════════ */}
        <header className="shrink-0 flex items-center justify-between px-4 md:px-5 gap-3"
          style={{ height: '48px', background: PANEL, borderBottom: `1px solid ${BORDER}`, zIndex: 30 }}>
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <img src="/assets/flags/varelia/drennia.svg" alt="Drennia"
              style={{ width: '28px', height: '19px', objectFit: 'cover', borderRadius: '1px', border: `1px solid ${BORDER}`, flexShrink: 0 }} />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[12px] tracking-wide" style={{ color: TEXT }}>{ctx.countryName}</span>
              <span className="text-[8.5px] font-mono uppercase tracking-widest" style={{ color: MUTED }}>{ctx.continentName}</span>
            </div>
            <div className="h-3.5 w-px hidden md:block" style={{ background: BORDER }} />
            <div className="hidden md:flex flex-col leading-none">
              <span className="text-[10.5px] font-mono font-semibold tracking-wide" style={{ color: MUTED }}>Year 0 · Month 1 · Day 1</span>
              <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: '#3d4238' }}>00:00 · Game Start</span>
            </div>
          </div>
          {/* Right */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button id="topbar-bell" type="button" title="Notifications"
              className="w-8 h-8 flex items-center justify-center rounded-sm transition-colors"
              style={{ background: `${PANEL2}`, border: `1px solid ${BORDER}`, color: MUTED }}
              onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
              onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-sm"
              style={{ background: PANEL2, border: `1px solid ${BORDER}` }}>
              <span className="text-[8.5px] font-mono uppercase tracking-widest" style={{ color: MUTED }}>Funds</span>
              <span className="text-[11px] font-bold font-mono text-emerald-600">{formatMoney(ctx.partyFunds)}</span>
            </div>
            <div className="relative">
              <button id="party-menu-btn" type="button" onClick={() => setShowPartyMenu((v) => !v)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-sm transition-opacity duration-150 hover:opacity-80"
                style={{ background: `${ctx.partyColor}14`, border: `1px solid ${ctx.partyColor}35`, color: ctx.partyColor }}>
                <span className="font-mono text-[10px] font-bold tracking-[0.18em]">{ctx.partyAbbreviation}</span>
                <svg className={`w-2.5 h-2.5 transition-transform duration-150 ${showPartyMenu ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showPartyMenu && <PartyDropdown ctx={ctx} onClose={() => setShowPartyMenu(false)} />}
            </div>
            <button id="topbar-logout" type="button" title="Logout"
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

        {/* ══ MAIN NAV TABS ══════════════════════════════════════════════ */}
        <nav className="shrink-0 flex items-center px-4 md:px-5"
          style={{ height: '38px', background: PANEL, borderBottom: `1px solid ${BORDER}`, zIndex: 20 }}>
          {(MAIN_TABS as readonly string[]).map((tab) => {
            const isHome = tab === 'Home';
            const isActions = tab === 'Actions';
            const isEnabled = isHome || isActions;
            const isCurrent = isActions;
            return (
              <button key={tab} id={`main-tab-${tab.toLowerCase()}`} type="button"
                disabled={!isEnabled}
                onClick={() => { if (isHome) router.push('/varelia/news'); }}
                className="relative px-4 h-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-100"
                style={{
                  color: isCurrent ? TEXT : isEnabled ? MUTED : '#2d3228',
                  cursor: isEnabled ? 'pointer' : 'not-allowed',
                  borderBottom: isCurrent ? `2px solid ${ACCENT}` : '2px solid transparent',
                }}>
                {tab}
                {!isEnabled && <span className="text-[7px] font-mono normal-case tracking-normal hidden lg:inline" style={{ color: '#2d3228' }}>soon</span>}
              </button>
            );
          })}
        </nav>

        {/* ══ ACTIONS SUBTAB ROW ════════════════════════════════════════ */}
        <div className="shrink-0 flex items-center px-4 md:px-5 border-b overflow-x-auto"
          style={{ height: '34px', background: PANEL2, borderColor: BORDER, scrollbarWidth: 'none' }}>
          <div className="flex gap-2 h-full">
            {(['Party HQ', 'Party Staff', 'Party Strategy', 'Budget', 'Elections', 'Past Elections', 'Activity Log'] as const).map((tab) => {
              const isActive = activeSubtab === tab;
              return (
                <button
                  key={tab}
                  id={`subtab-${tab.toLowerCase().replace(/ /g, '-')}`}
                  type="button"
                  onClick={() => setActiveSubtab(tab)}
                  className="px-4 h-full flex items-center text-[9.5px] font-bold uppercase tracking-[0.14em] border-b-2 transition-all duration-150 whitespace-nowrap"
                  style={{
                    color: isActive ? TEXT : MUTED,
                    borderColor: isActive ? ACCENT : 'transparent',
                  }}>
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* ══ TWO-COLUMN BODY ════════════════════════════════════════════ */}
        <div className="flex-1 overflow-hidden">
          {activeSubtab === 'Party HQ' ? (
            <>
              {/* Mobile: stacked */}
              <div className="h-full flex flex-col lg:hidden overflow-y-auto" style={{ background: BG }}>
                {/* Compact Stats */}
                <div className="shrink-0 flex items-center justify-between px-4 py-2" style={{ background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
                  <div className="flex gap-4 items-center">
                    <div>
                       <div className="text-[8px] font-mono uppercase tracking-[0.15em]" style={{ color: MUTED }}>Funds</div>
                       <div className="text-[11px] font-bold text-emerald-500">{formatMoney(ctx.partyFunds)}</div>
                    </div>
                    <div>
                       <div className="text-[8px] font-mono uppercase tracking-[0.15em]" style={{ color: MUTED }}>Members</div>
                       <div className="text-[11px] font-bold text-zinc-200">{(ctx.partyStats?.members || 0).toLocaleString()}</div>
                    </div>
                    <div>
                       <div className="text-[8px] font-mono uppercase tracking-[0.15em]" style={{ color: MUTED }}>Recog.</div>
                       <div className="text-[11px] font-bold text-zinc-200">{(ctx.partyStats?.recognition || 0).toFixed(1)}</div>
                    </div>
                    <div>
                       <div className="text-[8px] font-mono uppercase tracking-[0.15em]" style={{ color: MUTED }}>Support</div>
                       <div className="text-[11px] font-bold text-zinc-200">{(ctx.partyStats?.support || 0.1).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>

                {positions.length > 0 && (
                  <div style={{ minHeight: '260px', maxHeight: '340px', borderBottom: `1px solid ${BORDER}` }}>
                    <PositionList positions={positions} selectedId={selectedPosId} onSelect={setSelectedPosId} accentColor={ctx.partyColor} />
                  </div>
                )}
                {selectedPos && (
                  <PositionCenter position={selectedPos} accentColor={ctx.partyColor} partyName={ctx.partyName} countryName={ctx.countryName} ctx={ctx} onHire={setHireTarget} onTrigger={handleTriggerAction} />
                )}
              </div>

              {/* Desktop: 2-column */}
              <div className="h-full hidden lg:flex flex-col">
                <div className="shrink-0 flex items-center gap-6 px-5 py-2.5" style={{ background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
                    <div>
                       <div className="text-[8.5px] font-mono uppercase tracking-[0.15em]" style={{ color: MUTED }}>Party Funds</div>
                       <div className="text-[13px] font-bold text-emerald-500">{formatMoney(ctx.partyFunds)}</div>
                    </div>
                    <div className="w-px h-6" style={{ background: BORDER }} />
                    <div>
                       <div className="text-[8.5px] font-mono uppercase tracking-[0.15em]" style={{ color: MUTED }}>Total Members</div>
                       <div className="text-[13px] font-bold text-zinc-100">{(ctx.partyStats?.members || 0).toLocaleString()}</div>
                    </div>
                    <div className="w-px h-6" style={{ background: BORDER }} />
                    <div>
                       <div className="text-[8.5px] font-mono uppercase tracking-[0.15em]" style={{ color: MUTED }}>Recognition</div>
                       <div className="text-[13px] font-bold text-zinc-100">{(ctx.partyStats?.recognition || 0).toFixed(1)}</div>
                    </div>
                    <div className="w-px h-6" style={{ background: BORDER }} />
                    <div>
                       <div className="text-[8.5px] font-mono uppercase tracking-[0.15em]" style={{ color: MUTED }}>Polling Support</div>
                       <div className="text-[13px] font-bold text-zinc-100">{(ctx.partyStats?.support || 0.1).toFixed(1)}%</div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: '224px 1fr' }}>
                  {positions.length > 0 && (
                    <PositionList positions={positions} selectedId={selectedPosId} onSelect={setSelectedPosId} accentColor={ctx.partyColor} />
                  )}
                  {selectedPos && (
                    <PositionCenter position={selectedPos} accentColor={ctx.partyColor} partyName={ctx.partyName} countryName={ctx.countryName} ctx={ctx} onHire={setHireTarget} onTrigger={handleTriggerAction} />
                  )}
                </div>
              </div>
            </>
          ) : activeSubtab === 'Party Staff' ? (
            <PartyStaffView positions={positions} onHire={setHireTarget} onFire={handleFireStaff} accentColor={ctx.partyColor} />
          ) : activeSubtab === 'Party Strategy' ? (
            <PartyStrategyView ctx={ctx} />
          ) : activeSubtab === 'Budget' ? (
            <BudgetView budget={ctx.partyBudget} partyId={ctx.partyId || ''} />
          ) : activeSubtab === 'Elections' ? (
            <ElectionsView ctx={ctx} onUpdateCtx={setCtx} />
          ) : activeSubtab === 'Past Elections' ? (
            <PastElectionsView />
          ) : (
            <ActivityLogView />
          )}
        </div>
      </div>
    </>
  );
}
