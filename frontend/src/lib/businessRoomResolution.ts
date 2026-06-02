// ─── Business Room Resolution Engine — WORLDr Chronicle ──────────────────────
// Resolves business room outcomes using Credibility, Charisma, Influence.
// Resources is a hidden weighting factor only — NOT surfaced in active UI.

import type { BusinessRoom, BusinessRole, ResultType, FactorKey } from '../data/livingWorld/drenniaBusinessRooms';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CitizenFactors {
  Credibility: number;
  Charisma: number;
  Influence: number;
  Resources?: number; // hidden — kept for backward compat, not shown in UI
}

export interface BusinessResolutionInput {
  room: BusinessRoom;
  role: BusinessRole;
  citizenFile: {
    homeState?: string;
    firstNpcContactType?: string;
    firstNpcContactName?: string;
    factors: CitizenFactors;
    personalMoney?: number;
    money?: number;
  };
}

export interface BusinessResolutionResult {
  resultType: ResultType;
  score: number;
  narrativeTitle: string;
  narrative: string;           // Prose paragraph — no stat-log language
  factorChanges: Partial<CitizenFactors>;
  cashChange: number;          // In Drennian Marks ₯
  publicRecord: boolean;
  recordSummary: string;       // Prose sentence for Record Panel
  npcReaction: string | null;
  nextSuggestion: string;
  newObligation: string | null;
  newVulnerability: string | null;
}

// ─── Factor key mapping (visible only) ───────────────────────────────────────

const FACTOR_MAP: Record<FactorKey, keyof CitizenFactors> = {
  credibility: 'Credibility',
  charisma:    'Charisma',
  influence:   'Influence',
};

// ─── Prose narrative templates ────────────────────────────────────────────────

const NARRATIVES: Record<
  ResultType,
  Record<string, Record<string, string>>
> = {
  success: {
    'saltgate-trade-morning': {
      'introduce-yourself': 'You introduced yourself to Fen Arras Jr. at the Saltgate morning. He looked up from his ledger, assessed you in a few seconds, and gave a brief nod. Nothing is promised — but your name is now known inside that counting house.',
      'take-ledger-work': 'You completed the ledger work at Saltgate without errors. Fen Arras Jr. noticed. He handed you your payment without ceremony, but the small nod he gave as you left said more than the coins.',
      'pitch-small-service': 'Your pitch at Saltgate Trade Morning found a listener. Fen Arras Jr. listened with narrowed eyes and then said: "Come back Thursday with terms in writing." A first door was opened.',
      'observe-merchants': 'You spent the morning observing. Nobody noticed you — which was the point. You left with a clearer picture of how Westport commerce actually moves. No cash. No record. But understanding has its own value.',
      default: 'You made a productive start at Saltgate Trade Morning. The morning did not go unnoticed.',
    },
    'port-ledger-shift': {
      default: 'You completed the Port Ledger Shift without error. The supervisor handed over payment without comment — which, in this place, is as close to praise as you will receive.',
    },
    'westport-business-circle': {
      'pitch-yourself': 'You pitched yourself at the Westport Business Circle. Tira Vance listened. She did not respond immediately — but she wrote something down. In this room, that means something.',
      'ask-registration': 'You asked about company registration at the Business Circle. A quiet explanation followed — the requirements, the filing process, the expected capital. You left with a clearer path forward.',
      default: 'You made a useful impression at the Westport Business Circle.',
    },
    'greenmere-market-day': {
      default: 'You made a productive morning at Greenmere Market Day. Ysella Murn took note. Community commerce is not glamorous, but the people who do it reliably are remembered.',
    },
    'ironvale-supplier-dispute': {
      'mediate': 'You offered mediation and the room let you try. The dispute did not fully resolve, but your presence shifted the tone. Both sides left with less hostility than they arrived with. Both remembered you were there.',
      default: 'Your contribution at the Ironvale Supplier Dispute was noted by those present.',
    },
    'drennport-finance-reception': {
      default: 'You made a credible impression at the Drennport Finance Reception. The Credit House clerk took your name down. Cassiel Vourne watched from across the room and said nothing — which, with journalists, is often the better outcome.',
    },
  },
  mixed: {
    default: {
      default: 'The result was uneven. Something was gained — some contact made, some small progress — but the moment did not fully land. The morning, or the evening, is over. There may be another chance.',
    }
  },
  failure: {
    default: {
      default: 'The room did not respond as you had hoped. No lasting damage — but no progress either. These things happen. The question is what you do with the next available morning.',
    }
  },
};

function getNarrative(
  resultType: ResultType,
  roomId: string,
  roleId: string,
  roomTitle: string,
  roleName: string,
): string {
  const byRoom = NARRATIVES[resultType]?.[roomId] || NARRATIVES[resultType]?.['default'];
  if (byRoom) {
    const byRole = (byRoom as Record<string, string>)[roleId] || (byRoom as Record<string, string>)['default'];
    if (byRole) return byRole;
  }
  // Fallback generic prose
  const fallbacks: Record<ResultType, string> = {
    success: `You chose to ${roleName.toLowerCase()} at ${roomTitle}. The room responded well. A record was created, and the experience left a mark on your file.`,
    mixed:   `You chose to ${roleName.toLowerCase()} at ${roomTitle}. The result was uneven — some gain, some friction. The experience was noted, if not entirely celebrated.`,
    failure: `You chose to ${roleName.toLowerCase()} at ${roomTitle}. The room did not respond as expected. The opportunity has passed for now.`,
  };
  return fallbacks[resultType];
}

