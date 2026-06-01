import { Opportunity, DRENNIA_OPPORTUNITIES } from '../data/livingWorld/drenniaOpportunities';
export type { Opportunity } from '../data/livingWorld/drenniaOpportunities';

export interface CitizenFile {
  id?: string;
  name: string;
  age: number;
  motherland: string;
  homeState: string;
  householdBackground?: string;
  pre18Reputation?: string;
  firstSupporter?: string;
  earlyBurden?: string;
  personalMoney?: number;
  factors: {
    credibility: number;
    charisma: number;
    influence: number;
    resources: number;
  };
  obligations?: Array<{source: string, label: string, createdAt: string}>;
  vulnerabilities?: Array<{source: string, label: string, createdAt: string}>;
  story?: {
    firstNpcContact?: string;
    firstObligation?: string;
    firstVulnerability?: string;
  };
}

export function generateAvailableOpportunities(citizenFile: CitizenFile): Opportunity[] {
  const pool = [...DRENNIA_OPPORTUNITIES];
  const selected: Opportunity[] = [];

  // Rules:
  // 1. Always include at least: 1 Survival, 1 Reputation, 1 Network, 1 Politics or Business
  
  const getByType = (type: string) => pool.filter(o => o.type === type);
  const getByState = (opps: Opportunity[], state: string) => opps.filter(o => o.state === state || o.state === 'Any State');

  // We weight selections. For v1, deterministic pseudo-random or simple matching is used.
  // Helper to score an opportunity against the citizen file
  const scoreOpportunity = (opp: Opportunity) => {
    let score = 0;
    
    // State match
    if (opp.state === citizenFile.homeState) score += 5;
    if (opp.state === 'Any State') score += 2;

    // Origin match
    if (opp.originWeights) {
      if (opp.originWeights.homeStates?.includes(citizenFile.homeState)) score += 3;
      if (citizenFile.householdBackground && opp.originWeights.householdBackgrounds?.includes(citizenFile.householdBackground)) score += 3;
      if (citizenFile.pre18Reputation && opp.originWeights.pre18Reputations?.includes(citizenFile.pre18Reputation)) score += 3;
      if (citizenFile.firstSupporter && opp.originWeights.firstSupporters?.includes(citizenFile.firstSupporter)) score += 3;
      if (citizenFile.earlyBurden && opp.originWeights.earlyBurdens?.includes(citizenFile.earlyBurden)) score += 3;
    }

    return score + Math.random() * 2; // slight randomness to mix it up
  };

  const pickBest = (opps: Opportunity[], count: number) => {
    if (opps.length === 0) return [];
    return opps.sort((a, b) => scoreOpportunity(b) - scoreOpportunity(a)).slice(0, count);
  };

  const survivalOpps = pickBest(getByType('survival'), 1);
  const repOpps = pickBest(getByType('reputation'), 1);
  const netOpps = pickBest(getByType('network'), 1);
  
  // Politics or Business depending on origin
  let polBusCount = 1;
  const isBusinessFocused = citizenFile.householdBackground === 'Business Household' || citizenFile.homeState === 'Westport State';
  const isPoliticsFocused = citizenFile.householdBackground === 'Political Household' || citizenFile.homeState === 'Drennport State' || citizenFile.homeState === 'Ironvale State';
  
  let polBusOpps: Opportunity[] = [];
  if (isBusinessFocused && !isPoliticsFocused) {
    polBusOpps = pickBest(getByType('business'), 1);
  } else if (isPoliticsFocused && !isBusinessFocused) {
    polBusOpps = pickBest(getByType('politics'), 1);
  } else {
    // Both or neither, pick 1 politics and 1 business
    polBusOpps = [...pickBest(getByType('politics'), 1), ...pickBest(getByType('business'), 1)];
  }

  // Push guaranteed types
  [...survivalOpps, ...repOpps, ...netOpps, ...polBusOpps].forEach(opp => {
    if (!selected.find(s => s.id === opp.id)) {
      selected.push(opp);
    }
  });

  // Fill the rest up to 6-8 total
  const remaining = pool.filter(o => !selected.find(s => s.id === o.id));
  const additional = pickBest(remaining, 6 - selected.length);
  
  selected.push(...additional);

  // Shuffle the final list so it doesn't always show survival first
  return selected.sort(() => 0.5 - Math.random());
}


export interface OpportunityResult {
  resultType: 'success' | 'mixed' | 'failure';
  score: number;
  factorChanges: { credibility?: number; charisma?: number; influence?: number; resources?: number };
  moneyChange: number;
  newObligation?: string;
  newVulnerability?: string;
  recordCreated: {
    title: string;
    summary: string;
    visibility: 'public' | 'private';
  };
}

