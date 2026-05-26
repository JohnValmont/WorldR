import { voterBlocRepository, VoterBloc } from '../repositories/voter-bloc.repository';
import { partyRepository } from '../repositories/party.repository';
import { nationRepository } from '../repositories/nation.repository';
import { NotFoundError } from '../utils/errors';
import { Knex } from 'knex';

interface VoterBlocApprovalInput {
  inflationRate: number;
  unemploymentRate: number;
  welfareIndex: number;  // 0-1 representing welfare spending quality
  governingPartyIds: string[];
}

const BASE_BLOC_VALUES: Record<string, { population_share: number; turnout_rate: number }> = {
  industrial_workers: { population_share: 0.1100, turnout_rate: 0.720 },
  union_members: { population_share: 0.0800, turnout_rate: 0.800 },
  middle_class_professionals: { population_share: 0.1400, turnout_rate: 0.750 },
  urban_knowledge_workers: { population_share: 0.0900, turnout_rate: 0.680 },
  university_students: { population_share: 0.0500, turnout_rate: 0.550 },
  pensioners_elderly: { population_share: 0.1600, turnout_rate: 0.840 },
  rural_conservatives: { population_share: 0.0700, turnout_rate: 0.710 },
  small_business_owners: { population_share: 0.0600, turnout_rate: 0.740 },
  large_business_executives: { population_share: 0.0400, turnout_rate: 0.780 },
  industrial_conglomerates: { population_share: 0.0100, turnout_rate: 0.820 },
  immigrant_communities: { population_share: 0.0700, turnout_rate: 0.420 },
  unemployed_precariat: { population_share: 0.1200, turnout_rate: 0.340 }
};

export class VoterBlocService {
  /**
   * Get all voter blocs for a nation with their current affinities.
   */
  public async getBlocsForNation(nationId: string): Promise<{
    blocs: VoterBloc[];
    affinities: Record<string, Array<{ partyId: string; affinity: number }>>;
  }> {
    const nation = await nationRepository.findById(nationId);
    if (!nation) throw new NotFoundError('Nation not found');

    const blocs = await voterBlocRepository.findByNationId(nationId);
    const affinities = await voterBlocRepository.findAffinitiesForNation(nationId);
    const parties = await partyRepository.findByNationId(nationId);

    // Build affinity map: blocId -> [{ partyId, partyName, affinity }]
    const affinityMap: Record<string, Array<{ partyId: string; partyName: string; partyColor: string; affinity: number }>> = {};
    for (const aff of affinities) {
      if (!affinityMap[aff.voter_bloc_id]) affinityMap[aff.voter_bloc_id] = [];
      const party = parties.find(p => p.id === aff.party_id);
      affinityMap[aff.voter_bloc_id].push({
        partyId: aff.party_id,
        partyName: party?.name || 'Unknown',
        partyColor: party?.color || '#666',
        affinity: Number(aff.current_affinity)
      });
    }

    // Sort each bloc's affinities desc
    Object.values(affinityMap).forEach(list => list.sort((a, b) => b.affinity - a.affinity));

    return { blocs, affinities: affinityMap as any };
  }

