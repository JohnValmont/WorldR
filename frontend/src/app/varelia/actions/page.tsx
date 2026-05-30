'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCharacterStore } from '../../../store/character.store';
import { LogoSVG } from '../../../components/LogoSVG';
import { PARTY_COLORS } from '../../../data/political-parties/partyLogos';
import type { RegisteredPoliticalParty } from '../../../data/political-parties/partyTypes';

// ─────────────────────────────────────────────────────────────────────────────
// IDEOLOGY NAME MAP
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
  partyColorId: string;
  ideologyIds: string[];
  partyDescription: string;
  partyCreatedAt: string;
  selectedPath: string;
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
  /** If filled, who holds it */
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

const FUTURE_PATHS = [
  { label: 'Become Businessman', id: 'businessman' },
  { label: 'Join Military',      id: 'military'    },
  { label: 'Join Judiciary',     id: 'judicial'    },
  { label: 'Enter Media',        id: 'media'       },
];

const POSITION_DEFINITIONS: Omit<Position, 'filledBy'>[] = [
  {
    id: 'party_leader',
    title: 'Party Leader',
    shortTitle: 'Leader',
    description: 'The founding head of the party. Directs political strategy, represents the movement publicly, and holds final decision-making authority.',
    actions: [
      { id: 'pl_speech',    name: 'Give Public Speech',    description: 'Build early recognition through a public address to citizens.',        category: 'Outreach'  },
      { id: 'pl_direction', name: 'Set Party Direction',   description: 'Define the movement\'s immediate political focus and goals.',           category: 'Strategy'  },
      { id: 'pl_meeting',   name: 'Call Internal Meeting', description: 'Improve internal discipline and prepare party organization.',           category: 'Internal'  },
      { id: 'pl_manifesto', name: 'Approve Manifesto',     description: 'Review and formally approve the party\'s official political platform.', category: 'Policy'    },
      { id: 'pl_promise',   name: 'Declare Main Promise',  description: 'Announce the central promise that defines the party\'s campaign.',     category: 'Campaign'  },
    ],
  },
  {
    id: 'secretary',
    title: 'Secretary',
    shortTitle: 'Secretary',
    description: 'Manages internal communications, party records, meeting coordination, and volunteer logistics.',
    actions: [
      { id: 'sec_meeting',   name: 'Organize Party Meeting',  description: 'Schedule and coordinate an official internal meeting.',         category: 'Internal'  },
      { id: 'sec_records',   name: 'Manage Member Records',   description: 'Update and verify party membership and contact information.',    category: 'Admin'     },
      { id: 'sec_report',    name: 'Prepare Internal Report', description: 'Compile an internal summary of recent activity and progress.',   category: 'Admin'     },
      { id: 'sec_discipline',name: 'Improve Party Discipline','description': 'Enforce internal party rules and conduct standards.',          category: 'Internal'  },
      { id: 'sec_volunteers',name: 'Coordinate Volunteers',   description: 'Assign tasks and mobilize volunteer supporters.',                category: 'Outreach'  },
    ],
  },
  {
    id: 'treasurer',
    title: 'Treasurer',
    shortTitle: 'Treasurer',
    description: 'Handles party finances, fundraising, donor relations, and financial compliance.',
    actions: [
      { id: 'tr_donation',  name: 'Small Donation Drive',      description: 'Run a small public donation campaign to grow party funds.',      category: 'Funding'   },
      { id: 'tr_fees',      name: 'Membership Fee Collection', description: 'Collect monthly dues from registered party members.',            category: 'Funding'   },
      { id: 'tr_dinner',    name: 'Donor Dinner',              description: 'Host a private dinner event to cultivate major donors.',         category: 'Funding'   },
      { id: 'tr_business',  name: 'Business Funding Meeting',  description: 'Meet business owners to secure financial backing.',              category: 'Funding'   },
      { id: 'tr_audit',     name: 'Audit Party Accounts',      description: 'Review financial records to ensure accuracy and compliance.',    category: 'Admin'     },
    ],
  },
  {
    id: 'campaign_manager',
    title: 'Campaign Manager',
    shortTitle: 'Campaign',
    description: 'Plans and executes electoral and public outreach campaigns across districts and regions.',
    actions: [
      { id: 'cm_door',   name: 'Door-to-Door Campaign', description: 'Canvass residential areas to meet voters directly.',         category: 'Campaign' },
      { id: 'cm_rally',  name: 'Hold Local Rally',      description: 'Organize a public rally to energize supporters.',            category: 'Campaign' },
      { id: 'cm_hall',   name: 'Town Hall Meeting',     description: 'Host an open forum where citizens can engage the party.',    category: 'Outreach' },
      { id: 'cm_rural',  name: 'Rural Visit',           description: 'Travel to rural areas to build support outside cities.',     category: 'Campaign' },
      { id: 'cm_poster', name: 'Poster Campaign',       description: 'Distribute posters and flyers in key public locations.',     category: 'Campaign' },
      { id: 'cm_survey', name: 'Voter Survey',          description: 'Conduct surveys to understand voter priorities.',            category: 'Research' },
    ],
  },
  {
    id: 'spokesperson',
    title: 'Spokesperson',
    shortTitle: 'Spokesperson',
    description: 'Manages public communications, media relations, and official party statements.',
    actions: [
      { id: 'sp_press',    name: 'Issue Press Statement',  description: 'Release an official statement on a current political matter.',  category: 'Media'    },
      { id: 'sp_interview',name: 'Give Interview',         description: 'Participate in a media interview to communicate party stance.',  category: 'Media'    },
      { id: 'sp_respond',  name: 'Respond to Criticism',   description: 'Publicly address and counter negative press or attacks.',       category: 'Media'    },
      { id: 'sp_defend',   name: 'Defend Party Leader',    description: 'Issue a public defense of the leader\'s record or decisions.',  category: 'Media'    },
      { id: 'sp_attack',   name: 'Attack Rival Party',     description: 'Release a pointed critique of a competing political party.',    category: 'Politics' },
    ],
  },
  {
    id: 'policy_director',
    title: 'Policy Director',
    shortTitle: 'Policy',
    description: 'Develops the party\'s official policy positions, manifestos, and legislative proposals.',
    actions: [
      { id: 'pd_manifesto',  name: 'Write Party Manifesto',      description: 'Draft the party\'s official comprehensive policy platform.', category: 'Policy'  },
      { id: 'pd_economic',   name: 'Draft Economic Policy',      description: 'Prepare a formal economic strategy and fiscal direction.',    category: 'Policy'  },
      { id: 'pd_welfare',    name: 'Draft Welfare Policy',       description: 'Design a social protection and public services policy.',      category: 'Policy'  },
      { id: 'pd_corruption', name: 'Draft Anti-Corruption Plan', description: 'Develop a formal plan to address government corruption.',     category: 'Policy'  },
      { id: 'pd_bill',       name: 'Prepare Bill Idea',          description: 'Draft a preliminary legislative bill concept for review.',     category: 'Policy'  },
    ],
  },
  {
    id: 'membership_officer',
    title: 'Membership Officer',
    shortTitle: 'Membership',
    description: 'Grows the party\'s registered membership through recruitment, drives, and volunteer integration.',
    actions: [
      { id: 'mo_recruit',    name: 'Recruit Members',             description: 'Run a targeted campaign to attract new party members.',      category: 'Growth'   },
      { id: 'mo_volunteers', name: 'Recruit Volunteers',          description: 'Build a volunteer base to support party activities.',        category: 'Growth'   },
      { id: 'mo_youth',      name: 'Start Youth Membership Drive','description': 'Target young citizens for party membership enrollment.',   category: 'Growth'   },
      { id: 'mo_booth',      name: 'Open Membership Booth',       description: 'Set up a public registration booth in a busy location.',     category: 'Outreach' },
      { id: 'mo_activists',  name: 'Invite Independent Activists','description': 'Reach out to unaffiliated political activists.',           category: 'Growth'   },
    ],
  },
  {
    id: 'legal_officer',
    title: 'Legal Officer',
    shortTitle: 'Legal',
    description: 'Handles party registration compliance, election law, candidate paperwork, and legal challenges.',
    actions: [
      { id: 'lo_registration',name: 'Check Party Registration',  description: 'Verify the party\'s formal registration status is current.',  category: 'Legal'   },
      { id: 'lo_rules',       name: 'Review Election Rules',     description: 'Study current electoral regulations to ensure compliance.',    category: 'Legal'   },
      { id: 'lo_papers',      name: 'Prepare Candidate Papers',  description: 'Compile formal documentation for party candidate nominations.', category: 'Legal'   },
      { id: 'lo_donations',   name: 'Check Donation Rules',      description: 'Verify all fundraising activity complies with donation laws.',  category: 'Legal'   },
      { id: 'lo_complaint',   name: 'Defend Against Complaint',  description: 'Respond to any formal complaint filed against the party.',     category: 'Legal'   },
    ],
  },
  {
    id: 'public_network_officer',
    title: 'Public Network Officer',
    shortTitle: 'Network',
    description: 'Builds relationships between the party and key social groups: business, unions, farmers, students, and religious communities.',
    actions: [
      { id: 'pno_business',  name: 'Meet Business Owners',    description: 'Engage local business leaders to build commercial support.',      category: 'Network' },
      { id: 'pno_farmers',   name: 'Meet Farmers',            description: 'Connect with agricultural communities about rural policy.',       category: 'Network' },
      { id: 'pno_unions',    name: 'Meet Trade Unions',       description: 'Open dialogue with labor unions about workers\' rights.',          category: 'Network' },
      { id: 'pno_students',  name: 'Meet Students',           description: 'Engage universities and student organizations for youth support.', category: 'Network' },
      { id: 'pno_religious', name: 'Meet Religious Leaders',  description: 'Build respectful ties with community religious figures.',          category: 'Network' },
      { id: 'pno_press',     name: 'Meet Journalists',        description: 'Cultivate relationships with journalists and editors.',            category: 'Media'   },
    ],
  },
  {
    id: 'media_officer',
    title: 'Media Officer',
    shortTitle: 'Media',
    description: 'Manages party presence in newspapers, press, and public broadcast channels.',
    actions: [
      { id: 'meo_article',   name: 'Write Newspaper Article',    description: 'Draft a political opinion piece for local newspapers.',       category: 'Media'   },
      { id: 'meo_statement', name: 'Publish Party Statement',    description: 'Issue a formal written declaration from the party.',          category: 'Media'   },
      { id: 'meo_release',   name: 'Prepare Press Release',      description: 'Write a press release on a timely political topic.',          category: 'Media'   },
      { id: 'meo_editors',   name: 'Contact Newspaper Editors',  description: 'Reach out to editors to improve media coverage.',             category: 'Media'   },
      { id: 'meo_message',   name: 'Launch Public Message',      description: 'Distribute a mass message to citizens on party priorities.',  category: 'Media'   },
    ],
  },
  {
    id: 'regional_organizer',
    title: 'Regional Organizer',
    shortTitle: 'Regional',
    description: 'Expands party presence into regions, districts, and rural areas through branches and local coordinators.',
    actions: [
      { id: 'ro_branch',    name: 'Open Local Branch',         description: 'Establish a formal party office in a new district.',              category: 'Growth'  },
      { id: 'ro_rural',     name: 'Build Rural Network',       description: 'Develop contacts and visibility in rural communities.',           category: 'Growth'  },
      { id: 'ro_urban',     name: 'Build Urban Network',       description: 'Strengthen party organization in city neighborhoods.',            category: 'Growth'  },
      { id: 'ro_district',  name: 'Assign District Coordinator','description': 'Designate a coordinator to manage a specific district.',     category: 'Admin'   },
      { id: 'ro_survey',    name: 'Survey Regional Support',   description: 'Assess party strength and voter mood across different regions.', category: 'Research'},
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0] ?? '').join('').slice(0, 2).toUpperCase() || '??';
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTY DROPDOWN (top bar)
// ─────────────────────────────────────────────────────────────────────────────

function PartyDropdown({ ctx, onClose }: { ctx: PlayerCtx; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1.5 w-64 overflow-hidden z-50"
      style={{ background: 'rgba(6,6,14,0.99)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 10px 50px rgba(0,0,0,0.85)', borderRadius: '2px' }}>
      <div className="px-4 py-3 border-b border-white/[0.06]"
        style={{ background: `linear-gradient(90deg, ${ctx.partyColor}0e, transparent)` }}>
        <div className="flex items-center gap-2.5 mb-3">
          {ctx.partyLogoId && (
            <div className="w-8 h-8 flex items-center justify-center shrink-0"
              style={{ background: `${ctx.partyColor}12`, border: `1px solid ${ctx.partyColor}28`, borderRadius: '2px' }}>
              <LogoSVG logoId={ctx.partyLogoId} color={ctx.partyColor} size={17} />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-white font-bold text-xs leading-tight truncate">{ctx.partyName}</div>
            <div className="font-mono text-[9px] font-bold tracking-[0.22em] mt-0.5" style={{ color: ctx.partyColor }}>{ctx.partyAbbreviation}</div>
          </div>
        </div>
        <div className="space-y-1.5">
          {[{ label: 'Path', value: ctx.selectedPath }, { label: 'Leader', value: ctx.characterName }, { label: 'Country', value: ctx.countryName }].map((f) => (
            <div key={f.label} className="flex items-center justify-between">
              <span className="text-zinc-600 font-mono text-[8px] uppercase tracking-[0.2em]">{f.label}</span>
              <span className="text-zinc-300 text-[10px] font-semibold truncate max-w-[140px]">{f.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="text-[8px] font-mono text-zinc-700 uppercase tracking-[0.28em] mb-2.5">Switch Path</div>
        {FUTURE_PATHS.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-1.5 cursor-not-allowed" style={{ opacity: 0.33 }}>
            <span className="text-zinc-400 text-[10px] font-medium">{p.label}</span>
            <span className="text-[7.5px] font-mono text-zinc-700 uppercase tracking-widest px-1.5 py-0.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px' }}>Soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HIRE PLACEHOLDER MODAL (UI only)
// ─────────────────────────────────────────────────────────────────────────────

function HirePlaceholderModal({ positionTitle, onClose }: { positionTitle: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm overflow-hidden"
        style={{ background: 'rgba(6,6,14,0.99)', border: '1px solid rgba(192,160,96,0.18)', boxShadow: '0 30px 80px rgba(0,0,0,0.9)', borderRadius: '2px' }}>
        <div className="px-5 py-4 flex items-center gap-3"
          style={{ background: 'linear-gradient(90deg, rgba(192,160,96,0.06), transparent)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="w-8 h-8 flex items-center justify-center shrink-0"
            style={{ background: 'rgba(192,160,96,0.08)', border: '1px solid rgba(192,160,96,0.2)', borderRadius: '2px' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#c0a060" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-sm">Hire {positionTitle}</div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] mt-0.5" style={{ color: 'rgba(192,160,96,0.5)' }}>Vacant Position</div>
          </div>
        </div>
        <div className="px-5 py-6 text-center">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(192,160,96,0.06)', border: '1px solid rgba(192,160,96,0.14)', borderRadius: '2px' }}>
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="rgba(192,160,96,0.5)" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-zinc-300 text-sm font-semibold mb-2">Hiring Coming Soon</p>
          <p className="text-zinc-600 text-[11px] leading-relaxed max-w-[260px] mx-auto">
            Hiring staff and assigning party roles will be added in the next gameplay phase of WORLDr.
          </p>
        </div>
        <div className="px-5 pb-5 flex justify-center">
          <button type="button" onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-150 hover:opacity-80"
            style={{ background: 'rgba(192,160,96,0.08)', border: '1px solid rgba(192,160,96,0.22)', color: '#c0a060', borderRadius: '2px' }}>
            Close
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
  partyColor,
}: {
  positions: Position[];
  selectedId: string;
  onSelect: (id: string) => void;
  partyColor: string;
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden"
      style={{ background: 'rgba(5,5,14,0.98)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Header */}
      <div className="px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(3,3,9,0.7)' }}>
        <div className="text-[8px] font-mono uppercase tracking-[0.28em] mb-0.5" style={{ color: 'rgba(192,160,96,0.6)' }}>Party HQ</div>
        <div className="text-white font-bold text-[11px] tracking-wide">Party Positions</div>
      </div>
      {/* List */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {positions.map((pos) => {
          const isSelected = pos.id === selectedId;
          const isFilled   = !!pos.filledBy;
          return (
            <button key={pos.id} id={`position-${pos.id}`} type="button"
              onClick={() => onSelect(pos.id)}
              className="w-full px-3 py-2.5 flex items-center gap-3 transition-all duration-150 text-left group"
              style={{
                background: isSelected ? `${partyColor}12` : 'transparent',
                borderLeft: isSelected ? `2px solid ${partyColor}` : '2px solid transparent',
                borderBottom: '1px solid rgba(255,255,255,0.028)',
              }}>
              {/* Avatar / initials */}
              <div className="w-7 h-7 flex items-center justify-center shrink-0 text-[10px] font-bold font-mono"
                style={{
                  background: isFilled ? `${partyColor}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isFilled ? partyColor + '35' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '2px',
                  color: isFilled ? partyColor : '#52525b',
                }}>
                {isFilled ? getInitials(pos.filledBy!.name) : '—'}
              </div>
              {/* Text */}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold leading-tight truncate"
                  style={{ color: isSelected ? '#e4e4e7' : '#a1a1aa', fontWeight: isSelected || isFilled ? 700 : 500 }}>
                  {pos.title}
                </div>
                <div className="text-[9px] font-mono mt-0.5 truncate"
                  style={{ color: isFilled ? `${partyColor}80` : 'rgba(113,113,122,0.5)' }}>
                  {isFilled ? pos.filledBy!.name : 'Vacant'}
                </div>
              </div>
              {/* Status dot */}
              <div className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: isFilled ? partyColor : 'rgba(113,113,122,0.3)' }} />
            </button>
          );
        })}
      </div>
      <div className="px-3 py-2 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="font-mono text-[7.5px] uppercase tracking-widest text-zinc-700">
          11 Positions · {positions.filter(p => p.filledBy).length} Filled · {positions.filter(p => !p.filledBy).length} Vacant
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTER — SELECTED POSITION PROFILE + ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

function ActionCard({ action, partyColor }: { action: PartyAction; partyColor: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const categoryColors: Record<string, string> = {
    Outreach: '#0d9488', Strategy: '#7c3aed', Internal: '#1d4ed8', Policy: '#166534',
    Campaign: '#b91c1c', Admin: '#475569',    Network: '#0891b2',  Media: '#d97706',
    Funding: '#059669',  Growth: '#ea580c',   Research: '#4338ca', Legal: '#374151',
    Politics: '#dc2626',
  };
  const catColor = categoryColors[action.category] ?? '#52525b';

  return (
    <div className="rounded-sm overflow-hidden transition-all duration-150 hover:translate-y-[-1px] group"
      style={{ background: 'rgba(8,8,20,0.8)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
      <div className="px-4 py-3.5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="text-white font-bold text-[12px] leading-tight">{action.name}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[8px] font-mono font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
                style={{ background: `${catColor}22`, color: catColor, border: `1px solid ${catColor}40`, borderRadius: '2px' }}>
                {action.category}
              </span>
            </div>
          </div>
          <button type="button"
            id={`action-info-${action.id}`}
            onClick={() => setShowTooltip((v) => !v)}
            className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 text-zinc-700 hover:text-zinc-400 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4M12 8h.01" />
            </svg>
          </button>
        </div>
        {/* Description (toggle) */}
        {showTooltip && (
          <p className="text-zinc-500 text-[11px] leading-relaxed mb-3">{action.description}</p>
        )}
        {/* Coming soon button */}
        <button type="button" disabled id={`action-btn-${action.id}`}
          className="w-full py-2 text-[9px] font-bold uppercase tracking-widest transition-all duration-150 cursor-not-allowed"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#3f3f46', borderRadius: '2px' }}>
          Coming Soon
        </button>
      </div>
    </div>
  );
}

function PositionCenter({
  position,
  partyColor,
  partyName,
  countryName,
  onHire,
}: {
  position: Position;
  partyColor: string;
  partyName: string;
  countryName: string;
  onHire: (title: string) => void;
}) {
  const isFilled = !!position.filledBy;

  return (
    <div className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'rgba(6,6,16,0.96)' }}>

      {/* Profile card */}
      <div className="p-5 shrink-0">
        <div className="rounded-sm overflow-hidden"
          style={{ background: 'rgba(8,8,20,0.9)', border: `1px solid ${isFilled ? partyColor + '28' : 'rgba(255,255,255,0.06)'}`, boxShadow: isFilled ? `0 0 40px ${partyColor}06` : 'none' }}>

          {isFilled ? (
            /* ── FILLED POSITION PROFILE ── */
            <div>
              {/* Gold header stripe */}
              <div className="px-5 py-2 flex items-center gap-2"
                style={{ background: `linear-gradient(90deg, ${partyColor}18, rgba(255,255,255,0.02), transparent)`, borderBottom: `1px solid ${partyColor}20` }}>
                <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: partyColor }} />
                <span className="font-mono text-[8.5px] uppercase tracking-[0.28em]" style={{ color: `${partyColor}80` }}>
                  Occupied · {position.filledBy!.status}
                </span>
              </div>
              <div className="p-5 flex flex-col sm:flex-row items-start gap-5">
                {/* Avatar */}
                <div className="w-20 h-20 flex items-center justify-center text-xl font-bold shrink-0"
                  style={{ background: `${partyColor}14`, border: `1.5px solid ${partyColor}35`, borderRadius: '2px', color: partyColor }}>
                  {getInitials(position.filledBy!.name)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Role label */}
                  <div className="font-mono text-[8px] uppercase tracking-[0.3em] mb-1" style={{ color: `${partyColor}70` }}>
                    {position.title}
                  </div>
                  <div className="text-white font-bold text-xl leading-tight mb-3">{position.filledBy!.name}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
                    {[
                      { label: 'Age',     value: position.filledBy!.age },
                      { label: 'Skill',   value: position.filledBy!.skill },
                      { label: 'Loyalty', value: `${position.filledBy!.loyalty}%`, accent: true },
                      { label: 'Status',  value: position.filledBy!.status, accent: true },
                      { label: 'Party',   value: partyName },
                      { label: 'Country', value: countryName },
                    ].map((f) => (
                      <div key={f.label}>
                        <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-zinc-700 mb-0.5">{f.label}</div>
                        <div className="text-[11px] font-semibold" style={{ color: f.accent ? partyColor : '#d4d4d8' }}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── VACANT POSITION PROFILE ── */
            <div>
              <div className="px-5 py-2 flex items-center gap-2"
                style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="font-mono text-[8.5px] uppercase tracking-[0.28em] text-zinc-600">Vacant Position</span>
              </div>
              <div className="p-5 flex flex-col sm:flex-row items-start gap-5">
                {/* Vacant avatar */}
                <div className="w-20 h-20 flex items-center justify-center text-zinc-700 shrink-0"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[8px] uppercase tracking-[0.3em] mb-1 text-zinc-600">{position.title}</div>
                  <div className="text-zinc-400 font-bold text-xl leading-tight mb-2">Vacant</div>
                  <p className="text-zinc-600 text-[11px] leading-relaxed mb-4 max-w-sm">{position.description}</p>
                  <button type="button" id={`hire-btn-${position.id}`} onClick={() => onHire(position.title)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-150 hover:opacity-80"
                    style={{ background: 'rgba(192,160,96,0.07)', border: '1px solid rgba(192,160,96,0.22)', color: '#c0a060', borderRadius: '2px' }}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Hire {position.title}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions section */}
      <div className="px-5 pb-6 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <span className="text-[8px] font-mono uppercase tracking-[0.28em]" style={{ color: 'rgba(192,160,96,0.5)' }}>
            Available Duties
          </span>
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {position.actions.map((action) => (
            <ActionCard key={action.id} action={action} partyColor={partyColor} />
          ))}
        </div>
        {/* Coming soon notice */}
        <div className="mt-4 px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(192,160,96,0.04)', border: '1px solid rgba(192,160,96,0.08)', borderRadius: '2px' }}>
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="rgba(192,160,96,0.4)" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-mono text-[9px] text-zinc-600">
            Actions will become executable in the next gameplay phase. Action effects, costs, and results will be added soon.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIGHT COLUMN — PARTY INFO PANEL
// ─────────────────────────────────────────────────────────────────────────────

function PartyInfoPanel({ ctx }: { ctx: PlayerCtx }) {
  const color = ctx.partyColor;
  const ideologyNames = ctx.ideologyIds.map((id) => IDEOLOGY_NAMES[id] ?? id);

  const statsRows = [
    { label: 'Leader',        value: ctx.characterName !== '—'         ? ctx.characterName             : 'Not recorded'      },
    { label: 'Country',       value: ctx.countryName                                                                          },
    { label: 'Continent',     value: ctx.continentName                                                                        },
    { label: 'Ideology 1',    value: ideologyNames[0]                  ?? 'Not recorded'                                      },
    { label: 'Ideology 2',    value: ideologyNames[1]                  ?? 'Not recorded'                                      },
    { label: 'Members',       value: '1',                               accent: true                                          },
    { label: 'Funds',         value: '$5,000',                          accent: true                                          },
    { label: 'Recognition',   value: 'Unknown'                                                                                },
    { label: 'Support',       value: '0.1%'                                                                                   },
    { label: 'Internal Unity',value: '100%',                            accent: true                                          },
    { label: 'Controversy',   value: '0%'                                                                                     },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden"
      style={{ background: 'rgba(5,5,14,0.99)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Header */}
      <div className="px-4 py-3 shrink-0"
        style={{ background: `linear-gradient(90deg, ${color}0e, transparent)`, borderBottom: `1px solid ${color}18` }}>
        <div className="text-[8px] font-mono uppercase tracking-[0.28em] mb-0.5" style={{ color: `${color}60` }}>Party Status</div>
        <div className="text-white font-bold text-[11px] tracking-wide">Command Intelligence</div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Logo + name */}
        <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 flex items-center justify-center shrink-0"
              style={{ background: `${color}12`, border: `1.5px solid ${color}30`, borderRadius: '2px' }}>
              {ctx.partyLogoId
                ? <LogoSVG logoId={ctx.partyLogoId} color={color} size={28} />
                : <span className="font-mono font-bold text-sm" style={{ color }}>{ctx.partyAbbreviation !== '—' ? ctx.partyAbbreviation : '?'}</span>}
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">
                {ctx.partyName !== '—' ? ctx.partyName : 'No Party'}
              </div>
              <div className="font-mono text-[9px] font-bold tracking-[0.2em] mt-0.5" style={{ color }}>
                {ctx.partyAbbreviation !== '—' ? ctx.partyAbbreviation : '—'}
              </div>
            </div>
          </div>
          {/* Active status */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
            <span className="font-mono text-[8.5px] uppercase tracking-[0.22em]" style={{ color: `${color}75` }}>
              Registered Political Party
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-4 space-y-2.5">
          {statsRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-[8.5px] font-mono uppercase tracking-[0.16em] text-zinc-600 shrink-0">{row.label}</span>
              <span className="text-[10.5px] font-semibold text-right min-w-0 truncate"
                style={{ color: row.accent ? color : '#a1a1aa' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Description if available */}
        {ctx.partyDescription && (
          <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px', marginTop: '4px' }}>
            <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-zinc-700 mb-1.5">Party Description</div>
            <p className="text-zinc-600 text-[10.5px] leading-relaxed">{ctx.partyDescription}</p>
          </div>
        )}

        {/* Founded */}
        {ctx.partyCreatedAt && (
          <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-zinc-700 mb-0.5">Registered</div>
            <div className="text-zinc-500 text-[10px] font-mono">{formatDate(ctx.partyCreatedAt)}</div>
          </div>
        )}

        {/* Note */}
        <div className="px-4 pb-5">
          <div className="px-3 py-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px' }}>
            <p className="font-mono text-[7.5px] uppercase tracking-widest text-zinc-700">
              Stats are display-only. Real gameplay effects will be added in future phases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECENT RESULTS (empty state)
// ─────────────────────────────────────────────────────────────────────────────

function RecentResults({ partyColor }: { partyColor: string }) {
  return (
    <div className="px-5 py-5 shrink-0"
      style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(4,4,12,0.98)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <span className="text-[8px] font-mono uppercase tracking-[0.28em]" style={{ color: 'rgba(192,160,96,0.45)' }}>
          Recent Results
        </span>
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
      <div className="flex items-center gap-5 py-4 px-5"
        style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px' }}>
        <div className="w-10 h-10 flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '2px' }}>
          <svg className="w-5 h-5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <div className="text-zinc-500 text-sm font-semibold mb-0.5">No party actions completed yet.</div>
          <p className="text-zinc-700 text-[10.5px] leading-relaxed max-w-md">
            Select a party position to view available duties. Action results will appear here once gameplay effects are added.
          </p>
        </div>
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
  const [revealed,       setRevealed]       = useState(false);
  const [showPartyMenu,  setShowPartyMenu]  = useState(false);
  const [selectedPosId,  setSelectedPosId]  = useState('party_leader');
  const [hireTarget,     setHireTarget]     = useState<string | null>(null);
  const [positions,      setPositions]      = useState<Position[]>([]);

  const [ctx, setCtx] = useState<PlayerCtx>({
    characterName: '—', characterAge: '—',
    countryName: 'Drennia', continentName: 'Varelia',
    partyName: '—', partyAbbreviation: '—', partyColor: '#c0a060',
    partyLogoId: '', partyColorId: 'gold', ideologyIds: [],
    partyDescription: '', partyCreatedAt: '', selectedPath: 'Politician',
  });

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);

    // — Character —
    const charName = [character.firstName, character.middleName, character.lastName].filter(Boolean).join(' ') || '—';
    const charAge  = character.age ?? '—';

    // — Country —
    let countryName = 'Drennia', continentName = 'Varelia';
    try {
      const raw = localStorage.getItem('worldr_selected_country');
      if (raw) { const c = JSON.parse(raw); countryName = c.countryName ?? 'Drennia'; continentName = c.continentName ?? 'Varelia'; }
    } catch {}

    // — Party —
    let partyName = '—', partyAbbreviation = '—', partyColor = '#c0a060', partyLogoId = '';
    let partyColorId = 'gold', ideologyIds: string[] = [], partyDescription = '', partyCreatedAt = '';
    try {
      const pRaw = localStorage.getItem('worldr_current_party');
      if (pRaw) {
        const p: RegisteredPoliticalParty = JSON.parse(pRaw);
        partyName         = p.partyName         ?? '—';
        partyAbbreviation = p.partyAbbreviation ?? '—';
        partyLogoId       = p.partyLogoId       ?? '';
        partyColorId      = p.colorId           ?? 'gold';
        partyColor        = PARTY_COLORS.find((c) => c.id === p.colorId)?.hex ?? '#c0a060';
        ideologyIds       = p.ideologyIds       ?? [];
        partyDescription  = p.partyDescription  ?? '';
        partyCreatedAt    = p.createdAt         ?? '';
      }
    } catch {}

    // — Path —
    const pathRaw = localStorage.getItem('worldr_selected_path') || localStorage.getItem('worldr-path');
    const pathLabels: Record<string, string> = {
      politician: 'Politician', businessman: 'Businessman',
      military: 'Military Officer', judicial: 'Judicial Officer', media: 'Media & Influence',
    };
    const selectedPath = pathLabels[pathRaw ?? ''] ?? 'Politician';

    const newCtx: PlayerCtx = {
      characterName: charName, characterAge: charAge,
      countryName, continentName,
      partyName, partyAbbreviation, partyColor, partyLogoId, partyColorId,
      ideologyIds, partyDescription, partyCreatedAt, selectedPath,
    };
    setCtx(newCtx);

    // — Build positions with real player data for Party Leader —
    const filled: Position[] = POSITION_DEFINITIONS.map((def) => {
      if (def.id === 'party_leader') {
        return {
          ...def,
          filledBy: {
            name:    charName !== '—' ? charName : 'Player Name',
            age:     charAge,
            skill:   'Leadership',
            loyalty: 100,
            status:  'Founder',
          },
        };
      }
      return { ...def };
    });
    setPositions(filled);

    return () => clearTimeout(t);
  }, [character]);

  const selectedPos = positions.find((p) => p.id === selectedPosId) ?? positions[0];

  return (
    <>
      {/* Hire placeholder modal */}
      {hireTarget && <HirePlaceholderModal positionTitle={hireTarget} onClose={() => setHireTarget(null)} />}

      <div className="h-screen flex flex-col transition-opacity duration-500 overflow-hidden"
        style={{ opacity: revealed ? 1 : 0, background: '#06060e' }}>

        {/* ══ TOP GAME BAR ═══════════════════════════════════════════════════ */}
        <header className="shrink-0 flex items-center justify-between px-4 md:px-5 gap-3"
          style={{ height: '48px', background: 'rgba(3,3,9,0.99)', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 30 }}>
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <img src="/assets/flags/varelia/drennia.svg" alt="Drennia"
              style={{ width: '28px', height: '19px', objectFit: 'cover', borderRadius: '1px', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }} />
            <div className="flex flex-col leading-none">
              <span className="text-white font-bold text-[12px] tracking-wide">{ctx.countryName}</span>
              <span className="text-zinc-600 text-[8.5px] font-mono uppercase tracking-widest">{ctx.continentName}</span>
            </div>
            <div className="h-3.5 w-px bg-white/[0.07] hidden md:block" />
            <div className="hidden md:flex flex-col leading-none">
              <span className="text-zinc-400 text-[10.5px] font-mono font-semibold tracking-wide">Year 0 · Month 1 · Day 1</span>
              <span className="text-zinc-700 text-[8px] font-mono uppercase tracking-widest">00:00 · Game Start</span>
            </div>
          </div>
          {/* Right */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button id="topbar-bell" type="button" title="Notifications"
              className="w-8 h-8 flex items-center justify-center rounded-sm text-zinc-500 hover:text-zinc-200 transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-sm"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-zinc-600 text-[8.5px] font-mono uppercase tracking-widest">Cash</span>
              <span className="text-emerald-400 text-[11px] font-bold font-mono">$0</span>
            </div>
            <div className="relative">
              <button id="party-menu-btn" type="button" onClick={() => setShowPartyMenu((v) => !v)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-sm transition-all duration-150 hover:opacity-90"
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
              className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-sm text-zinc-600 hover:text-red-400 transition-colors text-[10px] font-mono uppercase tracking-widest"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden md:block">Logout</span>
            </button>
          </div>
        </header>

        {/* ══ MAIN NAV TABS ══════════════════════════════════════════════════ */}
        <nav className="shrink-0 flex items-center px-4 md:px-5"
          style={{ height: '40px', background: 'rgba(5,5,13,0.98)', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 20 }}>
          {MAIN_TABS.map((tab) => {
            const isHome    = tab === 'Home';
            const isActions = tab === 'Actions';
            const isEnabled = isHome || isActions;
            const isCurrent = isActions; // we ARE on Actions
            return (
              <button key={tab} id={`main-tab-${tab.toLowerCase()}`} type="button"
                disabled={!isEnabled}
                onClick={() => {
                  if (isHome)    router.push('/varelia/news');
                  // Actions is current page — no-op
                }}
                className="relative px-4 h-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-150"
                style={{
                  color:        isCurrent ? '#e4e4e7' : isEnabled ? '#71717a' : '#3f3f46',
                  cursor:       isEnabled ? 'pointer' : 'not-allowed',
                  borderBottom: isCurrent ? '2px solid #c0a060' : '2px solid transparent',
                }}>
                {tab}
                {!isEnabled && <span className="text-[7px] font-mono text-zinc-700 normal-case tracking-normal hidden lg:inline">soon</span>}
              </button>
            );
          })}
        </nav>

        {/* ══ PAGE HEADER AREA ═══════════════════════════════════════════════ */}
        <div className="shrink-0 px-5 py-4"
          style={{ background: 'rgba(6,6,16,0.98)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1 h-4 rounded-sm" style={{ background: `linear-gradient(180deg, ${ctx.partyColor}, ${ctx.partyColor}60)` }} />
                <h1 className="text-white font-bold text-lg tracking-tight">Party Actions</h1>
                {ctx.partyName !== '—' && (
                  <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5"
                    style={{ color: ctx.partyColor, background: `${ctx.partyColor}10`, border: `1px solid ${ctx.partyColor}25`, borderRadius: '2px' }}>
                    {ctx.partyName}
                  </span>
                )}
              </div>
              <p className="text-zinc-600 text-[11px] leading-relaxed ml-3">
                Manage your political organization, assign duties, and prepare your movement for national politics.
              </p>
            </div>
            {/* Party subtab */}
            <div className="flex items-center gap-2">
              <button id="subtab-party" type="button"
                className="px-4 py-2 text-[9.5px] font-bold uppercase tracking-[0.18em] transition-all"
                style={{ background: `${ctx.partyColor}12`, border: `1px solid ${ctx.partyColor}35`, color: ctx.partyColor, borderRadius: '2px' }}>
                Party
              </button>
            </div>
          </div>
        </div>

        {/* ══ THREE-COLUMN BODY ══════════════════════════════════════════════ */}
        <div className="flex-1 overflow-hidden">
          {/* Mobile/tablet: stacked layout */}
          <div className="h-full flex flex-col lg:hidden overflow-y-auto" style={{ background: '#06060e' }}>
            {/* Party Info (top on mobile) */}
            <div style={{ minHeight: '280px', maxHeight: '360px' }}>
              {positions.length > 0 && <PartyInfoPanel ctx={ctx} />}
            </div>
            {/* Position List */}
            <div style={{ minHeight: '240px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              {positions.length > 0 && (
                <PositionList positions={positions} selectedId={selectedPosId} onSelect={setSelectedPosId} partyColor={ctx.partyColor} />
              )}
            </div>
            {/* Center: selected position */}
            {selectedPos && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <PositionCenter position={selectedPos} partyColor={ctx.partyColor} partyName={ctx.partyName} countryName={ctx.countryName} onHire={setHireTarget} />
              </div>
            )}
            {/* Recent results */}
            <RecentResults partyColor={ctx.partyColor} />
          </div>

          {/* Desktop: 3-column fixed layout */}
          <div className="h-full hidden lg:grid" style={{ gridTemplateColumns: '220px 1fr 240px' }}>
            {/* Left */}
            {positions.length > 0 && (
              <PositionList positions={positions} selectedId={selectedPosId} onSelect={setSelectedPosId} partyColor={ctx.partyColor} />
            )}
            {/* Center */}
            <div className="flex flex-col overflow-hidden">
              {selectedPos && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <PositionCenter position={selectedPos} partyColor={ctx.partyColor} partyName={ctx.partyName} countryName={ctx.countryName} onHire={setHireTarget} />
                  </div>
                  <RecentResults partyColor={ctx.partyColor} />
                </div>
              )}
            </div>
            {/* Right */}
            {positions.length > 0 && <PartyInfoPanel ctx={ctx} />}
          </div>
        </div>
      </div>
    </>
  );
}
