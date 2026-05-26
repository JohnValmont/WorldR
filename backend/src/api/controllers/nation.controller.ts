import { Request, Response, NextFunction } from 'express';
import { nationService } from '../../services/nation.service';
import { queueService } from '../../services/queue.service';
import { snapshotRepository } from '../../repositories/snapshot.repository';
import { UnauthorizedError } from '../../utils/errors';

export class NationController {
  public async getNationState(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;

      if (req.user?.role !== 'admin' && req.user?.nation_id !== nation_id) {
        throw new UnauthorizedError('Access denied to this nation');
      }

      const state = await nationService.getNationState(nation_id);
      res.status(200).json(state);
    } catch (error) {
      next(error);
    }
  }

  public async updateFiscalPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const { taxes, budgets } = req.body;

      if (req.user?.role !== 'admin' && req.user?.nation_id !== nation_id) {
        throw new UnauthorizedError('Access denied to this nation');
      }

      const updated = await nationService.updateFiscalPolicy(nation_id, req.user.id, { taxes, budgets });
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  public async triggerTick(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;

      if (req.user?.role !== 'admin' && req.user?.nation_id !== nation_id) {
        throw new UnauthorizedError('Access denied to this nation');
      }

      const jobId = await queueService.triggerTick(nation_id);
      res.status(202).json({ message: 'Tick execution job enqueued', jobId });
    } catch (error) {
      next(error);
    }
  }

  public async spawnNation(req: Request, res: Response, next: NextFunction) {
    try {
      const { templateName, nationName, region, continent } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const nation = await nationService.spawnNationFromTemplate(userId, templateName, nationName, region, continent);
      res.status(201).json({ message: 'Nation spawned successfully', nation });
    } catch (error) {
      next(error);
    }
  }


  public async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 36;

      if (req.user?.role !== 'admin' && req.user?.nation_id !== nation_id) {
        throw new UnauthorizedError('Access denied to this nation');
      }

      const snapshots = await snapshotRepository.findByNationId(nation_id, limit);
      res.status(200).json(snapshots);
    } catch (error) {
      next(error);
    }
  }

  public async listNations(req: Request, res: Response, next: NextFunction) {
    try {
      const nations = await nationService.listNations();
      res.status(200).json({ nations });
    } catch (error) {
      next(error);
    }
  }
}
export const nationController = new NationController();
