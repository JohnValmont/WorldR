import { PopulationGroup, ActiveModifier, BudgetItem, Party } from '../../types';
import { ModifierResolver } from '../modifier.resolver';
import { VoterBloc, VoterBlocPartyAffinity } from '../../repositories/voter-bloc.repository';

export class PoliticsEngine {
  public static calculate(
    populationGroups: PopulationGroup[],
    inflationCpi: number,
    unemploymentRate: number,
    welfareAllocation: number,
    welfareEfficiency: number,
    approvalDecay: number,
    modifiers: ActiveModifier[],
    corruptionLevel: number,
    mediaSentiment: number,
    brutalityRisk: number,
    scandals: number
  ): {
    updatedPopulationGroups: PopulationGroup[];
    nationalApproval: number;
    nationalStability: number;
  } {
    let totalSize = 0;
    let weightedApprovalSum = 0;

    const updatedPopulationGroups = populationGroups.map(pop => {
      const popMods = modifiers.filter(
        m => m.targetType === 'population_group' && m.targetName === pop.name
      );

      const resolvedApproval = ModifierResolver.resolve(
        Number(pop.approval),
        popMods.filter(m => m.parameterName === 'approval')
      );

      // Decaying base approval slightly over time (voter fatigue)
      let newApproval = resolvedApproval * approvalDecay;

      // Negative effects from inflation and unemployment
      const inflationImpact = inflationCpi * Number(pop.inflation_sensitivity);
      const unemploymentImpact = unemploymentRate * Number(pop.unemployment_sensitivity);

      newApproval -= (inflationImpact + unemploymentImpact) * 0.1;

      // Welfare boosts approval for lower-income groups
      if (pop.name === 'Poor' || pop.name === 'Working') {
        const welfareShare = (welfareAllocation * welfareEfficiency) / (Number(pop.size) || 1);
        newApproval += Math.min(0.15, welfareShare * 0.0001);
      }

      // Corruption scandals decay approval
      newApproval -= scandals * 0.15;

      // Media sentiment influences approval
      newApproval += (mediaSentiment - 0.5) * 0.1;

      // Police brutality hurts approval, especially for lower/working/middle classes
      if (pop.name === 'Poor' || pop.name === 'Working' || pop.name === 'Middle') {
        newApproval -= brutalityRisk * 0.1;
      }

      // Constrain approval [0.0, 1.0]
      newApproval = Math.max(0.0, Math.min(1.0, newApproval));

      const size = Number(pop.size);
      totalSize += size;
      weightedApprovalSum += newApproval * size;

      return {
        ...pop,
        approval: Number(newApproval.toFixed(4))
      };
    });

    const nationalApproval = totalSize > 0 ? (weightedApprovalSum / totalSize) : 0.5;

    // Stability derives primarily from national approval, but is penalized by corruption and police brutality risk
    let nationalStability = (nationalApproval * 0.6) + 0.4 - corruptionLevel * 0.1 - brutalityRisk * 0.1;
    nationalStability = Math.max(0.0, Math.min(1.0, nationalStability));

    return {
      updatedPopulationGroups,
      nationalApproval: Number(nationalApproval.toFixed(4)),
      nationalStability: Number(nationalStability.toFixed(4))
    };
  }

