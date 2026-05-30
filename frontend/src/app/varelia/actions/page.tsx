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
// HIRE PLACEHOLDER MODAL
// ─────────────────────────────────────────────────────────────────────────────

function HirePlaceholderModal({ positionTitle, onClose }: { positionTitle: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm overflow-hidden"
        style={{ background: PANEL, border: `1px solid ${BORDER}`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', borderRadius: '2px' }}>
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="w-8 h-8 flex items-center justify-center shrink-0"
            style={{ background: `${ACCENT}14`, border: `1px solid ${ACCENT}30`, borderRadius: '2px' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: TEXT }}>Hire {positionTitle}</div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] mt-0.5" style={{ color: MUTED }}>Vacant Position</div>
          </div>
        </div>
        <div className="px-5 py-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center"
            style={{ background: `${ACCENT}0a`, border: `1px solid ${ACCENT}20`, borderRadius: '2px' }}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-semibold text-sm mb-2" style={{ color: TEXT }}>Hiring Coming Soon</p>
          <p className="text-[11px] leading-relaxed max-w-[240px] mx-auto" style={{ color: MUTED }}>
            Hiring staff and assigning party roles will be available in the next gameplay phase of WORLDr.
          </p>
        </div>
        <div className="px-5 pb-5 flex justify-center">
          <button type="button" onClick={onClose}
            className="px-6 py-2 text-xs font-bold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75"
            style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}28`, color: ACCENT, borderRadius: '2px' }}>
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
                <button type="button" disabled
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest opacity-40 cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: '2px' }}>
                  Coming Soon
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

  const [ctx, setCtx] = useState<PlayerCtx>({
    characterName: '—', characterAge: '—',
    countryName: 'Drennia', continentName: 'Varelia',
    partyName: '—', partyAbbreviation: '—',
    partyColor: ACCENT, partyLogoId: '',
    ideologyIds: [], partyDescription: '', partyCreatedAt: '',
    selectedPath: 'Politician',
    partyId: '',
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

    setCtx({ characterName: charName, characterAge: charAge, countryName, continentName, partyName, partyAbbreviation, partyColor, partyLogoId, ideologyIds, partyDescription, partyCreatedAt, selectedPath, partyId });

    // Build positions — Party Leader filled by player
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
      {hireTarget && <HirePlaceholderModal positionTitle={hireTarget} onClose={() => setHireTarget(null)} />}
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
              <span className="text-[8.5px] font-mono uppercase tracking-widest" style={{ color: MUTED }}>Cash</span>
              <span className="text-[11px] font-bold font-mono text-emerald-600">$0</span>
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
        <div className="shrink-0 flex items-center px-4 md:px-5 border-b"
          style={{ height: '34px', background: PANEL2, borderColor: BORDER }}>
          <button type="button"
            className="px-4 h-full flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] border-b-2"
            style={{
              color: TEXT,
              borderColor: ACCENT,
            }}>
            Party Actions
          </button>
        </div>

        {/* ══ TWO-COLUMN BODY ════════════════════════════════════════════ */}
        <div className="flex-1 overflow-hidden">

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
        </div>
      </div>
    </>
  );
}
