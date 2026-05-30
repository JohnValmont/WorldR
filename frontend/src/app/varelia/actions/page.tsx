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
    skill: string;
    loyalty: number;
    status: string;
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
    description: 'The founding head of the party. Directs political strategy, represents the movement publicly, and holds final decision-making authority.',
    actions: [
      { id: 'pl_speech', name: 'Give Public Speech', description: 'Build early recognition through a public address to citizens.', category: 'Outreach' },
      { id: 'pl_direction', name: 'Set Party Direction', description: "Define the movement's immediate political focus and goals.", category: 'Strategy' },
      { id: 'pl_meeting', name: 'Call Internal Meeting', description: 'Improve internal discipline and prepare party organization.', category: 'Internal' },
      { id: 'pl_manifesto', name: 'Approve Manifesto', description: "Review and formally approve the party's official political platform.", category: 'Policy' },
      { id: 'pl_promise', name: 'Declare Main Promise', description: "Announce the central promise that defines the party's campaign.", category: 'Campaign' },
      { id: 'pl_redo_char', name: 'Redo Character', description: 'Update your character’s personal details while keeping your party, country, and progress intact.', category: 'Leader' },
      { id: 'pl_rebrand_party', name: 'Rebrand Political Party', description: 'Update your party name, abbreviation, logo, color, description, and ideological presentation.', category: 'Leadership' },
      { id: 'pl_dissolve', name: 'Dissolve Political Party', description: 'Permanently dissolve your registered political party. This releases the party abbreviation and removes the party from public records.', category: 'Leadership' },
    ],
  },
  {
    id: 'secretary',
    title: 'Secretary',
    shortTitle: 'Secretary',
    description: 'Manages internal communications, party records, meeting coordination, and volunteer logistics.',
    actions: [
      { id: 'sec_meeting', name: 'Organize Party Meeting', description: 'Schedule and coordinate an official internal meeting.', category: 'Internal' },
      { id: 'sec_records', name: 'Manage Member Records', description: 'Update and verify party membership and contact information.', category: 'Admin' },
      { id: 'sec_report', name: 'Prepare Internal Report', description: 'Compile an internal summary of recent activity and progress.', category: 'Admin' },
      { id: 'sec_discipline', name: 'Improve Party Discipline', description: 'Enforce internal party rules and conduct standards.', category: 'Internal' },
      { id: 'sec_volunteers', name: 'Coordinate Volunteers', description: 'Assign tasks and mobilize volunteer supporters.', category: 'Outreach' },
    ],
  },
  {
    id: 'treasurer',
    title: 'Treasurer',
    shortTitle: 'Treasurer',
    description: 'Handles party finances, fundraising, donor relations, and financial compliance.',
    actions: [
      { id: 'tr_donation', name: 'Small Donation Drive', description: 'Run a small public donation campaign to grow party funds.', category: 'Funding' },
      { id: 'tr_fees', name: 'Membership Fee Collection', description: 'Collect monthly dues from registered party members.', category: 'Funding' },
      { id: 'tr_dinner', name: 'Donor Dinner', description: 'Host a private dinner event to cultivate major donors.', category: 'Funding' },
      { id: 'tr_business', name: 'Business Funding Meeting', description: 'Meet business owners to secure financial backing.', category: 'Funding' },
      { id: 'tr_audit', name: 'Audit Party Accounts', description: 'Review financial records to ensure accuracy and compliance.', category: 'Admin' },
    ],
  },
  {
    id: 'campaign_manager',
    title: 'Campaign Manager',
    shortTitle: 'Campaign',
    description: 'Plans and executes electoral and public outreach campaigns across districts and regions.',
    actions: [
      { id: 'cm_door', name: 'Door-to-Door Campaign', description: 'Canvass residential areas to meet voters directly.', category: 'Campaign' },
      { id: 'cm_rally', name: 'Hold Local Rally', description: 'Organize a public rally to energize supporters.', category: 'Campaign' },
      { id: 'cm_hall', name: 'Town Hall Meeting', description: 'Host an open forum where citizens can engage the party.', category: 'Outreach' },
      { id: 'cm_rural', name: 'Rural Visit', description: 'Travel to rural areas to build support outside cities.', category: 'Campaign' },
      { id: 'cm_poster', name: 'Poster Campaign', description: 'Distribute posters and flyers in key public locations.', category: 'Campaign' },
      { id: 'cm_survey', name: 'Voter Survey', description: 'Conduct surveys to understand voter priorities.', category: 'Research' },
    ],
  },
  {
    id: 'spokesperson',
    title: 'Spokesperson',
    shortTitle: 'Spokesperson',
    description: 'Manages public communications, media relations, and official party statements.',
    actions: [
      { id: 'sp_press', name: 'Issue Press Statement', description: 'Release an official statement on a current political matter.', category: 'Media' },
      { id: 'sp_interview', name: 'Give Interview', description: 'Participate in a media interview to communicate party stance.', category: 'Media' },
      { id: 'sp_respond', name: 'Respond to Criticism', description: 'Publicly address and counter negative press or attacks.', category: 'Media' },
      { id: 'sp_defend', name: 'Defend Party Leader', description: "Issue a public defense of the leader's record or decisions.", category: 'Media' },
      { id: 'sp_attack', name: 'Attack Rival Party', description: 'Release a pointed critique of a competing political party.', category: 'Politics' },
    ],
  },
  {
    id: 'policy_director',
    title: 'Policy Director',
    shortTitle: 'Policy',
    description: "Develops the party's official policy positions, manifestos, and legislative proposals.",
    actions: [
      { id: 'pd_manifesto', name: 'Write Party Manifesto', description: "Draft the party's official comprehensive policy platform.", category: 'Policy' },
      { id: 'pd_economic', name: 'Draft Economic Policy', description: 'Prepare a formal economic strategy and fiscal direction.', category: 'Policy' },
      { id: 'pd_welfare', name: 'Draft Welfare Policy', description: 'Design a social protection and public services policy.', category: 'Policy' },
      { id: 'pd_corruption', name: 'Draft Anti-Corruption Plan', description: 'Develop a formal plan to address government corruption.', category: 'Policy' },
      { id: 'pd_bill', name: 'Prepare Bill Idea', description: 'Draft a preliminary legislative bill concept for review.', category: 'Policy' },
    ],
  },
  {
    id: 'membership_officer',
    title: 'Membership Officer',
    shortTitle: 'Membership',
    description: "Grows the party's registered membership through recruitment, drives, and volunteer integration.",
    actions: [
      { id: 'mo_recruit', name: 'Recruit Members', description: 'Run a targeted campaign to attract new party members.', category: 'Growth' },
      { id: 'mo_volunteers', name: 'Recruit Volunteers', description: 'Build a volunteer base to support party activities.', category: 'Growth' },
      { id: 'mo_youth', name: 'Start Youth Membership Drive', description: 'Target young citizens for party membership enrollment.', category: 'Growth' },
      { id: 'mo_booth', name: 'Open Membership Booth', description: 'Set up a public registration booth in a busy location.', category: 'Outreach' },
      { id: 'mo_activists', name: 'Invite Independent Activists', description: 'Reach out to unaffiliated political activists.', category: 'Growth' },
    ],
  },
  {
    id: 'legal_officer',
    title: 'Legal Officer',
    shortTitle: 'Legal',
    description: 'Handles party registration compliance, election law, candidate paperwork, and legal challenges.',
    actions: [
      { id: 'lo_registration', name: 'Check Party Registration', description: "Verify the party's formal registration status is current.", category: 'Legal' },
      { id: 'lo_rules', name: 'Review Election Rules', description: 'Study current electoral regulations to ensure compliance.', category: 'Legal' },
      { id: 'lo_papers', name: 'Prepare Candidate Papers', description: 'Compile formal documentation for party candidate nominations.', category: 'Legal' },
      { id: 'lo_donations', name: 'Check Donation Rules', description: 'Verify all fundraising activity complies with donation laws.', category: 'Legal' },
      { id: 'lo_complaint', name: 'Defend Against Complaint', description: 'Respond to any formal complaint filed against the party.', category: 'Legal' },
    ],
  },
  {
    id: 'public_network_officer',
    title: 'Public Network Officer',
    shortTitle: 'Network',
    description: 'Builds relationships between the party and key social groups: business, unions, farmers, students, and religious communities.',
    actions: [
      { id: 'pno_business', name: 'Meet Business Owners', description: 'Engage local business leaders to build commercial support.', category: 'Network' },
      { id: 'pno_farmers', name: 'Meet Farmers', description: 'Connect with agricultural communities about rural policy.', category: 'Network' },
      { id: 'pno_unions', name: 'Meet Trade Unions', description: "Open dialogue with labor unions about workers' rights.", category: 'Network' },
      { id: 'pno_students', name: 'Meet Students', description: 'Engage universities and student organizations for youth support.', category: 'Network' },
      { id: 'pno_religious', name: 'Meet Religious Leaders', description: 'Build respectful ties with community religious figures.', category: 'Network' },
      { id: 'pno_press', name: 'Meet Journalists', description: 'Cultivate relationships with journalists and editors.', category: 'Media' },
    ],
  },
  {
    id: 'media_officer',
    title: 'Media Officer',
    shortTitle: 'Media',
    description: 'Manages party presence in newspapers, press, and public broadcast channels.',
    actions: [
      { id: 'meo_article', name: 'Write Newspaper Article', description: 'Draft a political opinion piece for local newspapers.', category: 'Media' },
      { id: 'meo_statement', name: 'Publish Party Statement', description: 'Issue a formal written declaration from the party.', category: 'Media' },
      { id: 'meo_release', name: 'Prepare Press Release', description: 'Write a press release on a timely political topic.', category: 'Media' },
      { id: 'meo_editors', name: 'Contact Newspaper Editors', description: 'Reach out to editors to improve media coverage.', category: 'Media' },
      { id: 'meo_message', name: 'Launch Public Message', description: 'Distribute a mass message to citizens on party priorities.', category: 'Media' },
    ],
  },
  {
    id: 'regional_organizer',
    title: 'Regional Organizer',
    shortTitle: 'Regional',
    description: 'Expands party presence into regions, districts, and rural areas through branches and local coordinators.',
    actions: [
      { id: 'ro_branch', name: 'Open Local Branch', description: 'Establish a formal party office in a new district.', category: 'Growth' },
      { id: 'ro_rural', name: 'Build Rural Network', description: 'Develop contacts and visibility in rural communities.', category: 'Growth' },
      { id: 'ro_urban', name: 'Build Urban Network', description: 'Strengthen party organization in city neighborhoods.', category: 'Growth' },
      { id: 'ro_district', name: 'Assign District Coordinator', description: 'Designate a coordinator to manage a specific district.', category: 'Admin' },
      { id: 'ro_survey', name: 'Survey Regional Support', description: 'Assess party strength and voter mood across different regions.', category: 'Research' },
    ],
  },
];

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
  else if (positionId === 'campaign_manager') rolePrestigeMultiplier = 1.30;
  else if (positionId === 'spokesperson') rolePrestigeMultiplier = 1.15;
  else if (positionId === 'policy_director') rolePrestigeMultiplier = 1.45;
  else if (positionId === 'legal_officer') rolePrestigeMultiplier = 1.65;
  else if (positionId === 'public_network_officer') rolePrestigeMultiplier = 1.25;
  else if (positionId === 'media_officer') rolePrestigeMultiplier = 1.15;
  else if (positionId === 'regional_organizer') rolePrestigeMultiplier = 1.25;

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

      cands.push({
        id: Math.random().toString(36).substring(2, 9),
        name: `${fn} ${ln}`,
        age,
        skill,
        loyalty,
        salary: finalSalary,
        status: 'Hired',
        type
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
                <div className="text-[10px] mt-0.5"><span className="text-zinc-500">Salary:</span> <span className="text-emerald-500 font-mono font-bold">${c.salary.toLocaleString()} / month</span></div>
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
              {/* Status dot */}
              <div className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: isFilled ? accentColor : '#2d3228' }} />
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

