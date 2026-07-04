import type { PowerRoom, RoomRole, ResultType, FactorKey } from '../data/livingWorld/drenniaPowerRooms';

export interface CitizenFactors {
  Credibility: number;
  Charisma: number;
  Influence: number;
  Resources: number;
}

export interface ResolutionInput {
  room: PowerRoom;
  role: RoomRole;
  citizenFile: {
    homeState?: string;
    firstNpcContactType?: string;
    firstNpcContactName?: string;
    factors: CitizenFactors;
    personalMoney?: number;
    money?: number;
  };
}

export interface ResolutionResult {
  resultType: ResultType;
  score: number;
  narrativeTitle: string;
  narrative: string;
  factorChanges: Partial<CitizenFactors>;
  moneyChange: number;
  newObligation: string | null;
  newVulnerability: string | null;
  publicRecord: boolean;
  recordSummary: string;
  npcReaction: string | null;
  nextSuggestion: string;
}

const FACTOR_MAP: Record<FactorKey, keyof CitizenFactors> = {
  credibility: 'Credibility',
  charisma:    'Charisma',
  influence:   'Influence',
  resources:   'Resources',
};

export function resolveRoom(input: ResolutionInput): ResolutionResult {
  const { room, role, citizenFile } = input;
  const factors = citizenFile.factors;

  // 1. Base score from citizen's relevant factors (avg of role's mainFactors)
  const factorValues = role.mainFactors.map(f => factors[FACTOR_MAP[f]] || 0);
  const avgFactor = factorValues.length > 0
    ? factorValues.reduce((a, b) => a + b, 0) / factorValues.length
    : 0;

  let score = avgFactor;

  // 2. Home state familiarity bonus
  if (citizenFile.homeState && citizenFile.homeState === room.state) {
    score += 2;
  }

  // 3. First contact match bonus
  const npcIds = room.npcPresence.map(n => n.role.toLowerCase());
  const contactType = (citizenFile.firstNpcContactType || '').toLowerCase();
  const contactName = (citizenFile.firstNpcContactName || '').toLowerCase();
  const npcNames = room.npcPresence.map(n => n.name.toLowerCase());
  if (contactType && npcIds.some(n => n.includes(contactType.split(' ')[0]))) score += 2;
  else if (contactName && npcNames.some(n => n.includes(contactName.split(' ')[0]))) score += 2;

  // 4. Risk modifier
  if (role.riskLevel === 'Low')  score += 2;
  if (role.riskLevel === 'High') score -= 2;

  // 5. Clamp
  score = Math.max(0, score);

  // 6. Determine result (tuned for low-stat early game)
  let resultType: ResultType;
  if (score >= 6)      resultType = 'success';
  else if (score >= 3) resultType = 'mixed';
  else                 resultType = 'failure';

  // 7. Factor changes
  const factorChanges: Partial<CitizenFactors> = {};
  let moneyChange = 0;

  if (resultType === 'success') {
    role.mainFactors.forEach(f => {
      const key = FACTOR_MAP[f];
      factorChanges[key] = (factorChanges[key] || 0) + 1;
    });
    // Cap any single factor at +2 for success
    for (const k in factorChanges) {
      factorChanges[k as keyof CitizenFactors] = Math.min(2, factorChanges[k as keyof CitizenFactors] || 0);
    }
    // Money for work/business rooms
    if (room.type === 'work_contract') {
      moneyChange = role.id.includes('negotiate') ? 300 : role.id.includes('safe') ? 80 : 150;
    }
    if (room.type === 'business_circle' && (role.id === 'pitch-yourself' || role.id === 'compete-sponsor')) {
      moneyChange = role.id === 'compete-sponsor' ? 200 : 150;
    }
  } else if (resultType === 'mixed') {
    // Only one factor, whichever is primary
    if (role.mainFactors.length > 0) {
      const primary = FACTOR_MAP[role.mainFactors[0]];
      factorChanges[primary] = 1;
    }
    if (room.type === 'work_contract') moneyChange = role.id.includes('safe') ? 80 : 80;
  }
  // failure: no changes

  // 8. Obligations / vulnerabilities
  let newObligation: string | null = null;
  let newVulnerability: string | null = null;
  if (resultType === 'success' || resultType === 'mixed') {
    if (room.type === 'business_circle' && (role.id === 'pitch-yourself' || role.id === 'compete-sponsor')) {
      newObligation = 'Business expectation from Elric Voss';
    }
    if (room.type === 'political_observation' && role.id === 'introduce-privately') {
      newObligation = 'Political favour owed to Jonas Kest';
    }
  }
  if (resultType === 'failure' && role.riskLevel === 'High') {
    newVulnerability = `Failed attempt at ${role.label} in ${room.title}`;
  }

  // 9. Record visibility
  const publicRecord = role.publicRecordPossible && (resultType === 'success' || resultType === 'mixed');

  // 10. Narrative
  const titles: Record<ResultType, string[]> = {
    success: ['The Room Noticed You', 'A Step Forward', 'Work Secured', 'A Useful Introduction', 'Public Moment Recorded'],
    mixed:   ['A Quiet Step Forward', 'Partial Progress', 'Noted — But Cautiously', 'Work Done, If Modest'],
    failure: ['You Misread the Room', 'A Hard Lesson', 'The Room Moved Without You'],
  };
  const titleList = titles[resultType];
  const narrativeTitle = titleList[Math.floor(Math.random() * titleList.length)];

  const recordSummary = room.recordTemplates[resultType];
  const npcDisplayNames = room.npcPresence.map(n => n.name);
  const npcReaction = resultType === 'success' && npcDisplayNames.length > 0
    ? `${npcDisplayNames[0]} took note of the performance.`
    : resultType === 'mixed' && npcDisplayNames.length > 0
    ? `${npcDisplayNames[0]} acknowledged the attempt, briefly.`
    : null;

  const narrativeMap: Record<ResultType, string> = {
    success: `You chose to ${role.label.toLowerCase()} at ${room.title}. The room responded. Your factors shifted, a record was created, and the experience left a day on your file.`,
    mixed:   `You chose to ${role.label.toLowerCase()} at ${room.title}. The result was uneven — some gain, some friction. The experience was noted, if not entirely celebrated.`,
    failure: `You chose to ${role.label.toLowerCase()} at ${room.title}. The room did not respond as expected. No major punishment — but the opportunity has passed for now.`,
  };

  const suggestions: Record<string, string> = {
    'Drennport State': 'Consider the Civic Order Meeting or the Drennport Exchange Reading Room next.',
    'Ironvale State':  'The Workers\' Renewal Forum or Factory Shift Interview may suit your next move.',
    'Greenmere State': 'The Rural Service Drive or Water Dispute mediation could build your standing.',
    'Westport State':  'The Port Ledger Apprenticeship or Westport Business Circle are nearby opportunities.',
  };

  return {
    resultType,
    score,
    narrativeTitle,
    narrative: narrativeMap[resultType],
    factorChanges,
    moneyChange,
    newObligation,
    newVulnerability,
    publicRecord,
    recordSummary,
    npcReaction,
    nextSuggestion: suggestions[room.state] || 'Return to the map and choose your next room.',
  };
}
