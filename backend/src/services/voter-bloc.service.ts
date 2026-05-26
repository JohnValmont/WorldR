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
    const blocs = await voterBlocRepository.findByNationId(nationId, trx);
    const updates: Array<{ id: string; approval: number }> = [];

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

      // Calculate new approval (decay toward equilibrium)
      const equilibrium = 0.50 - inflationPenalty - unemploymentPenalty + welfareBonus + partyBonus;
      const newApproval = currentApproval * 0.85 + equilibrium * 0.15;
      const clampedApproval = Math.min(0.95, Math.max(0.05, newApproval));

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