function DutyRow({ action, positionTitle, accentColor, onTrigger }: { action: PartyAction; positionTitle: string; accentColor: string; onTrigger?: (id: string) => void }) {
  const catColor = CATEGORY_COLORS[action.category] ?? '#3a4238';
  const isDissolve = action.id === 'pl_dissolve';
  const isRedoChar = action.id === 'pl_redo_char';
  const isRebrandParty = action.id === 'pl_rebrand_party';

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
                Leadership
              </span>
              <span className="text-[8px] font-mono font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '2px',
                }}>
                Critical
              </span>
            </>
          ) : isRedoChar ? (
            <>
              <span className="text-[8px] font-mono font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
                style={{
                  background: 'rgba(212,169,31,0.12)',
                  color: '#d4a91f',
                  border: '1px solid rgba(212,169,31,0.25)',
                  borderRadius: '2px',
                }}>
                Leader
              </span>
              <span className="text-[8px] font-mono font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
                style={{
                  background: 'rgba(212,169,31,0.12)',
                  color: '#d4a91f',
                  border: '1px solid rgba(212,169,31,0.25)',
                  borderRadius: '2px',
                }}>
                Identity
              </span>
            </>
          ) : isRebrandParty ? (
            <>
              <span className="text-[8px] font-mono font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
                style={{
                  background: 'rgba(212,169,31,0.12)',
                  color: '#d4a91f',
                  border: '1px solid rgba(212,169,31,0.25)',
                  borderRadius: '2px',
                }}>
                Leadership
              </span>
              <span className="text-[8px] font-mono font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
                style={{
                  background: 'rgba(212,169,31,0.12)',
                  color: '#d4a91f',
                  border: '1px solid rgba(212,169,31,0.25)',
                  borderRadius: '2px',
                }}>
                Party Identity
              </span>
            </>
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
            onClick={() => onTrigger && onTrigger(action.id)}
            className="text-[8.5px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 transition-colors hover:bg-amber-800/30"
            style={{
              color: '#d4a91f',
              background: 'rgba(212,169,31,0.08)',
              border: '1px solid rgba(212,169,31,0.28)',
              borderRadius: '2px',
              cursor: 'pointer',
            }}>
            Edit Character
          </button>
        ) : isRebrandParty ? (
          <button type="button"
            onClick={() => onTrigger && onTrigger(action.id)}
            className="text-[8.5px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 transition-colors hover:bg-amber-800/30"
            style={{
              color: '#d4a91f',
              background: 'rgba(212,169,31,0.08)',
              border: '1px solid rgba(212,169,31,0.28)',
              borderRadius: '2px',
              cursor: 'pointer',
            }}>
            Edit Party
          </button>
        ) : (
          <span className="text-[8.5px] font-mono uppercase tracking-[0.18em] px-2.5 py-1"
            style={{
              color: '#3d4238',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${BORDER}`,
              borderRadius: '2px',
            }}>
            Coming Soon
          </span>
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
  onHire,
  onTrigger,
}: {
  position: Position;
  accentColor: string;
  partyName: string;
  countryName: string;
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
          <DutyRow key={action.id} action={action} positionTitle={position.title} accentColor={accentColor} onTrigger={onTrigger} />
        ))}
        {/* Coming soon footer note */}
        <div className="px-4 py-2.5 flex items-center gap-2"
          style={{ background: `${ACCENT}06`, borderTop: `1px solid ${BORDER}50` }}>
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-mono text-[8.5px]" style={{ color: '#3d4238' }}>
            Action effects, costs, and results will be activated in a future gameplay phase.
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

function RedoCharModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
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
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', borderRadius: '2px' }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75"
            style={{ background: 'rgba(212,169,31,0.14)', border: '1px solid rgba(212,169,31,0.40)', color: '#d4a91f', borderRadius: '2px' }}>
            Continue to Editor
          </button>
        </div>
      </div>
    </div>
  );
}

function RebrandPartyModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
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
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', borderRadius: '2px' }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75"
            style={{ background: 'rgba(212,169,31,0.14)', border: '1px solid rgba(212,169,31,0.40)', color: '#d4a91f', borderRadius: '2px' }}>
            Continue to Rebrand
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
                    <div className="text-[9px]"><span className="text-zinc-500">Salary:</span> <span className="text-zinc-300 font-mono">${(s.filledBy as any).salary?.toLocaleString()}/mo</span></div>
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

function BudgetView() {
  const [budget, setBudget] = useState({ partyFunds: 2000000, monthlyRevenue: 0, otherExpenses: 0 });
  const [staffCost, setStaffCost] = useState(0);

  useEffect(() => {
    // Developer Comment: Temporary party budget model. In multiplayer, party funds, revenue, expenses, and salary payments must be stored and validated by backend/database.
    let cost = 0;
    try {
      const staffRaw = localStorage.getItem('worldr_party_staff');
      if (staffRaw) {
        const staff = JSON.parse(staffRaw);
        Object.values(staff).forEach((s: any) => {
          if (s && s.salary) cost += s.salary;
        });
      }
    } catch(e){}
    setStaffCost(cost);

    let partyId = '';
    try {
      const pRaw = localStorage.getItem('worldr_current_party');
      if (pRaw) {
        partyId = JSON.parse(pRaw).partyId;
      }
    } catch(e) {}

    try {
      const budgetRaw = localStorage.getItem('worldr_party_budget');
      if (budgetRaw) {
        setBudget(JSON.parse(budgetRaw));
      } else {
        const defaultBudget = { partyId, partyFunds: 2000000, monthlyRevenue: 0, otherExpenses: 0 };
        localStorage.setItem('worldr_party_budget', JSON.stringify(defaultBudget));
        setBudget(defaultBudget);
      }
    } catch(e) {}
  }, []);

  const monthlyExpenses = staffCost + budget.otherExpenses;
  const netProfit = budget.monthlyRevenue - monthlyExpenses;
  const projectedMonthlyBalance = budget.partyFunds + netProfit;

  return (
    <div className="h-full overflow-y-auto px-5 py-6" style={{ background: BG }}>
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Party Budget</h2>
          <p className="text-zinc-500 text-xs mt-1">Manage your political organization's finances and staff salaries.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-5" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
              <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Party Funds</div>
              <div className="text-xl font-bold text-emerald-500">${(budget.partyFunds / 1000000).toFixed(1)}M</div>
            </div>
            <div className="p-5" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
              <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Projected Monthly Balance</div>
              <div className="text-lg font-bold text-emerald-400">${projectedMonthlyBalance.toLocaleString()}</div>
            </div>
        </div>

        <div className="space-y-4" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px', padding: '16px' }}>
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.03]">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Monthly Revenue</span>
            <span className="text-xs font-semibold text-zinc-300">${budget.monthlyRevenue.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.03]">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Staff Salary Expenses</span>
            <span className="text-xs font-semibold text-red-400">-${staffCost.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.03]">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Other Expenses</span>
            <span className="text-xs font-semibold text-red-400">-${budget.otherExpenses.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.03]">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Monthly Expenses</span>
            <span className="text-xs font-semibold text-red-400">-${monthlyExpenses.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Net Profit</span>
            <span className={`text-xs font-semibold ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()}
            </span>
          </div>
        </div>
        
        <p className="text-[10px] text-zinc-700 text-center mt-6 italic">
          Budget is currently view-only. Salaries are not yet deducted.
        </p>
      </div>
    </div>
  );
}

