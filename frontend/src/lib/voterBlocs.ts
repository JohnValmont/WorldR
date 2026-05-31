// ─────────────────────────────────────────────────────────────────────────────
// WORLDR VOTER BLOCS SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
// Temporary Drennia society profile. Future nations should define their own
// bloc composition and continent-specific political culture.

export interface VoterBloc {
  id: string;
  name: string;
  populationShare: number; // percentage out of 100
  description: string;
  concerns: string[];
}

export interface CountrySocietyProfile {
  countryName: string;
  continentName: string;
  population: string;
  government: string;
  politicalCulture: string;
  societyDescription: string;
  blocs: VoterBloc[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DRENNIA SOCIETY PROFILE
// ─────────────────────────────────────────────────────────────────────────────

export const DRENNIA_SOCIETY: CountrySocietyProfile = {
  countryName: 'Drennia',
  continentName: 'Varelia',
  population: '3.1M',
  government: 'Parliamentary',
  politicalCulture: 'Stable, institutional, urbanizing, reform-friendly',
  societyDescription:
    'Drennia is a middle-class Varelian parliamentary nation with educated cities, stable institutions, moderate industry, a strong civic culture, and an active political middle class.',
  blocs: [
    {
      id: 'urban_professionals',
      name: 'Urban Professionals',
      populationShare: 16,
      description:
        'Educated city workers, managers, skilled professionals, office workers, and civic-minded middle-class voters.',
      concerns: ['Anti-corruption', 'Education', 'Public services', 'Stable growth', 'Clean governance'],
    },
    {
      id: 'industrial_workers',
      name: 'Industrial Workers',
      populationShare: 15,
      description:
        'Factory workers, logistics workers, union households, and industrial communities.',
      concerns: ['Jobs', 'Wages', 'Labor protection', 'Cost of living', 'Workplace security'],
    },
    {
      id: 'small_business_owners',
      name: 'Small Business Owners',
      populationShare: 12,
      description:
        'Shop owners, family businesses, contractors, local entrepreneurs, and self-employed workers.',
      concerns: ['Lower bureaucracy', 'Taxes', 'Local growth', 'Stable markets', 'Access to credit'],
    },
    {
      id: 'public_sector_workers',
      name: 'Public Sector Workers',
      populationShare: 11,
      description:
        'Teachers, nurses, clerks, civil servants, municipal workers, and public institution employees.',
      concerns: ['Job security', 'Public services', 'Pensions', 'Education', 'Healthcare', 'Institutional stability'],
    },
    {
      id: 'students_youth',
      name: 'Students / Youth',
      populationShare: 12,
      description:
        'Students, young workers, first-time voters, activists, and urban youth.',
      concerns: ['Education', 'Jobs', 'Housing', 'Anti-corruption', 'Digital future', 'Social mobility'],
    },
    {
      id: 'rural_farmers',
      name: 'Rural Farmers',
      populationShare: 9,
      description:
        'Farmers, rural households, agricultural workers, and village communities.',
      concerns: ['Rural development', 'Crop prices', 'Infrastructure', 'Land', 'Local services'],
    },
    {
      id: 'low_income_citizens',
      name: 'Low-Income Citizens',
      populationShare: 9,
      description:
        'Poorer urban/rural households, unemployed citizens, informal workers, and economically insecure families.',
      concerns: ['Cost of living', 'Welfare', 'Jobs', 'Housing', 'Basic services'],
    },
    {
      id: 'religious_conservatives',
      name: 'Religious Conservatives',
      populationShare: 6,
      description:
        'Traditional religious voters, conservative families, and morality-focused communities.',
      concerns: ['Tradition', 'Religious values', 'Family policy', 'Cultural stability'],
    },
    {
      id: 'military_families',
      name: 'Military Families',
      populationShare: 4,
      description:
        'Military households, veterans\' families, security-focused voters, and defense communities.',
      concerns: ["National security", "Veterans' welfare", 'Discipline', 'Law and order'],
    },
    {
      id: 'big_business_owners',
      name: 'Big Business Owners',
      populationShare: 3,
      description:
        'Large employers, industrial owners, wealthy investors, financial elites, and corporate networks.',
      concerns: ['Low regulation', 'Investment climate', 'Taxes', 'Trade', 'Political stability'],
    },
    {
      id: 'old_establishment',
      name: 'Old Establishment / Civic Elites',
      populationShare: 3,
      description:
        'Old families, senior bureaucratic circles, institutional loyalists, lawyers, civic leaders, and traditional Varelian political elites.',
      concerns: ['Institutional stability', 'Constitutionalism', 'Moderate reform', 'Clean governance', 'Responsible leadership'],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// IDEOLOGY → VOTER BLOC EFFECT MAP
// ─────────────────────────────────────────────────────────────────────────────
// +2 = Strong positive, +1 = Positive, 0 = Neutral, -1 = Negative, -2 = Strong negative

type BlocEffectMap = Record<string, number>; // keyed by bloc id

export const IDEOLOGY_BLOC_EFFECTS: Record<string, BlocEffectMap> = {
  capitalism: {
    big_business_owners: +2,
    small_business_owners: +2,
    urban_professionals: +1,
    old_establishment: +1,
    industrial_workers: -1,
    low_income_citizens: -1,
  },
  'free market liberalism': {
    big_business_owners: +2,
    small_business_owners: +2,
    urban_professionals: +1,
    students_youth: +1,
    public_sector_workers: -1,
    industrial_workers: -1,
  },
  'free_market': {
    big_business_owners: +2,
    small_business_owners: +2,
    urban_professionals: +1,
    students_youth: +1,
    public_sector_workers: -1,
    industrial_workers: -1,
  },
  'social democracy': {
    industrial_workers: +2,
    public_sector_workers: +2,
    low_income_citizens: +1,
    students_youth: +1,
    urban_professionals: +1,
    big_business_owners: -1,
  },
  communism: {
    industrial_workers: +2,
    low_income_citizens: +2,
    public_sector_workers: +1,
    students_youth: +1,
    big_business_owners: -2,
    old_establishment: -2,
    small_business_owners: -1,
    religious_conservatives: -1,
  },
  socialism: {
    industrial_workers: +2,
    low_income_citizens: +2,
    public_sector_workers: +1,
    students_youth: +1,
    big_business_owners: -2,
    small_business_owners: -1,
    old_establishment: -1,
  },
  'liberal reformism': {
    urban_professionals: +2,
    students_youth: +2,
    old_establishment: +1,
    small_business_owners: +1,
    public_sector_workers: +1,
    religious_conservatives: -1,
    rural_farmers: -1,
  },
  'democratic reform': {
    urban_professionals: +2,
    students_youth: +1,
    public_sector_workers: +1,
    small_business_owners: +1,
    old_establishment: +1,
    religious_conservatives: -1,
  },
  'democratic_reform': {
    urban_professionals: +2,
    students_youth: +1,
    public_sector_workers: +1,
    small_business_owners: +1,
    old_establishment: +1,
    religious_conservatives: -1,
  },
  'national conservatism': {
    military_families: +2,
    religious_conservatives: +2,
    rural_farmers: +1,
    old_establishment: +1,
    students_youth: -1,
    urban_professionals: -1,
    public_sector_workers: -1,
  },
  conservatism: {
    religious_conservatives: +2,
    military_families: +1,
    rural_farmers: +1,
    old_establishment: +1,
    students_youth: -1,
  },
  technocracy: {
    urban_professionals: +2,
    public_sector_workers: +2,
    students_youth: +1,
    old_establishment: +2,
    big_business_owners: +1,
    rural_farmers: -1,
    religious_conservatives: -1,
    low_income_citizens: -1,
  },
  agrarianism: {
    rural_farmers: +2,
    religious_conservatives: +1,
    low_income_citizens: +1,
    urban_professionals: -1,
    big_business_owners: -1,
  },
  populism: {
    low_income_citizens: +2,
    industrial_workers: +1,
    rural_farmers: +1,
    students_youth: +1,
    old_establishment: -2,
    big_business_owners: -1,
  },
  environmentalism: {
    students_youth: +2,
    urban_professionals: +1,
    rural_farmers: +1,
    public_sector_workers: +1,
    big_business_owners: -1,
    industrial_workers: -1,
  },
  nationalism: {
    military_families: +2,
    religious_conservatives: +1,
    rural_farmers: +1,
    old_establishment: +1,
    students_youth: -1,
    urban_professionals: -1,
  },
  progressivism: {
    students_youth: +2,
    urban_professionals: +2,
    low_income_citizens: +1,
    public_sector_workers: +1,
    religious_conservatives: -2,
    rural_farmers: -1,
    military_families: -1,
  },
  'fiscal_conservatism': {
    big_business_owners: +2,
    small_business_owners: +2,
    urban_professionals: +1,
    old_establishment: +1,
    public_sector_workers: -1,
    low_income_citizens: -1,
  },
  'welfare_state': {
    low_income_citizens: +2,
    public_sector_workers: +2,
    industrial_workers: +1,
    students_youth: +1,
    big_business_owners: -1,
    small_business_owners: -1,
  },
  'state_intervention': {
    industrial_workers: +1,
    public_sector_workers: +2,
    low_income_citizens: +1,
    big_business_owners: -2,
    small_business_owners: -1,
  },
  industrialism: {
    industrial_workers: +2,
    big_business_owners: +1,
    urban_professionals: +1,
    rural_farmers: -1,
    environmentalism: -1,
  },
  globalism: {
    urban_professionals: +2,
    big_business_owners: +2,
    students_youth: +1,
    rural_farmers: -1,
    religious_conservatives: -1,
    military_families: -1,
  },
  'authoritarian': {
    military_families: +2,
    old_establishment: +1,
    students_youth: -2,
    urban_professionals: -1,
    public_sector_workers: -1,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PROMISE → VOTER BLOC EFFECT MAP
// ─────────────────────────────────────────────────────────────────────────────

export const MAIN_PROMISE_BLOC_EFFECTS: Record<string, BlocEffectMap> = {
  'Jobs and Wages': {
    industrial_workers: +2,
    low_income_citizens: +2,
    public_sector_workers: +1,
    students_youth: +1,
    big_business_owners: -1,
  },
  'Anti-Corruption': {
    urban_professionals: +2,
    students_youth: +2,
    small_business_owners: +1,
    public_sector_workers: +1,
    old_establishment: +1,
  },
  'Lower Taxes': {
    small_business_owners: +2,
    big_business_owners: +2,
    urban_professionals: +1,
    public_sector_workers: -1,
    low_income_citizens: -1,
  },
  'Public Welfare': {
    low_income_citizens: +2,
    public_sector_workers: +2,
    industrial_workers: +1,
    students_youth: +1,
    big_business_owners: -1,
    small_business_owners: -1,
  },
  'National Security': {
    military_families: +2,
    religious_conservatives: +1,
    old_establishment: +1,
    students_youth: -1,
  },
  'Education Reform': {
    students_youth: +2,
    urban_professionals: +2,
    public_sector_workers: +1,
    old_establishment: +1,
  },
  'Healthcare Reform': {
    low_income_citizens: +2,
    public_sector_workers: +1,
    industrial_workers: +1,
    students_youth: +1,
  },
  'Business Growth': {
    small_business_owners: +2,
    big_business_owners: +2,
    urban_professionals: +1,
    old_establishment: +1,
    industrial_workers: -1,
    low_income_citizens: -1,
  },
  'Rural Development': {
    rural_farmers: +2,
    religious_conservatives: +1,
    low_income_citizens: +1,
    urban_professionals: -1,
  },
  'Law and Order': {
    military_families: +2,
    religious_conservatives: +2,
    old_establishment: +1,
    urban_professionals: -1,
    students_youth: -1,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// APPEAL LABELS
// ─────────────────────────────────────────────────────────────────────────────

export type AppealLabel = 'Strong Support' | 'Support' | 'Neutral' | 'Weak Appeal' | 'Opposed';

export function scoreToAppealLabel(score: number): AppealLabel {
  if (score >= 3) return 'Strong Support';
  if (score >= 1) return 'Support';
  if (score === 0) return 'Neutral';
  if (score >= -2) return 'Weak Appeal';
  return 'Opposed';
}

export function appealLabelColor(label: AppealLabel): string {
  switch (label) {
    case 'Strong Support': return '#22c55e';  // green-500
    case 'Support':        return '#86efac';  // green-300
    case 'Neutral':        return '#71717a';  // zinc-500
    case 'Weak Appeal':    return '#f59e0b';  // amber-500
    case 'Opposed':        return '#ef4444';  // red-500
  }
}

export function appealLabelBg(label: AppealLabel): string {
  switch (label) {
    case 'Strong Support': return 'rgba(34,197,94,0.12)';
    case 'Support':        return 'rgba(134,239,172,0.10)';
    case 'Neutral':        return 'rgba(113,113,122,0.10)';
    case 'Weak Appeal':    return 'rgba(245,158,11,0.10)';
    case 'Opposed':        return 'rgba(239,68,68,0.10)';
  }
}

export const APPEAL_MULTIPLIERS: Record<AppealLabel, number> = {
  'Strong Support': +0.20,
  'Support':        +0.10,
  'Neutral':        0,
  'Weak Appeal':    -0.05,
  'Opposed':        -0.10,
};

// ─────────────────────────────────────────────────────────────────────────────
// IDEOLOGY NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeIdeology(raw: string): string {
  return raw.trim().toLowerCase();
}

export function extractIdeologies(currentParty: any): string[] {
  const sources = [
    currentParty?.ideologies,
    currentParty?.selectedIdeologies,
    currentParty?.ideologyIds,
    currentParty?.ideology,
    currentParty?.ideologyNames,
  ];

  for (const src of sources) {
    if (!src) continue;
    if (Array.isArray(src) && src.length > 0) {
      return src.map((x: any) => normalizeIdeology(String(x)));
    }
    if (typeof src === 'string' && src.trim()) {
      return [normalizeIdeology(src)];
    }
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOC APPEAL CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

export interface BlocAppealResult {
  bloc: VoterBloc;
  ideologyScore: number;
  mainPromiseScore: number;
  finalScore: number;
  label: AppealLabel;
}

export function calculateBlocAppeal(
  blocs: VoterBloc[],
  ideologies: string[],
  mainPromise: string | null
): BlocAppealResult[] {
  return blocs.map((bloc) => {
    // Sum ideology effects for this bloc
    let ideologyScore = 0;
    for (const ideology of ideologies) {
      const effectMap = IDEOLOGY_BLOC_EFFECTS[ideology];
      if (effectMap && effectMap[bloc.id] != null) {
        ideologyScore += effectMap[bloc.id];
      }
    }

    // Main promise effect
    let mainPromiseScore = 0;
    if (mainPromise) {
      const promiseMap = MAIN_PROMISE_BLOC_EFFECTS[mainPromise];
      if (promiseMap && promiseMap[bloc.id] != null) {
        mainPromiseScore = promiseMap[bloc.id];
      }
    }

    const finalScore = ideologyScore + mainPromiseScore;
    const label = scoreToAppealLabel(finalScore);

    return { bloc, ideologyScore, mainPromiseScore, finalScore, label };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// VOTER BLOC APPEAL SCORE
// ─────────────────────────────────────────────────────────────────────────────

export function calculateVoterBlocAppealScore(results: BlocAppealResult[]): number {
  let score = 0;
  for (const result of results) {
    const multiplier = APPEAL_MULTIPLIERS[result.label];
    score += result.bloc.populationShare * multiplier;
  }
  return score;
}

export function calculateCompetitiveVoterBlocAppeal(
  societyProfile: CountrySocietyProfile,
  parties: any[]
): Record<string, number> {
  const partyVBAPower: Record<string, number> = {};
  
  for (const p of parties) {
    if (p && p.partyId) partyVBAPower[p.partyId] = 0;
  }

  for (const bloc of societyProfile.blocs) {
    let totalPositiveScore = 0;
    const partyScores: { partyId: string, score: number }[] = [];

    for (const party of parties) {
      if (!party || !party.partyId) continue;
      
      const ideologies = extractIdeologies(party);
      
      let mainPromise = party.mainPromise || party.partyStats?.mainPromise || null;
      // Try to read from promises storage directly if needed
      if (!mainPromise && typeof window !== 'undefined') {
        try {
          const promisesRaw = localStorage.getItem('worldr_election_promises');
          if (promisesRaw) {
            const promises = JSON.parse(promisesRaw);
            const partyPromise = promises.find((p: any) => p.partyId === party.partyId);
            if (partyPromise?.mainPromise) mainPromise = partyPromise.mainPromise;
          }
        } catch (e) {}
      }

      let ideologyScore = 0;
      for (const ideology of ideologies) {
        const effectMap = IDEOLOGY_BLOC_EFFECTS[ideology];
        if (effectMap && effectMap[bloc.id] != null) {
          ideologyScore += effectMap[bloc.id];
        }
      }

      let mainPromiseScore = 0;
      if (mainPromise) {
        const promiseMap = MAIN_PROMISE_BLOC_EFFECTS[mainPromise];
        if (promiseMap && promiseMap[bloc.id] != null) {
          mainPromiseScore = promiseMap[bloc.id];
        }
      }

      const finalScore = ideologyScore + mainPromiseScore;
      
      if (finalScore > 0) {
        partyScores.push({ partyId: party.partyId, score: finalScore });
        totalPositiveScore += finalScore;
      }
    }

    if (totalPositiveScore > 0) {
      for (const ps of partyScores) {
        const share = (ps.score / totalPositiveScore) * bloc.populationShare;
        partyVBAPower[ps.partyId] += share;
      }
    }
  }

  return partyVBAPower;
}

// voterBlocAppealPower = voterBlocAppealScore * 2  (for election strength)
export function voterBlocAppealPower(appealScore: number): number {
  return appealScore * 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// READ MAIN PROMISE FROM LOCALSTORAGE
// ─────────────────────────────────────────────────────────────────────────────

export function getMainPromise(partyId: string | undefined, partyStats: any): string | null {
  if (typeof window === 'undefined') return partyStats?.mainPromise || null;

  try {
    // Try worldr_election_promises first
    const promisesRaw = localStorage.getItem('worldr_election_promises');
    if (promisesRaw && partyId) {
      const promises = JSON.parse(promisesRaw);
      const partyPromise = promises.find((p: any) => p.partyId === partyId);
      if (partyPromise?.mainPromise) return partyPromise.mainPromise;
    }
  } catch (e) {}

  return partyStats?.mainPromise || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN ADVICE GENERATION
// ─────────────────────────────────────────────────────────────────────────────

export function generateCampaignAdvice(results: BlocAppealResult[]): string[] {
  const advice: string[] = [];
  const weakBlocs = results.filter(r => r.finalScore <= 0);

  const hasWeak = (id: string) => weakBlocs.some(r => r.bloc.id === id);

  if (hasWeak('urban_professionals') && advice.length < 3) {
    advice.push('Use Give Interview, Publish Party Statement, or Anti-Corruption / Education Reform messaging to appeal to Urban Professionals.');
  }
  if (hasWeak('industrial_workers') && advice.length < 3) {
    advice.push('Jobs and Wages or Public Welfare messaging can improve appeal among Industrial Workers.');
  }
  if (hasWeak('small_business_owners') && advice.length < 3) {
    advice.push('Business Growth or Lower Taxes messaging can improve appeal among Small Business Owners.');
  }
  if (hasWeak('students_youth') && advice.length < 3) {
    advice.push('Education Reform, Anti-Corruption, and media actions can improve appeal among Students / Youth.');
  }
  if (hasWeak('rural_farmers') && advice.length < 3) {
    advice.push('Rural Development messaging can improve appeal among Rural Farmers.');
  }
  if (hasWeak('big_business_owners') && advice.length < 3) {
    advice.push('Business Growth or Lower Taxes messaging can improve appeal among Big Business Owners.');
  }

  return advice.slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET SOCIETY PROFILE FOR COUNTRY
// ─────────────────────────────────────────────────────────────────────────────

export function getSocietyProfile(countryName: string): CountrySocietyProfile | null {
  if (countryName === 'Drennia') return DRENNIA_SOCIETY;
  return null;
}
