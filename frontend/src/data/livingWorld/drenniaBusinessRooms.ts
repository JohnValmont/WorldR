// ─── Business Room Types for WORLDr Chronicle (Business-First Path) ─────────
// This replaces the old politics-first drenniaPowerRooms for active gameplay.

export type BusinessRoomType =
  | 'trade_morning'
  | 'ledger_shift'
  | 'business_circle'
  | 'market_day'
  | 'supplier_dispute'
  | 'finance_reception';

export type DrenniaState =
  | 'Drennport State'
  | 'Ironvale State'
  | 'Greenmere State'
  | 'Westport State';

export type FactorKey = 'credibility' | 'charisma' | 'influence';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ResultType = 'success' | 'mixed' | 'failure';

export interface BusinessRole {
  id: string;
  label: string;
  description: string;
  mainFactors: FactorKey[];
  riskLevel: RiskLevel;
  cashGainRange: [number, number]; // [min, max] in Drennian Days
  potentialGain: string;
  possibleRisk: string;
  publicRecordPossible: boolean;
  limitedSlots?: number;
}

export interface BusinessNpcPresence {
  name: string;
  role: string;
  institution?: string;
}

export interface SimulatedParticipant {
  name: string;
  status: string;
  roleHint: string;
}

export interface BusinessRoom {
  id: string;
  title: string;
  type: BusinessRoomType;
  state: DrenniaState;
  visibility: 'public' | 'private';
  durationLabel: string;
  timeRemainingLabel: string;
  atmosphere: string;       // setting/scene description
  story: string;            // what's happening here
  npcPresence: BusinessNpcPresence[];
  simulatedParticipants: SimulatedParticipant[];
  roles: BusinessRole[];
  stakes: string;
  recordTemplates: { success: string; mixed: string; failure: string };
  tags: string[];
  mapPinX: number;
  mapPinY: number;
}

// ─── Simulated Participants Pool ──────────────────────────────────────────────

const BUSI_SIM: SimulatedParticipant[] = [
  { name: 'Olen Var',    status: 'Young merchant',    roleHint: 'Observer' },
  { name: 'Maise Runn',  status: 'Counting clerk',    roleHint: 'Working' },
  { name: 'Sted Holt',   status: 'Dockhand',          roleHint: 'Applicant' },
  { name: 'Carra Nesse', status: 'Market stall owner',roleHint: 'Supplier' },
  { name: 'Borvan Eel',  status: 'Trainee accountant',roleHint: 'Applicant' },
  { name: 'Lysa Marr',   status: 'Junior trader',     roleHint: 'Observer' },
  { name: 'Duven Cray',  status: 'Factory worker',    roleHint: 'Delegate' },
  { name: 'Rela Oss',    status: 'Farm co-op member', roleHint: 'Attendee' },
];

function sim(...i: number[]): SimulatedParticipant[] {
  return i.map(n => BUSI_SIM[n]).filter(Boolean);
}

// ─── Business Rooms ───────────────────────────────────────────────────────────