  /**
   * Calculate updated approval for each voter bloc based on simulation state.
   * Called every tick by the TickEngine.
   */
  public async calculateBlocApprovals(
    nationId: string,
    input: VoterBlocApprovalInput,
    trx: Knex.Transaction
  ): Promise<Array<{ id: string; approval: number }>> {
    // 1. Fetch passed laws to retrieve modifiers
    const passedLaws = await trx('laws').where({ nation_id: nationId, status: 'passed' });
    
    const blocStandingAdjustments: Record<string, number> = {};
    const blocWeightModifiers: Record<string, number> = {};
    const blocTurnoutModifiers: Record<string, number> = {};

    for (const law of passedLaws) {
      if (law.description) {
        try {
          const match = law.description.match(/\[METADATA:(.*)\]/);
          if (match) {
            const parsed = JSON.parse(match[1]);
            if (parsed) {
              if (parsed.voterBlocStanding) {
                for (const [blocCode, value] of Object.entries(parsed.voterBlocStanding)) {
                  // convert integer (e.g. +3) from UI design to decimal (e.g. +0.03) for math engine
                  blocStandingAdjustments[blocCode] = (blocStandingAdjustments[blocCode] || 0) + (Number(value) / 100);
                }
              }
              if (parsed.voterBlocWeightModifiers) {
                for (const [blocCode, value] of Object.entries(parsed.voterBlocWeightModifiers)) {
                  blocWeightModifiers[blocCode] = (blocWeightModifiers[blocCode] || 0) + (Number(value) / 100);
                }
              }
              if (parsed.voterTurnoutModifiers) {
                for (const [blocCode, value] of Object.entries(parsed.voterTurnoutModifiers)) {
                  blocTurnoutModifiers[blocCode] = (blocTurnoutModifiers[blocCode] || 0) + (Number(value) / 100);
                }
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    const blocs = await voterBlocRepository.findByNationId(nationId, trx);
    const updates: Array<{ id: string; approval: number }> = [];
    const now = new Date();

    for (const bloc of blocs) {
      const currentApproval = Number(bloc.approval);
      const inflationSens = Number(bloc.inflation_sensitivity);
      const unemploymentSens = Number(bloc.unemployment_sensitivity);
      const welfareDependence = Number(bloc.welfare_dependence);

      // Base factors
      const inflationPenalty = input.inflationRate * inflationSens * 0.8;
      const unemploymentPenalty = input.unemploymentRate * unemploymentSens * 0.6;
      const welfareBonus = input.welfareIndex * welfareDependence * 0.15;

      // Governing party ideology match bonus
      const blocsAffinities = await voterBlocRepository.findAffinitiesForParty(bloc.id, trx);
      let partyBonus = 0;
      for (const aff of blocsAffinities) {
        if (input.governingPartyIds.includes(aff.party_id)) {
          partyBonus += Number(aff.current_affinity) * 0.05;
        }
      }
      partyBonus = Math.min(0.10, partyBonus);

      // Apply law standing adjustment
      const standingAdj = blocStandingAdjustments[bloc.code] || 0;

      // Calculate new approval (decay toward equilibrium)
      const equilibrium = 0.50 - inflationPenalty - unemploymentPenalty + welfareBonus + partyBonus + standingAdj;
      const newApproval = currentApproval * 0.85 + equilibrium * 0.15;
      const clampedApproval = Math.min(0.95, Math.max(0.05, newApproval));

      // Calculate modified population share and turnout rate without drifting
      const base = BASE_BLOC_VALUES[bloc.code] || { population_share: Number(bloc.population_share), turnout_rate: Number(bloc.turnout_rate) };
      const weightMod = blocWeightModifiers[bloc.code] || 0;
      const turnoutMod = blocTurnoutModifiers[bloc.code] || 0;

      const newPopShare = base.population_share * (1 + weightMod);
      const newTurnout = base.turnout_rate + turnoutMod;

      const clampedPopShare = Math.min(0.95, Math.max(0.001, newPopShare));
      const clampedTurnout = Math.min(0.95, Math.max(0.05, newTurnout));

      // Direct database updates during transaction
      await trx('voter_blocs')
        .where({ id: bloc.id })
        .update({
          approval: clampedApproval,
          population_share: clampedPopShare,
          turnout_rate: clampedTurnout,
          updated_at: now
        });

      updates.push({ id: bloc.id, approval: clampedApproval });
    }

    return updates;
  }

  /**
   * Compute weighted national approval from voter bloc approvals.
   * Uses bloc population share and turnout as weights.
   */
  public computeWeightedApproval(blocs: VoterBloc[]): number {
    if (!blocs.length) return 0.5;

    let totalWeight = 0;
    let weightedSum = 0;

    for (const bloc of blocs) {
      const weight = Number(bloc.population_share) * Number(bloc.turnout_rate);
      weightedSum += weight * Number(bloc.approval);
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Get the voter turnout percentage for election simulation.
   * Influenced by stability and engagement.
   */
  public computeWeightedTurnout(blocs: VoterBloc[], stabilityBonus: number = 0): number {
    if (!blocs.length) return 0.65;
    let totalPop = 0;
    let weightedTurnout = 0;
    for (const bloc of blocs) {
      const pop = Number(bloc.population_share);
      const turnout = Math.min(1, Number(bloc.turnout_rate) + stabilityBonus * 0.05);
      weightedTurnout += pop * turnout;
      totalPop += pop;
    }
    return totalPop > 0 ? weightedTurnout / totalPop : 0.65;
  }
}

export const voterBlocService = new VoterBlocService();
