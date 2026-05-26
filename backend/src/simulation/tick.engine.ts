import { Knex } from 'knex';
import { nationRepository } from '../repositories/nation.repository';
import { sectorRepository } from '../repositories/sector.repository';
import { populationRepository } from '../repositories/population.repository';
import { taxRepository } from '../repositories/tax.repository';
import { budgetRepository } from '../repositories/budget.repository';
import { lawRepository } from '../repositories/law.repository';
import { priceRepository } from '../repositories/price.repository';
import { snapshotRepository } from '../repositories/snapshot.repository';
import { parameterService } from '../services/parameter.service';
import { electionService } from '../services/election.service';
import { voterBlocService } from '../services/voter-bloc.service';
import { voterBlocRepository } from '../repositories/voter-bloc.repository';
import { partyRepository } from '../repositories/party.repository';
import { EconomyEngine } from './engines/economy.engine';
import { InflationEngine } from './engines/inflation.engine';
import { BudgetEngine } from './engines/budget.engine';
import { PoliticsEngine } from './engines/politics.engine';
import { CrisisEngine } from './engines/crisis.engine';
import { logger } from '../utils/logger';
import {
  EconomyBalance,
  InflationBalance,
  TaxesBalance,
  PopulationBalance,
  ApprovalBalance,
  ElectionsBalance,
  VoterBlocksBalance,
  ParliamentBalance,
  PartyBalance,
  CampaignBalance,
  AIStaffBalance,
  LawBalance,
  WelfareBalance,
  ProtestsBalance,
  CorruptionBalance,
  StabilityBalance,
  TreasuryBalance,
  DebtBalance,
  UnemploymentBalance
} from '../systems/balance';

export class TickEngine {
  private trx: Knex.Transaction;
  private nationId: string;

  constructor(trx: Knex.Transaction, nationId: string) {
    this.trx = trx;
    this.nationId = nationId;
  }