  public static calculateInstitutionsAndEnforcement(
    populationGroups: PopulationGroup[],
    budgetItems: BudgetItem[],
    gdp: number,
    nationalApproval: number,
    nationalStability: number,
    lastSnapshot: any,
    inflationCpi: number,
    unemploymentRate: number,
    params: {
      corruption_base_leakage: number;
      corruption_decay_rate: number;
      corruption_growth_factor: number;
      corruption_inflation_impact: number;
      corruption_welfare_impact: number;
      corruption_anticorruption_impact: number;
      corruption_tax_evasion_impact: number;
      media_scandal_multiplier: number;
      media_sentiment_damping: number;
      media_opposition_strength: number;
      media_misinfo_pressure: number;
      media_influence: number;
      policing_brutality_base: number;
      policing_brutality_budget_impact: number;
      policing_brutality_unrest_impact: number;
      policing_crime_response_base: number;
      policing_effectiveness_base: number;
      policing_public_safety_base: number;
      target_admin_gdp_ratio: number;
      courts_share: number;
      tax_authority_share: number;
      civil_service_share: number;
      anticorruption_share: number;
      police_share: number;
      election_commission_share: number;
      statistics_office_share: number;
      regulatory_agencies_share: number;
    }
  ): {
    institutions: {
      courts: { efficiency: number; trust: number; corruptionExposure: number; backlog: number; enforcementStrength: number; publicPerception: number };
      tax_authority: { efficiency: number; trust: number; corruptionExposure: number; backlog: number; enforcementStrength: number; publicPerception: number };
      civil_service: { efficiency: number; trust: number; corruptionExposure: number; backlog: number; enforcementStrength: number; publicPerception: number };
      anti_corruption_bureau: { efficiency: number; trust: number; corruptionExposure: number; backlog: number; enforcementStrength: number; publicPerception: number };
      police: { efficiency: number; trust: number; corruptionExposure: number; backlog: number; enforcementStrength: number; publicPerception: number };
      election_commission: { efficiency: number; trust: number; corruptionExposure: number; backlog: number; enforcementStrength: number; publicPerception: number };
      statistics_office: { efficiency: number; trust: number; corruptionExposure: number; backlog: number; enforcementStrength: number; publicPerception: number };
      regulatory_agencies: { efficiency: number; trust: number; corruptionExposure: number; backlog: number; enforcementStrength: number; publicPerception: number };
    };
    corruption: {
      level: number;
      petty: number;
      bureaucratic: number;
      procurement: number;
      police: number;
      judicial: number;
      taxEvasionLeakage: number;
      briberyPressure: number;
      scandals: number;
    };
    media: {
      newsSentiment: number;
      narrativeDominance: number;
      scandalAmplification: number;
      trustInMedia: number;
      govMessagingEffectiveness: number;
      oppMessagingEffectiveness: number;
      misinformationPressure: number;
      publicMoodInfluence: number;
    };
    policing: {
      policeStrength: number;
      crimeResponse: number;
      unrestResponse: number;
      brutalityRisk: number;
      publicSafetyPerception: number;
      enforcementCapacity: number;
      protestManagement: number;
      legitimacyTradeoff: number;
    };
  } {
    const lastPolitics = lastSnapshot?.snapshot_data?.politics || {};
    const lastInst = lastPolitics.institutions || {};
    const lastCorruption = lastPolitics.corruption || {};
    const lastMedia = lastPolitics.media || {};
    const lastPolicing = lastPolitics.policing || {};

    const getPrevInst = (name: string) => {
      const defaultInst = {
        efficiency: 0.8,
        trust: 0.8,
        corruptionExposure: 0.15,
        backlog: 0.1,
        enforcementStrength: 0.8,
        publicPerception: 0.8
      };
      return lastInst[name] || defaultInst;
    };

    // Administration Budget Allocation
    const adminAllocation = Number(budgetItems.find(b => b.name === 'Administration')?.allocation || 0);
    const fundingRatio = gdp > 0 ? (adminAllocation / (gdp * params.target_admin_gdp_ratio)) : 1.0;
    const boundedFundingRatio = Math.max(0.1, Math.min(3.0, fundingRatio));

    // Calculate Corruption Level first (to resolve circular dependency with anti-corruption bureau efficiency)
    const prevCorruptionLevel = lastCorruption.level !== undefined ? Number(lastCorruption.level) : 0.15;
    const prevAntiCorruptionEff = getPrevInst('anti_corruption_bureau').efficiency;

    const welfareAllocation = Number(budgetItems.find(b => b.name === 'Welfare')?.allocation || 0);
    const welfareRatio = gdp > 0 ? (welfareAllocation / gdp) : 0.05;

    const corruptionPressure = params.corruption_growth_factor
      + (inflationCpi * params.corruption_inflation_impact)
      + (unemploymentRate * 0.1)
      - (welfareRatio * 0.2);

    const corruptionMitigation = prevAntiCorruptionEff * params.corruption_anticorruption_impact;

    const corruptionChange = corruptionPressure - corruptionMitigation;
    let newCorruptionLevel = prevCorruptionLevel * params.corruption_decay_rate + corruptionChange * 0.1;
    newCorruptionLevel = Math.max(0.01, Math.min(0.95, newCorruptionLevel));

    // Scandals accumulation
    const prevScandals = lastCorruption.scandals !== undefined ? Number(lastCorruption.scandals) : 0.05;
    const regulatoryEffPrev = getPrevInst('regulatory_agencies').efficiency;
    const scandalProb = newCorruptionLevel * (1 - regulatoryEffPrev);
    let newScandals = prevScandals * 0.8 + scandalProb * 0.2;
    newScandals = Math.max(0.0, Math.min(1.0, newScandals));

    // Calculate Institution Budget Share multipliers
    const getShareInfo = (name: string) => {
      switch (name) {
        case 'courts': return { share: params.courts_share, def: 0.15 };
        case 'tax_authority': return { share: params.tax_authority_share, def: 0.15 };
        case 'civil_service': return { share: params.civil_service_share, def: 0.25 };
        case 'anti_corruption_bureau': return { share: params.anticorruption_share, def: 0.05 };
        case 'police': return { share: params.police_share, def: 0.25 };
        case 'election_commission': return { share: params.election_commission_share, def: 0.05 };
        case 'statistics_office': return { share: params.statistics_office_share, def: 0.05 };
        case 'regulatory_agencies': return { share: params.regulatory_agencies_share, def: 0.05 };
        default: return { share: 0.1, def: 0.1 };
      }
    };

    const updatedInstitutions: any = {};
    const instNames = [
      'courts',
      'tax_authority',
      'civil_service',
      'anti_corruption_bureau',
      'police',
      'election_commission',
      'statistics_office',
      'regulatory_agencies'
    ];

    for (const name of instNames) {
      const prev = getPrevInst(name);
      const { share, def } = getShareInfo(name);
      const instFunding = boundedFundingRatio * (share / (def || 0.01));

      // 1. Corruption Exposure
      const pressureSens = name === 'courts' ? 0.2 : name === 'civil_service' ? 0.4 : name === 'anti_corruption_bureau' ? 0.1 : 0.3;
      const targetExposure = newCorruptionLevel * pressureSens * (1 - (name === 'anti_corruption_bureau' ? 0 : prevAntiCorruptionEff));
      let newExposure = prev.corruptionExposure + (targetExposure - prev.corruptionExposure) * 0.1;
      newExposure = Math.max(0.01, Math.min(0.95, newExposure));

      // 2. Backlog
      const baseDemand = name === 'courts' ? 0.12 : name === 'tax_authority' ? 0.08 : 0.05;
      const capacityFactor = 0.1 * instFunding * (1 - newExposure);
      let newBacklog = prev.backlog + (baseDemand - capacityFactor);
      newBacklog = Math.max(0.01, Math.min(0.95, newBacklog));

      // 3. Efficiency
      const targetEff = instFunding * (1 - newExposure) * (1 - newBacklog * 0.5);
      let newEff = prev.efficiency + (targetEff - prev.efficiency) * 0.1;
      newEff = Math.max(0.05, Math.min(1.0, newEff));

      // 4. Trust
      const trustChange = (newEff * 0.05) - (newExposure * 0.1) - (newBacklog * 0.02);
      let newTrust = prev.trust + trustChange;
      newTrust = Math.max(0.01, Math.min(1.0, newTrust));

      // 5. Enforcement Strength
      const newEnfStrength = Math.max(0.01, Math.min(1.0, newEff * instFunding * (1 - newExposure)));

      // 6. Public Perception
      const newPerception = Math.max(0.01, Math.min(1.0, newTrust * 0.7 + newEff * 0.3));

      updatedInstitutions[name] = {
        efficiency: Number(newEff.toFixed(4)),
        trust: Number(newTrust.toFixed(4)),
        corruptionExposure: Number(newExposure.toFixed(4)),
        backlog: Number(newBacklog.toFixed(4)),
        enforcementStrength: Number(newEnfStrength.toFixed(4)),
        publicPerception: Number(newPerception.toFixed(4))
      };
    }

    // Set corruption types
    const civilServiceEff = updatedInstitutions['civil_service'].efficiency;
    const civilServiceBacklog = updatedInstitutions['civil_service'].backlog;
    const regulatoryEff = updatedInstitutions['regulatory_agencies'].efficiency;
    const policeEff = updatedInstitutions['police'].efficiency;
    const courtsEff = updatedInstitutions['courts'].efficiency;
    const taxAuthorityEff = updatedInstitutions['tax_authority'].efficiency;

    const petty = Math.max(0.01, Math.min(0.95, newCorruptionLevel * 1.2 * (1 - civilServiceEff)));
    const bureaucratic = Math.max(0.01, Math.min(0.95, newCorruptionLevel * 1.0 * civilServiceBacklog));
    const procurement = Math.max(0.01, Math.min(0.95, newCorruptionLevel * 1.5 * (1 - regulatoryEff)));
    const policeCorruption = Math.max(0.01, Math.min(0.95, newCorruptionLevel * 0.8 * (1 - policeEff)));
    const judicialCorruption = Math.max(0.01, Math.min(0.95, newCorruptionLevel * 0.7 * (1 - courtsEff)));
    const briberyPressure = Math.max(0.01, Math.min(0.95, (inflationCpi * 0.4 + unemploymentRate * 0.6) * newCorruptionLevel));
    const taxEvasionLeakage = Math.max(0.0, Math.min(0.8, newCorruptionLevel * (1 - taxAuthorityEff) * params.corruption_tax_evasion_impact));

    // Media updates
    const prevNewsSentiment = lastMedia.newsSentiment !== undefined ? Number(lastMedia.newsSentiment) : 0.5;
    const prevTrustInMedia = lastMedia.trustInMedia !== undefined ? Number(lastMedia.trustInMedia) : 0.6;

    const censorshipModifier = 0.0; // Future laws integration placeholder
    const baseNarrativeDominance = 0.5;
    const narrativeDominance = Math.max(0.05, Math.min(0.95, baseNarrativeDominance + censorshipModifier + (regulatoryEff - 0.5) * 0.2));

    const scandalAmplification = Math.max(0.1, Math.min(3.0, (1.05 - narrativeDominance) * params.media_scandal_multiplier));

    const targetSentiment = nationalApproval * (1.0 - newScandals * scandalAmplification);
    let newsSentiment = prevNewsSentiment + (targetSentiment - prevNewsSentiment) * (1 - params.media_sentiment_damping);
    newsSentiment = Math.max(0.01, Math.min(1.0, newsSentiment));

    const misinformationPressure = Math.max(0.01, Math.min(0.95, params.media_misinfo_pressure * (2 - regulatoryEff)));

    let trustInMedia = prevTrustInMedia + (0.5 - prevTrustInMedia) * 0.05 - misinformationPressure * 0.1;
    trustInMedia = Math.max(0.01, Math.min(1.0, trustInMedia));

    const govMessagingEffectiveness = Math.max(0.01, Math.min(1.0, narrativeDominance * trustInMedia));
    const oppMessagingEffectiveness = Math.max(0.01, Math.min(1.0, (1 - narrativeDominance) * (1 - newsSentiment) * trustInMedia));

    const publicMoodInfluence = newsSentiment * params.media_influence;

    // Policing updates
    const policeInst = updatedInstitutions['police'];
    const policeStrength = policeInst.enforcementStrength;

    const crimeResponse = Math.max(1.0, Math.min(20.0, params.policing_crime_response_base / (policeStrength + 0.1) * (1 + policeInst.backlog)));
    const unrestResponse = Math.max(0.01, Math.min(1.0, policeStrength * policeInst.efficiency));

    const brutalityRisk = Math.max(0.01, Math.min(0.95,
      params.policing_brutality_base
      + (policeStrength * params.policing_brutality_budget_impact)
      + ((1 - nationalStability) * params.policing_brutality_unrest_impact)
      - (policeInst.trust * 0.1)
    ));

    const publicSafetyPerception = Math.max(0.01, Math.min(1.0,
      (policeInst.efficiency * (1 - newCorruptionLevel) * 0.7)
      + (Math.max(0, 1 - crimeResponse / 10) * 0.3)
    ));

    const enforcementCapacity = Math.max(0.01, Math.min(1.0, policeStrength * policeInst.efficiency * (1 - policeInst.backlog * 0.5)));
    const protestManagement = Math.max(0.01, Math.min(1.0, enforcementCapacity * (1 - brutalityRisk * 0.3)));
    const legitimacyTradeoff = Math.max(0.0, Math.min(1.0, brutalityRisk * policeStrength));

    return {
      institutions: updatedInstitutions,
      corruption: {
        level: Number(newCorruptionLevel.toFixed(4)),
        petty: Number(petty.toFixed(4)),
        bureaucratic: Number(bureaucratic.toFixed(4)),
        procurement: Number(procurement.toFixed(4)),
        police: Number(policeCorruption.toFixed(4)),
        judicial: Number(judicialCorruption.toFixed(4)),
        taxEvasionLeakage: Number(taxEvasionLeakage.toFixed(4)),
        briberyPressure: Number(briberyPressure.toFixed(4)),
        scandals: Number(newScandals.toFixed(4))
      },
      media: {
        newsSentiment: Number(newsSentiment.toFixed(4)),
        narrativeDominance: Number(narrativeDominance.toFixed(4)),
        scandalAmplification: Number(scandalAmplification.toFixed(4)),
        trustInMedia: Number(trustInMedia.toFixed(4)),
        govMessagingEffectiveness: Number(govMessagingEffectiveness.toFixed(4)),
        oppMessagingEffectiveness: Number(oppMessagingEffectiveness.toFixed(4)),
        misinformationPressure: Number(misinformationPressure.toFixed(4)),
        publicMoodInfluence: Number(publicMoodInfluence.toFixed(4))
      },
      policing: {
        policeStrength: Number(policeStrength.toFixed(4)),
        crimeResponse: Number(crimeResponse.toFixed(4)),
        unrestResponse: Number(unrestResponse.toFixed(4)),
        brutalityRisk: Number(brutalityRisk.toFixed(4)),
        publicSafetyPerception: Number(publicSafetyPerception.toFixed(4)),
        enforcementCapacity: Number(enforcementCapacity.toFixed(4)),
        protestManagement: Number(protestManagement.toFixed(4)),
        legitimacyTradeoff: Number(legitimacyTradeoff.toFixed(4))
      }
    };
  }