export function resolveOpportunity(opportunity: Opportunity, citizenFile: CitizenFile): OpportunityResult {
  // 1. Take average of mainFactors values
  let totalFactorPoints = 0;
  opportunity.mainFactors.forEach(factor => {
    totalFactorPoints += (citizenFile.factors as any)[factor] || 0;
  });
  let averageFactor = totalFactorPoints / Math.max(1, opportunity.mainFactors.length);

  // 2. Add modifier based on risk level
  let riskMod = 0;
  if (opportunity.riskLevel === 'Low') riskMod = 10;
  else if (opportunity.riskLevel === 'Medium') riskMod = 0;
  else if (opportunity.riskLevel === 'High') riskMod = -8;

  // 3. Add origin fit bonus
  let originBonus = 0;
  if (opportunity.originWeights) {
    let matches = 0;
    if (opportunity.originWeights.homeStates?.includes(citizenFile.homeState)) matches++;
    if (citizenFile.householdBackground && opportunity.originWeights.householdBackgrounds?.includes(citizenFile.householdBackground)) matches++;
    if (citizenFile.pre18Reputation && opportunity.originWeights.pre18Reputations?.includes(citizenFile.pre18Reputation)) matches++;
    if (citizenFile.firstSupporter && opportunity.originWeights.firstSupporters?.includes(citizenFile.firstSupporter)) matches++;
    if (citizenFile.earlyBurden && opportunity.originWeights.earlyBurdens?.includes(citizenFile.earlyBurden)) matches++;
    
    if (matches >= 2) originBonus = 8;
    else if (matches === 1) originBonus = 4;
  }

  // 4. Clamp score 0-100
  let score = averageFactor + riskMod + originBonus;
  score = Math.max(0, Math.min(100, score));

  // Determine outcome tier
  let resultType: 'success' | 'mixed' | 'failure' = 'failure';
  if (score >= 70) resultType = 'success';
  else if (score >= 45) resultType = 'mixed';

  // Apply Effects
  let factorChanges: any = {};
  let moneyChange = 0;
  let newObligation: string | undefined = undefined;
  let newVulnerability: string | undefined = undefined;
  let recordSummary = '';
  
  // Base visibility rules:
  // reputation/politics/network -> public
  // survival/business -> private (unless it's a huge success/failure, but we keep simple)
  let visibility: 'public' | 'private' = ['reputation', 'politics', 'network'].includes(opportunity.type) ? 'public' : 'private';

  if (resultType === 'success') {
    recordSummary = opportunity.recordTemplates.success;
    factorChanges = { ...opportunity.rewards };
    moneyChange = opportunity.rewards.money || 0;
    
    if (opportunity.risks.obligation && ['network', 'politics', 'business'].includes(opportunity.type)) {
      newObligation = opportunity.risks.obligation;
    }
  } else if (resultType === 'mixed') {
    recordSummary = opportunity.recordTemplates.mixed;
    // ~60% rewards
    ['credibility', 'charisma', 'influence', 'resources'].forEach(f => {
      if ((opportunity.rewards as any)[f]) {
        factorChanges[f] = Math.max(1, Math.round(((opportunity.rewards as any)[f]) * 0.6));
      }
    });
    if (opportunity.rewards.money) {
      moneyChange = Math.round(opportunity.rewards.money * 0.6);
    }
    
    if (opportunity.risks.obligation) newObligation = opportunity.risks.obligation;
    if (opportunity.risks.vulnerability) newVulnerability = opportunity.risks.vulnerability;
  } else {
    recordSummary = opportunity.recordTemplates.failure;
    // apply penalties if defined
    ['credibility', 'charisma', 'influence', 'resources'].forEach(f => {
      if ((opportunity.risks as any)[f]) {
        factorChanges[f] = (opportunity.risks as any)[f];
      }
    });
    if (opportunity.risks.money) moneyChange = opportunity.risks.money;
    
    if (opportunity.risks.obligation) newObligation = opportunity.risks.obligation;
    if (opportunity.risks.vulnerability) newVulnerability = opportunity.risks.vulnerability;
  }

  // Remove money from factorChanges object just to be clean
  delete factorChanges.money;

  return {
    resultType,
    score,
    factorChanges,
    moneyChange,
    newObligation,
    newVulnerability,
    recordCreated: {
      title: opportunity.title,
      summary: recordSummary,
      visibility
    }
  };
}