  public async executeTick(): Promise<void> {
    logger.info(`[TickEngine] Executing tick for nation: ${this.nationId}`);

    // 1. Fetch nation and lock for update
    const nation = await nationRepository.findByIdForUpdate(this.nationId, this.trx);
    if (!nation) {
      throw new Error(`Nation ${this.nationId} not found for simulation tick`);
    }

    // 1.5. Parliamentary Voting on Proposed Laws & Policies
    const proposedLaws = await lawRepository.findByNationId(this.nationId, this.trx);
    const activeProposed = proposedLaws.filter(l => l.status === 'proposed');
    
    if (activeProposed.length > 0) {
      const dbParties = await partyRepository.findByNationId(this.nationId, this.trx);
      const totalSeats = 450;
      
      // Find proposer party (player party, or governing party)
      const user = await this.trx('users').where({ nation_id: this.nationId }).first();
      const membership = user ? await partyRepository.findMembership(user.id, this.nationId, this.trx) : null;
      const playerParty = membership ? await partyRepository.findById(membership.party_id, this.trx) : null;
      const proposerParty = playerParty || dbParties.find(p => p.is_governing) || dbParties[0];
      
      for (const law of activeProposed) {
        logger.info(`[TickEngine] Parliamentary voting starting for proposed law: "${law.title}"`);
        
        let totalYesSeats = 0;
        let totalNoSeats = 0;
        
        for (const party of dbParties) {
          if (party.seats === 0) continue;
          
          let yesProbability = 0.5; // Base probability
          let compatibility = 0;
          
          if (proposerParty) {
            compatibility = PoliticsEngine.getIdeologyCompatibility(proposerParty.ideology, party.ideology);
            if (compatibility === 2) yesProbability = 0.85;
            else if (compatibility === 1) yesProbability = 0.60;
            else yesProbability = 0.20;
          }
          
          // Governing coalition members support government proposals
          if (party.is_governing) {
            yesProbability = Math.max(yesProbability, 0.95);
          }
          
          const votesYes = Math.random() < yesProbability;
          
          if (votesYes) {
            totalYesSeats += party.seats;
          } else {
            totalNoSeats += party.seats;
          }
        }
        
        const passed = totalYesSeats >= Math.ceil(totalSeats / 2 + 1);
        const quorumPassed = (totalYesSeats + totalNoSeats) >= Math.ceil(totalSeats * 0.5); // Quorum: 50% of seats present
        
        if (quorumPassed && passed) {
          logger.info(`[TickEngine] Proposed law "${law.title}" PASSED in parliament! Votes: Yes=${totalYesSeats}, No=${totalNoSeats}`);
          await lawRepository.updateStatus(law.id, 'passed', this.trx);
          
          // If it's a budget policy proposal, clear its active effects so they don't apply twice
          // and apply the base values
          if (law.description) {
            try {
              const metadataMatch = law.description.match(/\[METADATA:(.*)\]/);
              if (metadataMatch) {
                const parsed = JSON.parse(metadataMatch[1]);
                if (parsed && parsed.type === 'budget_policy') {
                  logger.info(`[TickEngine] Enacting passed budget policy in the database!`);
                  
                  // Enact taxes
                  if (parsed.taxes && Array.isArray(parsed.taxes)) {
                    const currentTaxes = await taxRepository.findByNationId(this.nationId, this.trx);
                    for (const taxUpdate of parsed.taxes) {
                      const matched = currentTaxes.find(t => t.name === taxUpdate.name);
                      if (matched) {
                        await taxRepository.update(matched.id, { rate: taxUpdate.rate }, this.trx);
                      }
                    }
                  }
                  
                  // Enact budgets
                  if (parsed.budgets && Array.isArray(parsed.budgets)) {
                    const currentBudgets = await budgetRepository.findByNationId(this.nationId, this.trx);
                    for (const budgetUpdate of parsed.budgets) {
                      const matched = currentBudgets.find(b => b.name === budgetUpdate.name);
                      if (matched) {
                        await budgetRepository.update(matched.id, { allocation: budgetUpdate.allocation }, this.trx);
                      }
                    }
                  }
                  
                  // Clear the active modifiers from law_effects to prevent double-applying
                  await this.trx('law_effects').where({ law_id: law.id }).delete();
                } else if (parsed && parsed.type === 'policy_bill') {
                  logger.info(`[TickEngine] Processing passed policy bill: "${law.title}"`);
                  const policies = parsed.policies;
                  if (policies && Array.isArray(policies)) {
                    const passedLawsList = await lawRepository.findByNationId(this.nationId, this.trx);
                    const activePassed = passedLawsList.filter(l => l.status === 'passed' && l.id !== law.id);
                    
                    for (const passedLaw of activePassed) {
                      if (passedLaw.description) {
                        try {
                          const subMatch = passedLaw.description.match(/\[METADATA:(.*)\]/);
                          if (subMatch) {
                            const subParsed = JSON.parse(subMatch[1]);
                            if (subParsed && subParsed.policies) {
                              const overlap = subParsed.policies.some((otherP: any) =>
                                policies.some((currentP: any) => currentP.policyKey === otherP.policyKey)
                              );
                              if (overlap) {
                                logger.info(`[TickEngine] Conflict found! Repealing conflicting law "${passedLaw.title}" due to policy overlap.`);
                                await lawRepository.updateStatus(passedLaw.id, 'repealed', this.trx);
                              }
                            }
                          }
                        } catch (e) {
                          // ignore
                        }
                      }
                    }
                  }
                }
              }
            } catch (e) {
              logger.error(`[TickEngine] Failed to parse budget policy metadata:`, e);
            }
          }
          
          // Send notification/alert about passed law
          await this.trx('notifications').insert({
            user_id: user ? user.id : null,
            nation_id: this.nationId,
            title: `Law Passed: ${law.title}`,
            message: `The proposed law "${law.title}" has been PASSED by the parliament with ${totalYesSeats} YES votes against ${totalNoSeats} NO votes. It is now effective.`,
            type: 'success',
            category: 'law',
            is_read: false,
            created_at: new Date(),
            updated_at: new Date()
          });
          
        } else {
          logger.info(`[TickEngine] Proposed law "${law.title}" REJECTED in parliament. Votes: Yes=${totalYesSeats}, No=${totalNoSeats}`);
          await lawRepository.updateStatus(law.id, 'repealed', this.trx);
          
          // Clear active modifiers from law_effects since it failed
          await this.trx('law_effects').where({ law_id: law.id }).delete();
          
          // Send notification/alert about rejected law
          await this.trx('notifications').insert({
            user_id: user ? user.id : null,
            nation_id: this.nationId,
            title: `Law Rejected: ${law.title}`,
            message: `The proposed law "${law.title}" has been REJECTED by the parliament. Votes: Yes=${totalYesSeats}, No=${totalNoSeats}.`,
            type: 'warning',
            category: 'law',
            is_read: false,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
    }

    // 2. Fetch sub-entities and last snapshot
    const [sectors, populationGroups, taxes, budgetItems, prices, activeModifiers, lastSnapshots] = await Promise.all([
      sectorRepository.findByNationId(this.nationId, this.trx),
      populationRepository.findByNationId(this.nationId, this.trx),
      taxRepository.findByNationId(this.nationId, this.trx),
      budgetRepository.findByNationId(this.nationId, this.trx),
      priceRepository.findByNationId(this.nationId, this.trx),
      lawRepository.findActiveEffectsByNationId(this.nationId, this.trx),
      snapshotRepository.findByNationId(this.nationId, 1, this.trx)
    ]);

    const lastSnapshot = lastSnapshots.length > 0 ? lastSnapshots[0] : null;

    // 3. Load parameters (resolving nation-specific overrides dynamically)
    const taxElasticity = await parameterService.getParameterValue('simulation', 'tax_elasticity', EconomyBalance.taxElasticity, this.nationId);
    const inflationDamping = await parameterService.getParameterValue('simulation', 'inflation_damping', InflationBalance.damping, this.nationId);
    const unemploymentBaseRate = await parameterService.getParameterValue('simulation', 'unemployment_base_rate', UnemploymentBalance.unemploymentBaseRate, this.nationId);
    const welfareEfficiency = await parameterService.getParameterValue('simulation', 'welfare_efficiency', WelfareBalance.welfareEfficiency, this.nationId);
    const approvalDecay = await parameterService.getParameterValue('simulation', 'approval_decay', ApprovalBalance.decay, this.nationId);
    const interestRate = await parameterService.getParameterValue('simulation', 'debt_interest_rate', DebtBalance.debtInterestRate, this.nationId);

    // Load crisis parameters
    const recessionTriggerThreshold = await parameterService.getParameterValue('simulation', 'recession_trigger_threshold', EconomyBalance.recessionTriggerThreshold, this.nationId);
    const recessionBuildupSpeed = await parameterService.getParameterValue('simulation', 'recession_buildup_speed', 0.25, this.nationId);
    const recessionRecoverySpeed = await parameterService.getParameterValue('simulation', 'recession_recovery_speed', 0.15, this.nationId);

    const protestApprovalThreshold = await parameterService.getParameterValue('simulation', 'protest_approval_threshold', ProtestsBalance.approvalThreshold, this.nationId);
    const protestStabilityThreshold = await parameterService.getParameterValue('simulation', 'protest_stability_threshold', ProtestsBalance.stabilityThreshold, this.nationId);
    const protestBuildupSpeed = await parameterService.getParameterValue('simulation', 'protest_buildup_speed', ProtestsBalance.buildupSpeed, this.nationId);
    const protestRepressionImpact = await parameterService.getParameterValue('simulation', 'protest_repression_impact', ProtestsBalance.repressionImpact, this.nationId);
    const protestNegotiationImpact = await parameterService.getParameterValue('simulation', 'protest_negotiation_impact', ProtestsBalance.negotiationImpact, this.nationId);

    const bankingStressThreshold = await parameterService.getParameterValue('simulation', 'banking_stress_threshold', DebtBalance.bankingStressThreshold, this.nationId);
    const bankingBuildupSpeed = await parameterService.getParameterValue('simulation', 'banking_buildup_speed', DebtBalance.bankingBuildupSpeed, this.nationId);
    const bankingRecoverySpeed = await parameterService.getParameterValue('simulation', 'banking_recovery_speed', DebtBalance.bankingRecoverySpeed, this.nationId);

    const strikeApprovalThreshold = await parameterService.getParameterValue('simulation', 'strike_approval_threshold', 0.35, this.nationId);
    const strikeBuildupSpeed = await parameterService.getParameterValue('simulation', 'strike_buildup_speed', 0.20, this.nationId);

    const institutionalTrustThreshold = await parameterService.getParameterValue('simulation', 'institutional_trust_threshold', 0.35, this.nationId);
    const institutionalBuildupSpeed = await parameterService.getParameterValue('simulation', 'institutional_buildup_speed', 0.15, this.nationId);

    const legitimacyThreshold = await parameterService.getParameterValue('simulation', 'legitimacy_threshold', 0.40, this.nationId);
    const legitimacyBuildupSpeed = await parameterService.getParameterValue('simulation', 'legitimacy_buildup_speed', 0.20, this.nationId);

    const scandalThreshold = await parameterService.getParameterValue('simulation', 'scandal_threshold', CorruptionBalance.scandalThreshold, this.nationId);
    const scandalBuildupSpeed = await parameterService.getParameterValue('simulation', 'scandal_buildup_speed', CorruptionBalance.scandalBuildupSpeed, this.nationId);

    const supplyShockThreshold = await parameterService.getParameterValue('simulation', 'supply_shock_threshold', -0.05, this.nationId);
    const supplyShockBuildupSpeed = await parameterService.getParameterValue('simulation', 'supply_shock_buildup_speed', 0.30, this.nationId);

    // Retrieve previous metrics to drive current tick's crisis calculations
    const prevCorruption = lastSnapshot?.snapshot_data?.politics?.corruption?.level !== undefined 
      ? Number(lastSnapshot.snapshot_data.politics.corruption.level) 
      : 0.15;
    const prevScandals = lastSnapshot?.snapshot_data?.politics?.corruption?.scandals !== undefined 
      ? Number(lastSnapshot.snapshot_data.politics.corruption.scandals) 
      : 0.05;
    const prevPoliceStrength = lastSnapshot?.snapshot_data?.politics?.policing?.policeStrength !== undefined 
      ? Number(lastSnapshot.snapshot_data.politics.policing.policeStrength) 
      : 0.20;
    const prevBrutality = lastSnapshot?.snapshot_data?.politics?.policing?.brutalityRisk !== undefined 
      ? Number(lastSnapshot.snapshot_data.politics.policing.brutalityRisk) 
      : 0.03;
    const prevPoliceTrust = lastSnapshot?.snapshot_data?.politics?.institutions?.police?.trust !== undefined 
      ? Number(lastSnapshot.snapshot_data.politics.institutions.police.trust) 
      : 0.8;

    // Run CrisisEngine
    const crisisResult = CrisisEngine.calculateCrises(
      sectors,
      populationGroups,
      budgetItems,
      Number(nation.gdp),
      Number(nation.approval),
      Number(nation.stability),
      lastSnapshot,
      interestRate,
      prevCorruption,
      prevScandals,
      prevPoliceStrength,
      prevBrutality,
      prevPoliceTrust,
      {
        recession_trigger_threshold: recessionTriggerThreshold,
        recession_buildup_speed: recessionBuildupSpeed,
        recession_recovery_speed: recessionRecoverySpeed,
        protest_approval_threshold: protestApprovalThreshold,
        protest_stability_threshold: protestStabilityThreshold,
        protest_buildup_speed: protestBuildupSpeed,
        protest_repression_impact: protestRepressionImpact,
        protest_negotiation_impact: protestNegotiationImpact,
        banking_stress_threshold: bankingStressThreshold,
        banking_buildup_speed: bankingBuildupSpeed,
        banking_recovery_speed: bankingRecoverySpeed,
        strike_approval_threshold: strikeApprovalThreshold,
        strike_buildup_speed: strikeBuildupSpeed,
        institutional_trust_threshold: institutionalTrustThreshold,
        institutional_buildup_speed: institutionalBuildupSpeed,
        legitimacy_threshold: legitimacyThreshold,
        legitimacy_buildup_speed: legitimacyBuildupSpeed,
        scandal_threshold: scandalThreshold,
        scandal_buildup_speed: scandalBuildupSpeed,
        supply_shock_threshold: supplyShockThreshold,
        supply_shock_buildup_speed: supplyShockBuildupSpeed
      }
    );

    // Merge crisis modifiers into activeModifiers
    const mergedModifiers = [...activeModifiers, ...crisisResult.modifiers];

    // 4. Run calculation sub-engines
    // 4.1. Economy calculation
    const updatedSectors = EconomyEngine.calculate(sectors, mergedModifiers, taxElasticity);

    // Calculate new GDP as sum of economic outputs
    const newGdp = updatedSectors.reduce((sum, s) => sum + Number(s.output), 0);

    // Estimate unemployment rate based on average growth vs base rate, adding crisis spikes
    const growthRates = sectors.map((s, idx) => (updatedSectors[idx].output - s.output) / (s.output || 1));
    const avgGrowth = growthRates.reduce((sum, g) => sum + g, 0) / growthRates.length;
    const baseUnemployment = Math.max(0.01, unemploymentBaseRate - (avgGrowth * 0.5));
    const unemploymentRate = Math.max(0.01, baseUnemployment + crisisResult.adjustments.unemploymentSpike);

    // 4.2. Inflation calculation
    const { updatedPrices, inflationFood, inflationFuel, inflationHousing, inflationCpi } =
      InflationEngine.calculate(prices, mergedModifiers, inflationDamping);

    // 4.3. Budget calculation
    const welfareAllocation = Number(budgetItems.find(b => b.name === 'Welfare')?.allocation || 0);
    const adjustedInterestRate = interestRate + crisisResult.adjustments.interestRateSpike;

    let { updatedTaxes, updatedBudgetItems, newTreasury, newDebt, totalRevenue, totalSpending } =
      BudgetEngine.calculate(
        taxes,
        budgetItems,
        newGdp,
        Number(nation.treasury),
        Number(nation.debt),
        adjustedInterestRate,
        mergedModifiers
      );

    // Load dynamic parameters for the institutions, corruption, media, and policing simulation
    const corruptionBaseLeakage = await parameterService.getParameterValue('simulation', 'corruption_base_leakage', 0.10, this.nationId);
    const corruptionDecayRate = await parameterService.getParameterValue('simulation', 'corruption_decay_rate', 0.95, this.nationId);
    const corruptionGrowthFactor = await parameterService.getParameterValue('simulation', 'corruption_growth_factor', 0.05, this.nationId);
    const corruptionInflationImpact = await parameterService.getParameterValue('simulation', 'corruption_inflation_impact', 0.20, this.nationId);
    const corruptionWelfareImpact = await parameterService.getParameterValue('simulation', 'corruption_welfare_impact', -0.10, this.nationId);
    const corruptionAnticorruptionImpact = await parameterService.getParameterValue('simulation', 'corruption_anticorruption_impact', 0.40, this.nationId);
    const corruptionTaxEvasionImpact = await parameterService.getParameterValue('simulation', 'corruption_tax_evasion_impact', 0.10, this.nationId);

    const mediaScandalMultiplier = await parameterService.getParameterValue('simulation', 'media_scandal_multiplier', 1.50, this.nationId);
    const mediaSentimentDamping = await parameterService.getParameterValue('simulation', 'media_sentiment_damping', 0.85, this.nationId);
    const mediaOppositionStrength = await parameterService.getParameterValue('simulation', 'media_opposition_strength', 0.30, this.nationId);
    const mediaMisinfoPressure = await parameterService.getParameterValue('simulation', 'media_misinfo_pressure', 0.05, this.nationId);
    const mediaInfluence = await parameterService.getParameterValue('simulation', 'media_influence', 0.40, this.nationId);

    const policingBrutalityBase = await parameterService.getParameterValue('simulation', 'policing_brutality_base', 0.02, this.nationId);
    const policingBrutalityBudgetImpact = await parameterService.getParameterValue('simulation', 'policing_brutality_budget_impact', 0.15, this.nationId);
    const policingBrutalityUnrestImpact = await parameterService.getParameterValue('simulation', 'policing_brutality_unrest_impact', 0.20, this.nationId);
    const policingCrimeResponseBase = await parameterService.getParameterValue('simulation', 'policing_crime_response_base', 5.00, this.nationId);
    const policingEffectivenessBase = await parameterService.getParameterValue('simulation', 'policing_effectiveness_base', 0.80, this.nationId);
    const policingPublicSafetyBase = await parameterService.getParameterValue('simulation', 'policing_public_safety_base', 0.80, this.nationId);

    const targetAdminGdpRatio = await parameterService.getParameterValue('simulation', 'target_admin_gdp_ratio', 0.05, this.nationId);

    const courtsShare = await parameterService.getParameterValue('simulation', 'courts_share', 0.15, this.nationId);
    const taxAuthorityShare = await parameterService.getParameterValue('simulation', 'tax_authority_share', 0.15, this.nationId);
    const civilServiceShare = await parameterService.getParameterValue('simulation', 'civil_service_share', 0.25, this.nationId);
    const anticorruptionShare = await parameterService.getParameterValue('simulation', 'anticorruption_share', 0.05, this.nationId);
    const policeShare = await parameterService.getParameterValue('simulation', 'police_share', 0.25, this.nationId);
    const electionCommissionShare = await parameterService.getParameterValue('simulation', 'election_commission_share', 0.05, this.nationId);
    const statisticsOfficeShare = await parameterService.getParameterValue('simulation', 'statistics_office_share', 0.05, this.nationId);
    const regulatoryAgenciesShare = await parameterService.getParameterValue('simulation', 'regulatory_agencies_share', 0.05, this.nationId);

    const prevApproval = lastSnapshot ? Number(lastSnapshot.approval) : 0.5;
    const prevStability = lastSnapshot ? Number(lastSnapshot.stability) : 0.5;

    // Run institutions and enforcement simulation
    const instAndEnforcement = PoliticsEngine.calculateInstitutionsAndEnforcement(
      populationGroups,
      updatedBudgetItems,
      newGdp,
      prevApproval,
      prevStability,
      lastSnapshot,
      inflationCpi,
      unemploymentRate,
      {
        corruption_base_leakage: corruptionBaseLeakage,
        corruption_decay_rate: corruptionDecayRate,
        corruption_growth_factor: corruptionGrowthFactor,
        corruption_inflation_impact: corruptionInflationImpact,
        corruption_welfare_impact: corruptionWelfareImpact,
        corruption_anticorruption_impact: corruptionAnticorruptionImpact,
        corruption_tax_evasion_impact: corruptionTaxEvasionImpact,
        media_scandal_multiplier: mediaScandalMultiplier,
        media_sentiment_damping: mediaSentimentDamping,
        media_opposition_strength: mediaOppositionStrength,
        media_misinfo_pressure: mediaMisinfoPressure,
        media_influence: mediaInfluence,
        policing_brutality_base: policingBrutalityBase,
        policing_brutality_budget_impact: policingBrutalityBudgetImpact,
        policing_brutality_unrest_impact: policingBrutalityUnrestImpact,
        policing_crime_response_base: policingCrimeResponseBase,
        policing_effectiveness_base: policingEffectivenessBase,
        policing_public_safety_base: policingPublicSafetyBase,
        target_admin_gdp_ratio: targetAdminGdpRatio,
        courts_share: courtsShare,
        tax_authority_share: taxAuthorityShare,
        civil_service_share: civilServiceShare,
        anticorruption_share: anticorruptionShare,
        police_share: policeShare,
        election_commission_share: electionCommissionShare,
        statistics_office_share: statisticsOfficeShare,
        regulatory_agencies_share: regulatoryAgenciesShare
      }
    );

    // Apply tax evasion leakage to taxes, total revenue, and treasury
    const leakageFactor = instAndEnforcement.corruption.taxEvasionLeakage;
    const originalRevenue = totalRevenue;
    totalRevenue = Number((originalRevenue * (1 - leakageFactor)).toFixed(2));
    const revenueDifference = originalRevenue - totalRevenue;

    updatedTaxes = updatedTaxes.map(tax => ({
      ...tax,
      revenue: Number((tax.revenue * (1 - leakageFactor)).toFixed(2))
    }));

    newTreasury = Number(Math.max(0, newTreasury - revenueDifference).toFixed(2));
    if (newTreasury === 0 && revenueDifference > 0) {
      const netChange = Number(nation.treasury) + totalRevenue - totalSpending;
      if (netChange < 0) {
        newDebt = Number((Number(nation.debt) + Math.abs(netChange)).toFixed(2));
      }
    }

    // Apply crisis emergency expenditures to total spending and treasury/debt
    const emergencySpending = crisisResult.adjustments.emergencySpending;
    totalSpending = Number((totalSpending + emergencySpending).toFixed(2));

    newTreasury = Number(Math.max(0, newTreasury - emergencySpending).toFixed(2));
    if (newTreasury === 0 && emergencySpending > 0) {
      const netChange = Number(nation.treasury) + totalRevenue - totalSpending;
      if (netChange < 0) {
        newDebt = Number((Number(nation.debt) + Math.abs(netChange)).toFixed(2));
      }
    }

    // 4.4. Politics calculation
    const { updatedPopulationGroups } =
      PoliticsEngine.calculate(
        populationGroups,
        inflationCpi,
        unemploymentRate,
        welfareAllocation,
        welfareEfficiency,
        approvalDecay,
        mergedModifiers,
        instAndEnforcement.corruption.level,
        instAndEnforcement.media.newsSentiment,
        instAndEnforcement.policing.brutalityRisk,
        instAndEnforcement.corruption.scandals
      );

    // 4.5. Parties & Elections calculation
    const [dbParties, initialVoterBlocs, affinities] = await Promise.all([
      partyRepository.findByNationId(this.nationId, this.trx),
      voterBlocRepository.findByNationId(this.nationId, this.trx),
      voterBlocRepository.findAffinitiesForNation(this.nationId, this.trx)
    ]);

    const governingPartyIds = dbParties.filter(p => p.is_governing).map(p => p.id);
    const welfareIndex = Math.min(1.0, welfareAllocation / (newGdp * 0.05));

    const blocUpdates = await voterBlocService.calculateBlocApprovals(
      this.nationId,
      {
        inflationRate: inflationCpi,
        unemploymentRate,
        welfareIndex,
        governingPartyIds
      },
      this.trx
    );

    // Persist voter bloc approvals
    await voterBlocRepository.updateManyApprovals(blocUpdates, this.trx);

    // Fetch the updated voter blocs
    const updatedVoterBlocs = await voterBlocRepository.findByNationId(this.nationId, this.trx);

    // Compute weighted national approval and stability
    const nationalApproval = Number(voterBlocService.computeWeightedApproval(updatedVoterBlocs).toFixed(4));
    let nationalStability = (nationalApproval * 0.6) + 0.4 - instAndEnforcement.corruption.level * 0.1 - instAndEnforcement.policing.brutalityRisk * 0.1;
    nationalStability = Number(Math.max(0.0, Math.min(1.0, nationalStability)).toFixed(4));

    const electionCooldown = await parameterService.getParameterValue('simulation', 'election_cooldown', 48, this.nationId);
    const politicalState = PoliticsEngine.calculatePartiesAndElections(
      updatedVoterBlocs,
      dbParties,
      affinities,
      nation.current_tick,
      electionCooldown,
      nationalStability
    );

    // Update each party's support share in the database
    for (const ps of politicalState.partySupport) {
      const party = dbParties.find(p => p.name === ps.name);
      if (party) {
        await partyRepository.update(party.id, { support_share: ps.support }, this.trx);
      }
    }

    // 5. Persist live states back to DB
    const nextTick = nation.current_tick + 1;

    // Update nation core state
    await nationRepository.update(this.nationId, {
      treasury: newTreasury,
      debt: newDebt,
      gdp: newGdp,
      inflation_food: inflationFood,
      inflation_fuel: inflationFuel,
      inflation_housing: inflationHousing,
      inflation_cpi: inflationCpi,
      approval: nationalApproval,
      stability: nationalStability,
      current_tick: nextTick
    }, this.trx);

    // Update economic sectors
    for (const sec of updatedSectors) {
      await sectorRepository.update(sec.id, {
        output: sec.output,
        workers: sec.workers,
        productivity: sec.productivity,
        wages: sec.wages,
        growth: sec.growth
      }, this.trx);
    }

    // Update population classes
    for (const pop of updatedPopulationGroups) {
      await populationRepository.update(pop.id, {
        size: pop.size,
        income: pop.income,
        approval: pop.approval
      }, this.trx);
    }

    // Update taxes
    for (const tax of updatedTaxes) {
      await taxRepository.update(tax.id, {
        rate: tax.rate,
        revenue: tax.revenue
      }, this.trx);
    }

    // Update budget items
    for (const bItem of updatedBudgetItems) {
      await budgetRepository.update(bItem.id, {
        allocation: bItem.allocation
      }, this.trx);
    }

    // Update prices
    for (const pr of updatedPrices) {
      await priceRepository.update(pr.id, {
        price_index: pr.price_index,
        inflation_rate: pr.inflation_rate
      }, this.trx);
    }

    // 6. Record Historical Snapshot for charting
    const snapshotDetails = {
      sectors: updatedSectors.map(s => ({ name: s.name, output: s.output, workers: s.workers, wages: s.wages, productivity: s.productivity })),
      population: updatedPopulationGroups.map(p => ({ name: p.name, size: p.size, income: p.income, approval: p.approval })),
      taxes: updatedTaxes.map(t => ({ name: t.name, rate: t.rate, revenue: t.revenue })),
      budgets: updatedBudgetItems.map(b => ({ name: b.name, allocation: b.allocation })),
      prices: updatedPrices.map(p => ({ sector_name: p.sector_name, price_index: p.price_index, inflation_rate: p.inflation_rate })),
      politics: {
        partySupport: politicalState.partySupport,
        isElectionMonth: politicalState.isElectionMonth,
        turnout: politicalState.turnout,
        seatAllocation: politicalState.seatAllocation,
        governingParty: politicalState.governingParty,
        coalitionPartners: politicalState.coalitionPartners,
        governmentLegitimacy: politicalState.governmentLegitimacy,
        institutions: instAndEnforcement.institutions,
        corruption: instAndEnforcement.corruption,
        media: instAndEnforcement.media,
        policing: instAndEnforcement.policing,
        crises: crisisResult.crises
      }
    };

    await snapshotRepository.create({
      nation_id: this.nationId,
      tick: nation.current_tick,
      gdp: newGdp,
      inflation_food: inflationFood,
      inflation_fuel: inflationFuel,
      inflation_housing: inflationHousing,
      inflation_cpi: inflationCpi,
      unemployment_rate: Number(unemploymentRate.toFixed(4)),
      approval: nationalApproval,
      stability: nationalStability,
      treasury: newTreasury,
      debt: newDebt,
      revenue: totalRevenue,
      spending: totalSpending,
      snapshot_data: snapshotDetails
    }, this.trx);

    // 7. Run election if this is an election tick (every 12 ticks)
    if (electionService.shouldRunElection(nextTick)) {
      logger.info(`[TickEngine] Running election at tick ${nextTick} for nation ${this.nationId}`);
      await electionService.runElection(this.nationId, nextTick, this.trx);
    }

    logger.info(`[TickEngine] Tick ${nextTick} execution complete for nation ${this.nationId}`);
  }
}