function PartyStrategyView() {
  const strategyItems = [
    { label: 'Current Objective', value: 'Grow political recognition', desc: 'Build initial support and raise party brand awareness in Varelia.' },
    { label: 'Main Promise', value: 'Not declared', desc: 'The defining campaign pledge representing the heart of your platform.' },
    { label: 'Election Focus', value: 'Not selected', desc: 'Determine which legislative reforms to campaign on in the next election.' },
    { label: 'Target Voters', value: 'Not selected', desc: 'Select demographic cohorts to focus your campaigning and outreach efforts on.' },
    { label: 'Strategy Type', value: 'Not selected', desc: 'Define your party\'s overarching strategy: Populist, Elite-oriented, or Grassroots.' },
  ];

  return (
    <div className="h-full overflow-y-auto px-5 py-6" style={{ background: BG }}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Party Strategy</h2>
          <p className="text-zinc-500 text-xs mt-1">Plan your party’s long-term political direction.</p>
        </div>

        {/* Content list */}
        <div className="space-y-4" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px', padding: '16px' }}>
          {strategyItems.map((item) => (
            <div key={item.label} className="pb-4 last:pb-0 border-b border-white/[0.03] last:border-b-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{item.label}</span>
                <span className="text-xs font-semibold text-zinc-300">{item.value}</span>
              </div>
              <p className="text-[10.5px] leading-normal text-zinc-600">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer text */}
        <p className="text-[10px] text-zinc-700 text-center mt-6 italic">
          Party strategy choices will be added in a later gameplay phase.
        </p>
      </div>
    </div>
  );
}

function ElectionsView() {
  const electionStats = [
    { label: 'Next Election', value: 'Not scheduled' },
    { label: 'Election Type', value: 'Parliamentary' },
    { label: 'Candidate Status', value: 'Not registered' },
    { label: 'Party Eligibility', value: 'Not ready' },
    { label: 'Required Support', value: '5.0%' },
    { label: 'Current Support', value: '0.1%' },
  ];

  return (
    <div className="h-full overflow-y-auto px-5 py-6" style={{ background: BG }}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Elections</h2>
          <p className="text-zinc-500 text-xs mt-1">Track upcoming elections and prepare your party for national competition.</p>
        </div>

        {/* Status Box */}
        <div className="grid grid-cols-2 gap-4 p-5 mb-6" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
          {electionStats.map((stat) => (
            <div key={stat.label}>
              <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="text-xs font-semibold text-zinc-300">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {['Register Candidate List', 'Prepare Campaign', 'View Election Rules'].map((btn) => (
            <button
              key={btn}
              type="button"
              disabled
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider opacity-40 cursor-not-allowed rounded-sm flex items-center justify-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, color: MUTED }}>
              <span>{btn}</span>
              <span className="text-[7.5px] font-mono font-bold lowercase tracking-normal px-1 py-0.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.05)', color: MUTED }}>soon</span>
            </button>
          ))}
        </div>
      </div>
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
          Drennia has not held an election since your party was founded.
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
    } catch (e) {
      console.error(e);
    }

    setLogItems(items);
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
    try {
      const budgetRaw = localStorage.getItem('worldr_party_budget');
      if (budgetRaw) {
        partyFunds = JSON.parse(budgetRaw).partyFunds;
      } else if (partyId) {
        const defaultBudget = { partyId, partyFunds: 2000000, monthlyRevenue: 0, otherExpenses: 0 };
        localStorage.setItem('worldr_party_budget', JSON.stringify(defaultBudget));
      }
    } catch(e) {}

    setCtx({ characterName: charName, characterAge: charAge, countryName, continentName, partyName, partyAbbreviation, partyColor, partyLogoId, ideologyIds, partyDescription, partyCreatedAt, selectedPath, partyId, partyFunds });

    // Build positions
    const staffRaw = localStorage.getItem('worldr_party_staff');
    const staffDb = staffRaw ? JSON.parse(staffRaw) : {};

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
    } else if (actionId === 'pl_redo_char') {
      setShowRedoCharModal(true);
    } else if (actionId === 'pl_rebrand_party') {
      setShowRebrandPartyModal(true);
    }
  };

  const handleConfirmRedoChar = () => {
    router.push('/onboarding/create-character?mode=edit');
  };

  const handleConfirmRebrandParty = () => {
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
      {showRedoCharModal && <RedoCharModal onCancel={() => setShowRedoCharModal(false)} onConfirm={handleConfirmRedoChar} />}
      {showRebrandPartyModal && <RebrandPartyModal onCancel={() => setShowRebrandPartyModal(false)} onConfirm={handleConfirmRebrandParty} />}

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
              <span className="text-[11px] font-bold font-mono text-emerald-600">${(ctx.partyFunds / 1000000).toFixed(1)}M</span>
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
                {positions.length > 0 && (
                  <div style={{ minHeight: '260px', maxHeight: '340px', borderBottom: `1px solid ${BORDER}` }}>
                    <PositionList positions={positions} selectedId={selectedPosId} onSelect={setSelectedPosId} accentColor={ctx.partyColor} />
                  </div>
                )}
                {selectedPos && (
                  <PositionCenter position={selectedPos} accentColor={ctx.partyColor} partyName={ctx.partyName} countryName={ctx.countryName} onHire={setHireTarget} onTrigger={handleTriggerAction} />
                )}
              </div>

              {/* Desktop: 2-column */}
              <div className="h-full hidden lg:grid" style={{ gridTemplateColumns: '224px 1fr' }}>
                {positions.length > 0 && (
                  <PositionList positions={positions} selectedId={selectedPosId} onSelect={setSelectedPosId} accentColor={ctx.partyColor} />
                )}
                {selectedPos && (
                  <PositionCenter position={selectedPos} accentColor={ctx.partyColor} partyName={ctx.partyName} countryName={ctx.countryName} onHire={setHireTarget} onTrigger={handleTriggerAction} />
                )}
              </div>
            </>
          ) : activeSubtab === 'Party Staff' ? (
            <PartyStaffView positions={positions} onHire={setHireTarget} onFire={handleFireStaff} accentColor={ctx.partyColor} />
          ) : activeSubtab === 'Party Strategy' ? (
            <PartyStrategyView />
          ) : activeSubtab === 'Budget' ? (
            <BudgetView />
          ) : activeSubtab === 'Elections' ? (
            <ElectionsView />
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
