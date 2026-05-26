import { Request, Response, NextFunction } from 'express';
import { lawRepository } from '../../repositories/law.repository';
import { nationRepository } from '../../repositories/nation.repository';
import { LawBalance } from '../../systems/balance';
import { LAWS_CONFIG } from '../../simulation/laws.config';
import { UnauthorizedError, NotFoundError, ValidationError } from '../../utils/errors';
import { db } from '../../config/database';

export class LawController {
  public async getLawsConfig(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(LAWS_CONFIG);
    } catch (error) {
      next(error);
    }
  }

  public async getLaws(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;

      if (req.user?.role !== 'admin' && req.user?.nation_id !== nation_id) {
        throw new UnauthorizedError('Access denied to this nation');
      }

      const laws = await lawRepository.findByNationId(nation_id);
      res.status(200).json({ laws });
    } catch (error) {
      next(error);
    }
  }

  public async proposeLaw(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const { title, description, effects } = req.body;

      if (req.user?.role !== 'admin' && req.user?.nation_id !== nation_id) {
        throw new UnauthorizedError('Access denied to this nation');
      }

      const law = await db.transaction(async (trx) => {
        const newLaw = await lawRepository.create({
          nation_id,
          title,
          description: description || null,
          status: 'proposed'
        }, trx);

        if (effects && Array.isArray(effects)) {
          for (const effect of effects) {
            await lawRepository.createEffect({
              law_id: newLaw.id,
              target_type: effect.target_type,
              target_name: effect.target_name,
              parameter_name: effect.parameter_name,
              modifier_type: effect.modifier_type,
              modifier_value: Number(effect.modifier_value)
            }, trx);
          }
        }

        return newLaw;
      });

      res.status(201).json({ message: 'Law proposed successfully', law });
    } catch (error) {
      next(error);
    }
  }

  public async proposeBill(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const { title, policies } = req.body;

      if (req.user?.role !== 'admin' && req.user?.nation_id !== nation_id) {
        throw new UnauthorizedError('Access denied to this nation');
      }

      const nation = await nationRepository.findById(nation_id);
      if (!nation) throw new NotFoundError('Nation not found');

      // Proposal cost from Balance configs: default 15M
      const proposalCost = LawBalance.proposalCost || 15000000.0;
      if (Number(nation.treasury) < proposalCost) {
        throw new ValidationError(`Insufficient national treasury to propose this legislation. Cost is ${(proposalCost / 1000000).toFixed(1)}M KDM.`);
      }

      let combinedDescription = 'Policies in this bill:\n';
      const lawEffectsToInsert: any[] = [];
      const combinedVoterBlocStanding: Record<string, number> = {};
      const combinedVoterBlocWeight: Record<string, number> = {};
      const combinedVoterTurnout: Record<string, number> = {};

      for (const p of policies) {
        const sector = LAWS_CONFIG.find(s => s.key === p.sectorKey);
        const policy = sector?.policies.find(pol => pol.key === p.policyKey);
        const option = policy?.options.find(opt => opt.key === p.optionKey);
        
        if (!option || !policy) {
          throw new ValidationError(`Invalid policy option: ${p.optionKey}`);
        }

        combinedDescription += `- ${policy.name}: ${option.name}\n`;
        
        for (const effect of option.effects) {
          lawEffectsToInsert.push(effect);
        }

        if (option.voterBlocStanding) {
          for (const [blocCode, val] of Object.entries(option.voterBlocStanding)) {
            combinedVoterBlocStanding[blocCode] = (combinedVoterBlocStanding[blocCode] || 0) + val;
          }
        }

        if (option.voterBlocWeightModifiers) {
          for (const [blocCode, val] of Object.entries(option.voterBlocWeightModifiers)) {
            combinedVoterBlocWeight[blocCode] = (combinedVoterBlocWeight[blocCode] || 0) + val;
          }
        }

        if (option.voterTurnoutModifiers) {
          for (const [blocCode, val] of Object.entries(option.voterTurnoutModifiers)) {
            combinedVoterTurnout[blocCode] = (combinedVoterTurnout[blocCode] || 0) + val;
          }
        }
      }

      const metadataStr = `[METADATA:${JSON.stringify({
        type: 'policy_bill',
        policies,
        voterBlocStanding: combinedVoterBlocStanding,
        voterBlocWeightModifiers: combinedVoterBlocWeight,
        voterTurnoutModifiers: combinedVoterTurnout
      })}]`;
      
      const fullDescription = `${combinedDescription}\n${metadataStr}`;

      const law = await db.transaction(async (trx) => {
        // Deduct treasury
        await nationRepository.update(nation_id, {
          treasury: Number(nation.treasury) - proposalCost
        }, trx);

        // Create proposed law (bill)
        const newLaw = await lawRepository.create({
          nation_id,
          title,
          description: fullDescription,
          status: 'proposed'
        }, trx);

        // Create law effects
        for (const effect of lawEffectsToInsert) {
          await lawRepository.createEffect({
            law_id: newLaw.id,
            target_type: effect.target_type,
            target_name: effect.target_name,
            parameter_name: effect.parameter_name,
            modifier_type: effect.modifier_type,
            modifier_value: Number(effect.modifier_value)
          }, trx);
        }

        return newLaw;
      });

      res.status(201).json({ message: 'Bill proposed successfully', law });
    } catch (error) {
      next(error);
    }
  }

  public async updateLawStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id, law_id } = req.params;
      const { status } = req.body;

      if (req.user?.role !== 'admin' && req.user?.nation_id !== nation_id) {
        throw new UnauthorizedError('Access denied to this nation');
      }

      if (!['passed', 'proposed', 'repealed'].includes(status)) {
        throw new ValidationError('Invalid law status');
      }

      const law = await lawRepository.findById(law_id);
      if (!law || law.nation_id !== nation_id) {
        throw new NotFoundError('Law not found on this nation');
      }

      const updatedLaw = await lawRepository.updateStatus(law_id, status);
      res.status(200).json({ message: `Law status updated to ${status}`, law: updatedLaw });
    } catch (error) {
      next(error);
    }
  }
}
export const lawController = new LawController();
