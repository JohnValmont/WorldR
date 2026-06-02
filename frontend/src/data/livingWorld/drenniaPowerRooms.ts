// ─── Types ────────────────────────────────────────────────────────────────────

export type RoomType =
  | 'public_debate'
  | 'work_contract'
  | 'local_organizer'
  | 'business_circle'
  | 'community_issue'
  | 'political_observation';

export type DrenniaState =
  | 'Drennport State'
  | 'Ironvale State'
  | 'Greenmere State'
  | 'Westport State';

export type FactorKey = 'credibility' | 'charisma' | 'influence' | 'resources';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ResultType = 'success' | 'mixed' | 'failure';

export interface RoomRole {
  id: string;
  label: string;
  description: string;
  mainFactors: FactorKey[];
  riskLevel: RiskLevel;
  potentialGain: string;
  possibleRisk: string;
  publicRecordPossible: boolean;
  limitedSlots?: number;
}

export interface NpcPresence {
  name: string;
  role: string;
  institution?: string;
}

export interface SimulatedPlayer {
  name: string;
  status: string;
  roleHint: string;
}

export interface PowerRoom {
  id: string;
  title: string;
  type: RoomType;
  state: DrenniaState;
  visibility: 'public' | 'private';
  durationLabel: string;
  timeRemainingLabel: string;
  story: string;
  npcPresence: NpcPresence[];
  simulatedPlayers: SimulatedPlayer[];
  roles: RoomRole[];
  stakes: string;
  recordTemplates: { success: string; mixed: string; failure: string };
  stateWeight?: string;
  tags: string[];
}

// ─── Simulated Citizens Pool ──────────────────────────────────────────────────

const SIM_POOL = [
  { name: 'Arin Vale',    status: 'Simulated citizen', roleHint: 'Observer' },
  { name: 'Mira Sorn',    status: 'Simulated citizen', roleHint: 'Speaker applicant' },
  { name: 'Dalen Kest',   status: 'Simulated citizen', roleHint: 'Supporter' },
  { name: 'Ira Fen',      status: 'Simulated citizen', roleHint: 'Challenger' },
  { name: 'Oren Lask',    status: 'Simulated citizen', roleHint: 'Observer' },
  { name: 'Niva Corren',  status: 'Simulated citizen', roleHint: 'Applicant' },
  { name: 'Taren Sol',    status: 'Simulated citizen', roleHint: 'Helper' },
  { name: 'Elva Mond',    status: 'Simulated citizen', roleHint: 'Observer' },
];