export const DRENNIA_BUSINESS_ROOMS: BusinessRoom[] = [

  // ── A. Saltgate Trade Morning ─────────────────────────────────────────────
  {
    id: 'saltgate-trade-morning',
    title: 'Saltgate Trade Morning',
    type: 'trade_morning',
    state: 'Westport State',
    visibility: 'public',
    durationLabel: 'Morning session — 2 hrs',
    timeRemainingLabel: '40 min remaining',
    atmosphere: 'The Saltgate docks at first light. Salt air, rope, timber, and the sound of coin being counted. Merchants, clerks, and young aspirants mill between the counting houses and moored vessels.',
    story: 'Fen Arras Jr. opens the Saltgate Counting House doors at six. He handles ledger work, introductions, and short freight contracts before the midday tide. It is the first real commercial room a young Westport arrival can enter without a letter of introduction.',
    npcPresence: [
      { name: 'Fen Arras Jr.', role: 'Counting House Operator', institution: 'Saltgate Counting House, Westport Docks' },
    ],
    simulatedParticipants: sim(0, 1, 2, 5),
    roles: [
      {
        id: 'introduce-yourself',
        label: 'Introduce Yourself',
        description: 'You approach Fen Arras Jr. directly and present yourself as available for work or association.',
        mainFactors: ['charisma', 'influence'],
        riskLevel: 'Low',
        cashGainRange: [0, 0],
        potentialGain: 'Contact seed with Fen Arras Jr., small influence',
        possibleRisk: 'He may not remember you if your factors are low',
        publicRecordPossible: false,
      },
      {
        id: 'take-ledger-work',
        label: 'Take Ledger Work',
        description: 'You offer to assist with morning records, tally work, or cargo documentation.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        cashGainRange: [80, 160],
        potentialGain: '₯80–₯160 cash, reliability record',
        possibleRisk: 'None if you stay in scope',
        publicRecordPossible: false,
      },
      {
        id: 'pitch-small-service',
        label: 'Pitch a Small Service',
        description: 'You propose something specific — a delivery route, a reconciliation service, a small arbitrage.',
        mainFactors: ['charisma', 'credibility'],
        riskLevel: 'Medium',
        cashGainRange: [100, 250],
        potentialGain: '₯100–₯250 if accepted, business record created',
        possibleRisk: 'Public business embarrassment if poorly prepared',
        publicRecordPossible: true,
        limitedSlots: 2,
      },
      {
        id: 'observe-merchants',
        label: 'Observe the Merchants',
        description: 'You stay in the background, watch how deals are made, and take mental notes.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        cashGainRange: [0, 0],
        potentialGain: 'Private knowledge record, no cash, no exposure',
        possibleRisk: 'Minimal reward',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Your first real commercial room. A strong showing here builds a business record and a contact with Fen Arras Jr. — the gateway to Westport\'s trading floor.',
    recordTemplates: {
      success: 'Attended Saltgate Trade Morning and distinguished themselves. Fen Arras Jr. noted the name and asked them to return.',
      mixed:   'Attended Saltgate Trade Morning. Made a modest impression — nothing lost, little gained.',
      failure: 'Attended Saltgate Trade Morning but did not make productive use of the morning.',
    },
    tags: ['business', 'westport', 'trade', 'debut', 'cash'],
    mapPinX: 185,
    mapPinY: 320,
  },

  // ── B. Port Ledger Shift ──────────────────────────────────────────────────
  {
    id: 'port-ledger-shift',
    title: 'Port Ledger Shift',
    type: 'ledger_shift',
    state: 'Westport State',
    visibility: 'private',
    durationLabel: 'Half-day contract',
    timeRemainingLabel: '3 shifts remaining',
    atmosphere: 'The counting room of Saltgate Counting House — rows of desks, ink, tallies, and the smell of damp paper. The shift supervisor moves between desks in silence.',
    story: 'The Saltgate Counting House needs temporary clerks for cargo reconciliation during the season surge. The work is honest, the pay is modest, and the supervisor writes references for those who show up on time and make no errors.',
    npcPresence: [
      { name: 'Saltgate Counting House Clerk', role: 'Shift Supervisor', institution: 'Saltgate Counting House' },
    ],
    simulatedParticipants: sim(1, 4),
    roles: [
      {
        id: 'apply-shift',
        label: 'Apply for the Shift',
        description: 'You register for the half-day reconciliation work.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        cashGainRange: [100, 160],
        potentialGain: '₯100–₯160, reliability record, possible reference',
        possibleRisk: 'Not selected if credibility is very low',
        publicRecordPossible: false,
      },
      {
        id: 'work-carefully',
        label: 'Work Without Errors',
        description: 'You take the shift and focus on accuracy over speed.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        cashGainRange: [120, 160],
        potentialGain: '₯120–₯160, strong reliability record',
        possibleRisk: 'None if credibility is solid',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Small but reliable cash and a work record. A foundation brick for the Business path.',
    recordTemplates: {
      success: 'Completed a Port Ledger Shift at Saltgate Counting House. Payment received. Supervisor noted the work quality.',
      mixed:   'Completed a Port Ledger Shift at Saltgate Counting House. Work was adequate. Payment received.',
      failure: 'Attempted a Port Ledger Shift but was not selected for the position.',
    },
    tags: ['work', 'cash', 'westport', 'ledger', 'reliability'],
    mapPinX: 155,
    mapPinY: 380,
  },

  // ── C. Westport Business Circle ───────────────────────────────────────────
  {
    id: 'westport-business-circle',
    title: 'Westport Business Circle',
    type: 'business_circle',
    state: 'Westport State',
    visibility: 'private',
    durationLabel: 'Evening event — 3 hrs',
    timeRemainingLabel: 'Open · 1 junior slot',
    atmosphere: 'A private dining room at the Westport Harbour Exchange. Dark wood, candlelight, and the quiet sound of money being discussed politely.',
    story: 'Tira Vance hosts monthly circles for emerging commercial figures. One junior observer slot remains — open to anyone with a promising start and a credible reason to be in the room. The circle is where Westport business introductions become long-term associations.',
    npcPresence: [
      { name: 'Tira Vance', role: 'Free Commerce Alliance — Observer Host', institution: 'Westport Harbour Exchange' },
    ],
    simulatedParticipants: sim(0, 5),
    roles: [
      {
        id: 'pitch-yourself',
        label: 'Pitch Yourself',
        description: 'You present your background and commercial intent directly to the room.',
        mainFactors: ['charisma', 'influence'],
        riskLevel: 'Medium',
        cashGainRange: [0, 150],
        potentialGain: 'Business contact, possible ₯0–₯150 lead, influence',
        possibleRisk: 'Visible rejection if charisma and influence are low',
        publicRecordPossible: false,
        limitedSlots: 1,
      },
      {
        id: 'support-applicant',
        label: 'Support Another Applicant',
        description: 'You publicly back another participant\'s pitch and build goodwill.',
        mainFactors: ['influence'],
        riskLevel: 'Low',
        cashGainRange: [0, 0],
        potentialGain: 'Relationship seed, influence',
        possibleRisk: 'None',
        publicRecordPossible: false,
      },
      {
        id: 'ask-registration',
        label: 'Ask About Company Registration',
        description: 'You use the evening to quietly learn how business registration works in Drennia.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        cashGainRange: [0, 0],
        potentialGain: 'Registration clue unlocked — learn the requirements',
        possibleRisk: 'None',
        publicRecordPossible: false,
      },
      {
        id: 'overpromise',
        label: 'Overpromise Publicly',
        description: 'You claim capabilities or connections you do not yet have.',
        mainFactors: ['charisma'],
        riskLevel: 'High',
        cashGainRange: [0, 200],
        potentialGain: 'High attention and contact if it works',
        possibleRisk: 'Failure record, room moves on without you',
        publicRecordPossible: true,
        limitedSlots: 1,
      },
    ],
    stakes: 'Access, influence, and the first clue toward company registration. This is where unknown citizens become known names in Westport commerce.',
    recordTemplates: {
      success: 'Attended the Westport Business Circle. Tira Vance noted the introduction. A commercial association was opened.',
      mixed:   'Attended the Westport Business Circle. Modest commercial connections made.',
      failure: 'Attended the Westport Business Circle but did not secure a meaningful position in the room.',
    },
    tags: ['business', 'westport', 'circle', 'influence', 'registration'],
    mapPinX: 225,
    mapPinY: 420,
  },

  // ── D. Greenmere Market Day ───────────────────────────────────────────────
  {
    id: 'greenmere-market-day',
    title: 'Greenmere Market Day',
    type: 'market_day',
    state: 'Greenmere State',
    visibility: 'public',
    durationLabel: 'Full morning',
    timeRemainingLabel: 'Open now',
    atmosphere: 'The Greenmere parish square on market morning. Carts, produce, animals, and local merchants. Ysella Murn runs the co-op table at the east side of the square.',
    story: 'Market Day in Greenmere is where agricultural commerce, local reputation, and community trust intersect. Ysella Murn manages the Agricultural Co-op booth and watches carefully who shows up, who buys, and who tries to bargain.',
    npcPresence: [
      { name: 'Ysella Murn', role: 'Agricultural Co-op Director', institution: 'Greenmere Agricultural Co-op' },
    ],
    simulatedParticipants: sim(3, 7),
    roles: [
      {
        id: 'buy-and-resell',
        label: 'Buy and Resell',
        description: 'You purchase goods at co-op prices and find buyers at a small margin.',
        mainFactors: ['credibility', 'charisma'],
        riskLevel: 'Medium',
        cashGainRange: [60, 140],
        potentialGain: '₯60–₯140 margin, local business record',
        possibleRisk: 'Small loss if you misjudge demand',
        publicRecordPossible: true,
      },
      {
        id: 'help-co-op',
        label: 'Help at the Co-op Table',
        description: 'You volunteer to assist Ysella Murn with stock, payments, and customer queries.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        cashGainRange: [40, 80],
        potentialGain: '₯40–₯80 modest pay, credibility, Ysella relationship seed',
        possibleRisk: 'None',
        publicRecordPossible: false,
      },
      {
        id: 'introduce-community',
        label: 'Introduce Yourself to the Community',
        description: 'You walk the market, speak to stall owners and buyers, and let yourself be known.',
        mainFactors: ['charisma', 'influence'],
        riskLevel: 'Low',
        cashGainRange: [0, 0],
        potentialGain: 'Community trust, influence',
        possibleRisk: 'None',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Local commerce and agricultural trust. A step into Greenmere\'s community economy.',
    recordTemplates: {
      success: 'Participated in Greenmere Market Day. Ysella Murn took note. A small commerce record was created.',
      mixed:   'Attended Greenmere Market Day. Modest community contact made.',
      failure: 'Attended Greenmere Market Day but did not establish a productive commercial presence.',
    },
    tags: ['business', 'greenmere', 'market', 'agriculture', 'community'],
    mapPinX: 490,
    mapPinY: 480,
  },

  // ── E. Ironvale Supplier Dispute ──────────────────────────────────────────
  {
    id: 'ironvale-supplier-dispute',
    title: 'Ironvale Supplier Dispute',
    type: 'supplier_dispute',
    state: 'Ironvale State',
    visibility: 'public',
    durationLabel: 'Active dispute — 2 hrs',
    timeRemainingLabel: 'Dispute ongoing',
    atmosphere: 'A cramped meeting room inside Ironvale Industrial Plant. Director Kovath sits on one side with his ledger. Sera Duvall on the other, representing factory workers affected by the supply delay.',
    story: 'A supplier dispute between the factory management and the workers\' delegation has reached a standoff over delivery delays and contested payment terms. Both sides are looking for someone credible enough to carry a message — or to find a deal.',
    npcPresence: [
      { name: 'Director Kovath',  role: 'Factory Owner', institution: 'Ironvale Industrial Plant' },
      { name: 'Sera Duvall',      role: 'Workers Organiser', institution: 'Ironvale Workers Delegation' },
    ],
    simulatedParticipants: sim(2, 6),
    roles: [
      {
        id: 'mediate',
        label: 'Offer to Mediate',
        description: 'You position yourself as a neutral party and attempt to find middle ground.',
        mainFactors: ['credibility', 'charisma'],
        riskLevel: 'High',
        cashGainRange: [0, 0],
        potentialGain: 'Credibility +2, Influence +1, strong public record if it works',
        possibleRisk: 'Failure creates a credibility risk in both circles',
        publicRecordPossible: true,
        limitedSlots: 1,
      },
      {
        id: 'side-factory',
        label: 'Support Director Kovath',
        description: 'You align with management and help draft revised supply terms.',
        mainFactors: ['credibility'],
        riskLevel: 'Medium',
        cashGainRange: [80, 150],
        potentialGain: '₯80–₯150, business contact with Kovath, worker suspicion risk',
        possibleRisk: 'Workers may remember you chose the other side',
        publicRecordPossible: true,
      },
      {
        id: 'side-workers',
        label: 'Support Sera Duvall',
        description: 'You assist the workers\' delegation in presenting their case.',
        mainFactors: ['charisma', 'influence'],
        riskLevel: 'Medium',
        cashGainRange: [0, 0],
        potentialGain: 'Labour trust, influence, community credibility',
        possibleRisk: 'Management may see you as difficult later',
        publicRecordPossible: true,
      },
      {
        id: 'observe-dispute',
        label: 'Observe Quietly',
        description: 'You sit in as a silent observer and learn how industrial disputes work.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        cashGainRange: [0, 0],
        potentialGain: 'Private knowledge record, no exposure',
        possibleRisk: 'None',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Business-labour tension. A contested decision with consequences on both sides. Your involvement shapes how both Kovath and Duvall see you later.',
    recordTemplates: {
      success: 'Played a constructive role in the Ironvale Supplier Dispute. Both sides noted the contribution.',
      mixed:   'Participated in the Ironvale Supplier Dispute. A partial role was recorded.',
      failure: 'Attended the Ironvale Supplier Dispute but did not make a meaningful contribution.',
    },
    tags: ['business', 'ironvale', 'dispute', 'labour', 'supplier'],
    mapPinX: 385,
    mapPinY: 185,
  },

  // ── F. Drennport Finance Reception ────────────────────────────────────────
  {
    id: 'drennport-finance-reception',
    title: 'Drennport Finance Reception',
    type: 'finance_reception',
    state: 'Drennport State',
    visibility: 'private',
    durationLabel: 'Evening reception',
    timeRemainingLabel: 'Invitations open',
    atmosphere: 'The lobby of a Drennport financial institution. Polished floors, muted conversation, and a room full of people who expect to be taken seriously.',
    story: 'A junior reception for aspiring commercial figures, hosted by the Drennport Finance Exchange. Cassiel Vourne from the Drennian Ledger is taking names. A junior banker from the Drennport Credit House is assessing who is worth a follow-up meeting.',
    npcPresence: [
      { name: 'Cassiel Vourne',      role: 'Journalist — Drennian Ledger', institution: 'Drennian Ledger' },
      { name: 'Junior Finance Clerk', role: 'Credit Assessment Clerk', institution: 'Drennport Credit House' },
    ],
    simulatedParticipants: sim(0, 4, 5),
    roles: [
      {
        id: 'introduce-finance',
        label: 'Introduce Yourself to the Banker',
        description: 'You approach the Credit House clerk and present your background.',
        mainFactors: ['credibility', 'charisma'],
        riskLevel: 'Medium',
        cashGainRange: [0, 0],
        potentialGain: 'Finance contact, credibility, possible future credit access',
        possibleRisk: 'Rejection if credibility and charisma are both low',
        publicRecordPossible: false,
        limitedSlots: 2,
      },
      {
        id: 'speak-vourne',
        label: 'Speak to Cassiel Vourne',
        description: 'You approach the journalist and introduce yourself. Journalists remember names.',
        mainFactors: ['charisma', 'influence'],
        riskLevel: 'Low',
        cashGainRange: [0, 0],
        potentialGain: 'Media contact, influence',
        possibleRisk: 'None immediately — but journalists publish',
        publicRecordPossible: false,
      },
      {
        id: 'attend-quietly',
        label: 'Attend and Observe',
        description: 'You stay near the edges, learn the room, and leave having watched the power structure.',
        mainFactors: ['credibility'],
        riskLevel: 'Low',
        cashGainRange: [0, 0],
        potentialGain: 'Private knowledge record, no exposure',
        possibleRisk: 'No connections made',
        publicRecordPossible: false,
      },
    ],
    stakes: 'Finance credibility and media exposure. A higher-stakes introduction to Drennport\'s commercial institutions.',
    recordTemplates: {
      success: 'Attended the Drennport Finance Reception. Made a credible impression on the Credit House clerk.',
      mixed:   'Attended the Drennport Finance Reception. A modest exchange of names occurred.',
      failure: 'Attended the Drennport Finance Reception but made no meaningful connections.',
    },
    tags: ['business', 'drennport', 'finance', 'credibility', 'influence'],
    mapPinX: 720,
    mapPinY: 280,
  },
];

// ─── State to Rooms index ─────────────────────────────────────────────────────

export function getBusinessRoomsForState(state: DrenniaState): BusinessRoom[] {
  return DRENNIA_BUSINESS_ROOMS.filter(r => r.state === state);
}

export function getBusinessRoomById(id: string): BusinessRoom | undefined {
  return DRENNIA_BUSINESS_ROOMS.find(r => r.id === id);
}
