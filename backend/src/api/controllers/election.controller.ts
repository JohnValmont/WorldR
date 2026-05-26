import { Request, Response, NextFunction } from 'express';
import { electionService } from '../../services/election.service';

export class ElectionController {
  public async getElectionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const status = await electionService.getElectionStatus(nation_id);
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  }

  public async getElectionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 5;
      const history = await electionService.getElectionHistory(nation_id, limit);
      res.status(200).json({ elections: history });
    } catch (error) {
      next(error);
    }
  }

  public async getLatestElection(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const latest = await electionService.getLatestElection(nation_id);
      res.status(200).json(latest || { message: 'No elections held yet' });
    } catch (error) {
      next(error);
    }
  }
}
export const electionController = new ElectionController();
