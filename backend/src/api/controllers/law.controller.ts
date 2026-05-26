import { Request, Response, NextFunction } from 'express';
import { lawRepository } from '../../repositories/law.repository';
import { UnauthorizedError, NotFoundError, ValidationError } from '../../utils/errors';
import { db } from '../../config/database';

export class LawController {
  public async getLaws(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;

      if (req.user?.role !== 'admin' && req.user?.nation_id !== nation_id) {
        throw new UnauthorizedError('Access denied to this nation');
      }

      const laws = await lawRepository.findByNationId(nation_id);
      res.status(200).json(laws);
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