  public static getIdeologyCompatibility(id1: string, id2: string): number {
    if (id1 === id2) return 2;
    const compatibilities: Record<string, Record<string, number>> = {
      socialist: { social_democrat: 2, green: 2, centrist: 1, socialist: 2 },
      social_democrat: { socialist: 2, green: 2, centrist: 1, technocratic: 1, social_democrat: 2 },
      green: { socialist: 2, social_democrat: 2, technocratic: 1, centrist: 1, libertarian: 1, green: 2 },
      centrist: { social_democrat: 2, conservative: 2, centrist: 2, socialist: 1, green: 1, libertarian: 1, technocratic: 1, nationalist: 1 },
      conservative: { nationalist: 2, libertarian: 2, centrist: 2, technocratic: 1, conservative: 2 },
      nationalist: { conservative: 2, centrist: 1, nationalist: 2 },
      libertarian: { conservative: 2, centrist: 1, technocratic: 1, green: 1, libertarian: 2 },
      technocratic: { green: 2, social_democrat: 1, conservative: 1, centrist: 1, libertarian: 1, technocratic: 2 }
    };
    return compatibilities[id1]?.[id2] ?? -1;
  }

  private static dHondt(
    partyVotes: Array<{ party: Party; votes: number }>,
    totalSeats: number
  ): Array<{ party: Party; votes: number; seats: number }> {
    const results = partyVotes.map(pv => ({ ...pv, seats: 0 }));
    const divisors = results.map(() => 1);

    for (let i = 0; i < totalSeats; i++) {
      let maxQuotient = -1;
      let maxIndex = 0;
      for (let j = 0; j < results.length; j++) {
        const quotient = results[j].votes / divisors[j];
        if (quotient > maxQuotient) {
          maxQuotient = quotient;
          maxIndex = j;
        }
      }
      results[maxIndex].seats += 1;
      divisors[maxIndex] += 1;
    }

    return results;
  }

