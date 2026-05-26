import { continentRepository, governanceSystemRepository, Continent, GovernanceSystem } from '../repositories/continent.repository';
import { nationRepository } from '../repositories/nation.repository';
import { NotFoundError } from '../utils/errors';

export class GovernanceService {
  /**
   * Get all continents.
   */
  public async getAllContinents(): Promise<Continent[]> {
    return continentRepository.findAll();
  }

  /**
   * Get all governance system definitions.
   */
  public async getAllGovernanceSystems(): Promise<GovernanceSystem[]> {
    return governanceSystemRepository.findAll();
  }

  /**
   * Get governance system for a specific nation.
   */
  public async getNationGovernance(nationId: string): Promise<{
    nation: any;
    governance: GovernanceSystem | null;
    continent: Continent | null;
  }> {
    const nation = await nationRepository.findById(nationId);
    if (!nation) throw new NotFoundError('Nation not found');

    const governance = nation.governance_system
      ? await governanceSystemRepository.findByCode(nation.governance_system)
      : null;

    const continent = nation.continent_id
      ? await continentRepository.findById(nation.continent_id)
      : null;

    return { nation, governance, continent };
  }

  /**
   * Get governance modifiers that affect the simulation.
   */
  public async getGovernanceModifiers(nationId: string): Promise<{
    stabilityModifier: number;
    corruptionModifier: number;
    efficiencyModifier: number;
    coalitionThreshold: number;
    lawPassageThreshold: number;
    parliamentSeats: number;
    electionCycleMonths: number;
    confidenceVote: boolean;
    specialRules: Record<string, any>;
  }> {
    const nation = await nationRepository.findById(nationId);
    if (!nation) throw new NotFoundError('Nation not found');

    if (!nation.governance_system) {
      return {
        stabilityModifier: 0,
        corruptionModifier: 0,
        efficiencyModifier: 0,
        coalitionThreshold: 0.501,
        lawPassageThreshold: 0.501,
        parliamentSeats: Number(nation.parliament_seats) || 200,
        electionCycleMonths: Number(nation.election_cycle_months) || 48,
        confidenceVote: true,
        specialRules: {}
      };
    }

    const governance = await governanceSystemRepository.findByCode(nation.governance_system);
    if (!governance) {
      return {
        stabilityModifier: 0,
        corruptionModifier: 0,
        efficiencyModifier: 0,
        coalitionThreshold: 0.501,
        lawPassageThreshold: 0.501,
        parliamentSeats: Number(nation.parliament_seats) || 200,
        electionCycleMonths: Number(nation.election_cycle_months) || 48,
        confidenceVote: true,
        specialRules: {}
      };
    }

    return {
      stabilityModifier: Number(governance.stability_modifier),
      corruptionModifier: Number(governance.corruption_modifier),
      efficiencyModifier: Number(governance.efficiency_modifier),
      coalitionThreshold: Number(governance.coalition_threshold) || 0.501,
      lawPassageThreshold: Number(governance.law_passage_threshold),
      parliamentSeats: Number(nation.parliament_seats) || Number(governance.default_election_cycle_months),
      electionCycleMonths: Number(nation.election_cycle_months) || Number(governance.default_election_cycle_months),
      confidenceVote: governance.confidence_vote,
      specialRules: governance.special_rules || {}
    };
  }
}

export const governanceService = new GovernanceService();