// ─── Record summary templates ─────────────────────────────────────────────────

function buildRecordSummary(
  resultType: ResultType,
  room: BusinessRoom,
  role: BusinessRole,
  cashChange: number,
): string {
  const base = room.recordTemplates[resultType];
  if (cashChange > 0) {
    return `${base} Payment received: ₯${cashChange.toLocaleString()}.`;
  }
  return base;
}

// ─── Main resolver ────────────────────────────────────────────────────────────

export function resolveBusinessRoom(input: BusinessResolutionInput): BusinessResolutionResult {
  const { room, role, citizenFile } = input;
  const factors = citizenFile.factors;

  // 1. Base score from visible factors
  const factorValues = role.mainFactors.map(f => factors[FACTOR_MAP[f]] || 0);
  const avgFactor = factorValues.length > 0
    ? factorValues.reduce((a, b) => a + b, 0) / factorValues.length
    : 0;
  let score = avgFactor;

  // 2. Home state familiarity bonus
  if (citizenFile.homeState && citizenFile.homeState === room.state) {
    score += 1.5;
  }

  // 3. First contact match
  const contactName = (citizenFile.firstNpcContactName || '').toLowerCase();
  const npcNames = room.npcPresence.map(n => n.name.toLowerCase());
  if (contactName && npcNames.some(n => n.includes(contactName.split(' ')[0]))) {
    score += 2;
  }

  // 4. Risk modifier
  if (role.riskLevel === 'Low')  score += 1.5;
  if (role.riskLevel === 'High') score -= 2;

  score = Math.max(0, score);

  // 5. Determine result
  let resultType: ResultType;
  if (score >= 5)      resultType = 'success';
  else if (score >= 2) resultType = 'mixed';
  else                 resultType = 'failure';

  // 6. Factor changes — small, prose-first
  const factorChanges: Partial<CitizenFactors> = {};
  let cashChange = 0;

  if (resultType === 'success') {
    role.mainFactors.forEach(f => {
      const key = FACTOR_MAP[f];
      factorChanges[key] = Math.min(2, (factorChanges[key] || 0) + 1);
    });
    // Cash within range
    const [minC, maxC] = role.cashGainRange;
    if (maxC > 0) {
      cashChange = Math.round(minC + Math.random() * (maxC - minC));
    }
  } else if (resultType === 'mixed') {
    if (role.mainFactors.length > 0) {
      const primary = FACTOR_MAP[role.mainFactors[0]];
      factorChanges[primary] = 1;
    }
    const [minC, maxC] = role.cashGainRange;
    if (maxC > 0) {
      cashChange = Math.round(minC + Math.random() * (maxC - minC) * 0.4);
    }
  }
  // failure: no changes

  // 7. Obligations / vulnerabilities
  let newObligation: string | null = null;
  let newVulnerability: string | null = null;

  if ((resultType === 'success' || resultType === 'mixed') && role.id === 'pitch-yourself' && room.id === 'westport-business-circle') {
    newObligation = 'Commercial expectation noted by Tira Vance';
  }
  if (resultType === 'failure' && role.riskLevel === 'High') {
    newVulnerability = `Failed ${role.label} at ${room.title} — on record`;
  }

  // 8. Public record
  const publicRecord = role.publicRecordPossible && (resultType === 'success' || resultType === 'mixed');

  // 9. Prose narrative
  const titleOptions: Record<ResultType, string[]> = {
    success: ['A Step Forward', 'The Room Noticed', 'Work Secured', 'A Name Registered', 'A Useful Morning'],
    mixed:   ['A Modest Step', 'Partial Progress', 'Noted — Cautiously', 'Something Gained'],
    failure: ['The Room Moved On', 'A Hard Lesson', 'The Morning Passed'],
  };
  const titleList = titleOptions[resultType];
  const narrativeTitle = titleList[Math.floor(Math.random() * titleList.length)];
  const narrative = getNarrative(resultType, room.id, role.id, room.title, role.label);

  // 10. NPC reaction
  const npcName = room.npcPresence[0]?.name || null;
  const npcReaction = resultType === 'success' && npcName
    ? `${npcName} took note of your presence. The name is now in the room.`
    : resultType === 'mixed' && npcName
    ? `${npcName} acknowledged the attempt, briefly.`
    : null;

  // 11. Record summary
  const recordSummary = buildRecordSummary(resultType, room, role, cashChange);

  // 12. Next suggestion
  const suggestions: Record<string, string> = {
    'Westport State':  'The Port Ledger Shift or Westport Business Circle are your next natural stops.',
    'Drennport State': 'Consider the Drennport Finance Reception or a business introduction in the capital.',
    'Ironvale State':  'The Ironvale Supplier Dispute or Factory work can build your standing here.',
    'Greenmere State': 'Greenmere Market Day and the agricultural co-op are open to you.',
  };

  return {
    resultType,
    score,
    narrativeTitle,
    narrative,
    factorChanges,
    cashChange,
    publicRecord,
    recordSummary,
    npcReaction,
    nextSuggestion: suggestions[room.state] || 'Return to the map and choose your next room.',
    newObligation,
    newVulnerability,
  };
}