  public static calculatePartiesAndElections(
    voterBlocs: VoterBloc[],
    parties: Party[],
    affinities: VoterBlocPartyAffinity[],
    currentTick: number,
    electionCooldown: number,
    stability: number
  ): {
    partySupport: { name: string; support: number }[];
    isElectionMonth: boolean;
    turnout: number;
    seatAllocation: { name: string; seats: number }[];
    governingParty: string;
    coalitionPartners: string[];
    governmentLegitimacy: number;
  } {
    // 1. Calculate the support weight of each party based on voter blocs and affinities
    const rawSupports: Record<string, number> = {};
    for (const p of parties) {
      rawSupports[p.id] = 0;
    }

    for (const b of voterBlocs) {
      const weight = Number(b.population_share) * Number(b.turnout_rate);
      const blocAffs = affinities.filter(a => a.voter_bloc_id === b.id);
      const totalAffinity = blocAffs.reduce((sum, a) => sum + Number(a.current_affinity), 0) || 1;

      for (const aff of blocAffs) {
        if (rawSupports[aff.party_id] !== undefined) {
          rawSupports[aff.party_id] += weight * (Number(aff.current_affinity) / totalAffinity);
        }
      }
    }

    const totalWeight = Object.values(rawSupports).reduce((sum, w) => sum + w, 0) || 1;

    const partySupport = parties.map(p => ({
      name: p.name,
      support: Number((rawSupports[p.id] / totalWeight).toFixed(4))
    }));

    const isElectionMonth = currentTick > 0 && currentTick % electionCooldown === 0;

    // Calculate turnout rate
    const totalPop = voterBlocs.reduce((sum, b) => sum + Number(b.population_share), 0) || 1;
    const weightedTurnout = voterBlocs.reduce((sum, b) => sum + Number(b.population_share) * Number(b.turnout_rate), 0);
    let turnout = totalPop > 0 ? (weightedTurnout / totalPop) : 0.65;
    turnout = turnout + (stability - 0.5) * 0.1;
    turnout = Math.max(0.4, Math.min(0.95, turnout));

    let seatAllocation: { name: string; seats: number }[] = [];
    let governingParty = '';
    let coalitionPartners: string[] = [];
    let governmentLegitimacy = 0.8;
    const totalSeats = 450; // Denominator for Keldoria seats

    if (isElectionMonth) {
      const totalVotes = 82000000 * turnout;
      const partyVotes = parties.map(p => {
        const support = partySupport.find(ps => ps.name === p.name)?.support || 0;
        return {
          party: p,
          votes: Math.round(support * totalVotes)
        };
      });

      const allocated = this.dHondt(partyVotes, totalSeats);
      seatAllocation = allocated.map(a => ({ name: a.party.name, seats: a.seats }));

      seatAllocation.sort((a, b) => b.seats - a.seats);
      const largestPartyObj = seatAllocation[0];
      const largestPartyDb = parties.find(p => p.name === largestPartyObj.name)!;

      governingParty = largestPartyObj.name;

      if (largestPartyObj.seats >= totalSeats / 2 + 1) {
        coalitionPartners = [];
        governmentLegitimacy = Number((largestPartyObj.seats / totalSeats).toFixed(2));
      } else {
        // Form a coalition using ideological compatibility
        let combinedSeats = largestPartyObj.seats;
        const potentialPartners = parties
          .filter(p => p.id !== largestPartyDb.id)
          .map(p => {
            const seats = seatAllocation.find(sa => sa.name === p.name)?.seats || 0;
            const compatibility = this.getIdeologyCompatibility(largestPartyDb.ideology || '', p.ideology || '');
            return { party: p, seats, compatibility };
          })
          .filter(partner => partner.compatibility >= 0)
          .sort((a, b) => {
            if (b.compatibility !== a.compatibility) {
              return b.compatibility - a.compatibility;
            }
            return b.seats - a.seats;
          });

        for (const partner of potentialPartners) {
          combinedSeats += partner.seats;
          coalitionPartners.push(partner.party.abbreviation);
          if (combinedSeats >= totalSeats / 2 + 1) {
            break;
          }
        }

        governmentLegitimacy = Number((combinedSeats / totalSeats).toFixed(2));
      }
    } else {
      seatAllocation = parties.map(p => ({ name: p.name, seats: p.seats }));
      const governingParties = parties.filter(p => p.is_governing);
      governingParties.sort((a, b) => b.seats - a.seats);

      if (governingParties.length > 0) {
        governingParty = governingParties[0].name;
        coalitionPartners = governingParties.slice(1).map(p => p.abbreviation);
        const combinedSeats = governingParties.reduce((sum, p) => sum + p.seats, 0);
        governmentLegitimacy = Number((combinedSeats / totalSeats).toFixed(2));
      } else {
        governingParty = parties[0]?.name || '';
        coalitionPartners = [];
        governmentLegitimacy = 0.5;
      }
    }

    return {
      partySupport,
      isElectionMonth,
      turnout: Number(turnout.toFixed(4)),
      seatAllocation,
      governingParty,
      coalitionPartners,
      governmentLegitimacy
    };
  }
}
