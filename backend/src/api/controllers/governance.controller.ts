import { Request, Response, NextFunction } from 'express';
import { governanceService } from '../../services/governance.service';

export class GovernanceController {
  public async getAllContinents(req: Request, res: Response, next: NextFunction) {
    try {
      const continents = await governanceService.getAllContinents();
      res.status(200).json({ continents });
    } catch (error) {
      next(error);
    }
  }

  public async getAllGovernanceSystems(req: Request, res: Response, next: NextFunction) {
    try {
      const systems = await governanceService.getAllGovernanceSystems();
      res.status(200).json({ systems });
    } catch (error) {
      next(error);
    }
  }

  public async getNationGovernance(req: Request, res: Response, next: NextFunction) {
    try {
      const { nationId } = req.params;
      const result = await governanceService.getNationGovernance(nationId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const governanceController = new GovernanceController();