function sim(...indices: number[]): SimulatedPlayer[] {
  return indices.map(i => SIM_POOL[i]);
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const DRENNIA_POWER_ROOMS: PowerRoom[] = [

  // ── 1. Drennport Youth Debate ─────────────────────────────────────────────
  {
    id: 'drennport-youth-debate',
    title: 'Drennport Youth Debate',
    type: 'public_debate',
    state: 'Drennport State',
    visibility: 'public',
    durationLabel: '30 min session',
    timeRemainingLabel: '18 min remaining',
    story: 'A civic debate series for young Drennians aged 18–25. The topic this session: "Should civic service be mandatory?" Mara Velden is in the gallery. Several first-year graduates and a journalist contact are watching from the press row.',
    npcPresence: [
      { name: 'Mara Velden', role: 'Teacher Mentor', institution: 'Drennport Civic Education Board' },
      { name: 'Talia Renn',  role: 'Journalist Observer', institution: 'Drennport Evening Record' },
    ],
    simulatedPlayers: sim(0, 1, 2, 3),
    roles: [
      {
        id: 'speak',
        label: 'Speak',
        description: 'You step forward and address the room with your own position.',
        mainFactors: ['charisma', 'credibility'],
        riskLevel: 'Medium',
        potentialGain: 'Charisma +1, Credibility +1, public record created',
        possibleRisk: 'Public embarrassment if poorly received',
        publicRecordPossible: true,
        limitedSlots: 2,
      },
      {
        id: 'support-speaker',
        label: 'Support a Speaker',
        description: 'You attach your name to someone else\'s argument and reinforce their position.',
        mainFactors: ['influence', 'charisma'],
        riskLevel: 'Low',
        potentialGain: 'Influence +1, relationship seed',
        possibleRisk: 'Backing a weak speaker reflects on you',
        publicRecordPossible: true,
      },
      {
        id: 'challenge',
        label: 'Challenge a Speaker',
        description: 'You publicly challenge an existing speaker\'s position.',
        mainFactors: ['charisma', 'credibility'],
        riskLevel: 'High',
        potentialGain: 'Charisma +2 if effective, Credibility boost',
        possibleRisk: 'Public record of failed challenge',
        publicRecordPossible: true,
        limitedSlots: 2,
      },
      {
        id: 'observe',
        label: 'Observe Quietly',
        description: 'You learn the room without exposing yourself.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        potentialGain: 'Credibility +1, no public record',
        possibleRisk: 'Low reward',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Credibility and public voice. A strong debut here can create an early public record in Drennport State.',
    recordTemplates: {
      success: 'Spoke at Drennport Youth Debate and held the room\'s attention. Mara Velden noted the name.',
      mixed:   'Participated at Drennport Youth Debate. Made an impression — though not entirely the intended one.',
      failure: 'Attended Drennport Youth Debate. Did not distinguish themselves.',
    },
    stateWeight: 'civic',
    tags: ['public', 'credibility', 'charisma', 'drennport', 'debut'],
  },

  // ── 2. Civic Order Local Meeting ──────────────────────────────────────────
  {
    id: 'civic-order-local-meeting',
    title: 'Civic Order Local Meeting',
    type: 'political_observation',
    state: 'Drennport State',
    visibility: 'public',
    durationLabel: '45 min session',
    timeRemainingLabel: '22 min remaining',
    story: 'The Civic Order holds a regular open meeting for residents. Jonas Kest is chairing. The agenda covers neighbourhood funding, a contested planning decision, and an upcoming community vote. A handful of young citizens have come to watch — or to be noticed.',
    npcPresence: [
      { name: 'Jonas Kest', role: 'Local Councillor', institution: 'Drennport District Council' },
    ],
    simulatedPlayers: sim(0, 4, 6),
    roles: [
      {
        id: 'attend-gallery',
        label: 'Attend Public Gallery',
        description: 'You sit in the gallery and observe the meeting process.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        potentialGain: 'Credibility +1, learn civic process',
        possibleRisk: 'No networking opportunity',
        publicRecordPossible: false,
      },
      {
        id: 'volunteer-helper',
        label: 'Volunteer as Helper',
        description: 'You offer to help with logistics — setting up, handing out papers, directing attendees.',
        mainFactors: ['credibility', 'influence'],
        riskLevel: 'Low',
        potentialGain: 'Influence +1, Jonas Kest notices your name',
        possibleRisk: 'Very small reward',
        publicRecordPossible: false,
      },
      {
        id: 'ask-question',
        label: 'Ask a Question',
        description: 'You raise your hand during the public questions segment.',
        mainFactors: ['charisma', 'credibility'],
        riskLevel: 'Medium',
        potentialGain: 'Charisma +1, Credibility +1 if good question',
        possibleRisk: 'Looking unprepared in front of a councillor',
        publicRecordPossible: true,
        limitedSlots: 3,
      },
      {
        id: 'introduce-privately',
        label: 'Introduce Yourself Privately',
        description: 'After the meeting you approach Jonas Kest directly.',
        mainFactors: ['influence', 'charisma'],
        riskLevel: 'Medium',
        potentialGain: 'Influence +1, political contact seed with Jonas Kest',
        possibleRisk: 'Seen as over-eager if timing is wrong',
        publicRecordPossible: false,
        limitedSlots: 2,
      },
    ],
    stakes: 'Political exposure. A chance to be seen by Jonas Kest and begin building civic familiarity.',
    recordTemplates: {
      success: 'Attended the Civic Order Local Meeting and made a favourable impression on Jonas Kest.',
      mixed:   'Attended the Civic Order Local Meeting. Left with modest civic awareness and a name in the room.',
      failure: 'Attended the Civic Order Local Meeting. Went unnoticed.',
    },
    stateWeight: 'political',
    tags: ['politics', 'influence', 'drennport', 'civic', 'exposure'],
  },

  // ── 3. Temporary Clerk Contract ───────────────────────────────────────────
  {
    id: 'temporary-clerk-contract',
    title: 'Temporary Clerk Contract',
    type: 'work_contract',
    state: 'Drennport State',
    visibility: 'private',
    durationLabel: 'One week contract',
    timeRemainingLabel: '2 slots remaining',
    story: 'Drennport Municipal Office is hiring temporary data clerks for the upcoming census filing period. Straightforward office work. Pay is modest. Hours are fixed. The supervisor is known to write references for exceptional temps.',
    npcPresence: [
      { name: 'Harlen Graye', role: 'Municipal Office Supervisor', institution: 'Drennport Municipal Office' },
    ],
    simulatedPlayers: sim(0, 5, 7),
    roles: [
      {
        id: 'apply-work',
        label: 'Apply for the Contract',
        description: 'You apply through the standard office channel and wait for a result.',
        mainFactors: ['credibility', 'resources'],
        riskLevel: 'Low',
        potentialGain: 'Resources +1, $150 income, possible reference',
        possibleRisk: 'Not selected if credibility is very low',
        publicRecordPossible: false,
      },
      {
        id: 'recommend-other',
        label: 'Recommend Another Citizen',
        description: 'You pass the opportunity to someone else in your network and take credit for the introduction.',
        mainFactors: ['influence'],
        riskLevel: 'Low',
        potentialGain: 'Influence +1, goodwill from recipient',
        possibleRisk: 'No income',
        publicRecordPossible: false,
      },
      {
        id: 'safe-shift',
        label: 'Take Low-Pay Safe Shift',
        description: 'You take the least competitive shift — guaranteed pay, no competition.',
        mainFactors: ['resources'],
        riskLevel: 'Low',
        potentialGain: '$80 income, secure work record',
        possibleRisk: 'Minimal career benefit',
        publicRecordPossible: false,
      },
      {
        id: 'observe-market',
        label: 'Observe the Job Market',
        description: 'You study who gets selected and why, without applying yourself.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        potentialGain: 'Credibility +1, market intelligence',
        possibleRisk: 'No income',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Money and work record. A stable work contract creates a private income record and office familiarity.',
    recordTemplates: {
      success: 'Secured the Drennport Clerk Contract and performed reliably. Harlen Graye noted the work quality.',
      mixed:   'Completed a clerk shift at Drennport Municipal Office. Work was adequate.',
      failure: 'Applied for the Drennport Clerk Contract but was not selected.',
    },
    stateWeight: 'work',
    tags: ['work', 'resources', 'income', 'drennport', 'private'],
  },

  // ── 4. Workers' Renewal Forum ─────────────────────────────────────────────
  {
    id: 'workers-renewal-forum',
    title: 'Workers\' Renewal Forum',
    type: 'local_organizer',
    state: 'Ironvale State',
    visibility: 'public',
    durationLabel: '60 min open session',
    timeRemainingLabel: '35 min remaining',
    story: 'Sera Dunne is leading an open forum for workers and interested citizens to discuss conditions in Ironvale\'s manufacturing sector. Non-workers are welcome to observe or assist. This is not a protest — it is a structured civic gathering with real political weight.',
    npcPresence: [
      { name: 'Sera Dunne', role: 'Union Organizer', institution: 'Ironvale Workers\' Renewal Coalition' },
    ],
    simulatedPlayers: sim(0, 2, 3, 6),
    roles: [
      {
        id: 'assist-organizer',
        label: 'Assist the Organizer',
        description: 'You help Sera Dunne run the session — logistics, note-taking, managing the room.',
        mainFactors: ['influence', 'credibility'],
        riskLevel: 'Low',
        potentialGain: 'Influence +1, Credibility +1, Sera Dunne contact seed',
        possibleRisk: 'Labour association may limit later business options',
        publicRecordPossible: false,
      },
      {
        id: 'introduce-yourself',
        label: 'Introduce Yourself',
        description: 'You briefly introduce yourself to the room and explain why you are there.',
        mainFactors: ['charisma', 'influence'],
        riskLevel: 'Medium',
        potentialGain: 'Charisma +1, Influence +1',
        possibleRisk: 'Workers may be sceptical of an outsider',
        publicRecordPossible: true,
        limitedSlots: 3,
      },
      {
        id: 'bring-supporters',
        label: 'Bring Supporters',
        description: 'You arrive having encouraged others to attend, vouching for the forum.',
        mainFactors: ['influence', 'charisma'],
        riskLevel: 'Low',
        potentialGain: 'Influence +2',
        possibleRisk: 'Seen as trying to take credit for Dunne\'s work',
        publicRecordPossible: false,
        limitedSlots: 2,
      },
      {
        id: 'observe-quietly-forum',
        label: 'Observe Quietly',
        description: 'You sit at the back and observe how Sera Dunne operates the room.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        potentialGain: 'Credibility +1, no exposure',
        possibleRisk: 'Minimal connection built',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Influence and labour network access. Early connection to Sera Dunne. Attending may restrict later business access.',
    recordTemplates: {
      success: 'Assisted at the Ironvale Workers\' Renewal Forum. Sera Dunne acknowledged the support.',
      mixed:   'Attended the Ironvale Workers\' Renewal Forum. Participated modestly.',
      failure: 'Attended the Ironvale Workers\' Renewal Forum but failed to make a meaningful contribution.',
    },
    stateWeight: 'labour',
    tags: ['influence', 'charisma', 'ironvale', 'labour', 'organizer'],
  },

  // ── 5. Factory Shift Interview ────────────────────────────────────────────
  {
    id: 'factory-shift-interview',
    title: 'Factory Shift Interview',
    type: 'work_contract',
    state: 'Ironvale State',
    visibility: 'private',
    durationLabel: 'Walk-in interviews today',
    timeRemainingLabel: '4 slots remaining',
    story: 'Ironvale Industrial Plant is conducting walk-in interviews for temporary production line support. Work is physical, hourly paid, and honest. A plant manager is screening candidates on the spot.',
    npcPresence: [
      { name: 'Bordan Yell', role: 'Plant Manager', institution: 'Ironvale Industrial Plant' },
    ],
    simulatedPlayers: sim(1, 3, 5),
    roles: [
      {
        id: 'interview',
        label: 'Interview for the Shift',
        description: 'You sit for a short interview with Bordan Yell.',
        mainFactors: ['credibility', 'resources'],
        riskLevel: 'Low',
        potentialGain: '$200 income, Resources +1, work record',
        possibleRisk: 'Low if credibility very low',
        publicRecordPossible: false,
      },
      {
        id: 'negotiate-rate',
        label: 'Negotiate a Better Rate',
        description: 'You push back on the offered rate before accepting.',
        mainFactors: ['charisma', 'resources'],
        riskLevel: 'Medium',
        potentialGain: '$300 income on success, Charisma +1',
        possibleRisk: 'Offer withdrawn if negotiation fails',
        publicRecordPossible: false,
      },
      {
        id: 'pass-on',
        label: 'Pass the Opportunity On',
        description: 'You recommend another citizen and take credit for the referral.',
        mainFactors: ['influence'],
        riskLevel: 'Low',
        potentialGain: 'Influence +1, goodwill',
        possibleRisk: 'No income',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Income and work record. Ironvale industrial work builds Resources and a private income history.',
    recordTemplates: {
      success: 'Secured a factory shift at Ironvale Industrial Plant. Work record created. Bordan Yell approved the hire.',
      mixed:   'Completed a factory shift at Ironvale. Pay received. No distinction made.',
      failure: 'Did not secure the factory shift. Bordan Yell passed on the application.',
    },
    stateWeight: 'work',
    tags: ['work', 'resources', 'income', 'ironvale', 'private'],
  },

  // ── 6. Greenmere Water Dispute ────────────────────────────────────────────
  {
    id: 'greenmere-water-dispute',
    title: 'Greenmere Water Dispute',
    type: 'community_issue',
    state: 'Greenmere State',
    visibility: 'public',
    durationLabel: 'Active resolution meeting',
    timeRemainingLabel: '12 min remaining',
    story: 'Two villages in Greenmere are in dispute over water drainage rights after a local construction project. Corin Vale is chairing the mediation. A local council clerk is present. Residents are watching and the outcome will be remembered.',
    npcPresence: [
      { name: 'Corin Vale',    role: 'Community Elder',   institution: 'Greenmere Parish Council' },
      { name: 'Wren Aldoss',   role: 'Council Clerk',     institution: 'Greenmere District Council' },
    ],
    simulatedPlayers: sim(0, 2, 4, 7),
    roles: [
      {
        id: 'mediate',
        label: 'Mediate',
        description: 'You offer to facilitate the dispute, listening to both sides and proposing a resolution.',
        mainFactors: ['charisma', 'credibility'],
        riskLevel: 'High',
        potentialGain: 'Credibility +2, Charisma +1, strong community record',
        possibleRisk: 'Failed mediation creates public credibility risk',
        publicRecordPossible: true,
        limitedSlots: 1,
      },
      {
        id: 'support-elder',
        label: 'Support Corin Vale',
        description: 'You publicly back Corin Vale\'s approach and add your voice of support.',
        mainFactors: ['credibility', 'influence'],
        riskLevel: 'Low',
        potentialGain: 'Credibility +1, Corin Vale relationship seed',
        possibleRisk: 'If Vale\'s resolution fails, you share some of the outcome',
        publicRecordPossible: true,
      },
      {
        id: 'speak-residents',
        label: 'Speak for the Residents',
        description: 'You take one side and articulate the residents\' position.',
        mainFactors: ['charisma', 'credibility'],
        riskLevel: 'Medium',
        potentialGain: 'Charisma +1, community goodwill',
        possibleRisk: 'The other side will remember',
        publicRecordPossible: true,
        limitedSlots: 2,
      },
      {
        id: 'observe-quietly-dispute',
        label: 'Observe Quietly',
        description: 'You watch how the mediation unfolds and take notes.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        potentialGain: 'Credibility +1',
        possibleRisk: 'No community connections built',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Community credibility. A strong showing here builds Greenmere standing and a public record that travels.',
    recordTemplates: {
      success: 'Played a meaningful role in resolving the Greenmere Water Dispute. Corin Vale noted the contribution.',
      mixed:   'Participated in the Greenmere Water Dispute mediation. Partial contribution recorded.',
      failure: 'Attempted to contribute to the Greenmere Water Dispute but the room did not respond.',
    },
    stateWeight: 'community',
    tags: ['credibility', 'charisma', 'greenmere', 'community', 'public'],
  },

  // ── 7. Rural Service Drive ────────────────────────────────────────────────
  {
    id: 'rural-service-drive',
    title: 'Rural Service Drive',
    type: 'community_issue',
    state: 'Greenmere State',
    visibility: 'public',
    durationLabel: 'Weekend initiative',
    timeRemainingLabel: 'Open now',
    story: 'The Greenmere District Council is running a community service initiative — volunteers needed for record-keeping, elderly assistance, and basic infrastructure support across three rural parishes. The Council Clerk is managing registration.',
    npcPresence: [
      { name: 'Wren Aldoss', role: 'Council Clerk', institution: 'Greenmere District Council' },
    ],
    simulatedPlayers: sim(0, 6, 7),
    roles: [
      {
        id: 'register-volunteer',
        label: 'Register as Volunteer',
        description: 'You put your name forward for community service work.',
        mainFactors: ['credibility', 'charisma'],
        riskLevel: 'Low',
        potentialGain: 'Credibility +1, community record',
        possibleRisk: 'Time committed, no income',
        publicRecordPossible: true,
      },
      {
        id: 'help-clerk',
        label: 'Help the Clerk Organise',
        description: 'You assist Wren Aldoss with registration logistics.',
        mainFactors: ['influence', 'credibility'],
        riskLevel: 'Low',
        potentialGain: 'Influence +1, administrative familiarity',
        possibleRisk: 'Very modest reward',
        publicRecordPossible: false,
      },
      {
        id: 'bring-others',
        label: 'Recruit Other Volunteers',
        description: 'You spend time encouraging others to register, multiplying the impact.',
        mainFactors: ['influence', 'charisma'],
        riskLevel: 'Low',
        potentialGain: 'Influence +1, Charisma +1',
        possibleRisk: 'Seen as coordinating rather than serving',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Community reputation and civic record. Quiet but genuine community-building.',
    recordTemplates: {
      success: 'Volunteered in the Greenmere Rural Service Drive. Work acknowledged by the Council Clerk.',
      mixed:   'Participated in the Greenmere Rural Service Drive. Contribution was modest.',
      failure: 'Attempted to join the Rural Service Drive but did not complete a meaningful role.',
    },
    stateWeight: 'community',
    tags: ['credibility', 'influence', 'greenmere', 'community', 'volunteer'],
  },

  // ── 8. Westport Business Circle ───────────────────────────────────────────
  {
    id: 'westport-business-circle',
    title: 'Westport Business Circle',
    type: 'business_circle',
    state: 'Westport State',
    visibility: 'private',
    durationLabel: 'Evening event',
    timeRemainingLabel: 'Open · 1 sponsor slot',
    story: 'Elric Voss hosts a monthly gathering of Westport business figures, young professionals, and commercial aspirants. Entry is semi-open — guests are expected to justify their presence. One sponsor slot remains for a promising young citizen. Voss decides who fills it.',
    npcPresence: [
      { name: 'Elric Voss', role: 'Business Patron', institution: 'Voss Trade & Commerce Group' },
    ],
    simulatedPlayers: sim(1, 2, 5, 7),
    roles: [
      {
        id: 'pitch-yourself',
        label: 'Pitch Yourself',
        description: 'You present yourself to Elric Voss as worth sponsoring.',
        mainFactors: ['charisma', 'resources'],
        riskLevel: 'High',
        potentialGain: 'Resources +1, business contact, $150 seed',
        possibleRisk: 'Rejection in front of the room; business vulnerability',
        publicRecordPossible: false,
        limitedSlots: 1,
      },
      {
        id: 'assist-patron',
        label: 'Assist Elric Voss',
        description: 'You offer to help with the evening — introductions, logistics, follow-ups.',
        mainFactors: ['influence', 'resources'],
        riskLevel: 'Low',
        potentialGain: 'Influence +1, Voss takes note of your name',
        possibleRisk: 'Seen as staff rather than peer',
        publicRecordPossible: false,
      },
      {
        id: 'study-room',
        label: 'Study the Room',
        description: 'You observe, network casually, and learn the commercial landscape.',
        mainFactors: ['credibility', 'resources'],
        riskLevel: 'Low',
        potentialGain: 'Credibility +1, market intelligence',
        possibleRisk: 'No direct relationship built with Voss',
        publicRecordPossible: false,
      },
      {
        id: 'compete-sponsor',
        label: 'Compete for Sponsor Slot',
        description: 'You directly compete against another applicant for the one remaining sponsor position.',
        mainFactors: ['charisma', 'resources', 'credibility'],
        riskLevel: 'High',
        potentialGain: 'Resources +2, $200, business patron obligation',
        possibleRisk: 'Visible public rejection; business vulnerability note',
        publicRecordPossible: false,
        limitedSlots: 1,
      },
    ],
    stakes: 'Business access and patron network. High reward, high visibility risk. Voss obligations follow success.',
    recordTemplates: {
      success: 'Secured a place in the Westport Business Circle. Elric Voss took note. A business obligation was created.',
      mixed:   'Attended the Westport Business Circle. Made modest commercial connections.',
      failure: 'Attended the Westport Business Circle but did not secure a meaningful position.',
    },
    stateWeight: 'business',
    tags: ['resources', 'influence', 'westport', 'business', 'patron'],
  },

  // ── 9. Port Ledger Apprenticeship ─────────────────────────────────────────
  {
    id: 'port-ledger-apprenticeship',
    title: 'Port Ledger Apprenticeship',
    type: 'work_contract',
    state: 'Westport State',
    visibility: 'private',
    durationLabel: 'Two-week placement',
    timeRemainingLabel: '3 placements available',
    story: 'Westport Logistics Group is offering paid ledger apprenticeships to young citizens interested in trade finance and commercial administration. The placement involves real data, real shipments, and a supervisor who can open doors into the port trade network.',
    npcPresence: [
      { name: 'Dara Osse', role: 'Logistics Manager', institution: 'Westport Logistics Group' },
    ],
    simulatedPlayers: sim(0, 3, 5),
    roles: [
      {
        id: 'apply-placement',
        label: 'Apply for the Placement',
        description: 'You submit your application for the two-week ledger apprenticeship.',
        mainFactors: ['credibility', 'resources'],
        riskLevel: 'Low',
        potentialGain: '$250 income, Resources +1, commercial record',
        possibleRisk: 'Low if credibility is insufficient',
        publicRecordPossible: false,
      },
      {
        id: 'negotiate-extension',
        label: 'Negotiate a Longer Engagement',
        description: 'You ask about extending the placement into a longer arrangement.',
        mainFactors: ['charisma', 'resources'],
        riskLevel: 'Medium',
        potentialGain: '$400 income, ongoing commercial contact',
        possibleRisk: 'Seen as overreaching for a newcomer',
        publicRecordPossible: false,
      },
      {
        id: 'observe-process',
        label: 'Observe the Process',
        description: 'You shadow the ledger team for a day to understand the system before committing.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        potentialGain: 'Credibility +1, commercial intelligence',
        possibleRisk: 'No income',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Commercial income and trade familiarity. A quiet but solid foundation in Westport\'s commercial world.',
    recordTemplates: {
      success: 'Secured the Port Ledger Apprenticeship. Dara Osse noted the work ethic. Income recorded.',
      mixed:   'Completed a partial day at the Port Ledger Apprenticeship. Modest commercial familiarity gained.',
      failure: 'Did not secure the Port Ledger Apprenticeship placement.',
    },
    stateWeight: 'work',
    tags: ['resources', 'work', 'income', 'westport', 'commercial'],
  },

  // ── 10. Drennport Exchange Reading Room ───────────────────────────────────
  {
    id: 'drennport-exchange-reading-room',
    title: 'Drennport Exchange Reading Room',
    type: 'business_circle',
    state: 'Drennport State',
    visibility: 'public',
    durationLabel: 'Open session — afternoons',
    timeRemainingLabel: 'Open now',
    story: 'The Drennport Exchange operates a public reading room where market reports, trade circulars, and financial notices are available. A Market Clerk assists visitors. This is a low-barrier entry point into financial and commercial literacy.',
    npcPresence: [
      { name: 'Calen Mir', role: 'Market Clerk', institution: 'Drennport Exchange' },
    ],
    simulatedPlayers: sim(4, 6),
    roles: [
      {
        id: 'study-reports',
        label: 'Study the Market Reports',
        description: 'You spend time reading trade circulars and financial notices.',
        mainFactors: ['credibility', 'resources'],
        riskLevel: 'Low',
        potentialGain: 'Credibility +1, commercial literacy',
        possibleRisk: 'Very modest benefit',
        publicRecordPossible: false,
      },
      {
        id: 'ask-clerk',
        label: 'Ask the Clerk Questions',
        description: 'You engage Calen Mir in conversation about specific market trends.',
        mainFactors: ['charisma', 'resources'],
        riskLevel: 'Low',
        potentialGain: 'Resources +1, exchange contact seed',
        possibleRisk: 'None',
        publicRecordPossible: false,
      },
      {
        id: 'volunteer-index',
        label: 'Volunteer to Help Index',
        description: 'You offer to help organise reports in exchange for deeper access.',
        mainFactors: ['influence', 'credibility'],
        riskLevel: 'Low',
        potentialGain: 'Influence +1, Credibility +1, exchange familiarity',
        possibleRisk: 'Time spent for modest reward',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Commercial and financial literacy. A quiet first step into Drennport\'s business and trade world.',
    recordTemplates: {
      success: 'Studied at the Drennport Exchange Reading Room. Market awareness expanded. Calen Mir noted the visit.',
      mixed:   'Visited the Drennport Exchange Reading Room. Basic commercial awareness gained.',
      failure: 'Visited the Drennport Exchange Reading Room but did not make productive use of the session.',
    },
    stateWeight: 'business',
    tags: ['resources', 'credibility', 'drennport', 'business', 'learning'],
  },
];

// ─── State meta ───────────────────────────────────────────────────────────────

export interface StateInfo {
  id: DrenniaState;
  shortName: string;
  identity: string;
  powerMood: string;
  npcPresence: string;
  activityDots: ('gold' | 'green' | 'blue' | 'amber')[];
  gradientFrom: string;
  gradientTo: string;
}

export const DRENNIA_STATES: StateInfo[] = [
  {
    id: 'Drennport State',
    shortName: 'Drennport',
    identity: 'Capital politics, royal institutions, bureaucracy, universities, finance, and national media.',
    powerMood: 'Civic politics active',
    npcPresence: 'Civic Order organizer · Teacher Mentor present',
    activityDots: ['gold', 'amber', 'blue'],
    gradientFrom: 'rgba(63,98,135,0.22)',
    gradientTo: 'rgba(10,18,26,0.0)',
  },
  {
    id: 'Ironvale State',
    shortName: 'Ironvale',
    identity: 'Factories, unions, industrial towns, manufacturing, and labour politics.',
    powerMood: 'Workers organising',
    npcPresence: 'Union organizer present',
    activityDots: ['blue', 'amber'],
    gradientFrom: 'rgba(100,65,35,0.22)',
    gradientTo: 'rgba(10,18,14,0.0)',
  },
  {
    id: 'Greenmere State',
    shortName: 'Greenmere',
    identity: 'Rural communities, farms, local councils, religious communities, and family networks.',
    powerMood: 'Community reputation matters',
    npcPresence: 'Community elder present',
    activityDots: ['amber', 'green'],
    gradientFrom: 'rgba(45,90,55,0.22)',
    gradientTo: 'rgba(10,18,14,0.0)',
  },
  {
    id: 'Westport State',
    shortName: 'Westport',
    identity: 'Ports, trade, companies, stock market, finance, exporters, and business patrons.',
    powerMood: 'Business circles active',
    npcPresence: 'Business patron present',
    activityDots: ['green', 'gold'],
    gradientFrom: 'rgba(40,75,90,0.22)',
    gradientTo: 'rgba(10,18,22,0.0)',
  },
];

export function getRoomsForState(state: DrenniaState): PowerRoom[] {
  return DRENNIA_POWER_ROOMS.filter(r => r.state === state);
}

export function getRoomById(id: string): PowerRoom | undefined {
  return DRENNIA_POWER_ROOMS.find(r => r.id === id);
}
